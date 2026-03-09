# Guia Passo a Passo - Migração para Novo Banco de Dados

## 📋 Visão Geral

Este guia detalha o processo completo de migração do ImobiSaaS para o novo banco de dados Supabase.

**Novo Banco:**

- URL: `https://wcumnqteyrgwdqpjzqlt.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/wcumnqteyrgwdqpjzqlt

---

## 🔧 Passo 1: Configurar o Novo Banco de Dados

### 1.1 Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/wcumnqteyrgwdqpjzqlt
2. Faça login com suas credenciais

### 1.2 Executar Script SQL

1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query**
3. Abra o arquivo [setup_new_database.sql](file:///c:/Users/paulo/OneDrive/Área%20de%20Trabalho/imobisaas/setup_new_database.sql)
4. Copie TODO o conteúdo do arquivo
5. Cole no SQL Editor do Supabase
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Aguarde a execução (deve levar alguns segundos)
8. Verifique se apareceu "Success. No rows returned" ou similar

### 1.3 Criar Buckets de Storage

1. No menu lateral, clique em **Storage**
2. Clique em **New bucket**
3. Crie o primeiro bucket:
   - Nome: `agency-assets`
   - Marque a opção **Public bucket** ✅
   - Clique em **Create bucket**
4. Crie o segundo bucket:
   - Nome: `property-images`
   - Marque a opção **Public bucket** ✅
   - Clique em **Create bucket**

> [!IMPORTANT]
> É ESSENCIAL que ambos os buckets estejam marcados como **públicos**. Caso contrário, as imagens não serão exibidas!

---

## 🔄 Passo 2: Atualizar Credenciais no Projeto

### 2.1 Editar arquivo .env

Abra o arquivo [.env](file:///c:/Users/paulo/OneDrive/Área%20de%20Trabalho/imobisaas/.env) e atualize com as novas credenciais:

```env
VITE_SUPABASE_URL=https://wcumnqteyrgwdqpjzqlt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdW1ucXRleXJnd2RxcGp6cWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjk0NDIsImV4cCI6MjA4MjY0NTQ0Mn0.wGR0TwMFav6q53qMenQwfh-NLb_FrsWp99E99H8mCyI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdW1ucXRleXJnd2RxcGp6cWx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA2OTQ0MiwiZXhwIjoyMDgyNjQ1NDQyfQ.YlYKSngvw_MoGl1F4sC1qER77yq4P3KbiI_yfBm6uVE
```

### 2.2 Salvar e Fechar

Salve o arquivo `.env` e feche.

---

## 🔍 Passo 3: Executar Diagnóstico

Antes de migrar dados, vamos verificar se tudo está configurado corretamente.

### 3.1 Executar Script de Diagnóstico

Abra o terminal na pasta do projeto e execute:

```bash
node diagnose_images.js
```

### 3.2 Verificar Resultado

O script irá verificar:

- ✅ Conexão com o banco de dados
- ✅ Existência dos buckets
- ✅ Políticas de acesso
- ✅ Upload e download de teste

**Resultado esperado:**

- Todos os itens devem aparecer com ✅
- Os buckets `agency-assets` e `property-images` devem existir
- O teste de upload deve funcionar

**Se houver erros:**

- Verifique se executou o SQL corretamente (Passo 1.2)
- Verifique se criou os buckets (Passo 1.3)
- Verifique se os buckets estão marcados como públicos

---

## 📦 Passo 4: Migrar Dados (Opcional)

> [!WARNING]
> Execute este passo APENAS se você tiver dados no banco antigo que deseja migrar.

### 4.1 Verificar se Há Dados para Migrar

Se você acabou de criar o projeto ou não tem dados importantes no banco antigo, **PULE ESTE PASSO**.

### 4.2 Executar Migração

Se você tem dados para migrar, execute:

```bash
node migrate_to_new_db.js --confirm
```

Este script irá:

1. Exportar configurações do site
2. Exportar propriedades
3. Baixar e re-enviar imagens para o novo storage
4. Exportar leads

**Tempo estimado:** Depende da quantidade de imagens (pode levar vários minutos)

---

## ✅ Passo 5: Testar a Aplicação

### 5.1 Reiniciar o Servidor de Desenvolvimento

Se o servidor estiver rodando, pare-o (Ctrl+C) e inicie novamente:

```bash
npm run dev
```

### 5.2 Acessar a Aplicação

Abra o navegador em: http://localhost:5173

### 5.3 Verificações

1. **Página inicial carrega?** ✅
2. **Consegue acessar o admin?** ✅
3. **Consegue criar uma nova propriedade?** ✅
4. **Consegue fazer upload de imagem?** ✅
5. **As imagens aparecem na lista?** ✅
6. **As imagens aparecem na landing page?** ✅

### 5.4 Verificar Console do Navegador

Pressione F12 para abrir o DevTools e verifique a aba **Console**:

- ❌ Não deve haver erros em vermelho
- ⚠️ Avisos em amarelo são aceitáveis

---

## 🐛 Solução de Problemas

### Problema: "Erro de Configuração" na tela vermelha

**Causa:** Variáveis de ambiente não carregadas

**Solução:**

1. Verifique se o arquivo `.env` foi salvo corretamente
2. Reinicie o servidor de desenvolvimento
3. Limpe o cache do navegador (Ctrl+Shift+Delete)

### Problema: Imagens não aparecem (ícone quebrado)

**Causa:** Buckets não estão públicos ou políticas incorretas

**Solução:**

1. Acesse o Supabase Dashboard > Storage
2. Clique no bucket `property-images`
3. Clique em **Settings** (engrenagem)
4. Verifique se **Public bucket** está marcado
5. Se não estiver, marque e salve
6. Repita para `agency-assets`

### Problema: Erro ao fazer upload de imagem

**Causa:** Políticas de storage não configuradas

**Solução:**

1. Execute novamente o script SQL (Passo 1.2)
2. Verifique se não houve erros na execução
3. Execute o diagnóstico novamente: `node diagnose_images.js`

### Problema: "Failed to fetch" ou erro de CORS

**Causa:** URL do Supabase incorreta ou CORS não configurado

**Solução:**

1. Verifique se a URL no `.env` está correta (sem barra no final)
2. Verifique se a chave anon está correta
3. Acesse o Supabase Dashboard > Settings > API
4. Verifique se a URL e as chaves correspondem ao `.env`

---

## 📞 Próximos Passos

Após concluir a migração com sucesso:

1. ✅ Teste todas as funcionalidades principais
2. ✅ Crie algumas propriedades de teste
3. ✅ Verifique a landing page pública
4. ✅ Teste o formulário de contato
5. ✅ Configure as integrações (Evolution API, etc.)

---

## 📝 Notas Importantes

> [!CAUTION]
>
> - **NÃO** delete o banco antigo até ter certeza que tudo está funcionando
> - **NÃO** compartilhe as chaves do `.env` publicamente
> - **FAÇA** backup dos dados antes de qualquer operação destrutiva

> [!TIP]
> Se encontrar problemas, execute o diagnóstico novamente:
>
> ```bash
> node diagnose_images.js
> ```
>
> Ele fornecerá informações detalhadas sobre o que pode estar errado.
