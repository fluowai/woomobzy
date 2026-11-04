# Auditoria de APIs publicas em tempo real e plano de integracao

Data: 2026-06-07  
Escopo: painel rural, painel urbano, backend Node, worker agro/Python e fontes publicas externas.

## Resumo executivo

O sistema possui nomes e telas para integracoes rurais e urbanas, mas hoje mistura tres categorias:

1. Integracao real em tempo real: CAR/SICAR WFS, apos correcao de camada por UF em minusculo.
2. Integracao externa viavel, ainda nao implementada: IBGE Localidades, IBGE Malhas, IBGE Agregados/SIDRA, ViaCEP, Banco Central SGS, INMET, dados abertos CNPJ, TerraBrasilis/INPE.
3. Simulacao/base local: SNCR, ITR/CND, IPTU, zoneamento urbano e validacao juridica completa.

Correcao aplicada nesta auditoria: `server/services/sicarService.js` agora gera `sicar:sicar_imoveis_pr` em vez de `sicar:sicar_imoveis_PR`. O teste externo mostrou que a camada em maiusculo retorna XML de erro; a camada em minusculo retorna JSON valido.

Correcao adicional aplicada: o script `npm run test:whatsapp` apontava para um arquivo inexistente. O `package.json` agora usa `scripts/test-whatsapp-go.ps1`, e o script usa `scratch/` como area temporaria local para evitar falha de permissao fora do workspace.

## Status das integracoes atuais no codigo

| Area | Rota/servico | Status real | Observacao |
| --- | --- | --- | --- |
| Rural | `/api/rural/car/consultar/:codigo` | Real, corrigido | Consulta WFS do SICAR. Precisa de teste automatizado de contrato. |
| Rural | `/api/rural/find-car-by-location` | Real, parcial | Usa SICAR por ponto/raio. Depende do mesmo layer corrigido. |
| Rural | `/api/rural/sigef/consultar/:codigo` | Quebrado/instavel | Endpoint `geoinfo.incra.gov.br` nao resolveu DNS nos testes. Acervo Fundiario atual aponta para i3Geo/OGC e pode exigir fluxo diferente. |
| Rural | `/api/rural/sncr/*` | Local/simulado | Consulta Supabase, nao SNCR oficial. |
| Rural | `/api/rural/itr/certidao/:nirf` | Instrutivo/simulado | Retorna mensagem para consultar Receita/e-CAC. |
| Rural | `server/agro-intelligence` | Parcial | Tem conceitos de SIGEF/CAR/IBGE, mas CAR usa endpoint/layer antigo e SIGEF usa host que falha DNS. |
| Urbano | `/api/urban/iptu/:inscricao` | Local/simulado | Busca em `properties`, nao prefeitura/IPTU. |
| Urbano | `/api/urban/endereco/:cep` | Local | Busca CEP em propriedades, nao ViaCEP/BrasilAPI. |
| Urbano | `/api/urban/zoneamento/:municipio` | Simulado | Retorna zona fixa. |
| Urbano | `/api/urban/cnd/pessoa/:cpf` | Simulado | Nao consulta Receita. |
| Urbano | `/api/urban/validar/:propertyId` | Local | Calcula risco a partir de dados ja cadastrados. |

## Testes em tempo real executados

| Fonte | Endpoint testado | Resultado | Latencia aprox. | Uso recomendado |
| --- | --- | --- | ---: | --- |
| IBGE Localidades | `servicodados.ibge.gov.br/api/v1/localidades/municipios/4106902` | OK 200 JSON | 328 ms | UF, municipio, codigos IBGE, normalizacao de enderecos. |
| IBGE Malhas | `api/v3/malhas/municipios/4106902?...geo+json` | OK 200 GeoJSON | 365 ms | Mapa urbano/rural, filtros por municipio, overlay leve. |
| IBGE Agregados/SIDRA | `api/v3/agregados/5457/metadados` | OK 200 JSON | 123 ms | Agro, producao municipal, indicadores economicos. |
| ViaCEP | `viacep.com.br/ws/01001000/json` | OK 200 JSON | 503 ms | Autocomplete de endereco urbano/rural. |
| BrasilAPI CEP | `brasilapi.com.br/api/cep/v2/01001000` | OK 200 JSON | 286 ms | Alternativa/fallback ao ViaCEP. |
| BrasilAPI CNPJ | `brasilapi.com.br/api/cnpj/v1/00000000000191` | OK 200 JSON | 397 ms | Enriquecimento de pessoa juridica/proprietario/locatario. |
| Banco Central SGS | serie Selic `bcdata.sgs.11` | OK 200 JSON | 1244 ms | Simuladores, contratos, correcao financeira. |
| INMET horario | `apitempo.inmet.gov.br/estacao/.../A001` | HTTP 204 | 193 ms | API viva, mas sem dados no intervalo/estacao testado. Precisa catalogo de estacoes e tratamento 204. |
| INMET diario | `/estacao/diaria/.../A001` | 404 | 82 ms | Rota nao confirmada para esse formato. Usar rota horaria ou revisar manual. |
| SICAR WFS capabilities | `geoserver.car.gov.br/geoserver/sicar/ows?service=WFS&request=GetCapabilities` | OK 200 XML | 1447 ms | Fonte oficial de camadas CAR. |
| SICAR WMS capabilities | `geoserver.car.gov.br/geoserver/sicar/wms?...` | OK 200 XML | 1319 ms | Overlay de mapa CAR. |
| SICAR Describe uppercase | `sicar:sicar_imoveis_PR` | XML de erro | 597 ms | Confirmou bug anterior. |
| SICAR Describe lowercase | `sicar:sicar_imoveis_pr` | OK 200 XML schema | 179 ms | Padrao correto. |
| SICAR WFS lowercase query | `sicar:sicar_imoveis_pr` com codigo fake | OK 200 JSON vazio | 186 ms | Contrato WFS/JSON valido. |
| SIGEF legacy geoinfo | `geoinfo.incra.gov.br/geoserver/wfs` | Falha DNS | 170 ms | Nao usar como unico endpoint. |
| Acervo Fundiario i3Geo WFS | `acervofundiario.incra.gov.br/i3geo/ogc.php?...` | 200 HTML ou timeout | 498 ms/timeout | Requer descoberta de temas/parametros e talvez login gov.br/interface i3Geo. |
| MapBiomas WMS atual no codigo | `workspace.mapbiomas.org/geoserver/wms` | 200 HTML, nao WMS | 961 ms | Endpoint do codigo nao deve ser tratado como WMS confiavel. |
| TerraBrasilis WMS | `terrabrasilis.dpi.inpe.br/geoserver/wms?...` | OK 200 XML | 8998 ms | Integravel, mas com timeout alto e cache obrigatorio. |

## Validacao WhatsApp

O teste disponivel para a integracao WhatsApp valida o servico Go/WhatsMeow local, nao envia mensagem real para numero externo. Resultado apos correcao do script:

| Teste | Resultado | Observacao |
| --- | --- | --- |
| `npm run test:whatsapp` | OK | Executou `go test ./...` e `go build ./cmd/server` no `whatsapp-service`. |

Para homologar ponta a ponta em producao ainda falta um teste com instancia autenticada, tenant real, WebSocket, envio e recebimento controlado, usando numero de teste e logs sem conteudo sensivel.

## APIs recomendadas para o painel rural

### Prioridade 1: confianca operacional alta

| API | Tipo | Credencial | Valor para o produto | Implementacao |
| --- | --- | --- | --- | --- |
| IBGE Localidades | Oficial/publica | Nao | Normalizar UF/municipio/codigo IBGE em propriedades e leads. | Connector `server/services/publicApis/ibgeLocalidades.js`; cache 30 dias. |
| IBGE Malhas | Oficial/publica | Nao | Poligonos municipais/UF para mapas e filtros. | Endpoint backend que retorna GeoJSON simplificado; cache por municipio/UF. |
| IBGE Agregados/SIDRA | Oficial/publica | Nao | Producao agricola municipal, area plantada, valor de producao. | Connector com tabelas parametrizadas; cache por ano/municipio/cultura. |
| SICAR WFS/WMS | Oficial/publica | Nao | CAR por codigo, ponto e mapa. | Ja existe; manter UF minuscula, retries, timeout e testes. |
| Banco Central SGS | Oficial/publica | Nao | Selic, IPCA/IGP-M se selecionados, simuladores financeiros. | Connector financeiro com series configuraveis e cache diario. |
| INMET Estacoes | Oficial/publica | Nao para dados basicos | Clima, chuva, risco operacional rural. | Connector com catalogo de estacoes + fallback por coordenada. |

### Prioridade 2: alto valor, exige revisao tecnica

| API | Tipo | Credencial | Valor | Observacao |
| --- | --- | --- | --- | --- |
| TerraBrasilis/INPE WMS | Oficial/publica | Nao | PRODES/alertas/desmatamento em mapa. | Teste OK, mas lento; usar cache de tiles/capabilities. |
| Acervo Fundiario/INCRA i3Geo | Oficial/publica/autenticada em parte | Pode exigir gov.br | SIGEF/SNCI/assentamentos/quilombolas. | O host antigo falha DNS. Precisa discovery por i3Geo e validacao legal de acesso. |
| MapBiomas | Publica/terceiro setor | Pode variar | Uso/cobertura do solo, historico de vegetacao. | WMS atual do codigo nao respondeu como WMS; melhor usar downloads/colecoes oficiais ou API/documentacao MapBiomas. |
| Dados abertos CNPJ Receita | Oficial/dataset | Nao | Proprietarios PJ, incorporadoras, compradores PJ. | Bulk mensal; nao e API real-time. Criar ETL local. |

### Prioridade 3: convenios/servicos pagos

| API | Tipo | Valor | Observacao |
| --- | --- | --- | --- |
| SNCR/INCRA via Conecta/Serpro | Oficial/convenio | CCIR, imovel rural, titularidade | Exige credencial/contrato. Nao tratar como publico sem token. |
| Receita/e-CAC/CND/ITR | Oficial/autenticada | CND e ITR | Fluxos oficiais tendem a exigir autenticacao/consulta humana ou convenio. |

## APIs recomendadas para o painel urbano

### Prioridade 1: quick wins publicos

| API | Tipo | Credencial | Valor para o produto | Implementacao |
| --- | --- | --- | --- | --- |
| ViaCEP | Publica gratuita | Nao | Autocomplete de endereco, bairro, cidade, UF e codigo IBGE. | Substituir `/api/urban/endereco/:cep` local por connector com fallback. |
| BrasilAPI CEP | Publica/open source | Nao | Fallback de CEP com coordenadas quando disponivel. | Fallback se ViaCEP falhar; cache por CEP. |
| IBGE Localidades | Oficial/publica | Nao | Validar municipio/UF/codigo IBGE. | Reutilizar connector rural. |
| IBGE Malhas | Oficial/publica | Nao | Mapa de cidade/bairro/regiao, filtros por municipio. | Reutilizar connector rural. |
| Banco Central SGS | Oficial/publica | Nao | Simulador de locacao, financiamento, reajuste, inadimplencia. | Connector financeiro. |
| Dados abertos CNPJ Receita | Oficial/dataset | Nao | Dados de locatario PJ, proprietario PJ e administradoras. | ETL mensal + busca local. |

### Prioridade 2: depende de municipio/parceiro

| API | Tipo | Valor | Observacao |
| --- | --- | --- | --- |
| IPTU municipal | Municipal/heterogenea | Valor venal, inscricao, debitos | Cada prefeitura tem padrao diferente. Comecar por cidades alvo. |
| GeoSampa/SP, dados urbanos municipais | Municipal/publica | Zoneamento, quadras, lotes, equipamentos | Implementar por cidade, com feature flags. |
| SINTER/CIB | Oficial/Receita | Cadastro imobiliario integrado | Verificar disponibilidade real de API e requisitos de acesso. |

### Prioridade 3: parceiros pagos

| API | Valor | Observacao |
| --- | --- | --- |
| InfoSimples/IPTU API/fornecedores municipais | IPTU, certidoes e consultas municipais | Usar somente se houver SLA e compliance LGPD. |
| APIs CNPJ comerciais | CNPJ em tempo quase real, QSA, risco | Evitar dados pessoais sensiveis sem base legal clara. |

## Plano de implementacao

### Fase 0 - Governanca de fontes

1. Criar enum `integration_source_type`: `official_public`, `official_authenticated`, `public_third_party`, `paid_partner`, `local_cache`, `simulated`.
2. Toda resposta de integracao deve retornar `source`, `sourceType`, `live`, `fetchedAt`, `cacheTtlSeconds`, `confidence` e `rawStatus`.
3. UI deve exibir selo: "Consulta publica", "Base local", "Requer credencial" ou "Simulado".

### Fase 1 - Conectores publicos base

1. Criar `server/services/publicApis/ibge.js`.
2. Criar `server/services/publicApis/cep.js` com ViaCEP + BrasilAPI fallback.
3. Criar `server/services/publicApis/bcb.js`.
4. Criar `server/services/publicApis/sicar.js` consolidando logica hoje espalhada.
5. Adicionar cache simples por tabela `public_api_cache` ou Redis/MinIO JSON.

### Fase 2 - Rotas internas novas

1. `GET /api/integrations/ibge/municipio/:codigo`.
2. `GET /api/integrations/ibge/malha/municipio/:codigo`.
3. `GET /api/integrations/cep/:cep`.
4. `GET /api/integrations/finance/series/:code/latest`.
5. `GET /api/integrations/rural/car/:uf/:codigo`.

Todas devem ter:

- timeout curto;
- retry limitado;
- cache;
- logs sem PII;
- testes unitarios com mocks;
- teste de contrato opcional, marcado como `integration`, fora da suite padrao.

### Fase 3 - Substituir simulacoes

1. Urbano: `/api/urban/endereco/:cep` passa a usar CEP connector.
2. Rural: `/api/rural/car/consultar/:codigo` usa connector consolidado.
3. Rural: `find-car-by-location` usa o mesmo connector e retorna fontes/cache.
4. Financeiro urbano/rural: simuladores usam BCB SGS.
5. Dashboards rurais: IBGE SIDRA/Agregados para producao municipal.

### Fase 4 - SIGEF/INCRA

1. Fazer discovery de temas no Acervo Fundiario/i3Geo.
2. Validar se WFS sem login e permitido para uso servidor-servidor.
3. Se exigir gov.br, tratar como `official_authenticated` e criar configuracao de credenciais/convênio.
4. Nao usar `geoinfo.incra.gov.br` como endpoint primario enquanto DNS falhar.

### Fase 5 - IPTU/zoneamento por cidade

1. Escolher 3 cidades prioritarias de clientes.
2. Mapear fontes oficiais municipais.
3. Criar adaptador por municipio: `iptuProvider`, `zoningProvider`.
4. Exibir coverage no painel: "cidade suportada / cidade nao suportada".
5. Para cidades sem API, manter fluxo manual/documental.

## Testes automatizados recomendados

1. Unitarios sem rede para cada connector, usando fixtures.
2. Contrato com rede real, opt-in via `RUN_PUBLIC_API_TESTS=true`.
3. Teste de timeout: API externa lenta deve retornar erro controlado.
4. Teste de cache: segunda chamada deve evitar rede.
5. Teste de origem: resposta nunca pode parecer "validada oficial" se for cache/local/simulada.

## Mudanca aplicada no codigo

Arquivo: `server/services/sicarService.js`

Antes:

```js
return `sicar:sicar_imoveis_${uf.toUpperCase()}`
```

Depois:

```js
return `sicar:sicar_imoveis_${uf.toLowerCase()}`
```

Validacao executada:

- `SicarService.getLayerName('PR')` retornou `sicar:sicar_imoveis_pr`.
- WFS com `sicar:sicar_imoveis_pr` retornou `HTTP 200` e `application/json`.
- `npm run test:whatsapp` validou testes e build do servico Go/WhatsMeow.

## Fontes pesquisadas

- IBGE Localidades: https://servicodados.ibge.gov.br/api/docs/localidades
- IBGE Malhas: https://servicodados.ibge.gov.br/api/docs/malhas?versao=3
- IBGE Agregados/SIDRA: https://servicodados.ibge.gov.br/api/docs/agregados?versao=3
- INMET Estacoes Automaticas: https://portal.inmet.gov.br/servicos/esta%C3%A7%C3%B5es-autom%C3%A1ticas
- Consulta Publica CAR/SICAR: https://consulta.car.gov.br/about
- SICAR GeoServer: https://geoserver.car.gov.br/geoserver/sicar/ows?service=WFS&request=GetCapabilities
- Acervo Fundiario/INCRA: https://acervofundiario.incra.gov.br/
- i3Geo OGC: https://acervofundiario.incra.gov.br/i3geo/documentacao/files/ogc-php.html
- ViaCEP: https://viacep.com.br/
- Banco Central SGS Selic: https://dadosabertos.bcb.gov.br/dataset/11-taxa-de-juros---selic
- Receita Federal CNPJ metadados: https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf
- BrasilAPI: https://brasilapi.com.br/docs
