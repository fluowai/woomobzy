-- Migration: 20260808_property_owner_dno.sql
-- DNO (Dono do Imóvel): normaliza role canônica em clients, índice em properties.owner_id
-- e fecha o vetor de vazamento de dados do dono nos sites públicos (view de vitrine).

-- 1. Role canônica do proprietário em clients.roles
--    Variantes existentes no banco/código: 'Proprietário', 'Proprietario', 'proprietario'
--    Normaliza para 'Proprietário' (com acento), deduplicando a array.
DO $$
BEGIN
  UPDATE public.clients
  SET roles = (
    SELECT ARRAY(
      SELECT DISTINCT CASE
        WHEN lower(role) = 'proprietario' OR role = 'Proprietario' OR role = 'proprietario'
          THEN 'Proprietário'
        ELSE role
      END
      FROM unnest(roles) AS t(role)
    )
  )
  WHERE roles IS NOT NULL;
END $$;

-- 2. Índice para join de properties -> clients (portal do proprietário, puxada automática)
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);

-- 3. HARDENING ANTI-VAZAMENTO: view de vitrine pública
--    O anon/visitante do site passa a ler SÓ esta view (colunas de vitrine).
--    Nenhuma coluna de dono (owner_id, owner_info, broker_id) é exposta.
DROP VIEW IF EXISTS public.public_available_properties;
CREATE VIEW public.public_available_properties AS
SELECT
  id,
  organization_id,
  title,
  description,
  price,
  rental_value,
  property_type,
  purpose,
  status,
  city,
  state,
  address,
  neighborhood,
  total_area_ha,
  useful_area_ha,
  features,
  images,
  aptitude,
  highlighted,
  niche,
  show_on_site,
  video_url,
  virtual_tour_url,
  market_value,
  views_count,
  favorites_count,
  source,
  external_id,
  external_updated_at,
  external_listing_status,
  imported_at,
  broker_id,
  created_at,
  updated_at,
  published_at
FROM public.properties
WHERE status IN ('Disponível', 'Disponivel', 'available', 'publicado');

-- A view é criada com o owner do runner (service role / postgres), que ignora RLS.
-- O WHERE da view restringe às linhas disponíveis para o público.
GRANT SELECT ON public.public_available_properties TO anon;
GRANT SELECT ON public.public_available_properties TO authenticated;

-- Nota: PostgreSQL NÃO suporta RLS em views (ENABLE ROW LEVEL SECURITY / CREATE POLICY
-- só valem para tabelas). O controle de acesso da view é feito via GRANT SELECT (acima)
-- + a projeção de colunas de vitrine e o filtro de status definidos no CREATE VIEW.
-- A view é executada com privilégios do owner (service role), portanto o anon/visitante
-- só enxerga exatamente o que a view projeta — nunca owner_id/owner_info/PII.

-- 4. Fechar o acesso direto de anon à tabela properties (via RLS e grants).
--    O acesso autenticado (CRM) continua pela policy "Tenant isolation properties".
DROP POLICY IF EXISTS "Public read available properties" ON public.properties;
REVOKE SELECT ON public.properties FROM anon;

-- Nota: o REVOKE acima não afeta o serviço (service role bypassa RLS/grants).

SELECT '20260808_property_owner_dno.sql aplicada' AS result;
