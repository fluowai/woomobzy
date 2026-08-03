# DEV WORKLOG — Imobzy

## [2026-08-03] InoveBrokers — SSL + página "Em breve" (inovebrokers.com.br / app.inovebrokers.com.br)

- Entregáveis criados (planejados, sem deploy): `coming-soon/index.html` (página única "Em breve — um sistema será instalado aqui", sem dependências externas), `Dockerfile.coming-soon` (nginx estática), `traefik/dynamic/inovebrokers_com_br.yml` (router `Host(inovebrokers.com.br) || Host(app.inovebrokers.com.br)` → `websecure` + `certResolver letsencryptresolver` → service `inovebrokers_coming_soon@file` → `http://coming-soon:80`; cert único com os 2 SANs no acme.json), service `coming-soon` no `docker-compose.yml` (rede externa `wootech1`) e entrada de build no CI (`ghcr.io/fluowai/inovebrokers-coming-soon`).
- Plano/guia completo: `DEV/SPECS/INOVEBROKERS_SSL_COMING_SOON.md` (DNS A → 207.58.153.219, deploy Portainer + cópia do dynamic para o volume `imobzy_traefik_dynamic`, verificação e rollback).
- Validação local: YAML válido (js-yaml) em `docker-compose.yml` e no dynamic do Traefik. Docker não disponível nesta máquina Windows → `docker compose config` não rodou.
- Pendente (maestro): criar registros DNS A, push/branch → CI builda imagem, atualizar a stack no Portainer com o service `coming-soon`, copiar o dynamic para o volume do Traefik e validar HTTPS nas duas URLs. Nenhum commit/push/deploy foi executado.

## [2026-08-03] Central de Licenciamento Wootech — Incremento 7 (enforcement no acesso autenticado)

- **`server/lib/licensing/enforcement.js`** (criado na sessão anterior, validado agora): `resolveEnforcementMode`/`resolveLegacyTenantsFlag`, `resolveOrgLicense` (cache TTL 60s via `TtlCache`), `clearLicenseEnforcementCache`, `isEnforcementExempt`, `buildEnforcementDecision`, `auditDecision` (throttle por org+estado; `license_audit_events` com hash encadeado quando há licença, `audit_logs` quando não), `enforceLicenseAccess` (middleware fail-open; injeta `req.licenseState`; 403 com código+dados da licença quando bloqueia) e `clearEnforcementAuditThrottle`.
- **Ajuste de contrato**: no_license em modo `hard`+`legacy_tenant` agora retorna `degraded: true` (escape pré-rollout sinaliza banner), alinhado à spec (teste 10).
- **`server/__tests__/licensing-enforcement.test.ts`** (novo): mock Supabase próprio (licenses + license_audit_events + audit_logs + contadores de query). **23 testes verdes** cobrindo os 10 casos da spec + suspended, expirado hard, valid, control plane/reseller/sem-org isentos, impersonação pela org alvo, erro de banco fail-open, cache e invalidação, e parsing de env.
- **Integração em `verifyAuth`** (`server/middleware/auth.js`): helper `continueAfterTenant` aplica `enforceLicenseAccess()` nos 3 pontos de saída pós-resolução de tenant (auto-link de org, fallback de org, e `next()` final). Modo `off` (padrão) → não bloqueia nada; control plane (superadmin sem impersonação) é isento; impersonação avalia a org alvo (`req.orgId`).
- **`.env.example`**: seção "Licenciamento Wootech" com `LICENSE_ENFORCEMENT` (off/soft/hard), `LICENSE_ENFORCEMENT_LEGACY_TENANTS` e chaves `LICENSE_SIGNING_PRIVATE_KEY`/`LICENSE_SIGNING_PUBLIC_KEY`.
- Gates: `node --check` ✓ (auth.js/enforcement.js), enforcement 23/23 ✓, suíte de licenciamento 7 arquivos/99 testes ✓, type-check ✓, lint 0 erros nos arquivos alterados ✓, suíte completa vitest 220 passed / 1 flaky pré-existente (`subscriptionGuard` — passa isolado) / 2 worker-startups (hooks/App — passam isolados). Sem commit/push/deploy.

## [2026-08-03] Central de Licenciamento Wootech — Incrementos 5-6 (admin API + telas Mega Admin)

- **Incremento 5 (API admin de licenças) concluído**:
  - `server/lib/licensing/admin-service.js` (novo): `LicenseAdminError`, `listLicenses` (filtros status/edition/org/search + paginação + enriquecimento org/plano/instalações/heartbeat), `getLicenseDetail` (license + organization + plan + installations + domains + entitlements + heartbeats + auditEvents), `createLicense` (draft com chave temporária → update com chave final assinada; entitlements semeados de `plans.features`/`plans.limits`), `updateLicense` (whitelist), `setLicenseStatus` (allowlist `STATUS_TRANSITIONS`; revoke/block cascateiam para `license_installations`; unblock→active), `revokeInstallation`, `reissueLicenseKey` (novo token WOLK1 + evento `license.key_reissued`), `listHeartbeats`, `listAuditEvents`; auditoria dupla (`license_audit_events` com hash encadeado + `audit_logs` global).
  - `server/lib/licensing/installation-service.js`: `appendAuditEvent` exportado para reuso.
  - `server/api/mega-licenses/index.js` (novo): Router com `verifyMegaAdmin` por rota; `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `GET /:id/heartbeats`, `GET /:id/audit`, `POST /:id/reissue-key`, `POST /:id/installations/:installationId/revoke`, `POST /:id/activate|suspend|revoke|block|unblock`; `handleError` → `LicenseAdminError` tipado.
  - `server/routes/index.js`: monta `/api/mega/licenses` → `../api/mega-licenses/index.js`.
  - `server/__tests__/licensing-admin-service.test.ts` (novo): mock Supabase estendido (organizations, plans, audit_logs; `insert(...).select().single()`/`update(...).eq(...).select().single()`) — **18 testes verdes**.
- **Incremento 6 (telas frontend) concluído**:
  - `views/megaadmin/Licenses.tsx` (novo): listagem com busca (org/chave) + filtros status/edição, modal "Nova Licença" (org, edição, status, máx. instalações, tolerância, política de bloqueio, expiração, plano, metadata, copiar chave), ações por estado (ativar/suspender/revogar/bloquear/desbloquear), reemitir/copiar chave, link detalhe `/megaadmin/licenses/:id`.
  - `views/megaadmin/LicenseDetail.tsx` (novo): header (status/edição/policy/chave/org/plano), grid de metadados (máx instalações, expiração, tolerância, emitida/ativada, última validação, signing_key_id), ações por status + reemitir, e 5 abas locais (Instalações com revogar, Domínios, Entitlements, Heartbeats, Auditoria com severidade e hash encadeado + tooltip do previous_hash).
  - `App.routes.tsx`: lazy `Licenses`/`LicenseDetail` + rotas `licenses` e `licenses/:id` no bloco `/megaadmin`.
  - `views/megaadmin/MegaAdminLayout.tsx`: item de navegação "Licenças" (ícone `KeyRound`, `/megaadmin/licenses`).
- Gates: `node --check` ✓ (4 arquivos server), testes admin 18/18 ✓, type-check ✓ (sem output), lint 0 erros (599 warnings pré-existentes, nenhum nos arquivos alterados — grep confirmou). Suíte completa vitest: 202 passed / 1 falha de timeout (5s) em `src/test/subscriptionGuard.test.tsx` — pré-existente e não relacionada ao licenciamento; **passa isolado** (flaky sob carga da suíte; setup do env tomou ~446s).
- Nenhum commit/push/deploy.

## [2026-08-03] Revenda Delazari — hardening do escopo de revenda em `server/routes/admin.js`

- Evidência de produção capturada: `pg_policies` de `organizations` (PERMISSIVE/OR) — reseller vê própria org + filhos (`parent_id = get_auth_organization_id()`); clientes diretos ficam fora. Produção: 2 resellers, 9 não-reseller, 6 clientes diretos. Filhos do Delazari = Mega/Pamas/Vapt.
- Problema: backend usa service role (bypassa RLS) → isolamento precisa ser forçado no código; só existia no filtro do GET principal.
- Correção em `server/routes/admin.js`: helpers `resolveAdminOrgScope`/`isOrgWithinScope`/`areOrgsWithinScope`; GET refatorado (comportamento idêntico); fallback `queryOrganizationsWithDirectDb(parentId)` filtra `parent_id`; POST define `parent_id` via escopo (cobre impersonação de revenda); PUT/DELETE/bulk-delete → 403 fora do escopo.
- Gates: `node --check` ✓, `npx eslint server/routes/admin.js` ✓ (0 erros), Vitest server 13 arquivos/102 testes ✓, `npm run type-check` ✓. Lint completo (ts/tsx) não re-executado (não cobre `.js`; usuário abortou o run).
- Removido `query_org_scope.tmp.mjs` (raiz). Sem commit/push. Working tree continua com WIP de outras sessões.

## [2026-08-03] Central de Licenciamento Wootech — Incrementos 1-4

- Plano aprovado em 7 incrementos (Etapa B). Incrementos 1-3 já concluídos em sessões anteriores (schema SQL, crypto, policy/estado/envelope) — 43 testes verdes.
- **Incremento 4 (endpoints de instalação) concluído** — 15 testes novos (58 licenciamento / 185 total):
  - `server/lib/licensing/installation-service.js`: `activateInstallation`, `validateInstallation`, `sendHeartbeat` + `LicenseEndpointError` + `replayGuard`. Verificação da chave WOLK1 (formato + assinatura Ed25519 via `LICENSE_SIGNING_PUBLIC_KEY`; sem env, assinatura pulada), anti-replay de nonce (hash SHA-256, 30min), lookup da licença por `license_key`, ativação de draft→active (limitada a valid/grace/draft), vínculo de domínio, limite de instalações, upsert de instalação por fingerprint, heartbeat log, auditoria com hash encadeado (`license_audit_events`, retry em 23505), envelope offline assinado (`createValidationEnvelope`; `signature: null` sem `LICENSE_SIGNING_PRIVATE_KEY`).
  - `server/api/licensing/index.js`: `GET /status`, `POST /activate`, `POST /validate`, `POST /heartbeat` sob `licensingLimiter` (60 req/min/IP), erro tipado `{code, status}`.
  - `server/routes/index.js`: montagem em `/api/licensing/v1`.
  - `server/__tests__/licensing-installation-service.test.ts`: mock Supabase stateful (licenses/installations/domains/entitlements/heartbeats/audit) com cadeia de filtros; cobre ativação, assinatura forjada, licença desconhecida, bloqueada, domínio não vinculado, limite excedido, replay de nonce, mismatch de `licenseId` no payload, validação (válida/fingerprint desconhecido/bloqueada) e heartbeat (timestamps, instalação não registrada, bloqueada).
- **Correções de sessão**: `evaluateLicense` (`server/lib/licensing/policy.js`) agora tem defaults `installation = null`/`requestDomain = ''` (fica consistente com o comportamento e destrava o type-check do teste de policy).
- Gates: Vitest 185/185 (32 arquivos), type-check ✓ (sem output), lint 0 erros (599 warnings pré-existentes, nenhum nos arquivos alterados), `node --check` ✓.
- Nenhum commit/push/deploy.

## [2026-08-03] Produção revenda Delazari: fix de impersonação confirmado no ar (via build da PR #66, não do main)

- Verificação de produção (bundle + GitHub Actions + probes) do diagnóstico da revenda Delazari.
- Bundle `index-D0eZEUaE.js` contém `getPanelHomePath`/`is_reseller` e o fluxo de sessões curtas → **o fix `214595a` está em produção** (hipótese "produção sem o fix" descartada).
- `compare` na GitHub API: `214595a` **não** é ancestral do main (`214595a...e7d546b` → diverged, behind_by=68; `NicheRedirect.tsx` de `c1741da` sem `is_reseller`); `214595a...c3e927cae3` → ahead, behind_by=0 (fix na branch = PR #66 aberta). `c3e927cae3` está na branch local (`git branch --contains`).
- Workflow `docker-images.yml`: dispara em push para `main` + `codex/main-whatsapp-media-hotfix`; `deploy-portainer` só em `main`. Último deploy automático 30/07 16:45Z (`e7d546b`, PR #65) executou OK — anterior ao fix. Imagens: `:latest`, `:<sha>` e aliases (`api` fixado em `5daaa4a05b3d...`; `frontend` alias = `latest`).
- Conclusão: produção roda build da branch (redeploy manual do Portainer após 01/08). Probes: `/api/system-status` uptime 57346s → API iniciada ~02/08 21:25Z, logo após builds da branch (21:11Z/21:21Z); sem endpoint de versão (`/api/info|health|version|system/info` → 404).
- **Risco alto**: próximo push no main reverte o fix (deploy automático do main sem `is_reseller`). Recomendação: mergear PR #66.
- Causas restantes do sintoma 2: cache do navegador do usuário (PWA/SW/`index.html` antigo), perda da sessão no reload, desvio de relógio.
- Nenhuma correção de produto; apenas DEV docs + report (seção 5) atualizados. Sem commit/push.

## [2026-08-03] Diagnóstico da revenda Delazari (escopo de clientes + impersonação)

- Relatório entregue em `DEV/RELATORIO_REVENDA_DELAZARI_2026-08-03.md`; nenhuma correção aplicada.
- Sintoma 1 (lista de revenda só mostra filhos): causa no filtro de escopo de `GET /api/admin/organizations` (`server/routes/admin.js:663-693`) + RLS "Reseller view/update sub-organizations"; comportamento introduzido pela lógica de escopo de revenda (commits 0901af6/25a5a69).
- Sintoma 2 (não redireciona ao painel do cliente): cadeia inteira verificada e consistente no código atual — POST `/api/admin/impersonations` → `persistImpersonationSession` (sessionStorage) → `loadProfile` → `/admin` → `NicheRedirect` → `/rural|/urban`; POST comprovado no banco (sessões ativas ator e3d30425 → tenant 52757ffb hoje 12:16Z). Causas prováveis da falha: deploy anterior ao fix `214595a`, perda da sessão no reload, ou envelope sem `organizationId` em versão antiga do server.
- Gates: análise estática (código + banco); nenhum arquivo de produto alterado → type-check/lint/build não executados.
- Nenhum commit/push/deploy.

## [2026-08-03] Mega Admin — domínios dos whitelabels (frontend)

- Contexto: backend pronto (rotas `/api/mega/resellers/:id/domain` e campos `site_domain`/`panel_domain` no `POST /resellers`). Faltava o frontend.
- `views/megaadmin/MegaAdminLayout.tsx`: novo item de navegação "Domínios" (ícone `Globe`, rota `/megaadmin/domains`) ao lado de Resellers.
- Novo `views/megaadmin/ResellerDomains.tsx`: tabela whitelabel × domínio (Site e Painel) com status (`pending`/`pending_ssl`/`active`) vindo da tabela `domains` (via client Supabase), badge "Site + Painel" para purpose `both`, ações "Verificar DNS" (reusa `/api/domains/verify/:domain`) e "Remover" (DELETE `/api/mega/resellers/:id/domain`, envia purpose `both` quando aplicável); modal "Vincular Domínio" (whitelabel + tipo + domínio, POST com `strictDns: false`, aviso do registro A para `PLATFORM_IP`).
- `App.routes.tsx`: rota lazy `domains` no bloco `/megaadmin` (protegida por MegaAdminGuard).
- `views/megaadmin/ResellerManager.tsx`: campos "Domínio do Site" e "Domínio do Painel" no form (pré-preenchidos na edição via `custom_domain`/`platform_domain`, enviados como `site_domain`/`panel_domain`; editada interface `Reseller`).
- Gates: `npm run type-check` ✓, `npm run lint` ✓ (0 erros; 598 warnings pré-existentes, nenhum nos arquivos alterados), `npm run build` ✓ (chunks `ResellerDomains-*.js` e `MegaAdminLayout-*.js` gerados).
- Nenhum commit/push/deploy.

## [2026-08-03] Simulador de conversa natural (agente + lead automático)

- Diagnóstico: o chat de teste não tinha modo de simulação autônoma; o usuário precisava digitar cada mensagem do lead manualmente. Para demonstrar o protocolo de saudação/apresentação e o fluxo natural, faltava um modo onde o agente e um lead simulado conversassem de forma autônoma.
- Novo `server/services/ai/conversationSimulator.js`: `ConversationSimulator` executa loop de conversa entre o agente (com `buildAgentSystemPrompt` + orquestrador quando tools ativas) e um lead simulado (prompt dedicado de cliente brasileiro realista). Suporta Gemini/OpenAI/Groq, persiste em `conversation_memory` e retorna transcript.
- `server/api/ai/chat.routes.js`: novo `POST /agents/:id/simulate` carrega o agente, roda a simulação e devolve o transcript completo + `session_id`.
- `services/aiAgents.ts`: novo método `simulate(id, { seed_message, turns, session_id })`.
- `components/agents/AgentChatTest.tsx`: novo modo "Auto" (simulação automática). Quando há agente salvo, usa o endpoint `/simulate`; quando não há, faz simulação client-side com `simulateAgentReply` + `simulateLeadReply`. Reproduz o fluxo "oi → apresentação → qualificação → busca de imóvel" automaticamente.
- Gates: type-check ✓, eslint 0 erros, Vitest 27/127 ✓, build Vite ✓ (4.079 módulos, PWA 267 entries).
- Nenhum commit/push/deploy.

## [2026-08-02] Agentes IA — protocolo de saudação/apresentação e conversa humana

- Diagnóstico: ao mandar "oi" no chat de teste, o agente respondia de forma genérica sem se apresentar. Causas: (1) nenhum prompt instruía o agente a se apresentar em saudação/início de conversa; (2) sem contexto de marca no backend; (3) o chat de teste não usava o orquestrador de ferramentas (só o WhatsApp usava); (4) regras de conversa humana (máx. 2 perguntas, mensagens curtas) só existiam no fluxo do WhatsApp.
- Novo `server/services/ai/agentPrompt.js` com `buildAgentSystemPrompt(agent, { history, channel, brandName })`: identidade, marca, personalidade, instruções, estilo, capacidades, ferramentas, autonomia, handoff, histórico, protocolo de saudação/apresentação (nunca responder "oi" com "oi" seco) e regras de conversa humana.
- `server/api/ai/chat.routes.js`: `buildMemorySystemPrompt` delega ao builder compartilhado; `/agents/:id/chat` agora usa o `AgentOrchestrator` (ReAct/function calling) quando o agente tem tools e o provedor é Gemini, para o teste se comportar igual ao WhatsApp (fallback para o fluxo antigo preservado).
- `server/services/ai/agentOrchestrator.js`: system prompt usa o builder compartilhado + diretrizes de ferramentas (buscar_imoveis, agendar_visita, simular_financiamento, atualizar_etapa_crm, qualificar_lead).
- `server/lib/AIAutomation.js`: `processIntent` ganhou contexto de marca (`AGENT_BRAND_NAME`) e regra de apresentação na "reply" quando a conversa começa com saudação e não há resposta do agente no histórico.
- `components/agents/AgentChatTest.tsx`: fallback (sem agente salvo) agora se apresenta com o nome/função do agente.
- Gates: type-check ✓, eslint 0 erros (1 aviso pré-existente), Vitest 27 arquivos / 127 testes ✓, `node --check` ✓.
- Nenhum commit/push/deploy.

## [2026-08-02] QR WhatsApp — mensagens de falha diferenciadas por fase de conexão

- Falha do QR com causa dupla confirmada na sessão anterior (instância em `disconnected` sem `qr_code`; CI sem `deploy-portainer` na branch).
- Frontend `views/WhatsApp/QRCodeModal.tsx`: novo `terminalErrorRef` impede que o polling continue após erro terminal (status com `error` ou HTTP com `status`), evitando novas chamadas desnecessárias; resetado no clique de nova tentativa.
- Backend `whatsapp-service/internal/whatsapp`:
  - `client.go`: novo `IsSocketConnected()` expõe o estado real do WebSocket do WhatsMeow no momento da falha.
  - `manager.go`: watchdog de 30s agora distingue a causa — conexão aberta mas sem dados do QR (protocolo) vs. conexão encerrada antes do QR (DNS/TLS/proxy/egress) — via `qrStartupFailureMessage(socketConnected)`.
  - `manager_config_test.go`: novo `TestQRStartupFailureMessage` cobre as duas mensagens.
- Gates: `npm run type-check` ✓; `npx eslint views/WhatsApp/QRCodeModal.tsx` ✓ (0 erros, 1 aviso pré-existente de exhaustive-deps); Vitest `tests/whatsapp-qr-timeout.test.ts` ✓ 2/2; Go build/vet + `go test ./...` ✓ (via cópia ASCII em temp — path com acento corrompe o módulo Go no Windows).
- Nenhum deploy; push pendente de autorização do maestro.

## [2026-08-02] Auditoria de tipografia, cores e identidade visual

- Auditados tokens globais, classes Tailwind, fontes, estilos inline, white-label, módulos WooTech e WhatsApp e identidade textual.
- Inventário estático: 14.094 usos de cores diretas contra 437 usos semânticos; 539 ocorrências de texto em 10 px e predominância de bold/uppercase.
- Confirmadas falhas de contraste em botões primários, texto terciário e `.btn-accent`, além de fontes declaradas sem carregamento global.
- Relatório completo criado em `DEV/RELATORIO_TIPOGRAFIA_CORES_2026-08-02.md`; nenhuma alteração de produto, commit, push ou deploy foi executada.

## [2026-08-02] Reconstrução das novas telas WooTech Imob

- Mapeadas as 15 referências do arquivo `novas-telas-wootech-imob.zip` para as rotas e componentes existentes dos painéis urbano e rural.
- Consolidado o sistema visual WooTech Imob em `views/wootech-reference.css`, com paleta verde, superfícies, bordas, ações, indicadores, foco acessível e breakpoints responsivos.
- Reconstruídas as superfícies de portfólio, funil CRM, metas e vendas rurais, Matchmaking 360, BI Rural Select, central de configurações, aparência do site, cadastro de condomínio, simulador financeiro, controle de chaves, loteamentos, contratos e jurídico e central de locações.
- Pipeline, Matchmaking, configurações e aparência receberam novas hierarquias, métricas, ações e preview; os fluxos e integrações existentes foram preservados.
- A central de mensagens já estava sendo reconstruída em alterações locais independentes e foi preservada sem sobrescrever o trabalho em andamento.
- Gates: type-check, lint sem erros, 127 testes e build Vite aprovados; nenhum commit, push ou deploy foi executado.

## [2026-08-02] QR WhatsApp — causa isolada no backend/protocolo

- As capturas mostraram `/instances/:id` em `connecting` e `/qrcode` retornando apenas `pending`; não havia `qr_code` para o React desenhar.
- Confirmado que o frontend publicado já possui o timeout/retry do commit atual; descartada a hipótese de bundle antigo no navegador.
- Atualizado `go.mau.fi/whatsmeow` para `v0.0.0-20260730092514-662ad1dc6900`, com lockfile reorganizado por `go mod tidy`.
- Adicionada identificação `whatsmeow_version` ao `/health`, com testes unitários do resolvedor de versão de build e propagação pelo proxy Node.
- Mudanças locais preexistentes do inbox foram preservadas e não foram editadas.

## [2026-08-01] WhatsApp — QR Code sem evento do WhatsMeow não fica mais em loop

- Sintoma reproduzido por inspeção do fluxo: com a instância em `connecting`/`qr_pending` e sem evento `qr_code`, o modal ignorava o limite de tentativas e mantinha “Gerando QR Code...” indefinidamente.
- Frontend: limite absoluto de 30 segundos no `QRCodeModal`; ao expirar, interrompe o estado de carregamento, mostra uma mensagem acionável e permite uma nova tentativa com relógio reiniciado. Um QR já recebido não é invalidado pelo limite.
- Backend: watchdog de 30 segundos no `whatsapp-service`; se o cliente atual continuar desconectado e sem QR, encerra a sessão presa, volta a instância para `disconnected` e publica `instance_status` com erro. O watchdog confirma a identidade do cliente para não derrubar uma reconexão mais nova.
- Regressão: 2 testes Vitest para o limite do modal e teste Go para sessão presa, QR gerado, cliente conectado e cliente substituído.
- Gates: type-check, lint (0 erros; 594 avisos preexistentes), 125 testes frontend, build Vite, suíte Go e build do servidor passaram.
- Pendente: deploy e pareamento real em produção; `/api/whatsapp/health` respondeu 200 durante o diagnóstico.

## [2026-08-01] WhatsApp — 404 no QR Code para instância inexistente (fix no modal)

- Sintoma: `GET /api/whatsapp/instances/:id/qrcode` retornava 404 no console do navegador e o modal ficava em "Gerando QR Code..." sem fim.
- Causa raiz: a instância `d8a5611e-c472-4cc1-bd80-2574fffdfdc8` não existe no banco de produção (nem no dev); `QRCodeModal` engolia o 404 silenciosamente (`error.status !== 404` em `fetchQR`) e seguia polando a cada 3s.
- Verificação: `/api/whatsapp/health` em produção OK (`whatsmeow.ok:true`); proxy Node e rota Go `/instances/:id/qrcode` íntegros; instância ausente confirmada via pg direto em produção e dev.
- Correção: `views/WhatsApp/QRCodeModal.tsx` — `error.status === 404` agora para o polling (`clearInterval`) e renderiza "Instância não encontrada... Fechar" em vez de spinner infinito.
- Gates: type-check ✓, eslint 0 erros ✓ (594 warnings pré-existentes).

## [2026-08-01] WhatsApp + estabilização e higiene dos testes E2E

- Ajustado o retry do QR do WhatsApp para registrar falhas pelo logger central e removidos resíduos do provider WAHA.
- Corrigida a premissa incorreta do teste de `/register`: a rota redireciona para `/onboarding`, cuja primeira ação é “Avançar”, não um submit.
- Reescritos os testes de autenticação, rotas públicas e proteção de painéis com seletores semânticos, mock do endpoint público e espera pelo bootstrap da aplicação.
- Relatórios, screenshots e vídeos gerados pelo Playwright deixaram de ser rastreados e passaram a ser ignorados.
- Gates verdes: type-check, lint sem erros, 123 testes unitários, build, 32 testes E2E e repetição 12/12 do fluxo de autenticação.

## [2026-08-01] Impersonação de revenda (mega admin) redirecionava para /urban em vez de /superadmin

- Sintoma: mega admin clicava "Acessar Painel" numa revenda (`ResellerManager`) e caía no login/painel da imobiliária urbana.
- Causa raiz: após `impersonateOrganization` + `window.location.href = '/admin'`, o `NicheRedirect` → `getPanelHomePath` (em `components/NicheRedirect.tsx`) tratava superadmin impersonando como admin/broker e mandava para `/rural`/`/urban` pelo niche — ignorando `organization.is_reseller`.
- Correção: em `getPanelHomePath`, quando `role === superadmin` e `isImpersonating` e `organization.is_reseller === true` → retorna `/superadmin`; só usa niche (`/rural`|`/urban`) para clientes diretos (`is_reseller` false). Centralizado, então vale para `ResellerManager`, `TenantManager` e `DirectClientsManager`.
- Gates: type-check ✓, eslint 0 erros ✓ (594 warnings pré-existentes).

## [2026-08-01] WhatsApp não gerava QR no frontend — fix BUG 1 (frontend) + BUG 2 (backend)

- Sintoma: ao criar uma instância, o QR nunca aparecia (~40s) e o modal ficava em spinner infinito, sem erro. Sem logs de produção do `whatsapp-service`, as correções atacaram os dois lados (egress do proxy Node vs sqlstore no pooler).
- Causa raiz BUG 1 (`views/WhatsApp/QRCodeModal.tsx`): o polling só chamava `getQRCode` quando o status era `qr_pending`; em `connecting`/`disconnected` o fluxo ficava em loading e nunca consultava o backend — o `qr_code` emitido não era buscado → QR perdido / botão preso. Timeouts secundários: proxy Node ~5000ms e auto-connect 30s.
- Correção BUG 1: `fetchQR` agora sempre chama `getQRCode`; `emptyQRAttemptsRef` conta 3 tentativas sem QR e sem conexão ativa → tela de erro/retry; em `connected` limpa o QR e fecha o modal em 1.8s.
- Causa raiz BUG 2 (`whatsapp-service/internal/whatsapp/manager.go`): `connectInstance` não tratava falhas de `initializeSessionStore`/`deviceForInstance`/`client.Connect()` — status preso e nenhum broadcast, então o front não tinha como sair do estado.
- Correção BUG 2: novo helper `failConnect` (status `disconnected` + broadcast `instance_status` com mensagem de erro) aplicado a todas as falhas antes da conexão; goroutine de `client.Connect()` que falha também emite broadcast.
- Gates: frontend type-check ✓, eslint 0 erros ✓ (1 warning exhaustive-deps pré-existente), build ✓; backend `go build`/`go vet`/`go test` ✓ (via cópia ASCII em temp — path com acento corrompe o `go` nativo no Windows; artefatos temporários removidos).
- Pendente: validação runtime local/produção do QR (~3s esperado), alinhar `whatsapp-service/.env` local (Supabase/MinIO de produção) e push/CI/Portainer.

## [2026-08-01] Instagram Service — plano de deploy em produção (fix do 502)

- Incidente: `GET /api/instagram/conversations` → 502 "Servico Instagram Indisponivel" em produção (`https://imob.wootech.com.br`).
- Causa raiz: proxy do api (`server/api/instagram/index.js`) encaminha `/api/instagram/*` para `http://instagram-service:3200`, mas o serviço nunca foi deployado em produção: `docker-compose.yml` não tem `instagram-service`/`instagram-worker`/`redis`; o CI buildava só frontend/api/whatsapp/agro; `.env.production` sem `INSTAGRAM_SERVICE_URL`. O frontend captura o erro e só loga (`useWhatsAppInbox.ts:478`), então o WhatsApp segue normal.
- Mudanças:
  - `Dockerfile.instagram-service` e `Dockerfile.instagram-worker`: build copiava do contexto raiz (`COPY package.json ./` + `COPY src ./src`), o que produzia imagem quebrada (`src/` raiz não tem `index.js`). Corrigido para `instagram-service/...` / `instagram-worker/...`.
  - `server/api/instagram/index.js`: `setupInstagramProxy(app, server)` com upgrade WebSocket de `/api/instagram/ws` (passthrough, espelhando o padrão do WhatsApp); mantém HTTP + CORS.
  - `server/index.js`: passa `server` ao `setupInstagramProxy`.
  - `.github/workflows/docker-images.yml`: matrix ganha `instagram-service` (Dockerfile.instagram-service) e `instagram-worker` (Dockerfile.instagram-worker) → `ghcr.io/fluowai/woomobzy-instagram-*`.
  - `docker-compose.yml`: adicionados `redis` (redis:7-alpine, healthcheck), `instagram-service` (3200) e `instagram-worker` (8000, volumes `instagram_devices`/`instagram_sessions`) na rede `imobfluow_internal`; `INSTAGRAM_SERVICE_URL` no serviço `api`; volumes nomeados `redis_data`, `instagram_devices`, `instagram_sessions`.
  - `.env.production.template` e `.env.production`: novas vars `INSTAGRAM_SERVICE_URL`, `INSTAGRAM_WORKER_URL`, `INSTAGRAM_INTERNAL_TOKEN`, `INSTAGRAM_ENCRYPTION_SECRET`, `REDIS_URL` (segredos gerados localmente no `.env.production`, que é gitignored).
- Verificação local: `node --check` OK nos JS alterados; `docker compose config --services` OK (agro, api, frontend, redis, instagram-service, instagram-worker, rabbitmq, whatsapp-service).
- Pendente (produção): atualizar o stack no Portainer com o novo compose + env vars, publicar imagens e redeployar; a migration `20260726_instagram_integration_module.sql` já cria tabelas/RLS; validar `/api/instagram/conversations` e o WS `/api/instagram/ws`; conectar conta Instagram (QR) e testar envio.

## [2026-08-01] WhatsAppDashboard — integração dos componentes órfãos + desbloqueio do build

- Retomada da integração da aba Mensagens (`WhatsAppDashboard.tsx` como shell fino usando `ChatSidebar` + `ChatWindow` + `InstanceManager` + `QueuesManagerModal` + telas de erro, consumindo `useWhatsAppInbox`).
- Correções na shell:
  - `setSelectedChatSafe` (inexistente) → `clearSelectedChat()` (já exposto pelo hook) no `onChange` do seletor de instância.
  - `onBack` do `ChatWindow` simplificado para `clearSelectedChat` (removido hack de chat falso `{...selectedChat, id: ''}`).
  - Removido destructure `chats` não usado (só `filteredChats` é consumido) → lint limpo.
- Desbloqueio de gates (pré-existente de `afc995c`, não relacionado ao WhatsApp):
  - `App.routes.tsx:137`: import de `MegaTheme` corrigido para `./src/views/sites/megainvestimentos/MegaTheme` (estava `./views/...`, inexistente → quebrava type-check e build).
  - `src/views/sites/megainvestimentos/HeroSearch.tsx`: adicionado `Home` ao import do `lucide-react` (era `Home` indefinido).
- Gates: type-check ✓, eslint ✓ (4 warnings preexistentes de exhaustive-deps no hook), build ✓, test ✓ (25 files / 123 tests).
- Pendente: validação runtime — subir Go whatsapp-service (3100) + Node backend (3001/3002) + Vite (3006) e conferir a aba com dados reais (nenhum serviço rodando localmente).

## [2026-08-01] Kanban CRM (aba "kambam") — edição completa de cards e etapas

- Causa raiz: `EditLeadModal` enviava `tags: string[]` no `PATCH /leads/:id`, mas `leads` não tem coluna `tags` (ficam em `lead_tags`) → Supabase rejeitava o update → modal travava em "Salvando..." e a edição nunca abria (`isEditOpen` nunca `true`); etapas só podiam ser criadas.
- Correções:
  - `server/api/crm/leads.routes.js` PATCH `/leads/:id`: separa `tags` e sincroniza `lead_tags` (delete + reinsert); demais campos inalterados.
  - `views/CRM/KanbanBoard/EditLeadModal.tsx`: `handleSave` com try/catch/finally + toast de erro (não trava); payload manual com `tags`/`budget` parseados.
  - `views/CRM/KanbanBoard.tsx`: removido `EditLeadModal` órfão; `LeadDetailsModal` agora recebe `onUpdateLead` (atualiza `leads` e `selectedLead`); adicionados `handleRenameStage` e `handleDeleteStage`.
  - `views/CRM/KanbanBoard/NewStageModal.tsx`: reescrito com lista de etapas custom, renomear inline (Enter/Escape) e excluir com confirmação.
- Fix de tipo: `handleDeleteStage` re-mapeia leads de etapa excluída com `status: firstStageId as Lead['status']` (resolve TS2345).
- Gates: type-check ✓ (0 erros no Kanban/leads), eslint ✓ (0 erros, 595 warnings preexistentes). Commit `99abe95 fix(crm,whatsapp): update CRM kanban and whatsapp layout` (branch `codex/main-whatsapp-media-hotfix`, 2 commits à frente de origin).
- Observação: working tree tem mudanças de outra sessão em `App.routes.tsx`, `src/views/sites/megainvestimentos/HeroSearch.tsx`, `DEV/scripts/migrate_pamasimoveis.mjs` e `views/WhatsApp/WhatsAppDashboard.tsx` — não relacionadas ao Kanban.
- Pendente: validação manual no navegador do fluxo abrir card → editar → salvar e criar/renomear/excluir etapa.

## [2026-07-30] Fix do gap LegalContracts (tabela contracts: colunas + RLS + UI)

- Probe pós-migração em produção: `contracts` tinha RLS ativa **sem nenhuma policy**; `legal_contracts` já existia (migration `20260731_ui_redesign_schema_additions.sql` parcialmente aplicada). Counts: contracts 0, legal_contracts 0, properties 4, leads 2.
- Nova migration `migrations/20260730_fix_contracts_legal_tab.sql` criada e aplicada em produção via `scratch/apply_contracts_fix.mjs`: **7/7 statements OK** (após trocar splitter bugado pelo correto do runner). `contracts` passou a ter `title`, `type`, `value`, `template_id` (NOT NULL default none), `contract_type` (NOT NULL default none), `status` default `'draft'`, policy RLS por `organization_id`, trigger `set_updated_at` e index.
- RLS simulada como `authenticated` (INSERT + SELECT OK, transação revertida, 0 rows persistidos).
- `views/LegalContracts.tsx`: insert agora envia `contract_type` (NOT NULL sem default) — fix de UI.
- `scripts/run-migrations.mjs`: lista canônica atualizada com os 6 `20260730_*` + `20260730_fix_contracts_legal_tab.sql` + `20260731_ui_redesign_schema_additions.sql` (idempotente).
- Validação runtime em produção: Cobranca usa `rental_contracts` (select autenticado OK); insert do LegalContracts corrigido.
- Gates: type-check ✓, eslint 0 erros (10 warnings preexistentes, nenhum no diff) ✓, build ✓.
- Verificação final `scratch/verify_20260730_final.mjs`: todos os checks passam, 0 dados persistidos. Nenhum push; commit do change set pendente.

## [2026-07-30] Análise de segurança completa (gitleaks + npm audit + revisão manual)

- Ferramentas: gitleaks v8.30.1 instalado via `go install`; docker/semgrep/trivy indisponíveis (SAST não executado — coberto por revisão manual). Scan autorizado, advisory, sem mutações.
- gitleaks (960 commits): **212 leaks** (115 generic-api-key, 96 jwt). Service role key do Supabase confirmada (fingerprint SHA256) **idêntica** em `.env.production.template` e `.env` de produção, em 9 arquivos rastreados; JWT secret idêntico (`.env.production.template`, `fix_jwt.mjs`); senha real em `test_user_query.mjs`/`test_orgs_query.mjs`.
- npm audit (prod): **18 vulns** (16 HIGH): axios, nodemailer, multer, react-router, sharp, http-proxy-middleware, imapflow, mailparser, linkify-it, undici, vite, postcss, form-data, body-parser, colorthief, google-tts-api.
- Revisão manual: webhook Asaas sem verificação (token comentado); webhooks CVcrm/BIA sem auth; `exec_sql` SECURITY DEFINER (verificar grants em prod, `secure_rpc.sql` não é migration); fail-open no webhook Orulo; `rejectUnauthorized:false` em pg direto; stored XSS no `LayoutEditor/CustomHTMLBlock`; Zap `/leads` sem auth; CI com actions não pinadas por SHA + redeploy automático.
- Pontos fortes confirmados: auth com role do banco, impersonação por sessão curta, RLS em tabelas-chave, CORS allowlist dinâmica, rate limits dedicados, sem service role no frontend, `.env`\* ignorados.
- Artefatos: `security-reports/{gitleaks.json, npm-audit-prod.json, RELATORIO_SEGURANCA_2026-07-30.md}`. `security-reports/` adicionado ao `.gitignore`.
- Nenhum commit/push/deploy; nenhum segredo rotacionado (aguardando aprovação do maestro).

## [2026-07-30] Rural UX batch: ações navegáveis + cadastro técnico + due diligence

- `views/RuralDashboard.tsx`: quick actions agora navegam para rotas reais (`/rural/territorio/due-diligence`, `/rural/portal-comprador`, `/rural/properties/new`) em vez de toast "em breve"; botão "Nova Captação" navega para `/rural/properties/new`.
- `views/rural/FinanceiroRural.tsx`: "Ver Relatório Completo" navega para `/rural/reports`.
- `views/rural/CadastroTecnico.tsx`: modal de detalhes técnicos (localização, áreas, bioma, solo, regime hídrico, topografia, aptidão, score de liquidez, CAR, georreferenciamento, status, arquivo de origem) + exclusão real de propriedade via `propertyService.delete` com `confirm` e estado `deletingId`.
- `views/rural/DossieInteligente.tsx`: "Gerar Minuta de Venda" agora exige due diligence aprovada (riskScore >= 80) antes de gerar/download do dossiê.
- `views/rural/DueDiligence.tsx`: upload de documento por item do checklist via `/api/documents/upload/:id` (máx 20MB, spinner `Loader2`, link para abrir anexo, refresh da lista de documentos).
- Gates: type-check ✓; lint 0 erros (4 avisos preexistentes, nenhum no diff); build ✓ (4.063 módulos, PWA 237 entries).
- Nenhum push/deploy.

## [2026-07-30] Execução das 6 migrations pendentes em produção

- Runner novo `scratch/run_migrations_20260730.mjs` (splitter SQL com dollar-quoting/comentários/aspas; executa via RPC `exec_sql` statement a statement; regex IGNORE para idempotência; flag `--dry`; relatório ok/ignorados/falhas; exit 1 em falha). Dry run: 169 statements listados.
- Executado em produção (`epgaftsjmqmpczvzsrcc.supabase.co`): **169/169 statements OK, 0 falhas, 0 ignorados**:
  - `20260730_fix_landing_pages_public_access.sql` (5), `20260730_fix_landing_pages_rls_definitive.sql` (9), `20260730_fix_condominium_tickets_missing_table.sql` (7), `20260730_fix_all_production_errors.sql` (50), `20260730_consolidated_production_fix.sql` (95), `20260730_214115_fix_plans_rls_insert.sql` (3).
- Verificação pós-migração via `pg` direto (`scratch/verify_20260730.mjs`), 14/14 checks OK: tabela `condominium_tickets`, `condominiums.status`, `rental_contracts.{tenant_name,property_id,monthly_rent}`, tabela `clients`, `lead_activities.lead_id`, funções `get_my_org_id`/`is_superadmin`/`handle_updated_at`, extensão `pgcrypto`, policy plans "Superadmin manage plans", policy landing_pages "Public read landing_pages". `contracts.title` confirmado **ausente** (gap LegalContracts segue válido).
- Nota: RPC `exec_sql` é `RETURNS void` (não devolve linhas) — verificação de schema exige conexão `pg` direta com `SUPABASE_DB_URL`.
- Pendente: commit do change set (guard files navegação + Cobranca + docs DEV); `scripts/run-migrations.mjs` (lista canônica) não inclui os `20260730_*` — batch foi ad-hoc.

## [2026-07-30] Resolução do v8 (BI RPCs + views billings/contracts)

- Probe em produção (`pg_class`/`information_schema`): `billing`, `billings`, `contracts` e `rental_contracts` existem como **TABELAS**; `get_bi_stats` (jsonb) e `get_bi_lead_sources` (table) existem. Statements #1/#2/#5 do `v8_fix_bi_rpcs_and_views.sql` já aplicados.
- As views `billings`/`contracts` (#3/#4) **não podem ser criadas**: os nomes já são tabelas reais (é o que o erro `"is not a view"` significava). Premissa da migration falsa: nenhum código consulta `/rest/v1/billings`; o app usa `billing` (server + PortalProprietarioUrbano).
- Bug real que o v8 tentava corrigir: `views/urban/Cobranca.tsx` consultava `contracts` com `tenant_name`/`value`/status `'Active'`, colunas que só existem em `rental_contracts` (status em minúsculo `'active'`). Corrigido: query passou a usar `rental_contracts` (`tenant_name`, `monthly_rent`, `property:property_id(title)`, `status='active'`), alinhado ao modal (já usava `c.monthly_rent`) e ao dashboard do server (`c.status === 'active'`).
- Gates: type-check ✓, lint 0 erros (593 avisos preexistentes), build ✓ (Vite 6.4.2, 4.063 módulos).
- Observação (fora do escopo, não tocado): `LegalContracts.tsx` (/urban/contracts e /rural/contracts) tem mismatch preexistente com a tabela `contracts` (`title`/`type`/`value`/`template_id` ausentes em produção).
- Pendente decisão do maestro: migrations `20260730_214115_fix_plans_rls_insert`, `20260730_fix_landing_pages_public_access`, `20260730_fix_landing_pages_rls_definitive`, `20260730_fix_condominium_tickets_missing_table`, `20260730_consolidated_production_fix` e `20260730_fix_all_production_errors` **não estão aplicadas** em produção (fora da lista executada).

## [2026-07-30] Fix: navegação "voltar" levava a usuários logados à página de vendas

- Causa raiz (rotas/guards):
  1. `MegaAdminGuard` redirecionava para `/` (página de vendas) qualquer superadmin impersonando ou usuário não-mega-admin; no modo suporte, o botão voltar para `/megaadmin` caía na página de vendas.
  2. `SystemSalesPage` (rotas `/`, `/vendas`, `/consultoria`) renderizava a página de vendas mesmo com usuário logado; como o histórico guarda `/` de antes do login, todo "voltar" dentro dos painéis (urbano/rural/super/mega) acabava nela.
  3. `ResellerManager` não navegava após `impersonateOrganization` — ficava em `/megaadmin` e o guard o expulsava para a página de vendas.
- Correções:
  - Novo helper `getPanelHomePath(profile, { isImpersonating })` em `components/NicheRedirect.tsx`, usado por `NicheRedirect`, `MegaAdminGuard`, `SuperAdminGuard` e `SystemSalesPage`. Roteia superadmin (mega/reseller), impersonação (painel da org), nicho (rural/urban), org ausente (`/onboarding`) e sem perfil (`/`).
  - `MegaAdminGuard` agora redireciona para o painel correto (nunca mais `/`).
  - `SuperAdminGuard` ganhou ramo para superadmin impersonando que acessa `/superadmin` ou `/megaadmin` → volta ao painel da org impersonada.
  - `SystemSalesPage` redireciona via `useEffect` (respeitando Rules of Hooks) usuários logados para o painel.
  - `ResellerManager` agora faz `window.location.href = '/admin'` após impersonar (padrão dos outros managers).
- Gates: type-check, eslint (0 erros) e build aprovados. Nenhum commit/push/deploy.
- Pendente: validar no navegador o fluxo "voltar" dentro de mega/super admin, aba imobiliária e modo suporte (impersonação).

## [2026-07-30] Fix 404 do Metas & Vendas Rurais (rural_financial_goals)

- Diagnóstico do erro `GET /rest/v1/rural_financial_goals ... 404`: a tabela existe em produção desde ~13/07 (OID 22204, logo após `global_templates`), mas o PostgREST estava com cache de schema desatualizado e respondia `relation not found`.
- Ação: `NOTIFY pgrst, 'reload schema'` enviado; a query exata (anon key) passou a retornar 200.
- Correção de bug real no código: `views/rural/FinanceiroRural.tsx` usava `month.toISOString().slice(0,10)` após `setDate(1)`, gerando `period_month=2026-07-02` em vez de `2026-07-01` quando o relógio local passa de ~21h (offset UTC-3). Substituído por composição local `getFullYear()`/`getMonth()` garantindo sempre `YYYY-MM-01`, tanto no load quanto no save.
- Gates: type-check e lint aprovados (0 erros). Nenhum commit/push/deploy; sem necessidade de nova migração (tabela já existe).

## [2026-07-30] Execução: port da sidebar colapsável (sanfona) para o Rural

- `components/RuralLayout.tsx` atualizado seguindo o padrão do `UrbanLayout` (commits `32354f3`/`3270e68`): estado `isDesktopSidebarOpen`, toggle `PanelLeftClose`/`PanelLeftOpen`, largura `w-[280px] ↔ w-[72px]` animada, labels/chevrons/títulos/logo/perfil/"Sair"/"Suporte" colapsáveis e auto-colapso ao navegar.
- Melhoria sobre o urbano: menu móvel usa `renderSidebarContent(true)`, mantendo labels visíveis no overlay (no urbano o overlay herda o estado colapsado).
- Ícone LogOut ajustado de 14 para 16 (paridade com urbano).
- Gates: type-check, eslint e build aprovados; prettier aplicado.
- Nenhum commit/push/deploy.

## [2026-07-30] Relatório de gap Urbano × Rural (sidebar sanfona)

- Analisado via git (commits `32354f3`, `080601a`, `3270e68`, `92a577d`) e comparação direta `UrbanLayout.tsx` × `RuralLayout.tsx`.
- Gap principal confirmado: menu lateral colapsável (sanfona) existe só no Urbano; `RuralLayout.tsx` nunca foi tocado pelos commits de sidebar.
- Gaps secundários: item de menu "Integrações" ausente no Rural (rota `/rural/integrations` já existe); "Clientes Unificado" só no Urbano.
- Sem gap em toasts/UX: views compartilhadas (WhatsAppDashboard, LegalContracts, PropertyManagement, RentalsManagement, IADashboardSummary, blocos de landing) já valem para os dois painéis; pares rurais (FinanceiroRural, Portais) já usam sonner.
- Relatório em `DEV/RELATORIO_GAP_URBANO_RURAL.md`. Nenhum código alterado; port da sidebar fica como próxima ação.

## [2026-07-30] Reforma da aba Agentes IA (views/AIAgents)

### Feito

- Substituído o dashboard monolítico (2.296 linhas) por view orquestradora thin (~460 linhas) + 9 componentes em `components/agents/`.
- Componentes novos: AgentAvatar, AgentStatusBadge, AgentFlowSteps, AgentPresetGrid (6 templates: Zya, Otto, Nexus, Max, Íris, Eco), AgentSidebar, AgentForm (5 seções colapsáveis no lugar do wizard de 7 abas), AgentDashboard (dados reais da API), AgentMetricsCard (cérebro neural + distribuição de notas), AgentChatTest (modos corretor/lead).
- Corrigidos: `TS2349` (handoffRules.map → handoffRuleOptions.map), `TS2322` (cast de handoff_rules), `TS2448` (loadAgents/loadMetrics em useCallback), imports não usados.
- Removido `components/AgentPremiumDashboard.tsx` (confirmado órfão via grep — nenhum import).
- Backend e services (`aiAgents.ts`) inalterados; frontend adaptado ao contrato existente.

### Pendente

- Testar a tela no navegador em `/urban/ai-agents` e `/rural/ai-agents` (requer dev server + autenticação).
- Validar fluxos: criar a partir de preset, salvar rascunho, publicar, editar, pausar/ativar, chat de teste.
- Considerar expor endpoints de memória/qualificação (hoje só `metrics` é consumido).

## [2026-07-28] Execução da auditoria funcional — Onda 0

### Inventário e infraestrutura

- Criada matriz gerada por AST em `DEV/TESTS/FUNCTIONAL_AUDIT_MATRIX.md`, cobrindo 143 rotas.
- Restauradas as rotas urbanas `/urban/fintech` e `/urban/clube`, que existiam no menu, mas não no roteador.
- Criada suíte E2E autenticada para Urbano, Rural, Super Admin e Mega Admin.
- O contrato E2E reprova explicitamente a execução sem credenciais, evitando falso resultado verde.

### Regressões corrigidas

- Corrigido overflow horizontal da página comercial e melhorada a acessibilidade do menu móvel.
- Corrigido bootstrap de tenant em loopback e resposta vazia de domínio personalizado.
- O papel persistido no banco passou a prevalecer sobre metadata de autenticação.
- `user_metadata` deixou de poder elevar privilégio ou vincular organização.
- A seleção de plano pago não ativa mais assinatura no navegador; registra `payment_required` no backend.
- Impersonação por header bruto foi substituída por sessão de 15 minutos, com motivo, hash do segredo, auditoria e revogação.
- O ID de `auth.users` passou a ser preservado separadamente do ID do perfil em cenários de drift.
- Literais sensíveis foram removidos dos arquivos versionados de configuração e bootstrap.

### Evidências

- revisão independente encontrou cinco defeitos no primeiro passe; todos foram corrigidos e aprovados no reteste;
- 10/10 testes públicos Playwright passaram em desktop e mobile;
- 8/8 bloqueios anônimos dos quatro painéis passaram;
- testes direcionados de autenticação, impersonação e assinatura passaram;
- type-check, build, lint sem erros e suíte Go passaram;
- nenhuma migration, rotação de segredo, commit, push ou deploy foi executado.

### Bloqueios externos

1. Rotacionar segredos previamente expostos e invalidar tokens/sessões antigos.
2. Fornecer contas de homologação para os quatro perfis.
3. Disponibilizar duas organizações por nicho e acesso controlado ao banco para validar RLS.
4. Aplicar e testar a migration de impersonação em homologação.

## [2026-07-28] Planejamento da auditoria funcional e de regressões

### Diagnóstico

- O sistema possui inventário funcional amplo e 120 tags de rota nos quatro painéis.
- A suíte Vitest passou com 18 arquivos e 90 testes.
- A suíte Playwright possui somente 5 cenários lógicos, voltados a superfícies públicas e roteamento básico.
- Build, type-check e lint passaram; o lint ainda apresenta muitos avisos.

### Planejamento

- Criado `DEV/SPECS/AUDITORIA_FUNCIONAL_REGRESSAO.md`.
- Definidas as ondas: fundação transversal, Urbano, Rural, Super Admin, Mega Admin, superfícies públicas e barreira permanente de regressão.
- Definidos gates, severidades, evidências e critérios globais de aceite.

### Escopo desta atividade

- Nenhuma função do produto foi alterada.
- Nenhuma correção, commit, push ou deploy foi executado.

---

## [2026-07-25] Fase 1: Financial Hub + Clube Imobzy

### Contexto

Após análise competitiva das plataformas CV CRM, MSYS Imob e Loft, identificamos os principais gaps do Imobzy. A Fase 1 implementa os dois gaps de maior impacto imediato.

---

### Arquivos Criados

#### `views/urban/FinancialHub.tsx`

Módulo de serviços financeiros integrados ao CRM com duas abas:

- **Crédito Imobiliário**: simulador com tabelas SAC e PRICE, seleção de 5 bancos (taxas indicativas), integração com `urban_financing_simulations`, export PDF e salvar no CRM.
- **Fiança Aluguel Digital**: fluxo em 2 passos para solicitar garantia locatícia, análise de comprometimento de renda (mín. 3x o encargo), listagem de solicitações por status, preparado para integração futura com CredPago, Porto Seguro e Tokio Marine.

Rota: `/urban/fintech`

#### `views/urban/ClubeImobzy.tsx`

Sistema de gamificação completo com 4 abas:

- **Meu Perfil**: hero card com nível (Bronze/Prata/Ouro/Diamante/Titânio), progress bar, stats e tabela de como ganhar pontos.
- **Ranking**: leaderboard da organização ordenado por pontos.
- **Resgatar**: catálogo de recompensas (Destaque no Portal, Curso Online, Voucher, Troféu) com lógica de resgate e deduação de pontos.
- **Conquistas**: badges desbloqueáveis com progresso individual.

Rota: `/urban/clube`

#### `migrations/20260725_gamification_and_fintech.sql`

Migration criando as tabelas:

- `gamification_profiles` — perfil de pontos por user+org com UNIQUE constraint
- `gamification_transactions` — log de pontos ganhos/gastos
- `gamification_redemptions` — registro de resgates
- `fianca_requests` — solicitações de fiança com coluna gerada `total_encargo`
- RLS policies por `organization_id` em todas as tabelas
- Indexes de performance (pontos DESC para ranking, status para fiança)
- Trigger `set_updated_at` em gamification_profiles e fianca_requests

---

### Arquivos Modificados

#### `App.tsx`

- Lazy imports adicionados: `FinancialHub` e `ClubeImobzy`
- Rotas adicionadas no Urban Panel: `/urban/fintech` e `/urban/clube`

#### `components/UrbanLayout.tsx`

- Imports de ícones adicionados: `Landmark` e `Trophy`
- Itens adicionados em `managementItems`: Financial Hub e Clube Imobzy

---

### Verificação

- Type-check executado: **zero erros nos arquivos novos**. Os erros existentes são todos pré-existentes em outros arquivos do projeto (DomainRouter, AuthContext, SettingsContext, etc.).
- **Próximo passo obrigatório**: Executar a migration `20260725_gamification_and_fintech.sql` no Supabase via Dashboard > SQL Editor.

---

### Próximas Fases (Planejamento)

- **Fase 2**: Empacotar PWA com Capacitor para App Store / Google Play
- **Fase 3**: Auditoria corporativa estrita (logs imutáveis) + módulo de Repasse de Financiamento de lançamentos

---

## [2026-07-26] Instagram Integration Module

### Contexto

Implementação completa do módulo de integração Instagram para o Imobzy, seguindo a arquitetura two-service (Node.js + Python worker) conforme especificação do maestro.

### Arquivos Criados

#### DB Migration

- `migrations/20260726_instagram_integration_module.sql` — 9 tabelas: `instagram_accounts`, `instagram_sessions`, `instagram_contacts`, `instagram_conversations`, `instagram_messages`, `instagram_templates`, `instagram_templates_variables`, `instagram_broadcast_groups`, `instagram_broadcast_recipients`. Todas com RLS por `company_id`, triggers `updated_at`, e índices de performance.

#### Node.js Service (`instagram-service/`)

- `package.json` — Dependências: Express, BullMQ, WebSocket, Supabase, Helmet, CORS
- `src/index.js` — Express server na porta 3200 com WebSocket para real-time, rotas `/api/instagram/*`
- `src/middleware/auth.js` — JWT auth via Supabase + company isolation via `x-company-id`
- `src/lib/worker-client.js` — HTTP client para comunicação com Python worker
- `src/lib/encryption.js` — AES-256-GCM encryption/decryption para credenciais
- `src/lib/queue.js` — BullMQ queue `instagram-worker-tasks`
- `src/routes/accounts.js` — CRUD contas Instagram + connect via QR code
- `src/routes/contacts.js` — Listagem, busca, update de contatos
- `src/routes/conversations.js` — Listagem de conversas com filtros
- `src/routes/messages.js` — Envio/recebimento de mensagens com WebSocket broadcast
- `src/routes/templates.js` — CRUD templates de mensagem com variáveis
- `src/routes/broadcasts.js` — Campanhas de broadcast com envio via BullMQ
- `src/routes/webhooks.js` — Webhooks para receber mensagens/status do worker Python

#### Python Worker (`instagram-worker/`)

- `requirements.txt` — instagrapi, fastapi, uvicorn, bullmq, redis, httpx
- `app/__init__.py`
- `app/config.py` — Configuração via env vars
- `app/models.py` — Pydantic models para requests
- `app/instagram_client.py` — Wrapper instagrapi com login QR, sessões, envio
- `app/worker.py` — BullMQ worker para processar tarefas da fila
- `app/main.py` — FastAPI server na porta 8000 com endpoints internos

#### Docker

- `Dockerfile.instagram-service` — Node.js 20 Alpine
- `Dockerfile.instagram-worker` — Python 3.12 slim
- `docker-compose.yml` — Adicionados services `instagram-service`, `instagram-worker`, `redis` + volumes
- `docker-compose.local.yml` — Adicionados services locais com healthchecks

#### Frontend

- `views/Instagram/InstagramDashboard.tsx` — Dashboard completo com inbox, contacts, templates, broadcasts, settings
- `views/Instagram/hooks/api.ts` — API client tipado para todas as rotas
- `views/Instagram/hooks/useWebSocket.ts` — Hook WebSocket para real-time

### Arquivos Modificados

- `App.tsx` — Lazy import `InstagramDashboard` + rotas `/instagram` no rural e urban panels

### Verificação

- Migration SQL válido (9 tabelas + RLS + triggers + indexes)
- Node.js service com 7 route files seguindo padrões existentes
- Python worker com FastAPI + BullMQ processing
- Docker compose atualizado para ambos ambientes
- Frontend com TypeScript types completos

### Próximos Passos

1. Executar migration `20260726_instagram_integration_module.sql` no Supabase SQL Editor
2. Subir serviços via `docker-compose up instagram-service instagram-worker redis`
3. Testar login QR code via `/api/instagram/accounts/connect`
4. Implementar ContactDrawer e TemplateManager completos (parcialmente feito no Dashboard)
5. Adicionar sidebar navigation para Instagram nos layouts RuralLayout e UrbanLayout

---

## [2026-07-26] Unified Inbox: Instagram + WhatsApp

### Contexto

Mesclar as conversas do Instagram no mesmo aba de mensagens do WhatsApp, diferenciadas por badge de plataforma. Antes, o Instagram tinha uma rota separada (`/instagram`), agora é integrado ao inbox principal.

### Arquivos Criados

#### `views/WhatsApp/hooks/unifiedInbox.ts`

Tipos e adaptadores unificados:

- `UnifiedChat` — estende `Chat` com `platform: 'whatsapp' | 'instagram'` + campos Instagram opcionais
- `UnifiedMessage` — estende `Message` com `platform` + `instagram_conversation_id`
- `whatsappChatToUnified()` — converte WhatsApp Chat para UnifiedChat
- `instagramConversationToUnified()` — converte InstagramConversation para UnifiedChat
- `instagramMessageToUnified()` — converte InstagramMessage para UnifiedMessage
- `sortUnifiedChats()` — ordena por last_message_at DESC

### Arquivos Modificados

#### `views/WhatsApp/WhatsAppDashboard.tsx`

- Importa `instagramApi` e adaptadores unificados
- Estados `chats`, `selectedChat`, `messages` agora usam tipos `Unified*`
- `loadChats()` mescla WhatsApp chats + Instagram conversations com `sortUnifiedChats()`
- `loadInstagramConversations()` busca conversas Instagram na montagem
- `loadMessages()` roteia para API correta baseado no `platform`
- `handleSendMessage()` roteia envio para WhatsApp ou Instagram API
- `handleSelectChat()` aceita `UnifiedChat`
- WebSocket handler `new_message` normaliza para `UnifiedChat`/`UnifiedMessage`
- Busca (`filteredChats`) inclui campos Instagram (`instagram_contact_username`, `instagram_contact_full_name`)

#### `views/WhatsApp/ChatSidebar.tsx`

- Importa `UnifiedChat`
- Props usam `UnifiedChat` em vez de `Chat`
- Nova aba de filtro de plataforma: Todos / WhatsApp / Instagram
- Badge de plataforma (ícone Instagram) ao lado do nome em conversas Instagram
- Badge de unread com gradiente Instagram (`wa-unread-ig`)
- Preview de conversa Instagram mostra `@username`

#### `views/WhatsApp/ChatWindow.tsx`

- Props usam `UnifiedChat`/`UnifiedMessage`
- Header mostra badge de plataforma (WhatsApp/Instagram com ícone SVG)
- Subtitle mostra `@username` ou `via @account_username` para Instagram
- Contato panel mostra plataforma, conta Instagram
- CRM actions desabilitadas para conversas Instagram
- `saveContactName()` funciona para ambas plataformas

#### `views/WhatsApp/whatsapp.css`

- `.wa-platform-tabs` — aba de filtro com 3 colunas
- `.wa-platform-tab` — botões de filtro com hover/active states
- `.wa-platform-badge` — badge no header do chat (WhatsApp verde, Instagram gradiente)
- `.wa-platform-badge-sm` — badge pequeno no sidebar
- `.wa-unread-ig` — badge de unread com gradiente Instagram
- `.wa-platform-text-whatsapp` / `.wa-platform-text-instagram` — cores de texto

### Verificação

- `type-check` passou: 0 erros novos (2 pré-existentes em SupportManager e PortalProprietarioUrbano)
- `lint` nos arquivos modificados: 0 erros, warnings pré-existentes de React Hooks deps
- Commit: `c941adf` pushado para `origin/codex/main-whatsapp-media-hotfix`

### Próximos Passos

1. Testar fluxo completo: inbox mostra WhatsApp + Instagram, filtro funciona, envio funciona
2. Considerar remover rota `/instagram` separada (ou manter como atalho)
3. WebSocket real-time para Instagram (polling por enquanto)

---

## [2026-07-28] Fix Backend Errors: 5 Rotas com Erro

### Contexto

Cinco endpoints estavam falhando no console:

1. `match_properties_to_lead` RPC 404 — função não existia no banco
2. `/api/crm/clients` POST 500 — tabela `clients` não existia
3. `/api/orulo/sync` 400 — credenciais vazias retornavam sem erro
4. `/api/ai/chat` 500 — sem chaves de API Gemini/Groq, mensagem genérica
5. `/api/storage/upload` 500 — MinIO inacessível + fallback Supabase falhava sem feedback

### Arquivos Criados

#### `migrations/20260728_fix_backend_errors.sql`

- Função RPC `match_properties_to_lead(p_lead_id, ...)` — faz matching de imóveis ao lead por tipo, preço, quartos e área com score de 0-100
- Tabela `clients` com colunas alinhadas ao route handler (`document_number`, `document_type`, `roles`, `address_*`), RLS por `organization_id`, trigger `updated_at`
- Grants para `authenticated`

### Arquivos Modificados

#### `server/api/crm/clients/index.js`

- GET e POST: detectam tabela ausente (`42P01`/`PGRST205`) e retornam `migration_required: true` em vez de 500 genérico

#### `server/api/orulo/index.js`

- `getMasterOruloCredentials()`: valida `clientId` e `clientSecret` antes de retornar — lança 400 com mensagem clara quando as variáveis `ORULO_CLIENT_ID`/`ORULO_CLIENT_SECRET` não estão configuradas

#### `server/api/ai/chat.routes.js`

- `/chat`: status code 503 (Service Unavailable) em vez de 500 quando não há provedores IA
- Mensagem de erro descreve quais chaves estão faltando
- Resposta inclui `details` com status de cada provedor

#### `server/api/storage/index.js`

- `uploadToConfiguredStorage()`: catch no MinIO com fallback automático para Supabase quando `ALLOW_SUPABASE_STORAGE_FALLBACK=true`
- Handler de rota `/upload`: detecta erros de storage (MinIO/fetch failed) e retorna 503 com hint de configuração

### Verificação

- `type-check`: 0 erros novos (2 pré-existentes em WhatsApp module)

### Próximos Passos

1. Executar migration `20260728_fix_backend_errors.sql` no Supabase SQL Editor
2. Configurar chaves de IA (`GEMINI_API_KEY` ou `GROQ_API_KEY`) no `.env` do servidor
3. Configurar MinIO ou definir `MEDIA_STORAGE_PROVIDER=supabase` no `.env`

---

## [2026-07-28] Recuperação do QR Code do WhatsMeow

### Causa raiz

- A instância `22222` estava presa em `connecting` sem QR Code.
- O endpoint reiniciava somente clientes em `disconnected`, mantendo `connecting` indefinidamente em `pending`.
- O dashboard urbano consultava `leads.broker_id`, coluna inexistente em produção, causando HTTP 400 separado do fluxo do QR.

### Correção

- O endpoint de QR reinicia sessões presas em `connecting` e preserva sessões com QR ativo.
- Adicionado teste de regressão para os estados de recuperação.
- Removido `broker_id` da consulta e do agrupamento do dashboard urbano.
- Instância real `22222` redefinida condicionalmente para `disconnected`, permitindo que o backend publicado reinicie o pareamento na próxima abertura do modal.

### Verificação

- Suíte Go completa e build do servidor: passaram.
- Build Vite de produção: passou.
- ESLint relacionado: 0 erros.
- Deploy não executado; a implantação das novas imagens permanece pendente.

---

## [2026-07-30] Landing Page: 11 novos settings + 3 atualizados

### Feito

- Criados settings para: Image, Gallery, Video, PropertyCarousel, PropertyFeatured, PropertySearch, Map, Timeline, Testimonials, BrokerCard, Divider (11 novos)
- Atualizados: HeroWithForm (formSubtitle, height, textColor, badges), Features (layout), Stats (columns, animated)
- Registrados todos os 14 components no switch do PropertiesSidebar
- Corrigido import path em FeaturesBlockSettings (typo `../../../../` → `../../../`)
- Corrigidos 2 lint errors no CRM: Agenda unclosed div + LeadDetailsModal extra `</div>` + import fantasma `buildMatchWhatsappMessage`
- Build e type-check: passam com 0 erros

### Pendente

- Testar cada novo settings panel na UI do editor

## [2026-07-30] TemplateManager 500 em produção - global_templates

- Causa raiz: tabela `public.global_templates` inexistente em produção; PostgREST retorna `PGRST205` (schema cache), mas `admin-templates.js` só tratava `42P01`.
- Código: adicionado helper `isMissingTable` em `server/routes/admin-templates.js` (42P01/PGRST205/msg), mesmo padrão do restante do repo.
- Runner: `migrations/20260713_global_templates.sql` adicionada à lista de `scripts/run-migrations.mjs`.
- Produção: migração executada via `exec_sql` (7 statements OK) em `epgaftsjmqmpczvzsrcc.supabase.co`; tabela criada, RLS + 2 policies ativas.
- Verificado: SELECT em `global_templates` retorna 0 linhas; seed dos 9 templates padrão ocorre no primeiro GET por organização.
