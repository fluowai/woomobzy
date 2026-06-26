# Planejamento - Valuation Rural Pos-CAR

Data: 26/06/2026

Objetivo: criar uma esteira rural em que, apos cadastrar ou localizar um CAR, o IMOBZY consiga puxar automaticamente tudo que for possivel sobre o imovel, enriquecer o cadastro, calcular valuation e gerar um dossie/laudo rural.

## 1. Visao do fluxo desejado

Fluxo principal:

1. Usuario informa um codigo CAR ou cola uma localizacao/link do Google Maps.
2. Sistema consulta o SICAR/CAR e encontra o imovel rural.
3. Usuario cria ou vincula o CAR a uma propriedade existente.
4. Sistema salva:
   - codigo CAR;
   - area declarada;
   - municipio;
   - UF;
   - geometria/perimetro;
   - fonte da consulta;
   - nivel de confianca.
5. Sistema roda enriquecimento rural automatico.
6. Sistema calcula valuation rural.
7. Sistema gera dossie/laudo rural com mapas, indicadores, pendencias e valor referencial.

Resultado esperado:

O usuario nao deve precisar preencher manualmente todos os campos tecnicos. O CAR deve ser a chave para iniciar a inteligencia rural.

## 2. O que ja existe hoje

### Frontend

- `views/rural/CARLocationSearch.tsx`
  - busca CAR por link/localizacao/coordenadas;
  - mostra candidatos encontrados;
  - mostra geometria no mapa;
  - cria propriedade a partir de um CAR encontrado;
  - salva `carNumber`, area, municipio, UF e geometria.

- `views/rural/Geointeligencia.tsx`
  - mapa rural com Leaflet;
  - camadas SIGEF, CAR, MapBiomas e PRODES;
  - desenho/importacao de poligonos;
  - calculo de area;
  - salvamento da geometria na propriedade;
  - consulta CAR e SIGEF por codigo.

- `views/rural/CadastroTecnico.tsx`
  - importa KML, KMZ e GeoJSON;
  - salva dados tecnicos em `features.rural_technical`;
  - campos de bioma, solo, regime hidrico, topografia, aptidao, area agricultavel, reserva e score.

- `views/rural/DueDiligence.tsx`
  - checklist rural fundiario e ambiental;
  - validacao de CAR, CCIR/SNCR, SIGEF/GEO e ITR;
  - score de risco.

- `views/rural/DossieInteligente.tsx`
  - seleciona propriedade rural;
  - mostra validacao tecnica;
  - mostra valor por hectare quando existe preco e area;
  - baixa PDF via API.

### Backend

- `server/api/rural/index.js`
  - `/api/rural/car/consultar/:codigo`;
  - `/api/rural/find-car-by-location`;
  - `/api/rural/sigef/consultar/:codigo`;
  - `/api/rural/validar/:propertyId`;
  - `/api/rural/dossier/:propertyId/pdf`;
  - `/api/rural/market/prices`.

### Conclusao do estado atual

O sistema ja tem as pecas principais, mas elas ainda nao formam uma esteira automatica de valuation. Hoje o CAR cria ou alimenta o imovel, mas ainda falta um motor que, depois disso, busque indicadores, salve enriquecimento e gere um valuation estruturado.

## 3. Estrutura de dados proposta

Criar campos padronizados dentro de `features`:

### `features.rural_enrichment`

Dados puxados automaticamente:

- `source_car`
- `car_number`
- `car_status`
- `declared_area_ha`
- `measured_area_ha`
- `centroid`
- `bounds`
- `municipality`
- `state`
- `geometry`
- `satellite_snapshot_url`
- `land_use`
- `environmental`
- `soil`
- `terrain`
- `water`
- `logistics`
- `sigef`
- `market`
- `updated_at`

### `features.rural_valuation`

Resultado do valuation:

- `valuation_date`
- `method`
- `area_ha`
- `price_per_ha_min`
- `price_per_ha_avg`
- `price_per_ha_max`
- `total_value_min`
- `total_value_avg`
- `total_value_max`
- `price_per_alqueire_sp`
- `price_per_alqueire_mg`
- `vtn_reference`
- `confidence_score`
- `drivers`
- `risks`
- `sources`
- `updated_at`

## 4. MVP - Primeira entrega

Objetivo: entregar valor rapido usando o que o sistema ja possui.

### Escopo

1. Criar botao "Puxar Valuation pelo CAR".
2. Ao clicar, rodar uma nova API:
   - `POST /api/rural/enrich/:propertyId`
   - `POST /api/rural/valuation/:propertyId`
3. Usar dados ja disponiveis:
   - CAR;
   - geometria;
   - area;
   - municipio/UF;
   - preco cadastrado;
   - comparaveis internos;
   - cadastro tecnico, se existir;
   - due diligence, se existir.
4. Calcular:
   - area medida;
   - valor por hectare cadastrado;
   - media de comparaveis internos por municipio/UF/tipo;
   - intervalo minimo, medio e maximo;
   - nivel de confianca;
   - principais riscos e pendencias.
5. Persistir resultado em `features.rural_valuation`.
6. Melhorar o PDF atual do dossie rural para incluir:
   - resumo CAR;
   - mapa/perimetro;
   - area;
   - cadastro tecnico;
   - due diligence;
   - valuation minimo/medio/maximo;
   - valor por hectare;
   - disclaimer.

### Criterios de aceite

- Usuario cadastra ou localiza um CAR.
- Sistema cria/vincula propriedade.
- Usuario clica em "Puxar Valuation pelo CAR".
- Sistema salva enriquecimento e valuation.
- Dossie PDF passa a exibir valuation rural.
- Se faltar dado, o sistema mostra pendencias claras em vez de quebrar.

## 5. Fase 2 - MapBiomas, PRODES, solo, declividade, hidrografia e logistica

Esta fase deve entrar depois do MVP, mas ja deve ser prevista no desenho do backend.

### 5.1 MapBiomas - uso e cobertura do solo

Objetivo: classificar o uso do solo dentro do poligono do CAR.

Dados desejados:

- agricultura;
- pastagem;
- mosaico agropecuario;
- formacao florestal;
- formacao savanica;
- corpos d'agua;
- area nao vegetada;
- historico de mudanca de uso.

Uso no valuation:

- aumentar confianca quando houver area produtiva consolidada;
- identificar potencial produtivo;
- gerar tabela de uso do solo;
- destacar areas naturais e restricoes.

### 5.2 PRODES/DETER - alertas ambientais

Objetivo: identificar risco ambiental associado ao imovel.

Dados desejados:

- alertas de desmatamento;
- data do alerta;
- area afetada;
- sobreposicao com o perimetro;
- classificacao de risco ambiental.

Uso no valuation:

- reduzir score de confianca se houver alerta recente;
- gerar pendencias ambientais;
- destacar risco no dossie.

### 5.3 Solo

Objetivo: enriquecer o cadastro tecnico com classe de solo e textura.

Dados desejados:

- classe predominante de solo;
- textura;
- teor de argila estimado;
- aptidao agricola;
- limitacoes produtivas.

Uso no valuation:

- ajustar valor por hectare;
- qualificar potencial agricola;
- compor score tecnico.

### 5.4 Declividade e altitude

Objetivo: medir relevo e dificuldade operacional.

Dados desejados:

- altitude media;
- altitude minima e maxima;
- declividade media;
- faixas de declividade;
- percentual plano, ondulado e forte ondulado.

Uso no valuation:

- aumentar valor em area plana/mecanizavel;
- reduzir valor em area muito inclinada;
- identificar aptidao para agricultura, pecuaria ou preservacao.

### 5.5 Hidrografia

Objetivo: identificar recursos hidricos e possiveis restricoes.

Dados desejados:

- rios;
- corregos;
- nascentes;
- represas;
- distancia ate agua;
- possiveis APPs;
- necessidade de outorga.

Uso no valuation:

- aumentar atratividade quando houver boa disponibilidade hidrica;
- gerar alertas de APP/outorga;
- enriquecer dossie tecnico.

### 5.6 Logistica

Objetivo: medir acesso e liquidez do ativo.

Dados desejados:

- distancia ate cidade;
- distancia ate rodovia;
- distancia ate armazem/cooperativa;
- distancia ate porto ou terminal relevante;
- tempo estimado de deslocamento;
- qualidade estimada de acesso.

Uso no valuation:

- ajustar score de liquidez;
- justificar valor por hectare;
- mostrar diferenciais comerciais no dossie.

## 6. Fase 3 - Laudo Quick Valuation Rural

Objetivo: transformar o PDF atual em um laudo proximo ao modelo analisado.

Secoes do laudo:

1. Capa.
2. Metodologia.
3. Informacoes preliminares do imovel.
4. Imagem de satelite e perimetro.
5. Localizacao.
6. Logistica.
7. Clima e precipitacao.
8. Hidrografia.
9. Areas protegidas e restricoes.
10. Bioma e reserva legal.
11. Altitude.
12. Declividade.
13. Solos.
14. Uso e ocupacao do solo.
15. Vetor do agronegocio.
16. Valor da Terra Nua / VTN.
17. Valuation minimo, medio e maximo.
18. Riscos e pendencias.
19. Disclaimer.

## 7. Fase 4 - Interface de usuario

Melhorias nas telas:

- Em `CARLocationSearch`:
  - apos criar propriedade, oferecer "Puxar valuation agora";
  - mostrar progresso do enriquecimento.

- Em `DossieInteligente`:
  - adicionar botao "Atualizar valuation";
  - mostrar data da ultima analise;
  - mostrar score de confianca;
  - mostrar pendencias que impedem valuation melhor.

- Em `Geointeligencia`:
  - mostrar camadas enriquecidas por propriedade;
  - mostrar uso do solo e restricoes como cards;
  - permitir atualizar analise territorial.

- Em `PropertyEditor`:
  - mostrar bloco "Inteligencia Rural";
  - mostrar valor/ha, VTN, score tecnico e score documental.

## 8. Ordem recomendada de execucao

1. Criar schema `rural_enrichment` e `rural_valuation`.
2. Criar API `POST /api/rural/enrich/:propertyId`.
3. Criar API `POST /api/rural/valuation/:propertyId`.
4. Integrar botao no fluxo do CAR.
5. Persistir resultado em `features`.
6. Melhorar PDF do dossie.
7. Adicionar historico/data da ultima analise.
8. Implementar MapBiomas.
9. Implementar PRODES/DETER.
10. Implementar solo.
11. Implementar declividade/altitude.
12. Implementar hidrografia.
13. Implementar logistica.
14. Refinar modelo de valuation com pesos.

## 9. Modelo inicial de pesos para valuation

Modelo simples para MVP:

- Comparaveis internos: 40%
- Area e escala do imovel: 15%
- Localizacao/logistica manual ou basica: 15%
- Cadastro tecnico: 10%
- Documentacao/due diligence: 10%
- Liquidez/status comercial: 10%

Modelo evoluido:

- Comparaveis internos e mercado regional: 30%
- Uso do solo MapBiomas: 15%
- Solo/aptidao produtiva: 15%
- Declividade/altitude: 10%
- Hidrografia: 10%
- Logistica: 10%
- Documentacao e risco ambiental: 10%

## 10. Riscos e cuidados

- Valuation deve ser apresentado como valor referencial, nao avaliacao oficial.
- O PDF deve ter disclaimer juridico e tecnico.
- Fontes externas podem falhar; salvar data, fonte e status da consulta.
- CAR pode ter geometria divergente da matricula ou SIGEF.
- VTN municipal nao equivale automaticamente a valor de mercado.
- O sistema deve mostrar confianca do valuation e pendencias de dados.

## 11. Entrega ideal

A entrega ideal para o usuario final e:

1. Informar CAR.
2. Ver imovel aparecer no mapa.
3. Clicar em "Puxar valuation".
4. Aguardar enriquecimento.
5. Ver cards com area, uso, solo, documentacao, risco e valor estimado.
6. Baixar um laudo rural completo em PDF.

