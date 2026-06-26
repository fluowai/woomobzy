# IMOBZY AI Core auto-hospedado

Este guia implanta o MVP de IA local da IMOBZY usando Docker/Portainer, Supabase e modelos via Ollama.

## Objetivo

Centralizar as chamadas de IA da IMOBZY em uma camada propria:

```text
IMOBZY / WhatsApp / CRM / Agentes
  -> /api/ai-core
  -> Ollama ou LiteLLM
  -> Modelos locais
```

Gemini, Groq e OpenAI ficam apenas como fallback legado enquanto os modelos locais sao instalados.

## O que foi adicionado na stack

Servicos novos no `docker-compose.yml`:

- `ollama`: runtime local de LLMs.
- `qdrant`: banco vetorial para RAG.
- `redis`: fila/cache para proximas etapas.
- `litellm`: gateway OpenAI-compatible para evoluir roteamento.

Volumes novos:

- `ollama_models`
- `qdrant_data`
- `redis_data`

## Variaveis de ambiente

Adicione no stack/env do Portainer:

```env
AI_CORE_DISABLED=false
AI_CORE_OLLAMA_URL=http://ollama:11434
AI_CORE_LITELLM_URL=http://litellm:4000
AI_CORE_QDRANT_URL=http://qdrant:6333
AI_CORE_REDIS_URL=redis://redis:6379
AI_CORE_DEFAULT_CHAT_MODEL=qwen2.5:7b
AI_CORE_DEFAULT_EMBEDDING_MODEL=nomic-embed-text
AI_CORE_TIMEOUT_MS=120000
AI_CORE_ENFORCE_CREDITS=false
OLLAMA_PORT=11434
OLLAMA_CPUS=2.00
OLLAMA_MEM_LIMIT=6g
QDRANT_PORT=6333
LITELLM_PORT=4000
LITELLM_MASTER_KEY=troque-por-uma-chave-litellm-longa
```

Use `AI_CORE_ENFORCE_CREDITS=false` no inicio. Ative `true` apenas depois de carregar saldo dos clientes.

## Supabase

Execute a migration:

```text
migrations/20260626_ai_core_self_hosted.sql
```

Ela cria:

- `ai_models`
- `ai_model_routes`
- `ai_client_balances`
- `ai_credit_transactions`
- `ai_usage_logs`
- `ai_knowledge_bases`
- `ai_documents`
- `ai_document_chunks`
- `ai_audit_logs`

Tambem cadastra modelos iniciais:

- `qwen2.5:7b`
- `llama3.1:8b`
- `mistral:7b`
- `gemma2:9b`
- `phi3:mini`
- `nomic-embed-text`

## Portainer

1. Abra a stack atual da IMOBZY.
2. Atualize o compose com os novos servicos.
3. Adicione as variaveis de ambiente do AI Core.
4. Clique em `Update the stack`.
5. Aguarde `ollama`, `qdrant`, `redis`, `litellm` e `api` subirem.

## Baixar modelos no Ollama

No Portainer, abra o console do container `ollama` e rode:

```bash
ollama pull qwen2.5:7b
ollama pull llama3.1:8b
ollama pull mistral:7b
ollama pull gemma2:9b
ollama pull phi3:mini
ollama pull nomic-embed-text
```

Verifique:

```bash
ollama list
```

Teste manual:

```bash
ollama run qwen2.5:7b
```

## Endpoints criados

Health publico do AI Core:

```http
GET /api/ai-core/health
```

Chat autenticado:

```http
POST /api/ai-core/chat
```

Payload:

```json
{
  "message": "Tenho interesse em uma casa em Palmas",
  "channel": "whatsapp",
  "model": "qwen2.5:7b",
  "systemInstruction": "Voce e um corretor imobiliario consultivo."
}
```

Listar modelos:

```http
GET /api/ai-core/models
```

Testar modelo:

```http
POST /api/ai-core/models/:id/test
```

Uso:

```http
GET /api/ai-core/usage
```

Creditos:

```http
GET /api/ai-core/credits
POST /api/ai-core/credits/add
```

## Integracoes ja direcionadas ao AI Core

Estas partes tentam usar IA local primeiro:

- `/api/ai/chat`
- `/api/ai/agents/:id/chat`
- `AgentOrchestrator`
- `AIAutomationEngine` para mensagens de texto do WhatsApp

Se `ollama` estiver offline ou o modelo nao estiver baixado, o sistema ainda tenta o fluxo legado Gemini/Groq, desde que as chaves existam.

## Ordem recomendada de producao

1. Aplicar a migration no Supabase.
2. Atualizar variaveis de ambiente no Portainer.
3. Atualizar a stack.
4. Baixar `qwen2.5:7b` e `nomic-embed-text` primeiro.
5. Testar `GET /api/ai-core/health`.
6. Testar `POST /api/ai-core/chat`.
7. Validar registros em `ai_usage_logs`.
8. Dar creditos iniciais com `POST /api/ai-core/credits/add`.
9. So depois ativar `AI_CORE_ENFORCE_CREDITS=true`.

## Proxima etapa

Depois do chat local estar estavel, implementar:

- ingestao de documentos para `ai_documents`;
- chunking e embeddings;
- indexacao no Qdrant;
- tela SuperAdmin para modelos, creditos e logs;
- vLLM com GPU para modelos maiores.

