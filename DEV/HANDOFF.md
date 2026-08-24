# Handoff

## 2026-08-23 — Agentes de IA com prompt editável e conexão de canais

- A aba de agentes da operação agora orienta a configuração profissional e leva diretamente para editar, conectar canal ou testar cada agente.
- `views/AIAgentDetail.tsx` passou a ter editor de prompt editável, checklist de conversa profissional, salvamento via `/api/ai/agents/:id/prompt` e aba `Canais`.
- A aba `Canais` permite criar regra para WhatsApp, Instagram ou Webchat, com bloqueio quando houver humano ativo.
- `server/api/ai/agents.routes.js` agora devolve versões do agente no `GET /agents/:id` e salva prompt em `ai_agent_versions`; quando não há versão ativa, cria uma versão inicial ou cai para `instructions` no schema legado.
- `services/aiWorkforce.ts` ganhou chamadas para atualizar agente e criar regra de canal.
- Verificação concluída: `node --check server/api/ai/agents.routes.js` e `git diff --check` passaram.
- Verificação inconclusiva: `npm run type-check`, `npx tsc --noEmit`, `npm run build` e ESLint focado ficaram sem saída por tempo prolongado e foram interrompidos; não houve erro exibido antes da interrupção.

## 2026-08-23 — Redirecionamento direto para painel por perfil

- A rota `/` não exibe mais a vitrine para quem já está autenticado e com perfil carregado; agora redireciona diretamente para o painel correto.
- Regra central: `src/lib/panelNavigation.ts`.
- Destinos:
  - Mega admin real: `/megaadmin`.
  - Revenda/Super Admin sem impersonação: `/superadmin`.
  - Conta rural ou impersonação rural: `/rural`.
  - Conta urbana/traditional: `/urban`.
  - Conta sem organização: `/onboarding`.
- Build de produção e ESLint direcionado passaram.
- Ainda precisa subir nova imagem Docker/Portainer para produção refletir o novo bundle.

## 2026-08-23 — Migração Lalbero CVCRM

- A migração de cadastro não está limitada a 50: existem 4.867 leads no Supabase para a organização Lalbero (`391d8df5-7297-42bd-a443-1aca77b1f0a1`).
- O problema visual/operacional é o status: todos estão em `Em Atendimento`, enquanto as colunas oficiais do Kanban usam outros IDs. O Kanban carrega 50 por etapa inicialmente e possui paginação por botão.
- Não há histórico importado: `lead_activities = 0` e `chat_messages = 0` para Lalbero.
- `scripts/migrateCvcrmLeads.js` foi refeito para dry-run por padrão, sem credenciais hardcoded, com modos `--audit`, `--reorganize`, `--leads` e `--interactions`.
- Dry-run de reorganização alvo: `Novo` 4.790, `Qualificação` 47, `Perdido` 28, `Fechado` 1, `Simulação` 1.
- Para aplicar a organização do Kanban: `node --env-file=.env scripts\migrateCvcrmLeads.js --reorganize --apply`.
- Para importar histórico, configurar `CVCRM_EMAIL` e `CVCRM_TOKEN` no ambiente e rodar primeiro dry-run: `node --env-file=.env scripts\migrateCvcrmLeads.js --interactions --limit=50`; depois aplicar com `--apply` se a amostra estiver correta.
- Nenhuma escrita em banco foi executada nesta investigação.

## 2026-08-23 — Hotfix de recursão RLS em profiles

- Após aplicar `20260823_fix_reseller_tenant_isolation.sql`, o login que consulta `public.profiles` começou a falhar com HTTP 500 / `42P17 infinite recursion detected in policy for relation "profiles"`.
- Causa: policy de SELECT em `profiles` chamava helpers que também leem `profiles`; isso recursiona na própria tabela.
- Criada migration `migrations/20260823_fix_profiles_rls_recursion.sql`: remove policies recursivas (`profiles_select_same_org_or_reseller_or_mega`, `profiles_update_same_reseller_team`, legadas) e recria apenas `profiles_select_own` e `profiles_update_self`, ambas sem subqueries.
- Decisão implementada: leitura/edição administrativa cross-user em `profiles` agora passa por backend service-role com escopo explícito, não por RLS direta no browser.
- Novas rotas: `GET/PATCH /api/admin/users` para usuários do tenant atual e `GET/PATCH /api/admin/team` para equipe Super Admin da própria organização.
- `views/admin/UserManagement.tsx` e `views/superadmin/TeamManager.tsx` deixaram de consultar `profiles` diretamente.
- Próximo passo imediato: aplicar a migration no Supabase, subir nova imagem Docker/Portainer e retestar o profile bootstrap do usuário `df587a67-d525-4e01-9ff6-c82ba596fb13` + isolamento da tela de usuários.

## 2026-08-23 — Correção crítica de isolamento Super Admin / Revenda

- Backend de `/api/admin/organizations` agora calcula escopo `mega`/`reseller`/`tenant` uma vez e reaplica em listagem, criação, edição, exclusão unitária, exclusão em lote, vínculo de perfil e modo suporte.
- Revenda só gerencia organizações filhas com `parent_id = req.realOrgId` e `is_reseller = false`; mega admin real segue com escopo global.
- Fallback de listagem via token e fallback direto via Postgres agora respeitam o mesmo escopo.
- Frontend: `views/admin/UserManagement.tsx` filtra usuários pelo tenant em modo suporte; `views/superadmin/TeamManager.tsx` limita revendas à própria equipe.
- Migration pronta: `migrations/20260823_fix_reseller_tenant_isolation.sql` redefine `public.is_superadmin()` como mega admin real, cria helpers de revenda e recria policies de `organizations`, `profiles` e `superadmin_bypass`.
- Verificação local passou: node check, Vitest direcionado 5/5, type-check, build, lint com código zero e `git diff --check`.
- Nenhum commit, push, deploy ou migration em banco foi executado.
- Próximo passo obrigatório: aplicar a migration em homologação e testar negativo/positivo com mega admin, duas revendas e imobiliárias/leads/usuários separados.

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
