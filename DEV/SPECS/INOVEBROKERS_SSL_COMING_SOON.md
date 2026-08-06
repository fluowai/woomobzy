# InoveBrokers — SSL + página "Em breve" (inovebrokers.com.br / app.inovebrokers.com.br)

Status: planejado — entregáveis criados, aguardando DNS + deploy (maestro).
Data: 2026-08-03

## Objetivo

1. Emitir certificado SSL (Let's Encrypt) para `inovebrokers.com.br` e `app.inovebrokers.com.br`.
2. Servir uma página única "Em breve — um sistema será instalado aqui" nos dois domínios.

Infra confirmada: mesmo VPS da plataforma (207.58.153.219), Traefik com `certResolver letsencryptresolver` (desafio HTTP-01 na porta 80) + Portainer.

## Pré-requisito (DNS — obrigatório)

Criar 2 registros A no painel de DNS onde o domínio está registrado/hospedado:

| Nome                    | Tipo | Valor          | TTL  |
| ----------------------- | ---- | -------------- | ---- |
| inovebrokers.com.br     | A    | 207.58.153.219 | 3600 |
| app.inovebrokers.com.br | A    | 207.58.153.219 | 3600 |

Sem isso o desafio HTTP-01 falha e o certificado não é emitido. Não alterar MX/TXT/mail.
Verificação rápida: `Resolve-DnsName inovebrokers.com.br -Type A` e `... app.inovebrokers.com.br`.

## Entregáveis (neste repositório)

| Arquivo                                   | Função                                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `coming-soon/index.html`                  | Página "Em breve" (única, servida nos 2 domínios)                                                                 |
| `Dockerfile.coming-soon`                  | Imagem nginx estática que serve a página                                                                          |
| `traefik/dynamic/inovebrokers_com_br.yml` | Routers dos 2 domínios + `certResolver` (SSL) + service `inovebrokers_coming_soon@file` → `http://coming-soon:80` |
| `docker-compose.yml`                      | Novo service `coming-soon` na rede `wootech1` (alcançável pelo Traefik)                                           |
| `.github/workflows/docker-images.yml`     | CI builda/publica `ghcr.io/fluowai/inovebrokers-coming-soon`                                                      |

Como o SSL funciona: um único router com `Host(inovebrokers.com.br) || Host(app.inovebrokers.com.br)` no entrypoint `websecure` + `certResolver`. O Traefik responde ao desafio HTTP-01 em `/.well-known/acme-challenge/` na porta 80 (antes do redirect permanente) e emite **1 certificado com os 2 nomes (SAN)** no `traefik/acme.json`. Renovação automática.

## Deploy (ordem)

1. **DNS**: criar os registros A (ver pré-requisito) e aguardar propagação (~minutos a horas).
2. **Imagem**: push no branch `main` (ou rodar o workflow `Docker Images` manualmente) → CI builda `ghcr.io/fluowai/inovebrokers-coming-soon:latest`. O webhook `deploy-portainer` só redeploya a stack existente — **não adiciona o service novo**.
3. **Portainer — stack**: editar a stack principal e adicionar o service `coming-soon` (mesmo bloco do `docker-compose.yml` deste repo):
   ```yaml
   coming-soon:
     image: ghcr.io/fluowai/inovebrokers-coming-soon:latest
     restart: unless-stopped
     networks:
       - wootech1
   ```
   Necessário também que a rede `wootech1` (onde o Traefik roda) esteja na stack ou seja rede externa já existente.
4. **Traefik dynamic**: copiar `traefik/dynamic/inovebrokers_com_br.yml` para o diretório que o Traefik lê em `/traefik/dynamic`. Na prática é o volume externo `imobzy_traefik_dynamic` (montado em `/app/traefik/dynamic` no container `api`). Formas:
   - Portainer → volume → upload do arquivo; ou
   - `docker cp traefik/dynamic/inovebrokers_com_br.yml <api-container>:/app/traefik/dynamic/`; ou
   - se o diretório estiver bind-mountado no host, copiar direto.
     O Traefik detecta o arquivo automaticamente (file provider com `watch: true`). Não é preciso reiniciar o Traefik.
5. **Aguardar emissão do cert**: na primeira requisição HTTPS o Traefik dispara o ACME. Confirmar em `traefik/acme.json` os domínios `inovebrokers.com.br` e `app.inovebrokers.com.br`.

## Verificação

```powershell
# DNS apontando
Resolve-DnsName inovebrokers.com.br -Type A
Resolve-DnsName app.inovebrokers.com.br -Type A

# HTTPS + certificado (SAN dos 2 domínios, Let's Encrypt)
curl.exe -I https://inovebrokers.com.br
curl.exe -I https://app.inovebrokers.com.br

# Certificado emitido
curl.exe -s https://app.inovebrokers.com.br | Select-String "Em breve"
& "C:\Program Files\Git\usr\bin\openssl.exe" s_client -connect app.inovebrokers.com.br:443 -servername app.inovebrokers.com.br 2>$null | Select-String "subject|issuer"
```

Esperado: HTTP 200 nas duas URLs, página "Em breve", cert válido com `CN=inovebrokers.com.br` e SAN `app.inovebrokers.com.br`.

## Rollback

- Remover `traefik/dynamic/inovebrokers_com_br.yml` (Traefik para de rotear e o cert continua válido no acme.json até expirar).
- Remover o service `coming-soon` da stack no Portainer.

## Depois (quando o sistema real for instalado)

- Substituir o router `inovebrokers_com_br_coming_soon` pelo fluxo normal do whitelabel (domainService/Mega Admin → Domínios), apontando `imobzy_frontend@file`/`imobzy_api@file`, ou subir o app nestes domínios.
- Os certs continuam no mesmo `acme.json`; a troca de router não exige nova emissão.
