-- Add missing columns to properties table to support application features

ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_info JSONB;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS analysis JSONB;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS aptitude TEXT[]; -- or JSONB if preference
ALTER TABLE properties ADD COLUMN IF NOT EXISTS broker_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS organization_id TEXT;
