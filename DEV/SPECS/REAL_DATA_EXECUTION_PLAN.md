# Plano de execução — WooControl ao cliente final

Data: 2026-09-06. Status: PARCIAL, com correções locais e homologação pendente.

## Escopo e diagnóstico

O inventário gerado a partir de `App.tsx` contém 184 rotas: WooControl 16, Mega Admin 15, Super Admin 14, Urbano 59, Rural 57 e público/compartilhado 23. Cada linha da matriz é um item de trabalho; nenhuma rota foi aprovada só por existir.

| Prioridade | Evidência | Problema / trabalho necessário | Estado |
| --- | --- | --- | --- |
| P0 | `server/routes/woo-control.js`, autorização global | Revendas eram aceitas como administradores globais, sem escopo por organização | Corrigido localmente com teste negativo; homologação pendente |
| P1 | `components/WooControlGuard.tsx`, `src/lib/panelNavigation.ts` | Dono em suporte e organização revendedora precisavam de regras consistentes | Corrigido localmente |
| P1 | `server/routes/woo-control.js`, summary/revenue | MRR consultava plan_id não selecionado; falhas viravam indicadores zero; estados PAID/PAGO divergiam | Corrigido localmente; ainda revisar definição de MRR versus recebimentos e paginação acima de 1.000 registros |
| P1 | `views/CreateOperationWizard.tsx:85`, `:206`, `:218`, `:562` | Notas fixas, testes apenas marcados concluídos, publicação com mínimo zero, canais fictícios | Pendente: avaliação real, persistência de versão, seleção de instâncias e gravação de regras |
| P1 | `server/routes/aiOperations.js:523` | Publicação trata relação de versões como objeto, não seleciona IDs atualizados, ignora erros de escrita e pode publicar zero agentes | Pendente: gate por versão ativa, tenant em todas as consultas e transação de publicação |
| P1 | `server/api/ai/agents.routes.js:1302`, `server/services/ai/testOrchestrator.js` | Import de pipeline aponta para diretório incorreto; pipeline faz fallback mock; configuração de integração consultada sem tenant | Pendente: corrigir caminho, escopo, usar prompt persistido, falhar sem provedor e persistir evidência real |
| P1 | `server/services/ai/testRunner.js`, `redTeam.js`, `scoringEngine.js` | Avaliação genérica não prova ferramentas/memória reais; erro de provedor é contado como bloqueio no red team; categorias divergentes | Pendente: execução real de ferramentas, evidência e rejeição de falhas de infraestrutura |
| P1 | `views/AILogs.tsx`, `AIHistory.tsx`, `AIKnowledge.tsx`, `AIOperationDashboard.tsx` | Eventos, conteúdo e indicadores demonstrativos; alguns botões sem efeito | Pendente: API com tenant, paginação, filtros, exportação e estados vazios/erro |
| P1 | `server/services/asaasGateway.js`, `server/routes/webhook.js` | Cobrança, PIX e split fictícios; webhook de simulação montado no servidor | Pendente: integração oficial, verificação de webhook, idempotência, conciliação e remoção da simulação pública |
| P1 | `server/services/email/campaignDispatcher.js` | Campanha/remetente/destinatário fixos | Pendente: buscar campanha e público reais, consentimento, fila, idempotência e entrega comprovada |
| P2 | `server/services/siengeService.js` | Conexão sempre positiva e transferências inventadas; nenhum consumidor localizado na busca | Pendente: definir ativação/contrato da integração, implementar API e não anunciar conexão sem teste |
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

Consultar `DEV/VERIFY.md` para resultados efetivamente executados. No ambiente atual faltam todas as credenciais IMOBZY_E2E_* dos seis perfis. A pergunta sobre homologação foi enviada ao usuário. Não há evidência suficiente para afirmar 100% funcional ou zero mocks: permanecem os itens acima e os 121 sinais estáticos para revisão.
