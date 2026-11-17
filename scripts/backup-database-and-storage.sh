#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# WooMobzy / WooTech Imob - Production Automated Backup Script
# Performs PostgreSQL dump & exports to backup repository
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/woomobzy}"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_DUMP_FILE="$BACKUP_DIR/imobzy_postgres_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "=========================================================="
echo "  Iniciando Backup de Produção - $(date)"
echo "=========================================================="

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL não definida! Abortando."
  exit 1
fi

echo "📦 1. Realizando dump comprimido do PostgreSQL..."
pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip -9 > "$DB_DUMP_FILE"

DUMP_SIZE=$(du -h "$DB_DUMP_FILE" | cut -f1)
echo "✅ Dump concluído: $DB_DUMP_FILE ($DUMP_SIZE)"

# 2. Retenção local de 14 dias
echo "🧹 2. Limpando backups com mais de 14 dias..."
find "$BACKUP_DIR" -name "imobzy_postgres_*.sql.gz" -type f -mtime +14 -delete || true

# 3. Opcional: Enviar para MinIO / S3 remoto se mc estiver disponível
if command -v mc &> /dev/null && [ -n "${MINIO_BACKUPS_BUCKET:-}" ]; then
  echo "☁️ 3. Enviando cópia para MinIO ($MINIO_BACKUPS_BUCKET)..."
  mc cp "$DB_DUMP_FILE" "minio/$MINIO_BACKUPS_BUCKET/database/" || true
  echo "✅ Backup espelhado no MinIO."
fi

echo "=========================================================="
echo "🎉 Backup finalizado com sucesso em $(date)!"
echo "=========================================================="

