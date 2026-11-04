# Analise Completa para Migracao do ImobFlow -> WooTech Imob

Data: 2026-07-12

## Resumo executivo

O repositorio atual nao esta organizado para separar claramente o painel administrativo do dominio publico dos clientes. Hoje o sistema mistura:

- dominio da plataforma antiga (`app.imobfluow.com.br`, `imobfluow.com.br`, `imobfluow.consultio.com.br`);
- dominios publicos de clientes (`okaimoveis.com.br`, `fazendasbrasil.com(.br)`);
- logica multi-tenant por `organization_id`, `slug`, `custom_domain`, tabela `domains`, headers de impersonacao e metadata JWT.

O resultado e que a migracao para `WooTech Imob` nao sera apenas um rebrand. Ela exige separar explicitamente:

- host do painel administrativo;
- host/dominios dos sites publicos;
- branding da plataforma;
- branding por cliente;
- callbacks/autenticacao por ambiente;
- regras de roteamento no frontend, backend, Traefik e CI/CD.

O codigo ja possui uma base multi-tenant aproveitavel, principalmente via `organization_id`, `site_settings`, `sites`, `site_pages`, `domains` e middlewares de auth/tenant. Porem, o painel ainda aceita e/ou pressupoe hosts de clientes em varios pontos, e a marca antiga aparece em assets, PWA, login, manifests, PDFs, pipelines e configuracoes de infraestrutura.

## Problemas encontrados

### 1. Painel e site publico ainda compartilham a mesma borda

Evidencias:

- `App.tsx` redireciona `app.imobfluow.com.br` para `/login`.
- `components/DomainRouter.tsx` decide entre painel e site publico em runtime, com base no `hostname` e no `pathname`.
- `server/lib/cors-config.js` permite tanto dominios da plataforma quanto dominios customizados de clientes.
- `portainer-stack.yml`, `portainer-stack-pronta-corrigida.yml`, `portainer-stack-fazendasbrasil-pronta.yml` e variantes encaminham frontend e API para hosts de clientes e host da plataforma antiga ao mesmo tempo.

Impacto:

- o painel nao esta isolado em um dominio unico da marca WooTech;
- qualquer mudanca de dominio do painel impacta roteamento, CORS, CSP, proxies, SEO e autenticacao.

### 2. Branding legado fortemente espalhado

Evidencias:

- `vite.config.ts` define PWA com nome, atalhos e icones `IMOBFLUOW`.
- `index.html` usa `title`, `application-name`, `apple-mobile-web-app-title` e favicon da marca antiga.
- `public/logo-imobfluow.*` e `public/icons/imobfluow-*`.
- `views/Login.tsx` exibe logo, nome e copyright `ImobFluow`.
- `utils/platform.ts` fixa `BRAND_NAME = 'ImobFluow'` e `PLATFORM_DOMAIN = 'imobfluow.com.br'`.
- `server/services/contractGenerationService.js` grava metadata PDF com `Creator: 'ImobFluow - Gestao de Locacao'`.
- `server/api/rural/pdf.routes.js` usa fallback `IMOBZY Rural`, ou seja, ha mistura de marcas no mesmo produto.

Impacto:

- a troca para `WooTech Imob` exige revisao de frontend, backend, ativos, PWA, documentos e processos operacionais;
- o ambiente atual revela marca antiga e, em alguns pontos, marca mista.

### 3. Multi-tenant esta funcional, mas excessivamente distribuido

Resolucao de tenant identificada no codigo:

- `profiles.organization_id` no `context/AuthContext.tsx`;
- `req.orgId` resolvido em `server/middleware/auth.js`;
- validacao complementar em `server/middleware/tenant.js`;
- `organizations.custom_domain` e tabela `domains`;
- `slug` em `components/DomainRouter.tsx`, `server/api/tenant/index.js`, `server/api/sites/index.js`;
- `x-organization-id` e `x-impersonate-org-id` em `src/lib/api.ts` e `services/supabase.ts`;
- `organization_id` em metadata JWT e politicas SQL (`sql/fix_rls_final.sql`, `sql/rls_hardening.sql`, migrations de hardening).

Impacto:

- ha boa base para SaaS multi-tenant;
- porem a regra de verdade do tenant esta espalhada entre navegador, Supabase, backend, tabelas, headers e hostnames.

### 4. Dominios customizados do cliente ainda influenciam o painel

Evidencias:

- `components/DomainRouter.tsx` trata hosts customizados como publico, mas ainda depende do mesmo bundle/app.
- `server/lib/cors-config.js` aceita dinamicamente origens vindas de `organizations.custom_domain` e `domains`.
- stacks Traefik publicam `/api` e frontend para os mesmos hosts de cliente.
- `server/routes/domains.js` e `server/domainService.js` provisionam host customizado com rotas para frontend e API.

Impacto:

- o objetivo novo de forcar o painel em `imob.wootech.com.br` conflita com a arquitetura atual;
- sem separacao, o cliente pode continuar acessando endpoints administrativos no dominio publico.

### 5. Fluxo de autenticacao depende mais de Bearer token e storage do que de cookies do app

Evidencias:

- `context/AuthContext.tsx` usa `supabase.auth.onAuthStateChange`, `signInWithPassword`, `signOut`, `refreshSession`.
- `src/lib/api.ts` injeta `Authorization: Bearer ...` em chamadas para `/api`.
- `services/supabase.ts` usa storage do Supabase e `storageKey` dedicado para cliente publico.
- nao foi encontrada implementacao propria de `Set-Cookie` no backend Express.

Impacto:

- a troca de dominio do painel afeta menos cookies proprios do backend e mais:
  - sessao Supabase;
  - callbacks do Supabase;
  - persistencia em `localStorage` e `sessionStorage`;
  - origens autorizadas de auth e APIs.

### 6. Existem links e rotas incompletos no auth

Evidencias:

- `views/Login.tsx` aponta para `/forgot-password`.
- `App.tsx` nao registra rota para `/forgot-password`.
- nao foram localizadas rotas claras para:
  - confirmacao de email;
  - reset de senha;
  - callback de recuperacao;
  - logout dedicado por URL.

Impacto:

- a migracao de dominio e oportunidade para fechar lacunas de auth;
- hoje ha risco de links quebrados ou dependencia de fluxo externo do Supabase sem pagina dedicada.

### 7. SEO existe no nivel de pagina, mas nao como stack completa

Evidencias:

- `components/LandingPageEditor/SEOSettings.tsx` edita `metaTitle`, `metaDescription`, `metaKeywords`, `ogImage`.
- `server/api/sites/index.js` persiste `meta_title`, `meta_description`, `meta_keywords`, `og_image`.
- `index.html` contem apenas metadados estaticos do produto.
- nao foram encontrados `robots.txt` e `sitemap.xml` funcionais no projeto.
- nao foram encontradas evidencias de canonical dinamico por pagina publica.

Impacto:

- os sites publicos podem perder SEO se a migracao alterar hostnames sem plano de canonical, sitemap e redirects;
- a infraestrutura atual prioriza renderizacao SPA, nao SEO multi-site robusto.

### 8. Infraestrutura e pipelines continuam nomeando e publicando a marca antiga

Evidencias:

- `.env`, `.env.production`, `.env.production.template` usam `imobfluow`.
- `docker-compose.yml` usa defaults `app.imobfluow.com.br` e `imobfluow.com.br`.
- `.github/workflows/docker-images.yml` ainda builda com `VITE_PANEL_URL=https://imobfluow.consultio.com.br`.
- `server/directAdminService.js` e `server/domainService.js` usam `WHM_MAIN_DOMAIN` com fallback `imobfluow.com.br`.
- redes/servicos Traefik usam nomes `imobfluow_*`.

Impacto:

- a migracao de branding e dominio exige revisao de deploy, stacks, webhooks, verificacoes de saude e assets publicados.

## Riscos

1. Risco alto de o painel continuar acessivel via dominio publico do cliente se a borda Traefik nao for redesenhada.
2. Risco alto de regressao de auth se callbacks/origens do Supabase nao forem atualizados junto com os novos hosts.
3. Risco alto de inconsistencias de marca porque o produto mistura `ImobFluow`, `Imobzy` e branding por imobiliaria.
4. Risco medio de quebra de SEO nos sites publicos por falta de canonical, sitemap e plano formal de redirects.
5. Risco medio de links quebrados em login/recuperacao de senha, pois ha sinais de fluxo incompleto.
6. Risco medio de falhas operacionais em CI/CD, Portainer e Traefik por nomes antigos hardcoded.
7. Risco medio de vazamento de contexto de tenant se a simplificacao da arquitetura nao preservar as regras atuais de `organization_id`, impersonacao e RLS.

## Impactos

### Frontend

- roteamento principal;
- PWA e manifest;
- login e experiencia inicial;
- links absolutos baseados em `window.location.origin`;
- componentes de SEO;
- layouts que exibem marca do produto.

### Backend

- middlewares de auth/tenant;
- resolucao de tenant por dominio/slug;
- listas de CORS e CSP;
- provisionamento de dominios;
- endpoints publicos de sites e quiz;
- geracao de PDFs e contratos.

### Banco

- `organizations`;
- `profiles`;
- `domains`;
- `site_settings`;
- `sites`;
- `site_pages`;
- politicas RLS baseadas em `organization_id`;
- dados historicos de branding e dominio.

### Infra

- Docker Compose;
- Portainer;
- Traefik;
- GitHub Actions;
- runtime envs;
- health checks e validacoes de deploy.

## Lista completa de arquivos afetados

### Branding e dominio da plataforma

- `App.tsx`
- `index.html`
- `vite.config.ts`
- `utils/platform.ts`
- `constants.tsx`
- `views/Login.tsx`
- `public/manifest.webmanifest`
- `public/logo-imobfluow.png`
- `public/logo-imobfluow.svg`
- `public/icons/imobfluow-192x192.png`
- `public/icons/imobfluow-512x512.png`
- `public/icons/imobfluow-mark.svg`

### Roteamento e experiencia publico x painel

- `components/DomainRouter.tsx`
- `components/ProtectedRoute.tsx`
- `components/PanelGuard.tsx`
- `components/NicheRedirect.tsx`
- `views/PublicSite.tsx`
- `views/PublicLandingPage.tsx`
- `views/LandingPage.tsx`
- `views/SystemSalesPage.tsx`

### Auth, tenant e chamadas API

- `context/AuthContext.tsx`
- `context/SettingsContext.tsx`
- `services/supabase.ts`
- `src/lib/api.ts`
- `server/middleware/auth.js`
- `server/middleware/tenant.js`
- `server/api/tenant/index.js`
- `server/lib/cors-config.js`
- `server/index.js`

### Dominios customizados e publicacao

- `server/routes/domains.js`
- `server/domainService.js`
- `server/directAdminService.js`
- `server/api/sites/index.js`
- `server/api/contact.js`

### PDFs, documentos e materiais gerados

- `server/api/rural/pdf.routes.js`
- `server/api/rural/analysis/service.js`
- `server/services/contractGenerationService.js`
- `server/api/documents/index.js`
- `src/components/lease/steps/StepContractGeneration.tsx`
- `src/components/lease/templates/TemplateEditor.tsx`
- `src/components/lease/templates/TemplateList.tsx`

### SEO e paginas publicas

- `components/LandingPageEditor/SEOSettings.tsx`
- `server/api/sites/index.js`
- `public/.htaccess`
- `public/_redirects`

### Infraestrutura e deploy

- `.env`
- `.env.production`
- `.env.production.template`
- `docker-compose.yml`
- `docker-compose.local.yml`
- `portainer-stack.yml`
- `portainer-stack-pronta-corrigida.yml`
- `portainer-stack-fazendasbrasil-pronta.yml`
- `portainer-stack-imobfluow-filled.yml`
- `portainer-stack-imobfluow-flat-filled.yml`
- `.github/workflows/docker-images.yml`
- `docker/nginx/frontend.conf`

### Banco e migracoes relacionadas

- `sql/definitive_imobzy_schema.sql`
- `sql/setup_site_builder.sql`
- `sql/rls_hardening.sql`
- `sql/fix_rls_final.sql`
- `migrations/20260520_site_settings_schema_alignment.sql`
- `migrations/20260604_email_center.sql`
- `migrations/20260612_quiz_campaigns.sql`
- `migrations/20260612_quiz_public_rpc.sql`
- `migrations/20260614_quiz_multi_niche_rural.sql`
- migracoes que consolidam `organization_id`, `tenant_id`, `custom_domain` e branding

## Lista completa de componentes afetados

- `DomainRouter`
- `AuthProvider`
- `SettingsProvider`
- `Login`
- `ProtectedRoute`
- `PanelGuard`
- `RuralLayout`
- `UrbanLayout`
- `SuperAdminLayout`
- `PublicSite`
- `PublicLandingPage`
- `SystemSalesPage`
- `LandingPageEditor/SEOSettings`
- `TenantManager`
- `WhatsAppDashboard` e hooks de API tenant-aware
- componentes de templates e contratos em `src/components/lease/*`

## Checklist de migracao

- [ ] Definir host oficial do painel: `imob.wootech.com.br` ou `app.wootech.com.br/imob`
- [ ] Definir host oficial da API de plataforma
- [ ] Separar trafego do painel e trafego publico por router/host
- [ ] Atualizar runtime envs e defaults de deploy
- [ ] Atualizar listas de CORS e CSP
- [ ] Revisar callbacks/autorizacoes do Supabase
- [ ] Validar headers de tenant e impersonacao no novo host
- [ ] Revisar todos os links absolutos e `window.location.origin`
- [ ] Atualizar PWA, manifest e assets
- [ ] Revisar geracao de PDFs, contratos e documentos
- [ ] Revisar e-mails transacionais e links
- [ ] Mapear redirects permanentes e estrategia de compatibilidade
- [ ] Criar homologacao com dominios reais
- [ ] Migrar clientes em ondas controladas

## Checklist de identidade visual

- [ ] Nome do produto em `title`, meta tags e manifest
- [ ] Favicon
- [ ] Logos do painel
- [ ] Loading/splash
- [ ] Login
- [ ] Menu lateral e headers
- [ ] Dashboard inicial
- [ ] PDFs e contratos
- [ ] E-mails
- [ ] atalhos PWA
- [ ] mensagens de copyright
- [ ] textos institucionais de landing/sales page

## Checklist de branding

- [ ] Marca principal: `WooTech`
- [ ] Produto: `Imob`
- [ ] Nome comercial: `WooTech Imob`
- [ ] Definir quando exibir `WooTech Imob`
- [ ] Definir quando exibir apenas a marca do cliente
- [ ] Remover `ImobFluow`
- [ ] Eliminar mistura `ImobFluow` x `Imobzy`
- [ ] Garantir white label nos sites publicos, PDFs e materiais configuraveis

## Checklist de infraestrutura

- [ ] Atualizar `APP_DOMAIN`, `APP_URL`, `PUBLIC_APP_URL`, `VITE_PANEL_URL`
- [ ] Revisar `ALLOWED_ORIGINS` e `CORS_ORIGINS`
- [ ] Atualizar nomes de servicos e aliases em Traefik
- [ ] Criar routers separados para painel e publico
- [ ] Revisar certificados e `letsencrypt`
- [ ] Revisar health checks no GitHub Actions
- [ ] Revisar webhooks Portainer
- [ ] Revisar `WHM_MAIN_DOMAIN` e servicos de provisionamento
- [ ] Validar Nginx/SPA fallback por host

## Plano de execucao detalhado

### Fase 1. Levantamento e congelamento

- congelar novos hardcodes de dominio/marca;
- criar inventario de hosts atuais;
- definir arquitetura-alvo oficial:
  - painel;
  - API;
  - sites publicos;
  - landing pages;
  - callbacks auth.

### Fase 2. Introducao de configuracao central

- criar modulo central de branding da plataforma;
- criar modulo central de hostnames:
  - `PANEL_HOST`;
  - `PUBLIC_PLATFORM_HOST`;
  - `API_HOST`;
  - `LEGACY_HOSTS`;
  - `CLIENT_PUBLIC_DOMAINS_ENABLED`.
- substituir hardcodes em frontend, backend e deploy.

### Fase 3. Separacao de borda

- Traefik:
  - painel apenas em host WooTech;
  - dominios de cliente apenas para publico;
  - API publica com estrategia clara.
- remover possibilidade de servir painel administrativo por dominio customizado do cliente.

### Fase 4. Refatoracao de roteamento

- simplificar `DomainRouter`;
- tratar painel e publico como modos explicitos;
- manter `/:slug/site` apenas como compatibilidade temporaria;
- remover redirecionamentos acoplados a `imobfluow`.

### Fase 5. Auth e compatibilidade

- cadastrar novos redirect URLs no Supabase;
- validar login, refresh, logout, impersonacao e APIs protegidas;
- implementar paginas faltantes de `forgot-password`, confirmacao e recovery;
- garantir que `sessionStorage`/`localStorage` nao causem conflito entre dominios.

### Fase 6. Rebrand completo

- atualizar assets, manifest e metadados;
- atualizar login, dashboards e sales pages;
- atualizar PDFs, contratos e documentos gerados;
- atualizar e-mails e textos institucionais.

### Fase 7. SEO e publico

- manter dominios publicos dos clientes;
- gerar canonical por pagina;
- gerar `robots.txt` e `sitemap.xml` por site publico;
- planejar redirects 301 apenas onde houver mudanca de URL publica.

### Fase 8. Migracao de clientes

- migrar primeiro clientes internos/piloto;
- monitorar auth, leads, formularios, webhooks e exportacoes;
- migrar clientes por ondas;
- manter alias/redirect temporario dos hosts antigos do painel.

### Fase 9. Remocao definitiva do legado

- remover `imobfluow` de envs, CI, assets e service names;
- encerrar compatibilidade de hosts antigos;
- remover codigo de fallback temporario.

## Sugestoes de melhorias arquiteturais

1. Separar formalmente `Admin App` e `Public Site Runtime`

Mesmo que o bundle continue unico no curto prazo, a borda e as regras devem ser distintas. O painel nao deve depender de host do cliente para existir.

2. Tornar `organization_id` a unica fonte de verdade de tenant no backend

Host e slug devem resolver tenant apenas para experiencia publica. Para painel e APIs autenticadas, o tenant deve vir do contexto autenticado, nunca do host do cliente.

3. Criar um `BrandConfig` da plataforma

Centralizar:

- nome da suite;
- nome do produto;
- logos;
- favicons;
- palette;
- copy institucional;
- links oficiais;
- assets PWA.

4. Criar um `TenantBrandConfig` por cliente

Separar claramente:

- branding da plataforma;
- branding do cliente;
- branding de campanhas/quiz;
- branding de documentos.

5. Reduzir a complexidade de resolucao de tenant no frontend

Hoje o navegador participa demais da descoberta de tenant. Ideal:

- painel: tenant vem da sessao/perfil;
- publico: tenant vem de host/slug resolvido por endpoint dedicado;
- suporte: tenant vem de impersonacao assinada.

6. Formalizar estrategia de compatibilidade

Introduzir uma camada `legacyHosts` com expiracao planejada, para:

- `app.imobfluow.com.br`;
- `imobfluow.com.br`;
- `imobfluow.consultio.com.br`;
- rotas antigas como `/:slug/site`.

7. Fortalecer SEO multi-site

- gerar `robots.txt` por tenant;
- gerar `sitemap.xml` por tenant;
- canonical por pagina;
- Open Graph efetivo em runtime;
- politica clara de 301/302.

## URLs e fluxos mapeados

### Painel

- `/login`
- `/register`
- `/onboarding`
- `/admin`
- `/rural/*`
- `/urban/*`
- `/superadmin/*`

### Publico

- `/`
- `/vendas`
- `/consultoria`
- `/lp/:slug`
- `/quiz/:slug`
- `/:slug/site/*`
- `/site/:slug/*`
- `/sites/:slug/*`
- `/api/sites/public/:orgSlug`
- `/api/sites/public-page/:orgSlug/:pageSlug`

### Tenant/domain

- `/api/tenant/resolve`
- `/api/tenant/current`
- `/api/domains/add`
- `/api/domains/remove`
- `/api/domains/verify/:domain`
- `/api/domains/sync-all`

### Auth/API

- chamadas autenticadas via `Authorization: Bearer ...`
- refresh via `supabase.auth.refreshSession()`
- headers auxiliares:
  - `x-organization-id`
  - `x-impersonate-org-id`

## Conclusao

A migracao para `WooTech Imob` e viavel com a base atual, mas depende de uma decisao arquitetural antes de qualquer rebrand visual:

o painel administrativo precisa deixar de ser uma variacao do mesmo runtime entregue aos dominios publicos dos clientes.

Se essa separacao for feita primeiro, o restante da migracao passa a ser previsivel. Se a equipe tentar trocar apenas nome e dominio sem isolar painel, tenant e borda, a chance de regressao em auth, CORS, SEO e branding sera alta.
