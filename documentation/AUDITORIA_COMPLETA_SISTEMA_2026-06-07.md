# Auditoria completa do sistema IMOBZY

Data: 2026-06-07
Escopo: frontend React/Vite, backend Node/Express, banco Supabase/Postgres, servico WhatsApp em Go, worker Python e integracoes governamentais rurais/urbanas.

## Resumo executivo

O sistema esta em bom estado para frontend e backend Node: TypeScript, lint, build e testes Vitest passaram. O banco Supabase respondeu e as tabelas principais existem. A estrutura geral ja possui boas bases de seguranca: Helmet, CORS dinamico, rate limit, autenticacao por Supabase, isolamento por tenant em grande parte das rotas e proxy autenticado para WhatsApp.

Os maiores riscos encontrados estao em quatro frentes:

1. Integracoes governamentais ainda estao parcialmente simuladas ou quebradas.
2. WhatsApp nao esta validavel no ambiente atual: o health do proxy retorna 503 e a URL configurada retorna 404 nas rotas esperadas.
3. Onboarding publico registra `req.body` inteiro no console, incluindo senha.
4. Cadastro publico de leads aceita `organization_id` do cliente sem validar previamente se a organizacao existe/esta ativa.

## Testes executados

| Area | Comando/teste | Resultado |
| --- | --- | --- |
| TypeScript | `npm run type-check` | Passou |
| Build frontend | `npm run build` | Passou, com alertas de bundle grande e import do `react-leaflet-draw` |
| Testes JS | `npm test -- --run` | 6 arquivos, 29 testes passaram |
| Lint | `npm run lint` | Passou |
| Banco | `npm run check-db` | Passou; tabelas principais existem |
| Env | `node --env-file=.env scripts/check-env.mjs` | Variaveis obrigatorias presentes; script imprime prefixos de segredos |
| Go WhatsApp | `go test ./...` | Falhou em varios pacotes com `cannot find package` |
| Go parcial | `go test -count=1 ./pkg/phone` | Passou, sem arquivos de teste |
| Backend local isolado | porta `3022` | `/health` e `/api/system-status` OK |
| Rotas protegidas sem token | `/api/whatsapp/status`, `/api/rural/market/prices` | 401, esperado |
| WhatsApp health | `/api/whatsapp/health` | 503 |
| Tenant resolve publico | `/api/tenant/resolve` | 200, devolve tenant demo |
| SICAR/CAR WFS | Describe e query fake | HTTP 200, mas retorno XML de erro |
| SIGEF WFS | Describe e query fake | Falha DNS: `geoinfo.incra.gov.br` nao resolveu |

## Achados criticos

### 1. Senha pode ir para logs no onboarding

Arquivo: `server/routes/onboarding.js`
Linhas relevantes: 33-35 e 51.

A rota publica de onboarding faz:

```js
console.log("ONBOARDING RECEIVED");
console.log(req.body);
```

Como o schema inclui `password`, isso pode gravar senha em log local, Docker, PM2 ou observabilidade. E um risco critico de privacidade e compliance.

Recomendacao:

- Remover `console.log(req.body)`.
- Se precisar depurar, logar apenas campos nao sensiveis: email mascarado, profileType, plan e agencyName.
- Garantir que logs antigos com senhas sejam rotacionados/apagados quando possivel.

### 2. Cadastro publico de leads permite escolher qualquer `organization_id`

Arquivo: `server/routes/public.js`
Linhas relevantes: 46-77.

A rota `/api/public/leads` nao exige autenticacao, o que e normal para landing pages, mas aceita `organization_id` enviado pelo cliente e insere lead diretamente nessa organizacao.

Impactos:

- Spam direcionado a qualquer tenant conhecido.
- Poluicao de CRM de outra imobiliaria.
- Possivel custo adicional com `matchLeadProperties`.

Recomendacao:

- Resolver organizacao por slug/domino/landing page, nao por ID bruto vindo do browser.
- Validar se a organizacao existe, esta ativa e aceita leads publicos.
- Adicionar captcha/Turnstile ou protecao anti-bot por IP/fingerprint.
- Registrar origem e user-agent para auditoria.

### 3. WhatsApp nao esta operacionalmente validado

Arquivos:

- `server/api/whatsapp/index.js`
- `whatsapp-service/cmd/server/main.go`

O proxy Node espera que `WHATSAPP_API_URL/health` exista. No teste isolado do backend, `/api/whatsapp/health` retornou 503. Chamadas diretas a URL configurada retornaram 404 para `/health`, `/api/whatsapp/health`, `/api/health` e `/api/instances`.

Possiveis causas:

- `WHATSAPP_API_URL` aponta para servico errado.
- Servico Go nao esta rodando.
- Rota base esta diferente entre deploy e codigo.
- Outro servico local estava ocupando a porta 3002 durante parte dos testes.

Recomendacao:

- Padronizar contrato: Go deve expor `/health` e Node deve apontar exatamente para esse host.
- Adicionar teste automatizado de proxy WhatsApp em CI.
- Criar script `npm run check-whatsapp` que teste: Node proxy, Go health, banco, WS token e listagem de instancias autenticada.
- Garantir que o Go service nao fique exposto publicamente sem passar pelo proxy Node, pois ele confia em `tenant_id` na query para varias rotas.

### 4. Integracoes governamentais nao estao prontas para promessa de validacao juridica automatica

Arquivos:

- `server/api/rural/index.js`
- `server/services/sicarService.js`
- `server/api/urban/index.js`

Rural:

- `/api/rural/sncr/buscar` consulta Supabase local, nao SNCR.
- `/api/rural/sncr/imovel/:codigo` consulta Supabase local, nao SNCR.
- `/api/rural/itr/certidao/:nirf` devolve resposta orientativa/simulada.
- `/api/rural/car/consultar/:codigo` tenta WFS publico do SICAR.
- `/api/rural/sigef/consultar/:codigo` tenta WFS publico do SIGEF/INCRA.

Urbano:

- IPTU, CEP/endereco, zoneamento e CND sao simulados ou baseados em dados locais.
- Constantes SNCR/ITR existem no arquivo urbano mas nao sao usadas.

Teste externo:

- SICAR respondeu, mas com XML de erro, indicando layer/campo/endpoint incorreto para o teste.
- SIGEF nao resolveu DNS no ambiente local.

Recomendacao:

- Separar claramente na UI/API: `simulado`, `base_local`, `consulta_publica` e `consulta_oficial`.
- Corrigir layer/campo do SICAR com `GetCapabilities`/`DescribeFeatureType` valido.
- Implementar conectores oficiais com retry, timeout, cache e auditoria.
- Nao chamar SNCR/Receita/CND como "validado" enquanto nao houver integracao oficial ou parceiro homologado.

## Achados altos

### 5. Onboarding publico auto-aprova usuarios

Arquivo: `server/routes/onboarding.js`
Linhas relevantes: 49, 67 e 103.

Depois do primeiro usuario, qualquer cadastro cria usuario admin de uma nova organizacao com `approved: true`.

Isso pode ser aceitavel para trial/self-service, mas precisa de controles:

- Confirmacao de e-mail.
- Protecao anti-bot.
- Limite por dominio/IP.
- Plano trial com permissoes restritas.
- Monitoramento de abusos.

### 6. `tenant/resolve` publico devolve tenant demo por fallback

Arquivo: `server/index.js`
Linhas relevantes: 240-241.

No teste local, `/api/tenant/resolve` sem contexto retornou uma organizacao demo. Isso pode ser util para desenvolvimento, mas em producao pode causar confusao de roteamento, leads indo para tenant errado ou exposicao de uma experiencia demo onde deveria haver erro.

Recomendacao:

- Em producao, resolver apenas por host/slug valido.
- Retornar 404 quando nao houver tenant claro.
- Manter fallback demo apenas em `NODE_ENV !== 'production'`.

### 7. Build gera bundle principal muito grande

Resultado do build:

- `assets/index--rnyg1nn.js`: 1.3 MB minificado, 319 KB gzip.
- `AreaChart`: 397 KB.
- `LandingPageEditor`: 256 KB.
- `KanbanBoard`: 231 KB.

Recomendacao:

- Revisar imports estaticos em `App.tsx` e `components/DomainRouter.tsx`.
- Isolar Recharts, Leaflet, editor visual e WhatsApp dashboard em chunks manuais.
- Evitar import estatico de telas tambem importadas dinamicamente.

### 8. Alerta de dependencia `react-leaflet-draw`

O build alerta:

`"default" is not exported by leaflet.draw.js, imported by react-leaflet-draw`.

Hoje nao quebra o build, mas pode quebrar em upgrade de Vite/Rollup ou em runtime em telas de desenho.

Recomendacao:

- Testar fluxo de desenho no mapa.
- Considerar wrapper local ou alternativa mantida.

## Achados medios

### 9. Teste Go global falha apesar do modulo existir

`go list -m all` funciona, mas `go test ./...` falha com `cannot find package` em varios imports externos.

Hipoteses:

- Bug/incompatibilidade do Go 1.26.1 com dependencias novas ou cache local.
- Alguma configuracao de ambiente nao visivel no `go env` resumido.
- Dependencias com paths nao baixadas corretamente apesar do `go.sum`.

Recomendacao:

- Rodar `go clean -modcache` e `go mod download` em ambiente controlado.
- Fixar versao Go oficialmente suportada no Dockerfile/CI.
- Adicionar CI para `go test ./...` e `go build ./cmd/server`.

### 10. `check-env` imprime prefixos de segredos

Arquivo: `scripts/check-env.mjs`.

O script mascara, mas ainda imprime prefixos reais de chaves. Isso e suficiente para aumentar risco em prints/logs compartilhados.

Recomendacao:

- Exibir apenas `present/missing`.
- Opcional: mostrar comprimento e hash curto nao reversivel.

### 11. Health check do WhatsApp publico pode expor status operacional

Arquivo: `server/api/whatsapp/index.js`
Linha relevante: 183.

`/api/whatsapp/health` e publico. Nao expoe segredo, mas informa disponibilidade interna.

Recomendacao:

- Manter publico somente se usado por load balancer.
- Caso contrario, proteger ou reduzir detalhes.

### 12. Worker Python sem testes visiveis

Diretorio: `ai_worker`.

Nao foram encontrados testes automatizados para STT/TTS/provedores de IA/Kanban. Como esse worker toca audio e automacao, falhas podem afetar atendimento.

Recomendacao:

- Testes unitarios para conversao de audio, payloads e falhas de provider.
- Health endpoint com dependencias opcionais.
- Timeouts e limites de tamanho.

## Pontos positivos

- `.env` e `.env.production` nao estao versionados.
- `.gitignore` cobre arquivos sensiveis principais, `dist`, `node_modules`, sessoes WhatsApp e certificados Traefik.
- Backend usa Helmet, rate limit e CORS com lista de origins.
- A maioria das rotas de negocio usa `verifyAuth` + `requireTenant`.
- Storage valida bucket, MIME type, tamanho maximo e prefixo por tenant em signed URL.
- Banco Supabase respondeu com tabelas principais prontas.
- Build, lint, type-check e testes JS passaram.
- WebSocket WhatsApp tem JWT proprio com `purpose`, `issuer`, `audience` e `org_id`.

## Prioridade de acao

### Imediato

1. Remover log de `req.body` no onboarding.
2. Validar `organization_id` em `/api/public/leads` ou trocar por resolucao via slug/dominio.
3. Corrigir `WHATSAPP_API_URL` e garantir que `/api/whatsapp/health` fique 200.
4. Ajustar comunicacao do produto para nao prometer validacao oficial onde hoje ha simulacao/base local.

### Curto prazo

1. Corrigir conectores SICAR/SIGEF com `GetCapabilities` e testes automatizados.
2. Criar smoke tests de backend autenticado e nao autenticado.
3. Corrigir `go test ./...` e fixar versao Go em CI/Docker.
4. Proteger onboarding com captcha, confirmacao de email e limites adicionais.

### Medio prazo

1. Quebrar bundles grandes com code splitting real.
2. Adicionar testes de API para isolamento multi-tenant.
3. Criar auditoria de RLS por tabela no Supabase.
4. Adicionar observabilidade estruturada sem PII/senhas.
5. Testes ponta a ponta para WhatsApp: criar instancia, QR, listar chats, enviar mensagem e media.

## Conclusao

O sistema tem uma base solida, mas ainda mistura funcionalidades reais, simuladas e planejadas sob nomes muito parecidos. A maior melhoria estrutural e transformar esses limites em contratos explicitos: o que e dado local, o que e consulta publica, o que e integracao oficial e o que e apenas orientativo.

Do ponto de vista de seguranca, os dois reparos mais urgentes sao remover senha de logs e proteger melhor a entrada publica de leads. Do ponto de vista operacional, a maior pendencia e estabilizar a integracao WhatsApp e os conectores governamentais antes de tratar essas validacoes como confiaveis em producao.
