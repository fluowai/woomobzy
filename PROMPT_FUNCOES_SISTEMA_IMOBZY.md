# Prompt mestre: analise completa das funcoes do sistema IMOBZY

Use este prompt para pedir a uma IA, equipe tecnica, designer de produto ou analista de negocio uma avaliacao completa do sistema IMOBZY, considerando todas as areas funcionais identificadas no codigo atual.

---

## 1. Contexto geral do sistema

Analise o IMOBZY como uma plataforma SaaS imobiliaria multi-tenant, com paineis separados para operacao rural, operacao urbana e super administracao da plataforma.

O sistema possui:

- Frontend em React, TypeScript, Vite, Tailwind CSS e React Router.
- Backend em Node.js com Express.
- Banco e autenticacao via Supabase.
- Arquitetura multi-tenant por organizacao/imobiliaria.
- Separacao por nicho: rural, urbano ou hibrido.
- Rotas publicas para site, landing pages, quiz, login, onboarding e consultoria.
- Rotas protegidas para painel rural, painel urbano e superadmin.
- Guardas de acesso por autenticacao, assinatura/plano, permissao de painel e role de superadmin.
- Integracoes com WhatsApp, email, IA, portais, dominios, storage, dados rurais, dados urbanos e documentos.

Objetivo da analise:

- Listar todas as funcoes existentes.
- Separar as funcoes por etapa de uso.
- Separar as funcoes por perfil: Super Admin, Cliente Imobiliaria Rural e Cliente Imobiliaria Urbana.
- Identificar funcionalidades publicas, operacionais, comerciais, administrativas e tecnicas.
- Apontar o que cada modulo permite fazer.
- Apontar possiveis melhorias, lacunas e proximos passos.

---

## 2. Etapas principais da jornada do sistema

### Etapa 1: Acesso publico e captacao

Analise as funcoes publicas:

- Pagina inicial comercial do sistema.
- Pagina de vendas.
- Pagina de consultoria.
- Qualificacao para consultoria.
- Cadastro/registro.
- Login.
- Onboarding inicial.
- Ajuda de DNS.
- Landing pages publicas por slug.
- Quiz publico por slug.
- Site publico da imobiliaria por slug.
- Pagina publica em modo "em breve".
- Formularios de contato e captacao de leads.
- Captacao de leads por landing pages, site publico e quiz.
- Tracking pixels e rastreamento de campanhas.
- Resolucao de tenant por dominio customizado ou slug.

### Etapa 2: Entrada no painel

Analise as funcoes de acesso e roteamento:

- Autenticacao de usuario.
- Contexto de usuario, perfil e organizacao.
- Redirecionamento automatico por nicho.
- Protecao de rotas autenticadas.
- Bloqueio por assinatura/plano.
- Bloqueio por painel rural ou urbano.
- Superadmin com acesso separado.
- Modo impersonation para superadmin acessar uma organizacao.
- Banner de impersonation e opcao de encerrar acesso.
- Carregamento global, tratamento de erro e fallback.

### Etapa 3: Operacao diaria da imobiliaria

Analise as funcoes comuns aos clientes:

- Dashboard operacional.
- Mensagens WhatsApp.
- Central de email.
- Kanban comercial.
- CRM de leads.
- Gestao de imoveis.
- Criacao e edicao de imoveis.
- Landing pages.
- Quiz de qualificacao.
- Site da imobiliaria.
- Editor visual de site.
- Configuracao de site.
- Agentes de IA.
- Relatorios/BI.
- Contratos.
- Configuracoes.
- Conexoes e integracoes.
- Suporte via modal.

### Etapa 4: Crescimento, automacao e inteligencia

Analise os modulos de crescimento:

- Landing page manager.
- Editor de landing pages.
- Templates de landing page.
- Blocos visuais: hero, formulario, galeria, mapa, depoimentos, estatisticas, CTA, texto, imagem, HTML customizado, rodape, carrossel de imoveis e card de corretor.
- Clonagem/geracao de layout por IA.
- Editor visual de site.
- Site builder com paginas publicaveis.
- SEO e configuracoes visuais.
- Quiz de campanhas.
- Geracao de quiz a partir de PDF.
- Matchmaking entre leads e imoveis.
- Agentes de IA com memoria, metricas, qualificacao e aprendizado.
- Chat de IA.
- Copywriter inteligente.
- Lead Matchmaker.
- Agente de cobranca e negociacao.

### Etapa 5: Administracao e governanca

Analise funcoes administrativas:

- Configuracoes da organizacao.
- Textos publicos.
- Dominios customizados.
- Conexoes de WhatsApp.
- Integracoes de IA.
- Contas de email.
- Planos e recursos por assinatura.
- Usuarios, roles e permissoes.
- Auditoria de atividades.
- Logs e monitoramento.

---

## 3. Perfil: Super Admin

Analise o Super Admin como operador da plataforma SaaS inteira.

### 3.1 Dashboard Super Admin

Funcoes esperadas/identificadas:

- Visao geral da plataforma.
- Indicadores globais.
- Status de clientes/imobiliarias.
- Resumo de operacao SaaS.
- Navegacao para modulos administrativos.

### 3.2 Analytics

Funcoes:

- Painel de analytics global.
- Indicadores de uso.
- Analise de atividade de tenants.
- Metricas agregadas de plataforma.
- Possivel acompanhamento de crescimento, leads, uso de features e performance.

### 3.3 Monitoring

Funcoes:

- Monitoramento tecnico da plataforma.
- Status operacional.
- Saude de servicos.
- Possivel acompanhamento de APIs, backend, storage e integracoes.

### 3.4 Gestao de imobiliarias/tenants

Funcoes:

- Listar organizacoes/imobiliarias.
- Criar nova organizacao.
- Editar organizacao existente.
- Suspender ou reativar organizacao.
- Excluir organizacao individual.
- Exclusao em massa de organizacoes.
- Buscar organizacoes.
- Associar plano.
- Definir nicho rural, urbano ou hibrido.
- Impersonar/acessar como uma organizacao.
- Vincular perfis a organizacoes.

### 3.5 Suporte

Funcoes:

- Listar tickets de suporte.
- Filtrar tickets abertos, em andamento ou todos.
- Visualizar conversa de suporte.
- Enviar resposta.
- Alterar status do ticket.
- Resolver ticket.
- Relacionar tickets a usuarios e organizacoes.

### 3.6 Equipe

Funcoes:

- Listar membros/staff.
- Buscar membros.
- Abrir modal de convite.
- Convidar usuario de equipe.
- Remover membro da equipe.
- Gerenciar equipe interna da plataforma.

### 3.7 Planos

Funcoes:

- Gerenciar planos comerciais.
- Associar recursos/limites.
- Controlar features disponiveis por plano.
- Apoiar bloqueio por assinatura.

### 3.8 Billing

Funcoes:

- Gerenciar cobranca da plataforma.
- Ver dados financeiros globais.
- Acompanhar pagamentos, assinaturas ou status financeiro de clientes.

### 3.9 Feature Flags

Funcoes:

- Ativar ou desativar funcionalidades.
- Controlar liberacao gradual de modulos.
- Segmentar recursos por tenant/plano.

### 3.10 Audit Log

Funcoes:

- Visualizar eventos de auditoria.
- Acompanhar acoes administrativas.
- Rastrear mudancas sensiveis.
- Apoiar seguranca e compliance.

### 3.11 Templates

Funcoes:

- Listar templates.
- Filtrar por tipo e categoria.
- Criar templates.
- Duplicar templates.
- Excluir templates.
- Tipos previstos: landing page, email, contrato e relatorio.

### 3.12 Dominios

Funcoes:

- Gerenciar dominios customizados.
- Adicionar dominio.
- Remover dominio.
- Verificar DNS.
- Sincronizar dominios.
- Apoiar roteamento por tenant.

### 3.13 Consultoria

Funcoes:

- Gerenciar leads de consultoria.
- Ver interessados vindos da pagina comercial.
- Acompanhar qualificacao de consultoria.
- Gerenciar agenda/demonstrações quando aplicavel.

### 3.14 Importador IA

Funcoes:

- Analisar importacao de dados.
- Finalizar importacao.
- Importar dados de sites/sistemas externos.
- Apoiar migracao de propriedades e imagens.
- Usar inteligencia para revisar dados importados.

### 3.15 Migracao FluowAI

Funcoes:

- Criar jobs de migracao.
- Testar conexoes.
- Diagnosticar dados.
- Analisar organizacao de midias.
- Executar dry-run.
- Migrar storage.
- Validar migracao.
- Gerar relatorio de migracao.

### 3.16 Storage Intelligence

Funcoes:

- Configurar destino MinIO/S3.
- Ver resumo de storage.
- Listar buckets.
- Listar arquivos.
- Gerar URL assinada.
- Ver maiores arquivos.
- Analisar arquivos por extensao, prefixo e tenant.
- Detectar duplicados.
- Detectar orfaos entre banco e MinIO.
- Simular limpeza.
- Aplicar lifecycle.
- Suspender versionamento.
- Apagar expirados.
- Apagar orfaos.
- Apagar duplicados.
- Ver logs de storage.
- Medir espaco usado e recuperavel.

### 3.17 Marketing e SEO

Funcoes:

- Gerenciar acoes de marketing.
- Apoiar SEO das paginas comerciais ou templates.
- Possivel gestao de conteudo e rastreamento.

### 3.18 Configuracoes globais

Funcoes:

- Definir parametros globais da plataforma.
- Configurar comportamento padrao.
- Gerenciar integracoes globais.
- Controlar opcoes de sistema.

---

## 4. Perfil: Cliente Imobiliaria Rural

Analise o painel rural como uma operacao imobiliaria focada em fazendas, areas rurais, CAR, geointeligencia, due diligence e ativos de alto valor.

### 4.1 Operacao rural

Funcoes do menu Operacao:

- Dashboard rural.
- Mensagens WhatsApp.
- Email.
- Kanban.
- CRM.

Detalhar:

- Indicadores de operacao rural.
- Leads rurais.
- Pipeline comercial.
- Atendimento por WhatsApp.
- Historico de conversas.
- Envio e recebimento de mensagens e midias.
- Atendimento por email.
- Criacao de leads.
- Movimentacao de leads entre etapas.
- Exclusao individual ou em massa de leads.
- Abertura do WhatsApp a partir do card do lead.
- Cadastro de atividades no lead.
- Alteracao de status.
- Match de propriedades com leads.
- Distribuicao de leads entre corretores.
- Estrategias de distribuicao.
- Campanhas drip.
- Relatorios de funil e ranking.

### 4.2 Carteira rural

Funcoes:

- Imoveis rurais.
- Cadastro tecnico.
- Territorio rural.
- Valuation CAR.

Detalhar gestao de imoveis:

- Listagem de propriedades.
- Criacao de propriedade.
- Edicao de propriedade.
- Exclusao de propriedade.
- Filtro por nicho.
- Enriquecimento via ACP.
- Dados especificos rurais.
- Fotos e arquivos.
- Publicacao em site/landing.

Detalhar cadastro tecnico:

- Propriedades georreferenciadas.
- Arquivos importados.
- Poligonos validados.
- Cadastros pendentes.
- Aba de listagem.
- Aba de importacao.
- Upload ou revisao de arquivos tecnicos.
- Validacao de poligonos.

### 4.3 Territorio Rural

Submodulos:

- Mapas/geointeligencia.
- Localizar CAR.
- Valuation.
- Due diligence.
- Dossie inteligente.

Funcoes de geointeligencia:

- Visualizar mapas rurais.
- Processar dados geograficos.
- Consultar coordenadas.
- Cruzar area com bases externas.
- Usar Leaflet/mapas.
- Consultar PRODES.
- Consultar embargos.
- Consultar MapBiomas.
- Consultar producao agricola.
- Consultar SNCR.

Funcoes de localizar CAR:

- Buscar imovel rural por localizacao.
- Listar candidatos.
- Selecionar propriedade candidata.
- Criar propriedade a partir de candidato.
- Navegar para cadastro/edicao.

Funcoes de valuation rural:

- Estimar valor por propriedade.
- Estimar valor por CAR.
- Historico de valuations.
- Comparaveis.
- Regras de avaliacao.
- Dados de mercado rural.
- Precos CEPEA quando aplicavel.
- Enriquecimento com dados externos.

Funcoes de due diligence:

- Checklist documental.
- Status: aprovado, pendente, rejeitado e faltando.
- Score geral.
- Score fundiario.
- Score ambiental.
- Validacao CAR.
- Validacao SNCR/CCIR/INCRA.
- Validacao SIGEF/georreferenciamento.
- Validacao ITR/Receita.
- Ciclo manual de status.
- Atualizacao por consulta externa.

Funcoes de dossie inteligente:

- Consolidar informacoes da propriedade.
- Verificar georreferenciamento.
- Verificar CAR ambiental.
- Verificar matricula.
- Gerar dossie.
- Exportar PDF de dossie.

### 4.4 Data room e contratos

Funcoes:

- Data room.
- Contratos.
- Documentos por propriedade.
- Upload de documentos.
- Analise/classificacao de documentos.
- Exclusao de documentos.
- Webhook de processamento por worker.
- Contratos juridicos.
- Possivel geracao de documentos.

### 4.5 Crescimento rural

Funcoes:

- Metas e vendas.
- Meu site.
- Editor visual.
- Configurar site.
- Landing pages.
- Quiz.
- Matchmaking 360.
- Agentes IA.
- Relatorios.

Detalhar metas e vendas:

- VGV acumulado.
- Comissao estimada.
- Fazendas vendidas.
- Ticket medio.
- Salvamento de metas rurais.
- Analise financeira/comercial.

Detalhar site e landing pages:

- Criar site da imobiliaria.
- Editar configuracoes do site.
- Editar paginas.
- Publicar paginas.
- Duplicar paginas.
- Reordenar paginas.
- Usar blocos visuais.
- Criar landing pages.
- Editar landing pages.
- Publicar landing pages por slug.
- Personalizar tema, SEO e propriedades exibidas.

Detalhar quiz:

- Criar campanhas.
- Editar campanhas.
- Receber respostas/submissoes.
- Gerar campanha por PDF.
- Publicar quiz publico.

Detalhar IA:

- Criar agentes.
- Editar agentes.
- Excluir agentes.
- Conversar com agente.
- Memoria por sessao.
- Limpar memoria.
- Qualificar resposta.
- Registrar aprendizado.
- Ver metricas do agente.
- Gerar layout/pagina por IA.

### 4.6 Comunicacao rural

Funcoes WhatsApp:

- Gerenciar instancias.
- Criar instancia.
- Conectar instancia.
- Ler QR Code.
- Usar codigo de pareamento.
- Logout de instancia.
- Excluir instancia.
- Listar chats.
- Criar/garantir chat.
- Listar mensagens.
- Enviar texto.
- Enviar midia.
- Importar historico.
- WebSocket para atualizacoes.
- Status de instancia em tempo real.
- Reprocessar midia.
- Gerar URL de midia.
- Perfil de contato.
- Tags de contato.
- Transferencia de atendimento.
- Prioridade.
- Tarefas.
- Vincular contato ao CRM.

Funcoes Email:

- Configurar contas.
- Testar conta.
- Excluir conta.
- Sincronizar emails.
- Listar emails.
- Ver thread.
- Enviar email.
- Responder email.
- Atualizar status de email.
- Agenda a partir de email.

### 4.7 Conexoes e configuracoes rurais

Funcoes:

- Conexoes do plano.
- Status das integracoes.
- Conexao WhatsApp.
- Conexao email.
- Configuracoes do sistema.
- Integracoes com IA.
- API keys quando aplicavel.
- Configuracoes de site e tenant.

---

## 5. Perfil: Cliente Imobiliaria Urbana

Analise o painel urbano como uma operacao imobiliaria focada em venda, locacao, loteamentos, condominios, contratos, documentos, chaves e financeiro.

### 5.1 Operacao urbana

Funcoes do menu Operacao:

- Dashboard urbano.
- Mensagens WhatsApp.
- Email.
- Kanban.
- CRM Leads.
- Clientes Unificado.

Detalhar:

- Indicadores de operacao urbana.
- Pipeline de leads.
- Atendimento por WhatsApp.
- Atendimento por email.
- Kanban com drag and drop.
- Criacao de lead.
- Edicao de lead.
- Movimentacao de status.
- Exclusao individual e em massa.
- Filtros por intencao.
- Criacao de etapa personalizada.
- CRM de clientes.
- Criar cliente.
- Editar cliente.
- Excluir cliente.
- Historico e dados do cliente.

### 5.2 Carteira urbana

Funcoes:

- Imoveis urbanos.
- Gestao de locacao.
- Loteamentos.
- Empreendimentos.
- Administracao de condominios.
- Controle de chaves.

Detalhar imoveis:

- Listar imoveis.
- Criar novo imovel.
- Editar imovel.
- Excluir imovel.
- Diferenciar tipos urbanos.
- Gerenciar imagens.
- Enriquecimento/analise quando aplicavel.
- Publicar em site e portais.

Detalhar loteamentos/empreendimentos:

- Listar empreendimentos/loteamentos.
- Ver detalhes de loteamento.
- Gerenciar unidades/lotes.
- Apoiar venda parcelada ou simulacao.

Detalhar locacao:

- Dashboard de locacao.
- Contratos de locacao.
- Criar contrato.
- Editar contrato.
- Excluir contrato.
- Alterar status de contrato.
- Templates de contrato.
- Validar templates.
- Assinaturas digitais.
- Enviar convites de assinatura.
- Convite individual ou em massa.
- Verificar provedor de assinatura.
- Webhook de assinatura.
- Vistorias.
- Upload de fotos de vistoria.
- Faturas/boletos.
- Gerar cobrancas.
- Marcar pagamento.
- Reajustes.
- Calcular reajuste.
- Aplicar reajuste.
- Distratos/terminacoes.
- Notificacoes de vencimento, atraso, reajuste e expiracao.

Detalhar condominios:

- Administrar condominios.
- Acompanhar unidades e gestao condominial quando implementado.

Detalhar controle de chaves:

- Controlar retirada/devolucao de chaves.
- Registrar status de chaves.
- Apoiar visitas e operacao fisica.

### 5.3 Gestao urbana

Funcoes:

- Financeiro e ERP.
- Simulador financeiro.
- Contratos e juridico.
- Documentos/GED.

Detalhar financeiro:

- Visao financeira urbana.
- Receitas.
- Recebimentos.
- Inadimplencia.
- Exportacao de relatorios financeiros.
- Cobrancas.
- Criar cobranca.
- Gerar cobrancas mensais.
- Marcar cobranca como paga.
- Cancelar cobranca.
- Relatorios de cobranca.
- Exportar em CSV/XML quando aplicavel.
- Listar inadimplentes.

Detalhar simulador financeiro:

- Valor do imovel.
- Entrada.
- Numero de parcelas.
- Taxa de juros.
- Parcelas balao/reforcos.
- Calcular financiamento.
- Validar simulacao.
- Salvar rascunho.
- Gerar proposta.
- Imprimir proposta.

Detalhar juridico e documentos:

- Contratos.
- GED/documentos.
- Upload por imovel.
- Classificacao automatica.
- Analise documental.
- Remocao de documentos.
- Relacao com locacao e proprietarios.

### 5.4 Portais urbanos

Funcoes:

- Portal do proprietario urbano.
- Portal do comprador urbano.
- Portal do locatario.

Portal proprietario urbano:

- Vincular cadastro do proprietario.
- Ver imoveis do proprietario.
- Ver leads relacionados.
- Ver documentos.
- Ver financeiro.
- Acompanhar receitas e pendencias.

Portal comprador urbano:

- Buscar imoveis.
- Filtrar por tipo e busca textual.
- Favoritar imoveis.
- Ver favoritos.
- Abrir detalhes de imovel.

Portal locatario:

- Ver contratos.
- Ver boletos/cobrancas.
- Ver historico.
- Ver proximo vencimento.
- Ver total a pagar/recebido quando aplicavel.
- Sair do portal.

### 5.5 Crescimento urbano

Funcoes:

- Meu site.
- Editor visual.
- Configurar site.
- Agentes IA.
- Landing pages.
- Quiz.
- Relatorios gerenciais.

Detalhar:

- Site institucional da imobiliaria.
- Paginas customizadas.
- Publicacao de paginas.
- Landing pages de campanha.
- Blocos visuais reutilizaveis.
- Quiz de qualificacao.
- Relatorios de BI urbano.
- Automacao por agentes de IA.
- Chat e memoria dos agentes.
- Geracao de pagina por IA.

### 5.6 Integracoes urbanas

Funcoes:

- Exportador de portais.
- Conexoes.
- Integracoes.
- Configuracoes.

Detalhar exportador:

- Configurar portais.
- Publicar imovel em portal.
- Remover publicacao.
- Ver status de publicacao.
- Integracao com portais como Zap/VivaReal quando configurado.
- Integracao Orulo para empreendimentos.
- Credenciais master Orulo para superadmin.
- Conexao usuario final Orulo.
- Sincronizacao e importacao de buildings.

Detalhar APIs urbanas:

- Consulta IPTU.
- Consulta endereco por CEP.
- Consulta certidoes negativas por pessoa.
- Busca urbana.
- Consulta de imovel por codigo.

---

## 6. Funcoes comuns aos paineis rural e urbano

### 6.1 CRM e funil

- Cadastro de leads.
- Edicao de leads.
- Exclusao de leads.
- Exclusao em massa.
- Status do lead.
- Atividades do lead.
- Match lead-imovel.
- Kanban visual.
- Etapas customizaveis.
- Filtros de intencao.
- Abertura de WhatsApp por lead.
- Distribuicao individual e em massa.
- Estrategias de distribuicao.
- Campanhas drip.
- Relatorios de pipeline.
- Ranking de corretores.

### 6.2 Propriedades

- Listar propriedades.
- Criar propriedade.
- Editar propriedade.
- Excluir propriedade.
- Consultar detalhes.
- Upload e storage de arquivos.
- Enriquecimento por dados externos.
- Associar a tenant.
- Separar por nicho.

### 6.3 Site, landing pages e conteudo

- Site publico por slug.
- Site publico por dominio.
- Editor de paginas.
- Criar pagina.
- Editar pagina.
- Excluir pagina.
- Reordenar pagina.
- Publicar pagina.
- Duplicar pagina.
- Landing pages publicas.
- Templates premium, legacy, elementor e showcase.
- Editor visual por blocos.
- SEO.
- Tema.
- Propriedades exibidas.
- Formularios de captacao.
- Tracking.

### 6.4 Comunicacao

- WhatsApp com instancias.
- QR Code e pareamento.
- Chat.
- Mensagens e midias.
- Historico.
- WebSocket.
- Contatos do WhatsApp.
- Tags, transferencia, prioridade e tarefas.
- Email com contas, sincronizacao, envio e resposta.

### 6.5 IA

- Chat de IA.
- Geracao de paginas.
- Agentes personalizados.
- Memoria conversacional.
- Metricas de agente.
- Aprendizado supervisionado.
- Qualificacao de respostas.
- Copywriting.
- Matchmaking.
- Cobranca/negociacao.

### 6.6 Documentos

- Upload de documentos.
- Listagem por propriedade.
- Analise de documento.
- Classificacao.
- Exclusao.
- Processamento por worker externo.
- GED urbano.
- Data room rural.

### 6.7 Configuracoes

- Configuracoes do tenant.
- Configuracoes do site.
- Integracoes.
- Dominios.
- API keys.
- Plano e recursos.
- Suporte.

---

## 7. APIs e servicos internos a considerar na analise

Inclua no levantamento funcional os seguintes grupos de API:

- `/api/admin`: organizacoes, usuarios, impersonation e storage admin.
- `/api/admin/templates`: templates globais.
- `/api/import`: importacao inteligente.
- `/api/public`: contato, leads publicos e textos.
- `/api/onboarding`: onboarding.
- `/api/domains`: dominios customizados.
- `/api/crm`: leads, WhatsApp CRM, distribuicao, drip e relatorios.
- `/api/crm/clients`: clientes unificados.
- `/api/properties`: propriedades.
- `/api/rural`: mercado rural, legal, enrichment, mapas, PDF, integracoes e analise.
- `/api/urban`: consultas urbanas.
- `/api/locacao`: contratos, templates, assinaturas, faturas, vistorias, reajustes, distratos, dashboard e notificacoes.
- `/api/cobranca`: cobrancas, pagamento, cancelamento, mensalidades, relatorios e inadimplencia.
- `/api/ai`: agentes, chat, geracao, metricas, aprendizado e memoria.
- `/api/demo`: agenda/demonstracoes.
- `/api/fluowai-migration`: migracao.
- `/api/email`: contas e mensagens de email.
- `/api/sites`: site builder.
- `/api/orulo`: integracao Orulo.
- `/api/portals`: publicacao em portais.
- `/api/settings`: configuracoes.
- `/api/valuation`: avaliacao imobiliaria.
- `/api/documents`: documentos.
- `/api/external-data`: dados externos.
- `/api/quiz`: campanhas e submissões.
- `/api/account`: recuperacao de organizacao.
- `/api/whatsapp`: provider, instancias, chats, mensagens, midia e WebSocket.
- `/api/storage`: upload e URLs assinadas.

---

## 8. Pontos de permissao e seguranca

Analise:

- `ProtectedRoute`: exige autenticacao.
- `SuperAdminGuard` e layout superadmin: exige role `superadmin`.
- `SubscriptionGuard`: bloqueia por assinatura/plano.
- `PanelGuard`: limita acesso a painel rural/urbano.
- `requireTenant`: exige tenant/organizacao nas APIs.
- `verifyAuth`: exige usuario autenticado.
- `verifyAdmin`: exige admin da organizacao.
- `verifySuperAdmin`: exige superadmin.
- Isolamento multi-tenant por `organization_id`.
- Modo impersonation controlado.
- Rate limit em rotas publicas sensiveis.
- Webhooks com autorizacao.
- CORS, Helmet e compression no backend.

---

## 9. Entregavel esperado da analise

Ao responder, produza:

1. Resumo executivo do sistema.
2. Mapa de modulos por perfil.
3. Lista completa de funcoes por modulo.
4. Jornada do usuario rural.
5. Jornada do usuario urbano.
6. Jornada do superadmin.
7. Lista de funcoes publicas.
8. Lista de integracoes.
9. Lista de APIs e responsabilidades.
10. Matriz de permissoes.
11. Lacunas, riscos e funcionalidades incompletas.
12. Sugestoes de melhoria por prioridade.
13. Roadmap recomendado por fases.

---

## 10. Formato da resposta solicitada

Responda em Markdown, usando a seguinte estrutura:

```markdown
# Analise Completa do Sistema IMOBZY

## 1. Resumo Executivo

## 2. Arquitetura Funcional

## 3. Funcoes Publicas

## 4. Super Admin

## 5. Cliente Imobiliaria Rural

## 6. Cliente Imobiliaria Urbana

## 7. Funcoes Compartilhadas

## 8. Integracoes e APIs

## 9. Permissoes e Seguranca

## 10. Lacunas e Riscos

## 11. Roadmap por Etapas

## 12. Conclusao
```

Para cada funcao, detalhe:

- O que a funcao faz.
- Quem usa.
- Em qual tela/modulo aparece.
- Qual valor gera para o negocio.
- Quais dados manipula.
- Quais integracoes utiliza, se houver.
- Quais melhorias podem ser feitas.

---

## 11. Observacoes importantes

- Nao trate o sistema como apenas CRM. Ele e uma plataforma SaaS imobiliaria completa.
- Diferencie claramente operacao rural e urbana.
- Diferencie cliente final, usuario da imobiliaria, admin da imobiliaria e superadmin da plataforma.
- Considere que algumas telas podem estar implementadas como MVP ou estrutura inicial.
- Quando nao houver evidencia de uma funcao completa, classifique como "funcao prevista/indicada pelo modulo" em vez de afirmar como 100% finalizada.
- Priorize clareza comercial e tecnica.
- Use linguagem em portugues do Brasil.
