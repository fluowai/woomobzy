# MinIO para dentro da stack — modo FRESH START (MinIO novo, do zero)

Status: **PRONTO PARA SUBIR** (change set adaptado para MinIO novo — sem preservar dados)
Data: 2026-08-05

## Objetivo

Hoje o MinIO roda como um serviço Docker **fora** do stack principal (stack separada `minio`), e o backend o acessa pela rota pública `https://nb.consultio.com.br` (TLS + Traefik + Let's Encrypt). Essa rota externa é a principal fonte dos erros recorrentes (incidente 503 de 03/08 — `DEV/SPECS/NB_CONSULTIO_MINIO_SSL.md`).

**Decisão do maestro (fresh start)**: não há dados a preservar no MinIO atual. Então **não** se reutiliza o diretório de dados antigo nem as credenciais root antigas. Sobe-se um **MinIO novo** dentro do stack, com:
- diretório de dados novo (volume nomeado `minio_data`, criado automaticamente);
- credenciais root **novas** já **embutidas no YAML** (`wootechadmin` / `<minio-root-password>`) — sem variável a definir no Portainer;
- buckets + policy + usuário do app **provisionados automaticamente** pelo serviço `minio-init` na primeira subida.

O backend passa a usar o **endpoint interno `http://minio:9000`** (rede Docker, sem TLS, sem hop no Traefik). A URL pública `https://nb.consultio.com.br` continua valendo para o navegador/media (labels Traefik `minio_nb` no serviço).

## O que mudou no repo (working tree, sem commit)

| Arquivo | Mudança |
|---|---|
| `docker-compose.yml` | Serviço `minio` (image `minio/minio:latest`, volume nomeado `minio_data:/data`, redes `wootech1`+`imobfluow_internal`, healthcheck curl, labels router `minio_nb`); novo serviço `minio-init` (image `minio/mc:latest`) que provisiona buckets + policy `imobzy-rw` + usuário do app; `MINIO_ENDPOINT=http://minio:9000` em `api` e `whatsapp-service` |
| `portainer-stack-imobfluow-filled.yml` | Idem (Swarm, rede `v5company1`+`imobfluow_internal`); `minio-init` com as credenciais do app já preenchidas |
| `portainer-stack.yml` | Idem (rede `woopanel1`+`imobfluow_internal`) |
| `.env.production.template` / `.env.example` | Vars `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` re-descritas como credenciais NOVAS; removida a var `MINIO_DATA_DIR` (volume nomeado substitui o bind mount) |
| `traefik/dynamic/nb_consultio_com_br.yml` | Não tocado (router file é inerte no Traefik real; as labels do serviço são o que vale) |

O código (`server/lib/minio-storage.js`, `whatsapp-service/...`) **não mudou**: Node e Go já normalizam `MINIO_ENDPOINT` com esquema `http://` e tratam `secure=false`. Nenhuma mudança de runtime necessária.

## Provisionamento automático (`minio-init`)

Serviço one-shot (image `minio/mc:latest`, `restart: none`), idempotente — roda a cada subida da stack e não falha se já existir:

1. Espera o MinIO ficar acessível (`mc alias set local http://minio:9000 ...` com retry até 120s).
2. Cria os buckets: `imobzycrm`, `imobzywhatsapp`, `imobzy-media`, `imobzy-documents`, `imobzy-exports`, `imobzy-backups`, `imobzy-contracts` (`--ignore-existing`).
3. Cria a policy `imobzy-rw` (s3:* em `arn:aws:s3:::imobzy*` e objetos).
4. Cria o usuário do app com as credenciais `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` e anexa a policy `imobzy-rw`.

Assim, o backend continua autenticando com a mesma key do app de sempre (`<app-access-key>` na stack filled) — **nenhuma mudança de config no app**.

## Credenciais do MinIO (embutidas no YAML)

As stacks já saem **prontas para colar no Portainer** — as root creds estão embutidas no YAML:

| Variável | Valor |
|---|---|
| `MINIO_ROOT_USER` | `wootechadmin` |
| `MINIO_ROOT_PASSWORD` | `<minio-root-password>` |

> Nenhuma variável precisa ser definida no ambiente da stack. As credenciais do app (`MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`) já estão no YAML (stack filled) ou no `.env` (compose local). No `docker-compose.yml`/`portainer-stack.yml` as root creds também estão embutidas; apenas `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` seguem por interpolação nesses dois.

## Passos do cutover (janela de minutos)

1. **Remover a stack antiga do MinIO** no Portainer (`docker stack rm minio`). Necessário para liberar o router `minio_nb` (o Traefik rejeita routers duplicados) e a porta/recursos.
   - Não há dados a salvar — nada precisa ser copiado.
2. **Atualizar o stack principal** no Portainer com o YAML novo (contém `minio` + `minio-init` + `MINIO_ENDPOINT=http://minio:9000`). Root creds já embutidas (`wootechadmin`/`<minio-root-password>`) — **não é preciso definir variável no ambiente**.
3. `minio-init` roda sozinho na primeira subida e provisiona buckets/policy/usuário do app.
5. **Verificar** (seção abaixo). Depois disso o tráfego de escrita migra para a rede interna.

> Durante o passo 1-2 há uma janela curta em que uploads/media podem falhar (503). Com `ALLOW_SUPABASE_STORAGE_FALLBACK=true` o api cai para o Supabase storage automaticamente se o MinIO não responder — rede de segurança já ativa.

## Verificação

```bash
# MinIO interno de dentro da rede (rodar em um container do stack, ex.: api)
curl -fsS http://minio:9000/minio/health/live   # → 200

# Buckets + escrita com a key do app (dentro do container api)
node -e "
  process.env.MINIO_ENDPOINT='http://minio:9000';
  import('./server/lib/minio-storage.js').then(async (m) => {
    console.log('buckets', await m.listMinioBuckets());
    const r = await m.uploadObject({ bucket: 'imobzywhatsapp', key: 'fresh-start/ok.txt', body: 'ok', logicalBucket: 'whatsapp' });
    console.log('PUT', r.publicUrl);
    await m.deleteMinioObjects({ bucket: 'imobzywhatsapp', keys: ['fresh-start/ok.txt'] });
  });
"

# Pública (navegador/media) continua de pé via Traefik
curl.exe -s https://nb.consultio.com.br/minio/health/live   # → 200, issuer Let's Encrypt
```

Esperado:
- `GET http://minio:9000/minio/health/live` → 200.
- ListBuckets retorna os buckets provisionados pelo `minio-init`.
- Upload autenticado `provider: minio` → 200 no app (WhatsApp media e imagem de imóvel).
- `https://nb.consultio.com.br/...` continua servindo media no navegador.

## Rollback

1. No Portainer, restaurar a definição do stack anterior (sem o serviço `minio`/`minio-init`, com `MINIO_ENDPOINT=https://nb.consultio.com.br`).
2. Recriar a stack `minio` antiga (se necessário) e confirmar `https://nb.consultio.com.br/minio/health/live` → 200.
3. Como o MinIO novo usa volume próprio (`minio_data`), o rollback não afeta nada além do stack.

## Riscos e notas

- **Router `minio_nb` único**: apenas UMA stack pode declarar esse router (o Traefik rejeita duplicatas). A remoção da stack antiga no passo 1 resolve.
- **Fresh start = dados novos**: objetos gravados no MinIO antigo não existirão no novo. Confirmado pelo maestro que não há nada a salvar. A partir do cutover, todo upload vai para o MinIO novo.
- **Volume `minio_data`**: primeiro deploy cria o volume. Remover o volume (`docker volume rm`) = apagar os dados do MinIO novo. Para "zerar" de novo, remover stack + volume.
- **Versão da imagem**: `minio/minio:latest` segue o padrão do stack. Considere pin da release depois da validação.
- **Healthcheck com `curl`**: a imagem oficial do MinIO inclui `curl` nas releases recentes. Se falhar, o restart policy mantém o serviço de pé; alternativa é `mc ready local`.
- **Console (9001)**: não é exposto externamente. Para administrar, use `docker exec <minio> mc admin info local` ou tunnel temporário.
- **Segurança**: `.env.production`/`.env` e a stack filled contêm segredos reais versionados (leak conhecido do relatório de 30/07). **Rotacionar `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` (novos) e a key do app** após a subida, e remover os segredos dos arquivos rastreados.
- Stacks alternativos: `portainer-stack-fazendasbrasil-pronta.yml` está obsoleto e foi deliberadamente **não** atualizado.

## Estado do change set

- Sem commit/push/deploy. Working tree tem WIP de outras sessões — conferir `git status` antes de qualquer commit.
- Gates locais aplicáveis: YAML parseado com sucesso (`js-yaml`) nos 3 arquivos alterados; Docker indisponível local → `docker compose config` pendente no VPS/Portainer.
