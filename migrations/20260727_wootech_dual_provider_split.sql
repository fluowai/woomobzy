-- ============================================================================
-- WooTech Dual Provider Split
-- Separa tabelas WhatsApp: whatsapp_* (WooTech 1 / whatsmeow) e
--                          wt2_whatsapp_* (WooTech 2 / WAHA)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Garantir coluna provider na whatsapp_instances (WooTech 1)
-- ============================================================================

ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'whatsmeow';

UPDATE public.whatsapp_instances SET provider = 'whatsmeow' WHERE provider IS NULL;

-- ============================================================================
-- 2. Tabelas WooTech 2 (WAHA) — espelho das tabelas WhatsApp
-- ============================================================================

-- 2.1 wt2_whatsapp_instances
CREATE TABLE IF NOT EXISTS public.wt2_whatsapp_instances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  status      VARCHAR(50) NOT NULL DEFAULT 'disconnected'
                CHECK (status IN ('connected','disconnected','connecting','qr_pending')),
  qr_code     TEXT,
  phone       VARCHAR(20),
  jid         VARCHAR(100),
  provider    TEXT NOT NULL DEFAULT 'waha',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- 2.2 wt2_whatsapp_contacts
CREATE TABLE IF NOT EXISTS public.wt2_whatsapp_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID NOT NULL REFERENCES public.wt2_whatsapp_instances(id) ON DELETE CASCADE,
  phone             VARCHAR(20) NOT NULL,
  push_name         VARCHAR(255),
  display_name      VARCHAR(255) NOT NULL,
  avatar_url        TEXT,
  tenant_id         UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  canonical_jid     TEXT,
  lid_jid           TEXT,
  phone_e164        TEXT,
  business_name     TEXT,
  manual_name       TEXT,
  resolved_display_name TEXT,
  avatar_bucket     TEXT,
  avatar_object_key TEXT,
  avatar_status     TEXT NOT NULL DEFAULT 'unknown',
  avatar_refreshed_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, phone)
);

-- 2.3 wt2_whatsapp_chats
CREATE TABLE IF NOT EXISTS public.wt2_whatsapp_chats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     UUID NOT NULL REFERENCES public.wt2_whatsapp_instances(id) ON DELETE CASCADE,
  chat_jid        VARCHAR(100) NOT NULL,
  name            VARCHAR(255) NOT NULL DEFAULT '',
  is_group        BOOLEAN NOT NULL DEFAULT FALSE,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count    INTEGER NOT NULL DEFAULT 0,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, chat_jid)
);

-- 2.4 wt2_whatsapp_messages
CREATE TABLE IF NOT EXISTS public.wt2_whatsapp_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID NOT NULL REFERENCES public.wt2_whatsapp_instances(id) ON DELETE CASCADE,
  chat_id           UUID NOT NULL REFERENCES public.wt2_whatsapp_chats(id) ON DELETE CASCADE,
  message_id        VARCHAR(255) NOT NULL,
  sender_phone      VARCHAR(20) NOT NULL,
  sender_name       VARCHAR(255) NOT NULL DEFAULT '',
  is_from_me        BOOLEAN NOT NULL DEFAULT FALSE,
  is_group          BOOLEAN NOT NULL DEFAULT FALSE,
  type              VARCHAR(50) NOT NULL DEFAULT 'text'
                      CHECK (type IN ('text','image','audio','video','document','sticker','location','contact','unknown')),
  content           TEXT,
  media_url         TEXT,
  media_mimetype    VARCHAR(100),
  media_filename    VARCHAR(255),
  media_status      TEXT NOT NULL DEFAULT 'none'
                      CHECK (media_status IN ('none','pending','downloading','processing','ready','failed','expired')),
  media_error       TEXT,
  media_retry_count INTEGER NOT NULL DEFAULT 0,
  quoted_message_id VARCHAR(255),
  delivery_status   TEXT,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, message_id)
);

-- 2.5 wt2_whatsapp_media
CREATE TABLE IF NOT EXISTS public.wt2_whatsapp_media (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id            UUID NOT NULL REFERENCES public.wt2_whatsapp_messages(id) ON DELETE CASCADE,
  instance_id           UUID NOT NULL REFERENCES public.wt2_whatsapp_instances(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL,
  provider              TEXT NOT NULL DEFAULT 'minio',
  bucket                TEXT NOT NULL DEFAULT 'whatsapp-media',
  object_key            TEXT NOT NULL DEFAULT '',
  public_url            TEXT,
  filename              TEXT,
  mime_type             TEXT,
  size_bytes            BIGINT,
  width                 INTEGER,
  height                INTEGER,
  duration_ms           INTEGER,
  thumbnail_url         TEXT,
  thumbnail_bucket      TEXT,
  thumbnail_object_key  TEXT,
  waveform              JSONB,
  transcription         TEXT,
  summary               TEXT,
  sentiment             TEXT,
  extracted_tasks       JSONB,
  ocr_text              TEXT,
  ai_metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','downloading','processing','ready','failed','expired')),
  retry_count           INTEGER NOT NULL DEFAULT 0,
  last_error            TEXT,
  next_retry_at         TIMESTAMPTZ,
  claimed_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wt2_whatsapp_media_type_check
    CHECK (type IN ('image','audio','video','document','sticker','unknown')),
  CONSTRAINT wt2_whatsapp_media_status_check
    CHECK (status IN ('pending','downloading','processing','ready','failed','expired'))
);

-- 2.6 wt2_whatsapp_message_status
CREATE TABLE IF NOT EXISTS public.wt2_whatsapp_message_status (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id            UUID NOT NULL REFERENCES public.wt2_whatsapp_messages(id) ON DELETE CASCADE,
  instance_id           UUID NOT NULL REFERENCES public.wt2_whatsapp_instances(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_message_id   TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('sent','delivered','read','played','failed')),
  participant_jid       TEXT,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. Índices para WooTech 2
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wt2_instances_tenant ON public.wt2_whatsapp_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wt2_instances_status ON public.wt2_whatsapp_instances(status);

CREATE INDEX IF NOT EXISTS idx_wt2_contacts_instance ON public.wt2_whatsapp_contacts(instance_id);
CREATE INDEX IF NOT EXISTS idx_wt2_contacts_phone ON public.wt2_whatsapp_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_wt2_contacts_tenant_phone ON public.wt2_whatsapp_contacts(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_wt2_contacts_tenant_phone_e164 ON public.wt2_whatsapp_contacts(tenant_id, phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wt2_contacts_instance_canonical ON public.wt2_whatsapp_contacts(instance_id, canonical_jid) WHERE canonical_jid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wt2_chats_instance ON public.wt2_whatsapp_chats(instance_id);
CREATE INDEX IF NOT EXISTS idx_wt2_chats_jid ON public.wt2_whatsapp_chats(chat_jid);
CREATE INDEX IF NOT EXISTS idx_wt2_chats_last_msg ON public.wt2_whatsapp_chats(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_wt2_messages_chat ON public.wt2_whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_wt2_messages_instance ON public.wt2_whatsapp_messages(instance_id);
CREATE INDEX IF NOT EXISTS idx_wt2_messages_timestamp ON public.wt2_whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wt2_messages_sender ON public.wt2_whatsapp_messages(sender_phone);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wt2_media_message_unique ON public.wt2_whatsapp_media(message_id);
CREATE INDEX IF NOT EXISTS idx_wt2_media_instance_status ON public.wt2_whatsapp_media(instance_id, status);
CREATE INDEX IF NOT EXISTS idx_wt2_media_tenant_type_created ON public.wt2_whatsapp_media(tenant_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wt2_media_status_retry ON public.wt2_whatsapp_media(status, retry_count, updated_at);
CREATE INDEX IF NOT EXISTS idx_wt2_media_tenant_bucket_object ON public.wt2_whatsapp_media(tenant_id, bucket, object_key) WHERE object_key <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_wt2_message_status_unique
  ON public.wt2_whatsapp_message_status(instance_id, whatsapp_message_id, status, COALESCE(participant_jid, ''));
CREATE INDEX IF NOT EXISTS idx_wt2_message_status_tenant_time ON public.wt2_whatsapp_message_status(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_wt2_message_status_message ON public.wt2_whatsapp_message_status(message_id, occurred_at DESC);

-- ============================================================================
-- 4. RLS para WooTech 2
-- ============================================================================

ALTER TABLE public.wt2_whatsapp_instances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wt2_whatsapp_contacts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wt2_whatsapp_chats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wt2_whatsapp_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wt2_whatsapp_media        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wt2_whatsapp_message_status ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on wt2 instances"
  ON public.wt2_whatsapp_instances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on wt2 contacts"
  ON public.wt2_whatsapp_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on wt2 chats"
  ON public.wt2_whatsapp_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on wt2 messages"
  ON public.wt2_whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on wt2 media"
  ON public.wt2_whatsapp_media FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role full access on wt2 message status"
  ON public.wt2_whatsapp_message_status FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Tenant isolation
CREATE POLICY "Tenant isolation wt2 instances"
  ON public.wt2_whatsapp_instances FOR ALL
  USING (tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Tenant isolation wt2 contacts"
  ON public.wt2_whatsapp_contacts FOR ALL
  USING (tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Tenant isolation wt2 chats"
  ON public.wt2_whatsapp_chats FOR ALL
  USING (instance_id IN (
    SELECT id FROM public.wt2_whatsapp_instances
    WHERE tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
  ))
  WITH CHECK (instance_id IN (
    SELECT id FROM public.wt2_whatsapp_instances
    WHERE tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
  ));

CREATE POLICY "Tenant isolation wt2 messages"
  ON public.wt2_whatsapp_messages FOR ALL
  USING (chat_id IN (
    SELECT id FROM public.wt2_whatsapp_chats WHERE instance_id IN (
      SELECT id FROM public.wt2_whatsapp_instances
      WHERE tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  ))
  WITH CHECK (chat_id IN (
    SELECT id FROM public.wt2_whatsapp_chats WHERE instance_id IN (
      SELECT id FROM public.wt2_whatsapp_instances
      WHERE tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  ));

CREATE POLICY "Tenant isolation wt2 media"
  ON public.wt2_whatsapp_media FOR ALL
  USING (tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Tenant isolation wt2 message status"
  ON public.wt2_whatsapp_message_status FOR ALL
  USING (tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

-- ============================================================================
-- 5. Triggers para updated_at automático
-- ============================================================================

CREATE OR REPLACE FUNCTION public.touch_wt2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wt2_instances_updated ON public.wt2_whatsapp_instances;
CREATE TRIGGER trg_wt2_instances_updated BEFORE UPDATE ON public.wt2_whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.touch_wt2_updated_at();

DROP TRIGGER IF EXISTS trg_wt2_contacts_updated ON public.wt2_whatsapp_contacts;
CREATE TRIGGER trg_wt2_contacts_updated BEFORE UPDATE ON public.wt2_whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_wt2_updated_at();

DROP TRIGGER IF EXISTS trg_wt2_chats_updated ON public.wt2_whatsapp_chats;
CREATE TRIGGER trg_wt2_chats_updated BEFORE UPDATE ON public.wt2_whatsapp_chats
  FOR EACH ROW EXECUTE FUNCTION public.touch_wt2_updated_at();

DROP TRIGGER IF EXISTS trg_wt2_media_updated ON public.wt2_whatsapp_media;
CREATE TRIGGER trg_wt2_media_updated BEFORE UPDATE ON public.wt2_whatsapp_media
  FOR EACH ROW EXECUTE FUNCTION public.touch_wt2_updated_at();

COMMIT;
