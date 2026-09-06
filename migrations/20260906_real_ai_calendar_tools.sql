-- Replace AI calendar RPCs that returned fixed demo slots or wrote to a missing events table.

CREATE OR REPLACE FUNCTION public.get_available_slots(
  date text DEFAULT NULL,
  broker_id uuid DEFAULT NULL,
  duration_minutes integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_busy jsonb;
BEGIN
  v_org := public.get_my_org_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  v_date := COALESCE(NULLIF(date, '')::date, CURRENT_DATE);
  v_start := v_date::timestamptz;
  v_end := v_start + interval '1 day';

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'appointment_id', la.id,
        'appointment_date', la.appointment_date,
        'status', la.status,
        'title', la.title
      )
      ORDER BY la.appointment_date
    ),
    '[]'::jsonb
  )
  INTO v_busy
  FROM public.lead_appointments la
  WHERE la.organization_id = v_org
    AND la.appointment_date >= v_start
    AND la.appointment_date < v_end
    AND COALESCE(la.status, '') <> 'canceled'
    AND (broker_id IS NULL OR la.user_id = broker_id);

  RETURN jsonb_build_object(
    'date', v_date,
    'duration_minutes', duration_minutes,
    'available_slots', '[]'::jsonb,
    'busy_appointments', v_busy,
    'source', 'lead_appointments'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_visit(
  lead_id uuid,
  date_time timestamptz,
  notes text DEFAULT NULL,
  broker_id uuid DEFAULT NULL,
  property_id uuid DEFAULT NULL,
  organization_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_id uuid;
  v_notes text;
BEGIN
  v_org := COALESCE(organization_id, public.get_my_org_id());
  IF v_org IS NULL THEN
    SELECT l.organization_id INTO v_org FROM public.leads l WHERE l.id = lead_id;
  END IF;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'lead not found for organization';
  END IF;

  v_notes := COALESCE(notes, 'Visita agendada via IA');
  IF property_id IS NOT NULL THEN
    v_notes := v_notes || E'\nproperty_id=' || property_id::text;
  END IF;

  INSERT INTO public.lead_appointments (
    organization_id,
    lead_id,
    user_id,
    title,
    appointment_date,
    type,
    status,
    notes
  )
  VALUES (
    v_org,
    lead_id,
    broker_id,
    'Visita agendada via IA',
    date_time,
    'Visita',
    'pending',
    v_notes
  )
  RETURNING id INTO v_id;

  UPDATE public.leads
  SET status = 'Visita', next_visit_at = date_time
  WHERE id = lead_id AND organization_id = v_org;

  RETURN jsonb_build_object(
    'confirmed', true,
    'appointment_id', v_id::text,
    'source', 'lead_appointments'
  );
END;
$$;
