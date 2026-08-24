# Verificação

## 2026-08-23 — Agentes de IA com prompt editável e conexão de canais

- `node --check server/api/ai/agents.routes.js`: passou.
- `git diff --check`: passou.
- `npm run type-check`: inconclusivo; processo ficou sem saída por tempo prolongado e foi interrompido.
- `npx tsc --noEmit --pretty false`: inconclusivo; processo ficou sem saída por tempo prolongado e foi interrompido.
- `npm run build`: inconclusivo; Vite iniciou `transforming...`, ficou sem saída por tempo prolongado e foi interrompido.
- `npx eslint --quiet views\AIAgentDetail.tsx views\AIOperationDashboard.tsx services\aiWorkforce.ts`: inconclusivo; processo ficou sem saída por tempo prolongado e foi interrompido.

## 2026-08-23 — Redirecionamento direto para painel por perfil

- Rota `/` alterada para redirecionar usuários autenticados via `HomeRoute`.
- Helper central criado em `src/lib/panelNavigation.ts` para resolver `/rural`, `/urban`, `/superadmin`, `/megaadmin` e `/onboarding`.
- `Login`, `NicheRedirect`, `SuperAdminGuard`, `MegaAdminGuard` e `PanelGuard` alinhados à mesma regra.
- `npm run build`: passou; bundle de produção gerado em `dist/`.
- `npx eslint App.tsx components\NicheRedirect.tsx components\PanelGuard.tsx components\SuperAdminGuard.tsx components\MegaAdminGuard.tsx views\Login.tsx src\lib\panelNavigation.ts`: passou sem erros.
- `git diff --check`: passou.
- `npm run type-check`: inconclusivo nesta rodada; processo ficou sem saída por tempo prolongado e foi interrompido.

## 2026-08-23 — Auditoria da migração Lalbero CVCRM

- Consulta service-role read-only: `leads` da organização `391d8df5-7297-42bd-a443-1aca77b1f0a1` retornou 4.867 registros.
- Contagem por status: `Em Atendimento` = 4.867; etapas oficiais do Kanban = 0.
- Contagem de histórico: `lead_activities` = 0 e `chat_messages` = 0 para a organização.
- Dry-run `node --env-file=.env scripts\migrateCvcrmLeads.js --audit`: passou e confirmou distribuição original por situação CVCRM.
- Dry-run `node --env-file=.env scripts\migrateCvcrmLeads.js --reorganize`: passou e calculou distribuição alvo (`Novo` 4.790, `Qualificação` 47, `Perdido` 28, `Fechado` 1, `Simulação` 1).
- `node --check scripts\migrateCvcrmLeads.js`: passou.
- Pendência: configurar `CVCRM_EMAIL` e `CVCRM_TOKEN` no ambiente para importar interações pelo endpoint oficial `/api/v1/cvdw/leads/interacoes`; nenhuma escrita em banco foi executada.

## 2026-08-23 — Hotfix de recursão RLS em profiles

- Sintoma em produção: `GET /rest/v1/profiles?...id=eq.df587a67...` retornou 500 com `42P17 infinite recursion detected in policy for relation "profiles"`.
- Causa confirmada por inspeção: policy `profiles_select_same_org_or_reseller_or_mega` chamava helpers que consultam `public.profiles`, criando recursão na própria tabela.
- Criada migration `migrations/20260823_fix_profiles_rls_recursion.sql` para remover policies recursivas de `profiles` e recriar `profiles_select_own`/`profiles_update_self` sem subqueries.
- `UserManagement` e `TeamManager` deixaram de consultar `profiles` diretamente no browser; agora usam `/api/admin/users` e `/api/admin/team`, ambos escopados no backend.
- `node --check server/routes/admin.js`: passou.
- `npm run type-check`: passou.
- `npx vitest run --pool=threads --maxWorkers=1 server/__tests__/adminOrganizationsFallback.test.ts`: 5/5 passaram. Sem `--maxWorkers=1`, o worker do Vitest voltou a expirar antes dos testes.
- `npm run build`: passou.
- `git diff --check`: passou.
- Pendência operacional: aplicar `migrations/20260823_fix_profiles_rls_recursion.sql`, subir nova imagem Docker/Portainer e retestar login + tela de usuários com mega admin, revenda A e revenda B.

## 2026-08-23 — Correção crítica de isolamento Super Admin / Revenda

- `node --check server/routes/admin.js`: passou.
- `npx vitest run --pool=threads server/__tests__/adminOrganizationsFallback.test.ts`: 5/5 passaram.
- `npm run type-check`: passou sem erros.
- `npm run build`: passou.
- `npm run lint`: código zero, 0 erros e 716 warnings preexistentes/de dívida técnica.
- `git diff --check`: passou.
- Pendência operacional: aplicar e validar `migrations/20260823_fix_reseller_tenant_isolation.sql` em homologação/produção com contas reais de mega admin, revenda A, revenda B e imobiliárias filhas.

## 2026-08-20 — Fix de 500 no DELETE de Cliente Direto (Mega Admin)

- `node --check` OK em `server/lib/organization-deletion.js`, `server/routes/mega-admin.js` e `server/routes/admin.js`.
- `npx vitest run --pool=threads server/__tests__/adminOrganizationsFallback.test.ts`: 3/3 passaram. Obs.: o pool padrão (forks) falha neste ambiente por timeout do worker (pré-existente, não relacionado à mudança).
- `npm run type-check`: sem erros.
- `npx eslint server/__tests__/adminOrganizationsFallback.test.ts`: sem erros.
- Validação funcional (DELETE de cliente real) depende de rodar em homologação; nenhum commit/push/deploy foi executado.

## 2026-07-28 — Auditoria funcional, execução da Onda 0

- `npm run audit:matrix`: 143 rotas; 49 Urbanas, 48 Rurais, 13 Super Admin, 13 Mega Admin e 20 públicas/compartilhadas.
- Playwright público: 10/10 passaram em Chromium desktop e mobile.
- Playwright anônimo dos painéis: 8/8 passaram.
- Testes direcionados de autenticação, impersonação e assinatura: passaram.
- `npx vitest run`: 25 arquivos e 123 testes passaram no estado final desta execução.
- `npm run type-check`: passou após as correções da revisão independente.
- `npm run build`: passou.
- `npm run lint`: código zero, 0 erros e 598 avisos preexistentes/de dívida técnica.
- `go test ./...`: passou em cópia temporária sem acentos no caminho; a execução direta falha por limitação da toolchain no caminho `Área de Trabalho`.
- Revisão independente: cinco achados corrigidos; reteste aprovou o recorte.
- A auditoria autenticada completa permanece bloqueada pela ausência das oito variáveis de credenciais E2E.
- `npm run test:e2e:audit`: 8 casos anônimos passaram, 25 casos autenticados foram ignorados e o contrato falhou intencionalmente ao listar as oito credenciais ausentes.
- A rotação de segredos e a validação da migration/RLS não foram executadas.

## 2026-07-28 — Linha de base para auditoria funcional

- `npm run type-check`: passou.
- `npm run build`: passou.
- `npm run test -- --run`: 18 arquivos e 90 testes aprovados.
- `npm run lint`: terminou com código zero e muitos avisos.
- `npx playwright test --list`: 5 cenários lógicos em 2 arquivos, executados nos projetos Chromium desktop e mobile, totalizando 10 execuções.
- Inspeção de `App.tsx`: 48 tags de rota no bloco Rural, 47 no Urbano, 13 no Mega Admin e 12 no Super Admin.
- O planejamento não comprova o funcionamento dos módulos autenticados; essa verificação pertence às ondas definidas em `DEV/SPECS/AUDITORIA_FUNCIONAL_REGRESSAO.md`.

## 2026-07-28 — WhatsMeow QR Code e consulta de leads

- `go test ./...`: passou na toolchain Go 1.25.0, em workspace temporário sem acentos no caminho.
- `go build ./cmd/server`: passou.
- Teste de regressão `TestShouldStartQRConnection`: passou.
- `npm run build`: passou; 4.042 módulos transformados.
- ESLint nos arquivos relacionados: 0 erros; 6 avisos preexistentes.
- `git diff --check`: passou.
- `npm run type-check`: inconclusivo; o processo `tsc` foi encerrado pelo Windows sem emitir diagnóstico TypeScript. O build Vite de produção passou.
- Produção antes do deploy: health do Node/WhatsMeow em HTTP 200; instância `22222` presa em `connecting`, com QR vazio.
- Recuperação imediata aplicada em produção: atualização condicional da instância `22222` para `disconnected`; permaneceu aguardando uma requisição autenticada do modal durante a janela de observação.
