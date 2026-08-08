# SPECS/ACTIVE.md — Tarefa Ativa

## Agenda Multi-Agenda (por corretor + visita a imóveis)

**Status**: IMPLEMENTADO no working tree — aguardando validação do maestro.

**Data**: 2026-08-04

### Escopo (contrato da tarefa)

1. A aba Agenda deve ser **multi-agenda**: permitir criar mais de uma agenda por organização.
2. Cada agenda pode ser **vinculada a um corretor específico** (`broker_id`).
3. A agenda serve para **agendar visitas a imóveis** (vínculo com `properties` via `property_id`), além de reuniões/retornos.

### Critérios de aceite

- [x] Migration `migrations/20260804_create_agendas.sql` cria `agendas` (org, nome, descrição, corretor, cor, tipo, ativo) com RLS por organização.
- [x] `lead_appointments` ganha `agenda_id` (FK `agendas`) e `property_id` (FK `properties`) + índices.
- [x] View da Agenda: criar/editar/excluir agendas; selecionar agenda; vincular corretor; agendar compromisso com Imóvel (visita), Lead opcional e Corretor.
- [x] Admin vê todas as agendas; corretor não-admin vê apenas as próprias.
- [x] Kanban (aba Agendamentos do lead): selecionar Agenda e Imóvel ao criar compromisso.
- [x] Agente IA `agendar_visita`: aceita `agenda_id` e persiste `property_id`.
- [ ] Migration aplicada em dev/prod (`exec_sql`) — **pendente autorização do maestro**.
- [ ] Validação no navegador `/urban/agenda` e `/rural/agenda` — **pendente**.

### Gates executados

- type-check: 0 erros
- eslint arquivos alterados: 0 erros (2 warnings pré-existentes no LeadDetailsModal)
- build: OK (1m40s)
- vitest: 36 arquivos / 254 testes OK
- `node --check` do `agentOrchestrator.js`: OK

### Notas / riscos

- Runtime depende da migration estar aplicada (FKs `agenda_id`/`property_id` e tabela `agendas`), senão os `.select('*, property:properties(...)')` falham.
- Working tree tem WIP de outras sessões (woosign, licensing PR #66, Zya IA) — conferir `git status` antes de qualquer commit/push.
