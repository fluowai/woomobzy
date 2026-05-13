-- migrations/v6_rural_search_logs.sql

CREATE TABLE IF NOT EXISTS rural_location_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  organization_id UUID,
  google_maps_url TEXT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  uf TEXT NULL,
  municipality TEXT NULL,
  source_endpoint TEXT DEFAULT 'https://geoserver.car.gov.br/geoserver/sicar/ows',
  source_layer TEXT NULL,
  match_mode TEXT NULL, -- 'contains_point', 'nearby_radius', 'none'
  confidence TEXT NULL,   -- 'alta', 'media', 'baixa', 'nenhuma'
  total_matches INTEGER DEFAULT 0,
  request_payload JSONB,
  response_summary JSONB,
  error_message TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance e auditoria
CREATE INDEX IF NOT EXISTS idx_rural_search_org ON rural_location_search_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_rural_search_user ON rural_location_search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rural_search_created ON rural_location_search_logs(created_at);
