# Especificação — auditoria e correção completa do IMOBZY

## Escopo confirmado

- Restaurar gates locais quebrados e registrar passivos não bloqueantes.
- Corrigir o fluxo de criação/publicação de landing pages já existente.
- Garantir que todos os blocos oferecidos pelo editor tenham representação pública coerente.
- Fazer formulários públicos enviarem contexto do tenant, mostrarem sucesso/erro e não falharem silenciosamente.
- Sanitizar HTML rico armazenado antes da renderização pública.
- Validar rotas públicas em navegador real, móvel e desktop, sem efeitos externos.
- Produzir relatório durável em `DEV/`.

## Critérios de aceitação

1. Lint sem erros fatais; tipos, testes e build aprovados.
2. Arquivos TypeScript em UTF-8, sem serem classificados como binários.
3. Blocos visíveis publicados são renderizados; blocos ocultos não aparecem.
4. Formulários enviam `organization_id`/`organization_slug` quando disponíveis e mostram erro acessível em respostas não-2xx.
5. HTML de texto/customizado remove scripts e handlers perigosos.
6. Landing comercial principal e login carregam sem erro de página/console em Chromium, em viewport móvel e desktop.
7. Relatório separa corrigido, saudável, passivo e não testável sem infraestrutura externa.

## Fora de escopo e riscos

- Sem deploy, migração, alteração de RLS, cobrança, mensagens reais ou dados de produção.
- Fluxos autenticados dependentes de credenciais reais serão testados apenas até o limite seguro local.
- Avisos históricos de lint serão classificados; não haverá reescrita indiscriminada de centenas de arquivos sem relação causal.

