# Ralph context snapshot: auditoria de dados reais

Task statement: continuar a auditoria e execucao para deixar o sistema funcionando ponta a ponta, do WooControl ate o cliente final, sem dados mockados apresentados como reais, com verificacao e envio ao Git.

Desired outcome: corrigir os fluxos operacionais que hoje simulam sucesso, validar com comandos locais e, quando houver credenciais/URL de homologacao, validar tambem os fluxos autenticados e integracoes reais. Enquanto credenciais externas faltarem, o sistema deve falhar de modo explicito em vez de inventar dados.

Known facts and evidence:
- Branch atual: `codex/auditoria-dados-reais-20260906`.
- Commit `9abb23f` ja restringiu WooControl, ajustou diagnostico de DB, criou matriz funcional e plano de execucao.
- Commit local `1ffe948` registra documentacao de verificacao e ainda nao foi enviado ao remoto no inicio desta retomada.
- `DEV/SPECS/REAL_DATA_EXECUTION_PLAN.md` lista P1 pendente em IA, cobranca, webhooks, email, Sienge, locacao, rural e acoes de UI.
- `DEV/TESTS/REAL_DATA_FINDINGS.md` lista 121 sinais estaticos a revisar.
- Verificacao anterior: type-check, build, Vitest e lint passaram; Playwright autenticado nao foi possivel por ausencia de `IMOBZY_E2E_*`.

Constraints:
- O usuario autorizou commit e push para esta auditoria.
- Nao executar cobrancas, enviar mensagens a terceiros ou alterar producao real em testes sem autorizacao especifica.
- Segredos nao devem ser lidos ou expostos.
- Seguir padroes do projeto: React/TypeScript, Express, Supabase, `logger` no frontend.
- Atualizar `DEV/WORKLOG.md`, `DEV/VERIFY.md`, `DEV/HANDOFF.md`, `DEV/CONTEXT.md` e `DEV/SPECS/ACTIVE.md` apos trabalho substantivo.

Unknowns and open questions:
- URL de homologacao ainda nao informada.
- Contas exclusivas dos perfis WooControl, admin urbano, corretor urbano, admin rural, super admin e mega admin ainda nao configuradas no ambiente.
- Provedores externos de cobranca, email, WhatsApp, LLM e Sienge podem nao estar configurados no ambiente local.

Likely codebase touchpoints:
- `server/api/ai/agents.routes.js`
- `server/routes/aiOperations.js`
- `server/services/ai/testOrchestrator.js`
- `server/services/ai/testRunner.js`
- `server/services/ai/redTeam.js`
- `server/services/ai/scoringEngine.js`
- `views/CreateOperationWizard.tsx`
- `views/AILogs.tsx`
- `server/services/asaasGateway.js`
- `server/routes/webhook.js`
- `DEV/*`
