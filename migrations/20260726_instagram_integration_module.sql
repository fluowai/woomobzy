-- Instagram integration module foundation.
-- Two-service architecture: Node.js service (port 3200) + Python worker (port 8000).
-- All tables are company_id-isolated via RLS with service_role bypass.

-- ============================================================
-- 1. instagram_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  instagram_user_id TEXT,
  display_name TEXT,
  profile_picture_url TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,
  is_business_account BOOLEAN DEFAULT false,
  business_category TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  credentials_encrypted TEXT,
  device_json JSONB DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT instagram_accounts_status_check
    CHECK (status IN ('pending', 'connecting', 'active', 'challenge_required', 'login_required', 'error', 'disabled')),
  CONSTRAINT instagram_accounts_username_unique
    UNIQUE (company_id, username)
);

CREATE INDEX IF NOT EXISTS idx_instagram_accounts_company_id
  ON public.instagram_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_status
  ON public.instagram_accounts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_instagram_user_id
  ON public.instagram_accounts(instagram_user_id);

-- ============================================================
-- 2. instagram_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instagram_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  session_data_encrypted TEXT NOT NULL,
  device_info JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT true,
  invalidation_reason TEXT,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT instagram_sessions_session_id_unique
    UNIQUE (account_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_sessions_account_id
  ON public.instagram_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_sessions_company_valid
  ON public.instagram_sessions(company_id, is_valid)
  WHERE is_valid = true;
CREATE INDEX IF NOT EXISTS idx_instagram_sessions_expires_at
  ON public.instagram_sessions(expires_at)
  WHERE is_valid = true;

-- ============================================================
-- 3. instagram_contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instagram_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  username TEXT,
  full_name TEXT,
  profile_picture_url TEXT,
  is_business BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  follower_count INTEGER,
  bio TEXT,
  lead_score INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT instagram_contacts_unique
    UNIQUE (company_id, account_id, instagram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_contacts_company_id
  ON public.instagram_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_instagram_contacts_account_id
  ON public.instagram_contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_contacts_username
  ON public.instagram_contacts(company_id, username);
CREATE INDEX IF NOT EXISTS idx_instagram_contacts_lead_score
  ON public.instagram_contacts(company_id, lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_contacts_last_message
  ON public.instagram_contacts(company_id, last_message_at DESC);

-- ============================================================
-- 4. instagram_conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instagram_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.instagram_contacts(id) ON DELETE CASCADE,
  thread_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'normal',
  unread_count INTEGER DEFAULT 0,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT instagram_conversations_status_check
    CHECK (status IN ('open', 'pending', 'resolved', 'archived')),
  CONSTRAINT instagram_conversations_priority_check
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_company_id
  ON public.instagram_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_account_status
  ON public.instagram_conversations(account_id, status);
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_contact_id
  ON public.instagram_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_assigned
  ON public.instagram_conversations(company_id, assigned_to)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_last_message
  ON public.instagram_conversations(company_id, last_message_at DESC);

-- ============================================================
-- 5. instagram_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instagram_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.instagram_conversations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.instagram_contacts(id) ON DELETE CASCADE,
  instagram_message_id TEXT,
  direction TEXT NOT NULL DEFAULT 'inbound',
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  media_size_bytes BIGINT,
  caption TEXT,
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  sent_by_automation BOOLEAN DEFAULT false,
  automation_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT instagram_messages_direction_check
    CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT instagram_messages_type_check
    CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'sticker', 'carousel', 'reaction', 'system')),
  CONSTRAINT instagram_messages_instagram_id_unique
    UNIQUE (instagram_message_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_messages_company_id
  ON public.instagram_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_conversation_id
  ON public.instagram_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_account_id
  ON public.instagram_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_contact_id
  ON public.instagram_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_direction
  ON public.instagram_messages(conversation_id, direction, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_sent_at
  ON public.instagram_messages(company_id, sent_at DESC);

-- ============================================================
-- 6. instagram_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instagram_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  body TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  buttons JSONB DEFAULT '[]'::jsonb,
  variables JSONB DEFAULT '[]'::jsonb,
  is_approved BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT instagram_templates_category_check
    CHECK (category IN ('general', 'followup', 'proposal', 'closing', 'support', 'custom'))
);

CREATE INDEX IF NOT EXISTS idx_instagram_templates_company_id
  ON public.instagram_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_instagram_templates_account_id
  ON public.instagram_templates(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_templates_category
  ON public.instagram_templates(company_id, category);
CREATE INDEX IF NOT EXISTS idx_instagram_templates_name
  ON public.instagram_templates(company_id, name);

-- ============================================================
-- 7. instagram_templates_variables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instagram_templates_variables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.instagram_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  variable_name TEXT NOT NULL,
  variable_type TEXT NOT NULL DEFAULT 'text',
  default_value TEXT,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT instagram_templates_variables_type_check
    CHECK (variable_type IN ('text', 'number', 'date', 'contact_field', 'property_field')),
  CONSTRAINT instagram_templates_variables_unique
    UNIQUE (template_id, variable_name)
);

CREATE INDEX IF NOT EXISTS idx_instagram_templates_variables_template_id
  ON public.instagram_templates_variables(template_id);

-- ============================================================
-- 8. instagram_broadcast_groups
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instagram_broadcast_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filter_criteria JSONB DEFAULT '{}'::jsonb,
  recipient_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  template_id UUID REFERENCES public.instagram_templates(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT instagram_broadcast_groups_status_check
    CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'paused', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_groups_company_id
  ON public.instagram_broadcast_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_groups_account_status
  ON public.instagram_broadcast_groups(account_id, status);
CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_groups_scheduled
  ON public.instagram_broadcast_groups(scheduled_at)
  WHERE status = 'scheduled';

-- ============================================================
-- 9. instagram_broadcast_recipients
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instagram_broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_group_id UUID NOT NULL REFERENCES public.instagram_broadcast_groups(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.instagram_contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT instagram_broadcast_recipients_status_check
    CHECK (status IN ('pending', 'sending', 'sent', 'delivered', 'read', 'failed')),
  CONSTRAINT instagram_broadcast_recipients_unique
    UNIQUE (broadcast_group_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_recipients_group_id
  ON public.instagram_broadcast_recipients(broadcast_group_id);
CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_recipients_contact_id
  ON public.instagram_broadcast_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_recipients_status
  ON public.instagram_broadcast_recipients(broadcast_group_id, status);
CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_recipients_company_id
  ON public.instagram_broadcast_recipients(company_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_instagram_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_instagram_accounts_updated_at ON public.instagram_accounts;
CREATE TRIGGER trg_touch_instagram_accounts_updated_at
  BEFORE UPDATE ON public.instagram_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_instagram_updated_at();

DROP TRIGGER IF EXISTS trg_touch_instagram_sessions_updated_at ON public.instagram_sessions;
CREATE TRIGGER trg_touch_instagram_sessions_updated_at
  BEFORE UPDATE ON public.instagram_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_instagram_updated_at();

DROP TRIGGER IF EXISTS trg_touch_instagram_contacts_updated_at ON public.instagram_contacts;
CREATE TRIGGER trg_touch_instagram_contacts_updated_at
  BEFORE UPDATE ON public.instagram_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_instagram_updated_at();

DROP TRIGGER IF EXISTS trg_touch_instagram_conversations_updated_at ON public.instagram_conversations;
CREATE TRIGGER trg_touch_instagram_conversations_updated_at
  BEFORE UPDATE ON public.instagram_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_instagram_updated_at();

DROP TRIGGER IF EXISTS trg_touch_instagram_messages_updated_at ON public.instagram_messages;
CREATE TRIGGER trg_touch_instagram_messages_updated_at
  BEFORE UPDATE ON public.instagram_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_instagram_updated_at();

DROP TRIGGER IF EXISTS trg_touch_instagram_templates_updated_at ON public.instagram_templates;
CREATE TRIGGER trg_touch_instagram_templates_updated_at
  BEFORE UPDATE ON public.instagram_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_instagram_updated_at();

DROP TRIGGER IF EXISTS trg_touch_instagram_broadcast_groups_updated_at ON public.instagram_broadcast_groups;
CREATE TRIGGER trg_touch_instagram_broadcast_groups_updated_at
  BEFORE UPDATE ON public.instagram_broadcast_groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_instagram_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- instagram_accounts
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on instagram accounts" ON public.instagram_accounts;
CREATE POLICY "Service role full access on instagram accounts"
  ON public.instagram_accounts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation instagram accounts" ON public.instagram_accounts;
CREATE POLICY "Tenant isolation instagram accounts"
  ON public.instagram_accounts
  FOR ALL
  USING (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- instagram_sessions
ALTER TABLE public.instagram_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on instagram sessions" ON public.instagram_sessions;
CREATE POLICY "Service role full access on instagram sessions"
  ON public.instagram_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation instagram sessions" ON public.instagram_sessions;
CREATE POLICY "Tenant isolation instagram sessions"
  ON public.instagram_sessions
  FOR ALL
  USING (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- instagram_contacts
ALTER TABLE public.instagram_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on instagram contacts" ON public.instagram_contacts;
CREATE POLICY "Service role full access on instagram contacts"
  ON public.instagram_contacts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation instagram contacts" ON public.instagram_contacts;
CREATE POLICY "Tenant isolation instagram contacts"
  ON public.instagram_contacts
  FOR ALL
  USING (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- instagram_conversations
ALTER TABLE public.instagram_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on instagram conversations" ON public.instagram_conversations;
CREATE POLICY "Service role full access on instagram conversations"
  ON public.instagram_conversations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation instagram conversations" ON public.instagram_conversations;
CREATE POLICY "Tenant isolation instagram conversations"
  ON public.instagram_conversations
  FOR ALL
  USING (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- instagram_messages
ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on instagram messages" ON public.instagram_messages;
CREATE POLICY "Service role full access on instagram messages"
  ON public.instagram_messages
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation instagram messages" ON public.instagram_messages;
CREATE POLICY "Tenant isolation instagram messages"
  ON public.instagram_messages
  FOR ALL
  USING (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- instagram_templates
ALTER TABLE public.instagram_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on instagram templates" ON public.instagram_templates;
CREATE POLICY "Service role full access on instagram templates"
  ON public.instagram_templates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation instagram templates" ON public.instagram_templates;
CREATE POLICY "Tenant isolation instagram templates"
  ON public.instagram_templates
  FOR ALL
  USING (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- instagram_templates_variables
ALTER TABLE public.instagram_templates_variables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on instagram templates variables" ON public.instagram_templates_variables;
CREATE POLICY "Service role full access on instagram templates variables"
  ON public.instagram_templates_variables
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation instagram templates variables" ON public.instagram_templates_variables;
CREATE POLICY "Tenant isolation instagram templates variables"
  ON public.instagram_templates_variables
  FOR ALL
  USING (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- instagram_broadcast_groups
ALTER TABLE public.instagram_broadcast_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on instagram broadcast groups" ON public.instagram_broadcast_groups;
CREATE POLICY "Service role full access on instagram broadcast groups"
  ON public.instagram_broadcast_groups
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation instagram broadcast groups" ON public.instagram_broadcast_groups;
CREATE POLICY "Tenant isolation instagram broadcast groups"
  ON public.instagram_broadcast_groups
  FOR ALL
  USING (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- instagram_broadcast_recipients
ALTER TABLE public.instagram_broadcast_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on instagram broadcast recipients" ON public.instagram_broadcast_recipients;
CREATE POLICY "Service role full access on instagram broadcast recipients"
  ON public.instagram_broadcast_recipients
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation instagram broadcast recipients" ON public.instagram_broadcast_recipients;
CREATE POLICY "Tenant isolation instagram broadcast recipients"
  ON public.instagram_broadcast_recipients
  FOR ALL
  USING (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );
