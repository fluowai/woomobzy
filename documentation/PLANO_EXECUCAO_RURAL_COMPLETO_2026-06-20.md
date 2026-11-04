# Plano de Execucao Rural Completo - IMOBZY

Data: 20/06/2026
Objetivo: resolver as falhas identificadas no modulo rural e transformar as ferramentas rurais em um fluxo funcional, integrado e evoluido.

## 1. Objetivo final

O modulo rural deve funcionar como uma operacao completa de imobiliaria rural:

Localizar CAR -> criar/vincular propriedade -> salvar geometria -> enriquecer cadastro tecnico -> validar documentos -> calcular risco -> gerar dossie -> enviar ao cliente -> acompanhar leads/propostas/metas.

O produto rural precisa deixar de ser um conjunto de telas isoladas e virar uma esteira operacional unica.

## 2. Principios de execucao

1. Toda consulta rural deve respeitar `organization_id`.
2. Toda consulta rural deve filtrar apenas imoveis rurais.
3. Nenhuma tela rural deve depender de dados mockados em producao.
4. Tudo que o usuario faz deve persistir: geometria, checklist, documentos, analises, favoritos, visitas e dossies.
5. As ferramentas devem compartilhar o mesmo imovel rural selecionado.
6. A API deve proteger o nicho rural, nao apenas o frontend.

## 3. Fase 0 - Correcao de isolamento e base rural

Prioridade: critica.
Objetivo: impedir mistura urbano/rural e vazamento entre organizacoes.

### Entregaveis

1. Criar util central de classificacao rural:
   - `isRuralProperty(property)`
   - `isUrbanProperty(property)`
   - `RURAL_PROPERTY_TYPES`
   - `URBAN_PROPERTY_TYPES`
   - `normalizeNiche(value)`

2. Aplicar esse util no frontend:
   - `RuralDashboard`
   - `PropertyManagement`
   - `CadastroTecnico`
   - `DueDiligence`
   - `DossieInteligente`
   - `BIRural`
   - `FinanceiroRural`

3. Aplicar protecao equivalente no backend:
   - `/api/properties?niche=rural`
   - `/api/rural/validar/:propertyId`
   - `/api/rural/car/:codigo`
   - `/api/rural/sncr/imovel/:codigo`
   - `/api/rural/sigef/parcela/:codigo`

4. Corrigir telas criticas:
   - `DossieInteligente`: adicionar `organization_id` e filtro rural.
   - `BIRural`: trocar `settings.id` por `profile.organization_id`.
   - `RuralDashboard`: contar apenas rurais.
   - `FinanceiroRural`: chamar `propertyService.list(1, 100, 'rural')`.

### Criterios de aceite

- Uma organizacao rural nao ve imoveis urbanos em nenhuma tela rural.
- `DossieInteligente` nao lista imoveis de outro tenant.
- `BIRural` calcula apenas dados da organizacao atual.
- Testes cobrem classificacao rural/urbana.

## 4. Fase 1 - Modelo rural canonico

Prioridade: alta.
Objetivo: padronizar como os dados rurais sao armazenados.

### Entregaveis

1. Definir schema canonico em `features.rural`:
   - area total;
   - unidade preferida;
   - bioma;
   - solo;
   - topografia;
   - aptidao;
   - recursos hidricos;
   - infraestrutura;
   - uso atual;
   - produtividade;
   - documentacao;
   - geometria.

2. Manter compatibilidade com campos legados:
   - `features.areaHectares`
   - `features.tipoSolo`
   - `features.legal`
   - `total_area_ha`

3. Criar migracao/rotina de normalizacao:
   - preencher `niche = 'rural'` em tipos rurais;
   - preencher `total_area_ha`;
   - mover/copiar campos legados para `features.rural`.

4. Criar validacao de payload rural:
   - no frontend antes de salvar;
   - no backend antes de inserir/atualizar.

### Criterios de aceite

- Todo novo imovel rural salva `niche = 'rural'`.
- Todo novo imovel rural salva area em campo padronizado.
- Formularios antigos continuam lendo propriedades existentes.
- O backend rejeita cadastro rural sem tipo rural valido.

## 5. Fase 2 - Fluxo de propriedade rural

Prioridade: alta.
Objetivo: evoluir cadastro e gestao de imovel rural.

### Entregaveis

1. Evoluir `PropertyEditor` rural:
   - normalizar nicho;
   - separar campos rurais de urbanos;
   - validar obrigatorios;
   - calcular valor por hectare;
   - salvar status documental inicial.

2. Evoluir `PropertyManagement` rural:
   - filtros reais por cidade, UF, tipo, area, preco, status, CAR, GEO, CCIR;
   - badges rurais;
   - coluna/resumo de valor por hectare;
   - alerta para cadastro incompleto.

3. Criar score de completude rural:
   - basico;
   - tecnico;
   - documental;
   - comercial;
   - territorial.

### Criterios de aceite

- Usuario consegue cadastrar fazenda completa.
- Listagem mostra dados rurais relevantes.
- Filtros funcionam de verdade.
- Imovel incompleto aparece com pendencias claras.

## 6. Fase 3 - Geointeligencia e CAR funcional

Prioridade: alta.
Objetivo: conectar mapa, CAR, SIGEF e cadastro.

### Entregaveis

1. Evoluir `Geointeligencia`:
   - salvar poligonos desenhados;
   - salvar KML/KMZ importado;
   - associar geometria a propriedade;
   - corrigir bounds do SIGEF;
   - remover clima fixo ou integrar clima real.

2. Evoluir `CARLocationSearch`:
   - aceitar coordenadas `lat,lng`;
   - criar propriedade a partir de candidato CAR;
   - atualizar propriedade existente com CAR/geometria;
   - abrir due diligence apos salvar.

3. Evoluir backend rural:
   - rota para salvar geometria;
   - rota para vincular CAR a propriedade;
   - calculo de area real do poligono;
   - log de fonte e confianca.

### Criterios de aceite

- Usuario cola link do Maps e encontra candidato CAR.
- Usuario salva o CAR em uma propriedade.
- Geometria aparece depois ao reabrir a propriedade.
- SIGEF centraliza mapa corretamente.

## 7. Fase 4 - Cadastro Tecnico Rural

Prioridade: alta.
Objetivo: transformar `CadastroTecnico` de prototipo em modulo persistente.

### Entregaveis

1. Selecionar propriedade antes do upload.
2. Suportar:
   - GeoJSON;
   - KML;
   - KMZ.
3. Persistir:
   - geometria;
   - area agricultavel;
   - area de reserva;
   - bioma;
   - tipo de solo;
   - regime hidrico;
   - topografia;
   - aptidao produtiva;
   - score tecnico.
4. Comparar area declarada x area do poligono.
5. Gerar pendencias tecnicas automaticas.

### Criterios de aceite

- Botao "Salvar Cadastro Tecnico" salva de verdade.
- Ao recarregar a tela, dados continuam la.
- Arquivos KMZ funcionam.
- A propriedade passa a exibir score tecnico.

## 8. Fase 5 - Due Diligence Rural

Prioridade: alta.
Objetivo: tornar checklist documental real e persistente.

### Entregaveis

1. Criar tabela de checklist rural:
   - propriedade;
   - documento;
   - status;
   - fonte;
   - arquivo;
   - vencimento;
   - observacao;
   - responsavel.

2. Criar upload real de documentos:
   - matricula;
   - CCIR;
   - CAR;
   - ITR;
   - GEO;
   - outorga;
   - licencas;
   - reserva legal;
   - APP.

3. Evoluir `/api/rural/validar/:propertyId`:
   - validar apenas rural;
   - incluir ITR;
   - retornar fontes, status e pendencias;
   - salvar resultado da validacao.

4. Tela:
   - checklist persistente;
   - upload/download;
   - vencimentos;
   - score fundiario;
   - score ambiental;
   - score geral.

### Criterios de aceite

- Status manual nao some ao trocar de tela.
- Upload fica vinculado ao imovel.
- Validacao automatica atualiza checklist.
- Dossie consegue consumir esses dados.

## 9. Fase 6 - Dossie Inteligente Rural

Prioridade: alta.
Objetivo: gerar dossie real, nao apenas tela visual.

### Entregaveis

1. Corrigir isolamento:
   - `organization_id`;
   - filtro rural.

2. Consumir dados reais:
   - propriedade;
   - geometria;
   - cadastro tecnico;
   - due diligence;
   - CAR/SIGEF;
   - valor por hectare;
   - dados de mercado;
   - fotos.

3. Gerar PDF:
   - capa;
   - resumo executivo;
   - localizacao;
   - mapa;
   - area;
   - documentos;
   - riscos;
   - oportunidades;
   - preco/ha;
   - anexos.

4. Acoes:
   - baixar PDF;
   - copiar link;
   - enviar por WhatsApp;
   - registrar atividade no CRM.

### Criterios de aceite

- PDF e gerado com dados reais.
- Dossie nao mostra dados mockados.
- Link/arquivo fica salvo no imovel.
- Envio por WhatsApp registra atividade.

## 10. Fase 7 - BI Rural e Dashboard Rural real

Prioridade: media/alta.
Objetivo: transformar indicadores rurais em gestao real.

### Entregaveis

1. `RuralDashboard` real:
   - propriedades rurais;
   - hectares totais;
   - valor em carteira;
   - leads investidores;
   - dossies gerados;
   - pendencias documentais;
   - negocios em andamento.

2. `BIRural` real:
   - VGV por UF/cidade;
   - valor medio por hectare;
   - estoque por tipo;
   - hectares por aptidao;
   - leads por origem;
   - conversao por etapa;
   - historico mensal real.

3. Criar RPCs seguras:
   - `get_rural_dashboard_stats(org_id)`
   - `get_rural_bi_stats(org_id, date_range)`
   - `get_rural_lead_sources(org_id, date_range)`

### Criterios de aceite

- Nenhum grafico rural usa mock.
- Todos os numeros batem com a base.
- Filtros por periodo funcionam.

## 11. Fase 8 - Financeiro Rural e metas

Prioridade: media.
Objetivo: controlar metas, vendas e comissoes rurais.

### Entregaveis

1. Criar entidade de metas:
   - meta mensal/trimestral;
   - meta de VGV;
   - meta de hectares captados;
   - meta de vendas;
   - taxa de comissao.

2. Remover negocio ficticio.
3. Integrar propostas reais.
4. Calcular:
   - VGV vendido;
   - comissao prevista;
   - funil de venda;
   - ticket medio;
   - tempo medio ate fechamento.

### Criterios de aceite

- Financeiro mostra apenas dados reais.
- Usuario cadastra/edita metas.
- Funil reflete leads/propostas reais.

## 12. Fase 9 - Portais Rurais

Prioridade: media.
Objetivo: tornar portais de proprietario e comprador reais.

### Portal Proprietario Rural

Entregaveis:

- login/token de proprietario;
- listar propriedades vinculadas ao proprietario;
- documentos;
- leads interessados;
- propostas;
- relatorios;
- atividades.

### Portal Comprador Rural

Entregaveis:

- listar propriedades rurais reais;
- filtros por UF, cidade, area, aptidao, preco, valor/ha;
- favoritos persistentes;
- visitas;
- recomendacoes por perfil;
- acesso ao dossie.

### Criterios de aceite

- Proprietario ve somente seus imoveis.
- Comprador filtra propriedades reais.
- Favoritos e visitas persistem.

## 13. Fase 10 - Automacoes e conexoes rurais

Prioridade: media.
Objetivo: especializar WhatsApp e IA para operacao rural.

### Entregaveis

1. Presets de conexao:
   - compradores rurais;
   - captacao de fazendas;
   - proprietarios;
   - documentacao;
   - pos-venda.

2. Automacoes:
   - envio de dossie;
   - lembrete de documento vencendo;
   - follow-up de visita tecnica;
   - resposta para lead interessado em fazenda;
   - captura de requisitos: area, UF, aptidao, budget.

3. CRM:
   - registrar mensagens importantes;
   - associar conversa a propriedade;
   - associar conversa a lead.

### Criterios de aceite

- Instancias continuam funcionando.
- Templates rurais existem.
- Envio de dossie e follow-up ficam registrados.

## 14. Fase 11 - Testes, seguranca e qualidade

Prioridade: continua.

### Testes minimos

1. Unitarios:
   - classificacao rural/urbana;
   - normalizacao de nicho;
   - calculo valor/ha;
   - score documental;
   - score tecnico.

2. Integracao API:
   - `/api/properties?niche=rural`;
   - `/api/rural/validar/:id`;
   - salvar geometria;
   - upload documento;
   - gerar dossie.

3. E2E:
   - cadastrar fazenda;
   - localizar CAR;
   - salvar geometria;
   - validar documentos;
   - gerar dossie;
   - enviar por WhatsApp.

### Criterios de aceite

- `npm run type-check` passa.
- `npm run build` passa.
- Testes de isolamento garantem que urbano nao aparece no rural.

## 15. Ordem recomendada de implementacao

1. Util rural/urbano central.
2. Corrigir `DossieInteligente`, `BIRural`, `RuralDashboard`, `FinanceiroRural`.
3. Proteger endpoints rurais por nicho.
4. Normalizar schema rural.
5. Evoluir `PropertyEditor` e `PropertyManagement`.
6. Salvar geometria e CAR.
7. Persistir cadastro tecnico.
8. Persistir due diligence e documentos.
9. Gerar dossie PDF real.
10. Evoluir BI/dashboard.
11. Evoluir financeiro.
12. Evoluir portais.
13. Evoluir automacoes WhatsApp/IA.
14. Cobrir com testes.

## 16. Cronograma sugerido

### Semana 1

- Fase 0 completa.
- Filtros e isolamento corrigidos.
- Util de classificacao criado.
- Testes de nicho.

### Semana 2

- Schema rural canonico.
- PropertyEditor e PropertyManagement rurais ajustados.
- Score de completude rural.

### Semana 3

- Geointeligencia salva geometria.
- CARLocationSearch cria/vincula propriedade.
- SIGEF bounds corrigido.

### Semana 4

- CadastroTecnico persistente.
- DueDiligence persistente.
- Upload de documentos.

### Semana 5

- Dossie PDF real.
- Envio/copia de link.
- Registro no CRM.

### Semana 6

- BI rural real.
- Dashboard rural real.
- Financeiro rural real.

### Semana 7+

- Portais rurais.
- Automacoes rurais.
- Polimento, testes E2E e hardening.

## 17. Marco de sucesso

O modulo rural sera considerado resolvido quando:

- Nenhuma tela rural mostrar imovel urbano.
- Toda ferramenta rural salvar seu resultado.
- Um imovel rural puder nascer de um CAR localizado no mapa.
- Due diligence gerar score real e persistente.
- Dossie PDF sair com dados reais.
- Dashboard, BI e financeiro refletirem a base real.
- Proprietario/comprador puderem usar portais com dados reais.
- O fluxo rural completo puder ser demonstrado de ponta a ponta.
