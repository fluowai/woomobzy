-- Add Visual Layout Editor columns to site_settings table

-- Add layout_config column (JSONB) with default structure
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{
  "version": "1.0",
  "mode": "classic",
  "blocks": [],
  "globalStyles": {
    "colors": {},
    "fonts": {},
    "spacing": {}
  },
  "breakpoints": {
    "mobile": 375,
    "tablet": 768,
    "desktop": 1440
  }
}'::jsonb;

-- Add custom CSS column
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS custom_css TEXT;

-- Add custom JavaScript column
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS custom_js TEXT;

-- Add comment for documentation
COMMENT ON COLUMN site_settings.layout_config IS 'Visual layout editor configuration with blocks, styles, and responsive settings';
COMMENT ON COLUMN site_settings.custom_css IS 'Custom CSS code for advanced styling';
COMMENT ON COLUMN site_settings.custom_js IS 'Custom JavaScript code for advanced functionality';
