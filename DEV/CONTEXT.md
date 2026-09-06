# Contexto atual

2026-09-06. Auditoria integral solicitada com correção, dados reais, validação e envio ao Git. Inventário atual: 184 rotas em seis grupos.

Nesta data houve duas frentes: primeiro foi pushado `d261289` em `origin/main` com licenças/rede de revendas; depois a execução `codex/auditoria-dados-reais-20260906` removeu falsos sucessos e dados demonstrativos de partes críticas de IA, Asaas, Wootech Mail, Sienge, CVCRM/BIA, scoring, licenciamento e CMA.

O sistema integral ainda não pode ser declarado 100% homologado. As correções locais passaram por type-check, lint, build, Vitest e matriz funcional, mas as novas migrations não foram aplicadas em banco remoto e não houve autorização/ambiente de homologação para cobranças reais, webhooks reais, envio a terceiros, chamadas Sienge/CVCRM/BIA reais nem Playwright autenticado com todos os perfis.

Ao continuar, comece por `DEV/SPECS/REAL_DATA_EXECUTION_PLAN.md` e `DEV/VERIFY.md`. Não confundir estado vazio real com mock removido; também não confundir build verde com homologação funcional ponta a ponta.
