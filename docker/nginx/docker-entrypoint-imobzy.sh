#!/bin/sh
set -eu

SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxremNzYXlkcGNueXBkZXZvaWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTc5NDcsImV4cCI6MjA4OTA3Mzk0N30.R88M8kQu0HGjUZBTccAMT4uqQYxd1Zneq6tkcKWII3k"

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__IMOBZY_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-same-origin}",
  VITE_WHATSAPP_API_URL: "${VITE_WHATSAPP_API_URL:-/api/whatsapp}",
  VITE_WHATSAPP_WS_URL: "${VITE_WHATSAPP_WS_URL:-/api/whatsapp/ws}",
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL:-}",
  VITE_SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}",
  VITE_PANEL_URL: "${VITE_PANEL_URL:-}",
  VITE_PUBLIC_APP_URL: "${VITE_PUBLIC_APP_URL:-https://imobfluow.com.br}",
  VITE_PLATFORM_IP: "${VITE_PLATFORM_IP:-207.58.153.219}"
};
EOF

exec nginx -g "daemon off;"
