#!/usr/bin/env bash
# Preflight — valida ambiente antes de promover para produção.
# Uso: npm run preflight
set -euo pipefail

FAIL=0
pass() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=1; }
info() { printf "\n\033[1m▸ %s\033[0m\n" "$1"; }

info "Variáveis de ambiente obrigatórias"
REQUIRED=(
  SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY
  JWT_SECRET SESSION_SECRET
)
for var in "${REQUIRED[@]}"; do
  if [ -n "${!var:-}" ]; then pass "$var"; else fail "$var ausente"; fi
done

info "Variáveis opcionais (observabilidade)"
for var in SENTRY_DSN VITE_SENTRY_DSN REDIS_URL; do
  if [ -n "${!var:-}" ]; then pass "$var"; else printf "  \033[33m•\033[0m %s não definida (funcionalidade degradada)\n" "$var"; fi
done

info "Auditoria de SDKs privados no bundle"
if npm run -s audit:ai-imports > /tmp/preflight-ai.log 2>&1; then
  pass "Nenhum SDK privado em src/"
else
  fail "SDKs privados detectados — ver /tmp/preflight-ai.log"
fi

info "RLS lint"
if [ -x scripts/rls-check.sh ]; then
  if npm run -s db:lint > /tmp/preflight-rls.log 2>&1; then
    pass "RLS OK"
  else
    fail "RLS reportou problemas — ver /tmp/preflight-rls.log"
  fi
else
  printf "  \033[33m•\033[0m scripts/rls-check.sh não encontrado (pular)\n"
fi

info "Build de produção"
if npm run -s build > /tmp/preflight-build.log 2>&1; then
  pass "Build ok"
else
  fail "Build falhou — ver /tmp/preflight-build.log"
fi

echo
if [ $FAIL -eq 0 ]; then
  echo -e "\033[32mPreflight OK — pronto para deploy.\033[0m"
  exit 0
else
  echo -e "\033[31mPreflight falhou. Corrija os itens acima antes do deploy.\033[0m"
  exit 1
fi
