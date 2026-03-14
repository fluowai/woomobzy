#!/bin/bash

# IMOBZY - Supabase CLI Migration Script
# Execute this to migrate directly via Supabase CLI

echo "🔧 IMOBZY - Instalando Supabase CLI..."
npm install -g @supabase/cli

echo ""
echo "🔗 Fazendo login no Supabase..."
supabase login

echo ""
echo "🔗 Linkando seu projeto..."
# Extract project ref from URL
PROJECT_REF=$(grep VITE_SUPABASE_URL .env | cut -d'=' -f2 | sed 's/https:\/\/\(.*\)\.supabase\.co/\1/')

echo "Detectado projeto: $PROJECT_REF"
supabase link --project-ref $PROJECT_REF

echo ""
echo "📂 Executando migrações..."
supabase db push

echo ""
echo "✅ Pronto! Seu banco está atualizado."
echo ""
echo "Próximos passos:"
echo "1. npm run dev"
echo "2. Vá para http://localhost:3005"
echo "3. Recarregue (F5)"
