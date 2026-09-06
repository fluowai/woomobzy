# Contexto atual

2026-09-06. Auditoria integral solicitada com correção, dados reais, validação e envio ao Git. Inventário: 184 rotas em seis grupos. Código do WooControl recebeu correções de autorização e indicadores; os demais defeitos encontrados estão no plano de execução.

Nesta data foi executado o envio ao Git: commit `d261289` (licenças + rede de revendas) pushado a `origin/main` do repositório `fluowai/woomobzy`. O banco (Supabase remoto) foi verificado: acessível via `DATABASE_URL`, schema Woo completo (`woo_licenses`, `woo_products` etc.) compatível com o `server/lib/license-manager.js`, policies de `site_texts` e `organizations` presentes. `npm run check-db` mostra 401 em perfis/imóveis/leads apenas por RLS (esperado); não falta schema.

O sistema integral permanece não homologado: mocks ainda existem e todas as credenciais E2E dos seis perfis estão ausentes. Não confundir ausência de acesso público com ausência de schema. Resultados de testes em VERIFY.md.