# Verificação

## 2026-09-06 — Auditoria integral: evidência local, homologação pendente

- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: 142 testes passaram em 28 arquivos. A primeira execução com concorrência padrão teve timeouts de workers; a repetição limitada passou sem esses erros.
- `npm run type-check`: passou, inclusive após alterações finais de navegação e cobertura.
- `npm run build`: passou após alterações finais, 4.092 módulos e PWA gerada. Aviso: base Browserslist desatualizada.
- `npm run lint`: exit 0, zero erros e 770 avisos. ESLint direcionado aos arquivos alterados com `--quiet`: exit 0.
- `node --check`: passou em woo-control.js, woo-control-access.js e check-db.mjs.
- Playwright: primeira rodada selecionada com 16 cenários teve 12 aprovações e 4 falhas de API porque o backend local estava desligado. Depois de iniciar `server/index.js` em NODE_ENV=development, os 4 cenários foram repetidos e passaram (desktop e mobile). As 12 aprovações anteriores incluem os cinco painéis anônimos em dois dispositivos e a rota inexistente. Não apresentar essas duas rodadas como uma regressão autenticada completa.
- Limite da suíte pública existente: ela intercepta `/api/public/texts` com uma fixture vazia. Portanto esses testes validam interface/roteamento, não o conteúdo real de textos no banco.
- HTTP real no backend local: `/api/woo-control/summary` e `/api/woo-control/network` sem token retornaram 401; `/api/public/branding?domain=127.0.0.1` retornou 200.
- `node --env-file=.env scripts/check-db.mjs`: exit 1 correto. Organizations respondeu 200; profiles, properties, leads, landing_pages, site_settings e site_texts responderam 401 usando a chave pública. Isso não prova ausência de tabelas nem valida operações autenticadas.
- Todas as variáveis de e-mail/senha IMOBZY_E2E_* dos seis perfis estão ausentes. URL/contas de homologação solicitadas ao usuário; não foram fornecidas nesta rodada.
- `git diff --check`: passou. `.env`, `.env.local`, `.env.production`, node_modules e dist confirmados como ignorados. Relatórios HTML/vídeos gerados ficam fora do commit.
- Backend local iniciou sincronização de cinco configurações de domínio no startup; nenhum diff rastreado de domínio foi produzido. Worker social de produção não foi iniciado. Não foram executados CRUD de negócio, cobrança, envio a clientes ou migração de produção.

**Conclusão:** correções locais verificadas, sem homologação integral. Permanecem mocks, ações incompletas e integrações sem evidência real; consultar SPECS/REAL_DATA_EXECUTION_PLAN.md. Não declarar sistema 100% funcional ou zero mocks.


## 2026-08-26 — Migrações SQL + Limpeza de Código

- 28 migrações executadas via `npm run run-migrations` + `exec_sql` RPC manual.
- Todas as tabelas verificadas acessíveis via Supabase client (whatsapp_cloud_credentials, connection_pool, connection_allocations, connection_billing, social_accounts, social_posts, signatures, condominiums, developments, organizations).
- `npm run type-check`: passou sem erros (6 erros corrigidos).
- `npm run build`: passou (4070 módulos, 1m31s, sem warnings críticos).
- `npm run lint`: sem saída (comportamento pré-existente).

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

## 2026-08-28 — Gates de verificação após limpeza do working tree

- `npm run type-check`: passou (exit 0).
- `npm run lint`: 0 erros, 744 avisos preexistentes; `views/SystemSettings.tsx` sem avisos.
- `npm run build`: passou (3m26s, 263 precache entries, exit 0).
- `git diff --check`: passou (exit 0) após remoção de trailing whitespace em `server/routes/admin.js`, `views/SystemSettings.tsx`, `views/admin/UserManagement.tsx`.
- Revisão de `migrations/20260827_ai_sandbox_fixes.sql`: `DROP FUNCTION IF EXISTS` presente; deps `get_my_org_id()` e RPC `exec_sql` confirmadas; colunas de `events` (createEventsTable.js), `leads.next_visit_at` (20260608_ai_agent_orchestration.sql), `leads.classification` e `properties.city`/`neighborhood` confirmadas.
- `constants/siteTemplates.ts`: conteúdo semântico identico ao HEAD (326 ids; diff era formatação + mojibake de acentos) — revertido; nenhuma perda funcional esperada.
- Restrições não executadas: aplicar a migração `20260827_ai_sandbox_fixes.sql` no banco e validar o fluxo de usuários usando coluna `profiles.name`.

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
## 2026-09-06 — Real-data P1/P2 após execução autônoma

- `node --check` nos arquivos backend alterados: passou para `eventBus`, `leadScoringEngine`, `licensing`, `campaignDispatcher`, `siengeService`, `cvcrmBiaService`, `agentOrchestrator`, `aiOperations`, além dos arquivos de IA/Asaas verificados antes.
- `npx eslint ... --quiet` focado nos arquivos alterados: passou sem erros.
- `npm run type-check`: passou após as telas e serviços novos.
- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: 29 arquivos e 147 testes passaram. Teste legado do Architect foi atualizado porque o contrato correto agora é falhar sem provedor real, não gerar arquitetura fallback.
- `npm run lint`: exit 0, zero erros e 739 warnings legados/de dívida técnica.
- `npm run build`: passou, 4.273 módulos transformados e PWA gerada. Aviso não bloqueante: base Browserslist/caniuse-lite desatualizada.
- `git diff --check`: passou; apenas avisos CRLF esperados no Windows.
- `npm run audit:matrix`: passou, matriz regenerada com 184 rotas: WooControl 16, público/compartilhado 23, Urbano 59, Rural 57, Super Admin 14, Mega Admin 15.

Não executado: migrações novas em banco remoto, webhooks/cobranças reais contra Asaas, envio real de e-mail/WhatsApp, chamadas reais Sienge/CVCRM/BIA, Playwright autenticado ponta a ponta. Esses testes exigem ambiente de homologação, credenciais e autorização operacional para não afetar clientes ou produção.
## 2026-09-06 — Verificação das migrations aplicadas

- `node scripts\apply-migration-file.mjs migrations\20260906_real_ai_calendar_tools.sql`: passou via Postgres direto.
- `node scripts\apply-migration-file.mjs migrations\20260830_wootech_communications_foundation.sql`: passou via Postgres direto após dependência ausente de `mail_senders`.
- `node scripts\apply-migration-file.mjs migrations\20260906_real_wootech_mail_campaigns.sql`: passou via Postgres direto após a dependência.
- Script ad hoc local `scratch\verify-real-data-migrations.mjs`: confirmou existência das 8 tabelas Wootech Mail/communications, policies RLS e funções `public.get_available_slots` e `public.schedule_visit`.
- `npm run check-db`: exit 1 esperado por RLS pública em tabelas protegidas; `organizations` respondeu OK.

Ainda não executado: cobrança real Asaas, envio real Wootech Mail, chamada real Sienge/CVCRM/BIA e Playwright autenticado ponta a ponta. As migrations necessárias para os recursos implementados nesta branch estão aplicadas no banco configurado no `.env`.
