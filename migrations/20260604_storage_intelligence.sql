-- Storage Intelligence / MinIO Auditor
-- Inventory, deduplication metadata and protected admin action logs.

CREATE TABLE IF NOT EXISTS public.storage_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    bucket TEXT NOT NULL,
    object_key TEXT NOT NULL,
    sha256 TEXT,
    etag TEXT,
    size_bytes BIGINT,
    mime_type TEXT,
    source TEXT,
    entity_type TEXT,
    entity_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT storage_objects_bucket_key_unique UNIQUE (bucket, object_key)
);

CREATE INDEX IF NOT EXISTS idx_storage_objects_tenant_bucket
  ON public.storage_objects(tenant_id, bucket);

CREATE INDEX IF NOT EXISTS idx_storage_objects_sha256
  ON public.storage_objects(tenant_id, bucket, sha256)
  WHERE sha256 IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_storage_objects_size
  ON public.storage_objects(size_bytes DESC);

CREATE INDEX IF NOT EXISTS idx_storage_objects_expires
  ON public.storage_objects(expires_at)
  WHERE expires_at IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.storage_inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket TEXT NOT NULL,
    object_key TEXT NOT NULL,
    size_bytes BIGINT,
    etag TEXT,
    extension TEXT,
    prefix TEXT,
    tenant_id TEXT,
    is_version BOOLEAN DEFAULT false,
    version_id TEXT,
    is_delete_marker BOOLEAN DEFAULT false,
    last_modified TIMESTAMPTZ,
    scanned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_inventory_scanned
  ON public.storage_inventory_snapshots(scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_storage_inventory_bucket_key
  ON public.storage_inventory_snapshots(bucket, object_key);

CREATE INDEX IF NOT EXISTS idx_storage_inventory_tenant
  ON public.storage_inventory_snapshots(tenant_id);

CREATE TABLE IF NOT EXISTS public.storage_admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    bucket TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_admin_actions_created
  ON public.storage_admin_actions(created_at DESC);

ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on storage objects" ON public.storage_objects;
CREATE POLICY "Service role full access on storage objects"
  ON public.storage_objects
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on storage snapshots" ON public.storage_inventory_snapshots;
CREATE POLICY "Service role full access on storage snapshots"
  ON public.storage_inventory_snapshots
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on storage actions" ON public.storage_admin_actions;
CREATE POLICY "Service role full access on storage actions"
  ON public.storage_admin_actions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
