# 🔧 GUIA COMPLETO - EXECUTAR MIGRAÇÕES SQL NO SUPABASE

## ❌ Problema Identificado

O seu app está mostrando este erro no console:
```
PGRST205: Could not find the table 'public.landing_pages' in the schema cache
```

**Significa:** As tabelas do banco de dados ainda não foram criadas no Supabase.

**Solução:** Executar os arquivos SQL de migração no painel do Supabase.

---

## ✅ SOLUÇÃO RÁPIDA (5 MINUTOS)

### Passo 1️⃣: Abrir o Painel do Supabase

1. Abra seu navegador
2. Vá para: **https://app.supabase.com/**
3. Faça login com sua conta
4. Selecione seu projeto IMOBZY

### Passo 2️⃣: Acessar o SQL Editor

1. Na barra lateral esquerda, procure por **"SQL Editor"**
2. Clique em **"SQL Editor"**
3. Você verá uma área em branco para escrever SQL

### Passo 3️⃣: Executar Primeiro Arquivo

**Arquivo 1 de 5: `definitive_imobzy_schema.sql`**

#### 3.1 - Localizar o arquivo
- Abra seu explorador de arquivos Windows
- Navegue até: `C:\Users\paulo\OneDrive\Área de Trabalho\IMOBZY\sql`
- Procure por: `definitive_imobzy_schema.sql`
- Abra com bloco de notas (clique direito → Abrir com → Bloco de Notas)

#### 3.2 - Copiar o conteúdo
- Pressione: **Ctrl + A** (selecionar tudo)
- Pressione: **Ctrl + C** (copiar)

#### 3.3 - Colar no Supabase
- Volta para o navegador (Supabase SQL Editor)
- Clique na área em branco
- Pressione: **Ctrl + V** (colar)

#### 3.4 - Executar
- Clique no botão **"Run"** (triângulo verde ▶️) no canto superior direito
- Aguarde a execução (pode levar alguns segundos)
- Você verá uma mensagem de sucesso ou erro

---

### Passo 4️⃣: Executar Segundo Arquivo

**Arquivo 2 de 5: `fix_role_and_permissions_v2.sql`**

#### 4.1 - Limpar editor
- Pressione: **Ctrl + A** (selecionar tudo no SQL Editor)
- Pressione: **Delete** (apagar)

#### 4.2 - Abrir novo arquivo
- No explorador, abra: `fix_role_and_permissions_v2.sql`
- Pressione: **Ctrl + A**
- Pressione: **Ctrl + C**

#### 4.3 - Colar e executar
- Volta para Supabase
- Pressione: **Ctrl + V**
- Clique: **Run** ▶️
- Aguarde conclusão

---

### Passo 5️⃣: Executar Terceiro Arquivo

**Arquivo 3 de 5: `fix_rpc_final.sql`**

Repita o mesmo processo:
1. Abra: `fix_rpc_final.sql`
2. Copie: **Ctrl + A** → **Ctrl + C**
3. Cole: **Ctrl + V** no Supabase
4. Execute: Clique **Run** ▶️

---

### Passo 6️⃣: Executar Quarto Arquivo

**Arquivo 4 de 5: `fix_landing_pages_rls.sql`**

Repita o processo:
1. Abra: `fix_landing_pages_rls.sql`
2. Copie e cole no Supabase
3. Clique: **Run** ▶️

---

### Passo 7️⃣: Executar Quinto Arquivo (Último)

**Arquivo 5 de 5: `setup_landing_pages.sql`**

Arquivo final:
1. Abra: `setup_landing_pages.sql`
2. Copie e cole no Supabase
3. Clique: **Run** ▶️

**🎉 Pronto! Todos os 5 arquivos foram executados!**

---

## ✔️ Verificar se Funcionou

### Via Terminal

Abra o terminal (PowerShell ou CMD) na pasta do projeto:

```bash
npm run check-db
```

**Resultado esperado:**
```
✅ organizations
✅ profiles
✅ properties
✅ leads
✅ landing_pages
✅ site_settings
✅ site_texts

✅ Todas as tabelas existem!
```

**Se ainda estiver ❌, significa que alguma migração falhou.**

---

## 🎯 Após as Migrações

### 1️⃣ Recarregar o App

Volta para seu navegador onde está rodando o IMOBZY:
- Pressione: **F5** (ou Ctrl + R)
- Aguarde recarregar

### 2️⃣ Verificar Console

- Pressione: **F12** (abrir Developer Tools)
- Vá para aba: **Console**
- Procure pelo erro PGRST205
- Se desapareceu: **✅ Tudo funcionando!**

### 3️⃣ Fazer Login

- Clique em **"Login"** ou **"Sign In"**
- Use suas credenciais Supabase
- Deve aparecer a tela do app normalmente

---

## 🆘 Se Algo Deu Errado

### ❌ Erro ao Executar um Arquivo

**Possíveis causas:**

1. **Arquivo já foi executado antes**
   - Mensagem: "relation already exists"
   - Solução: É normal! Continue com o próximo arquivo

2. **Sintaxe SQL errada**
   - Mensagem: "syntax error"
   - Solução: Verificar se copiou o arquivo completo (Ctrl + A)

3. **Foreign key constraint**
   - Mensagem: "violates foreign key constraint"
   - Solução: Executar os arquivos **na ordem correta**
   - Ordem: 1 → 2 → 3 → 4 → 5

### ❌ Tabelas ainda não aparecem após migrações

**Tente isso:**

```bash
npm run setup-db
```

Este comando vai:
1. Verificar as tabelas
2. Abrir o painel Supabase no navegador
3. Mostrar instruções se ainda faltarem tabelas

---

## 📋 Checklist Final

- [ ] Abri https://app.supabase.com/
- [ ] Fiz login no meu projeto IMOBZY
- [ ] Acessei o SQL Editor
- [ ] Executei `definitive_imobzy_schema.sql` ✅
- [ ] Executei `fix_role_and_permissions_v2.sql` ✅
- [ ] Executei `fix_rpc_final.sql` ✅
- [ ] Executei `fix_landing_pages_rls.sql` ✅
- [ ] Executei `setup_landing_pages.sql` ✅
- [ ] Recarreguei o app (F5) ✅
- [ ] Verifiquei console (F12) - sem erros ✅
- [ ] Rodei `npm run check-db` - todas tabelas ✅ ✅

---

## 🚀 Próximos Passos (Após Migrações)

Quando as migrações estiverem 100% prontas:

```bash
# Terminal 1 - Start Frontend (http://localhost:3005)
npm run dev

# Terminal 2 - Start Backend (http://localhost:3002)
npm run server
```

---

## 📁 Localização dos Arquivos SQL

Todos os arquivos estão em:
```
C:\Users\paulo\OneDrive\Área de Trabalho\IMOBZY\sql\
```

Você deve ver esses 5 arquivos:
1. `definitive_imobzy_schema.sql`
2. `fix_role_and_permissions_v2.sql`
3. `fix_rpc_final.sql`
4. `fix_landing_pages_rls.sql`
5. `setup_landing_pages.sql`

---

## 💡 Dicas Importantes

✅ **Execute os arquivos na ordem correta** (1, 2, 3, 4, 5)

✅ **Copie o arquivo COMPLETO** (não copie pela metade)

✅ **Após cada arquivo, aguarde a execução completar** (verde = sucesso)

✅ **Se um arquivo falhar, continue mesmo assim** (mensagens de "already exists" são normais)

✅ **Recarregue o app (F5) após terminar TODOS os 5 arquivos**

❌ **NÃO execute os mesmos arquivos 2 vezes** (pode causar conflicts)

---

## 📞 Se Precisar de Ajuda

Se algo não funcionar:

1. Anote a **mensagem de erro exata** que aparece
2. Verifique se está executando os arquivos **na ordem correta**
3. Tente executar o arquivo novamente
4. Se persistir, tente via CLI:

```bash
npm run run-migrations
```

---

## ✨ Resultado Esperado Após Tudo

No console do seu app (F12 → Console):
- ❌ Sem erros PGRST205
- ✅ Landing pages carregam normalmente
- ✅ Kanban board funciona
- ✅ Dashboard carrega todos os dados

**Seu IMOBZY estará 100% pronto para usar!** 🎉

