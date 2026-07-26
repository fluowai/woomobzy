# DEV - Documentação do Projeto IMOBZY

## Índice

| Arquivo | Descrição | Status |
|---|---|---|
| `SPECS/MEGA_ADMIN_PANEL.md` | Planejamento completo do painel Mega Admin | PLANEJAMENTO |
| `SPECS/IA_SQUAD.md` | Estratégia de Personas/IA e Segmentação (Concorrente Ref: BrokerIA) | PLANEJAMENTO |
| `WORKLOG.md` | Log de trabalhos realizados no projeto | ATIVO |

## Módulos Implementados

| Módulo | Diretório | Rotas | Status |
|---|---|---|---|
| Instagram Integration | `instagram-service/`, `instagram-worker/`, `views/Instagram/` | `/rural/instagram`, `/urban/instagram` | CONCLUÍDO (fase backend + frontend básico) |
| WhatsApp | `views/WhatsApp/`, `whatsapp-service/` | `/rural/whatsapp`, `/urban/whatsapp` | ATIVO |
| Financial Hub | `views/urban/FinancialHub.tsx` | `/urban/fintech` | ATIVO |
| Clube Imobzy | `views/urban/ClubeImobzy.tsx` | `/urban/clube` | ATIVO |

## Estrutura

```
DEV/
├── INDEX.md                    ← Este arquivo
├── WORKLOG.md                  ← Log de trabalhos
├── SPECS/
│   ├── MEGA_ADMIN_PANEL.md     ← Spec do Mega Admin
│   └── IA_SQUAD.md             ← Spec do Imobzy AI Squad
```

## Convenções

- Specs ficam em `DEV/SPECS/`
- Status pode ser: `PLANEJAMENTO`, `EM PROGRESSO`, `CONCLUÍDO`
- Após conclusão, mover para `DEV/COMPLETED/` ou manter com status atualizado
- Worklog é append-only, entries por data
