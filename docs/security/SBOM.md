# SBOM, Sigstore & Trivy (Fase 7)

Este documento cobre a superfície de supply-chain visibility do repositório.

## Componentes

| Workflow | Objetivo | Trigger |
|---|---|---|
| `.github/workflows/sbom.yml` | Gera SBOM CycloneDX (raiz + `server/`) e assina via Sigstore (`actions/attest-sbom`) | PR, push `main`, semanal (seg 05:00 UTC), manual |
| `.github/workflows/trivy.yml` | Scan de vulnerabilidades (fs) + misconfig (IaC/Dockerfile), publica SARIF em Code Scanning | PR, push `main`, semanal (seg 05:30 UTC), manual |

## SBOM (CycloneDX)

- Formato: **CycloneDX 1.5 JSON** — padrão OWASP, aceito por Dependency-Track, GitHub, GitLab, Snyk.
- Ferramenta: `@cyclonedx/cyclonedx-npm@2` (oficial CycloneDX).
- Escopo: `sbom-root.cdx.json` (frontend/deps de build) + `sbom-server.cdx.json` (runtime backend).
- Artefatos publicados no workflow run (retention 90 dias).

### Attestation (Sigstore)

`actions/attest-sbom@v1` emite attestations **assinadas via Sigstore keyless (OIDC)** ancoradas na identidade do workflow. Verificação:

```bash
gh attestation verify sbom-root.cdx.json --repo fluowai/woomobzy
```

Requer permissões `id-token: write` + `attestations: write` (já configuradas).

## Trivy

- **fs scan**: dependências npm (raiz e `server/`), lockfiles → CVE HIGH/CRITICAL.
- **config scan**: Dockerfile, workflows, IaC → misconfig HIGH/CRITICAL.
- SARIF publicado em **Security → Code scanning** (categorias `trivy-fs` e `trivy-config`).
- Em PRs: falha o job se houver CVE HIGH/CRITICAL com fix disponível (`ignore-unfixed: true`).

## Branch protection recomendada (pós-merge)

Adicionar aos required status checks em `main`:
- `sbom / cyclonedx`
- `trivy / fs-scan`

Combinado com Fases 4–6 (`codeql`, `osv-scanner`, `dependency-review`, gitleaks, e2e).

## Triagem

1. **CVE HIGH/CRITICAL com fix**: bump da dependência via Dependabot (Fase 6) ou PR manual.
2. **CVE sem fix**: avaliar impacto no path da aplicação; documentar em `.trivyignore` com data de revisão (max 30 dias).
3. **Misconfig**: corrigir na fonte (Dockerfile, workflow).

## Próximos passos (Fase 7.b, opcional)

- SBOM de imagem Docker (`trivy image` + `syft`).
- Publicação de SBOM em Dependency-Track self-hosted.
- Assinatura de artefatos de build (`actions/attest-build-provenance`).
