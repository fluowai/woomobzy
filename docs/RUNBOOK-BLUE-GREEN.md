# Runbook — Deploy Blue-Green

## Topologia
```text
                     ┌────────────┐
     usuários  ───▶  │  Load-Bal. │ ──▶ ACTIVE  (blue|green)
                     └─────┬──────┘
                           │ swap
                           ▼
                          IDLE (green|blue)  ← deploy vai aqui
```

Ambos os ambientes rodam a mesma stack (frontend, api, whatsapp-service,
document-worker) apontando para o **mesmo banco** (Supabase). Migrações
são backward-compatible por design (expand/contract).

## Fluxo automatizado (`.github/workflows/deploy-bluegreen.yml`)
1. Build.
2. Deploy no lado idle.
3. Health gate: `GET /api/health` 10× consecutivos com 200.
4. k6 smoke (baseline p95, error rate).
5. **Swap** de tráfego via LB (`ACTIVE_COLOR`).
6. Monitor pós-swap 5 min; se error_rate > 1 % ou p95 > 2× baseline, roda
   `scripts/rollback-color.sh` e reverte.

## Procedimento manual (emergência)
```bash
# Ver cor ativa
curl -s https://api.woomobzy.com/api/health | jq .color

# Forçar rollback (reverter para a outra cor)
ACTIVE=$(curl -s https://api.woomobzy.com/api/health | jq -r .color)
OTHER=$([ "$ACTIVE" = "blue" ] && echo green || echo blue)
curl -X POST -H "Authorization: Bearer $LB_TOKEN" \
     https://lb.woomobzy.com/switch -d '{"color":"'$OTHER'"}'
```

## Critérios de rollback
| Sinal                          | Threshold          |
|--------------------------------|--------------------|
| Error rate 5xx                 | > 1 % por 2 min    |
| p95 latency                    | > 2× baseline      |
| Sentry new-issue rate          | > 3× baseline      |
| Health endpoint                | qualquer 503       |

## Migrações
- Expand: adicione colunas/tabelas nullable antes do deploy.
- Contract: remova colunas obsoletas somente depois de 1 ciclo verde estável.
- Nunca fazer DROP no mesmo deploy que introduz a mudança.

## Ambientes
- `blue.woomobzy.com` / `green.woomobzy.com` — apontam para os dois pools.
- `woomobzy.com` — CNAME/roteamento controlado por `ACTIVE_COLOR`.
