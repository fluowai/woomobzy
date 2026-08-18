-- Forensic storage/database audit for IMOBZY.
-- Read-only queries. Run with a database user that can see pg_catalog and public tables.

-- 1. Database size and 50 largest tables.
SELECT
  pg_size_pretty(pg_database_size(current_database())) AS database_size;

SELECT
  schemaname,
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_toast_size,
  n_live_tup AS estimated_rows
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 50;

-- 2. WhatsApp media by tenant/type/status.
SELECT
  tenant_id,
  type,
  status,
  COUNT(*) AS media_count,
  pg_size_pretty(SUM(COALESCE(size_bytes, 0))::bigint) AS known_size,
  SUM(COALESCE(size_bytes, 0))::bigint AS known_size_bytes,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM public.whatsapp_media
GROUP BY tenant_id, type, status
ORDER BY known_size_bytes DESC, media_count DESC;

-- 3. WhatsApp messages with media URL but no media registry row.
SELECT
  COUNT(*) AS messages_missing_media_row
FROM public.whatsapp_messages m
LEFT JOIN public.whatsapp_media wm ON wm.message_id = m.id
WHERE m.type IN ('image', 'audio', 'video', 'document', 'sticker')
  AND COALESCE(m.media_url, '') <> ''
  AND wm.id IS NULL;

-- 4. Media registry rows without object key.
SELECT
  tenant_id,
  type,
  status,
  COUNT(*) AS rows_without_object_key
FROM public.whatsapp_media
WHERE COALESCE(object_key, '') = ''
GROUP BY tenant_id, type, status
ORDER BY rows_without_object_key DESC;

-- 5. Duplicate candidates by public URL/object key.
SELECT
  bucket,
  object_key,
  public_url,
  COUNT(*) AS references
FROM public.whatsapp_media
WHERE COALESCE(object_key, '') <> '' OR COALESCE(public_url, '') <> ''
GROUP BY bucket, object_key, public_url
HAVING COUNT(*) > 1
ORDER BY references DESC
LIMIT 100;

-- 6. Base64/data URL stored in known media-bearing tables.
SELECT 'organizations.logo_url' AS location, COUNT(*) AS matches
FROM public.organizations
WHERE logo_url ILIKE 'data:%base64,%'
UNION ALL
SELECT 'profiles.avatar_url', COUNT(*)
FROM public.profiles
WHERE avatar_url ILIKE 'data:%base64,%'
UNION ALL
SELECT 'site_settings.logo_url', COUNT(*)
FROM public.site_settings
WHERE logo_url ILIKE 'data:%base64,%'
UNION ALL
SELECT 'properties.images', COUNT(*)
FROM public.properties
WHERE EXISTS (
  SELECT 1 FROM unnest(images) AS image_url WHERE image_url ILIKE 'data:%base64,%'
);

-- 7. Large rows in flexible content tables.
SELECT
  'landing_pages.content' AS location,
  id,
  organization_id,
  pg_column_size(content) AS bytes
FROM public.landing_pages
WHERE pg_column_size(content) > 100 * 1024
ORDER BY bytes DESC
LIMIT 50;

SELECT
  'site_texts.value' AS location,
  id,
  organization_id,
  pg_column_size(value) AS bytes
FROM public.site_texts
WHERE pg_column_size(value) > 100 * 1024
ORDER BY bytes DESC
LIMIT 50;

-- 8. Property image references by tenant.
SELECT
  organization_id,
  COUNT(*) AS property_count,
  SUM(COALESCE(array_length(images, 1), 0)) AS image_references
FROM public.properties
GROUP BY organization_id
ORDER BY image_references DESC NULLS LAST;

-- 9. Daily WhatsApp media creation rate.
SELECT
  date_trunc('day', created_at)::date AS day,
  tenant_id,
  type,
  COUNT(*) AS media_count,
  SUM(COALESCE(size_bytes, 0))::bigint AS known_size_bytes
FROM public.whatsapp_media
GROUP BY day, tenant_id, type
ORDER BY day DESC, media_count DESC;

-- 10. Tables with columns likely to hold payload/log data.
SELECT
  table_schema,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name ILIKE '%payload%'
    OR column_name ILIKE '%metadata%'
    OR column_name ILIKE '%raw%'
    OR column_name ILIKE '%log%'
    OR column_name ILIKE '%response%'
    OR column_name ILIKE '%request%'
  )
ORDER BY table_name, column_name;
