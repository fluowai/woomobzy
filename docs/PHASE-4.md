# Phase 4 — Go-Live Readiness

Phase 4 fecha o ciclo de *hardening*: consolida runbooks operacionais,
checklist de produção e um script de *preflight* que valida o ambiente
antes do deploy. Nenhum código de aplicação é alterado — apenas
processo, documentação e automação de verificação.

## Entregas

- `docs/RUNBOOK-SECRETS-ROTATION.md` — rotação de chaves + purga de
  segredos do histórico Git com `git filter-repo`.
- `docs/RUNBOOK-WHATSAPP-FALLBACK.md` — plano B (WhatsApp Cloud API)
  quando o provedor primário estiver indisponível.
- `docs/GO-LIVE-CHECKLIST.md` — checklist final antes de habilitar
  tráfego de produção.
- `scripts/preflight.sh` — verificações automatizadas:
  variáveis de ambiente obrigatórias, RLS, ausência de SDKs privados
  no bundle, e health do backend.
- `package.json` → novo script `npm run preflight`.

## Como usar

```bash
# Em CI/CD antes de promover para produção:
npm ci
npm run audit:ai-imports
npm run db:lint
npm run preflight
npm run test:e2e   # se RUN_E2E=1
```

## Pendências manuais (fora deste PR)

Estas ações exigem credenciais/acesso humano e estão documentadas
nos runbooks:

1. Rotacionar todas as chaves listadas em `.env.production.example`.
2. Rodar `git filter-repo` para purgar segredos históricos.
3. Migrar segredos para Doppler/AWS Secrets Manager/Vault.
4. Provisionar Redis gerenciado e Sentry (projetos server + client).
5. Configurar `WHATSAPP_FALLBACK_*` no ambiente de produção.
