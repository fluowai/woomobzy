# Go-Live Checklist

## Segurança
- [ ] Todas as chaves rotacionadas (ver RUNBOOK-SECRETS-ROTATION)
- [ ] Histórico Git purgado com `git filter-repo`
- [ ] Segredos migrados para secret manager (Doppler/AWS/Vault)
- [ ] `.env*` não versionados (verificar `.gitignore`)
- [ ] `npm run audit:ai-imports` = 0 ocorrências
- [ ] `gitleaks detect` = 0 ocorrências
- [ ] `npm audit --production` sem CRITICAL

## Banco de dados
- [ ] `npm run db:lint` (RLS) = 0 warnings CRITICAL
- [ ] Backup automático diário habilitado
- [ ] PITR (Point-in-Time Recovery) habilitado no Supabase
- [ ] Migrations aplicadas em staging antes de prod

## Observabilidade
- [ ] Sentry server + client recebendo eventos de teste
- [ ] Redis conectado (rate limit distribuído ativo)
- [ ] Logs estruturados com `request_id`
- [ ] Alertas configurados (5xx > 1%, latência p95 > 2s)

## Resiliência
- [ ] Rate limit global testado sob carga
- [ ] WhatsApp fallback testado (RUNBOOK-WHATSAPP-FALLBACK)
- [ ] Health check `/health` retorna 200 com deps OK
- [ ] Timeout configurado em todas as chamadas HTTP externas

## Frontend
- [ ] `build.sourcemap: false` (produção)
- [ ] Bundle < 500KB gzip (verificar `npm run build`)
- [ ] Lighthouse score > 85 (Performance, SEO, Accessibility)
- [ ] CSP configurado no host (Cloudflare/Nginx)

## Processo
- [ ] Runbook de incidente publicado
- [ ] Rollback testado (deploy N → N-1)
- [ ] E2E smoke passando em staging
- [ ] `npm run preflight` verde

## Legal / LGPD
- [ ] Política de privacidade publicada
- [ ] Cookie banner (se aplicável)
- [ ] DPA assinado com Supabase / Sentry / Meta
- [ ] Processo de exclusão de conta funcional
