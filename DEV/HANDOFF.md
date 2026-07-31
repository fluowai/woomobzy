# Handoff

## 2026-07-30 — Migrations 20260730_* aplicadas e verificadas

- 6 migrations executadas em produção via RPC `exec_sql`: **169/169 statements ok, 0 falhas** (landing_pages public access + RLS definitive, condominium_tickets, fix_all_production_errors, consolidated_production_fix, plans RLS insert).
- Verificação pós-migração via pg direto: 14/14 checks OK (tabelas/colunas/funções/extension/policies); `contracts.title` segue ausente (gap LegalContracts continua aberto).
- Change set pendente de commit: guard files (fix navegação) + `views/urban/Cobranca.tsx` + docs DEV. Gates type-check/lint/build já verdes.
- Próxima ação: (1) validar `/urban/cobranca` no navegador; (2) commit do change set; (3) considerar adicionar os `20260730_*` à lista canônica de `scripts/run-migrations.mjs` ou arquivá-los como executados.

## 2026-07-30 — Migrations em produção: v8 resolvido + 18 aplicadas

- 18 migrations executadas via RPC `exec_sql` (302 statements ok). `v8_fix_bi_rpcs_and_views.sql` resolvido por análise: `billings`/`contracts` já são **tabelas reais** em produção (views inviáveis) e os RPCs `get_bi_stats`/`get_bi_lead_sources` estão no ar. A premissa da migration era falsa — nenhum código usa `billings`.
- Bug real corrigido: `views/urban/Cobranca.tsx` passou a consultar `rental_contracts` (`tenant_name`, `monthly_rent`, `property:property_id(title)`, `status='active'`) em vez de `contracts`. Gates type-check/lint/build OK. Nenhum commit/push/deploy.
- Próxima ação: (1) validar `/urban/cobranca` no navegador; (2) decidir se aplico as migrations `20260730_*` não executadas (plans RLS, landing pages, condomínio, consolidated/fix-all); (3) commit das alterações pendentes (docs DEV + fix de navegação + Cobranca).

## 2026-07-30 — Fix navegação "voltar" para página de vendas

- Causa raiz: `MegaAdminGuard` redirecionava impersonação/usuários sem permissão para `/`; `SystemSalesPage` exibia a página de vendas mesmo logado; `ResellerManager` não navegava após impersonar.
- Correções: helper `getPanelHomePath` (NicheRedirect.tsx) centralizando o destino do painel; `MegaAdminGuard`/`SuperAdminGuard` roteiam impersonação para a org impersonada; `SystemSalesPage` redireciona logados via `useEffect`; `ResellerManager` navega para `/admin` após impersonar.
- Verificado por type-check, eslint (0 erros) e build. Nenhum commit/push/deploy.
- Próxima ação: abrir os painéis (urbano/rural/super/mega) logado e validar o botão voltar do navegador e o fluxo "Acessar Como" (modo suporte) em produção.

## 2026-07-30 — Sidebar colapsável (sanfona) portada do Urbano para o Rural

- `components/RuralLayout.tsx` agora tem menu lateral colapsável igual ao Urbano (toggle desktop `280px ↔ 72px`, auto-colapso ao navegar, estados colapsados em todos os blocos). Melhoria: menu móvel mantém labels visíveis.
- Verificado por type-check, eslint e build. Nenhum commit/push/deploy.
- Próxima ação: abrir `/rural` no navegador (desktop + mobile) com login e validar expandir/recolher, navegação e overlay móvel.
- Item "Integrações" no menu rural e rota `/rural/clients` permanecem como gaps abertos no relatório `DEV/RELATORIO_GAP_URBANO_RURAL.md`.

## 2026-07-30 — Reforma da aba Agentes IA

- View `views/AIAgents.tsx` reescrita como orquestrador thin com 9 componentes em `components/agents/` (dashboard, form único, presets, chat de teste, métricas reais).
- `components/AgentPremiumDashboard.tsx` removido (órfão confirmado).
- type-check, lint e build aprovados. Nenhum commit/push/deploy.
- Próxima ação: abrir `/urban/ai-agents` e `/rural/ai-agents` com login e validar CRUD + chat; backends de memória/qualificação ainda não expostos no frontend.

## 2026-07-30 — TemplateManager 500 corrigido

- Tabela `public.global_templates` criada em produção (`epgaftsjmqmpczvzsrcc.supabase.co`) via migração `20260713_global_templates.sql`.
- Rota `GET /api/admin/templates` endurecida: tabela ausente agora responde lista vazia (sem 500), seguindo padrão `isMissingTable` do repo.
- Seed dos 9 templates padrão ocorre automaticamente no primeiro GET por organização.
- Verificação pendente: abrir o TemplateManager (Super Admin) e confirmar o seed visualmente; deploy das imagens `server`/`frontend` ainda necessário para a correção de código valer em produção.

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
