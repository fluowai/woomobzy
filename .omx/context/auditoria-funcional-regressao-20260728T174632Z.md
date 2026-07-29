# Contexto Ralph — auditoria funcional e regressão do IMOBZY

## Tarefa

Executar o plano canônico `DEV/SPECS/AUDITORIA_FUNCIONAL_REGRESSAO.md`.

## Resultado desejado

Iniciar pela Onda 0 e construir uma base executável para auditar todas as funções dos painéis Urbano, Rural, Super Admin e Mega Admin, com matriz rastreável, fixtures por perfil/tenant, smoke tests autenticados e gates contra regressão.

## Fatos e evidências conhecidos

- `App.tsx` contém 48 tags de rota no bloco Rural, 47 no Urbano, 13 no Mega Admin e 12 no Super Admin.
- Vitest: 18 arquivos e 90 testes aprovados na linha de base.
- Playwright: 5 cenários lógicos em 2 arquivos; cobertura atual concentrada em superfícies públicas.
- Build e type-check passaram em 2026-07-28.
- O lint terminou sem erros, mas com muitos avisos.
- O worktree já contém alterações do usuário e de trabalhos anteriores.

## Restrições

- Preservar alterações preexistentes e não reverter trabalho de terceiros.
- Não executar testes destrutivos em produção.
- Não criar, alterar ou remover dados reais sem autorização específica.
- Não executar commit, push ou deploy.
- Usar UTF-8 seguro e verificar ortografia.
- Atualizar documentação durável em `DEV/`.

## Desconhecidos

- Disponibilidade de credenciais reais de homologação para todos os perfis.
- Existência de organizações Urbana A/B e Rural A/B prontas para testes.
- Quais integrações externas estão disponíveis em homologação.
- Paridade exata entre o schema local/homologação e produção.

## Pontos prováveis do código

- `App.tsx`
- `components/ProtectedRoute.tsx`
- `components/PanelGuard.tsx`
- `components/SuperAdminGuard.tsx`
- `components/MegaAdminGuard.tsx`
- `context/AuthContext.tsx`
- `playwright.config.ts`
- `tests/e2e/`
- `server/api/`
- `services/`
- `migrations/`
- `DEV/SPECS/AUDITORIA_FUNCIONAL_REGRESSAO.md`

## Estratégia de execução

1. Inventariar rotas, perfis, guards, menus, APIs e testes existentes.
2. Criar matriz mestra rastreável e priorizada.
3. Implementar a infraestrutura de Playwright autenticado sem depender de produção.
4. Adicionar smoke tests de autorização e navegação para os quatro painéis.
5. Validar gates e registrar bloqueios reais de credenciais/ambiente sem mascará-los.
