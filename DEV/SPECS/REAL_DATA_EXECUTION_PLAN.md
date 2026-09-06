# Plano de execução — WooControl ao cliente final

Data: 2026-09-06. Status: PARCIAL VALIDADO LOCALMENTE, com P0/P1 críticos de IA/cobrança/integrações convertidos para dado real e homologação externa pendente.

## Escopo e diagnóstico

O inventário gerado a partir de `App.tsx` contém 184 rotas: WooControl 16, Mega Admin 15, Super Admin 14, Urbano 59, Rural 57 e público/compartilhado 23. Cada linha da matriz é um item de trabalho; nenhuma rota foi aprovada só por existir.

| Prioridade | Evidência | Problema / trabalho necessário | Estado |
| --- | --- | --- | --- |
| P0 | `server/routes/woo-control.js`, autorização global | Revendas eram aceitas como administradores globais, sem escopo por organização | Corrigido localmente com teste negativo; homologação pendente |
| P1 | `components/WooControlGuard.tsx`, `src/lib/panelNavigation.ts` | Dono em suporte e organização revendedora precisavam de regras consistentes | Corrigido localmente |
| P1 | `server/routes/woo-control.js`, summary/revenue | MRR consultava plan_id não selecionado; falhas viravam indicadores zero; estados PAID/PAGO divergiam | Corrigido localmente; ainda revisar definição de MRR versus recebimentos e paginação acima de 1.000 registros |
| P1 | `views/CreateOperationWizard.tsx` | Notas fixas, testes apenas marcados concluídos, publicação com mínimo zero, canais fictícios | Corrigido localmente: usa versões persistidas, teste real, mínimo 90, instâncias reais e regras persistidas; homologação pendente |
| P1 | `server/routes/aiOperations.js` | Publicação tratava relação de versões como objeto, ignorava erros de escrita e podia publicar zero agentes | Corrigido localmente: versão ativa explícita, gate por evidência, erro em zero agentes e escrita verificada |
| P1 | `server/api/ai/agents.routes.js`, `server/services/ai/testOrchestrator.js` | Import de pipeline, fallback mock e integração sem tenant | Corrigido localmente: pipeline real por `agentVersionId`, tenant keys, persistência de `ai_test_runs`/score/audit e falha sem provedor |
| P1 | `server/services/ai/testRunner.js`, `redTeam.js`, `scoringEngine.js` | Avaliação genérica, erro de provedor contado como bloqueio e categorias divergentes | Corrigido localmente: execução LLM real, prompt persistido, erros de infraestrutura bloqueiam publicação e categorias normalizadas |
| P1 | `views/AILogs.tsx`, `AIHistory.tsx`, `AIKnowledge.tsx`, `AIOperationDashboard.tsx` | Eventos, conteúdo e indicadores demonstrativos; alguns botões sem efeito | Corrigido localmente: telas consultam logs, histórico, conhecimento, métricas, testes e canais reais; mostram vazio/erro quando não há dado |
| P1 | `server/services/asaasGateway.js`, `server/routes/webhook.js`, `server/api/locacao/invoice.routes.js` | Cobrança, PIX e split fictícios; webhook de simulação público | Corrigido localmente: gateway exige chave real, usa cliente/pagamento Asaas, valida webhook por token e remove simulação pública |
| P1 | `server/services/email/campaignDispatcher.js` | Campanha/remetente/destinatário fixos | Corrigido localmente: campanha, remetente, template e público vêm do banco; migration cria tabelas necessárias; credencial/provedor falham explicitamente |
| P2 | `server/services/siengeService.js` | Conexão sempre positiva e transferências inventadas | Corrigido localmente: serviço exige URL/credenciais e chama endpoint real configurável; homologação Sienge pendente |
| P2 | `src/components/lease`, `views/RentalsManagement.tsx`, `LegalContracts.tsx` | Edição, upload, download, exportação e navegação com ações “em breve” | Pendente: persistência, storage, assinatura e fluxo financeiro completo |
| P2 | `views/rural/CadastroTecnico.tsx`, `DueDiligence.tsx`, `views/DataRoom.tsx` | Exclusão, upload e PDF sem implementação em ações específicas | Pendente: vincular APIs existentes ou criar endpoints com isolamento e retorno real |
| P2 | `views/PropertyManagement.tsx`, `EmailCenter.tsx`, `views/admin` | Filtros, encaminhamento, atendimento e atalhos com mensagens sem efeito | Pendente: implementar cada ação e testar resultado, não apenas toast |
| P1 | `scripts/check-db.mjs` | Retornava exit 0 mesmo com falhas e declarava banco pronto a partir de leituras públicas | Corrigido: exit 1 e diagnóstico sem alegar schema ausente ou escrita validada |
| P2 | `.gitignore` | Conteúdo com NUL e quebras de linha incompatíveis | Normalizado em UTF-8; `.env`, dependências e dist continuam ignorados |

Referências de linha dos itens não editados correspondem ao checkout inspecionado; a matriz e a triagem registram o inventário, não cobertura funcional integral.

## Sequência e critérios de aceite

1. **Fundação e ambiente.** Preparar homologação com duas organizações por nicho e contas exclusivas de dono, mega admin, revenda, admin urbano, corretor e admin rural. Verificar login, refresh, logout, suporte, plano, sessão e bloqueio cruzado. Auditar schema e migrações por diferença comprovada. Aceite: nenhum acesso ou escrita cruzada e nenhuma migração pendente necessária ao fluxo testado.
2. **WooControl.** Percorrer suas 16 rotas, confrontando listagens com banco e operações de licença, rede, snapshots, releases, suporte e saúde com serviços reais. Rever paginação, erros suprimidos e definições financeiras. Aceite: CRUD persistente, métricas reconciliadas e revenda recusada na API global.
3. **Mega Admin e revenda.** Exercitar as 29 rotas, incluindo organização, equipe, suporte, planos, domínio, faturamento e auditoria. Aceite: revenda A não vê nem altera filhos de B; proprietário acessa somente contexto permitido; ações administrativas geram auditoria real.
4. **Urbano e locação.** Percorrer as 59 rotas, priorizando lead → atendimento → imóvel → proposta/contrato → cobrança → repasse. Implementar as ações pendentes identificadas na triagem. Aceite: leitura após novo login confirma a alteração, dinheiro reconciliado com provedor, documentos recuperáveis e validação de corretor versus admin.
5. **Rural.** Percorrer as 57 rotas, priorizando imóvel, CAR/território, CRM, due diligence, valuation e documentos. Aceite: origem e data do dado externo identificadas, geometrias preservadas e cálculos testados com casos conhecidos; falha de provedor nunca gera resultado inventado.
6. **IA e canais.** Substituir dados demonstrativos por consultas com tenant; conectar instâncias reais, testar versões persistidas, ferramentas, memória, atendimento humano e indisponibilidade de LLM. Aceite: nenhum score fixo nem aprovação automática por erro de provedor; edição invalida validação antiga; versão publicada corresponde ao relatório aprovado.
7. **Cliente final e integrações.** Percorrer as 23 rotas públicas/compartilhadas e fluxos de proprietário, comprador e locatário mapeados na matriz. Testar domínio → imóvel → formulário → lead no tenant correto; documentos e permissões por destinatário. Provar callbacks e conciliação de pagamentos, assinatura, storage, e-mail e WhatsApp com destinatários de homologação. Não usar clientes reais como destinatários de testes.
8. **Regressão e entrega.** Executar type-check, lint, build, Vitest e Playwright autenticado em desktop/mobile. Testar falha de rede, repetição, paginação e organização vazia. Revisar todo sinal de mock e ação sem implementação; classificar falsos positivos explicitamente. Aceite: zero P0/P1 aberto, toda função contratada com evidência, zero dado fictício exibido como operacional, segredos fora do Git. Commit e push apenas das alterações revisadas, com estado de validação honesto.

## Regras de dados reais

- Não substituir mock por array vazio, zero ou toast de sucesso e chamar de integração concluída.
- Dados de teste isolados são permitidos nas suítes; não remover fixtures determinísticas de testes unitários.
- Conteúdo de template e imagens promocionais não provam dados de operação; revisar separadamente sem confundir com registros reais.
- Ausência de credencial ou provedor deve gerar erro/estado indisponível explícito. Sem registros reais, mostrar vazio; com falha na consulta, mostrar erro.
- Nenhuma cobrança, mensagem a terceiros ou alteração de produção foi executada nesta rodada.

## Verificação e bloqueios

Consultar `DEV/VERIFY.md` para resultados efetivamente executados. No ambiente atual faltam todas as credenciais IMOBZY_E2E_* dos seis perfis. A pergunta sobre homologação foi enviada ao usuário. Não há evidência suficiente para afirmar 100% funcional do sistema inteiro: P0/P1 críticos de IA/cobrança/integrações foram corrigidos localmente, mas permanecem ações “em breve” e integrações não homologadas nos módulos listados, além da necessidade de aplicar migrations novas em ambiente controlado.
