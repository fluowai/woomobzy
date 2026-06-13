# Plano de Correcao de Falhas - IMOBZY

**Data da revisao:** 13 de junho de 2026
**Base:** `RELATORIO_ANALISE_FALHAS_2026-06-13.md` e verificacao do repositorio atual
**Escopo principal:** WhatsMeow, servico Go, proxy Node, WebSocket, midia, containers e testes

## Resumo executivo

O relatorio original identifica riscos reais, mas mistura falhas confirmadas, riscos condicionais e
premissas incorretas. A execucao nao deve comecar pela troca arbitraria de versao do Go ou do
WhatsMeow. As prioridades reais sao:

1. Fechar a autenticacao do servico Go e do WebSocket contra acesso direto.
2. Corrigir concorrencia, contextos de ciclo de vida e reconexao do servico Go.
3. Tornar sessao e midia persistentes, recuperaveis e assincronas.
4. Criar uma esteira Go reproduzivel com testes de integracao e corrida.
5. Implementar receipts, importacao em lotes e melhorias operacionais.

Estimativa total recomendada: **27 a 42 dias-pessoa**. Em calendario: **5 a 8 semanas com uma
pessoa**, ou **3 a 5 semanas com dois backends e apoio parcial de frontend/QA/DevOps**.

## Validacao do relatorio original

| ID | Classificacao revisada | Evidencia e decisao |
|---|---|---|
| C1 | Incorreto | Go 1.25 existe. A maquina atual usa Go 1.26.1 e `golang:1.25-alpine` e uma referencia valida. Manter uma versao suportada e fixa, sem downgrade cego. |
| C2 | Incorreto como descrito | `20260427` e anterior a 13/06/2026 e o modulo aparece no grafo de dependencias. O risco real e usar pseudo-version sem processo documentado de atualizacao/rollback. |
| C3 | Confirmado | As sessoes ficam em SQLite no volume `whatsapp_sessions`. O volume reduz perda em restart, mas nao oferece backup, replicacao ou portabilidade entre hosts. |
| C4 | Confirmado | Download e upload de midia ocorrem antes de salvar a mensagem. A migration de status/fila ja existe, mas o worker assincrono ainda nao. |
| C5 | Parcial | O `Manager` possui mutex e evita duas conexoes simultaneas, mas o polling ainda pode recriar cliente desconectado e nao existe maquina de estados explicita/testada. |
| C6 | Parcial e mal descrito | Clientes ja possuem buffers individuais e descarte de cliente lento. Ainda ha gargalo em um hub, canal bloqueante e um erro real de lock ao remover cliente durante `RLock`. Redis so e necessario para varias replicas. |
| C7 | Confirmado e prioritario | Rotas Go e `/ws` aceitam `tenant_id` sem validar JWT/token interno. A seguranca depende da porta nunca ser exposta. |
| C8 | Confirmado | `HistorySync` percorre todas as conversas e mensagens recebidas no evento sem limite de memoria ou concorrencia. |
| C9 | Confirmado | Varias operacoes usam `context.Background()` e goroutines sem cancelamento coordenado. |
| C10 | Confirmado | Reconexao tem espera fixa, sem backoff, jitter, limite ou cancelamento. |
| C11 | Confirmado | A assinatura S3 manual deve ser substituida pelo SDK oficial MinIO/S3. |
| C12 | Confirmado para Go, incorreto para Node | Go possui cobertura muito baixa. Node/React possui 8 arquivos e 38 testes passando, nao zero. |
| M1 | Confirmado | Nao ha tratamento de `events.Receipt`; a UI possui estilo para status, mas nao recebe o estado real. |
| M2 | Confirmado no Dockerfile raiz | `go mod tidy` durante build e desnecessario e pode alterar o grafo. O Dockerfile interno ja diverge do raiz. |
| M3 | Confirmado | Runtime executa como root. |
| M4 | Confirmado | `CheckOrigin` retorna sempre `true`; o Origin ainda e removido no proxy. |
| M5 | Confirmado | Normalizacao BR esta duplicada em Go e JavaScript. Tratar com contrato e vetores de teste compartilhados. |
| M6 | Confirmado | Token interno tambem e fallback de assinatura do JWT WebSocket. Separar segredos. |
| M7 | Baixa prioridade | Import nao utilizado e rota comentada sao divida de manutencao, nao falha operacional. |
| M8 | Nao confirmado no repositorio atual | `.env` nao esta rastreado, `.gitignore` cobre arquivos sensiveis e a busca encontrou apenas placeholders. Auditar remotos/backups e rotacionar somente se houver evidencia de exposicao. |
| L1 | Baixo risco | O listener e criado antes do registro do `upgrade`, mas a chamada ocorre sincronicamente no mesmo bootstrap. Mover antes de `listen` melhora determinismo. |
| L2 | Confirmado | Remover Origin impede defesa em profundidade no Go. |
| L3 | Confirmado | Avatar faz GET e upload sincronos no fluxo de mensagem, apesar do timeout de 5 segundos. |
| L4 | Opcional | `name: imobzy` impede duas stacks com o mesmo nome; parametrizar se staging e producao compartilham host. |
| L5 | Resolvido | `.sessions/` e `node_modules` ja estao no `.gitignore`. |
| L6 | Confirmado | A configuracao aceita 12 aliases de URL de banco, nao 22, mas ainda e excessiva e ambigua. |

## Novos achados fora do relatorio

### N1. Escrita no mapa WebSocket sob `RLock` - critico

Em `internal/ws/hub.go`, o broadcast chama `delete(h.clients, client)` enquanto mantem apenas
`RLock`. `ClientCount` e logs leem o mesmo mapa em paralelo. Isso pode gerar data race e, sob
carga, `concurrent map read and map write`.

**Correcao:** o loop do hub deve ser o unico proprietario do mapa, sem mutex externo, ou deve
coletar clientes lentos durante leitura e remove-los depois sob `Lock`.

### N2. Contexto HTTP usado depois da resposta - alto

Ao criar uma instancia, uma goroutine chama `ConnectInstance(c.Request.Context(), ...)`. O contexto
da requisicao pode ser cancelado assim que a resposta 201 termina, interrompendo consultas e a
preparacao do QR de forma intermitente.

**Correcao:** usar contexto de ciclo de vida do servico, com timeout proprio, nunca o contexto Gin
capturado por goroutine.

### N3. Build Go nao reproduzivel no ambiente atual - alto

`go list -m all` resolve o grafo, mas `go test ./...` e `go build ./cmd/server` falham com
`cannot find package`, mesmo apos `go mod download`. A causa precisa ser isolada em uma imagem
limpa e no CI antes de alterar versoes. O teste unitario isolado de telefone passa.

**Correcao:** job hermetico em container, `go mod verify`, `go env`, build sem `tidy`, cache
descartavel e matriz com a versao definida em `go.mod`.

### N4. Dockerfiles duplicados e divergentes - medio

Existem `Dockerfile.whatsapp` e `whatsapp-service/Dockerfile`. Um executa `go mod tidy` e instala
`curl`; o outro nao. Isso cria resultados diferentes conforme o comando de build.

**Correcao:** manter um unico Dockerfile ou gerar ambos a partir da mesma convencao e validar no CI.

### N5. Bundle frontend excessivo e warning de compatibilidade - medio

O build passa, mas gera chunk principal de aproximadamente 1,48 MB e alerta que
`react-leaflet-draw` importa um default inexistente de `leaflet-draw`. Ha tambem modulo importado
estatica e dinamicamente, impedindo code splitting.

**Correcao:** corrigir versoes/import do mapa, separar rotas pesadas e definir chunks por dominio.

### N6. Lock global durante I/O de conexao - medio

`Manager.ConnectInstance` mantem o mutex global enquanto consulta banco, abre SQLite e cria o
cliente. Uma instancia lenta bloqueia connect/disconnect/get de todas as outras.

**Correcao:** lock curto por instancia, com registro de estado `connecting` antes do I/O.

### N7. Migration de midia existe sem executor assincrono - medio

A estrutura `media_status`, retry e `whatsapp_media` ja foi criada, mas o fluxo continua sincrono.
Isso aumenta o risco de a equipe considerar C4 resolvido apenas pela existencia da migration.

## Plano de execucao

### Fase 0 - Baseline e contencao (1 a 2 dias-pessoa)

- Criar job CI hermetico para Go: download, verify, test, race, vet e build.
- Fixar a politica de toolchain sem downgrade automatico; documentar atualizacao do WhatsMeow.
- Auditar remotos e backups por secrets. Rotacionar somente chaves comprovadamente expostas.
- Adicionar testes de fumaca para imagem Docker e health check.

**Aceite:** build limpo repetivel duas vezes sem alterar `go.mod/go.sum`; causa do erro local
documentada; nenhuma credencial real rastreada.

### Fase 1 - Fronteira de seguranca (3 a 5 dias-pessoa)

- Exigir JWT de usuario ou token interno assinado no Go para todas as rotas privadas.
- Derivar `tenant_id` do token/header autenticado e ignorar valor fornecido pelo cliente.
- Separar `WHATSAPP_SERVICE_TOKEN` de `WHATSAPP_WS_JWT_SECRET`.
- Validar Origin no upgrade WebSocket e parar de remove-lo no proxy.
- Restringir rede/porta 3100 no Compose e no ambiente de producao.
- Testar acesso cross-tenant, token expirado, Origin invalido e bypass direto.

**Aceite:** nenhuma rota de dados responde apenas com `tenant_id`; tentativa cross-tenant retorna
401/403; WebSocket exige token valido e Origin permitido.

### Fase 2 - Concorrencia e ciclo de vida (3 a 5 dias-pessoa)

- Corrigir N1 e criar testes concorrentes do hub.
- Introduzir contexto raiz cancelavel no `Manager` e clientes.
- Remover contextos HTTP capturados por goroutines e aplicar timeouts.
- Implementar reconexao com backoff exponencial, jitter, limite e reset apos sucesso.
- Reduzir lock global para lock por instancia.
- Formalizar estados `disconnected`, `connecting`, `qr_ready`, `connected`, `retry_wait` e `logged_out`.

**Aceite:** `go test -race` passa; shutdown nao deixa goroutines; polling de QR nao reinicia fluxo
ativo; logout nao dispara reconexao.

### Fase 3 - Persistencia de sessao (2 a 4 dias-pessoa)

- Migrar o device store do SQLite local para PostgreSQL suportado pelo WhatsMeow.
- Definir schema, criptografia/controle de acesso, backup e restauracao.
- Criar migracao assistida para sessoes atuais ou plano explicito de novo pareamento.
- Remover CGO/SQLite do container se nao houver outro uso.

**Aceite:** recriar container e mover stack para outro host preserva conexoes; restore e testado;
tenant nao acessa store de outro tenant.

### Fase 4 - Pipeline assincrono de midia (6 a 10 dias-pessoa)

- Salvar mensagem imediatamente com `media_status=pending`.
- Publicar job transacional ou recuperavel usando PostgreSQL/Redis, sem perda entre commit e enqueue.
- Implementar worker com idempotencia, timeout, retry, backoff e dead-letter.
- Substituir assinatura manual pelo SDK `minio-go/v7` ou SDK S3 compativel.
- Atualizar `whatsapp_media` e emitir evento WebSocket `media_ready`/`media_failed`.
- Mover avatar para cache/worker com TTL por JID.
- Aplicar limites de tamanho, MIME, streaming e multipart.

**Aceite:** texto aparece antes do upload; falha temporaria e recuperada sem duplicar objeto;
reinicio do worker nao perde job; audio/imagem/video/documento possuem testes end-to-end.

### Fase 5 - Historico, receipts e escala (4 a 7 dias-pessoa)

- Processar HistorySync em lotes, com limite de memoria, checkpoint e cancelamento.
- Implementar `events.Receipt` e persistir `sent/delivered/read/failed`.
- Atualizar UI em tempo real e ao recarregar pagina.
- Fazer teste de carga do hub atual. Adotar Redis Pub/Sub somente se houver replicas horizontais ou
  se os SLOs falharem; caso contrario, manter hub local corrigido.
- Parametrizar nome da stack e simplificar aliases de banco.

**Aceite:** importacao grande nao causa OOM; receipts sobrevivem a reload; teste de carga atende
SLO definido para conexoes e eventos por segundo.

### Fase 6 - Cobertura, containers e frontend (5 a 9 dias-pessoa)

- Testar repositorios com banco efemero ou mocks focados, handlers com `httptest` e fluxo do manager.
- Adicionar testes de contrato Go/Node com os mesmos vetores de telefone.
- Consolidar Dockerfile, remover `go mod tidy`, criar usuario non-root e usar imagem runtime suportada.
- Corrigir warning `react-leaflet-draw` e dividir bundles grandes por rota/modulo.
- Adicionar metricas de fila, reconexao, QR, latencia, erro de storage e clientes WebSocket.

**Aceite:** suites Node e Go verdes no CI; cobertura das regras criticas acordada; container roda
non-root; build frontend sem warning de import e com orcamento de bundle definido.

## Ordem recomendada de entregas

| Entrega | Fases | Duracao calendario sugerida |
|---|---|---|
| Release 1 - Seguranca e estabilidade basica | 0, 1 e parte da 2 | Semana 1 |
| Release 2 - Sessoes e reconexao confiaveis | restante da 2 e 3 | Semana 2 |
| Release 3 - Midia assincrona | 4 | Semanas 3 e 4 |
| Release 4 - Historico, receipts e escala | 5 | Semana 5 |
| Release 5 - Hardening e performance | 6 | Semanas 5 a 7 |

## Verificacoes executadas nesta revisao

- `npm run type-check`: passou.
- `npm run build`: passou com warnings de bundle/import.
- `npm run test -- --run`: 8 arquivos e 38 testes passaram.
- `go version`: Go 1.26.1 local, provando que Go 1.25 nao e versao inexistente.
- `go list -m all`: WhatsMeow pseudo-version e dependencias foram resolvidas no grafo.
- `go test ./...` e `go build ./cmd/server`: falharam na resolucao de pacotes no ambiente atual,
  inclusive apos `go mod download`; deve ser tratado na Fase 0.
- Busca por secrets rastreados: somente templates/placeholders encontrados no estado e historico
  local visivel.

## Decisoes que nao devem ser tomadas sem evidencia

- Nao fazer downgrade automatico para Go 1.23.
- Nao trocar a pseudo-version do WhatsMeow sem teste de compatibilidade e plano de rollback.
- Nao introduzir Redis apenas porque existe uma goroutine de hub; primeiro corrigir a race e medir.
- Nao declarar vazamento de secrets sem auditar o remoto e o historico real usado em producao.
