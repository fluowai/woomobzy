#!/usr/bin/env sh
set -eu

SERVICE="${1:-imobfluow_whatsapp-service}"
REQUIRED_ENVS="SUPABASE_DB_URL DATABASE_URL WHATSAPP_SERVICE_TOKEN WHATSAPP_INTERNAL_TOKEN MINIO_ENDPOINT MINIO_ACCESS_KEY MINIO_SECRET_KEY MINIO_WHATSAPP_BUCKET"

echo "== Service =="
docker service inspect "$SERVICE" --format 'Name: {{.Spec.Name}}'
docker service inspect "$SERVICE" --format 'Image: {{.Spec.TaskTemplate.ContainerSpec.Image}}'

echo
echo "== Tasks =="
docker service ps "$SERVICE" --no-trunc

echo
echo "== Environment presence =="
env_lines="$(docker service inspect "$SERVICE" --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' || true)"
if [ -z "$env_lines" ]; then
  echo "No service environment variables found."
else
  printf '%s\n' "$env_lines" | sed 's/=.*$/=<set>/'
fi

missing=""
for name in $REQUIRED_ENVS; do
  if ! printf '%s\n' "$env_lines" | grep -q "^${name}="; then
    missing="${missing} ${name}"
  fi
done

echo
echo "== Recent logs =="
docker service logs "$SERVICE" --tail 120 || true

echo
echo "== Diagnosis =="
if [ -n "$missing" ]; then
  echo "Missing required environment variables:${missing}"
  echo "Redeploy the Portainer stack with the full whatsapp-service.environment block."
else
  echo "Required environment variables are present in the Swarm service spec."
  echo "If the service still exits, inspect the fatal line above. Common causes are an invalid Postgres URL or storage config."
fi
