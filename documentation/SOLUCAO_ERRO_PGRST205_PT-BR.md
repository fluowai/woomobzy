# 🔴 ERRO PGRST205 - SOLUÇÃO COMPLETA

## ❌ Erro Que Você Está Vendo

```
PGRST205: Could not find the table 'public.landing_pages' in the schema cache
```

**O que significa?**
- A tabela `landing_pages` não existe no banco de dados
- Todas as 5 migrações SQL precisam ser executadas
- Sem isso, o app não consegue salvar landing pages

---

## 🎯 Solução Rápida (5 Minutos)

### ⚡ Forma Mais Fácil

```bash
# 1. Execute este comando
npm run setup-db

# 2. Isso abrirá seu navegador no Supabase SQL Editor
# 3. Para cada arquivo .sql (na pasta /sql):
#    - Abra o arquivo
#    - Copie: Ctrl+A
#    - Cole: Ctrl+V no Supabase
#    - Click: Run ▶️

# 4. Pronto! Recarregue seu app (F5)
```

---

## 📋 Passo a Passo Detalhado

### Passo 1: Abrir Supabase

1. **Navegador:** https://app.supabase.com/
2. **Login:** Com sua conta
3. **Projeto:** IMOBZY
4. **Barra esquerda:** SQL Editor
5. **Botão:** New Query

### Passo 2: Executar 5 Arquivos (Na Ordem Correta)

#### 🔢 Arquivo 1/5 - `definitive_imobzy_schema.sql`

```
Local: C:\Users\paulo\OneDrive\Área de Trabalho\IMOBZY\sql\

1. Abrir arquivo
2. Ctrl+A (selecionar tudo)
3. Ctrl+C (copiar)
4. Colar no Supabase: Ctrl+V
5. Clique: Run ▶️
6. Aguarde: até ficar verde ✅
```

#### 🔢 Arquivo 2/5 - `fix_role_and_permissions_v2.sql`

Repetir o mesmo processo acima

#### 🔢 Arquivo 3/5 - `fix_rpc_final.sql`

Repetir o mesmo processo

#### 🔢 Arquivo 4/5 - `fix_landing_pages_rls.sql`

Repetir o mesmo processo

#### 🔢 Arquivo 5/5 - `setup_landing_pages.sql`

Repetir o mesmo processo

### Passo 3: Verificar Recarregamento

1. **Volte ao app** (http://localhost:3005)
2. **Pressione:** F5 (recarregar)
3. **Abra console:** F12 → Console
4. **Procure:** Erro PGRST205
   - Se sumiu: ✅ **Funcionou!**
   - Se ainda existe: ⏳ Aguarde cache atualizar (1 min)

---

## 🧪 Verificar Status das Tabelas

Abra o terminal na pasta do projeto:

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
```

Se estiver assim, todas as tabelas foram criadas! 🎉

---

## 🚫 Troubleshooting

### ❌ Erros Comuns ao Executar SQL

#### "relation already exists"
**Causa:** Arquivo já foi executado
**Solução:** Normal! Continue com próximo arquivo

#### "syntax error"
**Causa:** Cópia incompleta do arquivo
**Solução:** Copie novamente com Ctrl+A no arquivo inteiro

#### "violates foreign key constraint"
**Causa:** Executando arquivos fora de ordem
**Solução:** Execute os 5 arquivos na ordem correta (1→2→3→4→5)

#### "permission denied"
**Causa:** Supabase key sem permissão
**Solução:** Verificar .env com chaves corretas

---

### ✅ Se Nada Funcionar

**Tente a forma manual pela CLI:**

```bash
# Instalar Supabase CLI
npm install -g @supabase/cli

# Login
supabase login

# Conectar ao seu projeto (troque ID)
supabase link --project-ref seu-projeto-id

# Push migrations
supabase db push
```

---

## 📍 Onde Estão os Arquivos

```
C:\Users\paulo\OneDrive\Área de Trabalho\IMOBZY\sql\
├── definitive_imobzy_schema.sql
├── fix_role_and_permissions_v2.sql
├── fix_rpc_final.sql
├── fix_landing_pages_rls.sql
└── setup_landing_pages.sql
```

---

## 🔍 Como Saber se Funcionou

### ✅ Sinais de Sucesso

1. **Console limpa:**
   - F12 para abrir Developer Tools
   - Aba Console
   - Sem erros PGRST205

2. **Check-db mostra tudo verde:**
   ```bash
   npm run check-db
   # Resultado: todas ✅
   ```

3. **App carrega normalmente:**
   - Sem erros ao abrir http://localhost:3005
   - Botões funcionam
   - Dados carregam

4. **Página carrega com dados:**
   - Kanban board funciona
   - Landing pages aparecem
   - Propriedades carregam

---

## 🎯 Resumo da Solução

| Passo | Ação | Tempo |
|-------|------|-------|
| 1 | Abrir https://app.supabase.com/ | 1 min |
| 2 | SQL Editor → New Query | 30 seg |
| 3 | Executar 5 arquivos .sql | 3 min |
| 4 | Recarregar app (F5) | 30 seg |
| 5 | Verificar console (F12) | 1 min |
| **Total** | **De 5 a 10 minutos** | ⏱️ |

---

## 🚀 Próximo Passo

Depois que as migrações estiverem prontas:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run server

# Ir para
http://localhost:3005
```

---

## 📞 Precisa de Ajuda?

Se ainda tiver problemas:

1. Execute:
   ```bash
   npm run setup-db
   ```

2. Isso abrirá seu navegador e mostrará as instruções

3. Ou leia:
   ```
   GUIA_MIGRACAO_COMPLETO_PT-BR.md
   ```

---

**💡 Importante:** Execute os 5 arquivos **na ordem correta** (1, 2, 3, 4, 5)

**⏱️ Tempo total:** 5 minutos

**✅ Resultado:** Seu app 100% funcional!

🎉 **Boa sorte!**
