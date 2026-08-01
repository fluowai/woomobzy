# Verificação

## 2026-08-01 — WhatsAppDashboard integrado + desbloqueio de gates

- `npm run type-check`: passou (0 erros) após corrigir `App.routes.tsx` (import `./src/views/sites/megainvestimentos/MegaTheme`) e `HeroSearch.tsx` (`Home` no import do lucide-react).
- `npx eslint` na shell e arquivos alterados: 0 erros; 4 warnings preexistentes de exhaustive-deps em `useWhatsAppInbox.ts`.
- `npm run build`: passou (4.076 módulos, PWA generateSW 264 entries; `WhatsAppDashboard-*.js` 130 kB / gzip 22,7 kB).
- `npm run test`: 25 arquivos / 123 testes passaram.
- `git diff` limpo nos fontes (arquivos batem com HEAD `99abe95`); alterações apenas em DEV docs.
- Pendência: validação runtime — subir Go whatsapp-service (3100), Node backend (3001/3002) e Vite (3006); conferir aba Mensagens em `/urban/whatsapp` e `/rural/whatsapp` com instância conectada.

## 2026-07-30 — Fix do gap LegalContracts (contracts + RLS + UI)

- `scratch/apply_contracts_fix.mjs` (exec_sql RPC): migration `20260730_fix_contracts_legal_tab.sql` aplicada em produção **7/7 statements OK** (colunas `title`/`type`/`value`/`template_id`/`contract_type`, policy RLS, trigger, index). Splitter corrigido: o antigo descartava statements após linhas de comentário.
- RLS simulada como `authenticated` via transação revertida: INSERT + SELECT em `contracts` OK, 0 rows persistidos.
- `scratch/verify_20260730_final.mjs` (pg direto): todos os checks passam — colunas presentes, policy ativa, trigger + index, `contracts.status` default `'draft'`.
- Runtime validado: `views/urban/Cobranca.tsx` lê `rental_contracts` (select autenticado OK); `views/LegalContracts.tsx` insert envia `contract_type`.
- Gates: `npm run type-check` passou; `npx eslint` em `LegalContracts.tsx`/`run-migrations.mjs` 0 erros (10 warnings preexistentes); `npm run build` passou.
- Nenhum commit/push/deploy executado.

## 2026-07-30 — Análise de segurança (advisory)

- gitleaks v8.30.1 (histórico, `--redact`): **212 leaks**; confirmados por fingerprint SHA256 contra `.env` local: service role key e JWT secret de produção iguais aos do `.env`; credencial (email/senha) em 2 scripts de teste.
- npm audit `--omit=dev` (produção): 18 vulnerabilidades (16 high); saída bruta em `security-reports/npm-audit-prod.json`.
- SAST (semgrep/trivy) **não executado**: ferramentas ausentes e docker daemon inativo — substituído por revisão manual de código/config.
- Verificação pendente (depende de acesso ao banco/produção): grants de `exec_sql` para anon/authenticated; confirmação visual dos webhooks; aplicação de `secure_rpc.sql` como migration.

## 2026-07-30 — Rural UX batch (5 views)

- `npm run type-check`: passou (sem output).
- `npx eslint` nos 5 arquivos: 0 erros; 4 avisos preexistentes (`MapPin` em RuralDashboard; `FileText`/`PropertyGeo` em CadastroTecnico; hooks-deps em DossieInteligente) — nenhum introduzido pelo diff.
- `npm run build`: passou; 4.063 módulos transformados; PWA `generateSW` 237 entries.
- Coberto por revisão de código (sem teste autenticado executado): quick actions, exclusão de propriedade, upload por item (20MB), minuta gated por riskScore >= 80.
- Pendência: validação visual/funcional no navegador com autenticação em `/rural` (dashboard, cadastro-tecnico, due-diligence, dossie, financeiro).

## 2026-07-30 — Migrations 20260730\_\* aplicadas em produção

- `scratch/run_migrations_20260730.mjs` (exec_sql RPC, statement a statement): dry run OK (169 statements); execução real **169/169 ok, 0 falhas, 0 ignorados** nos 6 arquivos.
- `scratch/verify_20260730.mjs` (pg direto com `SUPABASE_DB_URL`, sslmode removido): **14/14 checks OK** — condominium_tickets, condominiums.status, rental_contracts.{tenant_name,property_id,monthly_rent}, clients, lead_activities.lead_id, get_my_org_id, is_superadmin, handle_updated_at, pgcrypto, policy plans, policy landing_pages (`Public read landing_pages`, com underscore). `contracts.title` ausente conforme esperado.
- Nenhum commit/push/deploy executado.

## 2026-07-30 — Resolução do v8 (BI RPCs + views billings/contracts)

- Probe pg em produção (`pg_class`/`information_schema.columns`): `billing`=TABLE(11 cols), `billings`=TABLE(17), `contracts`=TABLE(10), `rental_contracts`=TABLE(47); RPCs `get_bi_stats`→jsonb e `get_bi_lead_sources`→TABLE(name,value) existem e têm assinatura correta.
- `CREATE OR REPLACE VIEW billings`/`contracts` bloqueado por colisão de nomes com tabelas reais → statements #3/#4 do v8 ficam registrados como "skipped" (não executar); GRANTs correspondentes também.
- Fix frontend aplicado: `views/urban/Cobranca.tsx` `loadContracts` agora lê `rental_contracts` (`tenant_name`, `monthly_rent`, `property:property_id(title)`, `status='active'`).
- Gates: `npm run type-check` passou (sem output); `npm run lint` 0 erros (593 avisos preexistentes, nenhum no diff); `npm run build` passou (4.063 módulos, PWA generateSW 237 entries).
- Pendência: validar no navegador o dropdown de contratos em `/urban/cobranca` (autenticado); decidir se aplico as migrations `20260730_*` ainda não executadas.

## 2026-07-30 — Fix 404 do Metas & Vendas Rurais

- Confirmado via `information_schema`/`pg_class` que `rural_financial_goals`, `rural_property_favorites` e `rural_property_visits` existem em produção (OID ~22204-22246, criadas ~13/07).
- Reprodução da query exata do console (anon key, `organization_id` + `period_month`): 404 → após `NOTIFY pgrst, 'reload schema'` → 200 `[]`.
- `npm run type-check`: passou. `npm run lint`: 0 erros; 593 avisos preexistentes, nenhum em `views/rural/FinanceiroRural.tsx`.
- `period_month` agora sempre `YYYY-MM-01` (sem shift de UTC) no load e no save.
- Pendência: validação visual/funcional no navegador em `/rural/financeiro` com autenticação (dev server ou produção após deploy).

## 2026-07-30 — Port da sidebar colapsável (sanfona) para o Rural

- `npm run type-check`: passou (sem output).
- `npx eslint components/RuralLayout.tsx`: 0 erros.
- `npx prettier --check components/RuralLayout.tsx`: aprovado após `--write`.
- `npm run build`: passou; `dist` gerado (4.059 módulos, PWA `generateSW` 237 entries).
- Comportamento coberto por revisão de código (sem teste autenticado executado): toggle desktop `280px ↔ 72px`, auto-colapso ao navegar, menu móvel com labels sempre visíveis (`renderSidebarContent(true)`).
- Pendência: validação visual/funcional no navegador em `/rural` (desktop + mobile) com autenticação.

## 2026-07-30 — Reforma da aba Agentes IA

- `npm run type-check`: passou (sem output).
- `npm run lint`: 0 erros; 593 avisos preexistentes, nenhum em `views/AIAgents.tsx` ou `components/agents/`.
- `npm run build`: passou; 4.059 módulos transformados; bundle da aba `AIAgents-*.js` 94 kB (gzip 15,8 kB).
- Remoção de `components/AgentPremiumDashboard.tsx` verificada: nenhuma referência restante (grep).
- Pendência: validação visual/funcional no navegador com autenticação.

## 2026-07-30 — Fix TemplateManager 500 (global_templates)

- `node --check` em `server/routes/admin-templates.js` e `scripts/run-migrations.mjs`: passou.
- Migração `migrations/20260713_global_templates.sql` executada em produção via RPC `exec_sql`: 7/7 statements OK (table, 3 índices, RLS, 2 policies).
- Verificação pós-migração: SELECT em `public.global_templates` retorna `[]` sem erro (tabela existe).
- Pendência: confirmar no navegador que o TemplateManager carrega e faz o seed dos templates padrão no primeiro GET.

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
