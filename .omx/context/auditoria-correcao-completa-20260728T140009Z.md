# Contexto — auditoria e correção completa

- Pedido: analisar profundamente o IMOBZY, corrigir erros encontrados, criar/validar sites e landing pages, executar testes reais e produzir relatório.
- Resultado desejado: repositório saudável, fluxos públicos relevantes funcionais, regressões cobertas e evidências reproduzíveis.
- Evidências iniciais: React 19 + Vite + TypeScript; backend Express; Supabase; editor de sites e landing pages já existente; Vitest e Playwright configurados.
- Restrições: preservar alterações do usuário; não fazer commit/push; não tocar em produção, banco real, pagamentos ou mensageria; não expor segredos; usar UTF-8.
- Alterações preexistentes: `views/RuralDashboard.tsx` e `views/WhatsApp/hooks/api.ts` estão modificados/staged e não fazem parte deste trabalho.
- Incógnitas: falhas atuais dos gates; qualidade real dos fluxos públicos; dependências externas necessárias para E2E autenticado.
- Pontos prováveis: `App.tsx`, `views/SystemSalesPage.tsx`, `views/PublicLandingPage.tsx`, `views/LandingPageManager.tsx`, `views/LandingPageEditor.tsx`, `services/landingPages.ts`, templates/blocos e testes.
- Fase atual: baseline e diagnóstico.
- Próxima ação: executar lint, type-check, testes e build; reduzir cada falha ao menor caso reproduzível.
- Validação: `npm run lint`, `npm run type-check`, `npm run test -- --run`, `npm run build` e Playwright local.

