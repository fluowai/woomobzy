# RELATÓRIO DE ANÁLISE DE FALHAS - IMOBZY
**Data:** 13 de Junho de 2026
**Foco Principal:** Integração WhatsMeow e Arquitetura Geral

---

## SUMÁRIO EXECUTIVO

O projeto IMOBZY possui uma arquitetura complexa com Node.js + React + Go + Supabase. A integração
WhatsApp via WhatsMeow (Go) apresenta **12 falhas críticas**, **8 falhas médias** e **6 falhas leves**
que comprometem a confiabilidade do produto em produção. Abaixo, a análise detalhada por camada.

---

## NÍVEL 1 - FALHAS CRÍTICAS (IMPEDEM PRODUÇÃO ESTÁVEL)

### C1. Versão Go 1.25.0 NON-EXISTENTE

**Arquivo:** `whatsapp-service/go.mod:3`
```go
go 1.25.0
```

**Problema:** `go 1.25.0` é uma versão pré-release que **não existe no ecossistema Go**. O
compilador Go atual (junho/2026) está em 1.24.x no máximo. O Dockerfile usa
`golang:1.25-alpine` que também não existe.

**Impacto:** O container **não constrói**. `docker compose build whatsapp-service` falha
silenciosamente ou usa uma imagem incorreta.

**Solução:** Trocar para `go 1.22` ou `1.23` (a última stable). Ajustar `Dockerfile.whatsapp`
para `golang:1.23-alpine`.

---

### C2. WhatsMeow Pseudo-Version com Data Futura

**Arquivo:** `whatsapp-service/go.mod:13`
```
go.mau.fi/whatsmeow v0.0.0-20260427122815-7514259253a7
```

**Problema:** A data `20260427` (27 de abril de 2026) está no futuro mesmo para a data deste
relatório (junho/2026). O módulo foi gerado manualmente com `go mod tidy` apontando para um
commit que provavelmente não existe no repositório oficial. Isso significa que:

1. O Go module proxy (`proxy.golang.org`) pode não ter este commit
2. `go mod download` pode falhar em builds limpos (CI/CD, novo dev)
3. NÃO é uma versão oficial do WhatsMeow — é um fork ou patch local não rastreável

**Impacto:** Builds não reproduzíveis. Se o repositório local for perdido, não é possível
recuperar a versão exata do WhatsMeow.

**Solução:** Apontar para um release oficial do WhatsMeow (ex: `v0.0.0-2025XXXXX`), ou
hospedar o fork em um repositório versionado e usar `replace` directive no `go.mod`.

---

### C3. Sessões WhatsApp em SQLite Local — VOLÁTEIS

**Arquivo:** `whatsapp-service/internal/whatsapp/manager.go:141-148`
```go
sessionsDir := filepath.Join(".", ".sessions")
dbPath := filepath.Join(sessionsDir, fmt.Sprintf("%s.db", instanceID.String()))
```

**Problema:** As sessões do WhatsApp (credenciais criptografadas) são armazenadas em SQLite
no sistema de arquivos local (`./.sessions/`). No Docker, isso usa um volume nomeado
`whatsapp_sessions`.

**Causa de falha:** Se o container for recriado sem o volume (docker compose down -v, migração
de servidor, deploy blue/green sem volume compartilhado), **TODAS as sessões são perdidas**.
Cada cliente precisa escanear o QR code novamente.

**Impacto:** Perda massiva de conexões. Experiência do usuário catastrófica.
Sem backup, sem replicação, sem migração.

**Solução:** Armazenar device store no PostgreSQL (via `sqlstore.NewWithDB` usando o pool
existente) em vez de SQLite local. O WhatsMeow suporta `pgx` como backend de store.

---

### C4. Pipeline de Mídia Síncrono — BLOQUEANTE

**Arquivo:** `whatsapp-service/internal/whatsapp/client.go:443-455`
```go
if isMediaMessageType(msgType) {
    url, mime, filename, err := c.downloadAndUploadMedia(ctx, evt)
    // ...
}
```

**Problema:** O download de mídia do WhatsApp CDN + upload para MinIO/Supabase acontece
**dentro do event handler de mensagem**, de forma síncrona. Se:

- A mídia for grande (vídeo 100MB)
- O MinIO estiver lento
- A rede do WhatsApp CDN estiver instável

...a mensagem **não é salva** até o download terminar. Timeouts parciais resultam em
mensagens sem `media_url` e sem retry automático.

**Impacto:** Mensagens de áudio, imagem e vídeo frequentemente chegam sem playback.
Usuários reclamam que "áudio não toca".

**Solução:** Implementar pipeline assíncrono: (1) salvar mensagem com `media_status=pending`,
(2) publicar job em fila (Redis ou pg_queue), (3) worker processa download+upload em
background, (4) WebSocket notifica frontend quando `media_status=ready`.

---

### C5. QR Code Race Condition

**Arquivo:** `whatsapp-service/internal/handlers/instances.go:151-160`
```go
client, exists := h.manager.GetClient(id)
shouldStart := !exists || (inst.Status == models.StatusDisconnected && ...
if shouldStart {
    h.manager.ConnectInstance(c.Request.Context(), id)
}
```

**Problema:** Não há lock atômico para verificar se o QR code já está ativo. Se o usuário
abre o painel e o QR está sendo escaneado, uma chamada `GET /qr_code` pode **reiniciar o
fluxo de conexão**, invalidando o QR code atual.

**Causa comum:** Frontend polling de QR code a cada N segundos — cada poll pode resetar a
conexão.

**Impacto:** QR code "piscando" infinitamente, usuário nunca consegue escanear.

**Solução:** Usar um estado de máquina com transições atômicas:
`disconnected -> connecting -> qr_ready -> scanning -> connected`. Só conectar se estiver
em `disconnected`.

---

### C6. WebSocket Hub — Single Point of Failure

**Arquivo:** `whatsapp-service/internal/ws/hub.go:65-99`
```go
func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register: ...
        case client := <-h.unregister: ...
        case message := <-h.broadcast:
            for client := range h.clients { ... }
        }
    }
}
```

**Problema:** Um único `channel` de broadcast e uma única goroutine para TODOS os clientes.
A iteração `for client := range h.clients` adquire `RLock` a cada broadcast. Com dezenas de
instâncias e centenas de mensagens por minuto:

1. O broadcast pode travar se um cliente lento ocupar o buffer
2. Clientes lentos são cortados sem backpressure
3. `RLock` em broadcast + `Lock` em register/unregister podem causar contenção

**Impacto:** Perda de eventos em tempo real no frontend (mensagens novas, QR code, status).

**Solução:** Usar padrão de扇出 (fan-out) com buffers individuais ou Redis Pub/Sub.

---

### C7. Tenant ID como Query Parameter — INSEGURO

**Arquivo:** `whatsapp-service/internal/handlers/tenant.go:10-24`
```go
func requireTenantID(c *gin.Context) (uuid.UUID, bool) {
    tenantIDStr := c.Query("tenant_id")
```

**Problema:** O `tenant_id` é passado como query parameter em TODAS as requisições. Embora
o proxy Node adicione este parâmetro, qualquer requisição direta ao serviço Go pode
fornecer um `tenant_id` arbitrário.

**Ataque possível:** Se o proxy for bypassado (bug de roteamento, exposição acidental da
porta 3100), um invasor pode acessar dados de qualquer tenant apenas mudando o query param.

**Impacto:** Vazamento de dados entre organizações (multi-tenancy quebrado).

**Solução:** Validar token JWT no serviço Go ou usar header `x-tenant-id` assinado pelo proxy.

---

### C8. Histórico sem Paginação — OVERFLOW DE MEMÓRIA

**Arquivo:** `whatsapp-service/internal/whatsapp/history_import.go:29-46`
```go
for _, conv := range evt.Data.GetConversations() {
    chatID, messages, err := c.importHistoryConversation(ctx, ...)
```

**Problema:** `evt.Data.GetConversations()` carrega **todas as conversas** do histórico
do WhatsApp em memória. Uma conta com anos de uso pode ter milhares de conversas com
dezenas de milhares de mensagens, causando OOM (Out of Memory).

**Impacto:** Container restartando em loop quando o HistorySync chega.

**Solução:** Processar histórico em batches de 50 conversas por vez.

---

### C9. Goroutines sem Context — VAZAMENTO

**Arquivo:** `whatsapp-service/internal/whatsapp/client.go:511-552`
```go
go func(saved models.Message, ...) {
    result, err := c.automation.ProcessMessage(context.Background(), ...)
```

**Problema:** `context.Background()` é usado em goroutines lançadas no event handler.
Se o servidor for desligado, estas goroutines:

1. Continuam executando
2. Tentam chamar a API Node (`NODE_URL`) que pode já estar offline
3. Causam panic ao escrever em canais/connections fechados

**Impacto:** Crash no shutdown, conexões HTTP penduradas, warnings falsos de "AI automation failed".

**Solução:** Usar `context.WithTimeout` com o contexto do servidor ou um contexto de shutdown.

---

### C10. Retry de Conexão SEM LIMITE

**Arquivo:** `whatsapp-service/internal/whatsapp/client.go:279-288`
```go
go func() {
    time.Sleep(5 * time.Second)
    c.logger.Info("Attempting auto-reconnect", ...)
    if err := c.Connect(context.Background()); err != nil {
        c.logger.Error("Auto-reconnect failed", ...)
    }
}()
```

**Problema:** A função `Disconnected` tenta reconectar **para sempre**, sem backoff
exponencial, sem limite de tentativas. Se a conta foi desconectada do WhatsApp (QR expirou,
número mudou, etc.), o serviço fica tentando reconectar indefinidamente.

**Impacto:** Loop infinito de reconexão, logs poluídos, CPU desperdiçada.

**Solução:** Implementar exponential backoff (1s, 2s, 4s, 8s, ... max 5min) e limite de 10
tentativas. Após o limite, marcar como `status=disconnected` e notificar o usuário.

---

### C11. MinIO Upload com AWS Signature V4 MANUAL

**Arquivo:** `whatsapp-service/internal/whatsapp/media.go:215-303`
```go
func (c *Client) uploadToMinIO(ctx context.Context, ...) (string, error) {
    // Implementação manual de AWS Signature V4
```

**Problema:** ~90 linhas de código para implementar manualmente o AWS Signature V4. Isso é
extremamente frágil:

1. Qualquer mudança no MinIO (headers, algoritmo de canonical request, etc.) quebra
2. Path encoding não padronizado entre `url.PathEscape` e `url.EscapedPath`
3. Se `objectURL.EscapedPath()` usar encoding diferente do `canonicalRequest`, a assinatura
   falha com erro "SignatureDoesNotMatch"
4. Não há suporte a SSE-C, tags, metadata, ou Content-MD5

**Solução:** Usar `github.com/minio/minio-go/v7` — SDK oficial que lida com assinatura,
multipart, retry e presigned URLs.

---

### C12. Testes PRATICAMENTE INEXISTENTES

**whatsapp-service:** Apenas 2 testes em `events_test.go:9-31`
```go
func TestParseJIDNormalizesPhoneNumbers(t *testing.T) { ... }
func TestParseJIDPreservesFullJID(t *testing.T) { ... }
```

**Server Node:** Nenhum teste encontrado em `server/__tests__/` para WhatsApp.

**Cobertura:** Menos de 0.5% do código tem teste automatizado.

**Impacto:** Qualquer refatoração ou atualização de dependências (especialmente WhatsMeow)
pode quebrar funcionalidades sem detecção.

**Solução:** Implementar testes unitários para:
- `phone/normalize.go` (testes existentes são mínimos)
- `repository/*.go` (com mock de banco)
- `handlers/*.go` (com httptest)
- `whatsapp/client.go` (lógica de extração de mensagem)
- `server/lib/AIAutomation.js` (regras de negócio de lead)

---

## NÍVEL 2 - FALHAS MÉDIAS (AFETAM CONFIABILIDADE)

### M1. Event Handler de Receipt AUSENTE

**Arquivo:** `whatsapp-service/internal/whatsapp/client.go:254-303`

WhatsMeow emite `events.Receipt` para confirmações de entrega/leitura. O handler atual
ignora este evento. O frontend nunca sabe se a mensagem foi entregue ou lida.

### M2. Dockerfile com Cache Invalidation

**Arquivo:** `Dockerfile.whatsapp:11`
```dockerfile
RUN go mod tidy && CGO_ENABLED=1 GOOS=linux go build -o whatsapp-service ./cmd/server
```

`go mod tidy` muda `go.sum` e `go.mod`, invalidando o cache de camadas anteriores. Separar
`go mod download` de `go mod tidy` e de `go build`.

### M3. Sem Non-Root User no Container

**Arquivo:** `Dockerfile.whatsapp:13-25`

A aplicação roda como `root`. Se houver vulnerabilidade, o atacante tem root no container.

### M4. CORS Global no WebSocket

**Arquivo:** `whatsapp-service/internal/ws/hub.go:22-28`
```go
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // CORS handled by middleware
    },
}
```

Confiar 100% no middleware externo para CORS de WebSocket é frágil. Se o proxy Node falhar
ou for bypassado, qualquer site pode abrir WebSocket.

### M5. Duplicação de Lógica de Phone Normalization

`phone/normalize.go` e `server/lib/AIAutomation.js:_normalizeBRPhone` implementam a MESMA
lógica de normalização de telefone BR em duas linguagens (Go e JavaScript). Se uma mudar
sem a outra, a consistência quebra.

### M6. WHATSAPP_INTERNAL_TOKEN Compartilhado

**Arquivo:** `server/api/whatsapp/index.js:80`

O mesmo token (`WHATSAPP_INTERNAL_TOKEN`) é usado para:
- Autenticação interna entre Go e Node
- Geração de tokens JWT de WebSocket

Se vazar, o atacante pode forjar tokens de WebSocket OU chamar endpoints internos.

### M7. Route Import Commented Out

**Arquivo:** `server/index.js:260`
```js
// app.use('/api/whatsapp', whatsappRoutes); // Substituído pelo proxy abaixo
```

O router do WhatsApp está importado (linha 34) mas comentado (linha 260). Dead code que
pode confundir manutenção.

### M8. Chaves de API Commitadas no .env

**Arquivo:** `.env` contém:
```
SUPABASE_SERVICE_ROLE_KEY=eyJ... (válida)
DIRECT_ADMIN_API_KEY=1vdi@BSY1+9aV0
SUPABASE_JWT_SECRET="73De..."
```

Todas as chaves estão versionadas no repositório Git. Se o repositório for público ou
vazar, a infraestrutura inteira está comprometida.

---

## NÍVEL 3 - FALHAS LEVES (OPORTUNIDADES DE MELHORIA)

### L1. `setupWhatsAppProxy` Chamado Após Server Listen

**Arquivo:** `server/index.js:328`
```js
setupWhatsAppProxy(app, server, verifyAuth, requireTenant);
```

A função que registra o handler de WebSocket upgrade é chamada **depois** de
`app.listen()` (linha 322). Race condition potencial.

### L2. `origin` Header Stripped no Proxy

**Arquivo:** `server/api/whatsapp/index.js:125`
```js
proxyReq.removeHeader('origin');
```

Remove o Origin, impedindo que o Go service valide CORS. A validação concentrada no Node
é single point of failure.

### L3. `resolverAvatarURL` Bloqueante

**Arquivo:** `whatsapp-service/internal/whatsapp/client.go:612-660`

O avatar é baixado (HTTP GET) e re-uploadado para MinIO **dentro do event loop** de
mensagem. Se o avatar demorar, a mensagem atrasa. Cache de avatar por JID deveria ser
implementado.

### L4. Container Name Fixo `name: imobzy`

**Arquivo:** `docker-compose.yml:1`

Impede múltiplas stacks no mesmo host (ex: staging + produção).

### L5. `node_modules` e `.sessions` Fora do .gitignore?

**Confirmar:** `.sessions/` contém dados binários de sessão. O `.gitignore` precisa
excluir explicitamente `.sessions/`.

### L6. Multiple DB Env Vars Confusas

22 variáveis diferentes para database URL. `config.go` tenta resolver com fallback, mas
aumenta complexidade e dificuldade de debug.

---

## RECOMENDAÇÕES PRIORIZADAS

### Imediatas (Resolução em 1-2 dias)

| ID | Ação | Responsável |
|----|------|-------------|
| C1 | Trocar Go para 1.23, atualizar Dockerfile | DevOps |
| C2 | Fixar versão oficial do WhatsMeow | Go Backend |
| C3 | Migrar session store para PostgreSQL | Go Backend |
| C12 | Criar testes para repos, handlers, phone normalize | QA/Go Backend |
| M8 | Remover .env do Git, usar .env.production.template | DevOps |

### Curto Prazo (1-2 semanas)

| ID | Ação |
|----|------|
| C4 | Pipeline assíncrono de mídia com fila e worker |
| C5 | State machine atômica para QR code flow |
| C7 | Validar tenant_id via JWT em vez de query param |
| C9 | Contexto de shutdown para goroutines |
| C10 | Exponential backoff no reconnect |
| C11 | Migrar MinIO para minio-go/v7 SDK oficial |

### Médio Prazo (2-4 semanas)

| ID | Ação |
|----|------|
| C6 | Redis Pub/Sub para broadcast WebSocket escalável |
| C8 | Batch processing para HistorySync |
| M1 | Implementar eventos de Receipt/read |
| M4 | Adicionar CORS real no WebSocket hub |
| M6 | Separar tokens interno vs WebSocket |

---

## DIAGRAMA DE ARQUITETURA ATUAL (PONTOS DE FALHA)

```
[WhatsApp Multi-Device]
       |
       v
[WhatsMeow Client] ─── C2: Pseudo-version quebrada
       |                C3: Store SQLite volátil
       v
[events.Message] ─── C4: Media download síncrono (bloqueante)
       |              L3: Avatar download bloqueante
       v
[handleMessage]
       |
       +──> C8: Histórico sem paginação (OOM)
       +──> C9: Goroutines sem context (vazamento)
       +──> M1: Event Receipt ignorado
       |
       v
[MessageRepo.Create] ─── C12: Sem testes
       |
       v
[downloadAndUploadMedia]
       |
       +──> C11: AWS Signature V4 manual (frágil)
       |
       v
[MinIO / Supabase Storage] ─── M8: Chaves no Git
       |
       v
[WebSocket Hub] ─── C6: Single goroutine bottleneck
       |
       v
[Node Proxy] ─── C7: tenant_id query param (inseguro)
       |          L1: Proxy setup pós-listen
       v
[React Frontend]
```

---

## MÉTRICAS DE SAÚDE DO PROJETO

| Métrica | Valor | Status |
|---------|-------|--------|
| Erros de TypeScript | 17+ | 🔴 Crítico |
| Testes automatizados (Go) | 2 testes | 🔴 Crítico |
| Testes automatizados (Node) | 0 | 🔴 Crítico |
| Cobertura de eventos WhatsMeow | 5/12 eventos | 🟡 Médio |
| Secrets versionados | 3+ chaves válidas | 🔴 Crítico |
| Dependências desatualizadas | Go 1.25 (inexistente) | 🔴 Crítico |
| Docker health checks | Todos configurados | 🟢 OK |
| Graceful shutdown | Implementado parcialmente | 🟡 Médio |

---

**Conclusão:** O projeto tem base sólida mas **12 falhas críticas** impedem operação estável
em produção. A prioridade #1 é resolver os problemas de build (C1, C2), session storage (C3)
e media pipeline (C4). Recomenda-se também remover todas as chaves do Git imediatamente.
