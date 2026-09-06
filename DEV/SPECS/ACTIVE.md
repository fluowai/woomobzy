# Auditoria integral e dados reais

Data: 2026-09-06. Status: EM EXECUÇÃO; sistema integral NÃO homologado.

Pedido: analisar WooControl até cliente final, planejar, corrigir, validar com dados reais e enviar ao Git. O envio de commit/push foi expressamente autorizado pelo usuário. Não houve autorização específica para executar cobranças, enviar mensagens a clientes ou modificar cadastros de produção em testes.

Plano e critérios: `SPECS/REAL_DATA_EXECUTION_PLAN.md`.
Inventário: `TESTS/FUNCTIONAL_AUDIT_MATRIX.md` (184 rotas).
Triagem: `TESTS/REAL_DATA_FINDINGS.md` (121 sinais estáticos, sujeitos a revisão).

Aceite final depende de testes autenticados de leitura, criação, edição, persistência, exclusão controlada e isolamento entre organizações, além de comprovação de integrações nos provedores. Build e ausência da palavra mock não equivalem a aprovação funcional.

Dependências atuais: URL de homologação e contas exclusivas nos seis perfis; variáveis IMOBZY_E2E_* ausentes. Consulta pública ao banco retornou 401 em seis de sete tabelas; não interpretar isso como schema ausente. Não aplicar migrações indiscriminadamente.
