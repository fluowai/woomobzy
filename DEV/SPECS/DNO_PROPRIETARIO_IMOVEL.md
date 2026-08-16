# SPECS/DNO_PROPRIETARIO_IMOVEL.md — Dados do Dono do Imóvel (DNO)

**Status**: EM PROGRESSO (Fases 1-3 implementadas; migration APLICADA em produção; Fase 4 parcial)
**Data**: 2026-08-08
**Autoria**: análise da ideia do maestro + levantamento do código

---

## 1. Contexto / problema

Quando se cadastra um imóvel no CRM (urbano ou rural), **não se cadastram os dados do dono do imóvel (DNO)** — mesmo que o objetivo seja venda ou locação. Isso gera:

- O proprietário **não fica vinculado ao imóvel** (`properties.owner_id` nunca é gravado pelo frontend);
- No fluxo de locação, o corretor **digita os dados do locador na mão** (`StepOwnerData`) mesmo quando o imóvel já deveria "carregar" esses dados;
- Não há "puxar automaticamente" os dados do DNO em contratos, repasses (bordero), dossiês, etc.

**Requisito do maestro**: os dados do DNO devem ser **cadastrados junto com o imóvel** (venda ou aluguel) e **puxados automaticamente** quando necessário, porém **visíveis apenas dentro do CRM** — **nunca** no site público.

---

## 2. Análise do estado atual (evidência no código)

### 2.1 O modelo de dados JÁ suporta o DNO — falta o caminho de escrita

| Item                                                       | Onde                                                                                                                               | Estado                                                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `properties.owner_id` (FK → `clients.id`)                  | `migrations/v7_urbano_fase1_cadastros.sql:40`, lido em `views/urban/PortalProprietarioUrbano.tsx:86`                               | **Existe, mas NUNCA é gravado pelo frontend**                                                                    |
| Tabela `clients` (papel `'Proprietário'`/`'Proprietario'`) | `migrations/20260728_fix_backend_errors.sql:114`                                                                                   | Existe com RLS tenant-isolada (`get_my_org_id() OR is_superadmin()`)                                             |
| `properties.owner_info` (jsonb)                            | escrito apenas em `components/PropertySubmissionModal.tsx` (submissão pública), **lido em lugar nenhum**                           | Duplicado/legado; risco de vazamento (ver 2.3)                                                                   |
| Fluxo de locação pede dados do locador manualmente         | `src/components/lease/steps/StepOwnerData.tsx` (`owner_name`, `owner_cpf_cnpj`, `owner_email`, `owner_phone`, `owner_address_zip`) | Não é pré-preenchido a partir do imóvel                                                                          |
| Contrato de locação usa `nome_locador`/`cpf_locador`       | `src/components/lease/templates/TemplateEditor.tsx`, `StepContractGeneration.tsx`                                                  | Vem do `lease.owner_name` digitado à mão                                                                         |
| Portal do proprietário (urbano)                            | `views/urban/PortalProprietarioUrbano.tsx:64-87`                                                                                   | Busca client com role `['Proprietario']` + `.eq('owner_id', owner.id)` — **depende de `owner_id` estar gravado** |
| `clients.roles` inconsistente                              | `'Proprietário'` (com acento, comentário do schema) vs `'Proprietario'` (sem acento, usado no portal)                              | Precisa normalizar                                                                                               |

### 2.2 O frontend de cadastro de imóvel não expõe o dono

- `views/PropertyEditor.tsx` (2200 linhas, usado p/ urbano e rural) não tem seção de proprietário.
- `services/properties.ts:mapToDatabase` já mapeia `owner_info`, mas **não mapeia `owner_id`**.
- `server/api/properties/index.js` faz INSERT/PUT "pass-through": gravaria `owner_id` se o frontend enviasse.

### 2.3 RISCO CRÍTICO: dados de dono podem vazar no site público

Os sites públicos leem `properties` com `.select('*')` (todas as colunas):

- `services/sites.ts:345` → `supabase.from('properties').select('*')` + `.eq('show_on_site', true)`.
- `views/LandingPage.tsx:202` → `.select('*')` + status `'Disponível'`.
- `views/PublicLandingPage.tsx:188,199` e `views/PublicSite.tsx:110,142` → `.select('*')`.
- RLS pública `"Public read available properties"` (migração `20260808_fix_properties_rls_missing_policies.sql`) permite **anon** ler imóveis `Disponível` com **todas as colunas**.

**Conclusão**: NÃO devemos adicionar PII do dono como colunas de `properties` (nome/telefone/documento direto na tabela) — qualquer coluna nova vazaria no site via `.select('*')`. E o campo `owner_info` (jsonb) **já é um vetor de vazamento em potencial** quando o imóvel tem `show_on_site`/`Disponível` + `owner_info` preenchido (ex.: submissão pública). Isso precisa ser corrigido junto.

---

## 3. Decisão de arquitetura

**O DNO mora em `clients` (papel `Proprietário`); `properties.owner_id` é a única referência no imóvel.**

```
properties.owner_id ──(FK)──> clients.id (roles = ['Proprietário'])
                                 ├─ name, document_number/type, email, phone
                                 ├─ endereço (address_*)
                                 └─ metadata/bank (futuro, p/ repasse)
```

- **Nenhum PII em `properties`**: só o UUID de referência `owner_id`.
- **Criação idempotente**: o fluxo de cadastro **cria ou reusa** o client proprietário (busca por documento/telefone/e-mail dentro da mesma org) antes de gravar `owner_id`.
- **Puxada automática**: qualquer tela que precise do dono (locação, contrato, bordero, dossiê) busca `properties.owner_id` → `clients` (via RPC/join ou `GET /api/crm/clients`), sem redigitar.
- **Visibilidade CRM-only**: como o PII vive em `clients` (sem policy anon, RLS tenant-isolada), ele **nunca** chega ao site. `properties` no site continua expondo só os campos de vitrine (após hardening das projeções).

---

## 4. Plano de implementação

### Fase 1 — Fundação de dados (migration)

Arquivo: `migrations/20260808_property_owner_dno.sql` (novo)

1. Normalizar `clients.roles`: garantir valor canônico `'Proprietário'` e manter compatibilidade com `'Proprietario'` (ou adotar um único e ajustar `PortalProprietarioUrbano` e `ClientsManager`).
2. Criar índice `properties.owner_id` (se não existir) para o join do portal/filtros.
3. **Hardening anti-vazamento (crítico, independente do DNO)**:
   - Policy pública de leitura passa a conceder apenas uma **view/projeção de vitrine** ou lista de colunas (impedir anon de ler `owner_info`/colunas sensíveis). Opção recomendada: **view `public_available_properties`** com apenas colunas de vitrine + ajustar os `.select('*')` dos sites públicos para a view, ou RLS por coluna (Postgres não tem nativo → view é o caminho).
   - Manter `owner_info` legado somente se necessário; a fonte da verdade passa a ser `clients` + `owner_id`.
4. Adicionar à lista canônica de `scripts/run-migrations.mjs`.

### Fase 2 — Cadastro do DNO no cadastro do imóvel

Arquivos: `views/PropertyEditor.tsx`, `services/properties.ts`, `server/api/crm/clients` (rotas já existem)

1. Nova seção "Proprietário (DNO)" no `PropertyEditor` (urbano e rural):
   - Campos: Nome/Razão, CPF/CNPJ, e-mail, telefone, endereço (CEP via busca opcional).
   - **Busca incremental**: ao digitar CPF/CNPJ/telefone/e-mail, pesquisa em `clients` da org (papel Proprietário) — se existir, preenche e só vincula; se não, permite criar.
   - Select de proprietário existente (igual padrão do seletor de cliente já usado em outros fluxos).
2. `services/properties.ts:mapToDatabase`: mapear `owner_id` (e remover `owner_info` do payload, se decidirmos descontinuá-lo).
3. `handleSave` do `PropertyEditor`: antes de criar/atualizar o imóvel, **create-or-resolve** do client proprietário via `clientService.create`/busca → setar `owner_id` no payload.

### Fase 3 — Puxada automática do DNO

1. **Locação** (`src/components/lease`):
   - `StepProperty.tsx`: ao selecionar imóvel, carregar DNO (`property.owner_id` → `clients`) e preencher `owner_name`, `owner_cpf_cnpj`, `owner_email`, `owner_phone`, `owner_address_zip` automaticamente.
   - `StepOwnerData.tsx`: pré-preenchido (editable) + aviso "dados carregados do proprietário do imóvel".
   - `StepContractGeneration.tsx`/`TemplateEditor`: `nome_locador`/`cpf_locador` saem do DNO (fallback para os campos manuais atuais se não houver DNO).
2. **Bordero/repasse** (`views/RentalsBordero.tsx`): associar proprietário para split — consumir `owner_id` no lugar de "digitar de novo". (Campo de dados bancários do DNO pode entrar em `clients.metadata` nesta fase ou em fase futura.)
3. **Portal do proprietário**: `PortalProprietarioUrbano` já funciona se `owner_id` estiver gravado; validar e replicar para rural se aplicável.

### Fase 4 — Garantia de "CRM-only" (testes/verificação)

1. Auditoria: rodar busca por `.from('properties').select('*')` em views/componentes do site público e trocar pela **view de vitrine** (ou projeção explícita sem `owner_*`).
2. RLS: confirmar que `clients` não tem policy anon e que a policy pública de `properties` só expõe colunas de vitrine.
3. Testes positivos/negativos (RLS simulada): anon NÃO vê `owner_id`/`owner_info`; autenticado da org vê; outra org não vê.

---

## 5. Critérios de aceite

- [ ] Cadastrar imóvel (urbano e rural) permite cadastrar/vincular o DNO (novo ou existente) na mesma tela.
- [ ] `properties.owner_id` é gravado (novo e edição) e fica legível no CRM.
- [ ] Fluxo de locação: ao escolher o imóvel, os dados do locador **preenchem automaticamente**; contrato usa `nome_locador`/`cpf_locador` do DNO.
- [ ] Dados do DNO **não aparecem em nenhum site público** (LandingPage, PublicSite, PublicLandingPage, getSiteProperties) — verificado por query anon.
- [ ] Portal do proprietário urbano lista imóveis do dono (depende do `owner_id` gravado).
- [ ] Nenhum `.select('*')` público retorna `owner_id`/`owner_info`/dados de `clients`.
- [ ] Migration aplicada e verificada em dev/prod (`exec_sql`), adicionada à lista canônica.
- [ ] Gates: `npm run type-check`, `npm run lint`, build, testes relevantes.

---

## 6. Verificação (plano mínimo)

1. `exec_sql` da migration em dev/prod (idempotente).
2. RLS simulada: anon `SELECT` em `properties` → sem `owner_*`; `clients` → `[]` para anon.
3. UI: cadastrar imóvel com DNO novo e com DNO existente (CPF já cadastrado → vincula sem duplicar).
4. Fluxo de locação ponta a ponta: imóvel → DNO pré-preenchido → contrato com locador correto.
5. Site público: carregar LandingPage/PublicSite e inspecionar Network → nenhum campo de dono.

---

## 7. Riscos e decisões em aberto

- **Valor canônico de `clients.roles`**: `'Proprietário'` vs `'Proprietario'` — decidir um e ajustar `PortalProprietarioUrbano`/`ClientsManager`.
- **`owner_info` legado**: descontinuar ou manter como cache? Fonte da verdade = `clients` + `owner_id`.
- **Dados bancários do DNO** (repasse/bordero): entra nesta spec ou fase futura (candidato `clients.metadata` ou colunas dedicadas).
- **View de vitrine** vs projeção explícita nos sites: view reduz risco de esquecer coluna nova no futuro (recomendado).
- **DNO múltiplo por imóvel** (condomínio/matrícula compartilhada): fora de escopo nesta fase — assumir 1 DNO por imóvel (owner_id único).
- Working tree tem WIP de outras sessões — conferir `git status` antes de qualquer commit/push.
