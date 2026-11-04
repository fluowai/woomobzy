# Plano de implementação

1. Corrigir encoding dos tipos gerados e alinhar o escopo do ESLint aos diretórios mantidos.
2. Criar serviço tipado de captura pública de lead, com contexto de tenant e erros estruturados.
3. Corrigir `FormBlock`, `HeroWithFormBlock` e formulário de HTML customizado para estados de sucesso/erro.
4. Sanitizar HTML rico e adicionar testes contra script, handlers e URLs perigosas.
5. Centralizar o render público dos blocos e cobrir tipos atualmente invisíveis, inclusive destaque, busca e funcionalidades.
6. Corrigir visibilidade, larguras de container e metadados da página pública.
7. Adicionar testes unitários/componentes e E2E local; rodar gates completos.
8. Registrar evidências em `.omx` e `DEV/`.

Cada etapa usa teste focado antes do gate amplo. Nenhum arquivo previamente alterado pelo usuário será revertido.

