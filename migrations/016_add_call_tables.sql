-- Call History: stores every call made or received
CREATE TABLE IF NOT EXISTS call_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    tenant_id       UUID REFERENCES organizations(id) ON DELETE SET NULL,
    call_id         TEXT NOT NULL,
    peer_jid        TEXT NOT NULL DEFAULT '',
    peer_phone      TEXT NOT NULL DEFAULT '',
    peer_name       TEXT NOT NULL DEFAULT '',
    direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status          TEXT NOT NULL CHECK (status IN ('pending', 'ringing', 'connected', 'ended', 'failed')),
    end_reason      TEXT NOT NULL DEFAULT '' CHECK (end_reason IN ('', 'user_ended', 'declined', 'no_answer', 'busy', 'failed', 'cancelled', 'timeout', 'unknown')),
    duration_secs   INTEGER NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ,
    connected_at    TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_history_instance_id ON call_history(instance_id);
CREATE INDEX IF NOT EXISTS idx_call_history_tenant_id ON call_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_history_call_id ON call_history(call_id);
CREATE INDEX IF NOT EXISTS idx_call_history_status ON call_history(status);
CREATE INDEX IF NOT EXISTS idx_call_history_created_at ON call_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_peer_phone ON call_history(peer_phone);

-- Call Recordings: stores metadata for recorded calls
CREATE TABLE IF NOT EXISTS call_recordings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id         UUID NOT NULL REFERENCES call_history(id) ON DELETE CASCADE,
    instance_id     UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    tenant_id       UUID REFERENCES organizations(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('none', 'pending', 'ready', 'failed')),
    provider        TEXT NOT NULL DEFAULT 'minio',
    bucket          TEXT NOT NULL DEFAULT '',
    object_key      TEXT NOT NULL DEFAULT '',
    public_url      TEXT NOT NULL DEFAULT '',
    filename        TEXT NOT NULL DEFAULT '',
    mime_type       TEXT NOT NULL DEFAULT '',
    duration_secs   INTEGER NOT NULL DEFAULT 0,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    last_error      TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_call_id ON call_recordings(call_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_instance_id ON call_recordings(instance_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_tenant_id ON call_recordings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_status ON call_recordings(status);

-- Enable auto-update for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_call_history_updated_at') THEN
        CREATE TRIGGER update_call_history_updated_at
            BEFORE UPDATE ON call_history
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_call_recordings_updated_at') THEN
        CREATE TRIGGER update_call_recordings_updated_at
            BEFORE UPDATE ON call_recordings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;
