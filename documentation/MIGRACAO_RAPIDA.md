# ✅ PASSO A PASSO - EXECUTAR MIGRAÇÕES SUPABASE

## 📊 Status Atual

```
✅ Frontend:   http://localhost:3005  [RODANDO]
✅ Backend:    http://localhost:3002  [RODANDO]
❌ Banco:      [SEM TABELAS - PRECISA MIGRAÇÃO]
```

**Erro no console:**
```
Cannot find the table 'public.landing_pages' in schema cache
```

---

## 🎯 Solução (5 MINUTOS)

### PASSO 1: Abra o Supabase Dashboard
```
https://app.supabase.com
```
Se não estiver logado, faça login com sua conta.

---

### PASSO 2: Abra o SQL Editor
1. **Menu esquerdo** → `SQL Editor`
2. Clique em **`New query`** (botão azul superior direito)

---

### PASSO 3: Execute o Schema Principal

**Arquivos nesta ordem:**

```
1️⃣  definitive_imobzy_schema.sql  ← EXECUTE PRIMEIRO!
2️⃣  fix_role_and_permissions_v2.sql
3️⃣  fix_rpc_final.sql
4️⃣  fix_landing_pages_rls.sql
5️⃣  setup_landing_pages.sql
```

**Para cada arquivo:**

1. **Volte ao seu projeto local**
   - Abra o arquivo `.sql` em seu editor de texto (VSCode, Sublime, etc)

2. **Copie TODO o conteúdo**
   - Selecione tudo: `Ctrl+A`
   - Copie: `Ctrl+C`

3. **Cole no Supabase**
   - Na aba do SQL Editor do Supabase
   - Cole: `Ctrl+V`
   - Você verá o código SQL aparecer

4. **Execute**
   - Clique no botão **`Run`** (verde, canto superior direito)
   - Aguarde até aparecer "Success"

5. **Limpe e repita**
   - Clique em **`New query`** novamente
   - Repita para o próximo arquivo

---

## 📝 Detalhado (Com Imagens Mentais)

```
┌─────────────────────────────────────────────────────┐
│  SUPABASE DASHBOARD                                  │
│                                                      │
│  [Project] → SQL Editor                             │
│              ├─ New query  ← CLIQUE AQUI             │
│              └─ [Query editor em branco]             │
│                  ├─ Ctrl+V para colar                │
│                  ├─ Run button (verde)               │
│                  └─ Status: "Success!" ✅            │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 Verificar se Funcionou

**No seu terminal local, execute:**
```bash
npm run check-db
```

Se todos os ✅ aparecerem, está pronto!

---

## ❌ Se der erro...

### "Extension already exists"
- Isso é NORMAL quando PostGIS já está instalado
- Clique em **`Run anyway`** ou prossiga para o próximo arquivo

### "Table already exists"
- Você rodou as migrações antes
- No Supabase: delete as tabelas antigas e rode novamente
- Ou execute apenas `fix_role_and_permissions_v2.sql` em diante

### "Permission denied"
- Você está logado com a conta certa?
- Você tem acesso ao projeto? (Check em Project Settings)

### Query timeout
- Arquivo muito grande
- Tente dividir o arquivo SQL em partes menores
- Ou aumente o timeout em Supabase Settings

---

## 🚀 Depois que Terminar

1. **Recarregue seu app**
   ```
   F5 em http://localhost:3005
   ```

2. **Erros desaparecem**
   ```
   ✅ "landing_pages table" agora existe
   ✅ "Profile query" funciona
   ```

3. **Faça seu primeiro login**
   ```
   Use suas credenciais Supabase
   ```

4. **Crie sua primeira organização**
   ```
   Nome: Sua Imobiliária
   Slug: sua-imobiliaria
   ```

---

## 📚 Referências

- **Supabase Docs:** https://supabase.com/docs
- **SQL Editor:** https://app.supabase.com/ (seu projeto)
- **Schema Files:** Pasta raiz do projeto (`*.sql`)

---

## ⏱️ Timeline

| Passo | O quê | Tempo |
|-------|-------|-------|
| 1 | Abrir Supabase | 30s |
| 2 | Executar schema | 1min |
| 3 | Executar 4 fixes | 3min |
| 4 | Recarregar app | 30s |
| **TOTAL** | | **~5 min** |

---

## 💡 IMPORTANTE

- ⚠️ Execute os arquivos **NESSA ORDEM**
- ⚠️ Comece com `definitive_imobzy_schema.sql` PRIMEIRO
- ⚠️ Não pule nenhum arquivo
- ✅ Depois é só recarregar e aproveitar!

---

**Dúvidas?** Verifique:
- MIGRACAO_SUPABASE.md (mais detalhado)
- ANALISE_PROJETO.md (visão geral)
- Documentação oficial Supabase

🎉 **Pronto! Boa sorte!**
