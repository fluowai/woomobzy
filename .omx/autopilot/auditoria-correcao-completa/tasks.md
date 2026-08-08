# Tarefas

1. `AUD-01` — baseline de lint, tipos, testes e build. Verificação: saídas dos quatro comandos.
2. `AUD-02` — correções por causa raiz e testes de regressão. Depende de `AUD-01`.
3. `WEB-01` — auditar landing/site público, conteúdo e estados responsivos. Depende de `AUD-01`.
4. `WEB-02` — implementar a menor fatia coerente para os problemas confirmados. Depende de `WEB-01`.
5. `QA-01` — Playwright real em viewports móvel e desktop, console e acessibilidade básica. Depende de `AUD-02` e `WEB-02`.
6. `DOC-01` — atualizar `DEV/` com relatório, verificação e handoff. Depende de `QA-01`.
