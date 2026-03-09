# Guia de Deploy - Vercel Multi-Tenant

Este guia explica como fazer deploy do ImobiSaaS na Vercel com suporte a múltiplos domínios.

## Pré-requisitos

- Conta na Vercel
- Domínio principal configurado (ex: `imobisaas.com`)
- Supabase configurado

## Passo 1: Configurar Projeto na Vercel

### 1.1 Criar Novo Projeto

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login na Vercel
vercel login

# Deploy inicial
vercel
```

### 1.2 Configurar Variáveis de Ambiente

No dashboard da Vercel, adicione as seguintes variáveis:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

## Passo 2: Configurar Domínio Principal

### 2.1 Adicionar Domínio Admin

1. Vá em **Settings > Domains**
2. Adicione `app.imobisaas.com`
3. Configure DNS:
   ```
   Tipo: CNAME
   Nome: app
   Valor: cname.vercel-dns.com
   ```

### 2.2 Configurar Wildcard para Subdomínios

1. Adicione `*.imobisaas.com`
2. Configure DNS:
   ```
   Tipo: CNAME
   Nome: *
   Valor: cname.vercel-dns.com
   ```

## Passo 3: Configurar Domínios Customizados

### 3.1 Adicionar Domínio do Cliente

Quando um cliente adicionar um domínio customizado:

1. No painel admin, cliente adiciona `www.cliente.com.br`
2. Sistema mostra instruções DNS:
   ```
   Tipo: CNAME
   Nome: www
   Valor: cname.vercel-dns.com
   ```
3. Cliente configura DNS no provedor dele
4. Após propagação, clicar em "Verificar"

### 3.2 Adicionar na Vercel (Automático)

O sistema pode usar a API da Vercel para adicionar domínios automaticamente:

```javascript
// Exemplo de integração com Vercel API
const addDomainToVercel = async (domain) => {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${PROJECT_ID}/domains`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    },
  );
  return response.json();
};
```

## Passo 4: Estrutura de Roteamento

### 4.1 Configuração Vercel (vercel.json)

O arquivo `vercel.json` está configurado para:

- Redirecionar `app.imobisaas.com` (Admin) para `/admin` automaticamente.
- Roteamento de APIs: `/api/*` → Serverless Functions em `server/api/*`.
- Configuração de builds para Frontend (Vite) e Backend (Node.js).

O middleware (`middleware.ts`) **não é necessário** pois a resolução de tenant é feita diretamente pela API (`/api/tenant/resolve`) ou pelo endpoint de contexto (`/api/tenant/current`), que possui fallback robusto para identificar o domínio.

### 4.2 Rotas Públicas vs Admin

**Admin** (`app.imobisaas.com`):

```
/admin/*        → Painel de administração
/login          → Login
/register       → Registro
```

**Site Público** (domínios dos clientes):

```
/               → Landing page principal
/imoveis        → Listagem
/imovel/:id     → Detalhes
/lp/:slug       → Landing pages customizadas
/contato        → Formulário
```

## Passo 5: SSL Automático

A Vercel configura SSL automaticamente para todos os domínios:

- Certificados Let's Encrypt
- Renovação automática
- HTTPS forçado

## Passo 6: Teste Local

### 6.1 Simular Multi-Domínio Localmente

Edite `/etc/hosts` (Mac/Linux) ou `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1 app.imobisaas.local
127.0.0.1 cliente1.imobisaas.local
127.0.0.1 cliente2.imobisaas.local
```

### 6.2 Testar

```bash
# Iniciar servidor
npm run dev

# Acessar
http://app.imobisaas.local:3000        # Admin
http://cliente1.imobisaas.local:3000   # Site Cliente 1
http://cliente2.imobisaas.local:3000   # Site Cliente 2
```

## Passo 7: Deploy

### 7.1 Deploy de Produção

```bash
# Deploy para produção
vercel --prod
```

### 7.2 Verificar Deploy

1. Acesse `app.imobisaas.com` → Deve mostrar admin
2. Acesse `cliente.imobisaas.com` → Deve mostrar site do cliente
3. Verifique logs na Vercel

## Troubleshooting

### Domínio não resolve

1. Verificar configuração DNS (pode levar até 48h)
2. Usar `dig` ou `nslookup` para verificar:
   ```bash
   dig cliente.imobisaas.com
   ```

### Tenant não identificado

1. Verificar logs do middleware
2. Confirmar que organização tem `subdomain` configurado
3. Verificar RLS policies no Supabase

### SSL não ativa

1. Aguardar alguns minutos (Vercel provisiona automaticamente)
2. Verificar se domínio está corretamente apontado
3. Forçar renovação no dashboard da Vercel

## Monitoramento

### Analytics

A Vercel fornece analytics automáticos:

- Pageviews por domínio
- Performance
- Erros

### Logs

```bash
# Ver logs em tempo real
vercel logs
```

## Custos Estimados

**Vercel Pro** (recomendado para produção):

- $20/mês por membro
- Domínios ilimitados
- SSL automático
- Edge Network global
- 100GB bandwidth

**Vercel Hobby** (desenvolvimento):

- Gratuito
- Domínios ilimitados
- SSL automático
- Limitações de bandwidth

## Próximos Passos

1. ✅ Deploy inicial
2. ✅ Configurar domínio admin
3. ✅ Configurar wildcard
4. ✅ Testar com cliente piloto
5. ⏳ Automatizar adição de domínios via API
6. ⏳ Configurar CDN para assets
7. ⏳ Implementar cache strategies
