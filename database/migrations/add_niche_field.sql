-- Migration: Add niche field to organizations table
-- Date: 2026-03-14
-- Purpose: Allow organizations to be classified as rural, traditional, or hybrid
-- Status: Essential for multi-tenancy domain management

-- Add niche column if it doesn't exist
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT 'rural'
  CHECK (niche IN ('rural', 'traditional', 'hybrid'));

-- Add comment
COMMENT ON COLUMN organizations.niche IS 'Organization type: rural, traditional, or hybrid';

-- Create index for niche lookups
CREATE INDEX IF NOT EXISTS idx_organizations_niche ON organizations(niche);

-- Update existing organizations with default 'rural' if they don't have niche
UPDATE organizations SET niche = 'rural' WHERE niche IS NULL;

-- Make the column NOT NULL after backfilling
ALTER TABLE organizations ALTER COLUMN niche SET NOT NULL;
