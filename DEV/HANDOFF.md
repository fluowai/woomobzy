# Handoff

## 2026-08-20 — Fix de 500 ao excluir Cliente Direto (Mega Admin)

- `DELETE /api/mega/direct-clients/:id` agora desvincula dependências e usa fallback transacional (`server/lib/organization-deletion.js`) quando há FK sem cascade, retornando 200 em vez de 500.
- `PUT /direct-clients/:id` e `PUT /resellers/:id` agora devolvem 404 (PGRST116) em vez de 500 quando o registro não corresponde a um cliente/reseller.
- E-mail de boas-vindas de resellers/clientes diretos corrigido (`org.id` no lugar de variável indefinida).
- Cobertura: type-check e 3/3 testes do fallback passaram. Deploy pendente de validação em homologação com um cliente direto real.
- Nenhum commit, push ou deploy foi executado.

## 2026-07-28 — Execução da Onda 0

- Inventário atual: `DEV/TESTS/FUNCTIONAL_AUDIT_MATRIX.md`, gerado por `npm run audit:matrix`.
- Matriz de acesso: `DEV/TESTS/ONDA0_ACCESS_MATRIX.md`.
- A suíte pública e o bloqueio anônimo dos quatro painéis estão aprovados.
- Privilégio, bootstrap de tenant, assinatura e impersonação receberam correções e testes de regressão.
- A migration `migrations/20260728_harden_impersonation_sessions.sql` foi criada, mas não aplicada.
- Próxima ação obrigatória do responsável pelo ambiente: rotacionar todos os segredos previamente expostos e invalidar credenciais antigas.
- Para continuar a execução funcional: preencher as oito variáveis `IMOBZY_E2E_*` com contas exclusivas de homologação e preparar duas organizações por nicho.
- Sem essas dependências, Urbano, Rural, Super Admin, Mega Admin e isolamento RLS não podem ser declarados aprovados.
- Nenhum commit, push ou deploy foi executado.

## 2026-07-28 — Auditoria funcional e prevenção de regressões

- Plano criado em `DEV/SPECS/AUDITORIA_FUNCIONAL_REGRESSAO.md`.
- A execução deverá começar pela matriz mestra e pela fundação transversal, antes do painel Urbano.
- Ordem do plano: fundação, Urbano, Rural, Super Admin, Mega Admin, superfícies públicas e automação permanente.
- Dependência para começar: ambiente de homologação e contas de teste separadas por perfil e organização.
- Nenhuma correção de produto, commit, push ou deploy foi executado nesta atividade.

## 2026-07-28 — Recuperação do QR Code do WhatsMeow

- A instância de produção `22222` foi encontrada em `connecting`, sem QR Code persistido.
- O endpoint de QR agora reinicia clientes presos em `connecting`, mas mantém fluxos `qr_pending` ativos.
- A consulta do dashboard urbano deixou de solicitar a coluna inexistente `leads.broker_id`.
- A instância real foi redefinida condicionalmente de `connecting` para `disconnected`; a próxima abertura autenticada do modal inicia um novo pareamento.
- A correção está validada; para ativar a recuperação permanente, ainda é necessário implantar as imagens `frontend` e `whatsapp-service`.
