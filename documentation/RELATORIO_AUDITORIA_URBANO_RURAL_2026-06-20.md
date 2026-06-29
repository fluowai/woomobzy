# Relatorio de Auditoria Urbano x Rural - IMOBZY

Data da analise: 20/06/2026  
Escopo: revisao contextual do projeto com foco em separacao urbano/rural, funcionamento das telas urbanas e revisao das funcoes/telas rurais.

## 1. Contexto geral

O projeto e uma plataforma imobiliaria multi-painel, com frontend React/Vite e backend Express/Node. A arquitetura separa os paineis por rotas:

- `/rural`: operacao de imobiliaria rural.
- `/urban`: operacao de imobiliaria urbana/tradicional.
- `/superadmin`: administracao da plataforma.

A decisao de painel e feita por organizacao, usando `organization.niche`. O valor `rural` leva ao painel rural; `traditional`, `urban` e `urbano` levam ao painel urbano. Tambem existe fallback por nome/slug da organizacao quando o nicho nao esta definido.

O ponto mais importante: a separacao de dados ainda nao e uniforme em todas as telas. Algumas telas usam filtros por `organization_id` e `property_type`; outras usam `niche`; outras ainda consultam `properties` diretamente sem filtro suficiente. Isso permite que dados rurais aparecam no urbano ou dados urbanos aparecam no rural, principalmente em bases antigas com `niche` inconsistente, `property_type` escrito de formas diferentes ou campos legados.

## 2. Estado atual das rotas principais

Arquivo principal: `App.tsx`.

### Rural

Rotas rurais relevantes:

- `/rural`: `RuralDashboard`
- `/rural/properties`: `PropertyManagement`
- `/rural/cadastro-tecnico`: `CadastroTecnico`
- `/rural/territorio/maps`: `Geointeligencia`
- `/rural/territorio/localizar-car`: `CARLocationSearch`
- `/rural/territorio/due-diligence`: `DueDiligence`
- `/rural/territorio/dossie`: `DossieInteligente`
- `/rural/reports`: `BIRural`
- `/rural/portal-proprietario`: `PortalProprietarioRural`
- `/rural/portal-comprador`: `PortalCompradorRural`
- `/rural/financial`: `FinanceiroRural`
- `/rural/connections`: `ConexoesRural`

### Urbano

Rotas urbanas relevantes:

- `/urban`: `UrbanDashboard`
- `/urban/properties`: `PropertyManagement`
- `/urban/empreendimentos` e `/urban/loteamentos`: `Empreendimentos`
- `/urban/locacao`: `Locacao`
- `/urban/compliance`: `ComplianceUrbano`
- `/urban/cobranca`: `Cobranca`
- `/urban/simulador`: `Simulator360`
- `/urban/exportador`: `ExportadorPortais`
- `/urban/reports`: `BIUrbano` no estado atual do workspace
- `/urban/connections`: `ConexoesUrbano` no estado atual do workspace
- `/urban/financeiro`: `FinanceiroUrbano`
- `/urban/documentos`: `GestaoDocumentos`

Observacao importante: ha alteracoes locais nao commitadas criando `BIUrbano` e `ConexoesUrbano`, e ajustando `App.tsx`. No estado atual, a rota urbana de relatorios nao usa mais `BIRural`, e a rota urbana de conexoes nao usa mais `ConexoesRural`. Isso corrige duas fontes obvias de conteudo rural dentro do urbano.

## 3. Principais causas de mistura urbano/rural

### 3.1. Filtro por nicho nao padronizado

`services/properties.ts` envia `niche` opcional para `/api/properties`. Quando cria um imovel, o default e `urbano` se o payload nao informar nicho. Isso e bom para urbano, mas perigoso para fluxos rurais que esquecerem de informar `niche: 'rural'`.

No backend, `server/api/properties/index.js` filtra por:

- `niche.eq.rural` ou tipos rurais quando `filterNiche === 'rural'`.
- `niche.eq.urbano` ou tipos urbanos quando `filterNiche === 'urbano'`.

Esse filtro e util, mas nao e suficiente como regra universal porque:

- O banco usa tambem `traditional` como nicho da organizacao.
- Imoveis podem ter `niche` nulo ou antigo.
- Ha acentos/encoding diferentes nos nomes dos tipos.
- Algumas telas consultam `supabase.from('properties')` diretamente e pulam a API central.

### 3.2. Consultas diretas sem `organization_id`

`views/rural/DossieInteligente.tsx` carrega todos os imoveis com `.from('properties').select('*').order(...)`, sem `organization_id`, sem nicho e sem tipo rural. Este e um ponto critico: pode vazar dados de outro tenant e misturar urbano/rural.

`views/BIRural.tsx` filtra por tipos rurais, mas nao aplica `organization_id` na consulta de propriedades. O RPC usa `settings.id`, que provavelmente nao e o mesmo conceito de `organization_id`. Tambem e risco critico.

`views/urban/ComplianceUrbano.tsx` filtra com `.not('property_type', 'in', '("Rural","Fazenda")')`, mas nao aplica `organization_id`. Alem disso, exclui apenas dois tipos rurais, deixando passar `Sitio`, `Chacara`, `Haras`, `Gleba`, etc.

### 3.3. Filtros urbanos incompletos

`UrbanDashboard` no historico original filtrava contagem e status por tipos urbanos, mas o calculo de VGV buscava propriedades disponiveis sem excluir rurais. No estado atual ha uma alteracao local iniciada para usar `URBAN_TYPES`, mas e preciso confirmar se todas as consultas do dashboard urbano foram alinhadas.

`server/api/urban/index.js` usa exclusao parcial em `/buscar`: remove apenas `"Rural","Fazenda"`. Isso e insuficiente.

### 3.4. Tipos duplicados e inconsistentes

Ha pelo menos duas definicoes de tipo de propriedade:

- `types.ts`, com enum exibivel em portugues: `Fazenda`, `Sitio`, `Apartamento`, etc.
- `src/types/property.ts`, com valores em caixa alta: `FAZENDA`, `SITIO`, `CASA`, etc.

Essa duplicidade aumenta risco de filtros divergentes e mapeamentos quebrados.

## 4. Analise das funcoes/telas rurais

### 4.1. `RuralDashboard`

Funcao: dashboard inicial rural. Mostra KPIs, grafico de volume, resumo IA e acoes estrategicas.

O que funciona:

- Conta propriedades e leads por `organization_id`.
- Renderiza KPIs e graficos.
- Usa `IADashboardSummary`.

Problemas:

- Conta todas as propriedades da organizacao, sem filtrar rural. Se a organizacao tiver dados mistos ou legados, o dashboard rural pode somar urbanos.
- Parte dos indicadores e mockada: Due Diligence, negocios do mes, grafico historico e meta.

Evolucao recomendada:

- Aplicar filtro rural padrao.
- Criar agregacoes reais de VGV, hectares, leads rurais e funil rural.
- Trocar graficos mockados por dados historicos do banco.

### 4.2. `PropertyManagement`

Funcao: listagem, revisao, publicacao, exclusao, importacao Orulo no urbano e resumo de imoveis.

O que funciona:

- Detecta se esta em `/rural` ou `/urban`.
- Chama `propertyService.list(1, 100, currentNiche)`.
- No estado atual, a listagem urbana foi ajustada para mostrar m2, dormitorios, banheiros e vagas; rural continua com hectares/solo.
- Bloqueia Orulo no rural.

Problemas:

- Alem do filtro da API, ainda filtra no cliente por `p.niche === currentNiche`; se imoveis antigos nao tiverem `niche`, o rural perde dados validos e o urbano aceita dados sem nicho.
- Busca e filtros visuais ainda nao parecem funcionais.

Evolucao recomendada:

- Centralizar `isRuralProperty` e `isUrbanProperty` em util compartilhado.
- Usar criterio positivo de tipo + nicho, nao apenas `niche`.
- Implementar filtros reais de busca, tipo e status.

### 4.3. `PropertyEditor`

Funcao: cadastro/edicao de imovel, alternando campos urbanos e rurais conforme nicho da organizacao.

O que funciona:

- Usa `profile.organization.niche`.
- Define `nicheValue` como `rural` ou `urbano` ao salvar.
- Exibe campos rurais: area, topografia, solo, infraestrutura, agua, documentacao rural, CAR/SIGEF.
- Exibe campos urbanos: m2, area construida, dormitorios, suites, banheiros, vagas, condominio, IPTU.

Problemas:

- A logica depende de `niche === 'traditional'` para urbano; se vier `urban` ou `urbano`, algumas condicoes podem cair no comportamento rural.
- O objeto `features` mistura campos rurais e urbanos no mesmo shape.

Evolucao recomendada:

- Normalizar nicho antes das condicoes.
- Separar `features.rural` e `features.urban`, mantendo compatibilidade por migracao.
- Criar validacao por schema antes de salvar.

### 4.4. `CadastroTecnico`

Funcao: cadastro tecnico/geografico rural.

O que funciona:

- Lista propriedades rurais por `organization_id` e lista de `property_type`.
- Importa GeoJSON/JSON e KML no navegador.
- Renderiza pre-visualizacao no Leaflet.

Problemas:

- Botao "Salvar Cadastro Tecnico" nao persiste no banco.
- Aceita `.kmz`, `.shp`, `.zip` na UI, mas o codigo so processa JSON/GeoJSON/KML simples.
- Usa colunas `area_total_ha`, `location_city`, `location_state`, que podem nao bater com o schema atual usado por `services/properties.ts`.

Evolucao recomendada:

- Integrar com `/api/rural/analysis/kmz` ou criar endpoint para salvar geometria/metadata.
- Suportar KMZ de verdade com `JSZip`, como ja existe em `Geointeligencia`.
- Validar schema e persistir bioma, solo, regime hidrico, topografia, aptidao e score.

### 4.5. `Geointeligencia`

Funcao: mapa rural com camadas GIS, desenho/importacao de poligonos, consulta CAR/SIGEF e indicadores de mercado.

O que funciona:

- Renderiza mapa Leaflet.
- Alterna camadas WMS.
- Desenha poligonos e calcula area.
- Importa KML/KMZ.
- Consulta `/api/rural/market/prices`.
- Consulta `/api/rural/car/consultar/:codigo`.
- Consulta `/api/rural/sigef/consultar/:codigo`.

Problemas:

- Busca por endereco usa `fetch` direto para Nominatim no frontend, sem tratamento de limite/headers/cache.
- Resultado do SIGEF no backend nao retorna `coords`/`bounds`, mas o frontend espera `result.coords` e `result.bounds`; isso pode nao centralizar o mapa para SIGEF.
- Desenhos/importacoes ficam em estado local; nao vinculam a um imovel.
- Clima mostra valor fixo.

Evolucao recomendada:

- Criar salvamento de geometria em `features.legal.geometry` ou tabela especifica.
- Corrigir backend SIGEF para calcular bounds como CAR.
- Criar pipeline "mapa -> imovel -> due diligence -> dossie".
- Substituir clima mockado por `climateService`/fonte real.

### 4.6. `CARLocationSearch`

Funcao: localizar CAR a partir de link Google Maps/coordenadas.

O que funciona:

- Chama `/api/rural/find-car-by-location`.
- Mostra progresso, candidatos, mapa e geometria.
- Backend extrai coordenadas, identifica UF, consulta SICAR por ponto/raio e registra log em `rural_location_search_logs`.

Problemas:

- O placeholder fala coordenadas, mas o body envia sempre `{ googleMapsUrl: inputValue }`; coordenadas digitadas podem nao ser interpretadas corretamente se `extractLatLngFromGoogleMapsUrl` nao suportar.
- "Gerar Dossie Rural" e apenas `alert`.
- Nao salva candidato no imovel.

Evolucao recomendada:

- Detectar input `lat,lng` no frontend e enviar `lat/lng`.
- Criar acao real para criar/atualizar propriedade rural com CAR encontrado.
- Integrar com dossie e documentos.

### 4.7. `DueDiligence`

Funcao: checklist fundiario/ambiental e validacao automatica rural.

O que funciona:

- Carrega propriedades rurais por `organization_id` e lista de tipos.
- Usa `legalValidationService.validateProperty`, que chama `/api/rural/validar/:propertyId`.
- Atualiza checklist em memoria com status de CAR, SNCR, SIGEF e ITR.
- Calcula score documental.

Problemas:

- Checklist e resultado nao persistem.
- Backend `/api/rural/validar` nao garante que o imovel e rural, apenas `id` e `organization_id`.
- Backend nao adiciona validacao ITR na lista, mas o frontend espera `ITR`.
- Algumas leituras usam `features.legal`, outras rotas usam `features->legal` e outras `legal->ccirNumber`, com inconsistencia de caminho.

Evolucao recomendada:

- Persistir checklist e documentos em tabela.
- Adicionar filtro rural no endpoint.
- Incluir ITR real ou remover dependencia do status ITR ate existir.
- Padronizar caminhos dos campos legais.

### 4.8. `DossieInteligente`

Funcao: tela de dossie 360 rural com resumo tecnico, mercado, risco IA e widget agro.

O que funciona:

- Renderiza layout completo.
- Lista imoveis e calcula valor/hectare.
- Usa `AgroMarketWidget`.

Problemas criticos:

- Carrega todos os imoveis sem `organization_id`, nicho ou tipo.
- Dados de validacao tecnica sao fixos.
- Analise de risco IA e fixa.
- Botao "Gerar PDF" nao executa geracao.
- `loading` e declarado, mas nao usado de forma efetiva.

Evolucao recomendada:

- Corrigir isolamento imediatamente.
- Consumir dados reais de `DueDiligence`, `Geointeligencia`, CAR/SIGEF e mercado.
- Usar endpoint de PDF ja existente no modulo de analise rural ou criar um dossie PDF consolidado.

### 4.9. `BIRural`

Funcao: BI rural de carteira, hectare, leads, mix e regioes.

O que funciona:

- Tenta usar RPCs `get_bi_stats` e `get_bi_lead_sources`.
- Fallback local calcula valor total, area, valor medio/ha e distribuicoes.
- Filtra propriedades por tipos rurais.

Problemas criticos:

- Consulta propriedades sem `organization_id`.
- Usa `settings.id` como `org_id` no RPC, o que pode nao representar a organizacao autenticada.
- Dados historicos de crescimento sao simulados.
- Importa mocks nao utilizados.

Evolucao recomendada:

- Usar `useAuth().profile.organization_id`.
- Criar BI rural com RPCs tenant-safe.
- Remover mocks/imports mortos.
- Validar encoding dos tipos rurais.

### 4.10. `FinanceiroRural`

Funcao: metas, VGV, comissao estimada, funil e ultimos negocios rurais.

O que funciona:

- Chama `leadService.list()` e `propertyService.list()`.
- Calcula propriedades vendidas e comissao estimada.
- Renderiza funil com leads reais por status.

Problemas:

- Metas e parte dos valores sao mockados.
- `propertyService.list()` sem nicho depende do nicho da organizacao no backend; funciona em organizacao rural, mas e fragil para dados mistos.
- Se nao houver vendidos reais, mostra negocio ficticio.

Evolucao recomendada:

- Chamar `propertyService.list(1, 100, 'rural')`.
- Criar entidade de metas.
- Remover fallback ficticio ou marcar como exemplo.

### 4.11. `PortalProprietarioRural`

Funcao: portal do proprietario rural.

O que funciona:

- UI completa com overview, documentos, financeiro e timeline.

Problemas:

- Dados sao todos mockados.
- Nao ha autentificacao/escopo de proprietario nesta tela.
- Nao consome propriedades reais.

Evolucao recomendada:

- Conectar com owner portal real e `owner_info`.
- Filtrar por proprietario autenticado/token.
- Mostrar documentos reais e propostas reais.

### 4.12. `PortalCompradorRural`

Funcao: portal/investidor rural para busca, favoritos e visitas.

O que funciona:

- UI completa de busca e cards rurais.

Problemas:

- Dados sao mockados.
- Filtros nao alteram a lista.
- Favoritos e visitas nao persistem.

Evolucao recomendada:

- Conectar a API de propriedades rurais.
- Implementar filtros por area, bioma, aptidao, preco e localizacao.
- Persistir favoritos e visitas.

### 4.13. `ConexoesRural`

Funcao: gestao de instancias WhatsApp/API no painel rural.

O que funciona:

- Lista, cria, exclui, desconecta e atualiza instancias.
- Usa WebSocket para status e QR Code.
- Respeita limite de plano.
- Trata servico indisponivel.

Problemas:

- E funcionalmente generico, nao rural de verdade. O texto fala "atendimento rural", mas a API e a mesma.
- Nao separa canais por finalidade rural, como captacao, comprador, proprietario, pos-venda.

Evolucao recomendada:

- Criar presets rurais de instancia e automacoes.
- Integrar com campanhas/CRM rural e tags.

### 4.14. `RuralTerritoryHub`

Funcao: hub de navegacao para mapas, CAR, dossie e due diligence.

O que funciona:

- Organiza o fluxo territorial rural por abas/rotas.

Problemas:

- Apenas navega; nao compartilha contexto do imovel selecionado entre abas.

Evolucao recomendada:

- Criar contexto de "ativo rural selecionado".
- Permitir jornada linear: localizar CAR -> salvar ativo -> validar documentos -> gerar dossie.

## 5. Analise da parte urbana atual

### 5.1. `UrbanDashboard`

Funcao: dashboard urbano.

O que funciona:

- Conta imoveis e leads por `organization_id`.
- Exibe leads recentes reais.
- Renderiza graficos e KPIs.

Problemas:

- Historicamente o VGV podia somar rurais porque a consulta de precos nao filtrava tipos/nicho. Ha alteracao local em andamento para corrigir com `URBAN_TYPES`.
- Graficos de leads por canal, conversao por corretor e estoque por tipo ainda sao mockados.

Evolucao recomendada:

- Garantir filtro urbano em todas as consultas.
- Trocar graficos mockados por agregacoes reais.
- Filtrar leads por perfil urbano quando existir `match_profile`.

### 5.2. `BIUrbano`

Funcao: BI urbano recem-criado.

O que funciona:

- Filtra por `organization_id`.
- Usa criterio positivo: `niche.eq.urbano` ou `property_type` em tipos urbanos.
- Calcula VGV, ticket medio, mix de estoque, VGV por cidade e leads por origem.

Problemas:

- Leads urbanos sao filtrados por `match_profile.eq.urbano` ou nulo; leads antigos sem perfil entram todos no urbano.
- Historico mensal usa meses fixos Jan-Jun sem considerar ano atual.

Evolucao recomendada:

- Classificar leads antigos ou usar origem/campanha/propriedade vinculada.
- Criar agregacao por periodo selecionado.

### 5.3. `ConexoesUrbano`

Funcao: gestao urbana de WhatsApp.

O que funciona:

- Lista/cria/exclui/desconecta instancias.
- Usa WebSocket e QR Code.
- Respeita limite de plano.

Problemas:

- Ainda e a mesma infraestrutura generica de WhatsApp.

Evolucao recomendada:

- Criar segmentacao urbana: vendas, locacao, condominio, cobranca.
- Conectar automacoes por tipo de lead urbano.

### 5.4. `ComplianceUrbano`

Funcao: checklist documental urbano e validacao IPTU/zoneamento/endereco/CND.

O que funciona:

- Checklist urbano separado.
- Chama `legalUrbanValidationService.validateProperty`.
- Calcula score documental.

Problemas criticos:

- Carrega propriedades sem `organization_id`.
- Exclui apenas `Rural` e `Fazenda`, permitindo outros rurais.
- Backend urbano tambem nao garante sempre que o imovel validado e urbano.

Evolucao recomendada:

- Corrigir tenant/nicho.
- Usar lista central de tipos urbanos.
- Persistir checklist.

## 6. APIs e servicos

### 6.1. `/api/properties`

O que funciona:

- Aplica `verifyAuth`/`requireTenant`.
- Usa `organization_id` em listagem, leitura, update, delete.
- Lista por nicho quando `?niche=` e informado.

Problemas:

- Filtro usa `.or(niche.eq...,property_type.in...)`. Isso ajuda recuperacao de legado, mas tambem pode incluir dados mal classificados.
- Default de organizacao `traditional` nao e igual ao default de imovel `urbano`.

Evolucao:

- Criar campo canonico `property_niche` com constraint.
- Criar view/RPC `properties_scoped_by_panel(org_id, panel)`.

### 6.2. `/api/rural`

O que funciona:

- Tem rotas de mercado, SNCR, SIGEF, CAR, ITR, validacao, KMZ, geoprocess e busca por localizacao.
- Aplica auth e tenant na maior parte das rotas sensiveis.
- CAR/SIGEF live usam WFS.

Problemas:

- Algumas consultas usam caminhos JSON inconsistentes.
- SNCR buscar filtra `property_type = 'Rural'`, mas o cadastro usa muitos tipos rurais.
- SIGEF consultar nao calcula bounds/coords para o frontend.
- Validacao rural nao confirma que o imovel e rural.

Evolucao:

- Padronizar schema rural.
- Aplicar filtro rural em todos endpoints por `id`.
- Unificar parser de GeoJSON/bounds.

### 6.3. `/api/urban`

O que funciona:

- Tem rotas IPTU, endereco, zoneamento, CND, validacao, busca por dono e detalhe.
- Aplica auth e tenant.

Problemas:

- Ha constantes SNCR/ITR herdadas do rural e nao usadas.
- Filtros urbanos por exclusao sao incompletos.
- Validacao urbana nao confirma positivamente que o imovel e urbano.

Evolucao:

- Usar lista positiva de tipos urbanos.
- Remover codigo morto herdado do rural.
- Conectar integracoes reais municipais quando existirem.

## 7. Prioridades recomendadas

### Prioridade 0 - corrigir mistura e isolamento

1. Corrigir `DossieInteligente` para filtrar por `organization_id` e rural.
2. Corrigir `BIRural` para usar `profile.organization_id` e filtro rural.
3. Corrigir `ComplianceUrbano` para usar `organization_id` e filtro urbano positivo.
4. Garantir que `UrbanDashboard` filtre urbano em todas as consultas.
5. Garantir que `RuralDashboard` filtre rural.

### Prioridade 1 - padronizar classificacao

1. Criar util compartilhado `propertyNiche.ts` com listas canonicas `RURAL_TYPES` e `URBAN_TYPES`.
2. Normalizar `traditional`, `urban` e `urbano` para `urbano`.
3. Migrar dados antigos preenchendo `properties.niche`.
4. Aplicar constraint/check no banco para `niche in ('rural','urbano')`.

### Prioridade 2 - completar funcoes rurais

1. Persistir cadastro tecnico.
2. Salvar geometrias importadas/desenhadas.
3. Transformar CAR encontrado em ativo rural vinculavel.
4. Persistir due diligence e documentos.
5. Gerar dossie PDF real.

### Prioridade 3 - evoluir produto urbano

1. Consolidar `BIUrbano` como tela oficial.
2. Completar dashboards com agregacoes reais.
3. Segmentar WhatsApp urbano por vendas/locacao/cobranca.
4. Fortalecer compliance urbano com schema documental real.

## 8. Conclusao

O sistema ja tem a base correta para separar urbano e rural: rotas separadas, layouts separados, APIs separadas e alguns filtros de nicho. O problema nao e ausencia de arquitetura; e inconsistencia de aplicacao da arquitetura.

Hoje, a maior fonte de mistura esta em telas que acessam `properties` diretamente sem passar pelo servico central ou sem `organization_id`/nicho. A segunda fonte e a existencia de dados legados com tipos/nichos divergentes. A terceira e o reaproveitamento de componentes genericos com textos e metricas rurais ou mockadas.

O estado atual do workspace ja contem correcoes relevantes na parte urbana: `BIUrbano`, `ConexoesUrbano`, melhorias no resumo urbano de `PropertyManagement` e inicio de padronizacao no `UrbanDashboard`. O proximo passo seguro e consolidar esses ajustes e aplicar a mesma disciplina nos pontos rurais criticos, principalmente `DossieInteligente`, `BIRural`, `RuralDashboard` e os endpoints de validacao.
