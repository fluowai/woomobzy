#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# WooMobzy / WooTech Imob - Production Host Setup Script
# Host: 207.58.153.219 (or target production VPS)
# ==============================================================================

echo "=========================================================="
echo "  Configurando Host de Produção para WooMobzy"
echo "=========================================================="

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker não encontrado! Instale o Docker antes de prosseguir."
  exit 1
fi
echo "✅ Docker instalado: $(docker --version)"

# 2. Criar rede externa woopanel1 (compartilhada com Traefik de borda)
if docker network inspect woopanel1 >/dev/null 2>&1; then
  echo "✅ Rede Docker 'woopanel1' já existe."
else
  echo "⚙️ Criando rede externa 'woopanel1'..."
  docker network create --driver bridge woopanel1
  echo "✅ Rede 'woopanel1' criada com sucesso."
fi

# 3. Criar volume compartilhado imobzy_traefik_dynamic
if docker volume inspect imobzy_traefik_dynamic >/dev/null 2>&1; then
  echo "✅ Volume 'imobzy_traefik_dynamic' já existe."
else
  echo "⚙️ Criando volume externo 'imobzy_traefik_dynamic'..."
  docker volume create imobzy_traefik_dynamic
  echo "✅ Volume 'imobzy_traefik_dynamic' criado com sucesso."
fi

# 4. Criar volumes persistentes para serviços
for vol in whatsapp_sessions rabbitmq_data_v4; do
  if docker volume inspect "$vol" >/dev/null 2>&1; then
    echo "✅ Volume '$vol' já existe."
  else
    echo "⚙️ Criando volume '$vol'..."
    docker volume create "$vol"
    echo "✅ Volume '$vol' criado."
  fi
done

# 5. Ajustar limites de sistema do Linux para alta concorrência
echo "⚙️ Ajustando limites de arquivos abertos (ulimits)..."
sysctl -w fs.file-max=2097152 >/dev/null 2>&1 || true
sysctl -w vm.max_map_count=262144 >/dev/null 2>&1 || true

echo "=========================================================="
echo "✅ Host pronto para receber o deploy via Portainer Stack!"
echo "   Utilize o arquivo: portainer-stack.yml"
echo "=========================================================="

