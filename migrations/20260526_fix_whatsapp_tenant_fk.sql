BEGIN;

ALTER TABLE whatsapp_instances
  DROP CONSTRAINT IF EXISTS whatsapp_instances_tenant_id_fkey;

-- Older WhatsApp rows stored auth user ids in tenant_id. The current API sends
-- organization ids, so migrate legacy rows before enforcing the correct FK.
UPDATE whatsapp_instances wi
SET tenant_id = p.organization_id
FROM profiles p
WHERE wi.tenant_id = p.id
  AND p.organization_id IS NOT NULL
  AND wi.tenant_id <> p.organization_id;

-- Keep rows that cannot be mapped to an organization, but make them valid for
-- the organization FK. They will stay hidden from tenant-scoped lists.
UPDATE whatsapp_instances wi
SET tenant_id = NULL
WHERE wi.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM organizations o
    WHERE o.id = wi.tenant_id
  );

ALTER TABLE whatsapp_instances
  ADD CONSTRAINT whatsapp_instances_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE;

COMMIT;
