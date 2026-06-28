# Auditoria forense de armazenamento, banco e midias - 2026-06-04

## Resumo executivo

Esta auditoria local nao conseguiu inventariar o MinIO real porque os arquivos `.env` e `.env.production` presentes no workspace nao contem variaveis `MINIO_*` ou `S3_*`. Portanto, os numeros exatos de buckets, objetos, duplicidade real e orfaos ainda dependem de execucao no servidor de producao.

Mesmo assim, a analise de codigo encontrou um candidato muito forte para crescimento rapido: o pipeline de midias do WhatsApp/WhatsMeow grava midia recebida, midia enviada, midias importadas por historico e avatares no storage. Nao ha deduplicacao por hash antes do upload, nao ha politica de retencao/expurgo aplicada no codigo, e o identificador do arquivo usa timestamp, o que favorece multiplas copias fisicas do mesmo conteudo.

Pelo comportamento observado, 2 GB em 5 dias com 2 clientes equivale a cerca de 0,4 GB/dia no total, ou 0,2 GB/dia por cliente. Sem correcao, a projecao linear e:

| Clientes | Dia | Mes aproximado |
| --- | ---: | ---: |
| 10 | 2 GB | 60 GB |
| 100 | 20 GB | 600 GB |
| 1.000 | 200 GB | 6 TB |

## Ranking preliminar dos maiores consumidores

Este ranking e baseado em evidencia de codigo, nao em inventario real de objetos:

| Origem | Risco de consumo | Evidencia |
| --- | --- | --- |
| Midias recebidas do WhatsApp | Critico | `downloadAndUploadMedia` baixa do WhatsApp e faz upload para storage em `whatsapp-service/internal/whatsapp/media.go`. |
| Importacao de historico WhatsApp | Critico | `history_import.go` tambem chama `downloadAndUploadMedia` para mensagens historicas com midia. |
| Midias enviadas pelo painel | Alto | `SendMediaMessage` envia para WhatsApp e depois grava copia local com prefixo `sent_`. |
| Avatares de contatos | Medio/alto | `client.go` baixa foto de perfil e salva em `instance/avatars/phone/avatar_picID.jpg`. |
| Imagens comerciais/landing pages | Medio | Upload centralizado aceita imagens ate 10 MB e salva por organizacao/pasta. |
| Base64 em banco | Medio | Foram encontrados pontos de preview/salvamento de logo em base64 no frontend; precisa query de banco para medir. |

## Achados tecnicos

### Critico: uploads WhatsApp sem deduplicacao antes do storage

O Go service gera nomes como `image_<timestamp>`, `audio_<timestamp>`, `video_<timestamp>` e salva em `instanceID/data/arquivo`. Se a mesma mensagem for reprocessada, importada novamente, ou recebida via retry, a chave pode mudar e criar nova copia no MinIO.

Evidencias:

- `whatsapp-service/internal/whatsapp/media.go`: `downloadAndUploadMedia` faz download e upload direto.
- `whatsapp-service/internal/whatsapp/media.go`: o caminho usa `time.Now()` e nome por timestamp.
- `whatsapp-service/internal/repository/media_repo.go`: existe `UNIQUE (message_id)` na tabela, mas isso deduplica metadado, nao impede que o objeto ja tenha sido enviado ao MinIO.

### Critico: importacao de historico pode multiplicar midias

`whatsapp-service/internal/whatsapp/history_import.go` baixa e envia midias durante importacao historica. Se o import for acionado mais de uma vez, ou se mensagens antigas forem reprocessadas antes da deduplicacao por `message_id`, o storage pode crescer de forma desproporcional.

### Alto: sem rotina efetiva de retencao/limpeza

A busca por `retention`, `cleanup`, `deleteObject`, `removeObject` e equivalentes nao encontrou job aplicado para apagar midias antigas do MinIO. Ha recomendacoes em documentacao, mas nao implementacao operacional.

Politica minima recomendada:

| Tipo | Retencao inicial |
| --- | ---: |
| Imagens WhatsApp | 30 dias |
| Audios WhatsApp | 15 dias |
| Videos WhatsApp | 15 dias |
| Documentos WhatsApp | 30 dias, com excecoes por negocio |
| Logs/payloads | 7 dias |
| Payloads completos | 3 dias |

### Alto: `size_bytes` existe, mas nao e preenchido no pipeline atual

A tabela `whatsapp_media` possui `size_bytes`, mas o `media_repo.go` nao insere tamanho. Isso impede responder pelo banco "quem gerou os 2 GB" sem consultar o MinIO. O tamanho deve ser persistido no momento do upload.

### Alto: bucket/url publica ainda e contrato funcional

O Node ja possui `createPresignedGetUrl`, e a API WhatsApp tenta assinar por `object_key`. Mas ainda ha fallback para `public_url`, e o Go grava `publicURL` direto. Isso dificulta privacidade e tambem torna diagnostico/orfaos mais dificil.

### Medio: base64 pode entrar por fluxo de logo/editor

Foram encontrados usos de `FileReader` e base64 em `views/SiteSetupWizard.tsx` e `views/VisualSiteEditor.tsx`. Isso nao prova consumo grande, mas justifica rodar as queries de `sql/forensic_storage_audit.sql` para identificar `data:%base64,%` em colunas como `logo_url`, `site_settings` e `properties.images`.

### Medio: uploads frontend estao melhor controlados

`server/api/storage/index.js` limita upload a 10 MB, aplica whitelist MIME por bucket e prefixa caminho por `req.orgId`. E um ponto positivo. Ainda falta inventario central `storage_objects` para rastrear entidade, tenant, hash, tamanho e retencao.

## Artefatos criados

### Inventario MinIO/S3

Arquivo: `scripts/forensic-storage-audit.mjs`

Executar no servidor com variaveis `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` e buckets configurados:

```bash
node --env-file=.env scripts/forensic-storage-audit.mjs
```

Saida: `scratch/forensic-storage-audit/`

O script lista objetos via S3 API, agrupa por bucket, extensao, prefixo principal, dia, maiores arquivos e candidatos a duplicidade por `size + etag`.

### Consultas de banco

Arquivo: `sql/forensic_storage_audit.sql`

Contem queries read-only para:

- 50 maiores tabelas.
- Midias WhatsApp por tenant/tipo/status.
- Mensagens com `media_url` sem linha em `whatsapp_media`.
- Linhas `whatsapp_media` sem `object_key`.
- Candidatos a duplicidade por URL/object key.
- Base64 em colunas conhecidas.
- Conteudo grande em `landing_pages` e `site_texts`.
- Colunas candidatas a payload/log.

## Plano de correcao

### Imediato - ate 24h

1. Rodar `scripts/forensic-storage-audit.mjs` no servidor e anexar o JSON gerado.
2. Rodar `sql/forensic_storage_audit.sql` no Postgres.
3. Pausar importacao de historico WhatsApp enquanto a duplicidade nao estiver medida.
4. Validar se `imobzywhatsapp` e publico ou privado e se `MINIO_PUBLIC_URL` aponta para o dominio real.

### Curto prazo - ate 7 dias

1. Persistir `size_bytes`, `sha256` e `etag` em `whatsapp_media`.
2. Antes de upload, deduplicar por hash de conteudo ou por identificadores WhatsApp (`FileSHA256`, `FileEncSHA256`, message id + media key).
3. Criar job de expurgo por tipo/status/data.
4. Criar tabela generica `storage_objects` com `tenant_id`, `bucket`, `object_key`, `entity_type`, `entity_id`, `size_bytes`, `sha256`, `created_at`, `expires_at`.
5. Bloquear reimportacao de historico sem checkpoint/idempotencia.

### Estrutural - ate 30 dias

1. Separar buckets publicos e privados.
2. Trocar contrato do banco para `bucket/object_key`, usando URL assinada curta no consumo.
3. Criar dashboard de storage por tenant/tipo/dia.
4. Adicionar lifecycle MinIO para temporarios, logs e midias WhatsApp.
5. Adicionar testes integrados com MinIO local para upload, signed URL, deduplicacao e expurgo.

## Respostas ainda pendentes para fechar a auditoria

Com os artefatos executados em producao sera possivel responder:

1. Quem gerou os 2 GB: pelo agrupamento de prefixo/bucket no MinIO e por tenant/tipo no banco.
2. Quais tipos de arquivo consomem espaco: pelo agrupamento por extensao.
3. Quais processos causam crescimento: cruzando prefixos (`instanceID/data`, `sent_`, `avatars`) com codigo.
4. Quanto e desperdicio: pelos grupos duplicados `size + etag` e orfaos MinIO x banco.
5. Quanto pode ser eliminado: pelos objetos sem referencia e por politica de retencao.
6. Projecao para 10, 100 e 1.000 clientes: ja estimada acima, deve ser recalculada com os bytes reais por tenant.
7. Sustentabilidade: a arquitetura atual precisa de deduplicacao, retencao e inventario central antes de escalar.
