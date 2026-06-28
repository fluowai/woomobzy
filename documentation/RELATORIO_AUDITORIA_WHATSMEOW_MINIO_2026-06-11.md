# Relatorio de Auditoria WhatsMeow, Midias e MinIO

Data da auditoria: 2026-06-11  
Periodo analisado: desde 2026-06-01 00:00 America/Sao_Paulo

## Resumo executivo

A falha nao esta restrita a audio. Desde 01/06, todos os tipos de midia do WhatsApp estao sendo gravados no banco como `pending` e sem URL de arquivo: audios, imagens, videos, documentos/PDFs e stickers.

O principal problema encontrado foi operacional e de observabilidade: o ambiente local/produtivo auditado nao possui variaveis `MINIO_*`/`S3_*` configuradas nos arquivos `.env` e `.env.production`, enquanto o contrato do sistema exige MinIO para midias. Quando o download/upload falhava, o codigo registrava a mensagem sem `media_url`, mas nao gravava `media_status='failed'` nem `media_error`, deixando o banco sem diagnostico.

Tambem havia classificacao incorreta de chats `@lid` como grupos. Foram corrigidos 80 chats e 358 mensagens historicas no Supabase para `is_group=false`.

## Numeros do banco

Tabela `whatsapp_messages`, desde 01/06:

| Tipo | Total | Sem URL | Status |
| --- | ---: | ---: | --- |
| audio | 257 | 257 | pending |
| document | 51 | 51 | pending |
| image | 3537 | 3537 | pending |
| sticker | 84 | 84 | pending |
| video | 746 | 746 | pending |

Tabela `whatsapp_media`, desde 01/06:

| Tipo | Total | Sem URL | Sem object_key | Provider |
| --- | ---: | ---: | ---: | --- |
| audio | 1015 | 1015 | 1015 | minio |
| document | 208 | 208 | 208 | minio |
| image | 5054 | 5054 | 5054 | minio |
| sticker | 254 | 254 | 254 | minio |
| video | 1114 | 1114 | 1114 | minio |

Antes da correcao, a tabela `storage_objects` nao existia no banco. A migration `migrations/20260604_storage_intelligence.sql` foi aplicada com sucesso.

## MinIO

Contrato confirmado: imagens, audios, PDFs/docs, videos e stickers devem ser salvos no MinIO/S3, no bucket configurado por `MINIO_WHATSAPP_BUCKET` ou `S3_WHATSAPP_BUCKET` com fallback `imobzywhatsapp`.

Variaveis obrigatorias para o WhatsApp Service:

```env
MEDIA_STORAGE_PROVIDER=minio
MINIO_ENDPOINT=...
MINIO_PUBLIC_URL=...
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_REGION=us-east-1
MINIO_WHATSAPP_BUCKET=imobzywhatsapp
```

O fallback Supabase continua disponivel somente se explicitamente configurado por `MEDIA_STORAGE_PROVIDER=supabase` ou `ALLOW_SUPABASE_STORAGE_FALLBACK=true`, mas nao deve ser usado para este contrato.

## Correcoes aplicadas

- `whatsapp-service/internal/config/config.go`: adicionada validacao de startup para falhar claramente se MinIO/S3 nao estiver configurado e fallback Supabase nao estiver explicitamente habilitado.
- `whatsapp-service/internal/whatsapp/client.go`: falha de download/upload de midia agora grava `media_status='failed'` e `media_error`.
- `whatsapp-service/internal/whatsapp/media.go` e `whatsapp-service/internal/handlers/messages.go`: midia enviada pelo painel que chega ao WhatsApp mas falha no upload MinIO agora fica registrada como `failed`, com erro explicito, em vez de ficar silenciosamente `pending`.
- `views/WhatsApp/ChatWindow.tsx`, `views/WhatsApp/WhatsAppDashboard.tsx` e `views/WhatsApp/hooks/api.ts`: envio de midia pelo painel recebeu estado de envio, preview do arquivo, limite de 25 MB e feedback de sucesso/erro.
- `server/api/crm/index.js` e `migrations/20260611_whatsapp_attendance_assignment.sql`: transferencia de atendimento agora grava `leads.assigned_to`, muda status para `Em Atendimento` e registra atividade no CRM. Tags agora sao adicionadas por campo controlado no painel, sem prompt do navegador.
- `whatsapp-service/internal/repository/message_repo.go`: `media_error` e limpo quando a midia fica `ready`; erro de midia passa a inferir status `failed`.
- `whatsapp-service/internal/repository/media_repo.go`: `last_error` e limpo quando a midia fica `ready`.
- `whatsapp-service/internal/whatsapp/events.go`: envio para telefone bruto agora normaliza `+5548988003260`, `5548988003260` e formatos com mascara antes de montar o JID.
- `whatsapp-service/pkg/phone/normalize.go`: `@lid` deixou de ser tratado como grupo; grupo real e apenas `@g.us`.
- Banco Supabase: aplicada migration de `storage_objects`.
- Banco Supabase: corrigidos 80 chats `@lid` e 358 mensagens historicas marcadas incorretamente como grupo.

## Grupos e nomes

Depois da correcao historica:

| Metrica | Valor |
| --- | ---: |
| Grupos reais | 84 |
| Grupos sem nome | 0 |
| Grupos com fallback `Grupo (...)` | 0 |
| Grupos com JID diferente de `@g.us` | 0 |

Os nomes de grupos reais estao sendo resolvidos por `GetGroupInfo` e fallback de store local. O problema observado era principalmente `@lid` sendo classificado como grupo.

## Numeros alvo

O normalizador aceita:

- `+5548988003260`
- `5548988003260`
- `(48) 98800-3260`

Na auditoria do banco, nao havia chat direto encontrado para `5548988003260` ou `5548991138937` pelo criterio de JID/nome. Isso nao impede envio direto quando a instancia esta conectada; apenas indica que nao havia conversa direta registrada para esses numeros no recorte consultado.

## Validacao

Executado com sucesso:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-whatsapp-go.ps1
npm run build
node --check server\api\crm\index.js
```

Resultado: `go test ./...` e `go build ./cmd/server` passaram no workspace temporario.

Observacao: `tsc --noEmit` ainda falha em `views/AIAgents.tsx` por `wooInstances` nao definido, fora do escopo WhatsApp desta auditoria.

Tambem foi validado que o endpoint publico responde:

- `https://app.imobfluow.com.br/api/whatsapp/health`: Node OK e WhatsMeow OK.
- `https://imobfluow.com.br/api/whatsapp/health`: Node OK e WhatsMeow OK.

## Teste de envio

Nao foi executado envio real para `5548988003260` e `5548991138937` nesta rodada porque:

1. Nao havia Docker/WhatsApp Service local rodando.
2. O endpoint local `127.0.0.1:3100` nao respondeu.
3. O proxy publico exige token de usuario valido e tenant resolvido para acessar `/api/whatsapp/messages/:chatId/send`.

Instancias conectadas no banco no momento da auditoria:

- `fazendasbrasil`
- `Oka Imoveis`

Para envio real via producao, e necessario usar uma sessao autenticada do painel ou fornecer um token valido de usuario/tenant. A saude do servico foi confirmada, mas o envio nao foi simulado nem burlado.
