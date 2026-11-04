# Auditoria integral e dados reais

Data: 2026-09-06. Status: PARCIAL VALIDADO LOCALMENTE; sistema integral NÃO homologado.

Pedido: analisar WooControl até cliente final, planejar, corrigir, validar com dados reais e enviar ao Git. O envio de commit/push foi expressamente autorizado pelo usuário. Não houve autorização específica para executar cobranças, enviar mensagens a clientes ou modificar cadastros de produção em testes.

Plano e critérios: `SPECS/REAL_DATA_EXECUTION_PLAN.md`.
Inventário: `TESTS/FUNCTIONAL_AUDIT_MATRIX.md` (184 rotas).
Triagem: `TESTS/REAL_DATA_FINDINGS.md` (121 sinais estáticos originais, parte corrigida nesta execução; nova varredura ainda aponta ações pendentes fora de IA/Asaas/Wootech Mail/Sienge/CVCRM).

Aceite final depende de testes autenticados de leitura, criação, edição, persistência, exclusão controlada e isolamento entre organizações, além de comprovação de integrações nos provedores. Build e ausência da palavra mock não equivalem a aprovação funcional.

Dependências atuais: URL de homologação e contas exclusivas nos seis perfis; variáveis IMOBZY_E2E_* ausentes. Consulta pública ao banco retornou 401 em seis de sete tabelas; não interpretar isso como schema ausente. Não aplicar migrações indiscriminadamente.


Atualização 2026-09-06: removidos falsos sucessos/dados demonstrativos de IA operacional, Asaas, Wootech Mail, Sienge, CVCRM/BIA, scoring de lead, licenciamento e CMA. Gates locais passaram: type-check, lint, build, Vitest completo e matriz funcional. Pendências: aplicar migrations novas em ambiente controlado e homologar fluxos externos/autenticados com contas reais de teste.
