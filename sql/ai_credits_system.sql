-- ============================================
-- MEGA ADMIN AI CREDITS DISTRIBUTION SYSTEM
-- ============================================

-- 1. AI Balances Table (Tracks current token balance per organization)
CREATE TABLE IF NOT EXISTS ai_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    balance_tokens BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(organization_id)
);

-- 2. AI Ledgers Table (Tracks all credit transactions: recharges, consumptions, transfers)
CREATE TABLE IF NOT EXISTS ai_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL, -- positive for recharge/transfer_in, negative for consume/transfer_out
    transaction_type VARCHAR(50) NOT NULL, -- 'consume', 'recharge', 'transfer_in', 'transfer_out'
    description TEXT,
    reference_id UUID, -- For transfers, points to the other ledger entry. For usage, points to an operation/chat id.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Trigger to Auto-Update ai_balances when a ledger entry is created
CREATE OR REPLACE FUNCTION update_ai_balance_on_ledger_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Upsert the balance table
    INSERT INTO ai_balances (organization_id, balance_tokens, updated_at)
    VALUES (NEW.organization_id, NEW.amount, NOW())
    ON CONFLICT (organization_id)
    DO UPDATE SET 
        balance_tokens = ai_balances.balance_tokens + NEW.amount,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ai_balance ON ai_ledgers;
CREATE TRIGGER trigger_update_ai_balance
AFTER INSERT ON ai_ledgers
FOR EACH ROW
EXECUTE FUNCTION update_ai_balance_on_ledger_insert();

-- 4. RLS for Balances and Ledgers
ALTER TABLE ai_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ledgers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- MegaAdmin / Internal Server can see all (Service Role bypasses RLS anyway)
    -- Organizations can only see their own balances
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Orgs can see own balance') THEN
        CREATE POLICY "Orgs can see own balance"
        ON ai_balances FOR SELECT
        USING (organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        ));
    END IF;

    -- Resellers can see balances of their child organizations
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Resellers can see child balances') THEN
        CREATE POLICY "Resellers can see child balances"
        ON ai_balances FOR SELECT
        USING (organization_id IN (
            SELECT id FROM organizations WHERE parent_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        ));
    END IF;

    -- Ledgers visibility (same rules)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Orgs can see own ledgers') THEN
        CREATE POLICY "Orgs can see own ledgers"
        ON ai_ledgers FOR SELECT
        USING (organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Resellers can see child ledgers') THEN
        CREATE POLICY "Resellers can see child ledgers"
        ON ai_ledgers FOR SELECT
        USING (organization_id IN (
            SELECT id FROM organizations WHERE parent_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        ));
    END IF;
END $$;

-- 5. Add AI Credits to Plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS ai_credits_limit BIGINT DEFAULT 0;
