-- ============================================
-- TRACKING & ANALYTICS - DATABASE SCHEMA
-- ============================================
-- Adiciona campos de tracking completo para leads
-- Suporta: UTM parameters, Facebook Pixel, Google Analytics, referrer tracking
-- ============================================

-- 1. ADICIONAR COLUNAS DE TRACKING À TABELA crm_leads
-- ============================================

-- UTM Parameters (Campaign Tracking)
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS utm_source VARCHAR(255);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(255);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS utm_term VARCHAR(255);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS utm_content VARCHAR(255);

-- Page Tracking
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS referrer_url TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS landing_page_url TEXT;

-- Google Analytics
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS client_id VARCHAR(255);

-- Facebook Pixel
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS fbp VARCHAR(255);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS fbc VARCHAR(255);

-- Session Data (JSONB para dados adicionais)
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT '{}'::jsonb;

-- 2. ADICIONAR CONFIGURAÇÕES DE PIXELS À TABELA site_settings
-- ============================================

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS tracking_pixels JSONB DEFAULT '{
  "facebook": {
    "enabled": false,
    "pixelId": "",
    "testMode": false
  },
  "google_analytics": {
    "enabled": false,
    "measurementId": "",
    "testMode": false
  },
  "google_ads": {
    "enabled": false,
    "conversionId": "",
    "conversionLabel": "",
    "testMode": false
  }
}'::jsonb;

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_crm_leads_utm_source ON crm_leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_utm_medium ON crm_leads(utm_medium);
CREATE INDEX IF NOT EXISTS idx_crm_leads_utm_campaign ON crm_leads(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_crm_leads_client_id ON crm_leads(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_fbp ON crm_leads(fbp);

-- 4. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN crm_leads.utm_source IS 'Origem do tráfego (ex: google, facebook, instagram)';
COMMENT ON COLUMN crm_leads.utm_medium IS 'Meio de marketing (ex: cpc, organic, social)';
COMMENT ON COLUMN crm_leads.utm_campaign IS 'Nome da campanha';
COMMENT ON COLUMN crm_leads.utm_term IS 'Palavras-chave (para anúncios pagos)';
COMMENT ON COLUMN crm_leads.utm_content IS 'Conteúdo do anúncio (para testes A/B)';
COMMENT ON COLUMN crm_leads.referrer_url IS 'URL de onde o visitante veio';
COMMENT ON COLUMN crm_leads.landing_page_url IS 'URL da página onde o lead foi capturado';
COMMENT ON COLUMN crm_leads.client_id IS 'Google Analytics Client ID';
COMMENT ON COLUMN crm_leads.fbp IS 'Facebook Browser Pixel (_fbp cookie)';
COMMENT ON COLUMN crm_leads.fbc IS 'Facebook Click ID (_fbc cookie)';
COMMENT ON COLUMN crm_leads.session_data IS 'Dados adicionais da sessão (device, browser, etc)';

-- ============================================
-- FIM DO SCRIPT
-- ============================================
