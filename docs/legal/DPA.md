# Data Processing Agreement (DPA) — Template

Entre **[CLIENTE]** ("Controlador") e **[APP_OWNER]** ("Operador").

## 1. Objeto
Tratamento de dados pessoais em nome do Controlador para prestação do
serviço [APP_NAME], nos termos da LGPD.

## 2. Natureza e finalidade
Armazenamento, análise, envio de mensagens automatizadas e processamento
via IA, exclusivamente para as finalidades autorizadas pelo Controlador.

## 3. Duração
Vigência do contrato principal. Após término, os dados são devolvidos ou
eliminados em até 30 dias.

## 4. Obrigações do Operador
- Tratar dados apenas conforme instruções documentadas.
- Manter registro de operações (art. 37 LGPD).
- Notificar incidentes em até 24 h.
- Aplicar as medidas técnicas do Anexo A.
- Não subcontratar sem aprovação (lista em `SUBPROCESSORS.md`).

## 5. Direitos dos titulares
O Operador auxiliará o Controlador no atendimento a requisições dentro
de 5 dias úteis.

## 6. Transferência internacional
Realizada somente para países com nível adequado ou mediante cláusulas
contratuais padrão (art. 33 LGPD).

## 7. Auditoria
O Controlador poderá auditar o Operador 1x/ano com aviso prévio de 30 dias.

## Anexo A — Medidas técnicas e organizacionais
TLS 1.2+; criptografia AES-256 em repouso; RLS por tenant; MFA
administrativo; revisão trimestral de acessos; backups diários com
retenção de 30 dias; testes de restore trimestrais; Sentry + logs
estruturados; rate limiting distribuído (Redis).

Assinado em [DATA] por [REPRESENTANTE_CLIENTE] e [REPRESENTANTE_OPERADOR].
