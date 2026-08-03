# Handoff

## 2026-08-03 — Diagnóstico da revenda Delazari (escopo de clientes + impersonação)

- Relatório: `DEV/RELATORIO_REVENDA_DELAZARI_2026-08-03.md`. Análise estática (código + banco); nenhuma correção aplicada.
- Sintoma 1: lista de "clientes de revenda" só mostra os filhos — filtro `parent_id = <revenda>` em `server/routes/admin.js:663-693` (escopo de revenda) + RLS. Decidir se a revenda deve ver também clientes diretos (`parent_id IS NULL`).
- Sintoma 2: cadeia de impersonação→redirect está correta no código atual (POST comprovado no banco; `NicheRedirect` com fix `214595a`). Suspeitas: produção sem o fix `214595a`, perda da sessão no reload (sessionStorage/TTL 15min), ou envelope antigo sem `organizationId`.
- Próxima ação (maestro): confirmar versão deployada; reproduzir com logs (`logger` já loga target do NicheRedirect e loadProfile) verificando `sessionStorage['imobzy_impersonation_session']` + `isImpersonating` após o reload; decidir escopo da lista de revenda.
- Nenhum commit/push/deploy. Working tree tem WIP de outras sessões (domains, locacao, instagram-worker) — não tocar/push sem conferir.

## 2026-08-03 — Mega Admin: domínios dos whitelabels (frontend completo)

- Item de navegação "Domínios" no MegaAdminLayout; nova view `views/megaadmin/ResellerDomains.tsx` (tabela Site × Painel, status de DNS/SSL, verificar/remover/vincular via `/api/mega/resellers/:id/domain` + `/api/domains/verify/:domain`); rota lazy `/megaadmin/domains`; campos de domínio no form do ResellerManager.
- Gates verdes: type-check, lint 0 erros, build.
- Próxima ação (maestro): subir dev server + backend e validar em `/megaadmin/domains` — vincular domínio (site e painel), conferir badge "Site + Painel" em purpose `both`, verificar DNS e remover; criar reseller com `site_domain`/`panel_domain` e conferir `domains` na resposta. Depois, decidir commit/push.
- Ainda em aberto do plano: site padrão do whitelabel (`get_tenant_public`/`get_tenant_by_any_domain` para resellers, reuso do SiteSetupWizard) e branding da org (`logo_url`/`primary_color`/`secondary_color`) no painel servido no domínio do whitelabel.
- Nenhum commit/push/deploy foi executado.

## 2026-08-02 — Agentes IA: conversa inteligente com saudação e apresentação

- Sintoma relatado: mandar "oi" ao agente gerava resposta genérica, sem o agente se identificar nem se apresentar.
- Correções: novo prompt compartilhado `server/services/ai/agentPrompt.js` (protocolo de saudação/apresentação + marca + regras de conversa humana), aplicado no chat de teste (`chat.routes.js`), no orquestrador ReAct (WhatsApp) e na geração de reply do WhatsApp (`AIAutomation.processIntent`). O chat de teste agora usa o orquestrador de ferramentas quando o agente tem tools (comportamento igual ao WhatsApp).
- Gates verdes: type-check, eslint 0 erros (1 aviso pré-existente), Vitest 27 arquivos / 127 testes.
- Próxima ação (maestro): subir dev server + backend com `GEMINI_API_KEY` e validar no navegador — criar/publish um agente Zya, enviar "oi" no chat de teste e confirmar que ele se apresenta ("Sou Zya, Atendimento da WooTech Imob...") e pergunta 1 coisa para qualificar. Repetir em instância WhatsApp real com autonomia >= 3 e tool `whatsapp` (pré-requisito do auto-reply).
- Nota: no WhatsApp o auto-reply só dispara se o agente estiver Ativo, `autonomy_level >= 3` e com tool `whatsapp` — agentes Semiautônomos (nível 2) não respondem sozinhos.
- Nenhum commit/push/deploy foi executado.

## 2026-08-02 — QR WhatsApp: mensagens de falha por fase de conexão

- `QRCodeModal.tsx`: `terminalErrorRef` para o polling após erro terminal (instância com `error` ou HTTP com `status`); resetado no retry.
- Backend: `client.go` ganhou `IsSocketConnected()`; o watchdog de 30s em `manager.go` agora diferencia "conexão aberta sem dados do QR (protocolo)" de "conexão encerrada (DNS/TLS/proxy/egress)".
- Gates verdes: type-check, lint (1 aviso pré-existente), Vitest 2/2, Go build/vet/test completos.
- Próxima ação (maestro): revisar e autorizar push; depois redeploy do stack no Portainer forçando pull de `ghcr.io/fluowai/woomobzy-whatsapp:latest` e validar o QR real com as novas mensagens de diagnóstico.

## 2026-08-02 — Auditoria de tipografia e cores

- Relatório criado em `DEV/RELATORIO_TIPOGRAFIA_CORES_2026-08-02.md`.
- Principais prioridades: corrigir contraste de `.btn-accent` e botões verdes, elevar contraste de textos auxiliares, unificar o painel em Plus Jakarta Sans e migrar cores diretas para tokens semânticos.
- A auditoria não alterou a interface; implementação e validação visual autenticada continuam pendentes de aprovação do maestro.

## 2026-08-02 — Reconstrução visual das novas telas WooTech Imob

- As referências do ZIP foram incorporadas às rotas existentes, preservando serviços, formulários, permissões e dados reais.
- Novo sistema visual compartilhado: `views/wootech-reference.css`, importado por `index.css`; os componentes alvo usam a classe `wootech-reference-screen`.
- Destaques: pipeline comercial com KPIs e ações; Matchmaking 360 com métricas de IA; metas rurais com progresso; BI Rural e configurações com cabeçalhos operacionais; aparência do site com preview responsivo.
- As alterações locais da central de mensagens pertencentes a outro fluxo de trabalho foram preservadas.
- Gates verdes: type-check, lint sem erros, 127 testes e build.
- Próximo passo: validar visualmente as rotas autenticadas em desktop/mobile, revisar o conjunto e só então decidir commit/push/deploy.

## 2026-08-02 — QR do WhatsApp não chegava ao frontend

- Evidência de produção: o bundle do frontend já contém o timeout de 30 segundos, mas a instância `b0e96d10-...` terminou `disconnected` sem `qr_code`; portanto, o frontend não recebeu conteúdo para renderizar.
- O CI publicou frontend e `whatsapp-service` para `7129a6f`, porém o job `deploy-portainer` foi ignorado porque a branch não era `main`; um update manual da stack precisa forçar o pull da imagem `latest`.
- Correção preparada: WhatsMeow atualizado de `20260630-b572e5b` para `20260730-662ad1d`, incluindo as atualizações oficiais recentes de protocolo e pareamento.
- `/health` do `whatsapp-service` agora expõe `whatsmeow_version`, e o proxy Node repassa a versão em `/api/whatsapp/health`; isso permite confirmar o binário realmente implantado sem revelar credenciais.
- Pendente: revisão e autorização do maestro para commit/push; depois, redeploy forçando pull de `ghcr.io/fluowai/woomobzy-whatsapp:latest` e validação do QR real.

## 2026-08-01 — WhatsApp QR sem loop infinito (frontend + WhatsMeow)

- Causa: o modal tratava `connecting`/`qr_pending` como espera ilimitada; uma conexão Go sem evento do canal QR deixava o usuário preso no spinner.
- Mudanças: timeout de 30s e retry no `views/WhatsApp/QRCodeModal.tsx`; watchdog equivalente em `whatsapp-service/internal/whatsapp/manager.go`, com reset para `disconnected` e evento de erro. Há proteção para QR válido e para clientes substituídos por uma reconexão.
- Testes novos: `tests/whatsapp-qr-timeout.test.ts` e `whatsapp-service/internal/whatsapp/manager_qr_test.go`.
- Gates verdes: type-check, lint sem erros, 125 testes frontend, build Vite, testes Go e build do servidor.
- Próxima ação (maestro): revisar, fazer commit/push e redeploy do frontend + `whatsapp-service`; depois abrir a instância, confirmar QR em poucos segundos e verificar que uma falha deixa o spinner em até 30s com botão de nova tentativa.
- Nenhum commit, push ou deploy foi executado.

## 2026-08-01 — WhatsApp: fix do 404 de QR para instância removida (frontend)

- Diagnóstico: `GET /api/whatsapp/instances/d8a5611e-c472-4cc1-bd80-2574fffdfdc8/qrcode` → 404 no console. A instância não existe no banco (pg direto: ausente em `whatsapp_instances` em prod e dev). Proxy Node e rota Go íntegros; `/api/whatsapp/health` OK. O `QRCodeModal` engolia o 404 e polava para sempre.
- Correção: `views/WhatsApp/QRCodeModal.tsx` — 404 agora para o polling e mostra erro "Instância não encontrada. Ela pode ter sido removida ou o acesso expirou." + botão Fechar.
- Gates: type-check ✓, eslint ✓ (0 erros, 594 warnings pré-existentes).
- Próxima ação (maestro): commit + push → CI/Portainer para a correção valer em produção; ao reproduzir, confirmar que o modal para de logar 404 e mostra a mensagem.
- Atenção: não tocar em mudanças de outras sessões; não push sem conferir.

## 2026-08-01 — WhatsApp + estabilização dos testes E2E enviados

- A correção local do WhatsApp remove o provider WAHA do frontend e força `connect` antes de tentar obter novamente o QR Code; falhas de reconexão agora usam o logger central.
- Os três testes E2E novos foram reescritos com seletores semânticos, mock de textos públicos e espera explícita pelo bootstrap da aplicação. O fluxo `/register` valida corretamente o redirecionamento para `/onboarding` e o botão “Avançar”.
- `playwright-report/` e `test-results/` foram removidos do controle de versão e adicionados ao `.gitignore`.
- Gates: type-check, lint sem erros, 123 testes unitários, build e 32 testes E2E desktop/mobile aprovados; o teste de autenticação também passou 12/12 em repetição tripla.
- Risco restante: validação manual com uma instância real do WhatsApp ainda depende do serviço e de credenciais de ambiente.

## 2026-08-01 — Impersonação de revenda ia para /urban em vez de /superadmin

- Sintoma: ao clicar "Acessar Painel (Suporte)" numa revenda no mega admin, o usuário caía no painel/login da imobiliária urbana.
- Causa raiz: `getPanelHomePath` (`components/NicheRedirect.tsx`) — com `isImpersonating: true`, superadmin com organização definida era enviado a `/rural` ou `/urban` pelo niche, sem checar `is_reseller`.
- Correção: superadmin impersonando organização com `is_reseller === true` → `/superadmin`; clientes diretos (`is_reseller` false) seguem para `/rural`/`/urban`. Vale para ResellerManager, TenantManager e DirectClientsManager (todos redirecionam via `/admin` → NicheRedirect).
- Gates: type-check ✓, lint ✓ (0 erros).
- Próxima ação (maestro): validar no navegador — mega admin → Resellers → ícone de chave numa revenda → deve abrir o painel Super Admin da revenda (não a imobiliária urbana); conferir baner de impersonação e "sair do modo suporte".
- Atenção: working tree tem mudanças de outras sessões (instagram-worker, etc.) — não push.

## 2026-08-01 — WhatsApp QR nunca aparecia no frontend (fix frontend + backend)

- Sintoma: instância criada ficava em spinner sem QR (~40s) e sem erro, tanto em `connecting` quanto em `disconnected`.
- Corrigido em `views/WhatsApp/QRCodeModal.tsx` (BUG 1): o polling agora sempre consulta `getQRCode` (antes só em `qr_pending` — em `connecting`/`disconnected` o botão ficava preso em loading); 3 tentativas sem QR + sem conexão ativa → erro/retry ("QR Code não disponível..."); em `connected` fecha o modal em 1.8s.
- Corrigido em `whatsapp-service/internal/whatsapp/manager.go` (BUG 2): qualquer falha antes de `client.Connect()` (sqlstore/egress, device) chama `failConnect` → status `disconnected` + broadcast `instance_status` com a mensagem de erro; falha da goroutine de `client.Connect()` também emite broadcast.
- Gates: frontend type-check/lint/build ✓; backend `go build`/`go vet`/`go test` ✓ (validado em cópia ASCII em temp por causa do acento no path do Windows — `go` nativo corrompe o módulo path).
- Próxima ação (maestro): alinhar `whatsapp-service/.env` local com produção (Supabase `epgaftsjmqmpczvzsrcc`, MinIO `nb.consultio.com.br`); subir Go whatsapp-service (3100) + Node backend (3001/3002) + Vite (3006) e criar uma instância para validar o QR (~3s); conferir `/urban/whatsapp` e `/rural/whatsapp`. Depois, push/CI/Portainer como no precedente do Instagram.
- Atenção: não tocar em mudanças de outra sessão (`App.routes.tsx`, `HeroSearch.tsx`, `DEV/scripts/migrate_pamasimoveis.mjs`, WhatsAppDashboard); não push (branch `codex/main-whatsapp-media-hotfix` 2 commits à frente de origin).

## 2026-08-01 — Plano de deploy do Instagram Service (502 preparado para correção)

- Diagnóstico do 502 "Servico Instagram Indisponivel" em produção: o `instagram-service` nunca foi deployado (proxy do api → `http://instagram-service:3200` inalcançável no compose de produção).
- Preparado o full deploy no repo (sem commit ainda, branch `codex/main-whatsapp-media-hotfix`, que é buildada pelo CI):
  - Dockerfiles do instagram corrigidos (copiavam do contexto raiz errado);
  - proxy `/api/instagram` com suporte a WebSocket (`setupInstagramProxy(app, server)`);
  - CI builda `woomobzy-instagram-service` e `woomobzy-instagram-worker`;
  - `docker-compose.yml` com `redis`, `instagram-service`, `instagram-worker`, volumes e `INSTAGRAM_SERVICE_URL` no api;
  - `.env.production.template`/`.env.production` com `INSTAGRAM_INTERNAL_TOKEN`/`INSTAGRAM_ENCRYPTION_SECRET` gerados.
- Gates locais: `node --check` OK, `docker compose config` OK. Working tree sujo (change set desta sessão, sem commit/push).
- Próxima ação (maestro, produção): 1) atualizar o stack no Portainer com o novo `docker-compose.yml` e as env vars `INSTAGRAM_INTERNAL_TOKEN`/`INSTAGRAM_ENCRYPTION_SECRET`; 2) push → CI builda/pública as imagens e aciona o webhook de redeploy; 3) validar `GET /api/instagram/conversations` (200) e o WebSocket `/api/instagram/ws`; 4) conectar conta Instagram via QR e testar envio de DM.
- Atenção: `.env.production` tem segredos reais e é gitignored — não commitar; replicar os dois segredos novos apenas nos ambientes de deploy.

## 2026-08-01 — WhatsAppDashboard integrado + gates verdes

- Shell `WhatsAppDashboard.tsx` já reescrito (commit `99abe95`) com `ChatSidebar`/`ChatWindow`/`InstanceManager`/`QueuesManagerModal` via `useWhatsAppInbox`.
- Esta sessão: removido `setSelectedChatSafe` (não existia) → `clearSelectedChat()`; `onBack` do chat usa `clearSelectedChat`; destructure `chats` não usado removido. Lint da shell limpo.
- Desbloqueados gates que estavam quebrados desde `afc995c` (Mega Investimentos, não relacionado ao WhatsApp): `App.routes.tsx` importava `./views/sites/megainvestimentos/MegaTheme` (inexistente) → corrigido para `./src/views/...`; `HeroSearch.tsx` usava `Home` sem importar → adicionado ao lucide-react.
- Gates: type-check ✓, eslint ✓ (4 warnings exhaustive-deps pré-existentes no hook), build ✓ (2m22s), test ✓ (123 tests). Working tree limpo exceto DEV docs.
- Próxima ação: validar runtime — subir Go whatsapp-service (3100), Node backend (3001/3002) e Vite (3006); testar aba Mensagens em `/urban/whatsapp` e `/rural/whatsapp` com instância conectada.
- Atenção: não tocar em `DEV/scripts/migrate_pamasimoveis.mjs`; não push (branch 2 commits à frente de origin).

## 2026-08-01 — Kanban CRM com edição completa (cards e etapas)

- Causa raiz: `EditLeadModal` enviava `tags` como coluna de `leads` (inexistente) → PATCH rejeitado → modal travava em "Salvando..." e nunca abria.
- Correções commitadas (`99abe95`): PATCH `/leads/:id` sincroniza `lead_tags`; `EditLeadModal` com try/catch/toast; `LeadDetailsModal` com `onUpdateLead`; `handleRenameStage`/`handleDeleteStage`; `NewStageModal` com renomear inline + excluir. Fix de tipo `as Lead['status']` no delete de etapa.
- Gates: type-check ✓ (0 erros no Kanban), lint ✓ (0 erros), build ✓. Branch 2 commits à frente de origin.
- Próxima ação: validar no navegador `/urban` → CRM → kanban: abrir card → editar → salvar; criar/renomear/excluir etapa; conferir persistência de tags.
- Atenção: working tree tem mudanças de outra sessão (megainvestimentos, `App.routes.tsx`, `HeroSearch.tsx`, scripts, WhatsAppDashboard) — não tocar; não push antes de conferir.

## 2026-07-30 — Gap LegalContracts fechado (tabela contracts reparada)

- `contracts` em produção reparada: colunas `title`/`type`/`value`/`template_id`/`contract_type` + RLS por `organization_id` (antes RLS ativa sem policies) + trigger + index. Migration `20260730_fix_contracts_legal_tab.sql` aplicada 7/7 via `exec_sql`.
- `views/LegalContracts.tsx`: insert envia `contract_type` (NOT NULL). `scripts/run-migrations.mjs`: lista canônica atualizada (6 `20260730_*` + fix contracts + `20260731_ui_redesign_schema_additions.sql`).
- Verificado: RLS simulada como `authenticated` (transação revertida), verificação final `scratch/verify_20260730_final.mjs` OK, gates type-check/lint/build verdes.
- Change set pendente de commit: `migrations/20260730_fix_contracts_legal_tab.sql` (novo) + `views/LegalContracts.tsx` + `scripts/run-migrations.mjs` + `.gitignore` + docs DEV. Branch `codex/main-whatsapp-media-hotfix` está 2 commits à frente de origin.
- Próxima ação: (1) commit do change set; (2) decidir push; (3) validação visual opcional de `/urban/contracts` e `/urban/cobranca`; (4) rodar `20260731_ui_redesign_schema_additions.sql` completa (idempotente — parcialmente aplicada) ou arquivar como executada.

## 2026-07-30 — Análise de segurança concluída (relatório em security-reports/)

- Achados críticos: `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_JWT_SECRET` de produção expostos em arquivos rastreados + 212 leaks no histórico git; senha real em scripts de teste.
- Alta prioridade: webhook Asaas sem verificação; webhooks CVcrm/BIA sem auth; 16 vulns HIGH (npm); `exec_sql` SECURITY DEFINER a confirmar em produção.
- Próxima ação obrigatória: **rotacionar service role key + JWT secret + senha exposta**, remover segredos dos arquivos e purgar o histórico git (git filter-repo) antes de novos pushes. Relatório completo: `security-reports/RELATORIO_SEGURANCA_2026-07-30.md`.

## 2026-07-30 — Rural UX batch: ações rápidas, cadastro técnico e due diligence

- 5 views rurais alteradas: quick actions do dashboard navegam para rotas reais; CadastroTecnico ganhou modal de detalhes e exclusão real; DueDiligence ganhou upload de documento por item (20MB); DossieInteligente exige due diligence aprovada (riskScore >= 80) para a minuta; FinanceiroRural navega para `/rural/reports`.
- Gates: type-check/lint/build aprovados; commit realizado. Nenhum push/deploy.
- Próxima ação: validar no navegador com login em `/rural` (dashboard, cadastro técnico, due diligence, dossiê, financeiro).

## 2026-07-30 — Migrations 20260730\_\* aplicadas e verificadas

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
