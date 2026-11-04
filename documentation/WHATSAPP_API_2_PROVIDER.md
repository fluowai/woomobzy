# WhatsApp API 2.0 Provider

## Objetivo

A WhatsApp API 2.0 mantém o contrato público atual do IMOBZY em `/api/whatsapp` e permite trocar o motor interno sem expor fornecedor ao frontend ou ao cliente final.

O provider padrão continua sendo o serviço Go/WhatsMeow atual. O provider Arrapha/WAHA é ativado por variável de ambiente.

## Providers

```env
WHATSAPP_PROVIDER=whatsmeow
```

```env
WHATSAPP_PROVIDER=arrapha
ARRAPHA_API_URL=http://arrapha:3000
ARRAPHA_API_KEY=troque-por-um-token
```

Alias aceitos para Arrapha:

- `arrapha`
- `waha`
- `waha-plus`
- `api2`
- `api-2`
- `v2`

## Contrato preservado

O frontend continua chamando:

- `GET /api/whatsapp/health`
- `GET /api/whatsapp/status`
- `POST /api/whatsapp/socket-token`
- `GET /api/whatsapp/instances`
- `POST /api/whatsapp/instances`
- `GET /api/whatsapp/instances/:id/qrcode`
- `POST /api/whatsapp/instances/:id/connect`
- `POST /api/whatsapp/instances/:id/logout`
- `GET /api/whatsapp/chats`
- `POST /api/whatsapp/chats/ensure`
- `GET /api/whatsapp/messages/:chatId`
- `POST /api/whatsapp/messages/:chatId/send`
- `POST /api/whatsapp/messages/:chatId/send-media`

## Webhooks

O provider Arrapha registra webhooks para:

```text
/api/whatsapp/internal/arrapha/webhook
```

Esse endpoint valida token por `ARRAPHA_API_KEY`, `WAHA_API_KEY` ou `WHATSAPP_INTERNAL_TOKEN` e converte eventos recebidos para as tabelas atuais:

- `whatsapp_instances`
- `whatsapp_chats`
- `whatsapp_messages`

## Execucao local

Para subir o WAHA/Arrapha junto da stack local:

```powershell
docker compose -f docker-compose.local.yml --profile arrapha up -d arrapha
```

O container local expõe o motor em:

```text
http://127.0.0.1:3007
```

Depois ative:

```env
WHATSAPP_PROVIDER=arrapha
ARRAPHA_API_URL=http://127.0.0.1:3007
```

## Observacoes

- A marca Arrapha/WAHA não aparece no frontend.
- O nome público retornado pela API é `IMOBZY WhatsApp API 2.0`.
- O provider WhatsMeow segue como fallback seguro para produção.
