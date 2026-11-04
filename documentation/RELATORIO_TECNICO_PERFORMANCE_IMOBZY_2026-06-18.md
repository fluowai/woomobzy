# Relatório Técnico de Performance — Imobzy

**Data da auditoria:** 18 de junho de 2026  
**Escopo:** frontend React/Vite, API Node/Express, Supabase/Postgres, Docker, Nginx, Traefik e tela de Kanban  
**Método:** inspeção estática dos arquivos reais, build de produção, consulta somente leitura aos metadados e estatísticas do Postgres configurado no projeto.

## 1. Resumo Executivo

A lentidão do Kanban não é causada por uma única query excepcionalmente lenta. O problema principal é a soma de decisões que fazem a aplicação carregar e processar muito mais dados do que a tela precisa:

1. `services/leads.ts:46-61` percorre **todas as páginas da API sequencialmente** quando `page` não é informado.
2. `views/CRM/KanbanBoard.tsx:1314-1319` chama esse método sem página, portanto espera todos os leads antes de liberar a tela.
3. A API em `server/api/crm/index.js:131-157` usa `select('*')`, join de imóvel, join de tags e `count: 'exact'` em cada página.
4. O maior tenant do banco possui **843 leads**. Com limite 100, a abertura atual exige **9 chamadas HTTP sequenciais** só para leads.
5. O Kanban renderiza todos os cards simultaneamente em `views/CRM/KanbanBoard.tsx:1577`, sem paginação por coluna ou virtualização.
6. Cada card executa matching heurístico contra a lista de imóveis em `views/CRM/KanbanBoard.tsx:1194-1230`. O custo cresce aproximadamente como **quantidade de leads × quantidade de imóveis**.
7. A tela carrega imóveis em paralelo com os leads, mas `propertyService.list()` traz `select('*')` do backend, incluindo textos, arrays, JSON e imagens que o card não utiliza.
8. Cada chamada autenticada passa por validações remotas repetidas de usuário, perfil, organização e tenant em `server/middleware/auth.js` e `server/middleware/tenant.js`.

No snapshot do banco:

- 909 leads no total;
- 843 leads no maior tenant;
- 824 leads no status `Novo`;
- 83 imóveis;
- 680 tags;
- 149 atividades;
- tabela `leads` com 1,7 MB;
- linha média de lead com aproximadamente 1,2 KB, chegando a 39,6 KB;
- `pg_stat_statements` habilitado;
- consulta paginada do Kanban com média histórica próxima de 19 ms no banco;
- consultas sem paginação de leads registraram médias históricas entre aproximadamente 80 e 96 ms.

O Postgres ainda é pequeno e responde bem. A consulta equivalente aos primeiros 100 leads executou em aproximadamente **8,4 ms** no banco. O tempo percebido nasce principalmente de round trips sequenciais, autenticação repetida, payload amplo e renderização de centenas de cards.

### Maiores riscos

- Abertura do Kanban ficará progressivamente mais lenta a cada novo lead.
- Uma coluna concentrada, hoje `Novo`, cria centenas de componentes DnD e nós DOM de uma vez.
- Arrastar um card atualiza o array completo de leads e re-renderiza o board inteiro.
- Políticas RLS duplicadas aumentam complexidade, custo de planejamento e risco de comportamento divergente.
- Ausência de limites de CPU/RAM nos containers permite que um serviço pressione toda a VPS.
- Falta de métricas de latência por rota impede detectar regressões antes do usuário.

## 2. Diagnóstico Técnico

### Frontend

#### F1. Todos os leads são carregados antes da primeira renderização útil

**Arquivos:** `services/leads.ts:46-61`, `views/CRM/KanbanBoard.tsx:1314-1319`

`leadService.list()` busca a primeira página, lê `pagination.pages` e realiza um `for` com `await` para cada página restante. O Kanban chama `leadService.list()` sem argumentos. A paginação existe na API, mas é neutralizada pelo cliente.

Com 843 leads no maior tenant e limite 100, são feitas 9 chamadas em série. A tela mantém `loading=true` até todas terminarem.

#### F2. Kanban sem virtualização ou carregamento incremental

**Arquivo:** `views/CRM/KanbanBoard.tsx:1539-1778`

Cada coluna executa `stageLeads.map()` e cria um `Draggable` para cada lead. Não existe:

- janela virtual;
- limite inicial por coluna;
- botão ou sentinel para “carregar mais”;
- paginação baseada em cursor;
- colapso de cards fora do viewport.

Como 824 de 909 leads estão em `Novo`, a pior coluna concentra praticamente toda a árvore de componentes.

#### F3. Matching de imóveis executado dentro da renderização de cada card

**Arquivo:** `views/CRM/KanbanBoard.tsx:1194-1230`

`PropertyMatches` filtra e ordena `allProperties` para cada lead renderizado. O componente não está memoizado e os resultados não são pré-calculados.

No estado atual, 843 leads × até 50 imóveis carregados significam dezenas de milhares de comparações por renderização, além de ordenações por card. Quando qualquer estado do board muda — busca, seleção, modal ou drag — esse trabalho pode se repetir.

#### F4. Filtros por etapa recalculados repetidamente

**Arquivo:** `views/CRM/KanbanBoard.tsx:1415-1423`, usos em `1515` e `1542`

`getLeadsByStage()` percorre o array completo. É chamado para os botões mobile e novamente para cada coluna desktop. A busca também chama `toLowerCase()` repetidamente.

O custo isolado é menor que o matching, mas se soma às renderizações do board.

#### F5. Atualização de status re-renderiza o conjunto completo

**Arquivo:** `views/CRM/KanbanBoard.tsx:1327-1347`

O drag executa `leads.map()` sobre todos os registros e substitui o array inteiro. Como os cards não estão extraídos para um componente `React.memo`, o board pode re-renderizar centenas de cards.

O `@hello-pangea/dnd` também precisa manter todos os itens registrados. Não há `DragOverlay` isolado nem estratégia virtualizada.

#### F6. Payload de imóveis excessivo para o Kanban

**Arquivos:** `views/CRM/KanbanBoard.tsx:1305-1311`, `services/properties.ts:47-53`, `server/api/properties/index.js:38-61`

O Kanban precisa de poucos campos para matching superficial: `id`, `title`, `price`, `city`, `state`, `property_type` e `niche`. Entretanto o endpoint usa `select('*')`, podendo retornar descrição, features JSON, análise de IA, proprietário, arrays e lista completa de imagens.

#### F7. Chunk principal e precache grandes

**Arquivos:** `App.tsx:31-34`, `vite.config.ts:90-122`

Build validado em produção:

- `assets/index-*.js`: **837,86 KB**, 220,62 KB gzip;
- `assets/KanbanBoard-*.js`: **234,05 KB**, 53,02 KB gzip;
- CSS principal: **204,92 KB**, 27,86 KB gzip;
- charts: **435,61 KB**, 118,56 KB gzip;
- precache PWA: **198 arquivos / 7,47 MB**.

`LandingPage`, `SystemSalesPage`, `Login` e `Onboarding` são imports estáticos em `App.tsx:31-34`, aumentando o chunk inicial para usuários que entram diretamente no painel.

#### F8. Cache de Supabase com risco de dados autenticados obsoletos

**Arquivo:** `vite.config.ts:112-121`

O service worker usa `NetworkFirst` para `https://api.supabase.*` com retenção de 24 horas. O padrão não aparece compatível com os hosts normais `*.supabase.co`, portanto pode nem atuar. Se ampliado no futuro, cachear respostas autenticadas multi-tenant sem chave por usuário/tenant é arriscado.

### Backend/API

#### B1. Endpoint do Kanban retorna colunas pesadas e executa contagem exata

**Arquivo:** `server/api/crm/index.js:131-157`

Consulta atual:

```js
.select('*, properties(title, price, images), lead_tags(tag)', { count: 'exact' })
```

Problemas:

- `*` inclui `notes`, `preferences`, `matched_properties`, `ai_profile`, textos e outros campos não necessários no card;
- `properties.images` pode trazer arrays completos quando o card usa somente a primeira imagem;
- `count: 'exact'` é executado em todas as páginas solicitadas pelo loop do frontend;
- o frontend busca todas as páginas, portanto o custo da paginação é multiplicado.

#### B2. Autenticação e tenant fazem consultas repetidas por request

**Arquivos:** `server/middleware/auth.js:11-278`, `server/middleware/tenant.js:9-84`

Em uma chamada comum:

1. o token é validado pelo Supabase;
2. o perfil é resolvido;
3. a organização é consultada por ID;
4. `requireTenant` consulta a organização novamente.

No carregamento atual de 9 páginas de leads mais imóveis, isso multiplica chamadas remotas de controle. Não há cache curto em memória para perfil/organização autenticada.

As estatísticas do banco mostram 63.613 sequential scans em `profiles` e 37.465 em `organizations`. As tabelas são pequenas, mas o volume confirma uso frequente.

#### B3. Rota de atividades não possui limite

**Arquivo:** `server/api/crm/index.js:579-594`

Ao abrir um lead, todas as atividades são carregadas e ordenadas. Hoje o volume é baixo, mas o endpoint crescerá sem limite e pode carregar históricos extensos.

#### B4. Criação e edição podem bloquear aguardando matching

**Arquivo:** `server/api/crm/index.js:379-424`, `431-491`

A criação chama `matchLeadProperties()` antes de responder. Edições em campos relevantes também aguardam rematch. Esse processamento pode envolver leitura de imóveis e IA externa. Para UX, matching deveria ser assíncrono ou possuir timeout/fallback rigoroso.

#### B5. Logs de autenticação excessivos

**Arquivo:** `server/middleware/auth.js:98-185`, `325-340`

Há diversos `console.log('[AUTH DEBUG]...')` fora de condição de desenvolvimento. Em produção, isso aumenta I/O, volume de logs no Docker/Portainer e custo operacional, além de registrar IDs internos.

#### B6. API não possui compressão explícita

**Arquivos:** `server/index.js`, `docker/nginx/frontend.conf`

Não há middleware `compression` no Express. Nginx não configura `gzip`/Brotli e desativa `proxy_buffering` para todo `/api`. Assim, respostas JSON grandes do Kanban podem atravessar a rede sem compressão no caminho interno/externo, dependendo do Traefik.

#### B7. Outras telas repetem o padrão “buscar tudo”

**Arquivos principais:**

- `views/CRM/CRMLeads.tsx:21`
- `views/EmailCenter.tsx:142-146`
- `views/rural/FinanceiroRural.tsx:37-40`
- `src/hooks/useLeads.ts:18-31`
- `src/hooks/useProperties.ts:23-31`

`leadService.list()` sem página também é usado fora do Kanban. O mesmo gargalo pode aparecer em CRM, e-mail e financeiro.

### Banco de dados

#### D1. Falta índice composto para a consulta principal do Kanban

A consulta filtra por `organization_id` e ordena por `created_at DESC`. Existem índices isolados/duplicados em `organization_id`, mas não:

```sql
(organization_id, created_at DESC)
```

O `EXPLAIN ANALYZE` mostrou `Index Scan` por organização seguido de `Sort top-N`. Com 843 linhas ainda foi rápido, mas o sort crescerá.

Para paginação por coluna, também será necessário:

```sql
(organization_id, status, created_at DESC, id DESC)
```

#### D2. Índices duplicados

No banco real existem:

- `idx_leads_org` e `idx_leads_organization`, ambos em `leads(organization_id)`;
- `idx_properties_organization` e `idx_props_org`, ambos em `properties(organization_id)`.

Índices duplicados aumentam escrita, vacuum e armazenamento sem benefício.

#### D3. `lead_activities` sem índice funcional para a rota usada

A rota filtra:

```sql
WHERE lead_id = ? AND organization_id = ?
ORDER BY created_at DESC
```

No snapshot, `lead_activities` possui apenas chave primária. As estatísticas indicam 266 sequential scans e apenas 1 index scan.

#### D4. RLS duplicada e inconsistente

No banco real há várias policies simultâneas em `leads` e `properties`, incluindo:

- `Brokers can manage...`;
- `Tenant isolation for...`;
- `Tenant isolation ...`;
- `Users can view...`;
- `leads_isolation`;
- `tenant_leads` / `tenant_properties`.

O PostgreSQL combina policies permissivas com `OR`. Isso aumenta complexidade de avaliação e torna difícil provar isolamento. Algumas usam `profiles`, outras JWT e outras funções.

`lead_tags` possui policy `FOR ALL` para `public` com `USING (true)`, apesar da intenção de isolamento multi-tenant. É um problema de segurança e governança, além de impedir simplificação do plano.

#### D5. Campos pesados são enviados na listagem

`leads` possui:

- `matched_properties JSONB`;
- `preferences JSONB`;
- `ai_profile JSONB`;
- `notes TEXT`;
- `match_summary TEXT`.

Uma linha média ocupa aproximadamente 1,2 KB, mas a maior linha chega a 39,6 KB. Esses campos devem ser carregados apenas no detalhe.

`properties` também possui descrições, arrays de imagens, `features`, `ai_analysis` e `owner_info`, inadequados para uma listagem auxiliar do Kanban.

#### D6. Busca de lead por telefone não usa índice tenant-aware

Existe `idx_leads_phone(phone)`, mas as consultas usam:

```sql
WHERE organization_id = ? AND phone = ?
```

O índice recomendado é `(organization_id, phone)`, idealmente `UNIQUE` após eliminar duplicidades por tenant.

#### D7. Estatísticas mostram alta repetição de queries operacionais

`pg_stat_statements` registra:

- 6.179 chamadas de busca de lead por organização + telefone;
- 4.344 consultas de imóveis por organização;
- 368 chamadas da query do Kanban com joins, média aproximada de 19 ms;
- consultas de todos os leads de um tenant com média de 80–96 ms.

O problema dominante é frequência e desenho de acesso, não uma tabela grande.

### Infraestrutura

#### I1. Containers sem limites de CPU e memória

**Arquivo:** `docker-compose.yml`

Nenhum serviço define `mem_limit`, `cpus` ou limites de deploy. API, WhatsApp, IA e workers podem competir pela mesma VPS.

#### I2. Dependência rígida atrasa disponibilidade da API

**Arquivo:** `docker-compose.yml:59-65`

A API depende do WhatsApp saudável e dos workers iniciados. Uma falha ou inicialização lenta de serviço secundário pode atrasar a API principal, mesmo para o Kanban.

#### I3. Proxy com buffering desabilitado globalmente para API

**Arquivo:** `docker/nginx/frontend.conf:55-82`

`proxy_buffering off` é adequado para streaming/WebSocket, mas está aplicado a toda API. Para JSON normal, buffering ajuda a desacoplar upstream, permite compressão e melhora uso de conexões. Deve ser desativado apenas nas rotas de WebSocket/stream.

#### I4. Sem compressão explícita

Não há `gzip on`, Brotli ou middleware equivalente. O payload do Kanban é um candidato claro a compressão.

#### I5. Access log do Traefik sem retenção/filtros

**Arquivo:** `traefik/traefik.yml:8`

`accessLog: {}` registra tudo sem configuração de rotação no arquivo. Em Docker, a retenção depende do logging driver do host/Portainer, não declarado no compose.

#### I6. Imagem da API instala dependências amplas

**Arquivo:** `Dockerfile.api`

`npm ci --omit=dev` instala todas as dependências de produção do projeto, inclusive bibliotecas prioritariamente frontend. A imagem e superfície de dependências ficam maiores que o necessário.

#### I7. Métricas de produção não disponíveis neste snapshot

O Docker Desktop local estava parado durante a auditoria. Portanto não foram inventados valores de CPU, RAM, disco ou latência dos containers. A medição deve ser feita no host Portainer conforme o checklist da seção 6.

### Kanban — análise específica

| Item | Situação encontrada |
|---|---|
| Quantidade de cards | 843 no maior tenant; 824 leads totais estão em `Novo` |
| Todos carregados de uma vez | Sim. A API pagina, mas `leadService.list()` percorre todas as páginas |
| Dados por card | A API retorna `leads.*`, imóvel com `images` e tags |
| Filtro/paginação por coluna | Não |
| Virtualização | Não |
| Chamadas simultâneas | Leads e imóveis iniciam próximos; páginas de leads são sequenciais |
| Dados além do necessário | Sim: JSONs, notas, match completo, imagem array e campos de detalhe |
| N+1 | Não há N+1 clássico por card na listagem; há múltiplas páginas e trabalho O(leads × imóveis) no frontend |
| Drag and drop | Atualiza array completo e mantém todos os `Draggable` montados |
| Busca | Client-side sobre todos os leads |
| Matching | Recalculado por card durante renderização |
| Atividades | Carregadas só ao abrir modal, o que é correto, mas sem paginação |

## 3. Gargalos Críticos

| ID | Problema | Severidade | Evidência |
|---|---|---:|---|
| K1 | Frontend neutraliza paginação e baixa todos os leads | **Crítico** | `services/leads.ts:46-61`; 843 leads/9 requests |
| K2 | Todos os cards DnD renderizados sem virtualização | **Crítico** | `KanbanBoard.tsx:1539-1778`; 824 em uma etapa |
| K3 | Matching O(leads × imóveis) durante render | **Crítico** | `KanbanBoard.tsx:1194-1230` |
| B1 | Payload `select('*')` + joins + count exato | **Alto** | `server/api/crm/index.js:139` |
| B2 | Autenticação/tenant consultam banco repetidamente por request | **Alto** | `auth.js`, `tenant.js` |
| D1 | Falta índice `(organization_id,status,created_at,id)` | **Alto** | índices reais consultados |
| D3 | `lead_activities` sem índice e sem paginação | **Alto** | 266 seq scans; rota sem limit |
| D4 | Policies RLS duplicadas e permissivas | **Alto** | `pg_policies` real |
| I1 | Sem limites de recursos dos containers | **Alto** | `docker-compose.yml` |
| I4 | Sem compressão explícita de JSON | **Alto** | Express/Nginx |
| F7 | Chunk inicial 837 KB e PWA 7,47 MB | **Médio** | build real |
| B4 | Matching síncrono na criação/edição | **Médio/Alto** | rotas CRM |
| D2 | Índices duplicados | **Médio** | `pg_indexes` real |
| D6 | Índice de telefone não combina tenant | **Médio** | consultas e índices reais |
| I3 | Buffering desligado para toda API | **Médio** | Nginx |
| I5 | Logs sem política declarada de retenção | **Médio** | Traefik/compose |
| F8 | Estratégia PWA para Supabase inadequada | **Médio** | `vite.config.ts` |
| F4 | Repetição de filtros e normalizações | **Baixo/Médio** | Kanban |

## 4. Recomendações de Correção

### R1. Implementar paginação por coluna no Kanban

**O que corrigir:** parar de buscar todos os leads.

**Por que:** reduz chamadas, payload, DOM e tempo para primeira interação.

**Como:**

- API aceitar `status`, `cursor_created_at`, `cursor_id` e `limit`;
- carregar inicialmente 30–50 cards por coluna;
- buscar próxima página somente ao aproximar do final;
- retornar contadores por etapa em endpoint/RPC separado.

**Impacto esperado:** redução de 9 requests para 1–6 requests pequenos e paralelos; queda de 80–95% no número inicial de cards montados.

### R2. Criar DTO enxuto de card

**O que corrigir:** remover `select('*')` da listagem.

**Como:** retornar somente:

```text
id, name, phone, source, status, classification, lead_score,
ai_next_action, next_visit_at, created_at, chat_jid, campaign,
property_id, property(title, price, thumbnail), tags
```

`notes`, `preferences`, `ai_profile`, `matched_properties` e histórico ficam no endpoint de detalhe.

**Impacto esperado:** payload previsível e redução expressiva nos casos de leads com JSON/texto grande.

### R3. Remover matching por card da renderização

**O que corrigir:** não filtrar e ordenar imóveis em cada `PropertyMatches`.

**Como:**

- preferencial: usar matches persistidos e retornar somente os 1–3 resumos do card;
- alternativa imediata: pré-calcular um `Map<leadId, MatchSummary[]>` em `useMemo`;
- carregar imóveis compactos somente quando necessário;
- executar rematch em job assíncrono.

**Impacto esperado:** elimina o principal custo de CPU no navegador.

### R4. Virtualizar as colunas

**O que corrigir:** montar apenas cards visíveis.

**Como:** usar `@tanstack/react-virtual` ou `react-window`, com integração DnD baseada em overlay e alturas estimadas/fixas. Se a integração completa demandar mais tempo, implementar primeiro paginação incremental de 30 cards, que já remove a maior parte do problema.

**Impacto esperado:** DOM estável e drag fluido mesmo com milhares de leads.

### R5. Reduzir round trips de autenticação

**O que corrigir:** evitar consultas repetidas de perfil e organização.

**Como:**

- cache em memória por 30–60 segundos para `token hash → user/profile/org`;
- não consultar a mesma organização novamente em `requireTenant` quando `verifyAuth` já validou;
- usar claims JWT atualizados para caminho rápido, mantendo fallback ao banco;
- invalidar cache em alteração de perfil/tenant.

**Impacto esperado:** menor TTFB em todas as rotas autenticadas.

### R6. Consolidar índices e RLS

**O que corrigir:** adicionar índices alinhados às queries e remover duplicados/policies legadas.

**Impacto esperado:** planos mais simples, menor custo de escrita e isolamento mais auditável.

### R7. Comprimir API e ajustar proxy

**O que corrigir:** habilitar Brotli/gzip para JSON e buffering para rotas HTTP normais.

**Como:**

- adicionar `compression` no Express ou gzip no Nginx/Traefik;
- manter `proxy_buffering off` somente em `/api/whatsapp/ws` e streaming;
- habilitar HTTP/2/HTTP/3 no edge quando suportado.

**Impacto esperado:** redução de 60–85% em JSON textual, dependendo do payload.

### R8. Criar observabilidade por rota

**O que corrigir:** hoje não há histograma de latência, tamanho de resposta e erro por endpoint.

**Como:**

- middleware de `Server-Timing`;
- métricas Prometheus/OpenTelemetry;
- p50/p95/p99 por rota;
- log estruturado com amostragem;
- dashboard para CPU, RAM, event loop, conexões e queries.

## 5. Plano de Ação

### Correções imediatas — até 24h

1. Alterar o Kanban para carregar somente a primeira página, com limite 50.
2. Adicionar filtro `status` ao endpoint de leads.
3. Substituir `select('*')` por campos de card.
4. Remover `matched_properties`, `notes`, `preferences` e `ai_profile` da listagem.
5. Não carregar `properties.images` completo; retornar apenas thumbnail.
6. Remover matching heurístico de dentro de cada card.
7. Memoizar cards e agrupamento por etapa.
8. Colocar paginação de 50 atividades no modal.
9. Desativar `AUTH DEBUG` em produção.
10. Criar índice do Kanban e de atividades.

### Melhorias de curto prazo — até 7 dias

1. Paginação por cursor e coluna.
2. Infinite scroll por coluna.
3. Endpoint/RPC de contadores por etapa.
4. Virtualização dos cards.
5. Cache curto de autenticação/perfil/tenant.
6. Matching assíncrono.
7. Compressão gzip/Brotli.
8. Limites de CPU/RAM e rotação de logs no compose/Portainer.
9. Consolidar policies RLS em homologação, com testes multi-tenant.
10. Lazy-load dos imports públicos pesados em `App.tsx`.

### Melhorias estruturais — até 30 dias

1. Criar `kanban_card_view` ou RPC `get_kanban_page`.
2. Criar fila para matching, IA, e-mail e tarefas demoradas.
3. Adotar React Query/SWR para cache, deduplicação e cancelamento.
4. Normalizar matches em tabela própria se o JSON crescer.
5. Implantar métricas e tracing distribuído.
6. Separar dependências/build da API e frontend.
7. Teste de carga com 1k, 5k e 20k leads por tenant.
8. Orçamento de performance no CI para bundles e endpoints.

## 6. Checklist Técnico

### Kanban/frontend

- [ ] Remover loop que baixa todas as páginas em `leadService.list()`.
- [ ] Carregar no máximo 30–50 cards por coluna.
- [ ] Implementar cursor por `created_at,id`.
- [ ] Criar estado de paginação independente por etapa.
- [ ] Pré-agrupar leads por status com `useMemo`.
- [ ] Normalizar termo de busca uma única vez.
- [ ] Extrair `LeadCard` e aplicar `React.memo`.
- [ ] Remover matching heurístico da renderização.
- [ ] Virtualizar colunas ou aplicar infinite scroll.
- [ ] Usar `DragOverlay` e atualizar apenas origem/destino.
- [ ] Carregar detalhes pesados ao abrir o modal.
- [ ] Medir commit/render com React Profiler.

### Backend/API

- [ ] Criar DTO específico de Kanban.
- [ ] Adicionar `status`, `limit` e cursor ao `GET /api/crm/leads`.
- [ ] Não executar `count: exact` em todas as páginas.
- [ ] Criar endpoint/RPC de contadores.
- [ ] Paginar atividades.
- [ ] Retirar logs de debug em produção.
- [ ] Cachear perfil/organização por curto período.
- [ ] Eliminar validação duplicada de tenant.
- [ ] Mover matching para fila.
- [ ] Habilitar compressão.
- [ ] Registrar duração e bytes por rota.

### Banco

- [ ] Criar índice `(organization_id,status,created_at DESC,id DESC)`.
- [ ] Criar índice `(organization_id,created_at DESC,id DESC)`.
- [ ] Criar índice de atividades.
- [ ] Criar índice `(organization_id,phone)`.
- [ ] Remover índices duplicados após validar uso.
- [ ] Consolidar RLS.
- [ ] Remover policy pública irrestrita de `lead_tags`.
- [ ] Executar `ANALYZE` após migrations.
- [ ] Monitorar `pg_stat_statements`.
- [ ] Definir retenção/arquivamento de atividades antigas.

### Docker/Portainer

- [ ] Registrar CPU por container em pico e repouso.
- [ ] Registrar RAM, swap e OOM kills.
- [ ] Registrar uso de disco e crescimento de logs.
- [ ] Configurar `cpus`/`mem_limit`.
- [ ] Configurar rotação `json-file`.
- [ ] Verificar latência entre API e Supabase.
- [ ] Separar buffering de WebSocket e JSON.
- [ ] Habilitar gzip/Brotli.
- [ ] Confirmar keep-alive e HTTP/2.
- [ ] Criar alertas de p95, CPU, RAM, disco e erro 5xx.

Comandos recomendados no host:

```bash
docker stats --no-stream
docker system df
docker inspect <container> --format '{{json .HostConfig.LogConfig}}'
docker inspect <container> --format 'Memory={{.HostConfig.Memory}} NanoCPUs={{.HostConfig.NanoCpus}}'
docker logs --since 30m <api-container> 2>&1 | wc -l
```

## 7. Sugestões de Código

### 7.1 Paginação por cursor e status

```js
// server/api/crm/index.js
router.get('/leads', verifyAuth, requireTenant, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 100);
  const status = String(req.query.status || '');
  const cursorCreatedAt = req.query.cursor_created_at;
  const cursorId = req.query.cursor_id;

  let query = supabase
    .from('leads')
    .select(`
      id, name, phone, source, status, classification, lead_score,
      ai_next_action, next_visit_at, created_at, chat_jid, campaign,
      property_id,
      properties(title, price),
      lead_tags(tag)
    `)
    .eq('organization_id', req.orgId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (cursorCreatedAt && cursorId) {
    query = query.or(
      `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const hasMore = data.length > limit;
  const leads = hasMore ? data.slice(0, limit) : data;
  const last = leads.at(-1);

  res.json({
    leads,
    nextCursor: hasMore
      ? { created_at: last.created_at, id: last.id }
      : null,
  });
});
```

### 7.2 Índices SQL

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_kanban_stage_cursor
ON public.leads (organization_id, status, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_created_cursor
ON public.leads (organization_id, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activities_org_lead_created
ON public.lead_activities (organization_id, lead_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_phone
ON public.leads (organization_id, phone);
```

Antes de tornar telefone único:

```sql
SELECT organization_id, phone, COUNT(*)
FROM public.leads
GROUP BY organization_id, phone
HAVING COUNT(*) > 1;
```

### 7.3 Remoção segura de índices duplicados

Executar após comparar `pg_stat_user_indexes` e confirmar em homologação:

```sql
DROP INDEX CONCURRENTLY IF EXISTS public.idx_leads_organization;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_props_org;
```

Manter apenas um índice equivalente em cada tabela.

### 7.4 Contadores do Kanban

```sql
CREATE OR REPLACE FUNCTION public.get_kanban_counts(p_org_id uuid)
RETURNS TABLE(status text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.status, COUNT(*)
  FROM public.leads l
  WHERE l.organization_id = p_org_id
  GROUP BY l.status;
$$;
```

A função deve validar internamente se `p_org_id` é o tenant autorizado antes de ser exposta ao cliente.

### 7.5 Agrupamento memoizado

```tsx
const normalizedSearch = useMemo(
  () => searchTerm.trim().toLocaleLowerCase('pt-BR'),
  [searchTerm]
);

const leadsByStage = useMemo(() => {
  const grouped = new Map<string, Lead[]>(
    PIPELINE_STAGES.map((stage) => [stage.id, []])
  );

  for (const lead of leads) {
    const matches =
      !normalizedSearch ||
      lead.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
      lead.property?.title?.toLocaleLowerCase('pt-BR').includes(normalizedSearch);

    if (matches) grouped.get(lead.status)?.push(lead);
  }

  return grouped;
}, [leads, normalizedSearch]);
```

### 7.6 Card memoizado

```tsx
const LeadCard = React.memo(function LeadCard({
  lead,
  selected,
  onOpen,
  onToggle,
}: LeadCardProps) {
  return (
    <article onClick={() => onOpen(lead.id)}>
      {/* conteúdo enxuto */}
    </article>
  );
}, (prev, next) =>
  prev.lead === next.lead &&
  prev.selected === next.selected
);
```

### 7.7 Virtualização

```tsx
const virtualizer = useVirtualizer({
  count: stageLeads.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 180,
  overscan: 5,
});

return (
  <div ref={scrollRef} className="overflow-y-auto">
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((row) => {
        const lead = stageLeads[row.index];
        return (
          <div
            key={lead.id}
            style={{
              position: 'absolute',
              transform: `translateY(${row.start}px)`,
              width: '100%',
            }}
          >
            <LeadCard lead={lead} />
          </div>
        );
      })}
    </div>
  </div>
);
```

Para DnD, usar overlay e manter o elemento virtualizado estável durante o arraste.

### 7.8 Compressão e proxy

```js
// server/index.js
import compression from 'compression';

app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));
```

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types application/json application/javascript text/css text/plain image/svg+xml;

location ^~ /api/ {
  proxy_buffering on;
  proxy_buffers 16 16k;
  proxy_busy_buffers_size 32k;
}

location ^~ /api/whatsapp/ws {
  proxy_buffering off;
  proxy_read_timeout 86400;
}
```

### 7.9 Limites e rotação de logs

```yaml
services:
  api:
    cpus: "1.0"
    mem_limit: 768m
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"

  whatsapp-service:
    cpus: "1.5"
    mem_limit: 1g
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
```

Os limites finais devem ser calibrados com métricas reais do Portainer, não copiados cegamente.

## 8. Conclusão

A prioridade absoluta é interromper o carregamento integral do Kanban. O sistema já possui paginação no backend, mas o frontend a desfaz. Em seguida, deve-se reduzir o DTO do card, remover o matching por lead da renderização e limitar a quantidade de `Draggable` montados.

O banco não apresenta, neste momento, volume que justifique a lentidão por capacidade. Ele executa a consulta dos primeiros 100 leads em poucos milissegundos. Os maiores ganhos virão da redução de trabalho:

1. menos registros carregados;
2. menos campos por registro;
3. menos requests sequenciais;
4. menos validações remotas repetidas;
5. menos componentes no DOM;
6. menos processamento por card.

Depois dessas correções, índices compostos, consolidação de RLS, compressão e limites dos containers darão estabilidade e margem de escala.

Com a fase imediata implementada, a expectativa técnica é que o Kanban deixe de crescer linearmente com toda a base e passe a ter tempo de abertura aproximadamente constante, limitado à primeira janela de cards de cada coluna.

## Apêndice — evidências verificadas

- Build de produção concluído com sucesso em 18/06/2026.
- 3.853 módulos transformados.
- Chunk principal: 837,86 KB / 220,62 KB gzip.
- Chunk Kanban: 234,05 KB / 53,02 KB gzip.
- PWA precache: 198 arquivos / 7,47 MB.
- Banco acessível e tabelas principais validadas.
- `pg_stat_statements` ativo.
- Docker local indisponível durante a auditoria; métricas de container pendentes no host de produção.

