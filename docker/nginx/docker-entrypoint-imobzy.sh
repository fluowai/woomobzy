#!/bin/sh
set -eu

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__IMOBZY_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-same-origin}",
  VITE_WHATSAPP_API_URL: "${VITE_WHATSAPP_API_URL:-/api/whatsapp}",
  VITE_WHATSAPP_WS_URL: "${VITE_WHATSAPP_WS_URL:-/api/whatsapp/ws}",
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL:-}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY:-}",
  VITE_PANEL_URL: "${VITE_PANEL_URL:-}"
};
EOF

exec nginx -g "daemon off;"
