# DEV - Documentação do Projeto IMOBZY

## Índice

| Arquivo                                  | Descrição                                                            | Status       |
| ---------------------------------------- | -------------------------------------------------------------------- | ------------ |
| `SPECS/MEGA_ADMIN_PANEL.md`              | Planejamento completo do painel Mega Admin                           | PLANEJAMENTO |
| `SPECS/IA_SQUAD.md`                      | Estratégia de Personas/IA e Segmentação (Concorrente Ref: BrokerIA)  | PLANEJAMENTO |
| `SPECS/AUDITORIA_FUNCIONAL_REGRESSAO.md` | Auditoria por perfil e prevenção de regressões                       | PLANEJAMENTO |
| `SPECS/LICENSING_ENFORCEMENT.md`         | Incremento 7 — enforcement de licença no acesso autenticado (fail-open default) | CONCLUÍDO |
| `WORKLOG.md`                             | Log de trabalhos realizados no projeto                               | ATIVO        |
| `RELATORIO_GAP_URBANO_RURAL.md`          | Gap de mudanças aplicadas no Urbano e não no Rural (sidebar sanfona) | CONCLUÍDO    |
| `RELATORIO_TIPOGRAFIA_CORES_2026-08-02.md` | Auditoria de fontes, escala tipográfica, cores, contraste e marca   | CONCLUÍDO    |
| `RELATORIO_REVENDA_DELAZARI_2026-08-03.md` | Diagnóstico revenda Delazari: escopo de clientes de revenda e impersonação + verificação de produção (seção 5) + hardening do escopo (seção 6) | CONCLUÍDO |
| `SPECS/NB_CONSULTIO_MINIO_SSL.md` | Fix SSL MinIO `nb.consultio.com.br` + provisionamento de buckets/key em produção | CONCLUÍDO |

## Módulos Implementados

| Módulo                | Diretório                                                     | Rotas                                  | Status                                     |
| --------------------- | ------------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| Instagram Integration | `instagram-service/`, `instagram-worker/`, `views/Instagram/` | `/rural/instagram`, `/urban/instagram` | CONCLUÍDO (backend + frontend) — deploy em produção pendente |
| WhatsApp              | `views/WhatsApp/`, `whatsapp-service/`                        | `/rural/whatsapp`, `/urban/whatsapp`   | ATIVO — watchdog de QR em 30s              |
| Financial Hub         | `views/urban/FinancialHub.tsx`                                | `/urban/fintech`                       | ATIVO                                      |
| Clube Imobzy          | `views/urban/ClubeImobzy.tsx`                                 | `/urban/clube`                         | ATIVO                                      |

## Estrutura

```
DEV/
├── INDEX.md                    ← Este arquivo
├── WORKLOG.md                  ← Log de trabalhos
├── SPECS/
│   ├── MEGA_ADMIN_PANEL.md     ← Spec do Mega Admin
│   ├── IA_SQUAD.md             ← Spec do Imobzy AI Squad
│   └── LICENSING_ENFORCEMENT.md ← Spec do enforcement de licença
```

## Convenções

- Specs ficam em `DEV/SPECS/`
- Status pode ser: `PLANEJAMENTO`, `EM PROGRESSO`, `CONCLUÍDO`
- Após conclusão, mover para `DEV/COMPLETED/` ou manter com status atualizado
- Worklog é append-only, entries por data

## Documentos Operacionais

- `HANDOFF.md` — estado atual e próximos passos para continuidade.
- `VERIFY.md` — evidências dos gates executados e riscos restantes.
