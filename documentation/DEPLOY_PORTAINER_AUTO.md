# Deploy automatico com Portainer

Fluxo desejado:

1. Fazer commit e push na branch `main`.
2. GitHub Actions gera e publica as imagens Docker no GHCR.
3. GitHub Actions chama o webhook do Portainer.
4. Portainer recria a stack usando as imagens `latest`.

## Arquivos envolvidos

- `.github/workflows/docker-images.yml`: build/push das imagens e chamada do webhook.
- `docker-stack.prod.yml`: stack para usar no Portainer, baseada nas imagens:
  - `ghcr.io/fluowai/woomobzy-frontend:latest`
  - `ghcr.io/fluowai/woomobzy-api:latest`
  - `ghcr.io/fluowai/woomobzy-whatsapp:latest`
  - `ghcr.io/fluowai/woomobzy-agro:latest`

## Configuracao no Portainer

1. Crie ou edite a stack do IMOBZY no Portainer.
2. Use o arquivo `docker-stack.prod.yml`.
3. Preencha as variaveis marcadas como `TROCAR_AQUI_*` com os valores reais.
4. Ative o webhook da stack no Portainer.
5. Copie a URL do webhook.

## Configuracao no GitHub

No repositorio `fluowai/woomobzy`, adicione um secret:

```text
PORTAINER_WEBHOOK_URL=https://SEU_PORTAINER/api/stacks/webhooks/...
```

Caminho:

```text
Settings > Secrets and variables > Actions > New repository secret
```

Depois disso, todo push na `main` publica as imagens e chama o Portainer automaticamente.

## Como conferir

No GitHub:

- Abra `Actions`.
- Entre no workflow `Docker Images`.
- O job `deploy-portainer` deve terminar com sucesso.

No Portainer:

- A stack deve aparecer como atualizada/redeployada.
- Os containers devem ter data de criacao posterior ao workflow.
