CREATE OR REPLACE FUNCTION public.get_public_quiz(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', id, 'title', title, 'slug', slug, 'property_label', property_label,
    'status', status, 'intro_title', intro_title, 'intro_copy', intro_copy,
    'success_message', success_message,
    'disqualification_message', disqualification_message,
    'questions', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', question->>'id', 'label', question->>'label',
        'type', COALESCE(question->>'type', 'single'),
        'required', COALESCE((question->>'required')::boolean, true),
        'options', (SELECT jsonb_agg(jsonb_build_object('value', option->>'value', 'label', option->>'label')) FROM jsonb_array_elements(question->'options') option)
      )) FROM jsonb_array_elements(questions) question
    ),
    'branding', branding, 'created_at', created_at
  )
  FROM public.quiz_campaigns
  WHERE slug = lower(regexp_replace(p_slug, '[^a-zA-Z0-9-]+', '-', 'g'))
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_quiz(
  p_slug TEXT, p_name TEXT, p_email TEXT, p_phone TEXT,
  p_answers JSONB, p_utm JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campaign public.quiz_campaigns%ROWTYPE;
  question JSONB;
  selected JSONB;
  earned NUMERIC := 0;
  maximum NUMERIC := 0;
  maximum_total NUMERIC := 0;
  score_value INTEGER := 0;
  reasons TEXT[] := ARRAY[]::TEXT[];
  summaries JSONB := '[]'::jsonb;
  qualified_value BOOLEAN;
  classification_value TEXT;
  lead_uuid UUID;
  budget_value NUMERIC;
  whatsapp_url TEXT;
BEGIN
  IF length(trim(COALESCE(p_name, ''))) < 2 OR length(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g')) < 8 THEN
    RAISE EXCEPTION 'Preencha seu nome e WhatsApp.';
  END IF;

  SELECT * INTO campaign FROM public.quiz_campaigns
  WHERE slug = lower(regexp_replace(p_slug, '[^a-zA-Z0-9-]+', '-', 'g')) AND status = 'active'
  LIMIT 1;
  IF campaign.id IS NULL THEN RAISE EXCEPTION 'Quiz não encontrado ou indisponível.'; END IF;

  FOR question IN SELECT value FROM jsonb_array_elements(campaign.questions)
  LOOP
    SELECT COALESCE(MAX((value->>'score')::numeric), 0) INTO maximum FROM jsonb_array_elements(question->'options');
    maximum_total := maximum_total + maximum;
    SELECT value INTO selected FROM jsonb_array_elements(question->'options')
      WHERE value->>'value' = p_answers->>(question->>'id') LIMIT 1;
    IF selected IS NULL THEN
      IF COALESCE((question->>'required')::boolean, true) THEN
        reasons := array_append(reasons, 'Pergunta não respondida: ' || (question->>'label'));
      END IF;
    ELSE
      earned := earned + COALESCE((selected->>'score')::numeric, 0);
      summaries := summaries || jsonb_build_array(jsonb_build_object(
        'id', question->>'id', 'question', question->>'label',
        'value', selected->>'value', 'answer', selected->>'label'
      ));
      IF COALESCE((selected->>'disqualify')::boolean, false) THEN
        reasons := array_append(reasons, COALESCE(selected->>'reason', 'Resposta incompatível: ' || (selected->>'label')));
      END IF;
    END IF;
    selected := NULL;
  END LOOP;

  score_value := CASE WHEN maximum_total > 0 THEN LEAST(100, round((earned / maximum_total) * 100)::integer) ELSE 0 END;
  qualified_value := cardinality(reasons) = 0 AND score_value >= campaign.qualification_threshold;
  classification_value := CASE WHEN qualified_value THEN 'qualified' ELSE 'nurture' END;
  budget_value := CASE p_answers->>'budget'
    WHEN 'below-1000' THEN 999 WHEN '1000-1299' THEN 1299
    WHEN '1300-2000' THEN 2000 WHEN '2001-3000' THEN 3000
    WHEN 'above-3000' THEN 3001 ELSE NULL END;

  INSERT INTO public.leads (
    organization_id, name, email, phone, status, source, campaign, notes,
    budget, classification, lead_score, ai_profile
  ) VALUES (
    campaign.organization_id, trim(p_name), NULLIF(trim(COALESCE(p_email, '')), ''),
    regexp_replace(p_phone, '\D', '', 'g'),
    CASE WHEN qualified_value THEN 'Novo' ELSE 'Nutrição Quiz' END,
    'Quiz OKA', campaign.title,
    'Quiz: ' || campaign.title || E'\nResultado: ' || CASE WHEN qualified_value THEN 'Qualificado' ELSE 'Nutrição futura' END || ' (' || score_value || '/100)',
    budget_value, classification_value, score_value,
    jsonb_build_object('quiz_campaign_id', campaign.id, 'quiz_slug', campaign.slug, 'qualification_status', classification_value, 'answers', summaries, 'reasons', to_jsonb(reasons))
  ) RETURNING id INTO lead_uuid;

  INSERT INTO public.quiz_submissions (
    organization_id, campaign_id, lead_id, name, email, phone, answers,
    score, qualification_status, disqualification_reasons, utm
  ) VALUES (
    campaign.organization_id, campaign.id, lead_uuid, trim(p_name),
    NULLIF(trim(COALESCE(p_email, '')), ''), regexp_replace(p_phone, '\D', '', 'g'),
    p_answers, score_value, classification_value, reasons, COALESCE(p_utm, '{}'::jsonb)
  );

  IF qualified_value THEN
    whatsapp_url := 'https://wa.me/' || regexp_replace(campaign.whatsapp_number, '\D', '', 'g') ||
      '?text=' || replace(replace('Olá! Sou ' || trim(p_name) || E'.\nFui pré-qualificado pelo Quiz OKA para: ' || campaign.property_label || E'.\nPontuação: ' || score_value || E'/100.\nQuero confirmar a disponibilidade e agendar uma visita.', ' ', '%20'), E'\n', '%0A');
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'qualified', qualified_value, 'score', score_value,
    'message', CASE WHEN qualified_value THEN campaign.success_message ELSE campaign.disqualification_message END,
    'whatsapp_url', whatsapp_url
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_quiz(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_quiz(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_quiz(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_quiz(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO anon, authenticated;
