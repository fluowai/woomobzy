# Runbook — Rotação de Segredos e Purga de Histórico Git

## 1. Inventário

Chaves atualmente rastreadas (ver `.env.production.example`):

- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`, `GROQ_API_KEY`
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- `SENTRY_DSN` (server), `VITE_SENTRY_DSN` (client)
- `REDIS_URL`
- `JWT_SECRET`, `SESSION_SECRET`

## 2. Rotação (ordem recomendada)

1. **Supabase**: Dashboard → Settings → API → *Reset service_role*.
   Atualize `SUPABASE_SERVICE_ROLE_KEY` no gerenciador de segredos
   **antes** do deploy — a chave antiga expira imediatamente.
2. **Google / Groq**: gere nova chave, publique no secret manager,
   faça deploy, revogue a antiga em ~10 min.
3. **WhatsApp**: Meta Business → System Users → *Regenerate token*.
4. **Sentry**: Project Settings → Client Keys → *Rotate DSN*.
5. **JWT/Session**: gerar `openssl rand -hex 64`. Rotação invalida
   todas as sessões — comunicar previamente.

## 3. Purga do histórico Git

> ⚠️ Reescreve o histórico. Coordenar com todos os contribuidores.

```bash
# Instalar
pipx install git-filter-repo

# Clonar espelho
git clone --mirror git@github.com:fluowai/woomobzy.git woomobzy.git
cd woomobzy.git

# Preparar lista de segredos vazados (um por linha)
cat > /tmp/leaked.txt <<'SECRETS'
sk-old-groq-key-value
AIzaOldGoogleKeyValue
SECRETS

# Purgar
git filter-repo --replace-text /tmp/leaked.txt

# Empurrar
git push --force
```

Após o push forçado:
- Todos os clones locais devem ser **recriados** (`git clone` novo).
- PRs abertos precisam ser rebaseados.
- Invalidar caches de CI (Actions).

## 4. Migração para Secret Manager

Recomendado: **Doppler** (simples) ou **AWS Secrets Manager**.

```bash
# Doppler
doppler setup --project woomobzy --config prd
doppler secrets upload .env.production
doppler run -- node server/index.js
```

Remova `.env.production` do repositório após confirmar que o secret
manager está injetando corretamente.
