# Levantamento: Trabalho Não Commitado e Migrações Pendentes

**Data**: 2026-08-26
**Status**: CONCLUÍDO — Migrações executadas, código limpo, type-check + build passaram

---

## 1. Resumo Rápido

| Categoria | Itens |
|---|---|
| Arquivos modificados (unstaged) | 18 |
| Arquivos novos (untracked) | 13 |
| SQL com ALTER TABLE (precisa rodar) | 3 |
| SQL já no run-migrations.mjs | 5 (incluindo os 3 novos) |
| SQL fora do run-migrations.mjs | 8 |
| Arquivos de teste/debug (candidatos a deletar) | 5 |

---

## 2. Arquivos Modificados (não staged)

### Frontend — Módulo Urbano (FINANCEIRO/SIMULADOR)
| Arquivo | Mudança Principal |
|---|---|
| `views/urban/FinancialHub.tsx` | Unificado com Simulador 360: abas Crédito Imobiliário, Parcelamento Direto, Fiança Aluguel (+381 linhas) |
| `views/urban/FinanceiroUrbano.tsx` | Gráficos Recharts dinâmicos + modal de nova cobrança (+395 linhas) |
| `views/urban/Simulator360.tsx` | **DELETADO** — funcionalidade movida para FinancialHub |

### Frontend — Módulo Urbano (CADASTROS)
| Arquivo | Mudança Principal |
|---|---|
| `views/urban/AdmCondominios.tsx` | CRUD completo de condomínios com novos campos (cnpj, manager, contact, status) (+317 linhas) |
| `views/urban/ControleChaves.tsx` | Controle de chaves expandido (+345 linhas) |
| `views/urban/Empreendimentos.tsx` | Detalhes de empreendimentos/loteamentos com SVG map (+132 linhas) |
| `views/urban/LoteamentoDetails.tsx` | Detalhes do loteamento expandido (+109 linhas) |

### Frontend — Navegação e Contratos
| Arquivo | Mudança Principal |
|---|---|
| `App.tsx` | Novas rotas: `/urban/financialhub`, removida rota Simulator360 (+35 linhas) |
| `components/UrbanLayout.tsx` | Menu atualizado: Simulator removido, FinancialHub centralizado (+9 linhas) |
| `views/RentalsContractEditor.tsx` | Fluxo de assinatura digital integrado (+60 linhas) |

### Backend
| Arquivo | Mudança Principal |
|---|---|
| `server/routes/admin.js` | +3 linhas (novo endpoint ou middleware) |
| `server/api/locacao/index.js` | +4 linhas (registro de novas rotas de contrato) |
| `server/api/ai/agents.routes.js` | +16 linhas (ajustes nos agentes IA) |

### Infra
| Arquivo | Mudança Principal |
|---|---|
| `package.json` | Dependências adicionadas (pdf-lib? node-forge? node-signpdf?) |
| `package-lock.json` | Lock atualizado |
| `scripts/run-migrations.mjs` | 3 novas migrações adicionadas à lista |
| `migrations/20260826_social_media_schema.sql` | RLS corrigido: usa `profiles.organization_id` em vez de `organization_members` |
| `DEV/WORKLOG.md` | Log atualizado |

---

## 3. Arquivos Novos (untracked)

### Módulo de Assinatura Digital (NOVO)
| Arquivo | Descrição |
|---|---|
| `server/services/digitalSignatureService.js` | Gera certificados auto-assinados (PKI), assina PDFs com node-forge/node-signpdf |
| `server/api/locacao/internalSignature.routes.js` | API pública para portal de assinatura (GET doc, POST selfie+doc+location+whatsapp code, POST sign) |
| `server/api/locacao/contract.routes.js` | Gera e assina contrato de locação a partir dos dados do lease |
| `views/public/SignaturePortal.tsx` | Portal público de assinatura: selfie, documento, geolocalização, código WhatsApp, assinatura PDF |
| `migrations/20260826_signature_fields.sql` | Adiciona colunas: selfie_url, document_url, ip_address, geolocation, whatsapp_validation_code, token_hash |

### Módulo de Condomínios (NOVO)
| Arquivo | Descrição |
|---|---|
| `migrations/20260826_enhance_condominios.sql` | Adiciona: cnpj, manager_name, contact_email, contact_phone, zip_code, neighborhood, status |

### Módulo de Loteamentos (NOVO)
| Arquivo | Descrição |
|---|---|
| `migrations/20260826_loteamentos_mockup.sql` | Adiciona coluna svg_map na tabela developments |

### Migração Social Media (NOVO + MODIFICADO)
| Arquivo | Descrição |
|---|---|
| `migrations/20260826_social_media_schema.sql` | Tabelas social_accounts + social_posts com RLS via profiles |

### Scripts de Teste/Debug (NÃO COMMITAR)
| Arquivo | Descrição | Ação |
|---|---|---|
| `test-api.mjs` | Script de teste avulso | Deletar |
| `test-chat.cjs` | Script de teste de chat | Deletar |
| `test-chat.mjs` | Script de teste de chat (variante) | Deletar |
| `scratch.cjs` | Scratch/temp | Deletar |
| `run_my_migration.mjs` | Migração manual avulsa | Deletar |
| `scripts/alter.mjs` | Executa ALTER TABLE via DATABASE_URL direto | Deletar (usa migration正规) |

---

## 4. Migrações SQL — Status

### 4.1 Migrações NOVA no run-migrations.mjs (PRONTAS PRA RODAR)

Estas 3 migrações são novas, estão na lista do script e precisam ser executadas:

| # | Arquivo | O que faz | Risco |
|---|---|---|---|
| 1 | `20260826_enhance_condominios.sql` | `ALTER TABLE condominiums ADD COLUMN` (7 colunas) — IF NOT EXISTS, seguro | Baixo |
| 2 | `20260826_loteamentos_mockup.sql` | `ALTER TABLE developments ADD COLUMN svg_map` — IF NOT EXISTS, seguro | Baixo |
| 3 | `20260826_signature_fields.sql` | `ALTER TABLE signatures ADD COLUMN` (8 colunas) — IF NOT EXISTS, seguro | Baixo |

**Recomendação**: Rodar `npm run run-migrations` para aplicar todas as 21 migrações da lista.

### 4.2 Migrações NA NO run-migrations.mjs (PRECISAM DE ANÁLISE)

Estas migrações existem no diretório mas NÃO estão no array MIGRATIONS do script:

| # | Arquivo | Descrição | Recomendação |
|---|---|---|---|
| 1 | `20260819_rls_policies_and_indexes.sql` | Políticas RLS + índices | **Adicionar ao MIGRATIONS** ou verificar se já foi rodada manualmente |
| 2 | `20260820_fix_rls_organizations_and_sensitive_columns.sql` | Fix RLS organizations | **Adicionar ao MIGRATIONS** |
| 3 | `20260821_captacao_leads.sql` | Captação de leads | **Adicionar ao MIGRATIONS** |
| 4 | `20260823_fix_profiles_rls_recursion.sql` | Fix recursão RLS profiles | **Adicionar ao MIGRATIONS** (CRÍTICO — sem isso login quebra) |
| 5 | `20260823_fix_reseller_tenant_isolation.sql` | Isolamento reseller | **Adicionar ao MIGRATIONS** (CRÍTICO — sem isso isolamento não funciona) |
| 6 | `20260824_add_gemini_key_to_saas_settings.sql` | Chave Gemini no settings | **Adicionar ao MIGRATIONS** |
| 7 | `20260825_add_ai_provider_keys_to_saas_settings.sql` | Chaves de provedores AI | **Adicionar ao MIGRATIONS** |

> **ATENÇÃO**: As migrações 4 e 5 são CRÍTICAS. Se não foram rodadas em produção, o login está quebrado (recursão RLS) e o isolamento multi-tenant não funciona.

### 4.3 Migrações ANTIGAS não rastreadas (podem ter sido aplicadas)

| Arquivo | Status provável |
|---|---|
| `v7_urbano_fase1_cadastros.sql` | Provavelmente já aplicado manualmente |
| `v8_fix_bi_rpcs_and_views.sql` | Provavelmente já aplicado |
| Diversas `202605xx` e `202606xx` | Já aplicadas (commitadas há muito) |

---

## 5. Plano de Ação

### Fase 1: Limpeza (5 min)
- [ ] Deletar arquivos de teste/debug: `test-api.mjs`, `test-chat.cjs`, `test-chat.mjs`, `scratch.cjs`, `run_my_migration.mjs`, `scripts/alter.mjs`
- [ ] Verificar se `scripts/alter.mjs` tem algum uso programático — se não, deletar

### Fase 2: Migrações SQL (10 min)
- [ ] **PERGUNTA CRÍTICA**: As migrações `20260823_fix_profiles_rls_recursion.sql` e `20260823_fix_reseller_tenant_isolation.sql` já foram rodadas em produção?
  - Se NÃO: rodar ANTES de qualquer commit, pois o login pode estar quebrado
  - Se SIM: adicionar ao MIGRATIONS list para rastreamento
- [ ] Rodar `npm run run-migrations` (aplica todas as 21 da lista, incluindo as 3 novas)
- [ ] Adicionar as 7 migrações faltantes ao array MIGRATIONS em `scripts/run-migrations.mjs`

### Fase 3: Validação (15 min)
- [ ] `npm run type-check` — verificar TypeScript
- [ ] `npm run build` — verificar bundle de produção
- [ ] `npm run lint` — verificar erros de código
- [ ] Testar login + navegação urbana (FinancialHub, AdmCondominios, Empreendimentos)
- [ ] Testar portal de assinatura (`/sign/:token`)

### Fase 4: Commit (5 min)
- [ ] `git add` dos arquivos relevantes
- [ ] Commit com mensagem descrevendo: FinancialHub unificado, módulo assinatura digital, módulo condomínios, módulo loteamentos, social media schema, fix RLS
- [ ] NÃO commitar scripts de teste

### Fase 5: Deploy (após validação)
- [ ] Push para origin/main
- [ ] Build Docker/Portainer com novas imagens
- [ ] Verificar se `views/public/SignaturePortal.tsx` está acessível publicamente (sem auth)

---

## 6. Riscos Identificados

| Risco | Severidade | Mitigação |
|---|---|---|
| Migrações RLS não aplicadas → login quebrado em produção | **ALTA** | Verificar antes de commit. Se aplicadas em dev mas não em prod, rodar em prod primeiro |
| `digitalSignatureService.js` gera certificados auto-assinados (não A1) | **MÉDIA** | Funcional para MVP; upgrade para ICP-Brasil ou DocuSign futuro |
| `SignaturePortal.tsx` usa `any` em estados | **BAIXA** | Dívida técnica, não bloqueante |
| Simulator360.tsx deletado mas rota pode estar em cache do browser | **BAIXA** | Redirect no App.tsx já trata |
| Pacotes novos (pdf-lib, node-forge, node-signpdf) podem ter issues de build | **MÉDIA** | Verificar `npm run build` |

---

## 7. Perguntas para o Maestro

1. As migrações de RLS (`20260823_fix_profiles_rls_recursion` e `20260823_fix_reseller_tenant_isolation`) já foram aplicadas em produção?
2. O módulo de assinatura digital está pronto para commit ou precisa de mais testes?
3. Os scripts de teste (`test-*.mjs`, `scratch.cjs`) podem ser deletados ou algum tem valor?
4. Quer que eu execute as migrações SQL agora via `npm run run-migrations`?

---

## 8. Resultados Executados (2026-08-26)

### Migrações SQL
- [x] 7 migrações adicionadas ao MIGRATIONS list em `run-migrations.mjs`
- [x] 28 migrações executadas (21 via script + 5 via exec_sql manual + 2 com 0 statements OK)
- [x] Tabelas verificadas: whatsapp_cloud_credentials, connection_pool, connection_allocations, connection_billing, social_accounts, social_posts, signatures, condominiums, developments, organizations

### Código
- [x] Removido import de Simulator360 deletado (App.tsx)
- [x] Corrigido asgardpayService import (paymentService.ts)
- [x] Corrigido SocialMediaCalendar imports e destructuring
- [x] Adicionado svg_map à interface Development
- [x] `npm run type-check`: 0 erros
- [x] `npm run build`: 4070 módulos, sem erros

### Próximo Passo
Commit + push. Os arquivos de teste (test-api.mjs, test-chat.*, scratch.cjs, run_my_migration.mjs, scripts/alter.mjs) foram mantidos conforme decisão do maestro.
