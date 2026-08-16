-- ============================================================================
-- Migration: WooSign Module
-- Description: White labels, wallets, credit packages, ledger, and Documenso integration
-- ============================================================================

-- ============================================================
-- 1. White Labels
-- ============================================================
CREATE TABLE IF NOT EXISTS public.white_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  domain TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.white_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wootech can manage white labels" ON public.white_labels;
CREATE POLICY "Wootech can manage white labels" ON public.white_labels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = public.white_labels.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = public.white_labels.organization_id
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_white_labels_slug ON public.white_labels (slug);
CREATE INDEX IF NOT EXISTS idx_white_labels_domain ON public.white_labels (domain);
CREATE INDEX IF NOT EXISTS idx_white_labels_organization ON public.white_labels (organization_id);

-- ============================================================
-- 2. Credit Packages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.woosign_credit_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  white_label_id UUID NOT NULL REFERENCES public.white_labels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  credit_amount INTEGER NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_active BOOLEAN DEFAULT true,
  validity_days INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.woosign_credit_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "White labels can manage credit packages" ON public.woosign_credit_packages;
CREATE POLICY "White labels can manage credit packages" ON public.woosign_credit_packages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.white_labels wl
      JOIN public.profiles p ON p.organization_id = wl.organization_id
      WHERE wl.id = public.woosign_credit_packages.white_label_id
        AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.white_labels wl
      JOIN public.profiles p ON p.organization_id = wl.organization_id
      WHERE wl.id = public.woosign_credit_packages.white_label_id
        AND p.id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_woosign_credit_packages_white_label ON public.woosign_credit_packages (white_label_id);

-- ============================================================
-- 3. Wallets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.woosign_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  white_label_id UUID NOT NULL REFERENCES public.white_labels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID,
  user_id UUID,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  reserved_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.woosign_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallets" ON public.woosign_wallets;
CREATE POLICY "Users can view own wallets" ON public.woosign_wallets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = public.woosign_wallets.organization_id
    )
  );

DROP POLICY IF EXISTS "Wootech can manage wallets" ON public.woosign_wallets;
CREATE POLICY "Wootech can manage wallets" ON public.woosign_wallets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = public.woosign_wallets.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = public.woosign_wallets.organization_id
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_woosign_wallets_unique ON public.woosign_wallets (white_label_id, organization_id, team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_woosign_wallets_organization ON public.woosign_wallets (organization_id);

-- ============================================================
-- 4. Credit Ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS public.woosign_credit_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES public.woosign_wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'purchase', 'credit', 'reservation', 'consumption', 'release',
      'refund', 'transfer', 'expiration', 'bonus', 'adjustment', 'chargeback'
    )
  ),
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  description TEXT,
  reference_type TEXT,
  reference_id TEXT,
  source_wallet_id UUID REFERENCES public.woosign_wallets(id) ON DELETE SET NULL,
  target_wallet_id UUID REFERENCES public.woosign_wallets(id) ON DELETE SET NULL,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.woosign_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ledger entries" ON public.woosign_credit_ledger;
CREATE POLICY "Users can view own ledger entries" ON public.woosign_credit_ledger
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.woosign_wallets w
      JOIN public.profiles p ON p.organization_id = w.organization_id
      WHERE w.id = public.woosign_credit_ledger.wallet_id
        AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert ledger entries" ON public.woosign_credit_ledger;
CREATE POLICY "System can insert ledger entries" ON public.woosign_credit_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.woosign_wallets w
      JOIN public.profiles p ON p.organization_id = w.organization_id
      WHERE w.id = public.woosign_credit_ledger.wallet_id
        AND p.id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_woosign_credit_ledger_wallet ON public.woosign_credit_ledger (wallet_id);
CREATE INDEX IF NOT EXISTS idx_woosign_credit_ledger_reference ON public.woosign_credit_ledger (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_woosign_credit_ledger_idempotency ON public.woosign_credit_ledger (idempotency_key);

-- ============================================================
-- 5. Credit Reservations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.woosign_credit_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES public.woosign_wallets(id) ON DELETE CASCADE,
  envelope_id TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'released', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.woosign_credit_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reservations" ON public.woosign_credit_reservations;
CREATE POLICY "Users can view own reservations" ON public.woosign_credit_reservations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.woosign_wallets w
      JOIN public.profiles p ON p.organization_id = w.organization_id
      WHERE w.id = public.woosign_credit_reservations.wallet_id
        AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage reservations" ON public.woosign_credit_reservations;
CREATE POLICY "System can manage reservations" ON public.woosign_credit_reservations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.woosign_wallets w
      JOIN public.profiles p ON p.organization_id = w.organization_id
      WHERE w.id = public.woosign_credit_reservations.wallet_id
        AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.woosign_wallets w
      JOIN public.profiles p ON p.organization_id = w.organization_id
      WHERE w.id = public.woosign_credit_reservations.wallet_id
        AND p.id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_woosign_credit_reservations_wallet ON public.woosign_credit_reservations (wallet_id);
CREATE INDEX IF NOT EXISTS idx_woosign_credit_reservations_envelope ON public.woosign_credit_reservations (envelope_id);

-- ============================================================
-- 6. Envelope Mappings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.woosign_envelope_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  white_label_id UUID NOT NULL REFERENCES public.white_labels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID,
  user_id UUID,
  documenso_envelope_id TEXT NOT NULL,
  documenso_team_id INTEGER,
  wallet_id UUID NOT NULL REFERENCES public.woosign_wallets(id) ON DELETE CASCADE,
  credit_amount NUMERIC(14,2) NOT NULL,
  idempotency_key TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.woosign_envelope_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own envelope mappings" ON public.woosign_envelope_mappings;
CREATE POLICY "Users can view own envelope mappings" ON public.woosign_envelope_mappings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = public.woosign_envelope_mappings.organization_id
    )
  );

DROP POLICY IF EXISTS "System can manage envelope mappings" ON public.woosign_envelope_mappings;
CREATE POLICY "System can manage envelope mappings" ON public.woosign_envelope_mappings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = public.woosign_envelope_mappings.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = public.woosign_envelope_mappings.organization_id
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_woosign_envelope_mappings_documenso ON public.woosign_envelope_mappings (documenso_envelope_id);
CREATE INDEX IF NOT EXISTS idx_woosign_envelope_mappings_organization ON public.woosign_envelope_mappings (organization_id);
CREATE INDEX IF NOT EXISTS idx_woosign_envelope_mappings_idempotency ON public.woosign_envelope_mappings (idempotency_key);

-- ============================================================
-- Done
-- ============================================================
SELECT 'WooSign migration completed!' AS result;
