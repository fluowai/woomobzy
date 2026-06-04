# Plano de refatoracao do pipeline de midia WhatsMeow - 2026-06-03

## Problemas encontrados

- Midias ainda estavam acopladas a `whatsapp_messages` via `media_url`, `media_filename` e `media_mimetype`.
- Audio importado pelo historico podia ficar sem `media_url`, impedindo reproducao e IA.
- Duplicatas eram ignoradas com `ON CONFLICT DO NOTHING`, entao uma mensagem salva sem midia nao era enriquecida depois.
- Frontend usava `<audio controls>`, sem UX de estado, retry, velocidade ou waveform.
- Storage dependia de URL publica direta como contrato, o que quebra com bucket privado, URL expirada ou `MINIO_PUBLIC_URL` incorreto.
- WhatsMeow trata poucos eventos: `Message`, `Connected`, `Disconnected`, `LoggedOut`, `HistorySync`.
- Ainda faltam eventos de recibo, presenca, retry de midia, edicao, apagamento, foto e perfil comercial.

## Codigo atual analisado

- `whatsapp-service/internal/whatsapp/client.go`
- `whatsapp-service/internal/whatsapp/history_import.go`
- `whatsapp-service/internal/whatsapp/media.go`
- `whatsapp-service/internal/repository/message_repo.go`
- `whatsapp-service/internal/handlers/messages.go`
- `server/api/whatsapp/index.js`
- `server/api/storage/index.js`
- `server/lib/minio-storage.js`
- `server/lib/AIAutomation.js`
- `views/WhatsApp/MessageBubble.tsx`
- `views/WhatsApp/ChatWindow.tsx`
- `views/WhatsApp/hooks/api.ts`
- `views/WhatsApp/whatsapp.css`

## Implementado nesta fase

### Banco

Criada a migracao:

- `migrations/20260603_whatsapp_media_pipeline.sql`

Ela adiciona:

- `whatsapp_media`
- `media_status`
- `media_error`
- `media_retry_count`
- indices por mensagem, instancia/status, tenant/tipo/data e retry
- backfill inicial de registros de midia a partir de `whatsapp_messages.media_url`
- RLS por tenant e service role

### Backend WhatsMeow

Arquivos ja ajustados na rodada anterior:

- `history_import.go`: baixa e salva midias durante importacao de historico.
- `message_repo.go`: atualiza campos vazios em conflito, permitindo enriquecer mensagens ja existentes.
- `client.go`: centraliza `isMediaMessageType` e melhora preview de midia.

### Frontend

Criado:

- `views/WhatsApp/AudioMessagePlayer.tsx`

Alterados:

- `views/WhatsApp/MessageBubble.tsx`
- `views/WhatsApp/whatsapp.css`
- `views/WhatsApp/hooks/api.ts`

Recursos do novo player:

- Play e pause com controle proprio.
- Velocidade 1x, 1.5x e 2x.
- Waveform deterministico enquanto o backend ainda nao retorna waveform real.
- Progresso clicavel.
- Duracao e tempo atual.
- Retry em falha/expiracao.
- Estados: `pending`, `downloading`, `processing`, `ready`, `failed`, `expired`.

## Refatoracoes necessarias

### Go

- Criar `MediaRepo`.
- Persistir `whatsapp_media` no momento do recebimento da mensagem.
- Atualizar `whatsapp_messages.media_status` durante o pipeline.
- Implementar job publisher para `media.download`, `media.thumbnail`, `media.waveform`, `media.transcribe`, `media.ocr`, `media.retry`.
- Implementar handlers de eventos WhatsMeow adicionais.

### Node/API

- Criar endpoint autenticado `/api/whatsapp/media/:id/url`.
- Criar endpoint `/api/whatsapp/media/:id/retry`.
- Criar endpoint `/api/whatsapp/chats/:id/media`.
- Trocar download da IA para resolver midia por `object_key` ou signed URL, nao `public_url`.

### Frontend

- Consumir `whatsapp_media` quando a API retornar.
- Exibir central de midias por conversa.
- Exibir transcricao/resumo/tarefas em mensagens de audio.
- Exibir thumbnails reais de imagem/video/documento.

## Migracoes SQL

Base criada nesta fase:

- `20260603_whatsapp_media_pipeline.sql`

Proximas migracoes recomendadas:

```sql
CREATE TABLE whatsapp_media_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES whatsapp_media(id) ON DELETE CASCADE,
  queue TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```sql
CREATE TABLE whatsapp_message_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES whatsapp_messages(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  participant_jid TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Novas tabelas

- `whatsapp_media`: implementada.
- `whatsapp_media_jobs`: proxima fase.
- `whatsapp_message_status`: proxima fase.
- `whatsapp_presence`: proxima fase.
- `whatsapp_group_participants`: proxima fase.
- `whatsapp_event_audit`: proxima fase.

## Novos endpoints

Prioridade P0/P1:

- `GET /api/whatsapp/media/:id/url`
- `GET /api/whatsapp/media/:id/stream`
- `POST /api/whatsapp/media/:id/retry`
- `GET /api/whatsapp/chats/:chatId/media?type=audio|image|video|document`
- `GET /api/whatsapp/instances/:id/health`

Prioridade P2:

- `GET /api/whatsapp/groups/:chatId/participants`
- `GET /api/whatsapp/messages/:id/status`
- `GET /api/whatsapp/media/dashboard`

## Novos workers

Fila minima:

- `media.download`
- `media.thumbnail`
- `media.waveform`
- `media.transcribe`
- `media.ocr`
- `media.retry`

Ordem recomendada:

1. `media.download`
2. `media.retry`
3. `media.transcribe`
4. `media.thumbnail`
5. `media.waveform`
6. `media.ocr`

## Novos eventos WhatsMeow

Implementar no `eventHandler`:

- `events.Receipt`
- `events.ChatPresence`
- `events.Presence`
- `events.MediaRetry`
- `events.UndecryptableMessage`
- `events.Picture`
- `events.PushName`
- `events.BusinessName`
- `events.DeleteForMe`
- `events.ClearChat`
- `events.DeleteChat`
- `events.GroupInfo`
- `events.CallOffer`
- `events.CallTerminate`
- `events.TemporaryBan`
- `events.ConnectFailure`
- `events.ClientOutdated`

## Melhorias de UX

- Placeholder com estado real de midia.
- Player de audio customizado ja iniciado nesta fase.
- Waveform real quando `whatsapp_media.waveform` existir.
- Transcricao recolhivel.
- Central de midia por conversa.
- Visualizador de imagem com zoom e navegacao.
- Preview de PDF inline.
- Estado de recuperacao automatica para midia expirada.

## Melhorias de IA

- Transcricao persistida em `whatsapp_media.transcription`.
- Resumo persistido em `whatsapp_media.summary`.
- Sentimento em `whatsapp_media.sentiment`.
- Tarefas em `whatsapp_media.extracted_tasks`.
- OCR em `whatsapp_media.ocr_text`.
- Atualizacao automatica de lead/oportunidade/funil/score a partir dos resultados.

## Plano de implementacao

### Fase 1 - Correcoes criticas - 7 dias

- Deploy da migracao `whatsapp_media`.
- Deploy do player de audio.
- Validar `MINIO_PUBLIC_URL`.
- Corrigir importacao de historico com midia.
- Criar endpoint de retry manual.
- Adicionar query operacional de midias sem URL.

### Fase 2 - Pipeline de midia - 15 dias

- Criar `MediaRepo`.
- Criar filas e workers.
- Persistir `bucket/object_key`.
- Servir midia por signed URL.
- Gerar thumbnails e waveform.
- Implementar `media.retry`.

### Fase 3 - IA e CRM - 30 dias

- Transcricao automatica.
- OCR de documentos.
- Resumo e sentimento.
- Extracao de tarefas.
- Atualizacao automatica de lead, oportunidade, funil e score.

### Fase 4 - Escalabilidade - 90 dias

- Separar WhatsMeow Gateway, API, workers e WebSocket Gateway.
- Redis para presenca, cache e rate limit.
- RabbitMQ inicialmente; Kafka se houver necessidade de replay massivo.
- Observabilidade por instancia, fila, midia e IA.
- Central de midia e dashboard de saude completos.

## Arquivos impactados nesta entrega

- `migrations/20260603_whatsapp_media_pipeline.sql`
- `views/WhatsApp/AudioMessagePlayer.tsx`
- `views/WhatsApp/MessageBubble.tsx`
- `views/WhatsApp/whatsapp.css`
- `views/WhatsApp/hooks/api.ts`
- `documentation/PLANO_REFATORACAO_PIPELINE_MIDIA_WHATSMEOW_2026-06-03.md`

Tambem permanecem impactados pelos ajustes anteriores:

- `whatsapp-service/internal/repository/message_repo.go`
- `whatsapp-service/internal/whatsapp/client.go`
- `whatsapp-service/internal/whatsapp/history_import.go`
