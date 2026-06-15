#!/bin/sh
set -eu

DEFAULT_CONFIG=/opt/imobzy/env-config.default.js

read_default_config() {
  key="$1"
  sed -n "s/.*${key}: [\"']\([^\"']*\)[\"'].*/\1/p" "$DEFAULT_CONFIG" | head -n 1
}

supabase_url="${VITE_SUPABASE_URL:-}"
supabase_anon_key="${VITE_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY:-}}"
runtime_supabase_config_provided=0

if [ -n "$supabase_url" ] || [ -n "$supabase_anon_key" ]; then
  runtime_supabase_config_provided=1
fi

if [ -f "$DEFAULT_CONFIG" ]; then
  default_supabase_url="$(read_default_config VITE_SUPABASE_URL)"
  default_supabase_anon_key="$(read_default_config VITE_SUPABASE_ANON_KEY)"
else
  default_supabase_url=""
  default_supabase_anon_key=""
fi

validate_supabase_config() {
  url="$1"
  key="$2"

  [ -n "$url" ] && [ -n "$key" ] || return 1

  wget -qO /dev/null \
    --timeout=10 \
    --header="apikey: $key" \
    --header="Authorization: Bearer $key" \
    "$url/rest/v1/site_texts?select=key&limit=1"
}

if [ "$runtime_supabase_config_provided" -eq 1 ] && ! validate_supabase_config "$supabase_url" "$supabase_anon_key"; then
  echo "WARNING: runtime Supabase validation failed; starting frontend with provided public config." >&2
fi

if [ "$runtime_supabase_config_provided" -eq 0 ] && ! validate_supabase_config "$supabase_url" "$supabase_anon_key"; then
  if validate_supabase_config "$default_supabase_url" "$default_supabase_anon_key"; then
    echo "WARNING: runtime Supabase credentials are missing; using packaged public credentials." >&2
    supabase_url="$default_supabase_url"
    supabase_anon_key="$default_supabase_anon_key"
  else
    echo "WARNING: no valid public Supabase credentials were validated; starting frontend with available config." >&2
    supabase_url="${supabase_url:-$default_supabase_url}"
    supabase_anon_key="${supabase_anon_key:-$default_supabase_anon_key}"
  fi
fi

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__IMOBZY_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-same-origin}",
  VITE_WHATSAPP_API_URL: "${VITE_WHATSAPP_API_URL:-/api/whatsapp}",
  VITE_WHATSAPP_WS_URL: "${VITE_WHATSAPP_WS_URL:-/api/whatsapp/ws}",
  VITE_SUPABASE_URL: "${supabase_url}",
  VITE_SUPABASE_ANON_KEY: "${supabase_anon_key}",
  VITE_PANEL_URL: "${VITE_PANEL_URL:-}",
  VITE_PUBLIC_APP_URL: "${VITE_PUBLIC_APP_URL:-https://imobfluow.com.br}",
  VITE_PLATFORM_IP: "${VITE_PLATFORM_IP:-207.58.153.219}"
};
EOF

exec nginx -g "daemon off;"
