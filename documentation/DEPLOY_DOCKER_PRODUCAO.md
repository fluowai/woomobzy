# Deploy Docker em Producao

Use estes arquivos no servidor se for subir por terminal:

- `docker-compose.prod.yml`
- `docker/caddy/Caddyfile.prod`
- `deploy.production.env.example`

Se for subir como Stack estilo Portainer/n8n, use:

- `docker-stack.prod.yml`

## 1. Preparar DNS

Aponte o dominio para o IP do servidor:

- Registro `A`: `seu-dominio.com.br` -> `IP_DO_SERVIDOR`
- Opcional `A`: `www.seu-dominio.com.br` -> `IP_DO_SERVIDOR`

## 2. Preparar env no servidor

```bash
cp deploy.production.env.example .env.production
nano .env.production
```

Preencha principalmente:

- `APP_DOMAIN`
- `APP_URL`
- `ALLOWED_ORIGINS`
- `CORS_ORIGINS`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `SUPABASE_DB_URL`
- chaves de IA, se for usar

## 3. Subir ou atualizar

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 4. Ver logs

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
```

## 5. Reiniciar depois de atualizar o Git

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Caddy emite HTTPS automatico quando `APP_DOMAIN` aponta para o servidor e as portas `80` e `443` estao liberadas.

## Stack estilo Portainer/n8n

Use o arquivo `docker-stack.prod.yml`.

Antes de subir, troque dentro do YAML:

- `seudominio.com.br`
- `https://seu-projeto.supabase.co`
- `sua-chave-anon-publica`
- `sua-service-role-key`
- `seu-jwt-secret`
- `DATABASE_URL`
- `SUPABASE_DB_URL`
- `WHATSAPP_INTERNAL_TOKEN`
- chaves de IA, se for usar

Depois suba a stack no painel Docker/Portainer apontando para o repositorio Git ou colando o conteudo do YAML.
