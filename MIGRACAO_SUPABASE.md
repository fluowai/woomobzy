# 🔧 GUIA DE MIGRAÇÃO DO SUPABASE

## 📋 Status Atual
- ❌ Frontend rodando
- ❌ Backend pronto
- ❌ **Banco de dados SEM tabelas** ← Precisa corrigir isso agora

---

## 🚀 Como Executar as Migrações

### OPÇÃO 1: Interface Web (Mais Fácil) ⭐

1. **Acesse o Supabase Dashboard**
   - URL: https://app.supabase.com/
   - Projeto: ltrmgfdpqtvypsxeknyd

2. **Navegue para SQL Editor**
   - Menu esquerdo: `SQL Editor`
   - Clique em `New query`

3. **Execute o Schema Principal**
   - Copie TODO o conteúdo de: `definitive_imobzy_schema.sql`
   - Cole no SQL Editor
   - Clique em `Run`
   - Aguarde a execução (vai levar uns segundos)

4. **Execute as Correções de Segurança**
   - Depois, execute em ordem:
     1. `fix_role_and_permissions_v2.sql`
     2. `fix_rpc_final.sql`
     3. `fix_landing_pages_rls.sql`
     4. `setup_landing_pages.sql`

5. **Pronto!** ✅
   - Recarregue a página do seu app
   - Deverá conectar ao banco com sucesso

---

### OPÇÃO 2: Script Automático (Terminal)

Não funciona direto via CLI, mas você pode preparar:

```bash
# 1. Instale o Supabase CLI
npm install -g supabase

# 2. Login Supabase
supabase login

# 3. Execute as migrações
supabase db push

# (Ainda assim, melhor usar a web interface)
```

---

## 🎯 Ordem Recomendada de Execução

| Passo | Arquivo | O quê |
|-------|---------|-------|
| 1️⃣ | `definitive_imobzy_schema.sql` | **OBRIGATÓRIO** - Cria todas as tabelas |
| 2️⃣ | `fix_role_and_permissions_v2.sql` | Políticas de RLS (Row Level Security) |
| 3️⃣ | `fix_rpc_final.sql` | Funções SQL (RPC) para queries de tenant |
| 4️⃣ | `fix_landing_pages_rls.sql` | Políticas para landing pages |
| 5️⃣ | `setup_landing_pages.sql` | Setup específico landing pages |
| 6️⃣ | `setup_bi_functions.sql` | *Opcional* - Analytics |
| 7️⃣ | `setup_impersonation_schema.sql` | *Opcional* - Impersonation admin |

---

## 🔍 Verificação

Após executar as migrações, você deve ver:

### ✅ No Supabase Dashboard > Tables:
- `organizations`
- `profiles`
- `properties`
- `leads`
- `landing_pages`
- `site_settings`
- `site_texts`
- `contracts`
- `chat_messages`

### ✅ No Console do App (F12):
- ❌ `Could not find the table` → DESAPARECE
- ✅ Landing pages carregam
- ✅ Perfil do usuário carrega

---

## 🛠️ Se der erro...

### Erro: "Extension already exists"
```
Isto é NORMAL. Significa que PostGIS já está instalado.
Pule esse erro e continue.
```

### Erro: "Table already exists"
```
Se você rodou as migrações antes:
1. Vá para Supabase Dashboard > Tables
2. Delete as tabelas antigas
3. Execute novamente o schema
```

### Erro: "Permission denied"
```
Certifique-se:
1. Está logado no Supabase com a conta certa
2. Tem acesso ao projeto (role Admin ou superior)
3. Não há RLS policies bloqueando
```

### Erro: "Timeout na query"
```
Algumas queries são grandes. Se timeout:
1. Divida o arquivo em pedaços menores
2. Execute cada tabela separadamente
3. Ou aumente o timeout no Supabase (settings)
```

---

## 📊 Verificar Tabelas Criadas

Execute no SQL Editor:

```sql
-- Ver todas as tabelas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Ver colunas de uma tabela
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'properties'
ORDER BY ordinal_position;
```

---

## 🔐 Segurança PÓS-MIGRAÇÃO

Após executar as migrações:

1. **Ativar RLS em todas as tabelas**
   - Supabase Dashboard > Authentication > Policies
   - Verificar que cada tabela tem policies ativas

2. **Testar acesso público**
   - Landing page pública deve carregar (sem auth)
   - CRM/Admin requer login

3. **Dados de exemplo**
   - Banco começa VAZIO
   - Você precisa criar orgs/properties manualmente
   - Ou usar seed scripts

---

## 🎉 Status Pós-Migração

```
Frontend:       ✅ Rodando em http://localhost:3005
Backend:        ✅ Rodando em http://localhost:3002
Banco:          ✅ TODAS as tabelas criadas
RLS Policies:   ✅ Segurança aplicada
RPC Functions:  ✅ Queries multi-tenant funcionando

App Status:     ✅ PRONTO PARA USO
```

---

## 🚀 Próximo Passo

1. Execute as migrações acima
2. Recarregue seu app (F5)
3. Logs desaparecem, app funciona
4. Faça login e crie sua primera organização!

---

**Dúvidas?** Verifique:
- `ANALISE_PROJETO.md` - Análise técnica
- `PLANO_ACAO.md` - Guia completo de setup
- Documentação Supabase: https://supabase.com/docs
