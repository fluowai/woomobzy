# Deploy automatico com Portainer

Fluxo desejado:

1. Fazer commit e push na branch `main`.
2. GitHub Actions gera e publica as imagens Docker no GHCR.
3. GitHub Actions chama o webhook do Portainer.
4. Portainer recria a stack usando as imagens `latest`.

## Arquivos envolvidos

- `.github/workflows/docker-images.yml`: build/push das imagens e chamada do webhook.
- `docker-stack.prod.yml`: stack para usar no Portainer, baseada nas imagens:
  - `ghcr.io/fluowai/woomobzy-frontend:latest`
  - `ghcr.io/fluowai/woomobzy-api:latest`
  - `ghcr.io/fluowai/woomobzy-whatsapp:latest`
  - `ghcr.io/fluowai/woomobzy-agro:latest`

## Configuracao no Portainer

1. Crie ou edite a stack do IMOBZY no Portainer.
2. Use o arquivo `docker-stack.prod.yml`.
3. Configure as variaveis obrigatorias da stack no Portainer:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
DATABASE_URL
SUPABASE_DB_URL
WHATSAPP_SERVICE_TOKEN
WHATSAPP_INTERNAL_TOKEN
WHATSAPP_WS_JWT_SECRET
MINIO_ENDPOINT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_WHATSAPP_BUCKET
LITELLM_MASTER_KEY
```

4. Opcionalmente ajuste:

```text
VITE_PANEL_URL
VITE_PUBLIC_APP_URL
PLATFORM_PUBLIC_IP
ALLOWED_ORIGINS
CORS_ORIGINS
MINIO_PUBLIC_URL
MINIO_REGION
OPENAI_API_KEY
GEMINI_API_KEY
GROQ_API_KEY
```

5. Garanta que as redes/volumes externos referenciados na stack existam no Swarm: `woopanel1` e `imobzy_traefik_dynamic`.
6. Ative o webhook da stack no Portainer.
7. Copie a URL do webhook.

## Configuracao no GitHub

No repositorio `fluowai/woomobzy`, adicione um secret:

```text
PORTAINER_WEBHOOK_URL=https://SEU_PORTAINER/api/stacks/webhooks/...
```

Caminho:

```text
Settings > Secrets and variables > Actions > New repository secret
```

Depois disso, todo push na `main` publica as imagens e chama o Portainer automaticamente.

## Como conferir

No GitHub:

- Abra `Actions`.
- Entre no workflow `Docker Images`.
- O job `deploy-portainer` deve terminar com sucesso.

No Portainer:

- A stack deve aparecer como atualizada/redeployada.
- Os containers devem ter data de criacao posterior ao workflow.
