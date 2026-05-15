# Deploy IMOBZY: Cloudflare + Render

Este guia substitui o Railway pelo Render no backend e mantém o frontend no Cloudflare/Vercel.

## Arquitetura Recomendada

- Frontend React/Vite: Cloudflare Pages ou Vercel.
- Backend Node/Express: Render Web Service.
- Banco e autenticação: Supabase.
- WhatsApp Go service: Render separado ou serviço externo.
- DNS e proxy: Cloudflare.

## Render: Backend

Crie um Web Service conectado ao GitHub.

- Repository: este repositório.
- Branch: `main` ou `production`.
- Runtime: Node.
- Plan inicial: Free.
- Build Command: `npm ci`.
- Start Command: `npm start`.
- Health Check Path: `/health`.

Também existe um `render.yaml` na raiz para Blueprint.

### Variáveis no Render

Obrigatórias:

```env
NODE_ENV=production
PORT=3002
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=COLE_A_ANON_KEY_PUBLICA
SUPABASE_SERVICE_ROLE_KEY=COLE_A_SERVICE_ROLE_KEY_SOMENTE_NO_BACKEND
ALLOWED_ORIGINS=https://seudominio.com.br,https://www.seudominio.com.br,https://imobzy.consultio.com.br
```

Conforme uso:

```env
WHATSAPP_API_URL=https://sua-api-whatsapp.example.com
REDIS_URL=redis://default:SENHA@HOST:PORT
GEMINI_API_KEY=
GROQ_API_KEY=
OPENAI_API_KEY=
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
DIRECTADMIN_API_KEY=
```

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` no Cloudflare Pages, Vercel frontend ou qualquer variável `VITE_*`.

## Cloudflare Pages: Frontend

Build settings:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Node version: 20
```

Variáveis:

```env
NODE_VERSION=20
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=COLE_A_ANON_KEY_PUBLICA
VITE_API_URL=https://imobzy-api.onrender.com
VITE_PANEL_URL=https://app.seudominio.com.br
VITE_SITE_URL=https://seudominio.com.br
```

## Cloudflare DNS

Sugestão:

- `app.seudominio.com.br` aponta para Cloudflare Pages.
- `api.seudominio.com.br` aponta para o domínio customizado do Render, se quiser usar domínio próprio na API.
- SSL/TLS: Full ou Full strict.
- Proxy ativo para o frontend.

Depois de definir `api.seudominio.com.br`, altere no Cloudflare Pages:

```env
VITE_API_URL=https://api.seudominio.com.br
```

E no Render:

```env
ALLOWED_ORIGINS=https://seudominio.com.br,https://www.seudominio.com.br,https://app.seudominio.com.br
```

## Cuidados do Plano Free

No Render Free o serviço pode dormir após inatividade. A primeira requisição após pausa pode demorar alguns segundos. Para MVP isso é aceitável; para cliente em produção, use um plano pago pequeno.

## Checklist de Migração

1. Criar serviço Render conectado ao GitHub.
2. Configurar variáveis do `.env.render.example`.
3. Fazer deploy e testar `/health`.
4. Configurar `VITE_API_URL` no Cloudflare Pages.
5. Fazer novo deploy do frontend.
6. Testar login, listagem de imóveis, CRM, landing pages e WhatsApp.
7. Ajustar `ALLOWED_ORIGINS` com todos os domínios reais.
8. Só depois desligar Railway.
