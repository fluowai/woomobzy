-- Add WooSign envelope tracking to system_contracts
ALTER TABLE public.system_contracts
    ADD COLUMN IF NOT EXISTS woosign_envelope_id TEXT;

CREATE INDEX IF NOT EXISTS idx_system_contracts_woosign_envelope_id
    ON public.system_contracts(woosign_envelope_id);
