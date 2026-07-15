# Runbook — Encarregado de Dados (DPO)

## 1. SLA de requisições (art. 19 LGPD)
15 dias corridos para responder titular. Registrar em `data_access_log`.

## 2. Fluxo de atendimento
```text
Titular → /privacidade OU e-mail DPO
       → validar identidade (e-mail cadastrado + token)
       → executar (export/delete/correção) via portal
       → responder por e-mail com evidência (link JSON, comprovante)
       → log em data_access_log
```

## 3. Matriz de bases legais
| Operação                    | Base legal              |
|-----------------------------|-------------------------|
| Cadastro/uso do produto     | Execução de contrato    |
| Prevenção de fraude / logs  | Legítimo interesse      |
| Marketing / analytics       | Consentimento           |
| Notas fiscais / retenção 5a | Obrigação legal         |

## 4. Incidente de segurança
1. Contenção imediata (isolar sistema, rotacionar segredos).
2. Registro no log de incidentes (`data_access_log` type=`incident`).
3. Avaliação de risco ao titular.
4. Se risco relevante → notificar ANPD e titulares em **até 2 dias úteis**
   (Resolução CD/ANPD 15/2024). Modelo em `docs/templates/notif-anpd.md`.
5. Post-mortem em 5 dias.

## 5. Revisões periódicas
- Trimestral: lista de subprocessadores, acessos privilegiados.
- Anual: DPIA, mapeamento ROPA (art. 37), penetration test.

## 6. Contato ANPD
`[ANPD_CONTACT]` — https://www.gov.br/anpd/pt-br/canais_atendimento
