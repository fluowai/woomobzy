# Planejamento de Correcao Integral â€” Whatsmeow, MinIO, Identidade, Multi-tenant e UX

Data: 20 de junho de 2026
Projeto: IMOBZY / ImobFluow
Escopo: integracao WhatsApp baseada em Whatsmeow, CRM, MinIO, isolamento por imobiliaria e experiencia da central de conversas.

## 1. Objetivo

Este plano transforma a auditoria tecnica da integracao WhatsApp em uma sequencia executavel de correcoes e evolucoes.

O objetivo nao e reescrever o modulo inteiro. A base atual possui componentes aproveitaveis:

- sessoes Whatsmeow persistidas em PostgreSQL;
- instancias vinculadas a tenant;
- chats e mensagens armazenados por instancia;
- WebSocket autenticado por organizacao;
- pipeline assincrono de midia;
- armazenamento MinIO com prefixo por tenant;
- endpoints autenticados para URL assinada;
- integracao inicial com CRM;
- importacao de historico;
- suporte a texto, imagem, audio, video, documento e sticker.

O problema central e a falta de um contrato unico entre Go, Node, banco e frontend para quatro conceitos:

1. identidade do contato;
2. identidade e estado da mensagem;
3. propriedade e acesso da midia;
4. propriedade do tenant.

Enquanto cada camada aplicar sua propria regra, continuarao surgindo sintomas como:

- nomes diferentes no WhatsApp e no CRM;
- numeros incompletos ou mascarados;
- LIDs exibidos como telefones;
- foto disponivel no WhatsApp, mas ausente na interface;
- checks de entrega que nao atualizam;
- mensagens enviadas contadas como nao lidas;
- retry de midia que apenas volta a falhar;
- acoes do painel cujo texto nao corresponde ao que o backend realmente altera.

## 2. Resultado esperado

Ao final do plano, o modulo devera oferecer:

- isolamento completo por imobiliaria;
- uma ou mais instancias por imobiliaria, conforme o plano contratado;
- telefones normalizados e exibidos por inteiro;
- nenhuma exibicao de LID como telefone;
- pushname, nome comercial, nome CRM e nome manual tratados separadamente;
- fallback previsivel e unico para o nome exibido;
- fotos copiadas do WhatsApp para o MinIO e entregues por URL assinada;
- mensagens com ID real do WhatsApp;
- status enviado, entregue, lido, reproduzido e falhou corretamente correlacionados;
- contador de nao lidas correto;
- midias recuperaveis e com diagnostico;
- edicao do lead diretamente a partir da conversa;
- painel de contato com hierarquia visual adequada;
- observabilidade por tenant, instancia e tipo de falha;
- testes automatizados de seguranca multi-tenant;
- rollout com migracao e rollback controlados.

## 3. Principios da arquitetura-alvo

### 3.1 O banco e a fonte de verdade da aplicacao

Whatsmeow e a fonte de eventos e capacidades do WhatsApp, mas a interface nao deve depender diretamente de URLs temporarias, estruturas internas ou identificadores instaveis do WhatsApp.

O banco deve guardar:

- JID canonico;
- LID, quando conhecido, apenas como identificador alternativo;
- telefone E.164;
- pushname;
- nome comercial;
- nome manual;
- referencia do lead;
- foto persistida;
- ID real da mensagem;
- estado atual e historico de entrega;
- bucket e object key da midia.

### 3.2 Nenhuma regra de identidade deve existir somente no frontend

React pode formatar dados, mas nao deve decidir sozinho:

- se um nome e valido;
- se um numero e um telefone;
- se um JID e LID;
- qual nome vence;
- se dois numeros representam a mesma pessoa.

Essas decisoes devem existir em servico compartilhado ou em contratos equivalentes e testados no Go e no Node.

### 3.3 Tenant sempre faz parte da chave logica

Um telefone pode existir em diversas imobiliarias sem representar o mesmo lead.

As chaves de negocio devem seguir o modelo:

```text
tenant + instancia + identidade WhatsApp
tenant + telefone canonico + lead
tenant + bucket + object key
```

### 3.4 MinIO deve ser privado por padrao

O contrato de uma midia nao deve ser uma URL publica permanente.

O contrato deve ser:

```text
provider + bucket + object_key + status + metadados
```

A URL deve ser gerada sob demanda, por tempo limitado e depois de validar o tenant.

### 3.5 Processamento de eventos deve ser idempotente

Receber novamente a mesma mensagem, recibo, foto ou sincronizacao de historico nao pode:

- duplicar registros;
- aumentar nao lidas novamente;
- substituir nome manual por pushname;
- criar outro lead;
- sobrescrever uma midia valida por estado inferior.

## 4. Arquitetura funcional proposta

```text
WhatsApp
   |
   v
Whatsmeow Gateway
   |-- normaliza JID/LID/telefone
   |-- persiste evento e mensagem
   |-- agenda midia/avatar
   |-- emite evento interno com tenant
   v
PostgreSQL
   |-- identidades e aliases
   |-- chats e mensagens
   |-- estados e auditoria
   |-- jobs de midia/avatar
   v
Workers
   |-- download WhatsApp
   |-- upload MinIO
   |-- thumbnail/transcricao/OCR
   |-- retry com backoff
   v
Node API
   |-- autentica usuario e tenant
   |-- integra CRM
   |-- gera URLs assinadas
   |-- entrega DTO canonico
   v
React
   |-- renderiza identidade resolvida
   |-- edita lead/contato
   |-- apresenta estados e falhas
```

## 5. Modelo canonico de identidade

### 5.1 Campos recomendados

Evoluir `whatsapp_contacts` ou criar uma entidade complementar de identidade com:

```text
id
tenant_id
instance_id
canonical_jid
phone_e164
phone_digits
lid_jid
push_name
business_name
whatsapp_saved_name
manual_name
resolved_display_name
avatar_bucket
avatar_object_key
avatar_picture_id
avatar_status
avatar_refreshed_at
lead_id
created_at
updated_at
```

Se `tenant_id` continuar derivado da instancia, ele ainda deve ser considerado em consultas, indices e testes. Materializa-lo em contatos pode simplificar auditoria e reduzir joins, mas exige constraint que garanta correspondencia com a instancia.

### 5.2 Regra unica de nome exibido

A prioridade proposta e:

1. nome manual definido pelo usuario;
2. nome do lead no CRM;
3. pushname atual;
4. nome comercial do WhatsApp Business;
5. nome salvo recebido pelo store do WhatsApp;
6. telefone completo formatado;
7. `Contato nao identificado`.

O sistema nao deve usar como nome:

- `~`;
- `Me`;
- JID bruto;
- LID;
- somente pontuacao;
- numero parcialmente mascarado;
- telefone cortado;
- texto `Contato sem telefone`;
- sequencias artificiais de iniciais;
- IDs internos longos.

### 5.3 Telefone

Para o Brasil:

- entrada aceita com ou sem `+`;
- remove mascara e zero de operadora;
- adiciona DDI 55 apenas quando a entrada for nacional de 10 ou 11 digitos;
- valida DDD;
- preserva telefone fixo de 12 digitos com DDI;
- preserva celular de 13 digitos com DDI;
- exibe `+55 (48) 98800-3260`;
- envia pelo JID `5548988003260@s.whatsapp.net`.

O numero `5548988003260` e `+5548988003260` deve produzir exatamente a mesma identidade.

### 5.4 Nono digito

Nao se deve adicionar ou remover o nono digito indiscriminadamente.

O plano e:

- guardar o numero observado como canonico;
- gerar uma chave secundaria de busca com os ultimos oito digitos;
- consultar candidatos somente dentro do tenant;
- comparar DDI e DDD;
- tratar variante com/sem nono digito como possivel correspondencia;
- exigir reconciliacao segura antes de fundir leads;
- registrar a origem da unificacao.

## 6. Fases de implementacao

## Fase 0 â€” Preparacao, baseline e protecao

Duracao estimada: 1 a 2 dias
Prioridade: bloqueadora
Objetivo: impedir que a correcao seja feita sem capacidade de medir regressao.

### Entregas

1. Criar branch especifica para a correcao.
2. Registrar metricas atuais:
   - instancias por tenant;
   - chats por instancia;
   - contatos sem telefone;
   - contatos com LID;
   - nomes placeholders;
   - mensagens outbound com ID `sent_*`;
   - mensagens sem status coerente;
   - midias pending/failed;
   - avatares apontando para CDN do WhatsApp;
   - leads duplicados por telefone.
3. Criar queries de auditoria antes/depois.
4. Validar quais migrations estao aplicadas na producao.
5. Criar backup logico das tabelas WhatsApp e CRM afetadas.
6. Definir feature flags:
   - `WHATSAPP_CANONICAL_IDENTITY`;
   - `WHATSAPP_PRIVATE_MEDIA`;
   - `WHATSAPP_CONTACT_DRAWER_V2`;
   - `WHATSAPP_MESSAGE_STATUS_V2`.

### Criterios de aceite

- baseline salvo com data e tenant;
- migrations de producao inventariadas;
- rollback documentado;
- nenhum dado alterado nesta fase;
- dashboards ou queries prontas para comparar o resultado.

## Fase 1 â€” Correcao do ciclo de mensagens

Duracao estimada: 3 a 5 dias
Prioridade: P0
Objetivo: tornar envio, persistencia, recibos e nao lidas confiaveis.

### 1.1 Persistir o ID real no envio de texto

Hoje `SendTextMessage` descarta a resposta do Whatsmeow e o handler cria `sent_<timestamp>`.

Alteracao:

- `SendTextMessage` deve retornar `messageID`, timestamp e, quando disponivel, metadados da resposta;
- o handler deve salvar o ID real;
- o frontend deve usar o registro retornado pelo backend;
- o evento de eco do WhatsApp deve fazer upsert, nao duplicar.

Arquivos principais:

- `whatsapp-service/internal/whatsapp/media.go`;
- `whatsapp-service/internal/handlers/messages.go`;
- `whatsapp-service/internal/repository/message_repo.go`;
- `views/WhatsApp/WhatsAppDashboard.tsx`.

### 1.2 Separar atualizacao de chat inbound e outbound

Criar operacoes explicitas:

- `UpsertIncoming`;
- `UpsertOutgoing`;
- `UpsertImported`;
- `UpdatePreview`;
- `MarkRead`.

Somente `UpsertIncoming` incrementa `unread_count`, e apenas se a mensagem ainda nao tiver sido processada.

### 1.3 Leitura real

Abrir uma conversa deve:

1. zerar o contador local;
2. zerar o contador no banco;
3. opcionalmente chamar `MarkRead` no Whatsmeow;
4. emitir atualizacao para outras abas/sessoes do mesmo tenant.

Deve haver configuracao para nao enviar confirmacao de leitura caso a politica da imobiliaria desative isso.

### 1.4 Historico de estados

Manter `delivery_status` atual em `whatsapp_messages`, mas criar:

```text
whatsapp_message_status
```

com:

- message_id;
- instance_id;
- tenant_id;
- status;
- participant_jid;
- occurred_at;
- raw_event_id.

Isso permite auditoria, status por participante em grupo e diagnostico.

### Criterios de aceite

- toda mensagem enviada possui ID real;
- recibos atualizam a mensagem correta;
- nenhuma mensagem enviada aumenta nao lidas;
- evento duplicado nao duplica mensagem nem contador;
- reload da pagina preserva o mesmo status;
- testes cobrem enviado, entregue, lido, reproduzido e falhou.

## Fase 2 â€” Identidade canonica, pushname, LID e telefone

Duracao estimada: 5 a 8 dias
Prioridade: P0
Objetivo: eliminar numeros gigantes, nomes mascarados e divergencias de identidade.

### 2.1 Criar servico de identidade no Go

Responsabilidades:

- identificar tipo de JID;
- resolver LID para telefone quando o mapeamento existir;
- persistir aliases;
- normalizar telefone;
- validar nome candidato;
- resolver nome exibido;
- evitar que dados inferiores sobrescrevam dados superiores.

### 2.2 Persistir eventos de nome

Adicionar tratamento para eventos relevantes suportados pela versao instalada do Whatsmeow:

- PushName;
- BusinessName;
- Picture;
- atualizacoes do contact store;
- mapeamentos LID/PN.

Os tipos exatos devem ser confirmados na versao fixada no `go.mod` antes da implementacao.

### 2.3 Backfill

Criar migracao/job que:

- detecte chats diretos com JID nao canonico;
- una duplicatas LID e telefone dentro da mesma instancia;
- preserve mensagens;
- substitua nomes placeholders;
- normalize telefones;
- vincule contato ao chat;
- gere relatorio de conflitos sem fusao automatica insegura.

### 2.4 DTO canonico

A API de chats deve entregar:

```json
{
  "id": "...",
  "chat_jid": "5548988003260@s.whatsapp.net",
  "contact": {
    "phone_e164": "+5548988003260",
    "phone_display": "+55 (48) 98800-3260",
    "push_name": "Nome do WhatsApp",
    "business_name": null,
    "manual_name": null,
    "crm_name": "Nome no CRM",
    "display_name": "Nome resolvido",
    "identity_status": "resolved"
  }
}
```

O frontend deixa de recalcular identidade por conta propria.

### Criterios de aceite

- `5548988003260` e `+5548988003260` resolvem o mesmo contato;
- nenhum `@lid` aparece na interface;
- nenhum nome mascarado tem prioridade sobre telefone valido;
- falta de pushname exibe telefone completo;
- nome manual nao e substituido por evento posterior;
- duplicatas sao detectadas dentro do tenant, nunca entre tenants.

## Fase 3 â€” Avatares e fotos de perfil via MinIO

Duracao estimada: 4 a 6 dias
Prioridade: P0/P1
Objetivo: exibir fotos de maneira estavel, privada e sem atrasar mensagens.

### 3.1 Remover avatar do caminho sincrono da mensagem

O recebimento da mensagem nao deve aguardar:

- consulta da foto;
- download do CDN;
- upload no MinIO.

Ele deve apenas agendar `avatar.refresh`.

### 3.2 Criar fila de avatar

Campos sugeridos:

```text
contact_id
instance_id
tenant_id
jid
picture_id
status
attempts
available_at
last_error
```

### 3.3 Armazenamento

Object key:

```text
{tenant_id}/whatsapp/avatars/{instance_id}/{contact_id}/{picture_id}.jpg
```

Nao usar telefone como unica chave, pois:

- o numero pode mudar;
- grupos nao possuem telefone;
- o mesmo telefone pode existir em instancias diferentes.

### 3.4 Entrega

Criar endpoint autenticado:

```text
GET /api/whatsapp/contacts/:contactId/avatar
```

O endpoint:

- valida tenant;
- consulta bucket/object key;
- gera URL assinada curta;
- retorna placeholder sem erro quando nao houver foto.

### 3.5 Eventos

Depois do upload:

- atualizar contato e chat;
- emitir `contact_avatar_updated` para o tenant;
- atualizar sidebar, cabecalho e painel sem reload.

### Criterios de aceite

- CDN do WhatsApp nunca e o contrato final do browser;
- bucket pode permanecer privado;
- foto aparece sem recarregar a pagina;
- falha de avatar nao atrasa mensagem;
- a foto de grupo nao e salva como foto do participante;
- avatar antigo continua disponivel enquanto o novo e processado.

## Fase 4 â€” Pipeline MinIO e recuperacao de midia

Duracao estimada: 7 a 10 dias
Prioridade: P0/P1
Objetivo: garantir que toda midia tenha estado, origem recuperavel e retry real.

### 4.1 Contrato unico

`whatsapp_media` deve ser a fonte de verdade.

Campos legados em `whatsapp_messages` podem permanecer temporariamente para compatibilidade, mas nao devem comandar o pipeline.

### 4.2 Midia recebida

Fluxo:

```text
mensagem recebida
â†’ salva payload WhatsApp
â†’ cria job pending
â†’ worker baixa
â†’ valida hash/MIME/tamanho
â†’ envia ao MinIO
â†’ grava object key
â†’ emite media_ready
```

### 4.3 Midia enviada

Fluxo recomendado:

```text
browser envia arquivo
â†’ API valida
â†’ grava spool/MinIO privado
â†’ Whatsmeow envia ao WhatsApp
â†’ persiste ID real
â†’ associa objeto ao registro da mensagem
```

Assim, se o envio ao WhatsApp ou a atualizacao do banco falhar, o arquivo ainda existe para retry.

### 4.4 Jobs

Criar `whatsapp_media_jobs` com:

- tipo;
- status;
- attempts;
- available_at;
- claimed_at;
- worker_id;
- last_error;
- payload;
- idempotency_key.

Filas:

- `media.download`;
- `media.upload`;
- `media.retry`;
- `media.thumbnail`;
- `media.waveform`;
- `media.transcribe`;
- `media.ocr`;
- `avatar.refresh`.

### 4.5 Backoff

Exemplo:

- tentativa 1: imediata;
- tentativa 2: 30 segundos;
- tentativa 3: 2 minutos;
- tentativa 4: 10 minutos;
- tentativa 5: 1 hora;
- depois: dead-letter/manual.

Erro de instancia desconectada nao deve consumir todas as tentativas rapidamente.

### 4.6 Seguranca

- bucket privado;
- URL assinada;
- verificacao tenant em toda leitura;
- limite por tipo;
- deteccao MIME pelo conteudo;
- nomes de arquivo sanitizados;
- antivÃ­rus para documentos;
- CORS restrito;
- sem credenciais MinIO no frontend.

### Criterios de aceite

- retry de midia outbound funciona;
- nenhuma midia fica `pending` indefinidamente;
- falha possui `last_error` e proxima tentativa;
- URL publica permanente deixa de ser obrigatoria;
- deduplicacao nunca cruza tenants;
- audio, imagem, video, documento e sticker possuem teste integrado.

## Fase 5 â€” Isolamento por imobiliaria e seguranca

Duracao estimada: 4 a 6 dias
Prioridade: P0
Objetivo: provar, por teste e constraint, que nenhuma imobiliaria acessa dados de outra.

### 5.1 Remover criacao automatica de organizacao

`InstanceRepo.Create` deve rejeitar tenant inexistente.

Comportamento esperado:

```text
403 ou 422
code: INVALID_TENANT
```

Registrar a tentativa no log de auditoria.

### 5.2 Tenant-aware repositories

Operacoes publicas dos repositorios devem receber tenant:

- conectar instancia;
- desconectar;
- apagar;
- buscar QR;
- buscar chat;
- listar mensagem;
- editar contato;
- retry de midia.

Funcoes sem tenant devem ficar restritas a processos internos claramente identificados.

### 5.3 Constraints

Avaliar:

- `tenant_id NOT NULL` em instancias;
- contatos com tenant materializado;
- mensagens e chats consistentes com a mesma instancia;
- media tenant consistente com a instancia;
- indices tenant-aware;
- unique de lead por `(organization_id, phone_e164)`.

### 5.4 WebSocket

Testar:

- token de tenant A nao recebe evento B;
- impersonacao expirada nao continua conectada;
- troca de tenant encerra ou recria socket;
- evento sem tenant nunca e usado para dados de negocio;
- conexao sem origin em producao segue politica explicita.

### 5.5 MinIO

Toda object key deve iniciar pelo tenant.

O endpoint de URL deve validar:

- media.tenant_id;
- instancia pertencente ao tenant;
- objeto correspondente ao registro;
- bucket permitido.

### Criterios de aceite

- testes automatizados tentam ataques cruzados;
- zero acesso cruzado em REST, WebSocket e midia;
- tenant inexistente nunca e criado pelo WhatsApp Service;
- operacoes internas sem tenant sao inventariadas;
- logs permitem identificar tenant, instancia e usuario.

## Fase 6 â€” Integracao CRM e edicao completa do lead

Duracao estimada: 5 a 7 dias
Prioridade: P1
Objetivo: fazer a conversa operar como uma extensao real do CRM.

### 6.1 Drawer de contato

Ao clicar no cabecalho ou contato, abrir drawer com abas:

- Resumo;
- CRM;
- Atendimento;
- Midias;
- Historico.

### 6.2 Edicao

Permitir editar:

- nome;
- telefone, com confirmacao e validacao;
- email;
- origem;
- classificacao;
- status/funil;
- responsavel;
- tags;
- observacoes;
- proximo follow-up;
- prioridade.

### 6.3 Semantica correta

Separar:

- `Nome no WhatsApp`: informativo;
- `Nome do lead`: editavel;
- `Nome exibido nesta conversa`: opcional/manual.

O botao nao pode dizer â€œEditar nome do leadâ€ se editar apenas o chat.

### 6.4 Criar tarefa

O botao atual deve:

- ser implementado; ou
- ser removido ate existir backend.

A implementacao deve criar tarefa real vinculada a:

- tenant;
- lead;
- conversa;
- usuario responsavel;
- prazo;
- atividade de auditoria.

### 6.5 Telefone

Exibir:

- numero completo;
- botao copiar;
- botao iniciar conversa;
- indicacao de numero verificado no WhatsApp;
- alerta se o telefone do lead divergir do telefone da conversa.

### Criterios de aceite

- editar nome do lead altera o CRM;
- usuario escolhe se deseja alterar tambem o nome manual da conversa;
- toda acao gera feedback e atividade;
- nenhum botao visual e inerte;
- campos pertencem ao tenant;
- conflito de telefone exige confirmacao.

## Fase 7 â€” Redesign da central de conversas

Duracao estimada: 7 a 10 dias
Prioridade: P1
Objetivo: melhorar legibilidade, hierarquia e velocidade operacional.

### 7.1 Sidebar

Proposta:

- busca por nome, telefone e mensagem;
- filtros por nao lida, responsavel, prioridade, tag e instancia;
- nome principal em 14 px;
- preview em 13 px;
- horario em no minimo 11 px;
- telefone completo em tooltip quando necessario;
- badge de falha;
- badge da instancia somente quando houver mais de uma.

As acoes administrativas â€œImportarâ€ e â€œExcluir tudoâ€ devem sair do fluxo principal da lista e ir para menu/configuracao da instancia.

### 7.2 Cabecalho

Exibir:

- avatar;
- nome resolvido;
- telefone completo;
- instancia;
- responsavel;
- estado da conexao;
- acoes principais.

O botao de ligar deve funcionar ou ser removido.

### 7.3 Mensagens

- fonte entre 14 e 15 px;
- line-height entre 1.45 e 1.55;
- largura maxima equilibrada;
- agrupamento visual por remetente;
- status de falha com texto acessivel;
- botao reenviar;
- resposta citada;
- menu de copiar, responder, reagir, editar e apagar quando suportado;
- estado de midia em processamento;
- skeleton de imagem;
- preview PDF;
- zoom e navegacao de galeria.

### 7.4 Painel de contato

Substituir a lista longa de botoes por:

- cabecalho com identidade;
- resumo do lead;
- proxima acao;
- responsavel;
- tags;
- botoes principais;
- demais acoes em menu.

### 7.5 Responsividade

Desktop:

```text
lista | conversa | drawer
```

Tablet:

```text
lista | conversa
drawer sobreposto
```

Mobile:

```text
uma tela por vez
```

### Criterios de aceite

- nenhuma informacao essencial usa fonte abaixo de 11 px;
- contraste atende WCAG AA quando aplicavel;
- teclado acessa conversa e acoes;
- truncamento possui forma de visualizar/copiar;
- mobile nao apresenta tres colunas comprimidas;
- drawer nao reduz a conversa a largura inutilizavel.

## Fase 8 â€” Capacidades adicionais do Whatsmeow

Duracao: evolutiva
Prioridade: P2
Objetivo: explorar a API depois de estabilizar o nucleo.

### Ordem sugerida

1. `IsOnWhatsApp` antes de iniciar conversa;
2. presenca online e digitando;
3. `SendChatPresence` durante digitacao;
4. marcacao de leitura real;
5. reacoes;
6. resposta citada completa;
7. edicao e revogacao;
8. perfil comercial;
9. participantes e administracao de grupos;
10. recuperacao de midia indisponivel;
11. enquetes;
12. newsletters/canais, se fizer sentido ao produto;
13. tratamento de chamadas recebidas;
14. bloqueio/desbloqueio.

Cada recurso deve passar por validacao de:

- suporte na versao instalada;
- comportamento multi-device;
- risco de banimento ou uso indevido;
- necessidade real do produto;
- permissao por tenant/plano;
- registro de auditoria.

## Fase 9 â€” Observabilidade, operacao e SLO

Duracao estimada: 4 a 6 dias para base inicial
Prioridade: P1
Objetivo: detectar falhas antes que o usuario precise enviar uma captura de tela.

### Metricas

Por tenant e instancia:

- conexao e reconexao;
- tempo desde ultimo evento;
- mensagens recebidas/enviadas;
- taxa de erro de envio;
- latencia do envio;
- recibos sem mensagem correspondente;
- eventos duplicados;
- jobs pending/failed;
- tempo de processamento de midia;
- falha MinIO;
- falha de avatar;
- chats com identidade nao resolvida;
- contatos sem telefone;
- leads duplicados;
- tamanho armazenado.

### Logs

Todo log relevante deve incluir:

```text
tenant_id
instance_id
chat_id
message_id
media_id
event_type
correlation_id
```

Nunca incluir:

- texto completo da mensagem em log comum;
- token;
- chave MinIO;
- payload de midia;
- dados pessoais desnecessarios.

### Alertas

- instancia desconectada por mais de 5 minutos;
- mais de 20 midias failed em 10 minutos;
- fila sem progresso;
- MinIO indisponivel;
- recibos nao correlacionados acima do limite;
- aumento de LIDs sem resolucao;
- tentativa de acesso cruzado;
- WebSocket com reconexao excessiva.

### SLO inicial

- 99,5% dos eventos de texto persistidos em ate 3 segundos;
- 95% das imagens processadas em ate 30 segundos;
- 99% dos recibos correlacionados;
- zero incidente de vazamento entre tenants;
- 99% das conversas diretas com telefone ou estado explicito de identidade nao resolvida.

## 7. Migracoes sugeridas

### 7.1 Identidade

- aliases JID/LID;
- campos de nome separados;
- telefone E.164;
- estado de avatar;
- lead_id;
- indices por tenant/instancia/telefone.

### 7.2 Estado de mensagens

- `whatsapp_message_status`;
- indice por mensagem/data;
- idempotency key de evento.

### 7.3 Jobs

- `whatsapp_media_jobs`;
- opcional `whatsapp_avatar_jobs`;
- dead-letter/status;
- claim atomico com `FOR UPDATE SKIP LOCKED`.

### 7.4 Auditoria

- `whatsapp_event_audit`, com retencao limitada;
- guardar metadados tecnicos, nao conteudo integral.

### 7.5 CRM

- `leads.phone_e164`;
- `leads.phone_search_key`;
- indice `(organization_id, phone_e164)`;
- migracao de duplicatas antes de aplicar unique.

## 8. Estrategia de testes

## 8.1 Unitarios Go

- normalizacao de telefone;
- classificacao de JID;
- LID nao e telefone;
- prioridade de nomes;
- rejeicao de placeholders;
- idempotencia de mensagem;
- transicao de status;
- object key com tenant;
- backoff.

Casos obrigatorios:

- `5548988003260`;
- `+5548988003260`;
- `(48) 98800-3260`;
- `554833806836`;
- `84388272410703@lid`;
- `120363366882241499@g.us`;
- `+55------30`;
- pushname vazio;
- pushname `~`.

## 8.2 Integracao Go/PostgreSQL

- duas instancias de tenants diferentes;
- mesmo telefone em ambos;
- mensagem duplicada;
- recibo chegando antes/depois do upsert;
- merge LID/telefone;
- midia com retry;
- instancia desconectada;
- exclusao em cascata.

## 8.3 API Node

- autorizacao;
- impersonacao;
- URL assinada;
- edicao de lead;
- transferencia somente dentro do tenant;
- tag somente dentro do tenant;
- rejeicao de media de outro tenant;
- tenant inexistente.

## 8.4 Frontend

- fallback de nome;
- numero completo;
- avatar pending/ready/error;
- status de mensagem;
- edicao CRM;
- botoes habilitados/desabilitados;
- layout desktop/tablet/mobile;
- acessibilidade.

## 8.5 End-to-end

Cenarios:

1. mensagem recebida de contato novo;
2. mensagem recebida com pushname;
3. mensagem recebida por LID com telefone alternativo;
4. envio de texto e atualizacao de checks;
5. envio de imagem com MinIO;
6. falha temporaria do MinIO e retry;
7. atualizacao de foto;
8. edicao do lead;
9. duas imobiliarias com o mesmo telefone;
10. tentativa de acessar chat de outro tenant.

## 9. Rollout

### Etapa 1 â€” Shadow mode

- calcular identidade nova sem substituir a antiga;
- registrar divergencias;
- medir quantos chats mudariam de nome/telefone.

### Etapa 2 â€” Tenant piloto

- habilitar flags para uma imobiliaria;
- acompanhar por 48 a 72 horas;
- comparar mensagens, recibos, avatares e midia.

### Etapa 3 â€” Expansao gradual

- 10%;
- 25%;
- 50%;
- 100%.

### Etapa 4 â€” Backfill

Executar em lotes pequenos:

- por tenant;
- por instancia;
- com checkpoint;
- sem bloquear a central;
- produzindo relatorio.

### Rollback

- flags restauram DTO e UX antigos;
- migrations inicialmente aditivas;
- nao remover colunas legadas antes de estabilidade;
- manter objetos MinIO anteriores;
- jobs podem ser pausados sem apagar registros.

## 10. Priorizacao consolidada

| Ordem | Entrega | Prioridade | Dependencia |
|---:|---|---|---|
| 1 | ID real de mensagem | P0 | nenhuma |
| 2 | Correcao de nao lidas | P0 | ID/idempotencia |
| 3 | Identidade canonica | P0 | modelo/migration |
| 4 | Numero completo e placeholders | P0 | identidade |
| 5 | Remover criacao automatica de tenant | P0 | nenhuma |
| 6 | Testes multi-tenant | P0 | contratos tenant |
| 7 | Avatar worker + MinIO privado | P0/P1 | identidade e jobs |
| 8 | Retry real de midia outbound | P0/P1 | spool/jobs |
| 9 | Edicao completa do lead | P1 | identidade/CRM |
| 10 | Drawer e redesign | P1 | DTO canonico |
| 11 | Observabilidade | P1 | eventos/jobs |
| 12 | Presenca, reacoes e edicao | P2 | nucleo estavel |

## 11. Cronograma sugerido

Para uma equipe pequena, com backend Go, Node e frontend compartilhados:

### Semana 1

- Fase 0;
- ID real;
- contador de nao lidas;
- testes de recibos;
- remocao da criacao automatica de tenant.

### Semana 2

- modelo canonico de identidade;
- pushname/nome comercial/manual;
- telefone e LID;
- DTO novo em shadow mode.

### Semana 3

- backfill controlado;
- avatar jobs;
- MinIO privado;
- evento de atualizacao de avatar.

### Semana 4

- pipeline outbound;
- jobs e retry;
- metricas de midia;
- testes integrados.

### Semana 5

- integracao CRM completa;
- edicao do lead;
- tarefas;
- atividades e auditoria.

### Semana 6

- redesign;
- acessibilidade;
- responsividade;
- tenant piloto.

### Semana 7

- correcao de achados do piloto;
- rollout gradual;
- documentacao operacional.

Estimativa total inicial: 6 a 7 semanas para o nucleo completo, podendo ser reduzida com execucao paralela desde que migrations, contratos e arquivos tenham responsaveis separados.

## 12. Divisao recomendada de trabalho

### Trilha A â€” Whatsmeow/Go

- IDs e recibos;
- identidade;
- LID;
- eventos;
- jobs;
- avatares;
- midia;
- testes Go.

### Trilha B â€” Banco/Seguranca

- migrations;
- constraints;
- RLS;
- indices;
- backfill;
- auditoria multi-tenant.

### Trilha C â€” Node/CRM/Storage

- DTO;
- endpoints CRM;
- URL assinada;
- validacao tenant;
- tarefas;
- observabilidade API.

### Trilha D â€” React/UX

- consumo do DTO;
- sidebar;
- mensagens;
- drawer;
- estados de midia;
- acessibilidade e responsividade.

As trilhas podem trabalhar em paralelo depois que o modelo canonico e os contratos JSON forem aprovados.

## 13. Definicao de pronto global

A entrega so deve ser considerada concluida quando:

- os testes Go, TypeScript e integracao passarem;
- houver teste com pelo menos dois tenants;
- `5548988003260` e `+5548988003260` forem tratados igualmente;
- nenhum LID aparecer como numero;
- falta de pushname mostrar o telefone completo;
- foto for servida pelo MinIO privado;
- mensagem enviada usar ID real;
- nao lidas estiverem corretas;
- retry outbound for demonstrado;
- editar lead alterar o CRM;
- botoes inertes tiverem sido implementados ou removidos;
- rollout e rollback estiverem documentados;
- metricas estiverem visiveis;
- nenhuma credencial ou dado sensivel for exposto.

## 14. Decisoes que devem ser tomadas antes da implementacao

1. Nome manual da conversa e nome do lead serao o mesmo campo ou campos independentes?
2. A imobiliaria podera desativar confirmacao de leitura e presenca?
3. Quantas instancias cada plano podera possuir?
4. Qual a retencao de midias por plano e tipo?
5. Avatares terao retencao permanente ou substituicao/versionamento?
6. A transcricao de audio sera automatica, por tenant ou sob demanda?
7. O sistema podera fundir automaticamente variante com/sem nono digito ou exigira confirmacao?
8. Grupos farao parte do CRM ou ficarao isolados da criacao de leads?

Recomendacoes:

- manter nome manual e nome CRM separados;
- permitir politica de leitura por tenant;
- controlar instancias por plano;
- nunca fundir nono digito automaticamente quando houver mais de um candidato;
- nao criar lead de grupo;
- habilitar transcricao inicialmente sob demanda ou por plano.

## 15. Conclusao

A melhor estrategia e estabilizar primeiro o que define confianca: identidade, ID da mensagem, status, tenant e armazenamento. O redesign deve consumir esses contratos novos, nao tentar esconder inconsistencias antigas.

O projeto ja possui boa parte da infraestrutura necessaria. A correcao integral depende principalmente de consolidar regras, tornar operacoes idempotentes, remover fallbacks perigosos e alinhar o texto da interface ao efeito real de cada acao.

Executando as fases na ordem proposta, o modulo deixa de ser apenas uma tela que replica conversas e passa a funcionar como uma central de atendimento multi-imobiliaria, auditavel e integrada ao CRM.
