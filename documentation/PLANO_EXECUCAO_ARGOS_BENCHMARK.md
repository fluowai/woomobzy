# Plano de execucao - Benchmark Argos Real Estate

Data: 2026-06-11

## Objetivo

Transformar a Imobzy/ImobFlow em uma jornada comercial completa:
captacao -> WhatsApp IA -> CRM -> match de imoveis -> visita -> contrato -> cobranca/pos-venda.

## Fase 1 - Landing e posicionamento

Status: executado na primeira entrega.

- Reposicionar a pagina publica como maquina comercial imobiliaria.
- Destacar WhatsApp + IA, campanhas, portais, contratos, catalogo e gestao 360.
- Trocar narrativa de "CRM completo" para "lead qualificado no WhatsApp e fluxo ate o fechamento".
- Manter CTA para qualificacao consultiva.
- Adicionar hero escuro com mockup de WhatsApp, imovel e portais.
- Inserir faixa de portais, vitrine de imoveis, stack de recursos, fluxo em 3 passos,
  mercado adaptado, pricing e CTA final.

Arquivo principal:

- `views/SystemSalesPage.tsx`

Resultado aplicado:

- A landing publica agora segue uma narrativa completa parecida com o benchmark,
  mas adaptada para ImobFlow/Imobzy e sem copiar assets externos.
- Secoes implementadas: hero, portais, WhatsApp IA, vitrine de estoque,
  funcionalidades, fluxo comercial, corretor, mercado, planos, diagnostico,
  formulario e footer.

## Fase 2 - Capture OS

Criar uma tela operacional unica para captacao:

- Leads recentes por origem.
- WhatsApp sem resposta.
- Campanhas ativas.
- Imoveis com melhor match.
- Proximas acoes sugeridas por IA.
- Alertas de gargalo: lead sem resposta, campanha sem conversao, imovel sem tracao.

Modulos existentes para reaproveitar:

- `views/CRM/CRMLeads.tsx`
- `views/CRM/KanbanBoard.tsx`
- `views/WhatsApp/WhatsAppDashboard.tsx`
- `server/services/leadPropertyMatcher.js`

## Fase 3 - Exportador de portais real

Conectar a tela atual ao backend e banco:

- Listar integracoes reais por tenant.
- Gerar feed XML validado.
- Publicar/despublicar por imovel.
- Registrar logs de sincronizacao.
- Mostrar erros por portal.
- Suportar ZAP, Viva Real e feed generico primeiro.

Arquivos-base:

- `views/urban/ExportadorPortais.tsx`
- `server/services/portalService.js`
- `server/services/zapService.js`
- `server/services/vivarealService.js`
- `migrations/20260610_portal_integrations.sql`

## Fase 4 - Campanhas e criativos com IA

Criar fluxo inspirado no benchmark, mas integrado ao ecossistema Imobzy:

- Escolher objetivo: divulgar imovel, captar proprietario, receber WhatsApp.
- Selecionar imovel ou enviar fotos.
- Gerar texto, arte e chamada com IA.
- Salvar campanha e origem de leads.
- Preparar publicacao Meta como integracao futura.

## Fase 5 - SalesBots / Fluxos WhatsApp

Criar construtor simples de automacoes:

- Boas-vindas.
- Qualificacao.
- Agendamento.
- Follow-up.
- Pos-venda.
- Acoes: enviar mensagem, esperar, aplicar tag, mover etapa, enviar imovel, notificar corretor.

Base atual:

- `views/AIAgents.tsx`
- `server/api/ai/index.js`
- `whatsapp-service/internal/whatsapp/automation.go`

## Fase 6 - Catalogo publico rapido

Criar link compartilhavel por tenant:

- `/catalogo/:slug`
- Filtros por finalidade, tipo, cidade, bairro, preco e quartos.
- CTA de WhatsApp por imovel.
- SEO basico e imagem social.
- Opcao de destacar imoveis.

Base atual:

- `views/PublicSite.tsx`
- `views/PropertyListing.tsx`
- `services/properties.ts`

## Fase 7 - Contratos e assinatura

Fechar o fluxo juridico:

- Status: rascunho, aguardando assinatura, assinado, cancelado.
- Envio por WhatsApp/email.
- Integracao ZapSign configuravel por tenant.
- Auditoria de eventos.
- Templates por venda, locacao, autorizacao e captacao.

Base atual:

- `views/LegalContracts.tsx`
- `views/urban/GestaoDocumentos.tsx`
- `services/legalValidationService.ts`
- `SystemSettings.tsx` com ZapSign API Token.

## Ordem recomendada

1. Landing e copy comercial.
2. Capture OS.
3. Exportador de portais.
4. Catalogo publico.
5. Campanhas IA.
6. SalesBots.
7. Contratos com assinatura.

## Observacao sobre o benchmark

O site da Argos mostra sinais fortes de ter sido gerado/publicado por Lovable:

- script `__l5e/events.js`;
- `data-artifact-kind="preview_commit_sha"`;
- `gpt-engineer-file-uploads` em imagem OG;
- bundle Vite/React com rotas de produto em chunks.

Isso nao prova autoria com 100% de certeza, mas e um indicio tecnico bem consistente.
