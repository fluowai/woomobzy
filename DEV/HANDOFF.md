# Handoff

## 2026-08-11 — Agentes IA: tools faltantes implementadas + hidratação no chat

- **Solicitação (maestro)**: analisar a aba de Agentes de IA — campos de prompt, follow do prompt, uso de tools — e fazer funcionar.
- **Análise**: prompt ✅ (campo "Instruções operacionais" em `AgentForm.tsx:290`); prompt seguido ✅ (`buildAgentSystemPrompt` injeta `agent.instructions`); seleção de tools ✅ (15 options → `_ensureModel`); **mas 6 tools não tinham function declaration** e o chat route não hidrata o agente.
- **Fix (working tree, sem commit)**: `agentOrchestrator.js` — 3 novas function declarations (`notificar_corretor`, `criar_follow_up`, `criar_tarefa`) + mapeamento + implementação em `executeToolCall` + diretrizes atualizadas; `chat.routes.js` — `hydrateAgent` em POST `/agents/:id/chat` e `/agents/:id/simulate`.
- **Gates**: `node --check` ✓ (3 arquivos); `npm run type-check` ✓ (0 erros).
- **Pendente (maestro)**: deploy backend; validar tools (`notificar-corretor` → `lead_activities` + `lead_followups`) e swarm no chat test. Nenhum commit/push.
- Change set: `server/services/ai/agentOrchestrator.js`, `server/api/ai/chat.routes.js`.



## 2026-08-11 — Sites públicos OKA e Mega Investimentos com imóveis reais

- **Solicitação (maestro)**: `OkaPublicSite` e `MegaTheme` mostravam imóveis fictícios/hardcoded; deveriam exibir imóveis reais da organização.
- **Fix (working tree, sem commit)**:
  - `views/OkaPublicSite.tsx` — removidos imóveis hardcoded e cidades fixas; resolve org via `organizationId` prop ou `get_tenant_public('okaimoveis')`; busca `public_available_properties`; `cities`/`propertyTypes` derivados; loading no grid.
  - `src/views/sites/megainvestimentos/MegaTheme.tsx` — removido mock; `get_tenant_public('megainvestimentos')` + `public_available_properties`; `Intl` para preço.
- **Gates**: `npm run type-check` ✓.
- **Próxima ação (maestro)**: validar imóveis reais em `/site/okaimoveis` (ou domínio OKA) e `/megainvestimentos`; confirmar que a org OKA tem imóveis públicos com `show_on_site`.
## 2026-08-10 — Seleção de plano não persiste / checkout de assinatura 404 — prefixo duplicado corrigido

- **Solicitação (maestro)**: selecionar um plano (qualquer nível) não seta o `plan_id`/assinatura.
- **Causa raiz**: `server/api/subscription/index.js` montava `checkout/cancel/status/invoices` com prefixo duplicado (`use('/checkout', checkoutRoutes)` + rota `POST /checkout` no sub-router) → paths reais `/api/subscription/checkout/checkout`, `/api/subscription/status/status`, `/api/subscription/invoices/invoices`. O frontend chamava `/api/subscription/checkout` e `/api/subscription/invoices` (fetch cru, sem `Authorization`) → 404 → pagamento nunca concluía → plano ficava em `payment_required`.
- **Fix (working tree, sem commit)**:
  - `server/api/subscription/index.js` — sub-routers montados sem prefixo; webhook Asaas passa a ser `/api/subscription/webhook/asaas`.
  - `services/paymentService.ts` — `callApi` no lugar de `fetch` (injeta `Authorization`/impersonation/`x-tenant-domain`).
- **Gates**: rotas montadas verificadas por script ✓; `type-check` ✓; eslint ✓ (0 errors); vitest (guard + subscriptionSelection) ✓.
- **Atenção (maestro)**: se a URL do webhook Asaas estiver cadastrada no painel Asaas apontando para `/api/subscription/checkout/webhook/asaas`, atualizar para `/api/subscription/webhook/asaas`. Verificar também que a revenda/cliente tem `asaas_api_key` própria ou fallback `ASAAS_API_KEY` global para o checkout funcionar.
- **Próxima ação (maestro)**: subir server + app, selecionar plano em uma org e concluir checkout; validar `plan_id` + `subscription_status='active'` persistidos.

## 2026-08-10 — Rotas de sistema em domínio de site redirecionam para o platform_domain (genérico)

- **Solicitação (maestro)**: o site `inovebrokers.com.br` funciona, mas o sistema (login/painel) acessado no domínio do site ainda não redireciona para `app.inovebrokers.com.br`. Deve valer para tudo (qualquer revenda/cliente com `platform_domain`), inclusive novos clientes.
- **Diagnóstico**: `DomainRouter.tsx` branch custom `domain_type=site` renderizava `PublicLandingPage` para qualquer path; rotas de sistema no domínio do site não iam para o painel. RPC `get_tenant_by_any_domain` já devolve `platform_domain`.
- **Fix (working tree, sem commit)**:
  - `components/DomainRouter.tsx` — `PANEL_REDIRECT_ROUTES` (SYSTEM_ROUTES sem `/lp/`, `/site/`, `/sites/`, `/quiz/`); redirect `https://{platform_domain}{path}` quando path é rota de painel e `platform_domain` ≠ host; `initialSystemPath` agora exige host de plataforma (`initialIsSystemHost`).
  - Novos clientes: o mega-admin já grava `platform_domain` via `linkDomainToOrganization(purpose:'panel')`, então o redirect vale automaticamente.
- **Gates**: `npm run type-check` ✓; eslint `components/DomainRouter.tsx` ✓ (0 errors); `npm run build` ✓.
- **Próxima ação (maestro)**: deploy do frontend; validar `inovebrokers.com.br` → landing e `inovebrokers.com.br/login` → `app.inovebrokers.com.br/login`.

## 2026-08-10 — inovebrokers.com.br ainda servia "Em breve"/SPA em vez da landing Delazari — landing mapeada

- **Solicitação (maestro)**: `inovebrokers.com.br` não apontava para a landing da revenda Delazari.
- **Diagnóstico**: DNS A OK (207.58.153.219); HTTPS 200 servindo o SPA ("WooTech Imob"). No cliente, `DomainRouter` resolve o domínio via `get_tenant_by_any_domain` → org Delazari (`e2403fc5`, `is_reseller: true`, slug `"Delazari Imóveis "` com **espaço final**) → `PublicLandingPage forceSlug`. Mas a org **não tem `landing_pages` nem `site_settings`** → caía no `ComingSoon` ("Em breve"). A landing dedicada `RevendaDelazari` (rota `/delazari`) não estava mapeada no `PublicLandingPage`.
- **Fix (working tree, sem commit)**:
  - `views/PublicLandingPage.tsx` — import `RevendaDelazari` + `isDelazariSite` (custom_domain `inovebrokers.com.br`/`www.`; slug trim `delazari imóveis`/`delazari imoveis`; `activeSlug === 'delazari'`) → renderiza `<RevendaDelazari />` antes do bloco `ComingSoon`. Segue o padrão de `OkaPublicSite`/`FazendasBrasilPublicSite`.
- **Gates**: `npm run type-check` ✓; eslint nos 2 arquivos ✓ (0 errors, warnings pré-existentes); `npm run build` ✓.
- **Próxima ação (maestro)**: rebuild/deploy do frontend em produção (`inovebrokers.com.br` deve renderizar a `RevendaDelazari`). Observação: `get_reseller_branding`/slug com espaço — a landing agora ignora o slug e casa por `custom_domain`.

## 2026-08-10 — Superadmin de revenda ia para o painel Mega Admin em vez do Super Admin — corrigido

- **Solicitação (maestro)**: `suporte@alexandredelazari.com.br` (superadmin da revenda "Delazari Imóveis", org `e2403fc5-fabd-4715-a6e6-eae5d0603106`, `is_reseller: true`) ao acessar era direcionado para `/megaadmin` em vez de `/superadmin`.
- **Causa raiz**: `context/AuthContext.tsx:241` só anexava `organization` ao perfil quando **`role !== 'superadmin'`**. Para superadmins, `profile.organization` ficava `undefined` → `NicheRedirect.tsx:47` (`!profile.organization?.is_reseller`) → sempre `/megaadmin`; `MegaAdminGuard`/`MegaAdminLayout` (que checam `organization.is_reseller`) também falhavam na detecção. RLS já permitia a leitura (`is_superadmin()`), então era só o frontend.
- **Fix (working tree, sem commit)**: removida a exclusão de superadmin em `AuthContext.tsx:241` — a org agora é carregada para qualquer perfil com `organization_id` (superadmin incluído). Superadmins sem org (mega admin real `fluowai@gmail.com`, `organization_id: null`) continuam em `/megaadmin`; superadmin de revenda agora cai em `/superadmin`.
- **Verificação**: dados confirmados via service role (perfil superadmin + org `is_reseller: true`); `npm run type-check` ✓; eslint no arquivo ✓ (0 errors, 1 warning pré-existente `exhaustive-deps`).
- **Próxima ação (maestro)**: rebuild/deploy do frontend e login com `suporte@alexandredelazari.com.br` para validar o roteamento.

## 2026-08-10 — WhatsApp "no LID found" no envio: fix definitivo commitado (aguarda deploy em produção)

- **Solicitação (maestro)**: console de produção `POST /api/whatsapp/messages/:id/send` → **400** `O WhatsApp nao autorizou o envio para este numero neste momento (conta sem identificador LID valido)`.
- **Causa raiz**: whatsmeow exige **LID** para DM (`send.go:329-352`). `GetLIDForPN` no store vazio + `GetUserInfo` (usync **full**) não devolve LID para alguns números → `no LID found`. `IsOnWhatsApp` (usync **query**) devolve e **persiste** o mapeamento (`PutManyLIDMappings`), mas o warm-up só existia no `EnsureDirectChat` (criação de chat) — o envio não aquece.
- **Fix (commit `fb9f623`, push p/ `codex/main-whatsapp-media-hotfix`)**:
  1. `whatsapp-service/internal/whatsapp/media.go` — `Client.ResolveSendJID(ctx, chatJID)`: para JID `@s.whatsapp.net`, resolve LID via store; se ausente, chama `IsOnWhatsApp` (aquece) e retorna o **PN canônico**; grupos/LIDs inalterados. Aplicado em `SendTextMessage` e `SendMediaMessage`.
  2. `whatsapp-service/whatsapp-service.exe` rebuildado (commitado, ~48.2MB).
- **Gates**: `go build` ✓, `go vet` ✓, `go test ./...` ✓ (via cópia ASCII `Temp\opencode\wasvc-lidwarm`).
- **Próxima ação (maestro)**: **reimplantar o `whatsapp-service` em produção** (o erro é de prod; serviço não roda local nesta máquina) e validar envio para o número com LID ausente + contato normal.
- **Também nesta sessão**: fix de CI (commit `6bbd26b`, mock DNS em `licensing-admin-service.test.ts` — `npm test` 36 arquivos/256 ✓) e sync do working tree (commit `7b40813`). Arquivos com secrets (`stack-wootech-imob-prod-portainer.yml`) e temp scripts (`.tmp-*.mjs`) agora no `.gitignore`.

## 2026-08-09 — Wizard de Locação: auto-save 400 "Dados inválidos" corrigido (pronto para revisão)

- **Solicitação (maestro)**: console no `/urban/locacao/novo` com loop `PUT /api/locacao/leases/:id 400` + `Auto-save error: Dados inválidos` a cada 30s (`useLeaseWizard.ts:118`).
- **Causa raiz**: auto-save envia o `lease` inteiro com valores inválidos de rascunho — colunas `null` do banco, strings vazias (`tenant_email`/`tenant_phone`), `NaN`→`null` de `Number(e.target.value)` em inputs vazios (`StepCommercialTerms.tsx`), e `due_day: 0` (`Number('')`=0). O zod `.optional()` só aceita `undefined` → `400 Dados inválidos` em POST/PUT.
- **Fix aplicado (working tree, sem commit)**:
  1. `server/api/locacao/lease.routes.js` — `normalizeLeasePayload` (remove null/undefined/NaN/empty-string/`due_day===0`) antes do `safeParse`, em POST e PUT.
  2. `src/hooks/lease/useLeaseWizard.ts` — removido o `setInterval` interno de 30s que duplicava o auto-save do componente (`useAutoSave` em `LeaseWizard.tsx`).
- **Gates**: `node --check` ✓; teste node do normalizador ✓ (PASS); `npm run type-check` ✓; `npm run lint` ✓ (0 errors). Nenhum commit/push.
- **Próxima ação (maestro)**: reiniciar o backend para carregar o fix (porta 3006) e validar o wizard ao vivo (criar rascunho, deixar campos vazios, conferir que auto-save persiste sem erro). Observação: `tenant_phone` ainda exige `.min(10)` — um telefone parcialmente digitado ainda falha no auto-save (draft fica seguro no localStorage); se quiser, posso relaxar também.

## 2026-08-09 — Email Center: 400 em POST /api/email/accounts = credenciais inválidas no servidor de e-mail; fix de crash TLS aplicado

- **Diagnóstico (maestro)**: `POST /api/email/accounts` retorna 400 ao conectar `paulo@wootech.com.br` em `mail.wootech.com.br:587`. Reproduzido com as libs do servidor → **o servidor de e-mail rejeita o login** (IMAP `NO [AUTHENTICATIONFAILED]`, SMTP `535 Incorrect authentication data`) para `paulo@wootech.com.br` e `paulo`. Portas/certificado (993/587) corretos.
- **Fix aplicado** (`server/services/email/emailService.js`): handler de `'error'` no `ImapFlow` (`createImapClient`) + `testEmailConnection` fecha IMAP/SMTP em falha — elimina crash do processo quando o certificado não bate com o hostname (porta 143/STARTTLS). Gates: `node --check` ✓, eslint ✓.
- **Próxima ação (maestro)**: 1) **corrigir a senha da caixa** no cPanel/webmail (`https://mail.wootech.com.br`) ou confirmar que a senha digitada no app está exata — a atual é rejeitada pelo servidor; 2) reiniciar o backend (3002, `node --env-file=.env server/index.js`) para carregar o fix de robustez; 3) reconectar a conta no Email Center (IMAP 993 SSL / SMTP 587 STARTTLS). Nenhum commit/push.

## 2026-08-08 — WhatsApp "no LID found" RESOLVIDO: envio usa PN canônico do WhatsApp (teste real OK)

- **Solicitação (maestro)**: enviar "e ai Paulo tudo certo segue teste" para `5548988003260` → **ENTREGUE** (2 envios 200: message_id `3EB09BF38114B112669E49` e `3EB0B84C863BFF93427606`).
- **Causa raiz real (confirmada com log temporário)**: o WhatsApp conhece o contato como **PN canônico `554888003260@s.whatsapp.net` + LID `104565810663442@lid`** (mapeamento já existia em `whatsmeow_lid_map`). O chat era criado com o JID digitado `5548988003260@s.whatsapp.net` → envio não achava LID para esse PN (usync full retorna vazio) → "no LID found". Número digitado ≠ PN canônico.
- **Fix**: `EnsureDirectChat` (`whatsapp-service/internal/handlers/chats.go`) usa o **PN canônico retornado por `IsOnWhatsApp`** (`resp[0].PhoneNumber` quando `@s.whatsapp.net`) para criar chat/contato — digitar o número "errado" agora cria o chat com o PN correto. Mantidas: validação 422 `NUMBER_NOT_ON_WHATSAPP` / 503 `WHATSAPP_INSTANCE_OFFLINE` e o erro amigável 400 no envio.
- **Gates**: build ✓, `go test` handlers+whatsapp ✓ (vet rodou, sem erros reportados). REST: ensure número errado → chat com PN canônico 200; envio → 200; número inexistente → 422. Serviço no ar (`:3100`).
- **Próxima ação (maestro)**: confirmar no WhatsApp do Paulo se a mensagem chegou; validar no painel `/urban/whatsapp` (criar conversa digitando `5548988003260` → deve criar com `554888003260`); decidir commit/push. Nenhum commit/push.
- **Atenção**: working tree tem WIP de outras sessões (instance_repo.go/client.go diffs pré-existentes). Change set desta sessão = `chats.go`, `messages.go`, `main.go`, exe rebuildado + docs DEV.

## 2026-08-08 — WhatsApp "no LID found": validação de número no create-chat + erro amigável (pronto para revisão)

- **Solicitação (maestro)**: resolver o erro `no LID found for 5548988003260@s.whatsapp.net` ao enviar no inbox; escolhido **"Validar número ao criar conversa"**.
- **Causa raiz**: whatsmeow `send.go:344` exige LID para DM; `5548988003260` está registrado no WhatsApp (`IsOnWhatsApp` → `IsIn: true`) mas o WhatsApp **não expõe LID** para ele (usync full não traz; `whatsmeow_lid_map` sem mapeamento — 12.321 mapeamentos para outros contatos). Envio DM a esse número fica impossível no whatsmeow `v0.0.0-20260730092514-662ad1dc6900`. Não é bug do app.
- **Implementado (working tree, sem commit)**: `whatsapp-service/internal/handlers/chats.go` — `EnsureDirectChat` valida via `IsOnWhatsApp` antes de criar: **422** `NUMBER_NOT_ON_WHATSAPP` ("Este numero nao esta registrado no WhatsApp...") / **503** `WHATSAPP_INSTANCE_OFFLINE` ("Conecte a instancia do WhatsApp para validar o numero antes de criar a conversa."); helpers `isNumberOnWhatsApp` + `getConnectedClient` (aguarda conexão até 8s). `messages.go` — `friendlySendError` converte `no LID found`/`failed to get LID` → **400** amigável (antes 500 cru). `cmd/server/main.go` — `NewChatHandler(..., manager, ...)`. Frontend intacto (erros já chegam ao toast via `WhatsAppApiError`).
- **Gates**: Go build/vet/test ✓ (cópia ASCII em `Temp\opencode\wasvc-lidfix` por causa do acento no path); serviço no ar (`:3100` health OK). REST: número válido → 200; número inexistente → 422; envio ao `5548988003260` → 400 amigável.
- **Próxima ação (maestro)**: (1) testar envio para um contato **normal** (com LID) para confirmar que o sistema funciona e que o caso-limite é só desse número; (2) decidir se quer tentar remover esse contato e recadastrar; (3) commit/push quando aprovar. Nenhum commit/push.
- **Atenção**: working tree tem WIP de outras sessões (instance_repo.go/client.go têm diffs pré-existentes de sessão anterior, não tocados). Change set desta sessão = `chats.go`, `messages.go`, `main.go`, exe rebuildado + docs DEV.

## 2026-08-08 — DNO do Imóvel: Fases 1-3 + migration APLICADA em produção (verificação REST ✓)

- **Migration aplicada em produção** `epgaftsjmqmpczvzsrcc` via `exec_sql` → **9/9 OK** (roles → `'Proprietário'`, índice `idx_properties_owner_id`, view `public_available_properties` + GRANT anon/authenticated, DROP policy `"Public read available properties"`, REVOKE SELECT anon em `properties`).
- **Correção na migration**: RLS em view removido (Postgres não suporta); acesso via GRANT + projeção de vitrine + filtro de status. Arquivo idempotente (reexecução 9/9).
- **Verificação REST (anon)**: view sem `owner_id`/`owner_info` (400 column not found) ✓; vitrine 366 imóveis ✓; `properties` direto → 401 permission denied ✓.
- **Estado do código (working tree, sem commit)**: Fases 1-3 implementadas (ver entrada abaixo) — PropertyEditor com seção DNO + create-or-resolve, `services/properties.ts` grava `owner_id`, locação pré-preenche `owner_*` no `StepProperty`, aviso no `StepOwnerData`.
- **Próxima ação (maestro)**: (1) validar acesso autenticado (org vê seus imóveis, outra org não); (2) validar UI ponta a ponta (cadastro imóvel com DNO novo/existente, locação com prefill, contrato com `nome_locador` do DNO); (3) decidir commit/push. Nenhum commit/push.
- **Atenção**: outra sessão está editando em paralelo `StepContractGeneration.tsx`/`StepDigitalSignature.tsx` (WIP WooSign/PDF às 14:46–14:50) — o type-check falha só nesses arquivos deles; não mexi para evitar conflito. Working tree tem WIP de várias sessões — conferir `git status` antes de commit. Change set desta sessão = 1 migration (nova) + `run-migrations.mjs` + `services/properties.ts` + `types/property.ts` + `views/PropertyEditor.tsx` + `services/sites.ts` + `services/landingPages.ts` + `views/LandingPage.tsx` + `views/FazendasBrasilPublicSite.tsx` + `StepProperty.tsx` + `StepOwnerData.tsx` + docs DEV.

## 2026-08-08 — DNO do Imóvel: Fases 1-3 implementadas + hardening anti-vazamento público (pronto para aplicar migration + revisão)

- **Execução do plano** `DEV/SPECS/DNO_PROPRIETARIO_IMOVEL.md` (status → EM PROGRESSO).
- **Migration** `migrations/20260808_property_owner_dno.sql` (nova, na lista canônica de `scripts/run-migrations.mjs`): normaliza `clients.roles` para `'Proprietário'`, índice `idx_properties_owner_id`, e **hardening anti-vazamento**: view `public_available_properties` (colunas de vitrine; RLS: anon vê tudo, authenticated vê a org), GRANT anon+authenticated na view, **DROP da policy `"Public read available properties"`** e **REVOKE SELECT anon em `properties`**.
- **Consumidores públicos na view** (nenhum `.select('*')` em `properties` público restante): `services/sites.ts`, `services/landingPages.ts`, `views/LandingPage.tsx`, `views/FazendasBrasilPublicSite.tsx`. `OkaPublicSite` é array hardcoded (sem DB).
- **DNO no PropertyEditor** (`views/PropertyEditor.tsx`): seção "Dono do Imóvel (DNO)" com busca incremental em clients (`clientService.list`), vínculo/desvínculo, formulário de criação, create-or-resolve no `handleSave`; `services/properties.ts` grava `owner_id`.
- **Puxada automática na locação**: `StepProperty.tsx` pré-preenche `owner_*` ao selecionar imóvel (via `property.owner_id → clients`); `StepOwnerData.tsx` mostra aviso de dados carregados do CRM.
- **Gates**: type-check ✓, eslint arquivos alterados 0 erros ✓, build ✓ (~2m33s).
- **Próxima ação (maestro)**: (1) **aplicar a migration em dev/prod via `exec_sql`** — obrigatório junto com o código, senão os sites públicos quebram (policy anon dropada + REVOKE); (2) Fase 4: testes RLS anon/org (anon sem `owner_*` em `properties`, `clients` vazio p/ anon); (3) validar UI (cadastro com DNO novo e existente, locação ponta a ponta) e decidir commit/push. Nenhum commit/push.
- **Atenção**: working tree tem WIP de várias sessões (Agentes IA, ReportsCenter, WooSign em `StepDigitalSignature.tsx`) — conferir `git status` antes de commit. Change set desta sessão = 1 migration + `run-migrations.mjs` + `services/properties.ts` + `types/property.ts` + `views/PropertyEditor.tsx` + `services/sites.ts` + `services/landingPages.ts` + `views/LandingPage.tsx` + `views/FazendasBrasilPublicSite.tsx` + `StepProperty.tsx` + `StepOwnerData.tsx` + docs DEV.

## 2026-08-08 — Agentes IA: guardrails só com agente ativo, prompt grande e swarm com prompt compartilhado (pronto para revisão)

- **Solicitação (maestro)**: (1) mensagem de guardrail "No momento eu ajudo apenas com imoveis..." não deve aparecer sem agente ativo conectado; (2) campo grande para cadastrar o prompt na aba Agentes; (3) compartilhar o mesmo prompt com sub-agentes — sistema detecta a atividade e delega para o especialista relevante dentro da mesma conversa.
- **Implementado (working tree, sem commit)**:
  - `server/lib/AIAutomation.js` — guardrails só respondem com agente ativo (`skipped` sem reply quando `!agent`).
  - `components/agents/AgentForm.tsx` — prompt em largura total (`lg:col-span-2`, `min-h-72`, `resize-y`); toggle **"Compartilhar este prompt com sub-agentes"** na seção Swarm + lista de especialistas.
  - `views/AIAgents.tsx` + `services/aiAgents.ts` — campo `share_prompt_with_subagents` no state/default/load/save e na interface.
  - `server/api/ai/helpers.js` — `agent_type`, `sub_agents`, `share_prompt_with_subagents` persistidos em `handoff_rules.__operational360`.
  - `server/services/ai/agentOrchestrator.js` — refactor: `_runReActLoop` extraído; swarm dinâmico (`_loadSubAgents`, `_detectSpecialist` por score de keywords de role/capabilities/tools, `_delegateToSpecialist` com prompt compartilhado + histórico da mesma conversa).
- **Gates**: type-check ✓, eslint arquivos alterados 0 erros ✓, `node --check` (agentOrchestrator.js, helpers.js, AIAutomation.js) ✓, build ✓ (1m7s).
- **Próxima ação (maestro)**: validar no navegador — criar orquestrador com compartilhamento + especialistas conectados, testar chat acionando especialista na mesma conversa, e conferir que sem agente ativo não há resposta de guardrail. Depois decidir commit/push.
- **Atenção**: working tree tem WIP de várias sessões (ReportsCenter, StepProperty, docs). Change set desta sessão = 6 arquivos (`AIAutomation.js`, `agentOrchestrator.js`, `helpers.js`, `AgentForm.tsx`, `AIAgents.tsx`, `aiAgents.ts`) + docs DEV. Nenhum commit/push.

## 2026-08-08 — Aba Relatórios reescrita: central profissional com dados reais (pronto para revisão)

- **Solicitação (maestro)**: melhorar a aba Relatórios (`/urban/reports`, `/rural/reports`) — mais profissional, dados reais, diversos tipos.
- **Implementado (working tree, sem commit)**:
  - `views/ReportsCenter.tsx` (novo): abas **Visão Geral / Comercial / Leads & Funil / Corretores / Locação**, filtro de período (30d/90d/6m/1y/todo), KPIs, gráficos (área/barras/pizza), ranking de corretores e exportação **CSV (por relatório + completo) e Imprimir/PDF**.
  - `views/BIRural.tsx` / `views/BIUrbano.tsx` → wrappers de `<ReportsCenter mode>` (rotas/lazy intactos).
  - Dados reais via Supabase tenant: `properties`, `leads`, `profiles`, `lead_activities`, `rental_contracts`, com `.limit(100000)` (default 1000 truncava antes). Nicho por `isRuralProperty`/`isUrbanProperty` + `match_profile`.
- **Gates**: type-check ✓, lint 0 erros/0 warnings ✓, build ✓. Fix de gate pré-existente: import de `StepProperty.tsx` (`services/properties` raiz) — WIP de outra sessão, apenas caminho corrigido.
- **Próxima ação (maestro)**: validar `/urban/reports` e `/rural/reports` no navegador (abas, período, exportações) com login real; decidir commit/push. Nenhum commit/push.
- **Atenção**: working tree tem WIP de várias sessões — conferir `git status`; change set desta sessão = `views/ReportsCenter.tsx` (novo), `views/BIRural.tsx`, `views/BIUrbano.tsx`, `src/components/lease/steps/StepProperty.tsx` (1 linha), docs DEV.

## 2026-08-08 — RLS do módulo urban alinhada ao padrão CRM (fix do 403 no Simulador/Fintech) — APLICADO em produção

- **Sintoma**: superadmin impersonando org (`91b29fed` — Enzo Imoveis) → `POST /rest/v1/urban_financing_simulations` → **403** ao salvar simulação no `/urban/simulador` (e `/urban/fintech`).
- **Causa raiz (confirmada em `pg_policy`)**: tabelas do módulo urban com policy antiga `organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())` → com impersonação o frontend envia o org impersonado, mas `auth.uid()` real é o superadmin (outra org) → WITH CHECK bloqueia INSERT. Tabelas CRM (leads/properties) já usavam `get_my_org_id() OR is_superadmin()`.
- **Mudanças no working tree (sem commit)**: `migrations/20260808_fix_urban_module_rls_superadmin.sql` (novo, **aplicado em produção** via `exec_sql` 20/20 OK), `scripts/run-migrations.mjs` (lista canônica), docs DEV.
- **Verificação**: `pg_policy` direto — 9/9 policies do módulo urban com `is_superadmin()` em USING+WITH CHECK (urban_lots, key_control, condominiums, condominium_tickets, urban_documents, urban_portal_integrations, urban_portal_sync_logs, urban_financing_simulations, urban_property_favorites).
- **Próxima ação (maestro)**: validar no navegador `/urban/simulador` (Salvar simulação) e `/urban/fintech` em sessão impersonada (Enzo Imoveis); depois decidir commit/push.
- **Nota WhatsApp**: erro `no LID found for 5548988003260@s.whatsapp.net` é do whatsmeow (número não é usuário WhatsApp válido ou LID não sincronizado) — **não** é bug de código; sem mudança.
- **Atenção**: working tree tem WIP de várias sessões — conferir `git status` antes de commit; change set desta sessão = 1 migration + `run-migrations.mjs` + docs DEV.

## 2026-08-07 — WhatsApp Inbox: constraints UNIQUE aplicadas em produção (nenhuma mensagem aparecia)

- **Sintoma**: instância conectada + realtime WS OK, mas o inbox não exibia mensagens novas.
- **Causa raiz (confirmada no banco)**: `whatsapp_chats`/`whatsapp_contacts`/`whatsapp_messages` sem constraints UNIQUE → upserts `ON CONFLICT` falhavam com SQLSTATE 42P10 → `handleMessage` (`whatsapp-service/internal/whatsapp/client.go:724`) abortava antes de salvar e emitir `new_message` (evidência em `whatsapp-service/run_stderr.txt`). A migração `20260531_align_whatsapp_schema.sql` (linhas ~163 e ~337) nunca foi aplicada integralmente em produção.
- **Mudanças**: `migrations/20260807_add_whatsapp_upsert_constraints.sql` (novo) — dedup defensivo + 3 UNIQUE constraints idempotentes (`chats(instance_id,chat_jid)`, `contacts(instance_id,phone)`, `messages(instance_id,message_id)`). **Aplicado em produção** via conexão direta em transação → OK. Verificado: `pg_constraint` 3/3 + teste transacional (ROLLBACK) dos upserts sem 42P10.
- **Nenhuma mudança de código/rebuild** — o `whatsapp-service.exe` em execução (PID 19956) foi buildado de `C:/Users/paulo/AppData/Local/Temp/opencode/wasvc-copy/` e pode continuar rodando.
- **Próxima ação (maestro)**: enviar/receber uma mensagem de teste na instância conectada e conferir que aparece no inbox em tempo real; depois conferir `run_stderr.txt` sem novos 42P10. Se aparecer, fechar o ticket.
- **Atenção**: working tree tem WIP de várias sessões (refactor de remoção do Instagram sem commit) — conferir `git status`; change set desta sessão = 1 migration + docs DEV. Nenhum commit/push.

## 2026-08-07 — RPC `match_properties_to_lead` corrigida (400 na aba Matches) e APLICADA em produção

- **Sintoma**: `match_properties_to_lead` → **400** no LeadDetailsModal. Causas: função referenciando colunas inexistentes (`p.bedrooms`, `p.area`) e contrato de saída divergente (`id`/`match_score` vs `property_id`/`score`/`reasons`).
- **Mudanças no working tree (sem commit)**: `migrations/20260807_fix_match_properties_to_lead.sql` (nova, aplicada em produção), `migrations/20260729_create_match_properties_to_lead.sql` (definição canônica corrigida), `scripts/run-migrations.mjs` (lista canônica).
- **Aplicado em produção** (`epgaftsjmqmpczvzsrcc`) via conexão direta: DROP + CREATE + GRANT + `NOTIFY pgrst, 'reload schema'` → OK. Verificado por SQL com lead real (1 linha, `property_id/score/reasons` corretos).
- **Gates**: `npm run type-check` ✓.
- **Próxima ação (maestro)**: abrir um lead no CRM → aba **Matches** → conferir lista de imóveis com `% Match` e razões; se vazia, verificar se o `organization_id` do lead tem imóveis (dados de teste têm poucos imóveis por org).
- **Atenção**: working tree tem WIP de outras sessões — conferir `git status` antes de qualquer commit; este change set = 3 arquivos de migration/script + docs DEV. Nenhum commit/push.

## 2026-08-07 — Fix do 502 "Servico Instagram Indisponivel" na aba Mensagens (local)

- **Sintoma**: WhatsApp conectado, `/urban/whatsapp` logava `GET /api/instagram/conversations` → 502.
- **Causas**: backend (3002) com env velho (`instagram-service:3200` não resolve local) + proxy `/api/instagram` sem `pathRewrite` (Express cortava o prefixo → `/conversations` no serviço que espera `/api/instagram/conversations`).
- **Correção**: backend reiniciado com `.env` atual (agora escuta 3002, PID 6704); `server/api/instagram/index.js` ganhou `pathRewrite: rewriteInstagramPath` (preserva `/api/instagram`, mantém `/api/instagram/ws`). Vite (3006) reiniciado.
- **Verificação**: `GET 3002` e `GET 3006` `/api/instagram/conversations` → **401** (rota certa, requer token) em vez de 502/404.
- **Próxima ação (maestro)**: recarregar `/urban/whatsapp` autenticado e confirmar `200` + aba Mensagens com conversas do Instagram; em produção, incluir este fix no próximo deploy do `api` (junto ao deploy do `instagram-service`).
- **Atenção**: working tree tem WIP de outras sessões; mudança desta sessão = só `server/api/instagram/index.js` (+ docs DEV). Nenhum commit/push.

## 2026-08-07 — "Em breve" personalizado por revenda: RPC aplicada em produção + frontend pronto

- **RPC `get_reseller_branding` APLICADA em produção** (`epgaftsjmqmpczvzsrcc`) via `exec_sql`: 5/5 OK. Verificada via REST anon: `lalbero` → Delazari (cores `#064e3b`/`#d4af37`, logo null); `okaimoveis` → vazio (padrão WooTech Imob).
- **Mudanças no working tree (sem commit)**: `migrations/20260807_reseller_branding_rpc.sql` (novo), `scripts/run-migrations.mjs` (lista canônica), `components/ComingSoon.tsx` (prop `resellerBranding`), `views/PublicLandingPage.tsx` (carrega RPC).
- **Gates**: type-check ✓, eslint 0 erros ✓. **Build bloqueado por WIP de outra sessão** em `components/RuralLayout.tsx` (`isWorkspaceRoute` duplicada nas linhas 61/156) — arquivo não tocado nesta tarefa.
- **Pendente (maestro)**: validar visualmente um cliente de revenda (ex.: `imob.wootech.com.br/lalbero` → logo/cores/nome Delazari na página "Em breve") e um cliente direto; configurar logo da Delazari (`logo_url` null hoje); revisar contraste do botão com cores claras.
- **Atenção**: working tree tem WIP de várias sessões — conferir `git status`; não misturar este change set com outros no commit.

## 2026-08-07 — QR Code do WhatsApp ocultado do DevTools (F12)

- **Sintoma**: ao abrir o F12, o token cru do QR de pareamento aparecia como texto no DOM (SVG) e nas respostas de instâncias.
- **Correção** (working tree, sem commit): `QRCodeModal.tsx` renderiza em `<canvas>` (sem texto legível no DOM); listagem de instâncias (`server/api/whatsapp/index.js`) e serialização Go (`models.Instance.QRCode` → `json:"-"`) não devolvem mais o `qr_code`. Fluxo de pareamento ativo (`/qrcode` + WS `qr_code`) mantido.
- **Verificado**: type-check, eslint (1 warning pré-existente), 254 testes vitest, `node --check`, Go build/vet/test via cópia ASCII em temp.
- **Próxima ação (maestro)**: validar o QR no navegador (continuar escaneando) e decidir se quer renderizar o QR como imagem no servidor para esconder também da aba Network. Nenhum commit/push.

## 2026-08-07 — UserManagement 400: migration aplicada e verificada em produção

- **Sintoma**: `/urban/settings` → `profiles?id=eq.<uuid>` 400 + `[ERROR] Error updating user` (aprovar/rejeitar/desativar/mudar role em Gestão de Usuários).
- **Causa raiz**: coluna `approved` não existia em `profiles` (PATCH → 400); e a policy `"Profiles isolation"` (FOR ALL sem WITH CHECK) permitia escalada de role por qualquer membro da org.
- **Aplicado em produção** (`epgaftsjmqmpczvzsrcc`) via `exec_sql`: `migrations/20260807_fix_admin_approved_column_rls.sql` **7/7 statements OK** — coluna `approved` (backfill true), helper `is_org_admin()`, policy `"Admins can update profiles in their organization"`, e hardening da `"Profiles isolation"` (WITH CHECK: role privilegiado só por admin/superadmin).
- **Verificado (pg + simulação RLS revertida)**: 19/19 perfis `approved=true`; admin atualiza `approved`/role/nome de usuário da org OK; escalada para `superadmin` BLOQUEADA; promoção broker→admin OK.
- **Pendente (maestro)**: validação visual em `/urban/settings` → usuários (aprovar pendente, mudar role, desativar) e decisão de commit/push. Migration já está na lista canônica de `scripts/run-migrations.mjs`. Nenhum commit/push executado.

## 2026-08-06 — Domínios InoveBrokers: causa raiz encontrada + correção no repo — falta redeploy no Portainer

- **Sintoma**: `inovebrokers.com.br` e `app.inovebrokers.com.br` davam **erro SSL** (`CN=TRAEFIK DEFAULT CERT`, self-signed) e **404** em vez do sistema. DNS A OK nos 2 (207.58.153.219).
- **Causa raiz 1**: a stack de produção (`stack-wootech-imob-prod.yml`) estava com a API em `e7d546b` (30/07), **108 commits antes** do `5cf09e7` (05/08) que migrou `server/domainService.js` para **provisionamento Docker nativo** (cria container `imobzy_route_<dominio>` com labels Traefik). O Traefik real do VPS **não usa file provider** (swarm+docker only) → os `traefik/dynamic/*.yml` (incl. coming-soon) são **inertes** em produção.
- **Causa raiz 2**: a RPC `get_tenant_by_any_domain` (usada por `DomainRouter.tsx:175`) **não existia em produção** — era arquivo solto fora da lista canônica de migrations.
- **Feito na sessão**: (1) RPC aplicada em produção via `exec_sql` (2/2 OK) e verificada via REST anon (`site`/`platform`, org Delazari `e2403fc5`); (2) `scripts/run-migrations.mjs` ganhou a RPC na lista canônica; (3) `stack-wootech-imob-prod.yml` imagem da API → alias CI `5daaa4a05b3d9f85556d4c41b1d23b655e44bfa7` (build `b79058d`, já publicado — último run do workflow "Docker Images" = success). Docs DEV atualizados (`WORKLOG`, `VERIFY`, esta spec).
- **Commit/push**: NÃO executado ainda — só os 2 arquivos do fix (`scripts/run-migrations.mjs` + `stack-wootech-imob-prod.yml`) devem ir; **não** misturar com WIP de outras sessões (RabbitMQ etc.). Confirmar `git status` antes.
- **Próxima ação (maestro, VPS/Portainer)**: redeploy da stack `wootech-imob-prod` com a imagem nova (alias/latest) e `docker.sock` montado no `api` → no boot `syncRegisteredDockerDomains` provisiona os routers → Let's Encrypt. Verificar `curl -I https://inovebrokers.com.br` / `https://app.inovebrokers.com.br` = 200 + cert, e login carregando a org Delazari.
- **Segurança**: token GitHub usado nesta sessão deve ser **rotacionado** após o push.
- Spec: `DEV/SPECS/INOVEBROKERS_SSL_COMING_SOON.md` (substituída — nova abordagem documentada no topo).

## 2026-08-05 — Onboarding Rapido + WhatsApp QR no onboarding (Wave 1 do roadmap)

- **Fluxo novo** (`views/Onboarding.tsx`): 3 passos — (1) Conta (nome/email/senha/agência/nicho/tema) → `POST /api/onboarding` + **auto-login** (`supabase.auth.signInWithPassword` + `setActiveOrganizationId`); (2) WhatsApp → `instanceApi.create('WhatsApp')` + **`QRCodeModal` real** reutilizado (polling/WS), com "Pular por enquanto" e fallback "Continuar sem conectar" se o serviço estiver indisponível; (3) Concluído → "Acessar Meu Painel" (`/urban` ou `/rural`).
- **Removido** do fluxo: passos opcionais de IA e Equipe (ficam para o painel pós-onboarding).
- **Sem mudança no backend** (`server/routes/onboarding.js` já cria usuário + org auto-aprovado).
- **Gates**: `npm run type-check` OK, `eslint views/Onboarding.tsx` OK.
- **Próxima ação (maestro)**: revisar o fluxo em navegador (criar conta com auto-login → QR do WhatsApp conectar). **Wave 2 (Valida)** é o **domínio personalizado obrigatório** no onboarding — base já existe (`server/routes/domains.js`, RPC `get_tenant_by_any_domain`, `DomainRouter`); falta capturar/validar/provisionar no fluxo.
- Spec: `DEV/SPECS/ONBOARDING_FAST_QR.md`. Nenhum commit/deploy. Conferir `git status` (working tree tem WIP de outras sessões).

## 2026-08-05 — MinIO dentro da stack: REUTILIZA data dir existente (preserva objetos) — pronto para subir no Portainer

- **Decisão (maestro)**: **reutilizar o diretório de dados do MinIO atual** para preservar os objetos existentes (imagens Pamas `imobfluow/*`, mídias WhatsApp, etc.). Backend (api + whatsapp-service) passa a usar o **endpoint interno `http://minio:9000`**; rota pública `s.wootech.com.br` via labels Traefik `minio_nb` (`Host(`s.wootech.com.br`) → port 9000`).
- **Causa raiz da 404 nas imagens** (`https://s.wootech.com.br/imobfluow/pamas/...`): o host está servindo o app/Traefik, **não** o MinIO — o router `minio_nb` não chega a aplicar no VPS (stack minio separada). 333 imóveis Pamas já com URLs normalizadas para `s.wootech.com.br/imobfluow/*`, bucket `imobfluow`.
- **Change set (sem commit)**: apenas `portainer-stack-wootech-public.yml` reescrito (YAML validado via js-yaml):
  - serviço `minio`: image `minio/minio:latest`, **bind mount `${MINIO_DATA_DIR}:/data`** (data dir EXISTENTE), healthcheck `curl .../minio/health/live`, labels router `minio_nb` `Host(`${MINIO_PUBLIC_HOST:-s.wootech.com.br}")`.
  - serviço **`minio-init`** (one-shot `minio/mc`, retry até 120s): cria buckets `imobfluow/imobzycrm/imobzywhatsapp/imobzy-media/imobzy-documents/imobzy-exports/imobzy-backups/imobzy-contracts`, `anonymous set download` nos públicos, policy `imobzy-rw` (s3:_ em `imobzy_`+`imobfluow`), user do app. **Imperativo: usar as MESMAS root creds com que o data dir foi inicializado** (senão `mc` falha).
  - api/whasapp-service com `MINIO_ENDPOINT=http://minio:9000`, `MINIO_PUBLIC_URL=${MINIO_PUBLIC_URL:-https://s.wootech.com.br}`, `MINIO_MEDIA_BUCKET=${MINIO_MEDIA_BUCKET:-imobfluow}` (default agora `imobfluow`, alinhado às imagens do banco).
  - Buckets/usuário do app provisionados via `minio-init` (não mais policy embutida hardcoded na filled-swarm).
- **Variables a preencher no Portainer (obrigatórias)**: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` (allow values do data dir atual), `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` (key do app), `MINIO_DATA_DIR` (caminho do data dir atual), `RABBITMQ_DEFAULT_PASS`. Opcionais: `MINIO_PUBLIC_URL`, `MINIO_PUBLIC_HOST`, `MINIO_MEDIA_BUCKET`. As Supabase/service-role keys foram mantidas iguais às da stack original no YAML.
- **Endpoint HTTP upgrade `.env.production`**: atual ainda aponta `MINIO_ENDPOINT=https://s.wootech.com.br` — na stack o env é sobrescrito p/ interno; não precisa editar `.env.production` (a stack manda).
- **Gates**: YAML parseado (js-yaml OK, 7 serviços, `minio` vol=bind mount, api endpoint interno. `docker`/`mc` indisponível no sandbox → `docker stack deploy` pendente no VPS/Portainer.
- **Próxima ação (maestro)**: 1) `docker stack rm minio` (libera router `minio_nb` + porta); 2) colar YAML no Portainer preenchendo o ambiente com as vars acima + as root creds REAIS do data dir atual; 3) verificar `http://minio:9000/minio/health/live`=200, buckets listados, PUT autenticado `provider: minio`=200, `https://s.woote.com.br/minio/health/live`=200, e imagens `https://s.wootech.com.br/imobfluow/pamas/...`=200; 4) **rotacionar** root creds + key do app (segredos vistos no filled-swarm/report 30/07). Confirmar antes o DNS `s.wootech.com.br`.
- Rollback: restaurar stack anterior — como reusa o MESMO data dir, NÃO remover dados; apenas reverter o stack se um novo MinIO for necessário.
- Nenhum commit/push/deploy. Working tree tem WIP de outras sessões — conferir `git status` antes de commit/push.

## 2026-08-04 — Agenda multi-agenda: agendas por corretor + visita a imóveis (pronto para revisão)

- **Implementado no working tree** (sem commit): a aba Agenda agora é multi-agenda — cria múltiplas agendas, cada uma vinculada a um corretor, para agendar visitas a imóveis.
- Migration `migrations/20260804_create_agendas.sql` (tabela `agendas` + `agenda_id`/`property_id` em `lead_appointments` + RLS + índices) adicionada à lista canônica de `scripts/run-migrations.mjs`. **Não aplicada** — aplicar via `exec_sql` em dev/prod após autorização.
- Frontend: `views/CRM/Agenda/index.tsx` reescrita (CRUD de agendas, corretor responsável, seletor/cards, modal Novo Compromisso com Imóvel/Lead/Corretor); `views/CRM/KanbanBoard/LeadDetailsModal.tsx` com selects de Agenda e Imóvel no formulário de agendamento.
- Backend IA: `server/services/ai/agentOrchestrator.js` — `agendar_visita` aceita `agenda_id` e persiste `property_id`.
- Gates: type-check 0 erros, eslint 0 erros nos arquivos alterados, build 1m40s OK, vitest 36/254 OK, `node --check` do orchestrator OK.
- **Próxima ação (maestro)**: aplicar a migration `20260804_create_agendas.sql`; validar `/urban/agenda` e `/rural/agenda` (criar agenda → vincular corretor → agendar visita a imóvel → concluir/cancelar) e a aba Agendamentos do Kanban; decidir commit/push.
- **Atenção**: working tree tem WIP de outras sessões (woosign, licensing PR #66, Zya IA, scripts de verificação) — conferir `git status` antes de qualquer push; não commitar junto com este change set sem revisão.
- Nenhum commit/push/deploy executado.

## 2026-08-04 — CI PR #66 corrigido (testes de licenciamento) — pronto para revisão/commit

- **Fix aplicado no working tree** (sem commit): `server/lib/licensing/admin-service.js` — `bindDomainToLicenseViaSetupToken` chama `verifySetupToken(token, { now })` (honra `context.now`; antes usava relógio real e os testes passavam a falhar após `2026-07-28 + 7 dias`).
- **Já em HEAD** (`5d28053`): erros TS de `services/woosign/service.ts` corrigidos — type-check 0 erros (CI estava 8h atrás, rodou antes desse commit).
- **Lint limpo**: `components/SiteEditor/PropertySelectionPanel.tsx` sem warnings (unused `site` removido + `&quot;`). `DEV/scripts/migrate_pamasimoveis.mjs` não tocado (fora do lint do CI + aviso do HANDOFF anterior).
- Gates: licensing-admin 26/26 ✓, suíte completa 254/254 ✓, lint 0 erros ✓, type-check 0 erros ✓.
- **Próxima ação (maestro)**: revisar e commit do fix de 1 linha em `admin-service.js` (+ limpeza do PropertySelectionPanel), push em `codex/main-whatsapp-media-hotfix` → CI deve ficar verde. Depois: decisão do merge da PR #66 e continuar os passos do incidente 502 (commit do hotfix de imports, `campaign-dispatcher.js`).

## 2026-08-04 — INCIDENTE: API 502 total — hotfix pronto para commit/push (não foi commitado)

- **Sintoma**: `/api/public/texts` e `/api/mega/resellers` → 502; a API inteira 502 (`/api/system-status` em imob.wootech.com.br e imobfluow.consultio.com.br).
- **Causa raiz**: imagem `woomobzy-api` buildada de `codex/main-whatsapp-media-hotfix` (= `e38a32f`) não sobe — imports ESM quebrados commitados de manhã (Node não importa TS/diretórios; a imagem só copia `server/`).
- **Correções prontas no working tree** (sem commit):
  - `server/routes/woosign.js` deletado + mount removido de `server/routes/index.js` (importava o TS `../../services/woosign`).
  - `server/api/system-contracts/index.js`: imports para `../../middleware|lib/*` + supabase **lazy Proxy**.
  - `server/services/ai/agentGuardrails.js`: imports para `../../lib|utils/*`.
  - `server/api/contact.js`: import para `../services/emailService.js` (arquivo morto).
- **Verificação**: boot simulado do HEAD+fixes responde `/api/system-status` 200, `/api/public/texts` 200, `/api/mega/resellers` 401 sem token. Scanner de imports: HEAD tinha 8 quebrados → resta só `server/services/campaign-dispatcher.js` (import dinâmico em `server/api/campaigns/index.js`, **não bloqueia boot**; bug de runtime de campanha).
- **Próxima ação (maestro)**: 1) commit do hotfix (`server/routes/index.js`, delete `server/routes/woosign.js`, `server/api/system-contracts/index.js`, `server/services/ai/agentGuardrails.js`, `server/api/contact.js`); 2) push `codex/main-whatsapp-media-hotfix`; 3) CI builda `woomobzy-api`; 4) redeploy/Portainer (alias `5daaa4a05b3d9f85556d4c41b1d23b655e44bfa7`); 5) validar `/api/system-status`, `/api/public/texts`, `/api/mega/resellers` = 200. Follow-up: `campaign-dispatcher.js` (`getWhatsAppClient` não existe no repo).
- **Atenção**: outro agente/sessão está editando o mesmo working tree (`server/index.js` monta `server/api/woosign/index.js` untracked que importa o TS `services/woosign`; `App.routes.tsx`, `components/Layout.tsx`, `views/woosign/`). Não commitar esses arquivos junto com o hotfix; e se esse WIP de woosign for commitado antes do port do serviço para JS, a API volta a não subir.
- Nenhum commit/push/deploy foi executado.

## 2026-08-03 — MinIO produção: upload 503 corrigido (TLS + buckets + key provisionados)

- **Fix completo em produção**: (1) TLS `https://nb.consultio.com.br` → Let's Encrypt via labels `minio_nb` na stack minio (Traefik provider Swarm; file dynamic é inerte); (2) buckets `imobzycrm`, `imobzywhatsapp`, `imobzy-media`, `imobzy-documents`, `imobzy-exports`, `imobzy-backups` criados; (3) policy `imobzy-rw` (s3:\* nos 6 buckets) + user `8aHPnW4JQsRWhbKld9Yw` (a key que o app usa) criados via API console MinIO.
- Verificação: a key do app lista os 6 buckets e faz PUT/DELETE; assinatura SigV4 do `server/lib/minio-storage.js` (`uploadObject`) executada no container `api` com env de produção → PUT 200 em `imobzywhatsapp` e `imobzy-media`.
- Env do stack **não mudou** (`MINIO_WHATSAPP_BUCKET=imobzywhatsapp`); media usa fallback `imobzy-media` (criado).
- **Próxima ação (maestro)**: testar upload autenticado no app (WhatsApp media e imagem de imóvel) e confirmar 200 com `provider: minio`; rotacionar credenciais expostas no chat (root do MinIO `wootechadmin` e secret do stack).
- Nenhum commit/push/deploy. Working tree tem WIP de outras sessões — não tocar/push sem conferir.

## 2026-08-03 — Central de Licenciamento Wootech: Incremento 7 (enforcement) concluído

- **Incremento 7 (enforcement)**: `server/lib/licensing/enforcement.js` validado + `server/__tests__/licensing-enforcement.test.ts` (novo, 23 testes). Integrado em `verifyAuth` (`server/middleware/auth.js`) via helper `continueAfterTenant` nos 3 pontos de saída pós-resolução de tenant. Modo `off` (padrão) → fail-open total (produção inalterada); `soft`/`hard` via env. Control plane (superadmin sem impersonação) e perfis sem org são isentos; impersonação avalia a org alvo. `.env.example` documentado.
- Gates: enforcement 23/23 ✓, licenciamento 99/99 (7 arquivos) ✓, type-check ✓, lint 0 erros ✓, suíte completa 220 passed (1 flaky pré-existente `subscriptionGuard` passa isolado; `hooks`/`App` passam isolados). Sem commit/push/deploy.
- **Próxima ação (maestro)**: (1) validar no navegador com `LICENSE_ENFORCEMENT=soft` + dev server — criar/revogar uma licença no Mega Admin e confirmar 403/`req.licenseState`; (2) decidir rollout do `hard` (e `LICENSE_ENFORCEMENT_LEGACY_TENANTS=on` antes). Validar telas Incrementos 5-6: `/megaadmin/licenses` e `/megaadmin/licenses/:id`.
- Nenhum commit/push/deploy. Working tree tem WIP de outras sessões — não tocar/push sem conferir.

## 2026-08-03 — Central de Licenciamento Wootech: Incrementos 5-6 concluídos

- **Incremento 5 (admin API)**: `server/api/mega-licenses/index.js` montado em `/api/mega/licenses` (protegido por `verifyMegaAdmin`) + `server/lib/licensing/admin-service.js` (CRUD, transições de status por allowlist, revoke de instalação, reissue de chave WOLK1, heartbeats, auditoria dupla). **18 testes verdes**.
- **Incremento 6 (frontend)**: views `views/megaadmin/Licenses.tsx` (listagem + criação + ações) e `views/megaadmin/LicenseDetail.tsx` (detalhe + 5 abas: Instalações/Domínios/Entitlements/Heartbeats/Auditoria com hash encadeado); rotas lazy `/megaadmin/licenses` e `/megaadmin/licenses/:id` em `App.routes.tsx`; item "Licenças" (`KeyRound`) no `MegaAdminLayout`.
- Gates: type-check ✓, lint 0 erros ✓ (599 warnings pré-existentes), testes admin 18/18 ✓. Suíte completa: 202 passaram; `src/test/subscriptionGuard.test.tsx` deu timeout na suíte mas **passa isolado** (flaky pré-existente sob carga — env setup ~446s).
- **Próxima ação (maestro)**: validar no navegador `/megaadmin/licenses` com login mega admin — criar licença, ativar/suspender/bloquear, reemitir chave, revogar instalação, conferir abas e auditoria.
- **Próximo incremento (7)**: enforcement — integração em `server/middleware/auth.js`/bootstrap, env vars (`LICENSE_SIGNING_PRIVATE_KEY`/`LICENSE_SIGNING_PUBLIC_KEY` no `.env.example`), docs DEV completas.
- Nenhum commit/push/deploy. Working tree tem WIP de outras sessões — não tocar/push sem conferir.

## 2026-08-03 — Hardening do escopo de revenda implementado (sintoma 1) — aguardando validação + decisão PR #66

- **Decisão de produto**: revenda vê **apenas filhos** (confirmado por `pg_policies` de produção — clientes diretos ficam fora). Implementado em `server/routes/admin.js`: helpers `resolveAdminOrgScope`/`isOrgWithinScope`/`areOrgsWithinScope`; GET refatorado (comportamento idêntico); fallback direct-DB filtra `parent_id`; POST cria sob a revenda (inclusive em impersonação); **PUT/DELETE/bulk-delete → 403 fora do escopo** (antes abertos).
- Gates: `node --check` ✓, eslint do arquivo ✓, Vitest server 102/102 ✓, `npm run type-check` ✓. `query_org_scope.tmp.mjs` removido.
- **Próxima ação (maestro)**: validar com sessão da revenda Delazari — lista só filhos, editar/excluir org fora do grupo = 403, criar org = fica sob a revenda. E **decidir o merge da PR #66** (fix `214595a` só existe nela; próximo push no `main` reverte o fix em produção via deploy automático).
- Para o sintoma 2 restante (impersonação→redirect): testar em **aba anônima/Ctrl+F5** (cache PWA/`index.html`) e checar `logger` + `sessionStorage['imobzy_impersonation_session']` (TTL 15 min, relógio do usuário).
- Nenhum commit/push/deploy. Working tree tem WIP de outras sessões — não tocar/push sem conferir.

## 2026-08-03 — Produção revenda Delazari: fix confirmado no ar (PR #66), risco de reversão no próximo push do main

- Relatório: `DEV/RELATORIO_REVENDA_DELAZARI_2026-08-03.md` (seções 1-4 = análise estática; **seção 5 = verificação de produção**).
- **Fix `214595a` está em produção** (bundle `index-D0eZEUaE.js` com `is_reseller`/`getPanelHomePath`). A hipótese "produção sem o fix" está descartada.
- **`main` não tem o fix**: `214595a` só existe na branch `codex/main-whatsapp-media-hotfix` = **PR #66 (aberta)**; `compare` API confirma (main diverged/behind 68; head do build c3e927cae3 contém o fix, behind 0). Último deploy automático (30/07, `e7d546b`) é anterior ao fix → produção recebeu o fix por **redeploy manual da stack** (uptime da API ≈ 02/08 21:25Z, logo após push da branch).
- **Risco alto**: próximo push no `main` → CI builda do main (sem `is_reseller`) → `deploy-portainer` automático **reverte o fix em produção**. Ação recomendada: **mergear PR #66** no main.
- Sintoma 2 restante: se o usuário ainda relata falha, testar em **aba anônima/Ctrl+F5** (cache PWA/`index.html`) e checar `logger` (target `NicheRedirect`, `isImpersonating`, `sessionStorage['imobzy_impersonation_session']`, TTL 15 min, relógio do usuário).
- Sintoma 1 segue em aberto (decisão de produto): revenda ver só filhos vs. também clientes diretos (`admin.js:663-693` + RLS).
- Nenhum commit/push/deploy. Working tree tem WIP de outras sessões — não tocar/push sem conferir.

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
