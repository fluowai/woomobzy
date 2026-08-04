# MinIO — SSL Let's Encrypt em nb.consultio.com.br (fix do 503 de upload)

Status: **CONCLUÍDO (2026-08-03)** — ver "Atualização 2026-08-03" abaixo.
Data: 2026-08-03

> ## Atualização 2026-08-03 — o que foi aplicado de fato
>
> A investigação em produção mudou o caminho do fix:
>
> - **O Traefik real não tem file provider.** O `traefik.yml` do VPS usa `--providers.swarm=true --providers.docker.*` (sem `providers.file`), e o volume `imobzy_traefik_dynamic` NÃO é montado no Traefik. Logo `traefik/dynamic/nb_consultio_com_br.yml` é **inerte**. O fix real foi aplicado por **labels no serviço MinIO** (stack minio): router `minio_nb` com `Host(nb.consultio.com.br)`, `websecure`, `letsencryptresolver`, port 9000 → cert Let's Encrypt emitido.
> - **Provisionamento no MinIO** (o app usa a key `8aHPnW4JQsRWhbKld9Yw`): criados buckets `imobzycrm`, `imobzywhatsapp`, `imobzy-media`, `imobzy-documents`, `imobzy-exports`, `imobzy-backups`; policy `imobzy-rw` (`s3:*` nos 6 buckets) e o user `8aHPnW4JQsRWhbKld9Yw` (status enabled) via API do console MinIO.
> - **Verificado**: `GET https://nb.consultio.com.br/minio/health/live` → 200 (issuer Let's Encrypt YR1); com a key do app, ListBuckets/PUT/DELETE OK nos buckets; assinatura SigV4 idêntica a `server/lib/minio-storage.js` (`uploadObject`) executada no container `api` com env de produção → PUT 200 em `imobzywhatsapp` e `imobzy-media`.
> - Env do stack **não mudou**: `MINIO_WHATSAPP_BUCKET=imobzywhatsapp`, sem `MINIO_MEDIA_BUCKET` (media usa fallback `imobzy-media`, criado); `storage_integrations` (Supabase) sem row → config 100% env.
> - Rollback do router: remover os labels `minio_nb` do serviço MinIO e atualizar a stack.

## Problema

`POST /api/storage/upload` retorna **503** em produção ("Serviço de armazenamento indisponível").

Causa raiz confirmada por probes de rede:

- `https://nb.consultio.com.br` responde com `CN=TRAEFIK DEFAULT CERT` (self-signed, SAN vazio, expira 2027-08-03). O handshake TLS é rejeitado pelo Node (`self-signed certificate`; curl: `SEC_E_UNTRUSTED_ROOT 0x80090325`; openssl: verify return code 18).
- Não existe router para `Host(nb.consultio.com.br)` em `traefik/dynamic/` → o Traefik responde **404 próprio** com o cert default. A requisição nem chega ao MinIO.
- O backend usa `MINIO_ENDPOINT=https://nb.consultio.com.br` (`portainer-stack-imobfluow-filled.yml`, `.env.production`), então o cliente S3/assinatura manual (`server/lib/minio-storage.js`) falha na verificação TLS → 503.
- `portainer-stack-fazendasbrasil-pronta.yml` aponta para `https://n.woopanel.com.br`, que **não resolve** hoje (ENOTFOUND) — não é alternativa.

Fatos de infraestrutura:

- MinIO roda como **serviço Docker de nome `minio`** no VPS (207.58.153.219), porta S3 interna `9000`, na rede do Traefik. Confirmado como o alvo correto pelo maestro.
- Traefik usa `traefik.yml` (file provider `directory: /traefik/dynamic`, `watch: true`) + `certificatesResolvers.letsencryptresolver` (ACME HTTP-01 na porta 80, email `admin@wootech.com.br`).
- O volume `imobzy_traefik_dynamic` é montado em `/app/traefik/dynamic` no container `api` (e em `/traefik/dynamic:ro` no Traefik) — é por ele que os arquivos dinamicos chegam ao Traefik.

## Entregáveis (neste repositório)

| Arquivo | Função |
|---|---|
| `traefik/dynamic/nb_consultio_com_br.yml` | Router `Host(nb.consultio.com.br)` → `websecure` + `certResolver letsencryptresolver` → service file `nb_consultio_minio@file` → `http://minio:9000` |
| `docker-compose.yml` | `ALLOW_SUPABASE_STORAGE_FALLBACK: 'true'` no `api` e no `whatsapp-service` (rede de segurança) |
| `portainer-stack-imobfluow-filled.yml` | `ALLOW_SUPABASE_STORAGE_FALLBACK: "true"` no `x-backend-env` (api + whatsapp-service) |
| `.env.production.template` | Já documenta `ALLOW_SUPABASE_STORAGE_FALLBACK=true` (linha 22) — nenhuma mudança necessária |

O router segue o padrão dos demais arquivos de `traefik/dynamic/` (ex.: `inovebrokers_com_br.yml`, `oka-imoveis_consultio_com_br.yml`). Como funciona o SSL: na primeira requisição HTTPS o Traefik dispara o desafio HTTP-01 em `/.well-known/acme-challenge/` na porta 80 e emite o cert no `traefik/acme.json`; renovação automática.

## Deploy (ordem)

1. **DNS**: confirmar que `nb.consultio.com.br` tem registro A → `207.58.153.219`. Já confirmado (resolução atual → 207.58.153.219). Se mudar algo, `Resolve-DnsName nb.consultio.com.br -Type A`.
2. **Traefik dynamic**: copiar `traefik/dynamic/nb_consultio_com_br.yml` para o diretório lido pelo Traefik (`/traefik/dynamic`). Na prática é o volume externo `imobzy_traefik_dynamic` (montado em `/app/traefik/dynamic` no container `api`). Formas (igual ao guia do InoveBrokers):
   - Portainer → volume → upload do arquivo; ou
   - `docker cp traefik/dynamic/nb_consultio_com_br.yml <api-container>:/app/traefik/dynamic/`; ou
   - se o diretório estiver bind-mountado no host, copiar direto.
   O Traefik detecta o arquivo automaticamente (`watch: true`). Não é preciso reiniciar o Traefik.
3. **Garantir que o serviço `minio` esteja na rede do Traefik** (ex.: `wootech1`). O URL `http://minio:9000` é resolvido pelo Traefik na rede Docker compartilhada. Se o MinIO publicar a porta 9000 no host, ela pode ficar fechada no firewall sem impacto — o acesso é via rede interna Docker.
4. **Fallback Supabase (rede de segurança)**: no `.env.production` do deploy, adicionar `ALLOW_SUPABASE_STORAGE_FALLBACK=true` (o `.env.production.template` já documenta). Em deploy via Portainer, atualizar a stack `portainer-stack-imobfluow-filled.yml` (o `x-backend-env` já recebeu a var) para que api e whatsapp-service carreguem o fallback.
5. **Aguardar emissão do cert**: na primeira requisição HTTPS o Traefik dispara o ACME. Confirmar em `traefik/acme.json` o domínio `nb.consultio.com.br`.
6. **Redeply dos serviços** que leem o `.env.production` (api/whatsapp-service) se a var de fallback foi adicionada por lá.

## Verificação

```powershell
# HTTPS + certificado (Let's Encrypt, CN=nb.consultio.com.br)
curl.exe -I https://nb.consultio.com.br/minio/health/live
& "C:\Program Files\Git\usr\bin\openssl.exe" s_client -connect nb.consultio.com.br:443 -servername nb.consultio.com.br 2>$null | Select-String "subject|issuer"

# MinIO reachable de verdade (agora deve responder, nao ser o 404 do Traefik)
curl.exe -s https://nb.consultio.com.br/minio/health/live
```

Esperado:
- `subject=CN=nb.consultio.com.br`, `issuer` Let's Encrypt, verify return code 0.
- `GET /minio/health/live` responde 200 (não mais o 404 do Traefik).
- Upload real: `POST /api/storage/upload` responde 200 com `provider: minio`.

## Rollback

- Remover `traefik/dynamic/nb_consultio_com_br.yml` (Traefik para de rotear; o cert continua válido no acme.json até expirar).
- Remover `ALLOW_SUPABASE_STORAGE_FALLBACK=true` do env se não for mais desejado.

## Observação — alternativa interna (sem Traefik)

Como o MinIO é um serviço Docker na mesma rede, outra correção possível seria trocar apenas `MINIO_ENDPOINT` para o endereço interno `http://minio:9000` (mantendo `MINIO_PUBLIC_URL=https://nb.consultio.com.br` para URLs públicas de mídia). Isso evita o TLS para o backend, mas **não** resolve o acesso público às mídias (`VITE_MINIO_PUBLIC_URL` ainda precisaria de HTTPS válido no navegador). O router Traefik acima resolve os dois casos de uma vez e é a correção raiz escolhida.
