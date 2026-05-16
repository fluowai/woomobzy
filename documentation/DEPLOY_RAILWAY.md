# Deploy no Railway

Este projeto roda no Railway como uma API Node/Express usando Nixpacks.

## Servicos recomendados

1. API principal
   - Repositorio: este projeto
   - Build: Nixpacks
   - Start command: `npm start`

2. Redis
   - Adicione pelo Railway com `+ New` -> `Database` -> `Redis`
   - Use a variavel `REDIS_URL` do Redis no servico da API

## Variaveis obrigatorias na API

Configure em `Variables` no servico da API:

```env
NODE_ENV=production
PORT=3002
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
REDIS_URL=${{Redis.REDIS_URL}}
START_RURAL_WORKER=true
GROQ_API_KEY=...
GROQ_MATCH_MODEL=llama-3.1-8b-instant
```

Se o servico Redis tiver outro nome no Railway, ajuste a referencia:

```env
REDIS_URL=${{nome-do-redis.REDIS_URL}}
```

## Worker rural

O worker da analise rural inicia junto com a API quando `REDIS_URL` existe.
Para desativar temporariamente:

```env
START_RURAL_WORKER=false
```

Tambem e possivel rodar o worker em um segundo servico Railway usando:

```bash
npm run worker:rural
```

Isso so vale a pena se a fila KMZ crescer e voce quiser separar web e background.

## Matchmaking de leads

Antes do deploy, rode as migrations no Supabase para criar os campos de sugestoes no Kanban:

```bash
npm run run-migrations
```

O matchmaking funciona sem Groq usando ranking local. Com `GROQ_API_KEY`, a IA reordena os melhores candidatos antes de salvar no card do lead.

## Observacoes

- O Railway fornece `REDIS_URL` automaticamente no servico Redis.
- O codigo usa `family: 0` no `ioredis`, necessario para compatibilidade com a rede privada IPv6/IPv4 do Railway.
- O endpoint `/health` ja esta pronto para health checks.
