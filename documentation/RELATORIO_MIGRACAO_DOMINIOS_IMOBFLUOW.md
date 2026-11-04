# Relatorio de Analise - Migracao de Dominios ImobFluow

Data da analise: 2026-06-05

Escopo solicitado: revisar a migracao de `crmimobzy.consultio.com.br` para `app.imobfluow.com.br` e `imobfluow.com.br`, procurando falhas que possam afetar as funcoes do CRM.

## Status apos correcoes aplicadas

Correcoes aplicadas em 2026-06-05:

- `.env`, `.env.production`, `.env.production.template` e `deploy.production.env.example` foram alinhados para painel em `https://app.imobfluow.com.br` e base publica em `https://imobfluow.com.br`.
- CORS do backend, PM2, proxy WhatsApp e servico Go agora usam `https://app.imobfluow.com.br`, `https://imobfluow.com.br` e `https://www.imobfluow.com.br` como origins padrao.
- Traefik dinamico, Docker Compose, stack Swarm e Nginx legado foram atualizados para `app.imobfluow.com.br`.
- `docker-stack.prod.yml` deixou de versionar credenciais sensiveis diretamente e passou a exigir variaveis de ambiente para Supabase, banco e token interno do WhatsApp.
- `VITE_PLATFORM_IP` e instrucoes de DNS deixaram de publicar o placeholder `IP_DO_SERVIDOR`.
- A dependencia `framer-motion` foi adicionada ao projeto para corrigir o build do onboarding.
- O script `scripts/run-migrations.mjs` foi validado com `node --check` e o `npm run type-check` voltou a passar.

Validacoes apos as correcoes:

- `npm run type-check`: passou.
- `npm run build`: passou.
- `node --check server/index.js`: passou.
- `node --check server/api/whatsapp/index.js`: passou.
- `node --check scripts/run-migrations.mjs`: passou.
- `docker compose -f docker-compose.yml config --quiet`: passou.
- `docker compose -f docker-stack.prod.yml config --quiet`: passou com `WHATSAPP_INTERNAL_TOKEN` temporario de validacao.
- Varredura por `crmimobzy.consultio.com.br`, `imobzy.consultio.com.br`, `api.consultio.com.br` e `IP_DO_SERVIDOR`: sem ocorrencias funcionais fora deste relatorio historico.

Observacao importante: como segredos ja haviam aparecido no workspace antes da correcao, ainda recomendo rotacionar chaves sensiveis no provedor: Supabase service role, segredo JWT se exposto fora do servidor, senha do banco e token interno do WhatsApp.

As secoes abaixo preservam a analise original e o raciocinio de risco que levou as correcoes.

## Resumo executivo

A producao atual publicada em `app.imobfluow.com.br` e `imobfluow.com.br` responde corretamente nos endpoints basicos do frontend/API e o proxy publico de WhatsApp tambem esta saudavel. Porem, o repositorio ainda tem configuracoes antigas de dominio em arquivos que podem quebrar novos deploys, ambientes alternativos ou rollback.

Principais riscos encontrados:

1. `.env.production` ainda aponta para `crmimobzy.consultio.com.br` e origins antigos. Se esse arquivo for usado em deploy, CORS, URL publica, onboarding e WebSocket podem voltar para o dominio antigo.
2. `traefik/dynamic/00-platform.yml` nao inclui `app.imobfluow.com.br` e ainda inclui `imobzy.consultio.com.br`. Isso pode quebrar o painel no subdominio `app` em deploy via `docker-compose.yml`.
3. Fallbacks de CORS do backend/WhatsApp/PM2 ainda carregam dominios antigos. A producao atual compensa isso por variaveis no `docker-stack.prod.yml`, mas a configuracao e fragil.
4. O build local falha porque `framer-motion` e importado, mas nao esta listado/instalado como dependencia.
5. O type-check falha em `scripts/run-migrations.mjs`, que ja estava alterado no workspace antes desta analise.
6. `docker-stack.prod.yml` contem segredos de producao hardcoded. Isso e risco alto de seguranca e exige rotacao de chaves.

## Testes ao vivo

Executados via `node fetch` em 2026-06-05:

| URL | Resultado |
| --- | --- |
| `https://app.imobfluow.com.br/health` | 200, resposta `ok` |
| `https://app.imobfluow.com.br/api/system-status` | 200, API online |
| `https://imobfluow.com.br/health` | 200, resposta `ok` |
| `https://imobfluow.com.br/api/system-status` | 200, API online |
| `https://app.imobfluow.com.br/api/whatsapp/health` | 200, Node e WhatsApp service online |
| `https://imobfluow.com.br/api/whatsapp/health` | 200, Node e WhatsApp service online |
| `https://crmimobzy.consultio.com.br/health` | 530, HTML de erro |
| `https://crmimobzy.consultio.com.br/api/system-status` | 530, HTML de erro |

Teste CORS publicado:

| Origin testado | Endpoint | Resultado |
| --- | --- | --- |
| `https://app.imobfluow.com.br` | `https://app.imobfluow.com.br/api/system-status` | 204, permitido |
| `https://imobfluow.com.br` | `https://app.imobfluow.com.br/api/system-status` | 204, permitido |
| `https://app.imobfluow.com.br` | `https://imobfluow.com.br/api/system-status` | 204, permitido |
| `https://crmimobzy.consultio.com.br` | `https://app.imobfluow.com.br/api/system-status` | 403, bloqueado |

Runtime publicado em `/env-config.js`:

- `VITE_API_URL`: `same-origin`
- `VITE_WHATSAPP_API_URL`: `/api/whatsapp`
- `VITE_WHATSAPP_WS_URL`: `/api/whatsapp/ws`
- `VITE_PANEL_URL`: `https://app.imobfluow.com.br`
- `VITE_PUBLIC_APP_URL`: `https://imobfluow.com.br`
- `VITE_PLATFORM_IP`: `IP_DO_SERVIDOR`

Observacao: `VITE_PLATFORM_IP` publicado como `IP_DO_SERVIDOR` nao quebra o login/CRM, mas afeta instrucoes/verificacao de DNS para dominios personalizados se esse valor for usado no painel.

## Achados por severidade

### Critico - `.env.production` ainda esta no dominio antigo

Evidencias:

- `.env.production:7` `APP_DOMAIN=crmimobzy.consultio.com.br`
- `.env.production:8` `APP_URL=https://crmimobzy.consultio.com.br`
- `.env.production:11` `ALLOWED_ORIGINS=https://crmimobzy.consultio.com.br,https://imobzy.consultio.com.br`
- `.env.production:12` `CORS_ORIGINS=https://crmimobzy.consultio.com.br,https://imobzy.consultio.com.br`
- `.env:7` `VITE_PANEL_URL=https://imobzy.consultio.com.br`
- `.env:24` `VITE_WHATSAPP_WS_URL=wss://imobzy.consultio.com.br/api/whatsapp/ws`
- `.env:30` `WHM_MAIN_DOMAIN=consultio.com.br`

Impacto provavel:

- Deploy via `docker-compose.yml` ou `docker-compose.prod.yml` pode servir URLs antigas.
- Login/cadastro/onboarding podem gerar links para o dominio antigo.
- CORS pode bloquear `app.imobfluow.com.br`.
- WebSocket do WhatsApp pode tentar conectar em `imobzy.consultio.com.br`.
- Gestao de dominios personalizados pode gerar subdominios/rotas baseados em `consultio.com.br`.

Correcao recomendada:

- Atualizar `.env.production` para:
  - `APP_DOMAIN=app.imobfluow.com.br`
  - `APP_URL=https://app.imobfluow.com.br`
  - `PUBLIC_APP_URL=https://imobfluow.com.br`
  - `VITE_PUBLIC_APP_URL=https://imobfluow.com.br`
  - `VITE_PANEL_URL=https://app.imobfluow.com.br`
  - `ALLOWED_ORIGINS=https://app.imobfluow.com.br,https://imobfluow.com.br,https://www.imobfluow.com.br`
  - `CORS_ORIGINS=https://app.imobfluow.com.br,https://imobfluow.com.br,https://www.imobfluow.com.br`
  - `VITE_WHATSAPP_WS_URL=/api/whatsapp/ws`
  - `WHM_MAIN_DOMAIN=imobfluow.com.br`

### Critico - Segredos de producao hardcoded no stack

Evidencia:

- `docker-stack.prod.yml` contem anon key, service role key, JWT secret, database URL com senha e token interno do WhatsApp.

Impacto provavel:

- Qualquer pessoa/processo com acesso ao arquivo pode acessar banco, Supabase service role ou servicos internos.
- Se o arquivo foi commitado ou compartilhado, as chaves devem ser consideradas comprometidas.

Correcao recomendada:

- Remover segredos do YAML e usar Docker secrets, variaveis de ambiente externas ou secret manager.
- Rotacionar imediatamente:
  - Supabase service role key
  - Supabase JWT secret, se exposto fora de ambiente controlado
  - senha/URL do banco
  - `WHATSAPP_INTERNAL_TOKEN`

### Alto - Traefik dinamico local ainda aponta para dominio antigo e nao inclui `app`

Evidencias:

- `traefik/dynamic/00-platform.yml:4` usa `Host(imobfluow.com.br, www.imobfluow.com.br, imobzy.consultio.com.br)` para API.
- `traefik/dynamic/00-platform.yml:13` usa os mesmos hosts para frontend.
- `docker-compose.yml` monta `./traefik/dynamic:/traefik/dynamic:ro`.

Impacto provavel:

- Em deploy via `docker-compose.yml`, `app.imobfluow.com.br` pode nao rotear para frontend/API.
- `imobzy.consultio.com.br` continua aceito pelo roteador local, mantendo dependencia do dominio antigo.

Correcao recomendada:

- Substituir `imobzy.consultio.com.br` por `app.imobfluow.com.br`.
- Manter `imobfluow.com.br` e `www.imobfluow.com.br`.

### Alto - Fallbacks de CORS ainda dependem de dominios antigos

Evidencias:

- `server/index.js:99-102` inclui `https://imobfluow.com.br`, `https://www.imobfluow.com.br` e `https://consultio.com.br`, mas nao inclui `https://app.imobfluow.com.br` no array estatico.
- `server/api/whatsapp/index.js:49-50` inclui `https://imobzy.consultio.com.br` e `https://crmimobzy.consultio.com.br` como origins fixos.
- `ecosystem.config.cjs:57` fallback de `CORS_ORIGINS` ainda usa `consultio.com.br` e `imobzy.consultio.com.br`.
- `whatsapp-service/internal/config/config.go:81` fallback de CORS ainda usa `consultio.com.br` e `imobzy.consultio.com.br`.

Impacto provavel:

- A producao atual funciona porque `docker-stack.prod.yml` injeta os origins novos.
- Se `ALLOWED_ORIGINS`/`CORS_ORIGINS` faltarem, o painel `app.imobfluow.com.br` pode ser bloqueado pelo backend ou pelo servico de WhatsApp.
- Ambientes PM2 ou builds alternativos podem permitir dominios antigos e negar o novo subdominio `app`.

Correcao recomendada:

- Atualizar todos os fallbacks para incluir:
  - `https://app.imobfluow.com.br`
  - `https://imobfluow.com.br`
  - `https://www.imobfluow.com.br`
- Remover `consultio.com.br`, `imobzy.consultio.com.br` e `crmimobzy.consultio.com.br`, exceto se existir uma janela intencional de transicao.

### Medio - CSP do backend nao declara `app.imobfluow.com.br`

Evidencia:

- `server/index.js:76` em `connect-src` declara `https://imobfluow.com.br` e `wss://imobfluow.com.br`, mas nao declara `https://app.imobfluow.com.br` nem `wss://app.imobfluow.com.br`.

Impacto provavel:

- Para chamadas same-origin em `app.imobfluow.com.br`, `'self'` cobre o uso normal.
- Se alguma tela em `imobfluow.com.br` precisar chamar API/WS em `app.imobfluow.com.br`, a CSP pode bloquear.

Correcao recomendada:

- Adicionar `https://app.imobfluow.com.br` e `wss://app.imobfluow.com.br` ao `connect-src`.

### Medio - Redirecionamento raiz ainda mistura dominio antigo e novo

Evidencias:

- `App.tsx:407` redireciona `/` para `/login` em `imobzy.consultio.com.br`, `crmimobzy.consultio.com.br` e `app.imobfluow.com.br`.
- `imobfluow.com.br` nao entra nessa regra e continua servindo a pagina publica/vendas.

Impacto provavel:

- Se a regra de produto for "CRM sempre em `app.imobfluow.com.br` e site publico em `imobfluow.com.br`", esta correto.
- Se `imobfluow.com.br` tambem deveria abrir o CRM, a raiz vai mostrar a pagina comercial em vez do login.

Correcao recomendada:

- Confirmar a regra de negocio.
- Se `imobfluow.com.br` for institucional/publico, manter como esta.
- Se for painel, incluir `imobfluow.com.br` e `www.imobfluow.com.br` na regra de redirect para `/login`.

### Medio - Configuracao nginx legada ainda usa certificado e server_name antigo

Evidencias:

- `docker/nginx/imobzy-websocket.conf:9` e `:23` usam `server_name crmimobzy.consultio.com.br`.
- `docker/nginx/imobzy-websocket.conf:25-26` usam certificado LetsEncrypt do dominio antigo.

Impacto provavel:

- Se esse arquivo legado for reutilizado em Nginx Proxy Manager/manual, WebSocket e API podem quebrar no dominio novo.
- No stack atual com Traefik labels, esse arquivo parece legado.

Correcao recomendada:

- Arquivar/remover se nao for mais usado, ou atualizar para `app.imobfluow.com.br`.

### Medio - Runtime publicado tem IP placeholder

Evidencia:

- `https://app.imobfluow.com.br/env-config.js` publica `VITE_PLATFORM_IP: "IP_DO_SERVIDOR"`.
- `docker/nginx/docker-entrypoint-imobzy.sh:13` usa esse placeholder como fallback.

Impacto provavel:

- A tela de dominios personalizados pode instruir clientes a apontar DNS para um valor invalido se `VITE_PLATFORM_IP` for consumido sem variavel real.

Correcao recomendada:

- Configurar `VITE_PLATFORM_IP` ou `PLATFORM_PUBLIC_IP` com o IP real.
- Evitar publicar placeholder em producao.

### Baixo - Documentacao e scripts ainda mencionam dominios antigos

Evidencias:

- `documentation/DIAGNOSTICO_WEBSOCKET_ENTERPRISE.md` referencia `crmimobzy.consultio.com.br`.
- `documentation/INSTRUCOES_DOMINIOS.md` referencia `consultio.com.br`.
- `scripts/manual_create_test.js:4` usa `https://api.consultio.com.br`.

Impacto provavel:

- Risco operacional: alguem pode seguir documentacao antiga e configurar endpoints errados.

Correcao recomendada:

- Atualizar documentacao e scripts auxiliares para `app.imobfluow.com.br`/`imobfluow.com.br`.

## Verificacao de build e codigo

### Build de frontend

Comando:

```bash
npm run build
```

Resultado: falhou.

Causa principal:

- `views/Onboarding.tsx:21` importa `framer-motion`.
- `package.json` nao lista `framer-motion` em `dependencies`.

Impacto:

- Novas imagens Docker/builds podem falhar antes de publicar a migracao.

Correcao recomendada:

- Instalar `framer-motion` ou remover/substituir o uso em `views/Onboarding.tsx`.

### Type-check

Comando:

```bash
npm run type-check
```

Resultado: falhou.

Causa principal:

- Erros de sintaxe em `scripts/run-migrations.mjs`, com primeiro erro reportado em `scripts/run-migrations.mjs:55`.
- O arquivo ja estava modificado antes desta analise (`git status` mostrou `M scripts/run-migrations.mjs`).

Impacto:

- `tsc --noEmit` nao fica confiavel ate corrigir esse script ou exclui-lo do escopo de type-check.

## Estado atual do CRM apos migracao

Itens funcionando na producao atual:

- `app.imobfluow.com.br` responde.
- `imobfluow.com.br` responde.
- API `/api/system-status` responde nos dois dominios.
- CORS publicado permite `app.imobfluow.com.br` e `imobfluow.com.br`.
- WhatsApp health responde nos dois dominios novos.
- Dominio antigo `crmimobzy.consultio.com.br` esta fora/erro 530, o que e coerente com a migracao se nao houver mais necessidade de fallback.

Itens com risco:

- Re-deploy por caminho diferente do `docker-stack.prod.yml` pode voltar para os dominios antigos.
- Ambientes PM2, compose local/prod ou configuracoes manuais podem quebrar por CORS/Traefik antigo.
- Onboarding/links publicos podem apontar para dominio antigo se `.env.production` for usado.
- Dominio customizado pode mostrar IP errado por placeholder.
- Build novo pode falhar por dependencia ausente.

## Plano de correcao recomendado

1. Atualizar `.env.production` e `.env` para os dominios novos, sem segredos hardcoded.
2. Atualizar `traefik/dynamic/00-platform.yml` para incluir `app.imobfluow.com.br` e remover `imobzy.consultio.com.br`.
3. Atualizar fallbacks de CORS em:
   - `server/index.js`
   - `server/api/whatsapp/index.js`
   - `ecosystem.config.cjs`
   - `whatsapp-service/internal/config/config.go`
4. Atualizar CSP em `server/index.js` para incluir `app.imobfluow.com.br`.
5. Configurar `VITE_PLATFORM_IP` real no runtime de producao.
6. Corrigir build instalando/removendo `framer-motion`.
7. Corrigir ou isolar `scripts/run-migrations.mjs` para restaurar `npm run type-check`.
8. Remover/arquivar configs legadas de Nginx e atualizar documentacao/scripts antigos.
9. Rotacionar segredos expostos e mover credenciais para secret manager/ambiente seguro.

## Conclusao

A migracao publicada aparenta estar operacional nos endpoints basicos e no WhatsApp, mas o repositorio esta inconsistente: ha arquivos prontos para o dominio novo e outros ainda presos ao dominio antigo. O maior risco nao e o estado atual do site publicado, e sim um novo deploy ou ambiente alternativo reativar `crmimobzy.consultio.com.br`/`imobzy.consultio.com.br`, causando falhas de CORS, WebSocket, links de onboarding e roteamento do painel.
