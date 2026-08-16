# Planejamento: Painel Mega Admin Separado

**Status**: PLANEJAMENTO
**Data**: 2026-07-25
**Autor**: Orquestrador + Maestro

---

## 1. Visão Geral

### Hierarquia Atual vs Proposta

```
ATUAL (achatarado):
  superadmin → gerencia tudo (imobiliárias, planos, billing, suporte, etc.)

PROPOSTO (hierárquico):
  mega admin (dono do sistema) → gerencia super admins (resellers/whitelabels)
    super admin (reseller/whitelabel) → gerencia suas imobiliárias
      imobiliária (admin/broker) → gerencia sua equipe e operação
```

### Por que o painel precisa ser separado

1. **Segurança**: Super admins (resellers) não devem ver configurações globais da plataforma
2. **Escopo**: Cada reseller só deve ver SUAS imobiliárias, não todas
3. **Responsabilidade**: Mega admin cuida da plataforma; super admin cuida de seus clientes
4. **Escalabilidade**: Separar permite evoluir cada painel independentemente

---

## 2. Estado Atual

### O que já existe

| Componente                              | Status | Observação                                  |
| --------------------------------------- | ------ | ------------------------------------------- |
| Role `superadmin` no AuthContext        | ✅     | `role: 'admin' \| 'broker' \| 'superadmin'` |
| `organizations.is_reseller`             | ✅     | Boolean no banco, já usado em queries       |
| `organizations.parent_id`               | ✅     | UUID FK, já usado em RLS policies           |
| `isMegaAdmin` no SuperAdminLayout       | ⚠️     | Só muda o título, não filtra nada           |
| `isMegaAdmin` nos Layouts (Rural/Urban) | ⚠️     | Só muda label do link "Super Admin"         |
| `verifySuperAdmin` no backend           | ✅     | Checa `role === 'superadmin'`               |
| Rotas `/superadmin/*`                   | ✅     | 18 sub-rotas em App.tsx                     |
| `SuperAdminGuard`                       | ✅     | Redireciona superadmins para `/superadmin`  |

### O que falta

- Não existe role `megaadmin` separado — ambos usam `superadmin`
- Não existe rota `/megaadmin/*`
- Não existe `MegaAdminGuard`
- Não existe `MegaAdminLayout`
- Não existe `verifyMegaAdmin` no backend
- SuperAdminLayout mostra TODOS os 18 itens de navegação para todos
- TenantManager lista TODAS as imobiliárias, sem filtrar por reseller

---

## 3. Modelo de Dados

### Decisão: Não criar role separada

Usar a mesma role `superadmin` para ambos, diferenciando por:

- **Mega Admin**: `role === 'superadmin' && (!organization_id || !organization?.is_reseller)`
- **Super Admin (Reseller)**: `role === 'superadmin' && organization?.is_reseller === true`

**Por quê?**

- Evita migração de dados (não precisa atualizar profiles existentes)
- Compatível com o sistema de impersonation atual
- Mais simples de manter no backend

### Schema existente (suficiente)

```sql
-- organizations
is_reseller BOOLEAN DEFAULT false    -- true = é um reseller/whitelabel
parent_id UUID REFERENCES organizations(id)  -- imobiliárias apontam para seu reseller

-- profiles
role TEXT  -- 'superadmin', 'admin', 'broker'
organization_id UUID REFERENCES organizations(id)
```

### Index necessário

```sql
CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_is_reseller ON organizations(is_reseller);
```

---

## 4. Arquitetura do Mega Admin Panel

### 4.1 Rotas

```
/megaadmin                          → Dashboard (visão global da plataforma)
/megaadmin/resellers                → Gerenciar Super Admins/Resellers
/megaadmin/resellers/:id            → Detalhes de um Reseller
/megaadmin/analytics                → Analytics global da plataforma
/megaadmin/monitoring               → Monitoramento de saúde
/megaadmin/billing                  → Billing global (MRR, churn, etc.)
/megaadmin/feature-flags            → Feature flags da plataforma
/megaadmin/audit-log                → Audit log global
/megaadmin/settings                 → Configurações globais
```

### 4.2 Navegação do Mega Admin

```tsx
const megaNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/megaadmin' },
  { icon: Building2, label: 'Resellers', path: '/megaadmin/resellers' },
  { icon: BarChart3, label: 'Analytics', path: '/megaadmin/analytics' },
  { icon: Activity, label: 'Monitoring', path: '/megaadmin/monitoring' },
  { icon: DollarSign, label: 'Billing', path: '/megaadmin/billing' },
  {
    icon: ToggleRight,
    label: 'Feature Flags',
    path: '/megaadmin/feature-flags',
  },
  { icon: ScrollText, label: 'Audit Log', path: '/megaadmin/audit-log' },
  { icon: Settings, label: 'Configurações', path: '/megaadmin/settings' },
];
```

### 4.3 Navegação do Super Admin (reduzida)

```tsx
const superNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/superadmin' },
  { icon: Building2, label: 'Imobiliárias', path: '/superadmin/tenants' },
  { icon: Users, label: 'Equipe', path: '/superadmin/team' },
  { icon: CreditCard, label: 'Planos', path: '/superadmin/plans' },
  { icon: DollarSign, label: 'Billing', path: '/superadmin/billing' },
  { icon: HelpCircle, label: 'Suporte', path: '/superadmin/support' },
  { icon: ScrollText, label: 'Audit Log', path: '/superadmin/audit-log' },
  { icon: Megaphone, label: 'Marketing', path: '/superadmin/marketing' },
  { icon: Layout, label: 'Templates', path: '/superadmin/templates' },
  { icon: Globe, label: 'Domínios', path: '/superadmin/domains' },
  { icon: Calendar, label: 'Consultoria', path: '/superadmin/consulting' },
  { icon: Settings, label: 'Configurações', path: '/superadmin/settings' },
];
```

**Removidos do Super Admin (movidos para Mega):**

- Analytics (agora é global)
- Monitoring (agora é global)
- Feature Flags (agora é global)
- Importador IA (ferramenta do mega admin)
- Migração FluowAI (ferramenta do mega admin)
- Storage Intelligence (ferramenta do mega admin)

---

## 5. Componentes a Criar

### 5.1 Frontend

| Arquivo                                  | Descrição                                  | Prioridade |
| ---------------------------------------- | ------------------------------------------ | ---------- |
| `views/megaadmin/MegaAdminLayout.tsx`    | Layout com sidebar mega admin              | ALTA       |
| `views/megaadmin/Dashboard.tsx`          | Dashboard global (resellers, tenants, MRR) | ALTA       |
| `views/megaadmin/ResellerManager.tsx`    | CRUD de resellers/whitelabels              | ALTA       |
| `views/megaadmin/PlatformAnalytics.tsx`  | Analytics global                           | MÉDIA      |
| `views/megaadmin/PlatformMonitoring.tsx` | Health check global                        | MÉDIA      |
| `views/megaadmin/BillingOverview.tsx`    | Billing global                             | MÉDIA      |
| `views/megaadmin/FeatureFlags.tsx`       | Feature flags da plataforma                | MÉDIA      |
| `views/megaadmin/AuditLog.tsx`           | Audit log global                           | MÉDIA      |
| `views/megaadmin/GlobalSettings.tsx`     | Configurações globais                      | MÉDIA      |
| `components/MegaAdminGuard.tsx`          | Guard para mega admin                      | ALTA       |

### 5.2 Backend

| Arquivo                       | Descrição                   | Prioridade |
| ----------------------------- | --------------------------- | ---------- |
| `server/middleware/auth.js`   | Adicionar `verifyMegaAdmin` | ALTA       |
| `server/routes/mega-admin.js` | Rotas CRUD para resellers   | ALTA       |

### 5.3 Migrações

| Arquivo                                  | Descrição                              | Prioridade |
| ---------------------------------------- | -------------------------------------- | ---------- |
| `migrations/XX_add_indexes_reseller.sql` | Índices em `parent_id` e `is_reseller` | ALTA       |

---

## 6. Fluxos Principais

### 6.1 Login como Mega Admin

```
1. Usuário faz login (role: 'superadmin', organization: null ou não-reseller)
2. SuperAdminGuard detecta: role === 'superadmin' && !isImpersonating
3. SuperAdminGuard redireciona para /megaadmin (NOVO: detectar mega vs super)
4. MegaAdminGuard permite acesso
5. MegaAdminLayout renderiza sidebar com navegação global
```

### 6.2 Login como Super Admin (Reseller)

```
1. Usuário faz login (role: 'superadmin', organization.is_reseller: true)
2. SuperAdminGuard detecta: role === 'superadmin' && !isImpersonating
3. SuperAdminGuard redireciona para /superadmin
4. SuperAdminLayout renderiza sidebar com navegação reduzida
5. TenantManager filtra: organizations.parent_id = my_org_id
```

### 6.3 Criar novo Reseller (Mega Admin)

```
1. Mega Admin acessa /megaadmin/resellers
2. Clica "Novo Reseller"
3. Preenche: nome, email do owner, niche (rural/traditional)
4. Backend cria: organization (is_reseller=true) + profile (role=superadmin)
5. Reseller aparece na lista
```

### 6.4 Reseller cria Imobiliária

```
1. Reseller acessa /superadmin/tenants
2. Clica "Nova Imobiliária"
3. Preenche: nome, slug, owner, plano
4. Backend cria: organization (parent_id=reseller_org_id)
5. Imobiliária aparece apenas para este reseller
```

---

## 7. Alterações em Arquivos Existentes

### 7.1 `components/SuperAdminGuard.tsx`

```tsx
// ATUAL: redireciona TODOS superadmins para /superadmin
if (profile?.role === 'superadmin' && !isImpersonating) {
  return <Navigate to="/superadmin" replace />;
}

// PROPOSTO: diferenciar mega vs super
if (profile?.role === 'superadmin' && !isImpersonating) {
  const isMegaAdmin = !profile?.organization?.is_reseller;
  if (isMegaAdmin && !path.startsWith('/megaadmin')) {
    return <Navigate to="/megaadmin" replace />;
  }
  if (!isMegaAdmin && !path.startsWith('/superadmin')) {
    return <Navigate to="/superadmin" replace />;
  }
}
```

### 7.2 `views/superadmin/SuperAdminLayout.tsx`

```tsx
// ATUAL: tem isMegaAdmin mas só muda título
const isMegaAdmin =
  profile?.role === 'superadmin' && !profile?.organization?.is_reseller;
const panelTitle = isMegaAdmin ? 'Mega Admin' : 'Super Admin';

// PROPOSTO: SuperAdminLayout só mostra navegação de super admin
// Mega admin tem seu próprio layout separado
// Remover completamente a lógica isMegaAdmin daqui
```

### 7.3 `views/superadmin/TenantManager.tsx`

```tsx
// ATUAL: lista TODAS as imobiliárias
const { data, error } = await supabase.from('organizations').select('*');

// PROPOSTO: filtra por parent_id (só imobiliárias do meu reseller)
let query = supabase.from('organizations').select('*');
if (profile?.organization?.is_reseller) {
  query = query.eq('parent_id', profile.organization_id);
}
```

### 7.4 `views/superadmin/Dashboard.tsx`

```tsx
// ATUAL: conta TODAS as imobiliárias da plataforma
// PROPOSTO: conta só as imobiliárias deste reseller
// Mega admin usa um dashboard separado
```

### 7.5 `App.tsx`

```tsx
// ADICIONAR: rotas do mega admin
<Route
  path="/megaadmin"
  element={
    <ProtectedRoute>
      <MegaAdminLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<MegaAdminDashboard />} />
  <Route path="resellers" element={<ResellerManager />} />
  <Route path="analytics" element={<PlatformAnalytics />} />
  <Route path="monitoring" element={<PlatformMonitoring />} />
  <Route path="billing" element={<BillingOverview />} />
  <Route path="feature-flags" element={<FeatureFlags />} />
  <Route path="audit-log" element={<MegaAuditLog />} />
  <Route path="settings" element={<MegaGlobalSettings />} />
</Route>
```

### 7.6 `components/RuralLayout.tsx` e `components/UrbanLayout.tsx`

```tsx
// ATUAL: link "Mega Admin" ou "Super Admin" para /superadmin
// PROPOSTO: mega admin vê link para /megaadmin, super admin vê link para /superadmin
```

### 7.7 `context/AuthContext.tsx`

```tsx
// ADICIONAR: helper para distinguir mega vs super
const isMegaAdmin =
  profile?.role === 'superadmin' && !profile?.organization?.is_reseller;
const isSuperAdmin =
  profile?.role === 'superadmin' && profile?.organization?.is_reseller;
```

### 7.8 Backend: `server/middleware/auth.js`

```js
// ADICIONAR: verifyMegaAdmin
export const verifyMegaAdmin = (req, res, next) => {
  verifyAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.userRole !== 'superadmin') {
      return res
        .status(403)
        .json({ error: 'Acesso negado: Requer Mega Admin' });
    }
    // Mega admin = superadmin SEM organization ou com org NÃO-reseller
    if (req.realOrgId && req.isReseller) {
      return res
        .status(403)
        .json({ error: 'Acesso negado: Requer Mega Admin' });
    }
    next();
  });
};
```

### 7.9 Backend: `server/routes/mega-admin.js`

```js
// Rotas CRUD para resellers
router.get('/resellers', verifyMegaAdmin, listResellers);
router.post('/resellers', verifyMegaAdmin, createReseller);
router.put('/resellers/:id', verifyMegaAdmin, updateReseller);
router.delete('/resellers/:id', verifyMegaAdmin, deleteReseller);
router.get('/stats', verifyMegaAdmin, platformStats);
```

---

## 8. Segurança

### 8.1 Guard Chain

```
MegaAdminGuard: role=superadmin && !org.is_reseller → /megaadmin
SuperAdminGuard: role=superadmin && org.is_reseller → /superadmin
PanelGuard: role=admin/broker → /urban ou /rural
```

### 8.2 Isolamento de Dados

- **Mega admin**: vê TODOS os resellers e TODAS as imobiliárias (via service role)
- **Super admin (reseller)**: vê APENAS suas imobiliárias (`parent_id = my_org_id`)
- **Backend**: `verifyMegaAdmin` força acesso via service role, ignora tenant isolation

### 8.3 RLS

- Policies existentes já suportam `parent_id`
- Mega admin usa service role (bypass RLS) ou cria policy específica

---

## 9. Ordem de Implementação

### Fase 1: Fundação (ALTA)

1. Criar `DEV/SPECS/MEGA_ADMIN_PANEL.md` (este documento)
2. Criar `MegaAdminGuard.tsx`
3. Criar `views/megaadmin/MegaAdminLayout.tsx`
4. Criar `views/megaadmin/Dashboard.tsx`
5. Adicionar rotas `/megaadmin/*` no `App.tsx`
6. Modificar `SuperAdminGuard.tsx` para diferenciar mega vs super
7. Adicionar `verifyMegaAdmin` no backend

### Fase 2: Resellers (ALTA)

8. Criar `views/megaadmin/ResellerManager.tsx`
9. Criar `server/routes/mega-admin.js`
10. Adicionar rotas no `server/index.js`

### Fase 3: Super Admin Reduzido (MÉDIA)

11. Modificar `SuperAdminLayout.tsx` (remover nav items do mega)
12. Modificar `TenantManager.tsx` (filtrar por parent_id)
13. Modificar `Dashboard.tsx` (filtrar por parent_id)
14. Remover FeatureFlags e GlobalSettings do SuperAdmin (agora são mega)

### Fase 4: Polish (BAIXA)

15. Criar `PlatformAnalytics.tsx`
16. Criar `PlatformMonitoring.tsx`
17. Criar `BillingOverview.tsx`
18. Criar `FeatureFlags.tsx` (mega)
19. Criar `AuditLog.tsx` (mega)
20. Criar `GlobalSettings.tsx` (mega)
21. Modificar `RuralLayout.tsx` e `UrbanLayout.tsx` (links corretos)
22. Migration SQL para índices

---

## 10. Riscos e Mitigações

| Risco                                     | Impacto | Mitigação                                                         |
| ----------------------------------------- | ------- | ----------------------------------------------------------------- |
| Quebrar acesso de super admins existentes | ALTO    | Testar login com reseller ANTES de deploy                         |
| Confusão de roles                         | MÉDIO   | Usar helpers `isMegaAdmin`/`isSuperAdmin` em vez de checks inline |
| RLS não filtra corretamente               | ALTO    | Testar queries com service role vs user role                      |
| Backend não diferencia mega vs super      | ALTO    | `verifyMegaAdmin` deve verificar `!org.is_reseller`               |
| Layout quebrado em mobile                 | BAIXO   | Seguir padrão existente do SuperAdminLayout                       |

---

## 11. Perguntas para o Maestro

1. **Criar role `megaadmin` separada ou manter `superadmin` para ambos?** (Proposta: manter `superadmin`)
2. **Quais views do Super Admin atual devem ser EXCLUSIVAS do Mega Admin?**
   - Feature Flags → Mega? ou ambos?
   - Global Settings → Mega? ou split?
   - Analytics → Mega (global) ou Super (por reseller)?
   - Monitoring → Mega? ou ambos?
3. **O reseller deve ver MRR próprio ou apenas o global?**
4. **Devo criar a migração SQL para índices ou executar manualmente?**
5. **Prioridade: implementar Mega Admin primeiro ou corrigir o Super Admin existente primeiro?**
