#!/bin/bash

# Script de Migração Supabase - IMOBZY
# Executa as migrações SQL em ordem

set -e

echo "🔧 IMOBZY - Migração Supabase"
echo "=============================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não encontrado${NC}"
    echo "Instale: npm install -g @supabase/cli"
    echo ""
    echo "OU execute as migrações manualmente:"
    echo "1. Acesse https://app.supabase.com/"
    echo "2. SQL Editor"
    echo "3. Copie/cole os arquivos .sql em ordem"
    exit 1
fi

# Verificar login
echo "📋 Verificando autenticação Supabase..."
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Não autenticado${NC}"
    echo "Execute: supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Autenticado${NC}"
echo ""

# Obter ID do projeto
PROJECT_ID="ltrmgfdpqtvypsxeknyd"
echo "📍 Projeto: $PROJECT_ID"
echo ""

# Ordem de Migrações
MIGRATIONS=(
    "definitive_imobzy_schema.sql"
    "fix_role_and_permissions_v2.sql"
    "fix_rpc_final.sql"
    "fix_landing_pages_rls.sql"
    "setup_landing_pages.sql"
)

echo "📦 Migrações a executar:"
for i in "${!MIGRATIONS[@]}"; do
    echo "  $((i+1)). ${MIGRATIONS[$i]}"
done
echo ""

read -p "Continuar? (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Cancelado."
    exit 1
fi

echo ""

# Executar cada migração
for migration in "${MIGRATIONS[@]}"; do
    if [ ! -f "$migration" ]; then
        echo -e "${YELLOW}⚠️  Arquivo não encontrado: $migration${NC}"
        continue
    fi

    echo "▶️  Executando: $migration"

    # Executar SQL file
    if supabase db push < "$migration" 2>/dev/null; then
        echo -e "${GREEN}✅ Sucesso: $migration${NC}"
    else
        # Fallback - tentar com push
        supabase db execute --project-ref "$PROJECT_ID" < "$migration" || {
            echo -e "${YELLOW}⚠️  Erro ao executar: $migration${NC}"
            echo "   Você precisará executar manualmente via Web"
            echo "   https://app.supabase.com/project/$PROJECT_ID/sql/new"
        }
    fi
    echo ""
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Migrações Completadas!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Próximos passos:"
echo "1. Recarregue seu app (F5)"
echo "2. Faça login"
echo "3. Crie sua primeira organização"
echo ""
echo "Dashboard Supabase: https://app.supabase.com/project/$PROJECT_ID"
