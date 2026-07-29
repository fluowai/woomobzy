# Checkpoint

- Fase: execução.
- Causas confirmadas: dois arquivos TypeScript em UTF-16 quebravam o ESLint; o render público ignora vários blocos e a flag `visible`; formulários públicos omitem o tenant e falham silenciosamente; HTML armazenado não é sanitizado.
- Arquivos alterados pela tarefa: artefatos `.omx` e conversão UTF-8 de `src/types/database.types.ts` e `types/database.types.ts`.
- Próxima ação: implementar renderer completo, captura de lead com contexto e sanitização, acompanhados de testes.
- Verificação: testes focados, lint `--quiet`, type-check, Vitest e build.
