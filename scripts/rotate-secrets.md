# Secret Rotation Runbook

Use this checklist any time a secret is suspected leaked, an employee
leaves, or on the quarterly rotation cycle.

## 1. Identify affected secrets

Cross-reference the variable names in `.env.production.template` with the
actual values in each environment:

- Vercel (frontend, API routes) → Project → Settings → Environment Variables
- Portainer / server host → stack env, `docker-compose.yml`, `portainer-stack*.yml`
- Supabase → Project → Settings → API + Database
- Meta / WhatsApp Cloud API → App dashboard → System user tokens
- OpenAI / provider consoles for `ai_worker/`

## 2. Rotate at the source

Follow the provider's rotation flow. Generate a **new** value; do not
reuse an old one. Prefer scoped tokens (least privilege, short TTL).

| Secret family              | Source of truth                              |
| -------------------------- | -------------------------------------------- |
| `SUPABASE_*`               | Supabase dashboard                           |
| `DATABASE_URL` / `PG*`     | Supabase / managed Postgres                  |
| `JWT_SECRET`               | Generate: `openssl rand -hex 64`             |
| `WHATSAPP_*` / `META_*`    | Meta developer console (system user tokens)  |
| `OPENAI_API_KEY` etc.      | Provider console                             |
| `TRAEFIK_*`, dashboard PW  | `openssl rand -base64 32` + htpasswd         |
| Docker registry tokens     | GitHub / Docker Hub tokens page              |

## 3. Update every consumer, in this order

1. Staging environment first — deploy and smoke-test.
2. Production environment — deploy during a low-traffic window.
3. CI/CD (GitHub Actions secrets, if referenced by
   `.github/workflows/*.yml`).
4. Local developer `.env` files — send a note in the team channel; do
   **not** paste the value in chat, share via password manager.

## 4. Revoke the old value

Only revoke after verifying the new value works end-to-end. Revocation
before rollout causes an outage.

## 5. Post-rotation checks

- `git log --all -S '<old value fragment>'` (locally) — confirm the value
  never landed in history.
- Run gitleaks locally: `gitleaks detect --config .gitleaks.toml`.
- If the secret **was** committed at any point, treat the value as burned
  even after rotation. Rewriting history is not a substitute for
  rotation.

## 6. Record it

Log the rotation in the internal ops journal: who, when, which secret,
reason. Do not log the value.
