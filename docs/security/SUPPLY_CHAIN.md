# Supply Chain Security — Fase 6

Escaneamento contínuo de código (SAST) e dependências (SCA) via GitHub Actions.
Todas as verificações são **aditivas** e não alteram o runtime da app.

## Componentes

### 1. CodeQL (SAST)
- Workflow: `.github/workflows/codeql.yml`
- Linguagem: `javascript-typescript` (cobre server Node e front-end TS).
- Queries: `security-extended` + `security-and-quality`.
- Triggers: push/PR em `main` e semanal (seg 04:00 UTC).
- Resultados aparecem em **Security → Code scanning alerts**.

### 2. OSV-Scanner (SCA)
- Workflow: `.github/workflows/osv-scanner.yml`
- Usa o reusable oficial do Google (`google/osv-scanner-action`).
- Escaneia `package-lock.json` / `bun.lockb` recursivamente contra
  a base OSV (npm advisories, GHSA, etc.).
- Triggers: push/PR em `main` e semanal (seg 05:00 UTC).

### 3. Dependency Review
- Workflow: `.github/workflows/dependency-review.yml`
- Roda em cada PR e falha com severidade ≥ `high` ou licenças proibidas
  (AGPL-3.0, GPL-3.0). Ajuste `deny-licenses` conforme a política jurídica.

### 4. Dependabot
- Config: `.github/dependabot.yml`
- Ecosistemas: `npm` (raiz + `/server`) e `github-actions`.
- Agrupa minor/patch em um único PR semanal para reduzir ruído; majors
  vêm em PRs individuais para revisão manual.

## Como interpretar findings

1. **CodeQL — Code scanning alerts**: triagem por severidade. Alertas
   `high`/`critical` bloqueiam merge (configurar branch protection).
2. **OSV — Security tab**: cada vulnerabilidade traz CVE/GHSA + versão
   corrigida. Priorize as com `severity ≥ HIGH` ou exposição em rota
   pública (webhooks WhatsApp/Traefik).
3. **Dependency Review — PR checks**: bloqueio inline quando um PR
   introduz pacote vulnerável ou licença negada.
4. **Dependabot — PRs**: revisar changelog, rodar E2E (Fase 5) antes do merge.

## Branch protection recomendada

Em `Settings → Branches → main`, exigir:
- `codeql / Analyze (javascript-typescript)`
- `osv-scanner`
- `dependency-review`
- `gitleaks` (Fase 1)
- `e2e / playwright` (Fase 5)

## Próximos passos (Fase 6.b)

- Assinatura de artefatos com Sigstore/cosign nos builds de container.
- SBOM (CycloneDX) publicado como artifact em cada release.
- Trivy para escaneamento de imagens Docker (Traefik, server).
- Habilitar **secret scanning push protection** no repositório.
