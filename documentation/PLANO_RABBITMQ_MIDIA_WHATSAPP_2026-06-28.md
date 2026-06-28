# Plano RabbitMQ para midias do WhatsApp

## Objetivo

Usar RabbitMQ para coordenar o processamento de midias do WhatsApp sem perder anexos quando o upload para MinIO falhar, mantendo o Postgres como fonte de verdade do estado do job.

## Desenho adotado

Fluxo de entrada:

1. A mensagem chega pelo WhatsMeow.
2. O servico salva a mensagem em `whatsapp_messages`.
3. O servico cria/atualiza um job em `whatsapp_media` com `status = pending`.
4. O servico publica um payload pequeno no RabbitMQ.
5. O worker consome a fila, busca o job por `media_id`, baixa a midia do WhatsApp e sobe para MinIO.
6. Em sucesso, marca `whatsapp_media.status = ready` e atualiza os campos legados em `whatsapp_messages`.
7. Em falha, registra `last_error`, incrementa `retry_count` e agenda `next_retry_at`.

O RabbitMQ coordena a entrega rapida. O Postgres continua guardando o estado duravel, o historico de erro e o retry.

## Filas

- Exchange: `imobzy.whatsapp`
- Fila: `whatsapp.media.download`
- Routing key: `media.download`

Payload:

```json
{
  "media_id": "uuid",
  "message_id": "uuid",
  "instance_id": "uuid",
  "tenant_id": "uuid"
}
```

Arquivos binarios nao entram na fila. A fila carrega apenas IDs.

## Resiliencia

O worker atual baseado em Postgres foi mantido. Isso cobre tres cenarios importantes:

- RabbitMQ indisponivel no boot: o servico continua e processa por polling no Postgres.
- Publicacao no RabbitMQ falha: o job ja esta em `whatsapp_media` e sera processado pelo polling.
- Consumer cai durante processamento: o estado do job segue no banco e pode ser retomado.

## Rollout recomendado

1. Definir `RABBITMQ_PASSWORD` forte no ambiente.
2. Subir RabbitMQ junto do stack.
3. Confirmar que o `whatsapp-service` loga conexao com RabbitMQ.
4. Enviar uma imagem/documento de teste no WhatsApp.
5. Verificar `whatsapp_media.status` saindo de `pending` para `ready`.
6. Simular MinIO indisponivel e confirmar `retry_count`, `last_error` e `next_retry_at`.
7. Restaurar MinIO e confirmar recuperacao automatica.

## Proxima fase

- Adicionar DLQ formal (`whatsapp.media.dlq`) para erros definitivos.
- Expor painel administrativo para jobs pendentes/falhos.
- Criar acao manual de reprocessar midia.
- Adicionar metricas de fila: mensagens prontas, nao confirmadas, taxa de consumo e falhas por minuto.
- Estender o mesmo padrao para midias enviadas/outbound.
