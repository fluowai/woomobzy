-- Fase 7 — LGPD: consentimentos, auditoria e políticas de retenção
BEGIN;

-- ============ CONSENTS ============
CREATE TABLE IF NOT EXISTS public.consents (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    purpose      text NOT NULL CHECK (purpose IN ('marketing','analytics','cookies','ai_training')),
    granted      boolean NOT NULL,
    granted_at   timestamptz NOT NULL DEFAULT now(),
    revoked_at   timestamptz,
    ip           inet,
    user_agent   text,
    UNIQUE (user_id, purpose, granted_at)
);
CREATE INDEX IF NOT EXISTS idx_consents_user     ON public.consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_purpose  ON public.consents(purpose);

GRANT SELECT, INSERT, UPDATE ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY consents_owner_select ON public.consents
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY consents_owner_write ON public.consents
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY consents_owner_update ON public.consents
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============ DATA ACCESS LOG (auditoria admin-only) ============
CREATE TABLE IF NOT EXISTS public.data_access_log (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action      text NOT NULL CHECK (action IN ('export','delete_request','delete_hard','correction','consent_change','incident')),
    resource    text,
    metadata    jsonb DEFAULT '{}'::jsonb,
    ip          inet,
    user_agent  text,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dal_user   ON public.data_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_dal_action ON public.data_access_log(action);
CREATE INDEX IF NOT EXISTS idx_dal_time   ON public.data_access_log(created_at DESC);

GRANT SELECT ON public.data_access_log TO authenticated;
GRANT ALL ON public.data_access_log TO service_role;

ALTER TABLE public.data_access_log ENABLE ROW LEVEL SECURITY;

-- Titular vê apenas seus próprios registros; admins veem tudo (assumindo has_role existente)
CREATE POLICY dal_owner_select ON public.data_access_log
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ RETENTION POLICIES ============
CREATE TABLE IF NOT EXISTS public.retention_policies (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name   text UNIQUE NOT NULL,
    retain_days  int NOT NULL CHECK (retain_days > 0),
    hard_delete  boolean NOT NULL DEFAULT true,
    last_run_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.retention_policies TO authenticated;
GRANT ALL ON public.retention_policies TO service_role;

ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY retention_admin_all ON public.retention_policies
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Defaults conservadores; ajustar conforme LGPD e obrigações fiscais
INSERT INTO public.retention_policies (table_name, retain_days) VALUES
    ('messages', 365),
    ('data_access_log', 1825),  -- 5 anos
    ('consents', 1825)
ON CONFLICT (table_name) DO NOTHING;

COMMIT;
