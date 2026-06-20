# Relatorio Exclusivo da Parte Rural - IMOBZY

Data: 20/06/2026
Escopo corrigido: somente modulo rural, suas telas, funcoes, integracoes, pontos funcionando, pontos falhos e evolucoes recomendadas.

## 1. Diagnostico direto

A parte rural do projeto existe como um painel proprio em `/rural`, com layout, menu, dashboard, cadastro de imoveis, geointeligencia, CAR, due diligence, dossie, BI, financeiro, portais e conexoes.

O problema principal nao e falta de telas rurais. O problema e que varias telas rurais ainda estao em estagio de prototipo ou usam consultas incompletas. Algumas funcionam com dados reais, outras usam dados mockados, e algumas carregam imoveis sem filtro correto de organizacao/nicho. Isso pode permitir que dados urbanos aparecam em telas rurais.

Prioridade maxima no rural:

1. Corrigir filtros de `organization_id` e nicho rural.
2. Centralizar a regra do que e imovel rural.
3. Persistir dados que hoje ficam so na tela.
4. Conectar mapa, CAR, due diligence e dossie em um fluxo unico.

## 2. Entrada e navegacao rural

Arquivo: `App.tsx`

Rotas rurais:

- `/rural`: dashboard rural.
- `/rural/properties`: gestao de imoveis.
- `/rural/properties/new`: cadastro.
- `/rural/properties/:id`: edicao.
- `/rural/cadastro-tecnico`: cadastro tecnico/geografico.
- `/rural/territorio/maps`: geointeligencia.
- `/rural/territorio/localizar-car`: localizar CAR.
- `/rural/territorio/due-diligence`: due diligence.
- `/rural/territorio/dossie`: dossie rural.
- `/rural/reports`: BI rural.
- `/rural/portal-proprietario`: portal proprietario rural.
- `/rural/portal-comprador`: portal comprador rural.
- `/rural/financial`: metas e vendas rurais.
- `/rural/connections`: conexoes WhatsApp/API.

O guard `PanelGuard` tenta manter cada organizacao no painel correto com base em `organization.niche`. Isso funciona como camada de acesso, mas nao substitui filtros internos nas telas.

## 3. `RuralLayout`

Arquivo: `components/RuralLayout.tsx`

O que faz:

- Monta o menu lateral rural.
- Separa operacao, carteira rural, crescimento e sistema.
- Direciona para dashboard, WhatsApp, email, kanban, CRM, imoveis rurais, territorio rural, metas, site, landing pages, quiz, matchmaking, agentes, relatorios, conexoes e configuracoes.
- Header usa texto "Imobiliaria Rural", busca "Buscar fazendas..." e botao "Nova Fazenda".

O que funciona:

- Layout rural esta separado do urbano.
- Menu rural tem linguagem rural.
- Redireciona superadmin para `/superadmin` quando nao esta impersonando.

Problemas:

- A busca do header e apenas visual; nao executa busca.
- O menu mostra somente "Imoveis Rurais" e "Territorio Rural" na carteira, mas ha funcoes rurais tecnicas fora desse agrupamento.

Pode evoluir:

- Busca global rural real: fazendas, CAR, proprietario, cidade, lead.
- Atalhos contextuais: "Localizar CAR", "Gerar dossie", "Validar documentacao".
- Indicador de qualidade do cadastro rural no menu ou header.

## 4. `RuralDashboard`

Arquivo: `views/RuralDashboard.tsx`

O que faz:

- Dashboard inicial rural.
- Mostra KPIs de propriedades, investidores, due diligence e negocios.
- Renderiza grafico de volume de negociacoes.
- Mostra resumo IA via `IADashboardSummary`.
- Mostra acoes estrategicas.

O que funciona:

- Conta propriedades por `organization_id`.
- Conta leads por `organization_id`.
- Renderiza o painel sem depender de mock externo.

Problemas:

- Conta todas as propriedades da organizacao, nao apenas rurais.
- Se a organizacao tiver dados mistos/legados, pode contar apartamentos/casas urbanas como propriedades rurais.
- Due diligence, negocios do mes, grafico e meta de captacao sao mockados.
- Acoes estrategicas sao botoes visuais sem navegacao/acao.

Risco de dado urbano no rural:

- Alto, porque a consulta de propriedades nao filtra `niche = rural` nem lista de tipos rurais.

Pode evoluir:

- Filtrar por rural usando regra unica.
- Calcular VGV rural real.
- Calcular hectares totais.
- Mostrar propriedades sem CAR, sem CCIR, sem GEO, sem ITR.
- Mostrar funil rural: lead investidor, visita tecnica, proposta, due diligence, fechamento.

## 5. `PropertyManagement` no painel rural

Arquivo: `views/PropertyManagement.tsx`

O que faz:

- Lista imoveis.
- Detecta rural pelo path `/rural`.
- Chama `propertyService.list(1, 100, 'rural')`.
- Permite editar, excluir, publicar pendentes.
- No rural mostra resumo com hectares e solo.

O que funciona:

- Usa API central `/api/properties?niche=rural`.
- Desliga integracao Orulo no rural.
- Mostra dados rurais no card.

Problemas:

- Alem do filtro da API, aplica filtro local por `p.niche === 'rural'`.
- Se um imovel rural antigo nao tiver `niche`, mas tiver `property_type = Fazenda`, ele pode ser retornado pela API e depois removido no frontend.
- Busca, filtros "Tipo", "Status" e "Filtros" ainda parecem visuais.

Risco de dado urbano no rural:

- Medio. A API tenta filtrar rural, mas o modelo de nicho/tipo ainda e fragil.

Pode evoluir:

- Remover filtro local simplista e usar funcao `isRuralProperty`.
- Filtros reais por tipo rural, area, cidade, status documental, CAR, aptidao.
- Badges rurais: CAR, CCIR, GEO, ITR, hectares, valor/ha.

## 6. `PropertyEditor` no rural

Arquivo: `views/PropertyEditor.tsx`

O que faz:

- Cadastro e edicao de imovel.
- Se nicho for rural, exibe campos rurais:
  - area em hectares/alqueires;
  - topografia;
  - solo;
  - altitude;
  - infraestrutura rural;
  - recursos hidricos;
  - documentacao legal rural;
  - CAR, CCIR, GEO, ITR;
  - mapa/geometria.

O que funciona:

- Salva `niche: 'rural'` quando identifica organizacao rural.
- Tem formulario rico para propriedade rural.
- Integra consulta/mapeamento de dados CAR em alguns pontos.
- Permite geometria em `features.legal.geometry`.

Problemas:

- A condicao urbana/rural depende muito de `niche === 'traditional'`; se o banco trouxer `urban` ou `urbano`, pode haver comportamento errado.
- `features` mistura campos rurais e urbanos no mesmo objeto.
- Nao ha validacao forte por schema antes de salvar.

Risco de dado urbano no rural:

- Medio. O formulario rural aparece pelo nicho da organizacao, mas dados antigos no mesmo shape podem manter campos urbanos.

Pode evoluir:

- Normalizar nicho antes de qualquer condicao.
- Separar `features.rural` e `features.urban`.
- Criar validacao obrigatoria para rural: tipo rural, area, cidade/UF, preco, status, documentacao basica.
- Calcular automaticamente valor/ha.

## 7. `CadastroTecnico`

Arquivo: `views/rural/CadastroTecnico.tsx`

O que faz:

- Lista propriedades rurais.
- Importa arquivo geografico.
- Previsualiza poligono no mapa.
- Mostra formulario tecnico com area agricultavel, reserva, bioma, solo, regime hidrico, topografia, aptidao e score.

O que funciona:

- Consulta `properties` por `organization_id`.
- Filtra por lista de tipos rurais.
- Le GeoJSON/JSON.
- Le KML simples.
- Renderiza mapa com Leaflet.

Problemas:

- Botao "Salvar Cadastro Tecnico" nao salva nada.
- UI aceita KMZ, Shapefile e ZIP, mas o codigo so processa JSON/GeoJSON/KML.
- Usa campos `area_total_ha`, `location_city`, `location_state`, que podem nao existir no schema atual.
- Nao vincula arquivo importado a uma propriedade selecionada.

Risco de dado urbano no rural:

- Baixo a medio, porque filtra tipos rurais e organizacao. Mas depende dos nomes exatos dos tipos.

Pode evoluir:

- Selecionar propriedade antes do upload.
- Persistir geometria e dados tecnicos.
- Suportar KMZ real com `JSZip`.
- Integrar com Motor de Analise Rural.
- Calcular area do poligono e comparar com area declarada.

## 8. `RuralTerritoryHub`

Arquivo: `views/rural/RuralTerritoryHub.tsx`

O que faz:

- Centraliza as abas de territorio rural:
  - Mapas;
  - Localizar CAR;
  - Dossie 360;
  - Documentacao.

O que funciona:

- Organiza bem a experiencia rural territorial.
- Usa nested routes.

Problemas:

- Nao compartilha o mesmo imovel selecionado entre as abas.
- O usuario pode localizar CAR em uma aba e perder contexto ao ir para dossie/due diligence.

Pode evoluir:

- Criar contexto `RuralAssetContext`.
- Fluxo unico: localizar CAR -> criar/selecionar imovel -> validar documentos -> gerar dossie.

## 9. `Geointeligencia`

Arquivo: `views/rural/Geointeligencia.tsx`

O que faz:

- Mapa rural com camadas GIS.
- Desenho de poligonos.
- Calculo de area.
- Importacao KML/KMZ.
- Consulta CAR.
- Consulta SIGEF.
- Consulta precos agro/CEPEA.

O que funciona:

- Leaflet renderiza mapa.
- Camadas WMS configuradas:
  - SIGEF/INCRA;
  - CAR;
  - MapBiomas;
  - PRODES.
- Desenho de poligono calcula hectares e alqueires.
- Importa KML/KMZ.
- Chama `/api/rural/market/prices`.
- Chama `/api/rural/car/consultar/:codigo`.
- Chama `/api/rural/sigef/consultar/:codigo`.

Problemas:

- Geometrias desenhadas/importadas ficam so no estado da tela.
- Nao salva poligono no imovel.
- Consulta SIGEF no frontend espera `coords` e `bounds`, mas backend SIGEF nao monta isso como a rota CAR monta.
- Busca por endereco usa Nominatim direto no frontend.
- Clima esta fixo em `28°C`.

Risco de dado urbano no rural:

- Baixo, porque a tela e territorial e nao lista imoveis urbanos. O risco e mais de nao persistir dados.

Pode evoluir:

- Salvar geometria vinculada ao imovel.
- Criar botao "Associar ao imovel".
- Corrigir bounds do SIGEF.
- Criar relatorio tecnico automatico da geometria.
- Integrar clima real e MapBiomas/PRODES com analise por poligono.

## 10. `CARLocationSearch`

Arquivo: `views/rural/CARLocationSearch.tsx`

O que faz:

- Permite colar link do Google Maps ou localizacao.
- Chama `/api/rural/find-car-by-location`.
- Mostra candidatos CAR encontrados.
- Mostra geometria no mapa.
- Mostra confianca e distancia.

O que funciona:

- Frontend chama API rural correta.
- Backend busca coordenadas, UF, municipio, SICAR por ponto/raio.
- Backend grava log em `rural_location_search_logs`.
- Mapa exibe ponto e poligono.

Problemas:

- Input fala coordenadas, mas frontend envia sempre como `googleMapsUrl`.
- Botao "Gerar Dossie Rural" e apenas `alert`.
- Nao cria propriedade.
- Nao salva CAR escolhido.

Risco de dado urbano no rural:

- Baixo.

Pode evoluir:

- Detectar coordenadas `lat,lng`.
- Criar botao "Criar propriedade a partir deste CAR".
- Salvar `carNumber`, area, municipio, UF, geometria e fonte.
- Encaminhar automaticamente para Due Diligence.

## 11. `DueDiligence`

Arquivo: `views/rural/DueDiligence.tsx`

O que faz:

- Checklist documental rural.
- Divide documentos em fundiario e ambiental.
- Valida automaticamente CAR, SNCR/CCIR, SIGEF/GEO e ITR esperado.
- Calcula score geral, fundiario e ambiental.

O que funciona:

- Carrega propriedades por `organization_id`.
- Filtra por tipos rurais.
- Chama `legalValidationService.validateProperty`.
- Atualiza checklist em memoria.
- Calcula score.

Problemas:

- Checklist nao persiste.
- Upload de documento e visual, sem armazenamento.
- Backend rural nao retorna ITR dentro de `/validar`, embora frontend espere.
- Backend valida o imovel por ID e organizacao, mas nao confirma que ele e rural.
- Varias rotas usam caminhos diferentes dentro de `features`.

Risco de dado urbano no rural:

- Medio. A lista da tela filtra rural, mas o endpoint de validacao nao valida nicho rural.

Pode evoluir:

- Persistir checklist em tabela `rural_due_diligence_items`.
- Upload real em storage.
- Adicionar ITR no endpoint.
- Validar que `property.niche = rural` ou `property_type` rural.
- Gerar pendencias automaticas para dossie.

## 12. `DossieInteligente`

Arquivo: `views/rural/DossieInteligente.tsx`

O que faz:

- Tela de dossie rural 360.
- Mostra overview do imovel.
- Mostra validacao tecnica.
- Mostra inteligencia de mercado.
- Mostra analise de risco IA.
- Mostra widget agro.

O que funciona:

- Renderiza UI rica.
- Lista propriedades.
- Calcula valor por hectare.
- Exibe `AgroMarketWidget`.

Problema critico:

- Carrega propriedades sem `organization_id`.
- Nao filtra rural.
- Pode mostrar dados urbanos e ate de outras organizacoes, dependendo das politicas do Supabase.

Outros problemas:

- Gerar PDF nao faz nada.
- Validacao tecnica e fixa.
- Analise de risco IA e fixa.
- Ferramentas de venda sao botoes visuais.

Risco de dado urbano no rural:

- Muito alto.

Pode evoluir:

- Corrigir imediatamente a consulta:
  - usar `profile.organization_id`;
  - filtrar `niche = rural` ou tipos rurais.
- Consumir dados reais de due diligence.
- Consumir geometria real.
- Gerar PDF real.
- Enviar dossie por WhatsApp.

## 13. `BIRural`

Arquivo: `views/BIRural.tsx`

O que faz:

- BI rural: valor em carteira, area total, ticket por hectare, leads, mix de produtos, VGV por regiao e origem de leads.

O que funciona:

- Tenta usar RPCs:
  - `get_bi_stats`;
  - `get_bi_lead_sources`.
- Faz fallback calculando a partir de propriedades.
- Filtra por tipos rurais.

Problema critico:

- Consulta propriedades sem `organization_id`.
- RPC usa `settings.id`, que pode nao ser `organization_id`.

Outros problemas:

- Crescimento historico e mockado.
- Insight de performance e texto fixo.
- Importa mocks nao usados.

Risco de dado urbano no rural:

- Medio a alto. Filtra tipos rurais, mas nao filtra tenant. Se houver RLS forte, pode mitigar; se nao, e grave.

Pode evoluir:

- Trocar `settings.id` por `profile.organization_id`.
- Aplicar filtro rural e tenant sempre.
- Criar RPC rural segura.
- Calcular historico real por mes.
- Incluir hectares disponiveis, valor/ha por estado, tempo medio de venda.

## 14. `FinanceiroRural`

Arquivo: `views/rural/FinanceiroRural.tsx`

O que faz:

- Metas e vendas rurais.
- Calcula VGV vendido e comissao estimada.
- Mostra funil por status de lead.
- Mostra ultimos negocios.

O que funciona:

- Busca leads via `leadService.list()`.
- Busca propriedades via `propertyService.list()`.
- Calcula vendidos e comissao.
- Usa dados reais quando existem.

Problemas:

- Chama `propertyService.list()` sem passar `rural`.
- Metas sao mockadas.
- Se nao houver negocio vendido, mostra uma Fazenda Boa Vista ficticia.
- Potencial de propostas e conversao sao textos fixos.

Risco de dado urbano no rural:

- Medio. Em organizacao rural pura funciona melhor; em dados mistos pode misturar.

Pode evoluir:

- Chamar `propertyService.list(1, 100, 'rural')`.
- Criar cadastro de metas por periodo.
- Remover negocio ficticio.
- Integrar propostas reais.

## 15. `PortalProprietarioRural`

Arquivo: `views/rural/PortalProprietarioRural.tsx`

O que faz:

- Portal para proprietario acompanhar propriedades, documentos, financeiro e atividades.

O que funciona:

- Interface completa e coerente com rural.
- Abas: visao geral, documentacao, financeiro.

Problemas:

- Todos os dados sao mockados.
- Nao filtra por proprietario real.
- Nao usa login/token de proprietario.
- Nao carrega propriedades do banco.

Risco de dado urbano no rural:

- Baixo hoje porque e mockado; alto no futuro se for ligado sem filtro correto.

Pode evoluir:

- Conectar com `owner_info`.
- Criar acesso seguro do proprietario.
- Mostrar documentos reais.
- Mostrar leads/propostas reais.

## 16. `PortalCompradorRural`

Arquivo: `views/rural/PortalCompradorRural.tsx`

O que faz:

- Portal do investidor/comprador rural.
- Busca propriedades, favoritos e visitas.

O que funciona:

- UI rural clara.
- Cards com area, bioma, aptidao, preco, valor/ha e score.

Problemas:

- Dados sao mockados.
- Filtros nao filtram.
- Favoritos nao persistem.
- Visitas sao fixas.

Risco de dado urbano no rural:

- Baixo hoje porque e mockado.

Pode evoluir:

- Conectar em propriedades rurais reais.
- Filtros reais por area, bioma, aptidao, valor/ha, UF, cidade.
- Criar favoritos e agenda de visita.

## 17. `ConexoesRural`

Arquivo: `views/rural/ConexoesRural.tsx`

O que faz:

- Gerencia instancias WhatsApp/API.
- Cria instancia.
- Mostra QR Code.
- Exclui instancia.
- Desconecta instancia.
- Usa websocket para status.

O que funciona:

- Funcional de verdade.
- Usa `instanceApi`.
- Usa `useWebSocket`.
- Respeita limite de plano.
- Trata indisponibilidade do servico WhatsApp.

Problemas:

- E uma funcao generica com texto rural, nao uma automacao rural especializada.
- Nao segmenta por captacao rural, compradores, proprietarios, investidores.

Risco de dado urbano no rural:

- Baixo, porque e conexao de WhatsApp, nao listagem de imoveis.

Pode evoluir:

- Presets rurais:
  - Atendimento comprador rural;
  - Captacao de fazendas;
  - Proprietarios;
  - Pos-venda/documentacao.
- Vincular instancias a funis rurais.

## 18. APIs rurais

Arquivo: `server/api/rural/index.js`

### `/api/rural/market/prices`

Funcao:

- Busca precos agro via `AgroIntelligenceService.getLatestPrices()`.

Funciona:

- Endpoint existe e e usado por `Geointeligencia`.

Evoluir:

- Cache, fallback e timestamp da fonte.

### `/api/rural/sncr/buscar`

Funcao:

- Busca imoveis rurais por CPF/CNPJ.

Problemas:

- Filtra `property_type = 'Rural'`, mas a base usa `Fazenda`, `Sitio`, `Chacara`, etc.
- Pode nao achar a maioria dos imoveis rurais.

Evoluir:

- Usar lista de tipos rurais ou `niche = rural`.

### `/api/rural/sncr/imovel/:codigo`

Funcao:

- Busca propriedade por CCIR.

Funciona:

- Usa `organization_id`.

Problemas:

- Depende de `features->legal->ccirNumber`.
- Nao confirma tipo rural.

### `/api/rural/sigef/parcela/:codigo`

Funcao:

- Busca propriedade por GEO/SIGEF local.

Funciona:

- Usa `organization_id`.

Problemas:

- Nao confirma tipo rural.

### `/api/rural/car/consultar/:codigo`

Funcao:

- Consulta live WFS do CAR.

Funciona:

- Extrai UF do codigo.
- Consulta camada SICAR.
- Calcula centro e bounds.

Problemas:

- Depende de padrao de codigo com UF.
- Pode falhar para UFs/camadas nao mapeadas.

### `/api/rural/sigef/consultar/:codigo`

Funcao:

- Consulta live WFS SIGEF/INCRA.

Funciona:

- Faz request WFS.

Problemas:

- Nao calcula centro/bounds para o frontend.

### `/api/rural/car/:codigo`

Funcao:

- Busca CAR local em propriedades cadastradas.

Funciona:

- Usa `organization_id`.

Problemas:

- Nao filtra nicho rural.
- Depende de `features->legal->carNumber`.

### `/api/rural/itr/certidao/:nirf`

Funcao:

- Retorna resposta simulada de ITR regular.

Funciona:

- Endpoint responde.

Problemas:

- Nao consulta Receita de verdade.
- Sempre retorna regular/negativa.

### `/api/rural/validar/:propertyId`

Funcao:

- Valida CAR, SIGEF e SNCR a partir dos campos salvos.
- Calcula score de risco.

Funciona:

- Usa `organization_id`.
- Monta validacoes.

Problemas:

- Nao valida ITR apesar do frontend esperar.
- Nao garante que o imovel e rural.
- Nao consulta fontes externas; usa dados salvos.

### `/api/rural/analysis/kmz`

Funcao:

- Upload de KMZ para Motor de Analise Rural.

Funciona:

- Rota existe com multer.
- Controller separado.

Evoluir:

- Ligar com telas de Geointeligencia/CadastroTecnico.

### `/api/rural/find-car-by-location`

Funcao:

- Busca CAR por link/coordenada.

Funciona:

- Extrai coordenadas.
- Faz reverse geocode.
- Consulta SICAR por ponto e raio.
- Calcula confianca.
- Registra log.

Problemas:

- Frontend ainda nao envia coordenadas separadas quando usuario digita `lat,lng`.

## 19. Servicos rurais frontend

### `legalValidationService`

Arquivo: `services/legalValidationService.ts`

Funcao:

- Cliente frontend para SNCR, SIGEF, CAR, ITR e validacao rural.

Funciona:

- Encapsula chamadas para `/api/rural`.

Problemas:

- Alguns metodos dependem de endpoints simulados.
- `calculateRiskScore` existe no frontend, mas a tela principal usa o score do backend.

Evoluir:

- Usar tipos fortes alinhados ao backend.
- Remover duplicidade de calculo ou definir uma fonte oficial.

### `ruralDataService`

Arquivo: `services/ruralDataService.ts`

Funcao:

- Busca dados externos rurais e normaliza CAR.

Funciona:

- Tem chamada para `/api/rural/car`.

Problemas:

- Parte das URLs externas parece placeholder/consulta direta nao usada amplamente.

Evoluir:

- Integrar formalmente com Geointeligencia e Due Diligence.

### `propertyAnalysisService`

Arquivo: `services/propertyAnalysisService.ts`

Funcao:

- Analise IA de propriedade rural.

Funciona:

- Monta prompt rural.

Problemas:

- Depende de IA e retorno estruturado; precisa verificacao de uso real.

Evoluir:

- Alimentar DossieInteligente com resultado real.

## 20. Lista de correcoes rurais prioritarias

### Correcao imediata 1: Dossie rural

Corrigir `DossieInteligente`:

- Adicionar `useAuth`.
- Filtrar por `profile.organization_id`.
- Filtrar apenas rural.
- Remover possibilidade de listar urbano.

### Correcao imediata 2: BI rural

Corrigir `BIRural`:

- Usar `profile.organization_id`.
- Filtrar tenant.
- Filtrar rural.
- Parar de usar `settings.id` como org.

### Correcao imediata 3: Dashboard rural

Corrigir `RuralDashboard`:

- Contar apenas propriedades rurais.
- Calcular area total rural.
- Calcular valor total rural.

### Correcao imediata 4: Financeiro rural

Corrigir `FinanceiroRural`:

- Usar `propertyService.list(1, 100, 'rural')`.
- Remover fallback de fazenda ficticia.

### Correcao imediata 5: Endpoints rurais por ID

Em `/api/rural/validar/:propertyId`, `/car/:codigo`, `/sncr/imovel/:codigo`, `/sigef/parcela/:codigo`:

- Garantir `organization_id`.
- Garantir que o imovel e rural.

## 21. Conclusao rural

A parte rural tem boa ambicao de produto: nao e so cadastro de fazenda. Ela ja aponta para uma plataforma rural completa com geointeligencia, CAR, SIGEF, due diligence, dossie, BI, financeiro e portais.

Mas hoje existem tres niveis de maturidade:

1. Funcional real: conexoes WhatsApp, parte da listagem de propriedades, mapas, consulta CAR/SIGEF, busca CAR por localizacao.
2. Parcial: due diligence, financeiro, BI, cadastro tecnico.
3. Mock/prototipo: portal comprador, portal proprietario, partes do dossie e indicadores historicos.

O foco agora deve ser transformar o rural em fluxo unico:

Localizar CAR -> criar ou vincular propriedade -> salvar geometria -> validar documentacao -> calcular risco -> gerar dossie -> enviar ao comprador/proprietario -> acompanhar no financeiro rural.

Se esse fluxo for fechado, o modulo rural deixa de ser um conjunto de telas e vira uma operacao rural realmente especializada.
