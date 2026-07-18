# Analise funcional completa do sistema IMOBZY

Este documento descreve as funcoes que o sistema IMOBZY possui hoje, analisadas a partir da estrutura real de rotas, telas, servicos e APIs do projeto.

O objetivo aqui nao e listar funcoes de codigo, mas sim as funcoes do sistema como produto: o que a plataforma entrega para super admin, imobiliarias rurais, imobiliarias urbanas, clientes, proprietarios, compradores e locatarios.

---

## 1. Visao geral do IMOBZY

O IMOBZY e uma plataforma SaaS imobiliaria multi-tenant para gestao de operacoes imobiliarias urbanas e rurais.

O sistema possui tres grandes areas:

- Super Admin: administracao da plataforma inteira.
- Cliente Imobiliaria Rural: operacao especializada em fazendas, areas rurais, CAR, geointeligencia, valuation rural e due diligence.
- Cliente Imobiliaria Urbana: operacao especializada em imoveis urbanos, locacao, loteamentos, financeiro, condominios, chaves, contratos e portais.

Tambem existem areas publicas:

- Pagina comercial do sistema.
- Login e cadastro.
- Onboarding.
- Sites publicos das imobiliarias.
- Landing pages publicas.
- Quiz publico.
- Portal do locatario.
- Paginas de consultoria e qualificacao.

---

## 2. Funcoes publicas do sistema

### 2.1 Pagina institucional e comercial

O sistema possui uma pagina publica principal para apresentar e vender o IMOBZY.

Funcoes:

- Exibir pagina inicial do produto.
- Exibir pagina de vendas.
- Exibir pagina de consultoria.
- Captar interessados em consultoria.
- Encaminhar usuario para login, registro ou qualificacao.
- Permitir acesso a paginas de ajuda, como DNS.

Rotas relacionadas:

- `/`
- `/vendas`
- `/consultoria`
- `/consultoria/qualificacao`
- `/ajuda/dns`

### 2.2 Autenticacao e entrada

Funcoes:

- Login de usuario.
- Registro de novo usuario.
- Onboarding inicial.
- Recuperacao/identificacao de organizacao.
- Redirecionamento por perfil e nicho.

Rotas relacionadas:

- `/login`
- `/register`
- `/onboarding`

### 2.3 Sites publicos das imobiliarias

O IMOBZY permite que cada imobiliaria tenha site proprio publicado por slug ou dominio.

Funcoes:

- Exibir site publico da imobiliaria.
- Renderizar paginas publicas do site.
- Resolver tenant por slug ou dominio.
- Exibir imoveis publicados.
- Receber contatos e leads pelo site.
- Usar paginas configuradas no construtor de sites.

Rotas relacionadas:

- `/:slug/site/*`
- `/site/:slug/*`
- `/sites/:slug/*`

### 2.4 Landing pages publicas

Funcoes:

- Publicar landing page por slug.
- Exibir paginas de campanha.
- Captar leads.
- Usar formularios.
- Usar blocos visuais configurados no editor.
- Rastrear acessos por pixels.

Rota relacionada:

- `/lp/:slug`

### 2.5 Quiz publico

Funcoes:

- Exibir quiz de campanha por slug.
- Coletar respostas de visitantes.
- Gerar leads qualificados.
- Relacionar respostas ao tenant/campanha.

Rota relacionada:

- `/quiz/:slug`

### 2.6 Portal publico do locatario

Funcoes:

- Permitir acesso do locatario ao portal.
- Exibir contratos.
- Exibir boletos/cobrancas.
- Exibir historico.
- Exibir status financeiro.

Rota relacionada:

- `/portal-locatario`

---

## 3. Controle de acesso e estrutura multi-tenant

O sistema possui controle de acesso por usuario, organizacao, plano e tipo de painel.

Funcoes:

- Autenticacao obrigatoria para paineis internos.
- Separacao dos dados por organizacao.
- Redirecionamento automatico para painel rural ou urbano.
- Bloqueio de acesso conforme assinatura.
- Bloqueio de painel conforme nicho permitido.
- Acesso exclusivo de superadmin.
- Modo impersonation para superadmin acessar uma imobiliaria.
- Banner indicando acesso impersonado.
- Encerrar impersonation.

Perfis identificados:

- Superadmin.
- Admin da imobiliaria.
- Corretor/usuario operacional.
- Proprietario.
- Comprador.
- Locatario.

---

## 4. Super Admin

O Super Admin gerencia a plataforma IMOBZY como SaaS.

### 4.1 Dashboard da plataforma

Funcoes:

- Visualizar resumo geral da plataforma.
- Acompanhar indicadores globais.
- Navegar para os modulos administrativos.
- Ter uma visao macro de clientes, operacao e sistema.

### 4.2 Analytics

Funcoes:

- Visualizar indicadores globais.
- Acompanhar uso da plataforma.
- Analisar dados agregados de operacao.
- Apoiar decisoes de crescimento e produto.

### 4.3 Monitoramento

Funcoes:

- Monitorar saude da plataforma.
- Verificar status tecnico de componentes.
- Acompanhar operacao de APIs e servicos.
- Apoiar diagnostico de falhas.

### 4.4 Gestao de imobiliarias

Funcoes:

- Listar imobiliarias/organizacoes.
- Buscar imobiliarias.
- Criar nova organizacao.
- Editar organizacao.
- Definir nicho da organizacao.
- Associar plano.
- Alterar status da imobiliaria.
- Suspender ou reativar imobiliaria.
- Excluir imobiliaria.
- Excluir imobiliarias em massa.
- Impersonar uma imobiliaria.
- Vincular usuarios a organizacoes.

### 4.5 Suporte

Funcoes:

- Listar tickets de suporte.
- Filtrar tickets.
- Visualizar detalhes do ticket.
- Visualizar mensagens do ticket.
- Responder ticket.
- Alterar status do atendimento.
- Marcar ticket como resolvido.
- Relacionar ticket a usuario e organizacao.

### 4.6 Equipe interna

Funcoes:

- Listar membros da equipe.
- Buscar membros.
- Convidar novo membro.
- Remover membro.
- Gerenciar equipe interna da plataforma.

### 4.7 Planos e assinaturas

Funcoes:

- Gerenciar planos.
- Definir recursos por plano.
- Controlar funcionalidades liberadas.
- Apoiar bloqueio de funcionalidades por assinatura.

### 4.8 Billing

Funcoes:

- Acompanhar cobrancas da plataforma.
- Gerenciar situacao financeira dos clientes.
- Apoiar controle de receita SaaS.

### 4.9 Feature flags

Funcoes:

- Ativar ou desativar recursos.
- Liberar funcionalidades gradualmente.
- Controlar acesso a modulos por configuracao.

### 4.10 Audit log

Funcoes:

- Registrar eventos sensiveis.
- Consultar historico de acoes.
- Apoiar auditoria, seguranca e rastreabilidade.

### 4.11 Templates globais

Funcoes:

- Listar templates.
- Criar template.
- Duplicar template.
- Excluir template.
- Filtrar por tipo e categoria.
- Gerenciar templates de landing page, email, contrato e relatorio.

### 4.12 Dominios

Funcoes:

- Gerenciar dominios customizados.
- Adicionar dominio.
- Remover dominio.
- Verificar DNS.
- Sincronizar dominios.
- Apoiar publicacao dos sites das imobiliarias.

### 4.13 Consultoria

Funcoes:

- Acompanhar leads de consultoria.
- Gerenciar interessados vindos da area comercial.
- Apoiar qualificacao e agendamento.

### 4.14 Importador inteligente

Funcoes:

- Analisar dados para importacao.
- Importar propriedades.
- Importar imagens.
- Revisar dados antes da finalizacao.
- Finalizar importacao.
- Apoiar migracoes de clientes vindos de outros sistemas.

### 4.15 Migracao FluowAI

Funcoes:

- Criar jobs de migracao.
- Testar conexoes.
- Diagnosticar origem e destino.
- Analisar organizacao de midias.
- Executar dry-run.
- Migrar arquivos/storage.
- Validar migracao.
- Gerar relatorio da migracao.

### 4.16 Storage Intelligence

Funcoes:

- Configurar MinIO/S3.
- Ver resumo de armazenamento.
- Listar buckets.
- Listar arquivos.
- Gerar URL assinada.
- Ver maiores arquivos.
- Agrupar por extensao.
- Agrupar por prefixo.
- Agrupar por tenant.
- Detectar arquivos duplicados.
- Detectar arquivos orfaos.
- Simular limpeza.
- Aplicar lifecycle.
- Suspender versionamento.
- Apagar expirados.
- Apagar orfaos.
- Apagar duplicados.
- Ver logs de storage.

### 4.17 Marketing e SEO

Funcoes:

- Apoiar gestao de marketing da plataforma.
- Gerenciar aspectos comerciais e SEO.
- Apoiar paginas publicas e campanhas.

### 4.18 Configuracoes globais

Funcoes:

- Configurar parametros globais.
- Ajustar comportamento da plataforma.
- Gerenciar configuracoes centrais.

---

## 5. Cliente Imobiliaria Rural

O painel rural atende imobiliarias que trabalham com fazendas, areas rurais e ativos ligados ao agronegocio.

### 5.1 Dashboard rural

Funcoes:

- Exibir visao geral da operacao rural.
- Mostrar indicadores comerciais.
- Apoiar acompanhamento de leads, propriedades e vendas.
- Centralizar acesso aos modulos rurais.

### 5.2 Mensagens WhatsApp

Funcoes:

- Gerenciar instancias de WhatsApp.
- Conectar via QR Code.
- Conectar por codigo de pareamento.
- Listar conversas.
- Ver mensagens.
- Enviar mensagens de texto.
- Enviar midias.
- Importar historico.
- Atualizar status em tempo real via WebSocket.
- Ver status de instancia.
- Reconectar instancia.
- Fazer logout.
- Excluir instancia.
- Vincular contato ao CRM.
- Editar perfil do contato.
- Adicionar tags.
- Transferir atendimento.
- Definir prioridade.
- Criar tarefa ligada ao contato.

### 5.3 Email

Funcoes:

- Configurar contas de email.
- Testar conta.
- Sincronizar emails.
- Listar emails.
- Abrir thread.
- Enviar email.
- Responder email.
- Atualizar status de email.
- Usar agenda ligada a emails.

### 5.4 CRM rural

Funcoes:

- Listar leads.
- Criar lead.
- Editar lead.
- Excluir lead.
- Excluir leads em massa.
- Alterar status do lead.
- Registrar atividades.
- Ver historico do lead.
- Fazer match com propriedades.
- Distribuir lead para corretor.
- Distribuir leads em massa.
- Usar estrategias de distribuicao.
- Acionar campanhas drip.
- Ver relatorios de pipeline.
- Ver ranking de corretores.

### 5.5 Kanban rural

Funcoes:

- Visualizar leads em etapas.
- Arrastar cards entre etapas.
- Criar nova etapa.
- Filtrar leads.
- Abrir detalhe do lead.
- Copiar mensagem de abordagem.
- Abrir conversa no WhatsApp.
- Excluir lead pelo card.
- Carregar mais leads por etapa.

### 5.6 Imoveis rurais

Funcoes:

- Listar propriedades rurais.
- Criar propriedade.
- Editar propriedade.
- Excluir propriedade.
- Visualizar detalhes.
- Associar propriedade ao tenant.
- Gerenciar informacoes rurais.
- Gerenciar imagens.
- Enriquecer dados por ACP.
- Preparar publicacao em site ou landing page.

### 5.7 Cadastro tecnico rural

Funcoes:

- Ver propriedades georreferenciadas.
- Ver arquivos importados.
- Ver poligonos validados.
- Ver cadastros pendentes.
- Alternar entre listagem e importacao.
- Importar dados tecnicos.
- Validar poligonos.
- Revisar status de arquivos.

### 5.8 Territorio rural e geointeligencia

Funcoes:

- Acessar hub de territorio rural.
- Visualizar mapas.
- Processar geodados.
- Consultar dados por coordenadas.
- Analisar area rural.
- Consultar bases externas.
- Consultar PRODES.
- Consultar embargos.
- Consultar MapBiomas.
- Consultar producao agricola.
- Consultar SNCR.

### 5.9 Localizar CAR

Funcoes:

- Buscar CAR por localizacao.
- Listar candidatos encontrados.
- Visualizar dados do CAR.
- Criar propriedade a partir do resultado.
- Navegar para edicao da propriedade.

### 5.10 Valuation rural

Funcoes:

- Calcular valuation por propriedade.
- Calcular valuation por CAR.
- Consultar historico de valuation.
- Consultar comparaveis.
- Usar regras de avaliacao.
- Enriquecer propriedade com dados externos.
- Apoiar precificacao de fazendas e areas rurais.

### 5.11 Due diligence rural

Funcoes:

- Executar checklist documental rural.
- Acompanhar status de documentos.
- Usar status aprovado, pendente, rejeitado e faltando.
- Calcular score geral.
- Calcular score fundiario.
- Calcular score ambiental.
- Validar CAR.
- Validar SNCR/CCIR/INCRA.
- Validar SIGEF/georreferenciamento.
- Validar ITR/Receita.
- Alterar status manualmente.
- Atualizar status por consulta externa.

### 5.12 Dossie inteligente

Funcoes:

- Consolidar dados de propriedade rural.
- Verificar georreferenciamento.
- Verificar CAR ambiental.
- Verificar matricula.
- Gerar dossie.
- Exportar dossie em PDF.

### 5.13 Data room

Funcoes:

- Organizar documentos de propriedades.
- Apoiar compartilhamento de informacoes.
- Centralizar arquivos relevantes para negociacao.

### 5.14 Contratos e juridico

Funcoes:

- Acessar area de contratos.
- Gerenciar documentos juridicos.
- Apoiar negociacoes e formalizacao.

### 5.15 Financeiro rural e metas

Funcoes:

- Gerenciar metas rurais.
- Ver VGV acumulado.
- Ver comissao estimada.
- Ver fazendas vendidas.
- Ver ticket medio.
- Salvar metas.
- Acompanhar performance comercial.

### 5.16 Site, landing pages e quiz rural

Funcoes:

- Gerenciar site da imobiliaria rural.
- Criar paginas do site.
- Editar paginas.
- Publicar paginas.
- Duplicar paginas.
- Reordenar paginas.
- Configurar site.
- Usar editor visual.
- Criar landing pages.
- Editar landing pages.
- Publicar landing pages.
- Criar quiz.
- Editar campanhas de quiz.
- Ver respostas de quiz.
- Gerar quiz a partir de PDF.

### 5.17 Matchmaking 360

Funcoes:

- Cruzar leads com propriedades.
- Sugerir imoveis para compradores/investidores.
- Apoiar venda consultiva.
- Aumentar velocidade de atendimento.

### 5.18 Agentes de IA

Funcoes:

- Criar agentes de IA.
- Editar agentes.
- Excluir agentes.
- Conversar com agente.
- Usar memoria de conversa.
- Limpar memoria.
- Medir desempenho do agente.
- Qualificar respostas.
- Registrar aprendizado.
- Gerar paginas/layouts por IA.

### 5.19 Relatorios rurais

Funcoes:

- Acessar BI rural.
- Ver indicadores especificos.
- Apoiar decisao comercial.
- Acompanhar performance de carteira e leads.

### 5.20 Conexoes e configuracoes rurais

Funcoes:

- Ver status de conexoes.
- Configurar integracoes.
- Configurar WhatsApp.
- Configurar email.
- Configurar IA.
- Ajustar configuracoes do sistema.
- Solicitar suporte.

---

## 6. Cliente Imobiliaria Urbana

O painel urbano atende imobiliarias que trabalham com venda, locacao, loteamentos, condominios e administracao urbana.

### 6.1 Dashboard urbano

Funcoes:

- Exibir visao geral da operacao urbana.
- Acompanhar indicadores comerciais.
- Acompanhar carteira, leads e atividades.
- Servir como entrada principal da operacao.

### 6.2 Mensagens WhatsApp

Funcoes iguais ao painel rural:

- Instancias.
- QR Code.
- Codigo de pareamento.
- Chats.
- Mensagens.
- Midias.
- Historico.
- WebSocket.
- Contatos.
- Tags.
- Transferencia.
- Prioridade.
- Tarefas.
- Vinculo com CRM.

### 6.3 Email

Funcoes:

- Configurar contas.
- Sincronizar emails.
- Enviar e responder mensagens.
- Ver threads.
- Atualizar status.
- Apoiar agenda e relacionamento.

### 6.4 CRM Leads

Funcoes:

- Criar, editar e excluir leads.
- Gerenciar pipeline.
- Registrar atividades.
- Distribuir leads.
- Fazer match com imoveis.
- Ver relatorios comerciais.
- Usar campanhas drip.

### 6.5 Clientes unificado

Funcoes:

- Listar clientes.
- Criar cliente.
- Editar cliente.
- Excluir cliente.
- Centralizar dados de relacionamento.
- Apoiar historico de compra, venda e locacao.

### 6.6 Kanban urbano

Funcoes:

- Visualizar leads por etapa.
- Mover lead por drag and drop.
- Criar nova etapa.
- Filtrar por intencao.
- Abrir WhatsApp do lead.
- Excluir lead.
- Selecionar multiplos leads.
- Carregar mais por etapa.

### 6.7 Imoveis urbanos

Funcoes:

- Listar imoveis urbanos.
- Criar imovel.
- Editar imovel.
- Excluir imovel.
- Gerenciar imagens.
- Gerenciar dados comerciais.
- Publicar em site.
- Publicar em portais quando configurado.

### 6.8 Empreendimentos e loteamentos

Funcoes:

- Listar empreendimentos.
- Listar loteamentos.
- Abrir detalhe de loteamento.
- Gerenciar informacoes de projeto.
- Apoiar gestao de unidades/lotes.

### 6.9 Gestao de locacao

Funcoes:

- Listar contratos de locacao.
- Criar contrato.
- Editar contrato.
- Excluir contrato.
- Alterar status do contrato.
- Ver dashboard de locacao.
- Ver timeline de locacao.
- Gerenciar modelos de contrato.
- Validar templates.
- Gerenciar assinaturas digitais.
- Enviar convite de assinatura.
- Enviar convite em massa.
- Verificar provedor de assinatura.
- Receber webhook de assinatura.
- Gerenciar vistorias.
- Upload de fotos de vistoria.
- Gerar faturas.
- Marcar fatura como paga.
- Calcular reajuste.
- Aplicar reajuste.
- Gerenciar distrato.
- Rodar notificacoes.
- Notificar vencimentos proximos.
- Notificar atrasos.
- Notificar reajustes.
- Notificar contratos expirando.

### 6.10 Compliance urbano

Funcoes:

- Apoiar validacoes urbanas.
- Consultar dados legais/urbanos.
- Verificar documentacao ou situacao de pessoas/imoveis.

### 6.11 Cobranca

Funcoes:

- Listar cobrancas.
- Criar cobranca.
- Gerar cobrancas mensais.
- Marcar cobranca como paga.
- Cancelar cobranca.
- Ver relatorios.
- Exportar dados financeiros.
- Ver inadimplentes.
- Controlar status financeiro.

### 6.12 Simulador financeiro

Funcoes:

- Simular financiamento.
- Informar preco do imovel.
- Informar entrada.
- Informar numero de parcelas.
- Informar taxa de juros.
- Adicionar parcelas balao.
- Calcular valor financiado.
- Calcular parcela mensal.
- Calcular custo total.
- Salvar simulacao como rascunho.
- Gerar proposta.
- Imprimir proposta.

### 6.13 Exportador de portais

Funcoes:

- Configurar portais.
- Publicar imovel em portal.
- Remover publicacao.
- Ver status de publicacao.
- Integrar com portais imobiliarios.
- Apoiar integracoes como Zap/VivaReal e Orulo.

### 6.14 Administracao de condominios

Funcoes:

- Acessar modulo de condominios.
- Apoiar gestao condominial.
- Centralizar administracao urbana recorrente.

### 6.15 Controle de chaves

Funcoes:

- Controlar retirada de chaves.
- Controlar devolucao.
- Acompanhar status de chaves.
- Apoiar visitas, vistorias e operacao fisica.

### 6.16 Financeiro urbano

Funcoes:

- Gerenciar dados financeiros.
- Acompanhar receitas.
- Acompanhar pendencias.
- Apoiar ERP imobiliario.
- Relacionar locacao, contratos e cobrancas.

### 6.17 Gestao de documentos

Funcoes:

- Acessar GED.
- Organizar documentos.
- Upload de arquivos.
- Classificacao e analise documental.
- Relacionar documentos a imoveis, contratos ou clientes.

### 6.18 Portal proprietario urbano

Funcoes:

- Ver propriedades do proprietario.
- Ver leads relacionados.
- Ver documentos.
- Ver informacoes financeiras.
- Acompanhar receitas e pendencias.
- Exibir aviso quando cadastro ainda nao esta vinculado.

### 6.19 Portal comprador urbano

Funcoes:

- Buscar imoveis.
- Filtrar imoveis.
- Favoritar imoveis.
- Ver favoritos.
- Abrir detalhes de imovel.

### 6.20 Portal locatario

Funcoes:

- Ver contratos.
- Ver boletos/cobrancas.
- Ver historico.
- Ver proximo vencimento.
- Ver totais financeiros.
- Sair do portal.

### 6.21 Site, landing pages e quiz urbano

Funcoes:

- Criar e gerenciar site.
- Editar paginas.
- Publicar paginas.
- Usar editor visual.
- Criar landing pages.
- Editar landing pages.
- Publicar campanhas.
- Criar quiz.
- Receber respostas.
- Gerar quiz por PDF.

### 6.22 Agentes IA e assistente

Funcoes:

- Criar agentes.
- Conversar com agentes.
- Usar memoria.
- Medir metricas.
- Registrar aprendizado.
- Gerar conteudo e paginas.
- Apoiar atendimento, cobranca, copywriting e matching.

### 6.23 Relatorios urbanos

Funcoes:

- Acessar BI urbano.
- Ver indicadores gerenciais.
- Acompanhar funil, financeiro e desempenho.

### 6.24 Integracoes e configuracoes urbanas

Funcoes:

- Configurar conexoes.
- Configurar integracoes.
- Configurar WhatsApp.
- Configurar email.
- Configurar IA.
- Configurar sistema.
- Solicitar suporte.

---

## 7. Modulos compartilhados entre rural e urbano

### 7.1 CRM

O CRM e compartilhado pelos dois paineis.

Funcoes:

- Leads.
- Atividades.
- Status.
- Kanban.
- Distribuicao.
- Drip campaigns.
- Match com imoveis.
- Relatorios.
- Ranking.
- Integracao com WhatsApp.

### 7.2 Imoveis

Funcoes:

- Cadastro.
- Edicao.
- Listagem.
- Exclusao.
- Consulta detalhada.
- Enriquecimento.
- Fotos.
- Separacao por nicho.
- Publicacao.

### 7.3 Comunicacao

Funcoes:

- WhatsApp completo.
- Email completo.
- Vinculo com CRM.
- Mensagens, midias, contatos e tarefas.

### 7.4 Site builder

Funcoes:

- Criar site.
- Configurar site.
- Criar paginas.
- Editar paginas.
- Excluir paginas.
- Duplicar paginas.
- Reordenar paginas.
- Publicar paginas.
- Exibir site publico.

### 7.5 Landing page builder

Funcoes:

- Gerenciar landing pages.
- Editar visualmente.
- Usar templates.
- Personalizar tema.
- Configurar SEO.
- Selecionar propriedades.
- Usar blocos visuais.
- Publicar por slug.

Blocos existentes:

- Hero.
- Hero com formulario.
- Formulario.
- Grid de propriedades.
- Carrossel de propriedades.
- Galeria.
- Imagem.
- Texto.
- Video.
- Mapa.
- CTA.
- Estatisticas.
- Depoimentos.
- Linha do tempo.
- Divisor.
- Espacador.
- HTML customizado.
- Card de corretor.
- Cabecalho.
- Rodape.

### 7.6 IA

Funcoes:

- Chat.
- Geracao de paginas.
- Agentes.
- Memoria.
- Metricas.
- Aprendizado.
- Qualificacao.
- Copywriting.
- Matchmaking.
- Cobranca/negociacao.

### 7.7 Documentos

Funcoes:

- Upload.
- Listagem.
- Analise.
- Classificacao.
- Exclusao.
- Processamento externo por worker.

### 7.8 Quiz

Funcoes:

- Criar campanha.
- Editar campanha.
- Ver submissões.
- Gerar quiz a partir de PDF.
- Publicar quiz publico.
- Receber respostas.

### 7.9 Configuracoes e conexoes

Funcoes:

- Configurar tenant.
- Configurar site.
- Configurar dominios.
- Configurar integracoes.
- Configurar chaves de IA.
- Configurar WhatsApp e email.

---

## 8. Integracoes existentes ou previstas no sistema

### 8.1 Supabase

Usado para:

- Autenticacao.
- Banco de dados.
- Perfis.
- Organizacoes.
- Propriedades.
- Leads.
- Configuracoes.
- Sites e landing pages.
- Multi-tenancy.

### 8.2 WhatsApp

Usado para:

- Atendimento.
- Instancias.
- QR Code.
- Chats.
- Mensagens.
- Midias.
- Historico.
- WebSocket.
- CRM de contato.

### 8.3 Email

Usado para:

- Contas IMAP/SMTP.
- Sincronizacao.
- Envio.
- Respostas.
- Threads.
- Agenda.

### 8.4 IA

Providers e servicos:

- Gemini.
- Groq.
- OpenAI/NamoBana conforme configuracao.
- Agentes internos.
- Automacao e aprendizado.

### 8.5 Dados rurais

Integracoes/consultas:

- CAR.
- SNCR.
- SIGEF.
- ITR.
- MapBiomas.
- PRODES.
- Embargos.
- IBGE/SIDRA.
- CEPEA.
- TerraBrasilis.
- ConectaGov.

### 8.6 Dados urbanos

Integracoes/consultas:

- CEP/endereco.
- IPTU.
- Certidoes negativas.
- Busca urbana.
- Consulta por codigo de imovel.

### 8.7 Portais imobiliarios

Funcoes:

- Configurar portal.
- Publicar imovel.
- Remover imovel.
- Consultar status.
- Integrar com Orulo.
- Integrar com Zap/VivaReal via servicos existentes.

### 8.8 Storage

Funcoes:

- Upload de arquivos.
- URL assinada.
- MinIO/S3.
- Inteligencia de armazenamento.
- Deteccao de duplicados e orfaos.

---

## 9. APIs principais do sistema

O backend possui APIs organizadas por dominio funcional:

- Admin: organizacoes, usuarios, templates, storage e impersonation.
- Public: contato, leads publicos e textos.
- CRM: leads, WhatsApp CRM, distribuicao, drip e relatorios.
- Properties: propriedades.
- Rural: legal, mapas, valuation, enrichment, PDF, mercado e integracoes.
- Urban: consultas urbanas.
- Locacao: contratos, templates, assinaturas, faturas, vistorias, reajustes, distratos e notificacoes.
- Cobranca: cobrancas, pagamentos, cancelamentos, relatórios e inadimplencia.
- AI: agentes, chat, memoria, metricas e aprendizado.
- Email: contas, sincronizacao, envio e threads.
- Sites: site builder.
- Portals: publicacao em portais.
- Orulo: empreendimentos e conexao.
- Valuation: estimativas e historico.
- Documents: upload, analise e classificacao.
- Quiz: campanhas e respostas.
- Storage: upload e URLs.
- Domains: dominios customizados.
- FluowAI migration: migracao.

---

## 10. Matriz resumida por perfil

### Super Admin

Tem acesso a:

- Plataforma inteira.
- Tenants.
- Usuarios.
- Planos.
- Billing.
- Dominios.
- Templates.
- Suporte.
- Analytics.
- Monitoring.
- Feature flags.
- Audit logs.
- Importador IA.
- Migracoes.
- Storage Intelligence.
- Marketing e SEO.

### Admin da imobiliaria rural

Tem acesso a:

- Dashboard rural.
- WhatsApp.
- Email.
- CRM.
- Kanban.
- Imoveis rurais.
- Cadastro tecnico.
- Territorio rural.
- CAR.
- Valuation rural.
- Due diligence.
- Dossie inteligente.
- Data room.
- Contratos.
- Financeiro rural.
- Site.
- Landing pages.
- Quiz.
- Matchmaking.
- IA.
- Relatorios.
- Conexoes.
- Configuracoes.

### Admin da imobiliaria urbana

Tem acesso a:

- Dashboard urbano.
- WhatsApp.
- Email.
- CRM.
- Clientes.
- Kanban.
- Imoveis urbanos.
- Empreendimentos.
- Loteamentos.
- Locacao.
- Compliance.
- Cobranca.
- Simulador financeiro.
- Exportador de portais.
- Condominios.
- Controle de chaves.
- Financeiro.
- GED.
- Portais de proprietario, comprador e locatario.
- Site.
- Landing pages.
- Quiz.
- IA.
- Relatorios.
- Integracoes.
- Configuracoes.

### Corretor/usuario operacional

Tem acesso conforme permissao/plano a:

- CRM.
- Kanban.
- Leads.
- WhatsApp.
- Email.
- Imoveis.
- Atividades.
- Relatorios basicos.

### Proprietario

Possui portais para:

- Ver propriedades.
- Ver documentos.
- Ver leads interessados.
- Ver financeiro.

### Comprador

Possui portal para:

- Buscar imoveis.
- Ver detalhes.
- Favoritar.

### Locatario

Possui portal para:

- Ver contratos.
- Ver boletos.
- Ver historico.
- Acompanhar vencimentos.

---

## 11. Lacunas e observacoes

Algumas funcoes aparecem claramente como telas, rotas ou servicos, mas podem estar em diferentes niveis de maturidade. Portanto, devem ser classificadas assim:

- Funcao implementada: existe rota, tela e servico/API correspondente.
- Funcao estruturada: existe tela ou rota, mas pode depender de dados/configuracao.
- Funcao prevista pelo modulo: existe menu/tela inicial, mas pode precisar evoluir regras internas.

Pontos que merecem revisao futura:

- Confirmar no navegador quais telas estao 100% finalizadas.
- Validar dados reais no Supabase.
- Revisar permissoes detalhadas por role alem de admin/superadmin.
- Validar quais integracoes externas estao com credenciais ativas.
- Testar fluxo completo de WhatsApp.
- Testar fluxo completo de locacao.
- Testar publicacao em portais.
- Testar geracao de dossie PDF.
- Testar importador IA e migracao.

---

## 12. Conclusao

O IMOBZY possui funcoes de uma plataforma imobiliaria SaaS completa, nao apenas de um CRM.

O sistema cobre:

- Captacao publica.
- CRM.
- Atendimento WhatsApp e email.
- Gestao de imoveis.
- Site e landing pages.
- Quiz.
- IA e agentes.
- Relatorios.
- Documentos.
- Locacao.
- Cobranca.
- Portais.
- Valuation.
- Geointeligencia rural.
- Due diligence rural.
- Super administracao SaaS.
- Storage e migracao.
- Multi-tenancy e dominios.

A maior diferenca funcional do sistema e a separacao real entre operacao rural e urbana. O painel rural tem profundidade em geodados, CAR, due diligence e valuation rural. O painel urbano tem profundidade em locacao, financeiro, portais, loteamentos, condominios e operacao de venda/administracao.
