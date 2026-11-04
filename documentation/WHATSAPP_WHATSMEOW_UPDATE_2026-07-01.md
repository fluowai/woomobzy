# Atualizacao WhatsMeow - 2026-07-01

## Contexto

O WhatsApp passou a exigir com mais frequencia o fluxo de codigo/chave para conectar um novo aparelho no WhatsApp Web. O projeto continua mantendo QR Code como fallback, mas agora tambem expõe o fluxo de codigo por telefone usando `whatsmeow.PairPhone`.

## Mudancas aplicadas

- `whatsmeow` atualizado para `v0.0.0-20260630180629-b572e5bcb92b`.
- Nova rota interna: `POST /api/instances/:id/pair-code`.
- Novo evento WebSocket: `pairing_code`.
- Modal de conexao com abas `QR` e `Codigo`.
- Variaveis novas:
  - `WHATSAPP_PAIR_CLIENT_TYPE`, padrao `chrome`.
  - `WHATSAPP_PAIR_CLIENT_NAME`, padrao `Chrome (Windows)`.

## Observacao tecnica

O `PairPhone` precisa ser chamado depois que o websocket de login esta pronto. Por isso o codigo reaproveita o fluxo de QR pre-login: ao receber o primeiro QR, o servico tambem solicita o codigo de pareamento quando o operador pediu esse modo.

## Rollback

Um botao de rollback no painel so pode voltar a versao do WhatsApp com seguranca se o deploy mantiver duas imagens/binarios:

- `whatsapp-service:stable`, com a versao nova.
- `whatsapp-service:legacy`, com a versao anterior conhecida como boa.

O botao do painel deve acionar o orquestrador/deploy para trocar a imagem do servico e reiniciar o container. Apenas trocar uma flag no frontend nao volta a versao da biblioteca Go ja compilada.
