# 🎯 PLANO DE AÇÃO EXECUTIVO - IMOBZY

## RESUMO EXECUTIVO
- **Status Atual:** 85% pronto (bloqueado por 17 erros TypeScript)
- **Tempo para Execução:** 3-5 horas
- **Risco:** BAIXO - principais issues identificadas e solucionáveis
- **Recomendação:** PROCEDER com Phase 1 imediatamente

---

## FASE 1: CORREÇÃO TypeScript (1-2 HORAS) ⚡
**Objetivo:** Colocar `npm run type-check` passando com ZERO erros

### PASSO 1.1: Criar vite-env.d.ts
**Arquivo:** `vite-env.d.ts` (criar na raiz)
**Por quê:** Define tipos para `import.meta.env`

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_PANEL_URL: string;
  readonly GEMINI_API_KEY?: string;
  readonly GROQ_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
```

**Impacto:** Remove ~5 erros (DomainSettings, UserManagement, DomainManager, DomainRouter)

---

### PASSO 1.2: Corrigir BIRural.tsx
**Arquivo:** `views/BIRural.tsx`
**Erros a corrigir:**
- Cannot find name 'Property'
- Cannot find name 'useEffect'
- Cannot find name 'supabase'

**Ação:**
```typescript
// NO TOPO DO ARQUIVO, ADICIONAR:
import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Property } from '@/types'; // ou do caminho correto

// Verificar imports já existentes e remover duplicatas
```

**Verificação:**
```bash
grep -n "import.*Property\|import.*useEffect\|import.*supabase" views/BIRural.tsx
```

---

### PASSO 1.3: Corrigir Info import
**Arquivo:** `views/admin/DomainSettings.tsx`
**Erro:** Cannot find name 'Info'
**Solução:**
```typescript
import { Info, Settings, Trash2, Save } from 'lucide-react'; // adicionar Info
```

---

### PASSO 1.4: Remover 'key' de Draggable
**Arquivo:** `components/LayoutEditor/EditorCanvas.tsx` (linha ~80)
**Erro:** Property 'key' does not exist on type 'DraggableProps'

**Antes:**
```typescript
<Draggable draggableId={id} index={i} key={id}>
  {(provided, snapshot) => (
    // ...
  )}
</Draggable>
```

**Depois:**
```typescript
<Draggable draggableId={id} index={i}>
  {(provided, snapshot) => (
    // React gerencia key automaticamente
  )}
</Draggable>
```

También corrigir em: `views/CRM/KanbanBoard.tsx` linha 198

---

### PASSO 1.5: Corrigir PropertyType Enum
**Arquivo:** `constants.tsx`
**Erro:** Property 'LAND', 'HOUSE' does not exist on type 'typeof PropertyType'

**Ação:**
1. Abrir `types.ts` e verificar PropertyType enum
2. Se não tem LAND/HOUSE, adicionar:
```typescript
export enum PropertyType {
  HOUSE = 'HOUSE',
  APARTMENT = 'APARTMENT',
  LAND = 'LAND',
  COMMERCIAL = 'COMMERCIAL',
  RURAL = 'RURAL',
  // ... outros
}
```

3. Se já tem mas com nomes diferentes, corrigir uso em `constants.tsx`

---

### PASSO 1.6: Corrigir ColorThief
**Arquivo:** `utils/colors.ts` (linha 7)
**Erro:** This expression is not constructable

**Antes:**
```typescript
import ColorThief from 'colorthief';
const thief = new ColorThief();
```

**Depois (opção 1):**
```typescript
const ColorThief = require('colorthief/dist/color-thief.umd');
const thief = new ColorThief();
```

**Ou (opção 2 - melhor):**
```typescript
import * as ColorThief from 'colorthief';
const thief = new (ColorThief as any)();
```

---

### PASSO 1.7: Corrigir Lead Type
**Arquivo:** `constants.tsx`
**Erro:** Property 'organization_id' is missing in type 'Lead'

**Ação:** Adicionar `organization_id` aos dados de exemplo:
```typescript
const MOCK_LEAD: Lead = {
  id: '1',
  organization_id: 'org-1', // ADICIONAR
  name: 'João Silva',
  email: 'joao@example.com',
  // ... resto dos dados
};
```

---

### PASSO 1.8: Corrigir BlockConfig Types
**Arquivos:**
- `services/ai.ts` linha 204
- `services/landingPageTemplates.ts` linhas 66, 187, 231, 256

**Erro:** Type mismatch em blockConfig

**Ação:** Verificar interface BlockConfig em `types/landingPage.ts` e remover/renomear propriedades não esperadas

**Exemplo fix:**
```typescript
// Em landingPageTemplates.ts linha 66
const statsBlock: BlockConfig = {
  type: 'stats', // ou 'StatsBlock'
  animated: true, // adicionar propriedade requerida
  stats: [
    { icon: 'TrendingUp', value: '500+', label: 'Properties' }
  ],
  columns: 4
};
```

---

### PASSO 1.9: Corrigir Analytics Types
**Arquivo:** `services/landingPages.ts` linhas 428-430, 592, 604-606
**Erro:** Type incompatibility em processamento de analytics

**Ação:** Adicionar type casts corretos:
```typescript
// Ao invés de qualquer tipo, ser explícito:
const referrerStats = data.map(item => ({
  referrer: item[0] as string,
  count: Number(item[1]) as number
}));
```

---

## FASE 2: VALIDAÇÃO (15-30 MINUTOS)
**Objetivo:** Confirmar que TypeScript passa

```bash
# Terminal 1: Verificar TypeScript
npm run type-check

# Esperado: Zero erros
# Se houver erros, voltar para Fase 1
```

---

## FASE 3: LINTING (5-10 SEGUNDOS)
**Objetivo:** Garantir código formatado

```bash
# Executar linting auto-fix novamente se necessário
npm run lint:fix

# Verificar resultado
npm run lint
```

---

## FASE 4: BUILD (30 SEGUNDOS)
**Objetivo:** Confirmar que build produção funciona

```bash
npm run build

# Esperado:
# ✓ XXX modules transformed
# ✓ built in XX.XXs
# Sem erros críticos
```

---

## FASE 5: CONFIGURAÇÃO AMBIENTE (30 MINUTOS)

### 5.1: Atualizar .env.local
```bash
# Criar ou editar .env.local com:
GEMINI_API_KEY=sua-chave-aqui
GROQ_API_KEY=sua-chave-aqui
PORT=3002
```

**Como obter as chaves:**
1. **Gemini:** https://makersuite.google.com/app/apikeys
2. **Groq:** https://console.groq.com (criar conta grátis)

### 5.2: Verificar Supabase
```bash
# Verificar conectividade
curl -H "Authorization: Bearer supabase_key" \
  https://ltrmgfdpqtvypsxeknyd.supabase.co/rest/v1/
```

### 5.3: Executar Migrações SQL
1. Acessar https://app.supabase.com/
2. Ir para SQL Editor
3. Executar arquivos .sql nesta ordem:
   - 01_schema_rural.sql
   - add_domain_rpc.sql
   - add_approval_column.sql
   - ... demais em sequência

---

## FASE 6: TESTE LOCAL (1-2 HORAS)

### 6.1: Terminal 1 - Backend
```bash
npm run server
# Esperado: 🔌 Servidor de Migração rodando na porta 3002
```

### 6.2: Terminal 2 - Frontend Dev
```bash
npm run dev
# Esperado:
# VITE v6.2.0  ready in XXX ms
# ➜  Local:   http://localhost:3005/
```

### 6.3: Testar no Browser
1. Abrir http://localhost:3005
2. Fazer login com credenciais Supabase
3. Navegar entre páginas
4. Verificar console por erros

### 6.4: Testes Automáticos
```bash
npm run test
# Implementar testes conforme necessário
```

---

## CHECKLIST FINAL ✅

Execute estes comandos em sequência. Todos devem passar:

```bash
# 1. TypeScript type-check (OBRIGATÓRIO)
npm run type-check
# ✅ Esperado: Zero erros

# 2. ESLint (OBRIGATÓRIO)
npm run lint
# ✅ Esperado: Zero erros ou <= 15 warnings

# 3. Build (OBRIGATÓRIO)
npm run build
# ✅ Esperado: ✓ built without critical errors

# 4. Testes (RECOMENDADO)
npm run test
# ⚠️ Esperado: Suite exists, implementar testes

# 5. Preview (VERIFICAÇÃO)
npm run preview
# ✅ Esperado: http://localhost:4173/
```

---

## ESTIMATIVA DE ESFORÇO

| Fase | Tarefa | Tempo | Responsável | DT |
|------|--------|--------|-------------|-----------|
| 1 | Criar vite-env.d.ts | 10 min | Dev | ✅ |
| 1 | Corrigir BIRural.tsx | 15 min | Dev | ✅ |
| 1 | Corrigir Info import | 5 min | Dev | ✅ |
| 1 | Remover 'key' de Draggable | 10 min | Dev | ✅ |
| 1 | Corrigir PropertyType | 15 min | Dev | ⏳ |
| 1 | Corrigir ColorThief | 10 min | Dev | ⏳ |
| 1 | Corrigir Lead type | 5 min | Dev | ⏳ |
| 1 | Corrigir BlockConfig | 20 min | Dev | ⏳ |
| 1 | Corrigir Analytics types | 15 min | Dev | ⏳ |
| 2 | Validação TypeScript | 2 min | Dev | ⏳ |
| 3 | Linting | 1 min | Dev | ⏳ |
| 4 | Build | 1 min | Dev | ⏳ |
| 5 | Configuração .env | 15 min | DevOps | ⏳ |
| 5 | Executar SQL migrações | 30 min | DBA | ⏳ |
| 6 | Teste local completo | 60 min | QA | ⏳ |
| - | **TOTAL** | **225 min** | Team | - |

---

## PRÓXIMOS PASSOS APÓS EXECUÇÃO

### Se tudo passar ✅
1. Commit das correções: `git add . && git commit -m "fix: resolve TypeScript and linting issues"`
2. Push para main: `git push origin main`
3. Deploy em staging
4. Teste em staging
5. Deploy em produção

### Se houver problemas ❌
1. Identificar erro específico
2. Consultar ANALISE_PROJETO.md para contexto
3. Corrigir no código
4. Repetir validação

---

## CONTATOS ÚTEIS

- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev/
- **React Docs:** https://react.dev
- **TypeScript Docs:** https://www.typescriptlang.org/

---

## NOTAS CRÍTICAS

⚠️ **NÃO fazer commit com:**
- Variáveis .env.local sensíveis
- node_modules/
- dist/ (será gerado no build)

✅ **Sempre fazer commit com:**
- Código-fonte corrigido
- package-lock.json
- Arquivos de configuração (.eslintrc, tsconfig, etc)

---

**Preparado por:** Claude Code Analysis
**Data:** 13 de Março de 2026
**Status:** Pronto para implementação imediata
