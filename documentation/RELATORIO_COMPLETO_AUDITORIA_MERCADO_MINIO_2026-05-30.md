# Relatorio completo: auditoria tecnica, MinIO, produto rural/urbano e mercado

Data: 2026-05-30  
Sistema analisado: IMOBZY  
Escopo: frontend React/Vite, APIs Node/Express, servico Go de WhatsApp, worker Python/agro, SQL/migrations, storage MinIO/Supabase, funcoes rural e urbano.

## 1. Resumo executivo

O sistema esta em bom estado de compilacao no nucleo JS/TS: type-check, build, lint, testes Vitest e auditoria npm passaram. A plataforma ja tem uma proposta forte para imobiliarias urbanas e rurais: CRM, landing pages, importacao, WhatsApp, IA, BI, compliance, locacao, cobranca, geointeligencia rural e due diligence.

Os maiores riscos encontrados estao em quatro frentes:

1. Isolamento multi-tenant inconsistente em algumas telas e migrations antigas.
2. Migração para MinIO ainda incompleta ao redor de scripts legados, diagnosticos e modelo de URL publica.
3. Servico Go de WhatsApp nao validou localmente por falha de resolucao de pacotes/toolchain.
4. Algumas APIs rurais/urbanas ainda misturam dados reais com respostas simuladas, o que pode gerar falsa confianca operacional.

Prioridade maxima: corrigir RLS permissivo, tenant filters no frontend, sanitizacao SIGEF, consolidar storage MinIO e criar testes de contrato para upload/midia/tenant.

## 2. Validacoes executadas

| Validacao | Resultado | Observacao |
|---|---:|---|
| `npm run type-check` | OK | TypeScript sem erros. |
| `npm run build` | OK com warnings | Bundle grande, alerta `react-leaflet-draw`, `NODE_ENV` em `.env`. |
| `npm run lint` | OK | ESLint sem warnings, com `--max-warnings 0`. |
| `npm test -- --run` | OK | 6 arquivos, 29 testes passaram. |
| `npm audit --omit=dev` | OK | 0 vulnerabilidades encontradas. |
| `node --check server/index.js` | OK | Sintaxe do backend Node valida. |
| `go test ./...` em `whatsapp-service` | Falhou | `cannot find package` mesmo fora do sandbox; indica toolchain/modulos/cache/config local ou incompatibilidade de Go. |
| `npm run check-db` | Inconclusivo | Timeout mesmo fora do sandbox. O script nao aborta request apos timeout. |

## 3. Arquitetura observada

- Frontend: React 19, Vite 6, React Router, Supabase client direto em varias telas.
- Backend Node: Express 5, rotas modulares em `/api/*`, service role Supabase sob demanda.
- Storage: endpoint central `/api/storage/upload`, upload em memoria com Multer e assinatura S3 manual para MinIO.
- WhatsApp: servico Go com WhatsMeow, proxy Node autenticado, WebSocket tokenizado, armazenamento de sessoes SQLite em volume.
- Rural: APIs de CAR/SIGEF/SNCR/ITR, geoprocessamento, KMZ/PDF, busca por localizacao.
- Urbano: IPTU, endereco, zoneamento, CND, validacao documental, locacao, cobranca, empreendimentos, portais.
- Deploy: Docker Compose, Docker Swarm/Stack, Caddy/Nginx/Traefik, templates de env para MinIO.

## 4. Achados criticos

### A1. RLS permissivo em migrations antigas

Evidencia:

- `migrations/whatsapp_schema.sql`: policies `FOR ALL USING (true) WITH CHECK (true)` em `whatsapp_instances`, `whatsapp_contacts`, `whatsapp_chats`, `whatsapp_messages`.
- `migrations/20260516_ai_agents_whatsapp_automation.sql`: policies `FOR ALL USING (true) WITH CHECK (true)` em `ai_agents`, `lead_tags`, `lead_followups`.
- `documentation/DATABASE_MASTER.sql`: `Public read properties` com `USING (true)`.
- `sql/fix_niche_and_isolation.sql`: `Public Access to Properties` com `USING (true)`.

Impacto: se aplicadas em ambiente exposto pelo Supabase, essas policies podem permitir leitura/escrita ampla por roles nao previstas. Mesmo que o backend filtre por tenant, clientes maliciosos podem chamar a API REST do Supabase diretamente com anon/auth.

Recomendacao:

- Trocar `USING (true)` por isolamento por tenant, ou restringir explicitamente a `TO service_role` quando a tabela so for usada pelo backend.
- Criar migration de hardening consolidada e idempotente.
- Adicionar testes SQL/RLS automatizados para usuario A nao ler/escrever dados da organizacao B.

### A2. Dashboard urbano consulta dados sem `organization_id`

Evidencia:

- `views/UrbanDashboard.tsx` consulta `properties` e `leads` nas linhas 47, 53, 66, 74 e 79 sem filtro por `organization_id`.
- `views/RuralDashboard.tsx` filtra corretamente por `profile.organization_id`.

Impacto: se RLS estiver perfeita, o dano e limitado; se uma policy publica/permissiva estiver aplicada, o dashboard urbano pode misturar dados de tenants. Tambem prejudica metricas de superadmin/impersonation e confianca nos KPIs.

Recomendacao:

- Injetar `useAuth()` no UrbanDashboard e aplicar `.eq('organization_id', profile.organization_id)` em todas as queries.
- Preferir APIs backend ou RPCs tenant-aware para metricas.
- Criar teste cobrindo que dashboards so contam dados da organizacao atual.

### A3. Rota SIGEF aceita parametro nao sanitizado dentro de CQL

Evidencia:

- `server/api/rural/index.js`, rota `/api/rural/sigef/consultar/:codigo`.
- Linha 358 usa `const { codigo } = req.params`.
- Linha 359 monta URL com `cql_filter=cod_imovel='${codigo}'`.

Impacto: risco de injecao no CQL/WFS externo, erros inesperados e log pollution. A rota CAR sanitiza o codigo; SIGEF deveria seguir o mesmo padrao.

Recomendacao:

- Aplicar `sanitizeInput(req.params.codigo, 80).toUpperCase()`.
- Montar query com `URLSearchParams`.
- Usar `AbortSignal.timeout`.
- Tratar XML/ExceptionReport como ja foi feito na rota CAR.

### A4. Scripts e diagnosticos de imagem ainda apontam para Supabase Storage legado

Evidencia:

- `scripts/migrate_images.js`, `scripts/migrate_images_robust.js`, `scripts/diagnose_images.js`, `scripts/upload_scraped_json.js` ainda usam buckets `properties`, `property-images`, `agency-assets` via `supabase.storage`.
- `services/storage.ts` ja envia uploads pelo backend, mas scripts operacionais nao seguiram a mesma abstracao.

Impacto: apos migracao para MinIO, rotinas de importacao, diagnostico e correcao podem gravar imagens no provedor antigo, gerar URLs Supabase em novas propriedades ou deixar inventario quebrado.

Recomendacao:

- Criar um cliente unico de storage para scripts: `scripts/lib/storage-client.mjs`, com provider MinIO por padrao.
- Atualizar scripts legados para usar `/api/storage/upload` quando for fluxo autenticado, ou uma lib server-side MinIO quando for rotina administrativa.
- Criar job de reconciliacao: detectar URLs Supabase antigas em `properties.images`, baixar, regravar no MinIO e atualizar banco.

## 5. Achados altos

### B1. MinIO com URLs publicas exige decisao clara de privacidade

O backend retorna `publicUrl` em `server/lib/minio-storage.js`. Isso e bom para imagens publicas de imoveis, logos e landing pages. Porem documentos, midias de WhatsApp, contratos e dataroom podem conter dados pessoais e negociais.

Recomendacao:

- Separar buckets publicos e privados:
  - Publico: imagens comerciais, logos, assets de landing page.
  - Privado: documentos, contratos, WhatsApp, dataroom, exports e backups.
- Para privado, retornar URL assinada curta em vez de URL publica permanente.
- Definir lifecycle/retencao: WhatsApp e logs com prazo; backups com versionamento e politica de expurgo.

### B2. Upload sem whitelist de MIME/extensao

Evidencia:

- `server/api/storage/index.js` limita tamanho a 10 MB, mas aceita `file.mimetype || application/octet-stream`.
- Extensao vem de `originalname`, sem whitelist.

Impacto: arquivos HTML/SVG/script ou binarios inesperados podem ser hospedados em dominio de midia. Se o dominio tiver headers permissivos, existe risco de phishing/XSS/download malicioso.

Recomendacao:

- Whitelist por bucket: imagens (`jpeg/png/webp`), documentos (`pdf/docx` se necessario), WhatsApp por tipo suportado.
- Gerar extensao pela MIME validada, nao pelo nome enviado.
- Adicionar antivurus/scan assicrono para documentos e WhatsApp.

### B3. Servico Go/WhatsApp nao passou nos testes locais

Evidencia:

- `go test ./...` falhou com `cannot find package`.
- `whatsapp-service/go.mod` declara `go 1.25.0`.
- `Dockerfile.whatsapp` usa `golang:1.25-alpine`; `whatsapp-service/Dockerfile` usa `golang:1.23-alpine`.

Impacto: risco de pipeline inconsistente e deploy quebrar dependendo de qual Dockerfile for usado.

Recomendacao:

- Unificar Dockerfile do WhatsApp e versao Go.
- Fixar versao suportada e reproduzivel.
- Rodar `go test` e `go build` em CI dentro do container oficial.
- Remover Dockerfile duplicado ou documentar qual e fonte de verdade.

### B4. `npm run check-db` trava por timeout nao destrutivo

Evidencia:

- `scripts/check-db.mjs` usa `req.setTimeout(3000, () => resolve(false))`, mas nao chama `req.destroy()`.
- A execucao ficou presa ate o timeout externo.

Impacto: diagnostico de banco nao e confiavel em deploy ou suporte.

Recomendacao:

- Alterar timeout para destruir a request.
- Adicionar resumo por tabela com status HTTP e erro.
- Validar tambem migrations chave e RLS.

### B5. Texto com mojibake/encoding corrompido

Varias saidas e arquivos apresentam sequencias como `âŒ`, `ConfiguraÃ§Ã£o`, `NÃƒO`. Isso aparece em backend, frontend, SQL e scripts.

Impacto: experiencia visual degradada, dificuldade de suporte, logs ilegíveis e risco em comparacoes de status que dependem de string.

Recomendacao:

- Normalizar repositório para UTF-8.
- Rodar auditoria de encoding por extensao.
- Evitar status de negocio dependente de string acentuada; usar enums ASCII/codigos internos e labels na UI.

## 6. Achados medios

- Build gerou chunk principal de 752 kB minificado e `AreaChart` de 394 kB. Recomenda-se manual chunks para Recharts, Leaflet e editor visual.
- `PublicLandingPage` e importada dinamica e estaticamente, impedindo code-split efetivo.
- Dashboards rural/urbano ainda misturam KPIs reais com dados mockados (`change`, graficos, meta, due diligence).
- APIs urbanas de IPTU, zoneamento e CND retornam dados simulados ou instrutivos. A UI deve deixar claro o status de integracao.
- Migrations e scripts historicos competem entre si; ha varios arquivos `fix_*` com policies diferentes. Recomenda-se uma baseline oficial.
- Docker Stack usa `MINIO_ENDPOINT=http://minio:9000`, mas o stack nao declara servico MinIO. Pode ser intencional por rede externa, mas precisa estar documentado como dependencia.

## 7. Analise MinIO/storage

### Pontos positivos

- Upload do frontend foi centralizado em `/api/storage/upload`.
- Rota exige `verifyAuth` e `requireTenant`.
- Caminho do objeto inclui `req.orgId`, reduz colisao entre tenants.
- Fallback Supabase so ocorre se `MEDIA_STORAGE_PROVIDER=supabase` ou `ALLOW_SUPABASE_STORAGE_FALLBACK=true`.
- Node e Go compartilham a ideia de assinatura AWS SigV4 manual, sem depender do SDK.

### Lacunas

- Nao ha endpoint de delete/list/rename, nem reconciliacao de URLs antigas.
- Nao ha presigned GET para buckets privados.
- Nao ha validacao de MIME por bucket.
- Nao ha metadata padronizada (`tenant_id`, `entity_id`, `uploaded_by`, `source`).
- Nao ha testes de upload MinIO com container local.
- Scripts de importacao ainda gravam no Supabase Storage.

### Plano de consolidacao

1. Definir matriz de buckets:
  - `imobzycrm`: publico, imagens comerciais.
  - `imobzywhatsapp`: privado por padrao, URL assinada.
   - `imobzy-documents`: privado.
   - `imobzy-exports`: privado com expiracao.
   - `imobzy-backups`: privado, versionado, sem acesso app.
2. Criar `storage_objects` no banco para mapear bucket/path/provider/public_url/tenant/entity.
3. Criar testes integrados com MinIO local.
4. Migrar scripts legados e bloquear novo upload direto para Supabase.
5. Criar job de varredura para URLs `supabase.co/storage` em propriedades, textos e landing pages.

## 8. Funcionalidades rurais

### O que existe

- Dashboard rural.
- Cadastro tecnico.
- Geointeligencia/territorio.
- Busca CAR por localizacao.
- Due diligence.
- Dossie inteligente.
- BI rural.
- Portais de proprietario/comprador.
- Financeiro rural.
- Conexoes rural.
- Contratos, dataroom, WhatsApp, CRM e IA.
- APIs para CAR, SIGEF, SNCR, ITR, KMZ/PDF e geoprocessamento.

### Forca competitiva

O diferencial rural esta na combinacao de:

- CRM imobiliario + geodados + due diligence.
- CAR/SIGEF/KMZ como motor de confianca.
- Dossie e dataroom para venda de ativos complexos.
- Matchmaking com investidores.

Isso e mais defensavel que um CRM generico, porque o processo rural tem dor real: regularidade fundiaria, ambiental, documentacao, area, mapa, acesso, potencial produtivo e confianca do comprador.

### Melhorias prioritarias

1. Due diligence rural com score explicavel:
   - CAR encontrado/confiante.
   - SIGEF certificado.
   - CCIR/SNCR informado.
   - ITR/CAFIR/CNIR status.
   - sobreposicao com APP/RL/embargos/UC/TI/quilombola quando possivel.
2. Motor de comparaveis rurais:
   - preco por hectare, municipio, aptidao, logistica, bioma, cultura, area aberta.
3. Pipeline do negocio rural:
   - captacao, NDA, dataroom, diligencia, proposta, contrato, escritura.
4. Dossie exportavel:
   - PDF com mapa, resumo juridico, ficha tecnica, fotos, riscos e links publicos.
5. IA especializada:
   - "analista fundiario" para perguntas sobre documentos e inconsistencias.

## 9. Funcionalidades urbanas

### O que existe

- Dashboard urbano.
- Imoveis, empreendimentos, loteamentos.
- Locacao, cobranca, financeiro.
- Compliance urbano.
- Controle de chaves.
- Gestao de documentos.
- Portais de proprietario, comprador e locatario.
- Exportador de portais.
- CRM, Kanban, WhatsApp, landing pages, contratos e IA.

### Forca competitiva

O urbano tem amplitude operacional: venda, locacao, relacionamento, cobranca e canais. A oportunidade e transformar a plataforma em "sistema operacional" da imobiliaria, com automacao de atendimento e funil comercial mais forte que planilhas/CRM generico.

### Melhorias prioritarias

1. Corrigir tenant filters no dashboard urbano.
2. Separar claramente modulos de venda, locacao e incorporacao/loteamento.
3. Criar integracao real ou semiautomatizada para:
   - CEP/ViaCEP.
   - IPTU municipal por cidade/parceiro.
   - matricula/certidoes via fornecedores.
   - portais imobiliarios.
4. Automatizar locacao:
   - vencimentos, reajuste, repasse, inadimplencia, notificacoes.
5. Criar score de lead urbano:
   - origem, urgencia, ticket, financiamento, comportamento no site, resposta no WhatsApp.
6. Templates de landing page por nicho:
   - alto padrao, MCMV, lancamento, loteamento, locacao, comercial, rural.

## 10. Mercado: leitura estrategica

### Urbano

Fontes recentes apontam mercado imobiliario brasileiro resiliente apesar de juros altos. A CBIC reportou recordes em 2025: 453.005 unidades lancadas, VGL de R$ 292,3 bi e crescimento de vendas de 5,4% frente a 2024. No 1T26, o MCMV respondeu por 49% das vendas e 54.510 unidades vendidas, sustentando a demanda popular.

Leitura para IMOBZY:

- MCMV e medio padrao continuam importantes para volume; produto deve ter funis e paginas prontas para esse segmento.
- Incorporadoras, loteadoras e imobiliarias precisam de velocidade em captacao digital, atendimento WhatsApp e repasse de leads.
- Juros ainda pressionam conversao; simuladores, qualificacao financeira e follow-up automatizado viram diferencial.

Fontes:

- CBIC 4T25: https://cbic.org.br/mercado-imobiliario-fechou-quarto-trimestre-de-2025-com-recordes-em-lancamentos-e-vendas/
- CBIC 1T26: https://cbic.org.br/minha-casa-minha-vida-foi-responsavel-por-quase-metade-das-vendas-de-imoveis-no-primeiro-trimestre/
- CBIC Hub de Dados: https://cbic.org.br/hubdedados/?q=cimento
- Secovi-SP 2025: https://secovi.com.br/pesquisa-secovi-sp-do-mercado-imobiliario-dezembro-2025/
- ABECIP projecao credito 2026: https://www.abecip.org.br/imprensa/noticias/financiamento-imobiliario-deve-crescer-16-em-2026-projeta-abecip-valor-economico

### Rural/agro

O agro segue relevante e com dados favoraveis. CNA/Cepea indicam PIB do agronegocio de R$ 3,20 trilhoes em 2025, alta de 12,2%. O Incra lancou o Atlas do Mercado de Terras 2025 para consolidar dados de precos de terras rurais.

Leitura para IMOBZY:

- O ativo rural esta cada vez mais financeiro e tecnico; comprador quer dados, risco, produtividade e regularidade.
- Um CRM rural generico nao basta. O diferencial e dossie confiavel, mapa, documentacao e comparaveis.
- Ha oportunidade em fazendas, areas produtivas, pecuaria, reflorestamento, carbono, arrendamento e investidores patrimoniais.

Fontes:

- CNA/Cepea PIB agro 2025: https://cnabrasil.org.br/noticias/cna-e-cepea-apontam-crescimento-de-12-2-do-pib-do-agronegocio-em-2025
- Incra Atlas do Mercado de Terras 2025: https://www.gov.br/incra/pt-br/assuntos/noticias/incra-lanca-atlas-do-mercado-de-terras-2025
- Atlas PDF: https://www.gov.br/incra/pt-br/centrais-de-conteudos/publicacoes/Atlas_do_Mercado_de_Terras_2025.pdf

## 11. Roadmap recomendado

### 0 a 15 dias: estabilizacao

1. Corrigir policies permissivas de RLS.
2. Corrigir tenant filters no UrbanDashboard e telas semelhantes.
3. Sanitizar rota SIGEF.
4. Corrigir `scripts/check-db.mjs`.
5. Unificar Dockerfile/Go do WhatsApp.
6. Criar checklist de MinIO: buckets, public/private, CORS, lifecycle, backup, health.

### 15 a 45 dias: consolidacao MinIO e confianca

1. Migrar scripts legados de imagem para MinIO.
2. Criar reconciliador de URLs Supabase antigas.
3. Adicionar whitelist MIME e URLs assinadas para buckets privados.
4. Criar testes integrados de upload, WhatsApp media e acesso privado.
5. Normalizar encoding UTF-8.

### 45 a 90 dias: evolucao produto

1. Rural: score de due diligence e dossie PDF completo.
2. Urbano: locacao/cobranca com automacoes reais.
3. CRM: score de lead e SLA de atendimento WhatsApp.
4. Landing pages: templates por nicho e tracking por origem.
5. BI: metricas reais por tenant com RPCs seguras.

### 90+ dias: vantagem competitiva

1. Data room com permissao por comprador e trilha de auditoria.
2. Marketplace de integracoes: portais, certidoes, assinatura digital, credito.
3. Motor de comparaveis urbano/rural.
4. Agentes IA por funcao: captador, atendente, analista documental, closer.
5. Produto rural premium para grandes ativos: NDA, dossie, mapa, valuation e pipeline de investidores.

## 12. Indicadores de sucesso sugeridos

- Tempo medio ate primeiro atendimento de lead.
- Taxa de resposta WhatsApp em ate 5 minutos.
- Conversao lead -> visita -> proposta -> fechamento.
- Percentual de imoveis com documentacao completa.
- Percentual de imoveis com imagens migradas para MinIO.
- Percentual de objetos privados servidos por URL assinada.
- Tempo de geracao de dossie rural.
- Numero de leads por landing page e custo por lead.
- Erros 4xx/5xx por rota critica.
- Incidentes de tenant isolation: meta zero.

## 13. Conclusao

O IMOBZY tem base funcional ampla e uma direcao de produto promissora. A migracao para MinIO esta bem encaminhada no fluxo principal de upload, mas ainda precisa virar padrao em scripts, diagnosticos, politicas de privacidade e testes.

A maior oportunidade estrategica esta em assumir uma tese clara: urbano como sistema operacional comercial/locacao para imobiliarias; rural como plataforma de confianca, diligencia e inteligencia de ativos. Corrigindo isolamento, storage e confiabilidade das integracoes, a plataforma fica pronta para evoluir de CRM completo para produto vertical forte.
