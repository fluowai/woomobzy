-- Migration: Transform properties table for rural focus
-- This script updates the properties table to support rural property features

-- Note: Since features is stored as JSONB, we don't need to alter column structure
-- The TypeScript interface change will handle the new structure
-- This script documents the expected JSONB structure for reference

-- Expected JSONB structure for features column:
-- {
--   "areaHectares": number,
--   "areaAlqueires": number (optional),
--   "casaSede": boolean,
--   "caseiros": number,
--   "galpoes": number,
--   "currais": boolean,
--   "tipoSolo": string,
--   "usoAtual": string[],
--   "temGado": boolean,
--   "capacidadeCabecas": number (optional),
--   "fontesAgua": string[],
--   "percentualMata": number (optional)
-- }

-- Update existing properties to have basic rural structure (optional - run if needed)
-- This is a template - adjust based on your data migration needs
/*
UPDATE properties
SET features = jsonb_build_object(
  'areaHectares', COALESCE((features->>'area')::numeric / 10000, 0),
  'areaAlqueires', COALESCE((features->>'area')::numeric / 24200, 0),
  'casaSede', true,
  'caseiros', 1,
  'galpoes', 0,
  'currais', false,
  'tipoSolo', 'Misto',
  'usoAtual', '["Pasto"]'::jsonb,
  'temGado', false,
  'fontesAgua', '[]'::jsonb
)
WHERE features IS NOT NULL;
*/

-- Add comment to features column for documentation
COMMENT ON COLUMN properties.features IS 'Rural property features stored as JSONB: areaHectares, areaAlqueires, casaSede, caseiros, galpoes, currais, tipoSolo, usoAtual, temGado, capacidadeCabecas, fontesAgua, percentualMata';

-- Create indexes for common rural property queries
CREATE INDEX IF NOT EXISTS idx_properties_area_hectares ON properties ((features->>'areaHectares'));
CREATE INDEX IF NOT EXISTS idx_properties_tem_gado ON properties ((features->>'temGado'));
CREATE INDEX IF NOT EXISTS idx_properties_tipo_solo ON properties ((features->>'tipoSolo'));
