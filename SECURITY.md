# Security Policy

## Supported Versions

The `main` branch is the only actively supported version. Deployed release tags
receive security fixes at the maintainers' discretion.

## Reporting a Vulnerability

**Do not open a public issue for security reports.**

Send details to **security@fluow.ai** with:

- A description of the issue and its impact
- Steps to reproduce (proof of concept, request/response samples)
- Affected components (frontend, `server/`, `ai_worker/`, `document_worker/`,
  `whatsapp-service/`, infra) and versions or commit SHAs
- Whether the issue is being actively exploited

We aim to:

1. Acknowledge within **2 business days**
2. Provide an initial assessment within **7 days**
3. Ship a fix or mitigation, coordinated with the reporter, before public
   disclosure

## Scope

In scope:

- This repository's source code and infrastructure manifests
  (`docker-compose*.yml`, `portainer-stack*.yml`, `traefik/`)
- Deployed services under `*.woomobzy.vercel.app` and any production domain
  we operate

Out of scope:

- Third-party services (Supabase, Vercel, WhatsApp/Meta) — report to the
  respective vendor
- Denial-of-service via volumetric traffic
- Findings that require physical access, stolen credentials, or a rooted
  device
- Missing security headers on endpoints that return no sensitive content

## Secrets Handling

- Runtime secrets are **never** committed. Use `.env.production.template`
  as the source of truth for required variable names and load real values
  from the deployment platform's secret store.
- Suspected leaked credentials should be treated as compromised: rotate
  first, investigate second. See `scripts/rotate-secrets.md`.
- All pushes and PRs are scanned by
  [`.github/workflows/gitleaks.yml`](.github/workflows/gitleaks.yml).
  GitHub push protection is enabled on this repo — do not disable it.

## Safe Harbor

Good-faith research that follows this policy will not result in legal
action. Do not access data that is not yours, do not degrade service, and
do not retain sensitive data any longer than needed to demonstrate the
issue.
