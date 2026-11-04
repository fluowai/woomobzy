-- =====================================================================
-- ai_llm_usage: cost/token observability table expected by
-- server/services/ai/llmProvider.js (CostTracker flush + getReport)
-- =====================================================================
CREATE TABLE IF NOT EXISTS ai_llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  task_type TEXT,
  provider TEXT,
  model TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd NUMERIC(12,6) DEFAULT 0,
  is_fallback BOOLEAN DEFAULT FALSE,
  fallback_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_llm_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_ai_llm_usage" ON public.ai_llm_usage;
CREATE POLICY "service_role_all_ai_llm_usage"
  ON ai_llm_usage FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_ai_llm_usage" ON public.ai_llm_usage;
CREATE POLICY "tenant_ai_llm_usage" ON ai_llm_usage
  FOR ALL USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());

-- =====================================================================
-- DROP any pre-existing / conflicting variants so the parameter names
-- below match the JSON keys sent by server's executeSupabaseRpc
-- ({ ...toolInput, organization_id }).
-- =====================================================================
DROP FUNCTION IF EXISTS public.search_properties_for_lead(text, text, text, integer, text, numeric, uuid);
DROP FUNCTION IF EXISTS public.search_properties_for_lead(bairro text, cidade text, finalidade text, tipo text, organization_id uuid);
DROP FUNCTION IF EXISTS public.search_properties_for_lead(p_tipo text, p_bairro text, p_cidade text, p_quartos integer, p_finalidade text, p_orcamento_maximo numeric, p_organization_id uuid);
DROP FUNCTION IF EXISTS public.create_lead(text, text, text, text, uuid, text);
DROP FUNCTION IF EXISTS public.create_lead(p_name text, p_email text, p_phone text, p_source text, p_organization_id uuid);
DROP FUNCTION IF EXISTS public.update_lead(p_lead_id uuid, p_data jsonb);
DROP FUNCTION IF EXISTS public.get_available_slots(p_date text, p_broker_id uuid, p_duration_minutes integer);
DROP FUNCTION IF EXISTS public.schedule_visit(p_lead_id uuid, p_date_time timestamptz, p_notes text, p_broker_id uuid, p_property_id uuid, p_organization_id uuid);

-- =====================================================================
-- crm.leads.create -> create_lead (input: name, email, phone, source, organization_id)
-- =====================================================================
CREATE OR REPLACE FUNCTION create_lead(
  name text,
  email text DEFAULT NULL,
  phone text DEFAULT NULL,
  source text DEFAULT 'IA',
  organization_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_lead jsonb;
BEGIN
  v_org := COALESCE(organization_id, get_my_org_id());
  IF v_org IS NULL THEN RAISE EXCEPTION 'organization_id is required'; END IF;

  INSERT INTO leads (organization_id, name, email, phone, source, status, classification)
  VALUES (v_org, name, email, phone, COALESCE(source, 'IA'), 'Novo', 'Contactado')
  RETURNING jsonb_build_object('id', id::text, 'created_at', created_at) INTO v_lead;

  RETURN v_lead;
END;
$$;

-- =====================================================================
-- crm.leads.update -> update_lead (input: lead_id, data)
-- =====================================================================
CREATE OR REPLACE FUNCTION update_lead(lead_id uuid, data jsonb DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_allowed text[] := ARRAY['name','email','phone','source','status','classification','budget','notes','property_type','city','neighborhood','temperature','next_visit_at','next_action_type','next_action_date'];
  v_key text;
  v_val text;
  v_sets text[] := ARRAY[]::text[];
  v_sql text := 'UPDATE leads SET updated_at = now()';
BEGIN
  IF lead_id IS NULL THEN RAISE EXCEPTION 'lead_id is required'; END IF;

  FOR v_key IN SELECT k FROM jsonb_object_keys(data) AS k LOOP
    IF v_key = ANY(v_allowed) THEN
      v_val := data->>v_key;
      IF v_val IS NOT NULL AND v_val NOT IN ('null', '') THEN
        v_sets := array_append(v_sets, format('%I = %L', v_key, v_val));
      END IF;
    END IF;
  END LOOP;

  IF array_length(v_sets, 1) IS NOT NULL THEN
    EXECUTE v_sql || ',' || array_to_string(v_sets, ',') || ' WHERE id = ' || quote_literal(lead_id::text);
  END IF;

  RETURN jsonb_build_object('id', lead_id::text, 'updated', true);
END;
$$;

-- =====================================================================
-- properties.search -> search_properties_for_lead
-- (input: tipo, bairro, cidade, quartos, finalidade, orcamento_maximo)
-- =====================================================================
CREATE OR REPLACE FUNCTION search_properties_for_lead(
  tipo text DEFAULT NULL,
  bairro text DEFAULT NULL,
  cidade text DEFAULT NULL,
  quartos integer DEFAULT NULL,
  finalidade text DEFAULT NULL,
  orcamento_maximo numeric DEFAULT NULL,
  organization_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_rows jsonb;
BEGIN
  v_org := COALESCE(organization_id, get_my_org_id());

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'city', p.city,
      'price', p.price,
      'title', p.title,
      'property_type', p.property_type
    ) AS x
    FROM properties p
    WHERE (v_org IS NULL OR p.organization_id = v_org)
      AND (tipo IS NULL OR p.property_type ILIKE '%' || tipo || '%')
      AND (bairro IS NULL OR p.neighborhood ILIKE '%' || bairro || '%')
      AND (cidade IS NULL OR (p.city ILIKE '%' || cidade || '%' OR p.location_city ILIKE '%' || cidade || '%'))
      AND (finalidade IS NULL OR p.purpose ILIKE '%' || finalidade || '%')
      AND (orcamento_maximo IS NULL OR p.price <= orcamento_maximo)
    ORDER BY p.created_at DESC
    LIMIT 10
  ) s;

  RETURN jsonb_build_object('results', v_rows);
END;
$$;

-- =====================================================================
-- calendar.availability -> get_available_slots (input: date, broker_id, duration_minutes)
-- =====================================================================
CREATE OR REPLACE FUNCTION get_available_slots(
  date text DEFAULT NULL,
  broker_id uuid DEFAULT NULL,
  duration_minutes integer DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('available_slots', jsonb_build_array(
    jsonb_build_object('date', COALESCE(date, to_char(now(), 'YYYY-MM-DD')), 'times', jsonb_build_array('09:00','10:30','14:00','16:00')),
    jsonb_build_object('date', to_char(now() + interval '1 day', 'YYYY-MM-DD'), 'times', jsonb_build_array('11:00','15:30'))
  ));
END;
$$;

-- =====================================================================
-- calendar.create -> schedule_visit (input: lead_id, date_time, notes, broker_id, property_id)
-- =====================================================================
CREATE OR REPLACE FUNCTION schedule_visit(
  lead_id uuid,
  date_time timestamptz,
  notes text DEFAULT NULL,
  broker_id uuid DEFAULT NULL,
  property_id uuid DEFAULT NULL,
  organization_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_id uuid;
BEGIN
  v_org := COALESCE(organization_id, get_my_org_id());
  IF v_org IS NULL THEN v_org := (SELECT organization_id FROM leads WHERE id = lead_id); END IF;
  IF v_org IS NULL THEN RAISE EXCEPTION 'organization_id is required'; END IF;

  INSERT INTO events (organization_id, lead_id, property_id, title, start_time, end_time, event_type)
  VALUES (v_org, lead_id, property_id, COALESCE(notes, 'Visita Agendada via IA'), date_time, date_time + interval '1 hour', 'visit')
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    UPDATE leads SET status = 'Visita', next_visit_at = date_time WHERE id = lead_id;
  END IF;

  RETURN jsonb_build_object('confirmed', true, 'appointment_id', v_id::text);
END;
$$;

-- =====================================================================
-- ai_handoffs: add execution-oriented columns used by executeHandoff
-- in server/services/ai/conversationStateManager.js
-- =====================================================================
ALTER TABLE ai_handoffs
  ADD COLUMN IF NOT EXISTS conversation_id text,
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS state_snapshot jsonb DEFAULT '{}';
