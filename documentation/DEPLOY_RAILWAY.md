# Deploy no Railway

Este projeto roda no Railway como uma API Node/Express usando Nixpacks.

## Servico recomendado

1. API principal
   - Repositorio: este projeto
   - Build: Nixpacks
   - Start command: `npm start`

## Variaveis obrigatorias na API

Configure em `Variables` no servico da API:

```env
NODE_ENV=production
PORT=3002
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
GROQ_API_KEY=...
GROQ_MATCH_MODEL=llama-3.1-8b-instant
```

## Analise rural

A analise rural de KMZ roda em segundo plano dentro da propria API. O deploy nao precisa de Redis
nem worker separado.

## Matchmaking de leads

Antes do deploy, rode as migrations no Supabase para criar os campos de sugestoes no Kanban:

```bash
npm run run-migrations
```

O matchmaking funciona sem Groq usando ranking local. Com `GROQ_API_KEY`, a IA reordena os melhores candidatos antes de salvar no card do lead.

## Observacoes

- O endpoint `/health` ja esta pronto para health checks.
