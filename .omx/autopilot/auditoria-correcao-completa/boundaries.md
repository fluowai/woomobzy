# Limites de execução

## Nunca

- Não executar comandos destrutivos de Git, apagar trabalho do usuário, fazer commit/push ou publicar/deployar.
- Não registrar, imprimir ou mover segredos do `.env`.
- Não alterar dados de produção nem contatar clientes.

## Zona de risco

- Autenticação, Supabase/RLS, migrações, cobrança, WhatsApp, e-mail e APIs externas exigem testes sem efeitos colaterais.
- Alterações preexistentes em `views/RuralDashboard.tsx` e `views/WhatsApp/hooks/api.ts` devem ser preservadas.

## Rollback

- As mudanças desta tarefa permanecerão isoladas no diff local e poderão ser revisadas por arquivo; nenhum commit será criado.

## Verificação

- Gates: lint, TypeScript, Vitest, build, testes Go quando aplicáveis e Playwright em servidor local.
- UI: rotas públicas, console do navegador, falhas de rede relevantes, acessibilidade básica e viewports móvel/desktop.
