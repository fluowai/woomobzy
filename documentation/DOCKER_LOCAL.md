# Docker local

Este ambiente separa a aplicacao em containers:

- `proxy`: Caddy em `http://localhost:8080`
- `frontend`: build Vite servido por Nginx
- `api`: Node/Express em `http://localhost:3002`
- `whatsapp-service`: Go/WhatsMeow em `http://localhost:3100`
- `agro-intelligence`: FastAPI em `http://localhost:8000`

## Como rodar

1. Garanta que o Docker Desktop esteja aberto.
2. Mantenha um `.env` local na raiz com as credenciais reais.
3. Suba a stack:

```bash
docker compose up --build
```

Para rodar em background:

```bash
docker compose up --build -d
```

Se o projeto estiver dentro do OneDrive e o Docker falhar com `invalid file request`,
copie ou clone o repositorio para uma pasta local fora do OneDrive, por exemplo
`C:\tmp\imobzy-docker-run`, e rode o compose a partir dessa copia. O BuildKit pode
falhar ao ler arquivos marcados como `ReparsePoint`.

## URLs locais

```txt
Frontend/proxy: http://localhost:8080
API Node:       http://localhost:3002
WhatsApp Go:    http://localhost:3100
Agro Python:    http://localhost:8000
```

O navegador deve usar preferencialmente `http://localhost:8080`, porque essa URL simula producao:

```txt
/api/* -> api:3002
/api/whatsapp/* -> api:3002 -> whatsapp-service:3100
```

## Variaveis principais

Use `.env.docker.example` como referencia. No Docker local, as mais importantes sao:

```env
VITE_API_URL=same-origin
VITE_WHATSAPP_API_URL=/api/whatsapp
VITE_WHATSAPP_WS_URL=/api/whatsapp/ws
WHATSAPP_API_URL=http://whatsapp-service:3100
WHATSMEOW_URL=http://whatsapp-service:3100
AGRO_INTEL_URL=http://agro-intelligence:8000
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3006,http://localhost:3002
```

O `whatsapp-service` tambem exige pelo menos uma URL Postgres real:

```env
DATABASE_URL=postgresql://...
# ou
SUPABASE_DB_URL=postgresql://...
# ou
DATABASE_PRIVATE_URL=postgresql://...
# ou
DIRECT_URL=postgresql://...
# ou
POSTGRES_URL=postgresql://...
PGSSLMODE=require
```

## Testes rapidos

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/system-status
curl http://localhost:3100/health
curl http://localhost:8000/
```

## Parar

```bash
docker compose down
```

Para apagar tambem volumes locais:

```bash
docker compose down -v
```
