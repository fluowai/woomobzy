CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

CREATE SEQUENCE IF NOT EXISTS migration_logs_id_seq;
CREATE SEQUENCE IF NOT EXISTS migration_errors_id_seq;

-- ========================================================================
-- IMOBZY - COMPLETE EXECUTABLE DATABASE SCHEMA
-- Generated from base schema provided by user, with FK dependencies fixed.
-- Includes White-label (B2B2B) Multi-tenant logic and RLS policies.
-- ========================================================================

-- SCHEMA PROVIDED BY USER

CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subdomain text UNIQUE,
  custom_domain text UNIQUE,
  logo_url text,
  status text DEFAULT 'active'::text,
  plan_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  niche text DEFAULT 'rural'::text CHECK (niche = ANY (ARRAY['rural'::text, 'traditional'::text, 'hybrid'::text, 'urbano'::text])),
  owner_email text,
  gateway_api_key text,
  gateway_provider text DEFAULT 'asaas'::text,
  webhook_secret text,
  portal_logo_url text,
  owner_name text,
  trial_ends_at timestamp with time zone,
  subscription_status text DEFAULT 'trial'::text,
  selected_plan_at timestamp with time zone,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  organization_id uuid,
  name text,
  email text,
  role text DEFAULT 'user'::text CHECK (role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'broker'::text, 'user'::text])),
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  broker_id uuid,
  title text NOT NULL,
  description text,
  description_draft text,
  price numeric,
  currency text DEFAULT 'BRL'::text,
  status text DEFAULT 'Disponível'::text,
  purpose text DEFAULT 'Venda'::text,
  property_type text DEFAULT 'Rural'::text,
  area_total_ha numeric,
  area_util_ha numeric,
  area_benfeitoria_ha numeric,
  location_city text,
  location_state text,
  location_region text,
  location_coordinates geometry,
  solo_type text,
  topography text,
  water_sources text[],
  energy_type text,
  access_type text,
  infrastructure text[],
  certifications text[],
  environmental_licenses text[],
  zoning text,
  registration_number text,
  registry_office text,
  property_title text,
  property_deed text,
  boundaries_description text,
  images text[],
  video_url text,
  virtual_tour_url text,
  ai_analysis jsonb,
  market_value numeric,
  rental_value numeric,
  views_count integer DEFAULT 0,
  favorites_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  price_per_m2 numeric,
  highlight_status text DEFAULT 'normal'::text,
  aptitude text[],
  niche text DEFAULT 'urbano'::text,
  total_area_ha numeric,
  price_per_ha numeric,
  features jsonb DEFAULT '{}'::jsonb,
  address text,
  neighborhood text,
  city text,
  state text,
  highlighted boolean DEFAULT false,
  owner_info jsonb,
  useful_area_ha numeric,
  environment_id uuid,
  owner_id uuid,
  source text,
  external_id text,
  external_updated_at text,
  external_listing_status text,
  imported_at timestamp with time zone DEFAULT now(),
  published_at timestamp with time zone,
  CONSTRAINT properties_pkey PRIMARY KEY (id)
);
CREATE TABLE public.property_polygons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  property_id uuid,
  name text,
  geometry geometry,
  area_ha numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT property_polygons_pkey PRIMARY KEY (id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  property_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  source text DEFAULT 'Direto'::text,
  status text DEFAULT 'Novo'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  classification text,
  chat_jid text,
  ad_reference text,
  organic_channel text,
  last_contacted_at timestamp with time zone,
  campaign text,
  scheduled_at timestamp with time zone,
  qualification_score integer DEFAULT 0,
  qualified_by_ai boolean DEFAULT false,
  company_name text,
  matched_properties jsonb DEFAULT '[]'::jsonb,
  match_summary text,
  matched_at timestamp with time zone,
  budget numeric,
  aptitude_interest text[] DEFAULT '{}'::text[],
  preferences jsonb DEFAULT '{}'::jsonb,
  environment_id uuid,
  client_id uuid,
  lead_score integer DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  ai_profile jsonb DEFAULT '{}'::jsonb,
  ai_next_action text,
  ai_last_intent text,
  ai_last_confidence numeric,
  next_follow_up_at timestamp with time zone,
  next_visit_at timestamp with time zone,
  assigned_to uuid,
  match_profile text,
  CONSTRAINT leads_pkey PRIMARY KEY (id)
);
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid UNIQUE,
  theme jsonb DEFAULT '{}'::jsonb,
  contact jsonb DEFAULT '{}'::jsonb,
  integrations jsonb DEFAULT '{}'::jsonb,
  seo jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  social_links jsonb DEFAULT '{}'::jsonb,
  is_live boolean DEFAULT false,
  agency_name text,
  primary_color text DEFAULT '#064e3b'::text,
  secondary_color text DEFAULT '#d4af37'::text,
  logo_url text,
  header_color text,
  footer_text text,
  contact_email text,
  contact_phone text,
  contact_whatsapp_template text,
  layout_config jsonb DEFAULT '{}'::jsonb,
  facebook_url text,
  instagram_url text,
  whatsapp_url text,
  youtube_url text,
  linkedin_url text,
  tracking_pixels jsonb DEFAULT '{}'::jsonb,
  environment_id uuid,
  CONSTRAINT site_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_pages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  slug text NOT NULL,
  title text,
  content jsonb DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description text,
  meta_title text,
  meta_description text,
  meta_keywords text[],
  og_image text,
  template_id text,
  theme_config jsonb DEFAULT '{}'::jsonb,
  blocks jsonb DEFAULT '[]'::jsonb,
  property_selection jsonb DEFAULT '{}'::jsonb,
  form_config jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'draft'::text,
  published_at timestamp with time zone,
  views_count integer DEFAULT 0,
  leads_count integer DEFAULT 0,
  custom_css text,
  custom_js text,
  custom_head text,
  name text,
  user_id uuid,
  environment_id uuid,
  CONSTRAINT landing_pages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.site_texts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  key text NOT NULL,
  value text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  section text,
  CONSTRAINT site_texts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  lead_id uuid,
  direction text CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text])),
  message_type text DEFAULT 'text'::text,
  content text,
  media_url text,
  external_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.due_diligence_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  property_id uuid,
  item_type text NOT NULL,
  status text DEFAULT 'pending'::text,
  documents text[],
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT due_diligence_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contracts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  property_id uuid,
  lead_id uuid,
  contract_type text NOT NULL,
  status text DEFAULT 'draft'::text,
  content text,
  signed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contracts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.instances (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  name text NOT NULL,
  connection_status text DEFAULT 'disconnected'::text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT instances_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  instance_id uuid,
  whatsapp_number text NOT NULL,
  name text,
  profile_pic_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contacts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.domains (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  domain text NOT NULL UNIQUE,
  is_custom boolean DEFAULT false,
  is_primary boolean DEFAULT false,
  status text DEFAULT 'pending'::text,
  ssl_status text DEFAULT 'none'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT domains_pkey PRIMARY KEY (id)
);
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price_monthly numeric,
  features jsonb DEFAULT '{}'::jsonb,
  limits jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  slug text UNIQUE,
  trial_days integer DEFAULT 7,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.saas_settings (
  id integer NOT NULL DEFAULT 1,
  global_evolution_url text,
  global_evolution_api_key text,
  default_plan_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT saas_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  instance_id uuid,
  contact_id uuid,
  key_id text NOT NULL,
  message_id text,
  content text,
  media_type text DEFAULT 'text'::text,
  from_me boolean DEFAULT false,
  status text DEFAULT 'sent'::text,
  timestamp timestamp with time zone DEFAULT now(),
  raw_payload jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rental_contracts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  property_id uuid,
  tenant_name text NOT NULL,
  tenant_email text,
  tenant_phone text,
  start_date date,
  end_date date,
  monthly_rent numeric,
  adjustment_index text DEFAULT 'IGPM'::text,
  payment_status text DEFAULT 'em_dia'::text CHECK (payment_status = ANY (ARRAY['em_dia'::text, 'atrasado'::text, 'inadimplente'::text])),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'terminated'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tenant_cpf text,
  tenant_rg text,
  guarantee_type text,
  guarantee_document text,
  observation text,
  tenant_birth_date date,
  tenant_marital_status text,
  tenant_profession text,
  tenant_employer text,
  tenant_monthly_income numeric,
  tenant_address text,
  tenant_city text,
  tenant_state text,
  tenant_zip text,
  emergency_contact_name text,
  emergency_contact_phone text,
  reference_1_name text,
  reference_1_phone text,
  reference_2_name text,
  reference_2_phone text,
  evaluation_score integer DEFAULT 0,
  evaluation_status text DEFAULT 'em_analise'::text,
  credit_score integer,
  has_restrictions boolean DEFAULT false,
  restriction_notes text,
  income_proof_status text DEFAULT 'pendente'::text,
  guarantor_name text,
  guarantor_cpf text,
  guarantor_phone text,
  guarantor_monthly_income numeric,
  recommended_limit numeric,
  analysis_notes text,
  environment_id uuid,
  CONSTRAINT rental_contracts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id uuid,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  priority text NOT NULL DEFAULT 'medium'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid,
  user_id uuid,
  message text NOT NULL,
  is_admin_reply boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.whatsapp_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name character varying NOT NULL,
  status character varying NOT NULL DEFAULT 'disconnected'::character varying CHECK (status::text = ANY (ARRAY['connected'::character varying, 'disconnected'::character varying, 'connecting'::character varying, 'qr_pending'::character varying]::text[])),
  qr_code text,
  phone character varying,
  jid character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  environment_id uuid,
  CONSTRAINT whatsapp_instances_pkey PRIMARY KEY (id)
);
CREATE TABLE public.whatsapp_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL,
  phone character varying NOT NULL,
  push_name character varying,
  display_name character varying NOT NULL,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_contacts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.whatsapp_chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL,
  chat_jid character varying NOT NULL,
  name character varying NOT NULL DEFAULT ''::character varying,
  is_group boolean NOT NULL DEFAULT false,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count integer NOT NULL DEFAULT 0,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_chats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL,
  chat_id uuid NOT NULL,
  message_id character varying NOT NULL,
  sender_phone character varying NOT NULL,
  sender_name character varying NOT NULL DEFAULT ''::character varying,
  is_from_me boolean NOT NULL DEFAULT false,
  is_group boolean NOT NULL DEFAULT false,
  type character varying NOT NULL DEFAULT 'text'::character varying CHECK (type::text = ANY (ARRAY['text'::character varying, 'image'::character varying, 'audio'::character varying, 'video'::character varying, 'document'::character varying, 'sticker'::character varying, 'location'::character varying, 'contact'::character varying, 'unknown'::character varying]::text[])),
  content text,
  media_url text,
  media_mimetype character varying,
  media_filename character varying,
  quoted_message_id character varying,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  media_status text NOT NULL DEFAULT 'none'::text CHECK (media_status = ANY (ARRAY['none'::text, 'pending'::text, 'downloading'::text, 'processing'::text, 'ready'::text, 'failed'::text, 'expired'::text])),
  media_error text,
  media_retry_count integer NOT NULL DEFAULT 0,
  delivery_status text NOT NULL DEFAULT 'sent'::text CHECK (delivery_status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text, 'played'::text, 'failed'::text])),
  CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.billing (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  contract_id uuid,
  amount numeric,
  due_date date,
  payment_date date,
  status text DEFAULT 'aberto'::text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid,
  CONSTRAINT billing_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lead_activities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid,
  organization_id uuid,
  created_by uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['Nota'::text, 'Chamada'::text, 'WhatsApp'::text, 'Email'::text, 'Visita'::text, 'Proposta'::text, 'Status'::text, 'Sistema'::text])),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lead_activities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.developments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  name text NOT NULL,
  description text,
  address text,
  city text,
  state text,
  status text DEFAULT 'projeto'::text,
  progress_pct integer DEFAULT 0,
  total_units integer DEFAULT 0,
  available_units integer DEFAULT 0,
  registration_number text,
  total_area numeric,
  images text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  environment_id uuid,
  CONSTRAINT developments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blocks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  development_id uuid,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blocks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lots (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  development_id uuid,
  block_id uuid,
  number text NOT NULL,
  area_m2 numeric NOT NULL,
  price numeric NOT NULL,
  status text DEFAULT 'Disponível'::text,
  front_m numeric,
  back_m numeric,
  left_m numeric,
  right_m numeric,
  coordinates jsonb,
  current_client_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.billings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  contract_id uuid,
  client_id uuid,
  description text,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  payment_date timestamp with time zone,
  status text DEFAULT 'aberto'::text,
  category text DEFAULT 'mensalidade'::text,
  payment_gateway_id text,
  invoice_url text,
  pix_code text,
  barcode text,
  nosso_numero text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT billings_pkey PRIMARY KEY (id)
);
CREATE TABLE public."AccessProfile" (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  organizationId text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessProfile_pkey" PRIMARY KEY (id)
);
CREATE TABLE public."User" (
  id text NOT NULL,
  email text NOT NULL,
  name text,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'USER'::text,
  status text NOT NULL DEFAULT 'ACTIVE'::text,
  organizationId text,
  accessProfileId text,
  permissions jsonb DEFAULT '{}'::jsonb,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY (id)
);
CREATE TABLE public."Organization" (
  id text NOT NULL,
  name text NOT NULL,
  slug text,
  domain text,
  plan text NOT NULL DEFAULT 'Free'::text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  planId text,
  CONSTRAINT "Organization_pkey" PRIMARY KEY (id)
);
CREATE TABLE public."Plan" (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  leadsLimit integer NOT NULL DEFAULT 100,
  clientsLimit integer NOT NULL DEFAULT 10,
  aiLimit integer NOT NULL DEFAULT 50,
  features jsonb,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY (id)
);
CREATE TABLE public.rural_location_search_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  organization_id uuid,
  google_maps_url text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  uf text,
  municipality text,
  source_endpoint text DEFAULT 'https://geoserver.car.gov.br/geoserver/sicar/ows'::text,
  source_layer text,
  match_mode text,
  confidence text,
  total_matches integer DEFAULT 0,
  request_payload jsonb,
  response_summary jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rural_location_search_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.api_audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  dossier_id uuid,
  api_name text,
  request_url text,
  http_status integer,
  response_body jsonb,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT api_audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ai_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by uuid,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Atendimento'::text,
  department text,
  status text DEFAULT 'Rascunho'::text,
  description text,
  avatar_url text,
  icon text,
  channel text NOT NULL DEFAULT 'whatsapp'::text,
  is_active boolean NOT NULL DEFAULT true,
  personality text,
  instructions text,
  operation_mode text DEFAULT 'Copiloto humano'::text,
  autonomy_level integer DEFAULT 2 CHECK (autonomy_level >= 1 AND autonomy_level <= 5),
  handoff_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  capabilities text[] NOT NULL DEFAULT '{}'::text[],
  tools text[] NOT NULL DEFAULT '{}'::text[],
  response_style text NOT NULL DEFAULT 'consultivo'::text,
  working_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  environment_id uuid,
  CONSTRAINT ai_agents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agent_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  channel_type text NOT NULL,
  instance_id text,
  can_read boolean NOT NULL DEFAULT true,
  can_reply boolean NOT NULL DEFAULT false,
  can_suggest boolean NOT NULL DEFAULT true,
  can_apply_tags boolean NOT NULL DEFAULT true,
  can_create_lead boolean NOT NULL DEFAULT false,
  can_transfer boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_channels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agent_workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  workspace_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_workspaces_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agent_triggers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  trigger_type text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_triggers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agent_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_permissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agent_pipelines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  pipeline_id text NOT NULL,
  allowed_stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocked_stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  can_create_card boolean NOT NULL DEFAULT false,
  can_move_card boolean NOT NULL DEFAULT false,
  can_create_task boolean NOT NULL DEFAULT false,
  can_define_loss_reason boolean NOT NULL DEFAULT false,
  default_human_owner_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_pipelines_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agent_knowledge_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id text,
  priority integer NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_knowledge_sources_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agent_handoff_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  condition_type text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  destination_type text,
  destination_id text,
  action_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_handoff_rules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agent_metrics_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  metric_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  target_value numeric,
  period text DEFAULT 'monthly'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_metrics_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agent_simulations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid,
  simulated_message text NOT NULL,
  simulated_channel text,
  simulated_instance_id text,
  simulated_stage text,
  ai_response text,
  predicted_actions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  handoff_prediction_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_simulations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agent_execution_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid,
  event_type text NOT NULL,
  channel text,
  instance_id text,
  conversation_id text,
  lead_id uuid,
  input_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'success'::text CHECK (status = ANY (ARRAY['success'::text, 'failed'::text, 'skipped'::text, 'waiting_approval'::text, 'transferred_to_human'::text])),
  error_message text,
  required_human_approval boolean NOT NULL DEFAULT false,
  executed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_execution_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  contract_id uuid,
  organization_id uuid,
  payment_date date,
  due_date date,
  amount_paid numeric,
  amount_due numeric,
  status text DEFAULT 'pendente'::text CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text, 'atrasado'::text, 'cancelado'::text])),
  payment_method text,
  observation text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_history_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contract_renewals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  contract_id uuid,
  organization_id uuid,
  old_rent numeric,
  new_rent numeric,
  old_end_date date,
  new_start_date date,
  new_end_date date,
  adjustment_index text,
  renewal_type text DEFAULT 'reajuste'::text CHECK (renewal_type = ANY (ARRAY['reajuste'::text, 'renovacao'::text, 'novo_contrato'::text])),
  observation text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contract_renewals_pkey PRIMARY KEY (id)
);
CREATE TABLE public.environments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['urban'::text, 'rural'::text])),
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  is_primary boolean NOT NULL DEFAULT false,
  brand_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT environments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  name text NOT NULL,
  document_type text CHECK (document_type = ANY (ARRAY['CPF'::text, 'CNPJ'::text, 'Passaporte'::text])),
  document_number text,
  email text,
  phone text,
  roles text[] DEFAULT '{}'::text[],
  birth_date date,
  marital_status text,
  profession text,
  monthly_income numeric,
  address_zip text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.migration_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'testing'::text, 'ready'::text, 'running'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'rolled_back'::text])),
  source_supabase_url text,
  target_supabase_url text,
  target_minio_endpoint text,
  selected_schemas text[] NOT NULL DEFAULT ARRAY['public'::text, 'auth'::text],
  selected_buckets text[] NOT NULL DEFAULT ARRAY['whatsapp-media'::text, 'imobzyimg'::text, 'imobzymsg'::text, 'documents'::text, 'exports'::text],
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  dry_run_approved boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT migration_jobs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.migration_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope = ANY (ARRAY['source'::text, 'target'::text, 'minio'::text])),
  encrypted_payload text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT migration_credentials_pkey PRIMARY KEY (id)
);
CREATE TABLE public.migration_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  step text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'skipped'::text, 'cancelled'::text])),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT migration_steps_pkey PRIMARY KEY (id)
);
CREATE TABLE public.migration_logs (
  id bigint NOT NULL DEFAULT nextval('migration_logs_id_seq'::regclass),
  job_id uuid,
  level text NOT NULL DEFAULT 'info'::text CHECK (level = ANY (ARRAY['debug'::text, 'info'::text, 'warn'::text, 'error'::text])),
  step text,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT migration_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.migration_errors (
  id bigint NOT NULL DEFAULT nextval('migration_errors_id_seq'::regclass),
  job_id uuid,
  step text,
  entity_type text,
  entity_name text,
  error_message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT migration_errors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.migration_file_map (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid,
  old_url text,
  new_url text,
  bucket text,
  path text,
  size bigint,
  content_type text,
  status text NOT NULL DEFAULT 'pending'::text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT migration_file_map_pkey PRIMARY KEY (id)
);
CREATE TABLE public.migration_table_map (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid,
  schema_name text NOT NULL,
  table_name text NOT NULL,
  source_count bigint,
  target_count bigint,
  migrated_count bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT migration_table_map_pkey PRIMARY KEY (id)
);
CREATE TABLE public.migration_config_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid,
  snapshot_type text NOT NULL CHECK (snapshot_type = ANY (ARRAY['before_activation'::text, 'after_activation'::text])),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT migration_config_snapshots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.email_accounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  user_id uuid,
  email text NOT NULL,
  encrypted_password text NOT NULL,
  imap_host text,
  imap_port integer DEFAULT 993,
  imap_secure boolean DEFAULT true,
  smtp_host text,
  smtp_port integer DEFAULT 465,
  smtp_secure boolean DEFAULT true,
  is_active boolean DEFAULT true,
  sync_status text DEFAULT 'idle'::text,
  sync_error text,
  last_synced_at timestamp with time zone,
  last_inbox_uid bigint DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  auth_method text NOT NULL DEFAULT 'password'::text,
  oauth_provider text,
  oauth_account_id text,
  CONSTRAINT email_accounts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.emails (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  account_id uuid,
  lead_id uuid,
  folder text DEFAULT 'inbox'::text,
  direction text DEFAULT 'incoming'::text,
  subject text,
  from_name text,
  from_email text NOT NULL,
  to_email text[] DEFAULT '{}'::text[],
  cc_email text[] DEFAULT '{}'::text[],
  body_html text,
  body_text text,
  preview text,
  date timestamp with time zone NOT NULL,
  is_read boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  message_id text,
  in_reply_to text,
  references_ids text[] DEFAULT '{}'::text[],
  thread_id text,
  imap_uid bigint,
  raw_headers jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  ai_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT emails_pkey PRIMARY KEY (id)
);
CREATE TABLE public.whatsapp_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  instance_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['image'::text, 'audio'::text, 'video'::text, 'document'::text, 'sticker'::text, 'unknown'::text])),
  provider text NOT NULL DEFAULT 'minio'::text,
  bucket text NOT NULL DEFAULT 'whatsapp-media'::text,
  object_key text NOT NULL DEFAULT ''::text,
  public_url text,
  filename text,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  duration_ms integer,
  thumbnail_url text,
  thumbnail_bucket text,
  thumbnail_object_key text,
  waveform jsonb,
  transcription text,
  summary text,
  sentiment text,
  extracted_tasks jsonb,
  ocr_text text,
  ai_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'downloading'::text, 'processing'::text, 'ready'::text, 'failed'::text, 'expired'::text])),
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  whatsapp_payload bytea,
  next_retry_at timestamp with time zone NOT NULL DEFAULT now(),
  claimed_at timestamp with time zone,
  source_message_id text,
  CONSTRAINT whatsapp_media_pkey PRIMARY KEY (id)
);
CREATE TABLE public.email_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid,
  account_id uuid,
  email_id uuid,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['email_received'::text, 'email_sent'::text])),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lead_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  tag text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lead_tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lead_followups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  title text NOT NULL,
  notes text,
  due_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'done'::text, 'cancelled'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  kind text NOT NULL DEFAULT 'follow_up'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT lead_followups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.email_automation_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  email_id uuid,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued'::text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_after timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_automation_jobs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.impersonation_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid,
  actor_user_id uuid NOT NULL,
  impersonated_user_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'active'::text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT impersonation_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  price numeric NOT NULL,
  price_per_ha numeric,
  price_per_m2 numeric,
  source text DEFAULT 'manual'::text,
  changed_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT price_history_pkey PRIMARY KEY (id)
);
CREATE TABLE public.property_valuations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  organization_id uuid,
  estimated_value numeric NOT NULL,
  min_value numeric,
  max_value numeric,
  confidence real DEFAULT 0.0,
  method text NOT NULL CHECK (method = ANY (ARRAY['rule_based'::text, 'hedonic'::text, 'comparative'::text, 'ml_model'::text, 'manual'::text])),
  model_version text,
  currency text DEFAULT 'BRL'::text,
  factors jsonb DEFAULT '[]'::jsonb,
  breakdown jsonb DEFAULT '{}'::jsonb,
  rules_applied text[] DEFAULT '{}'::text[],
  triggered_by uuid,
  triggered_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT property_valuations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.valuation_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  description text,
  rule_type text NOT NULL CHECK (rule_type = ANY (ARRAY['base_price'::text, 'multiplier'::text, 'premium'::text, 'deduction'::text])),
  property_type text,
  city text,
  state text,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  value numeric NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valuation_rules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.comparable_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  property_id uuid,
  sale_price numeric NOT NULL,
  sale_date date NOT NULL,
  source text NOT NULL DEFAULT 'internal'::text,
  source_url text,
  property_type text,
  city text,
  state text,
  neighborhood text,
  area_ha numeric,
  area_m2 numeric,
  features_summary jsonb DEFAULT '{}'::jsonb,
  reliability real DEFAULT 0.5,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comparable_sales_pkey PRIMARY KEY (id)
);
CREATE TABLE public.market_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  indicator_key text NOT NULL UNIQUE,
  indicator_type text NOT NULL,
  city text,
  state text,
  value numeric NOT NULL,
  unit text,
  source text NOT NULL,
  reference_date date NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT market_indicators_pkey PRIMARY KEY (id)
);
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  property_id uuid,
  bucket text NOT NULL DEFAULT 'documents'::text,
  object_key text NOT NULL,
  original_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  document_type text CHECK (document_type = ANY (ARRAY['ESCRITURA'::text, 'MATRICULA'::text, 'CAR'::text, 'CCIR'::text, 'ITR'::text, 'IPTU'::text, 'CONTRATO'::text, 'CND'::text, 'PROCURACAO'::text, 'RG'::text, 'CPF'::text, 'CNPJ'::text, 'COMPROVANTE_ENDERECO'::text, 'COMPROVANTE_RENDA'::text, 'OUTRO'::text])),
  classification_confidence real,
  classified_by text CHECK (classified_by = ANY (ARRAY['ia'::text, 'manual'::text])),
  classified_at timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'analyzed'::text, 'failed'::text, 'validated'::text])),
  processing_error text,
  raw_text text,
  ocr_confidence real,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  validation_score real CHECK (validation_score >= 0::double precision AND validation_score <= 100::double precision),
  validation_status text CHECK (validation_status = ANY (ARRAY['unchecked'::text, 'valid'::text, 'inconsistent'::text, 'failed'::text])),
  validation_details jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.document_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid,
  property_id uuid,
  analysis_type text NOT NULL CHECK (analysis_type = ANY (ARRAY['ocr'::text, 'classification'::text, 'extraction'::text, 'validation'::text, 'cross_reference'::text])),
  provider text NOT NULL,
  model_name text,
  input_tokens integer,
  output_tokens integer,
  confidence real,
  processing_time_ms integer,
  result jsonb DEFAULT '{}'::jsonb,
  error text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT document_analyses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.external_data_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  source text NOT NULL,
  data jsonb NOT NULL,
  etag text,
  ttl_seconds integer DEFAULT 86400,
  fetched_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '1 day'::interval),
  CONSTRAINT external_data_cache_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ibge_municipios (
  codigo_ibge text NOT NULL,
  nome text NOT NULL,
  uf text NOT NULL,
  regiao text,
  geom geometry,
  area_km2 numeric,
  populacao integer,
  pib_per_capita numeric,
  idh numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ibge_municipios_pkey PRIMARY KEY (codigo_ibge)
);
CREATE TABLE public.document_external_validations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid,
  source text NOT NULL,
  queried_at timestamp with time zone DEFAULT now(),
  response_status text,
  matched boolean,
  match_confidence real,
  response_data jsonb DEFAULT '{}'::jsonb,
  response_time_ms integer,
  error text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT document_external_validations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.storage_objects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  bucket text NOT NULL,
  object_key text NOT NULL,
  sha256 text,
  etag text,
  size_bytes bigint,
  mime_type text,
  source text,
  entity_type text,
  entity_id text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT storage_objects_pkey PRIMARY KEY (id)
);
CREATE TABLE public.storage_inventory_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  object_key text NOT NULL,
  size_bytes bigint,
  etag text,
  extension text,
  prefix text,
  tenant_id text,
  is_version boolean DEFAULT false,
  version_id text,
  is_delete_marker boolean DEFAULT false,
  last_modified timestamp with time zone,
  scanned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT storage_inventory_snapshots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.storage_admin_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text NOT NULL,
  bucket text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT storage_admin_actions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.quiz_campaigns (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  property_label text NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text])),
  whatsapp_number text NOT NULL,
  qualification_threshold integer NOT NULL DEFAULT 70 CHECK (qualification_threshold >= 0 AND qualification_threshold <= 100),
  intro_title text NOT NULL,
  intro_copy text NOT NULL,
  success_message text NOT NULL,
  disqualification_message text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT quiz_campaigns_pkey PRIMARY KEY (id)
);
CREATE TABLE public.quiz_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  lead_id uuid,
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  qualification_status text NOT NULL CHECK (qualification_status = ANY (ARRAY['qualified'::text, 'nurture'::text])),
  disqualification_reasons text[] NOT NULL DEFAULT '{}'::text[],
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT quiz_submissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.whatsmeow_version (
  version integer,
  compat integer
);
CREATE TABLE public.whatsmeow_device (
  jid text NOT NULL,
  lid text,
  facebook_uuid uuid,
  registration_id bigint NOT NULL CHECK (registration_id >= 0 AND registration_id < '4294967296'::bigint),
  noise_key bytea NOT NULL CHECK (length(noise_key) = 32),
  identity_key bytea NOT NULL CHECK (length(identity_key) = 32),
  signed_pre_key bytea NOT NULL CHECK (length(signed_pre_key) = 32),
  signed_pre_key_id integer NOT NULL CHECK (signed_pre_key_id >= 0 AND signed_pre_key_id < 16777216),
  signed_pre_key_sig bytea NOT NULL CHECK (length(signed_pre_key_sig) = 64),
  adv_key bytea NOT NULL,
  adv_details bytea NOT NULL,
  adv_account_sig bytea NOT NULL CHECK (length(adv_account_sig) = 64),
  adv_account_sig_key bytea NOT NULL CHECK (length(adv_account_sig_key) = 32),
  adv_device_sig bytea NOT NULL CHECK (length(adv_device_sig) = 64),
  platform text NOT NULL DEFAULT ''::text,
  business_name text NOT NULL DEFAULT ''::text,
  push_name text NOT NULL DEFAULT ''::text,
  lid_migration_ts bigint NOT NULL DEFAULT 0,
  CONSTRAINT whatsmeow_device_pkey PRIMARY KEY (jid)
);
CREATE TABLE public.whatsmeow_identity_keys (
  our_jid text NOT NULL,
  their_id text NOT NULL,
  identity bytea NOT NULL CHECK (length(identity) = 32),
  CONSTRAINT whatsmeow_identity_keys_pkey PRIMARY KEY (our_jid, their_id)
);
CREATE TABLE public.whatsmeow_pre_keys (
  jid text NOT NULL,
  key_id integer NOT NULL CHECK (key_id >= 0 AND key_id < 16777216),
  key bytea NOT NULL CHECK (length(key) = 32),
  uploaded boolean NOT NULL,
  CONSTRAINT whatsmeow_pre_keys_pkey PRIMARY KEY (jid, key_id)
);
CREATE TABLE public.whatsmeow_sessions (
  our_jid text NOT NULL,
  their_id text NOT NULL,
  session bytea,
  CONSTRAINT whatsmeow_sessions_pkey PRIMARY KEY (our_jid, their_id)
);
CREATE TABLE public.whatsmeow_sender_keys (
  our_jid text NOT NULL,
  chat_id text NOT NULL,
  sender_id text NOT NULL,
  sender_key bytea NOT NULL,
  CONSTRAINT whatsmeow_sender_keys_pkey PRIMARY KEY (our_jid, chat_id, sender_id)
);
CREATE TABLE public.whatsmeow_app_state_sync_keys (
  jid text NOT NULL,
  key_id bytea NOT NULL,
  key_data bytea NOT NULL,
  timestamp bigint NOT NULL,
  fingerprint bytea NOT NULL,
  CONSTRAINT whatsmeow_app_state_sync_keys_pkey PRIMARY KEY (jid, key_id)
);
CREATE TABLE public.whatsmeow_app_state_version (
  jid text NOT NULL,
  name text NOT NULL,
  version bigint NOT NULL,
  hash bytea NOT NULL CHECK (length(hash) = 128),
  CONSTRAINT whatsmeow_app_state_version_pkey PRIMARY KEY (jid, name)
);
CREATE TABLE public.whatsmeow_app_state_mutation_macs (
  jid text NOT NULL,
  name text NOT NULL,
  version bigint NOT NULL,
  index_mac bytea NOT NULL CHECK (length(index_mac) = 32),
  value_mac bytea NOT NULL CHECK (length(value_mac) = 32),
  CONSTRAINT whatsmeow_app_state_mutation_macs_pkey PRIMARY KEY (jid, name, version, index_mac)
);
CREATE TABLE public.whatsmeow_contacts (
  our_jid text NOT NULL,
  their_jid text NOT NULL,
  first_name text,
  full_name text,
  push_name text,
  business_name text,
  redacted_phone text,
  CONSTRAINT whatsmeow_contacts_pkey PRIMARY KEY (our_jid, their_jid)
);
CREATE TABLE public.whatsmeow_chat_settings (
  our_jid text NOT NULL,
  chat_jid text NOT NULL,
  muted_until bigint NOT NULL DEFAULT 0,
  pinned boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  CONSTRAINT whatsmeow_chat_settings_pkey PRIMARY KEY (our_jid, chat_jid)
);
CREATE TABLE public.whatsmeow_message_secrets (
  our_jid text NOT NULL,
  chat_jid text NOT NULL,
  sender_jid text NOT NULL,
  message_id text NOT NULL,
  key bytea NOT NULL,
  CONSTRAINT whatsmeow_message_secrets_pkey PRIMARY KEY (our_jid, chat_jid, sender_jid, message_id)
);
CREATE TABLE public.whatsmeow_privacy_tokens (
  our_jid text NOT NULL,
  their_jid text NOT NULL,
  token bytea NOT NULL,
  timestamp bigint NOT NULL,
  sender_timestamp bigint,
  CONSTRAINT whatsmeow_privacy_tokens_pkey PRIMARY KEY (our_jid, their_jid)
);
CREATE TABLE public.whatsmeow_lid_map (
  lid text NOT NULL,
  pn text NOT NULL UNIQUE,
  CONSTRAINT whatsmeow_lid_map_pkey PRIMARY KEY (lid)
);
CREATE TABLE public.whatsmeow_event_buffer (
  our_jid text NOT NULL,
  ciphertext_hash bytea NOT NULL CHECK (length(ciphertext_hash) = 32),
  plaintext bytea,
  server_timestamp bigint NOT NULL,
  insert_timestamp bigint NOT NULL,
  CONSTRAINT whatsmeow_event_buffer_pkey PRIMARY KEY (our_jid, ciphertext_hash)
);
CREATE TABLE public.whatsmeow_retry_buffer (
  our_jid text NOT NULL,
  chat_jid text NOT NULL,
  message_id text NOT NULL,
  format text NOT NULL,
  plaintext bytea NOT NULL,
  timestamp bigint NOT NULL,
  CONSTRAINT whatsmeow_retry_buffer_pkey PRIMARY KEY (our_jid, chat_jid, message_id)
);
CREATE TABLE public.leases (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  contract_number text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'cadastral_analysis'::text, 'income_analysis'::text, 'pending_signatures'::text, 'active'::text, 'suspended'::text, 'terminated'::text, 'expired'::text, 'archived'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  signed_at timestamp with time zone,
  activated_at timestamp with time zone,
  terminated_at timestamp with time zone,
  property_id uuid,
  owner_id uuid,
  tenant_id uuid,
  tenant_name text,
  tenant_email text,
  tenant_phone text,
  tenant_cpf text,
  tenant_rg text,
  tenant_type text CHECK (tenant_type = ANY (ARRAY['PF'::text, 'PJ'::text])),
  tenant_birth_date date,
  tenant_marital_status text,
  tenant_profession text,
  tenant_employer text,
  tenant_monthly_income numeric,
  co_tenants uuid[] DEFAULT '{}'::uuid[],
  guarantor_id uuid,
  guarantor_name text,
  guarantor_cpf text,
  guarantor_phone text,
  guarantor_email text,
  guarantor_monthly_income numeric,
  witness_1_id uuid,
  witness_1_name text,
  witness_1_cpf text,
  witness_2_id uuid,
  witness_2_name text,
  witness_2_cpf text,
  guarantee_type text CHECK (guarantee_type = ANY (ARRAY['fiador'::text, 'seguro_fianca'::text, 'deposito_caucao'::text, 'titulo_capitalizacao'::text, 'sem'::text])),
  guarantee_value numeric,
  guarantee_details jsonb,
  caution_amount numeric,
  caution_payment_date date,
  insurance_company text,
  insurance_policy_number text,
  monthly_rent numeric NOT NULL DEFAULT 0,
  condominium_fee numeric DEFAULT 0,
  iptu_amount numeric DEFAULT 0,
  due_day integer CHECK (due_day >= 1 AND due_day <= 31),
  adjustment_index text DEFAULT 'IGPM'::text,
  adjustment_period_months integer DEFAULT 12,
  late_fee_percent numeric DEFAULT 2.00,
  late_interest_percent numeric DEFAULT 0.03333,
  currency_correction boolean DEFAULT true,
  start_date date,
  end_date date,
  contract_duration_months integer,
  occupation_date date,
  key_delivery_date date,
  rental_purpose text,
  commission_percent numeric DEFAULT 0,
  commission_payer text CHECK (commission_payer = ANY (ARRAY['locador'::text, 'locatario'::text, 'ambos'::text])),
  signature_method text,
  signature_status text DEFAULT 'pending'::text CHECK (signature_status = ANY (ARRAY['pending'::text, 'sent'::text, 'partially_signed'::text, 'signed'::text, 'refused'::text, 'expired'::text])),
  signed_document_url text,
  evaluation_score integer DEFAULT 0,
  evaluation_status text DEFAULT 'em_analise'::text CHECK (evaluation_status = ANY (ARRAY['em_analise'::text, 'aprovado'::text, 'aprovado_com_ressalva'::text, 'reprovado'::text])),
  credit_score integer,
  has_restrictions boolean DEFAULT false,
  restriction_notes text,
  analysis_notes text,
  payment_status text DEFAULT 'em_dia'::text CHECK (payment_status = ANY (ARRAY['em_dia'::text, 'atrasado'::text, 'inadimplente'::text])),
  current_template_id uuid,
  last_rent_adjustment date,
  next_rent_adjustment date,
  renewal_count integer DEFAULT 0,
  previous_lease_id uuid,
  created_by uuid,
  updated_by uuid,
  CONSTRAINT leases_pkey PRIMARY KEY (id)
);


-- ==========================================
-- FOREIGN KEYS (ADDED AT THE END TO AVOID DEPENDENCY ISSUES)
-- ==========================================
ALTER TABLE public.organizations ADD CONSTRAINT organizations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.properties ADD CONSTRAINT properties_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.properties ADD CONSTRAINT properties_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.profiles(id);
ALTER TABLE public.properties ADD CONSTRAINT properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.clients(id);
ALTER TABLE public.properties ADD CONSTRAINT properties_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id);
ALTER TABLE public.property_polygons ADD CONSTRAINT property_polygons_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE public.leads ADD CONSTRAINT leads_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.leads ADD CONSTRAINT leads_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE public.leads ADD CONSTRAINT leads_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.leads ADD CONSTRAINT leads_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id);
ALTER TABLE public.leads ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id);
ALTER TABLE public.landing_pages ADD CONSTRAINT landing_pages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.landing_pages ADD CONSTRAINT landing_pages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.landing_pages ADD CONSTRAINT landing_pages_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id);
ALTER TABLE public.site_texts ADD CONSTRAINT site_texts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);
ALTER TABLE public.due_diligence_items ADD CONSTRAINT due_diligence_items_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE public.contracts ADD CONSTRAINT contracts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.contracts ADD CONSTRAINT contracts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE public.contracts ADD CONSTRAINT contracts_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);
ALTER TABLE public.instances ADD CONSTRAINT instances_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.contacts ADD CONSTRAINT contacts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.contacts ADD CONSTRAINT contacts_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.instances(id);
ALTER TABLE public.domains ADD CONSTRAINT domains_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.saas_settings ADD CONSTRAINT saas_settings_default_plan_id_fkey FOREIGN KEY (default_plan_id) REFERENCES public.plans(id);
ALTER TABLE public.messages ADD CONSTRAINT messages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.messages ADD CONSTRAINT messages_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.instances(id);
ALTER TABLE public.messages ADD CONSTRAINT messages_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);
ALTER TABLE public.rental_contracts ADD CONSTRAINT rental_contracts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.rental_contracts ADD CONSTRAINT rental_contracts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE public.rental_contracts ADD CONSTRAINT rental_contracts_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id);
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id);
ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.whatsapp_instances ADD CONSTRAINT whatsapp_instances_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id);
ALTER TABLE public.whatsapp_instances ADD CONSTRAINT whatsapp_instances_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.whatsapp_contacts ADD CONSTRAINT whatsapp_contacts_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id);
ALTER TABLE public.whatsapp_chats ADD CONSTRAINT whatsapp_chats_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id);
ALTER TABLE public.whatsapp_messages ADD CONSTRAINT whatsapp_messages_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id);
ALTER TABLE public.whatsapp_messages ADD CONSTRAINT whatsapp_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.whatsapp_chats(id);
ALTER TABLE public.billing ADD CONSTRAINT billing_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.billing ADD CONSTRAINT billing_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id);
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.developments ADD CONSTRAINT developments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.developments ADD CONSTRAINT developments_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id);
ALTER TABLE public.blocks ADD CONSTRAINT blocks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.blocks ADD CONSTRAINT blocks_development_id_fkey FOREIGN KEY (development_id) REFERENCES public.developments(id);
ALTER TABLE public.lots ADD CONSTRAINT lots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.lots ADD CONSTRAINT lots_development_id_fkey FOREIGN KEY (development_id) REFERENCES public.developments(id);
ALTER TABLE public.lots ADD CONSTRAINT lots_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.blocks(id);
ALTER TABLE public.billings ADD CONSTRAINT billings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.billings ADD CONSTRAINT billings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id);
ALTER TABLE public."User" ADD CONSTRAINT "User_accessProfileId_fkey" FOREIGN KEY (accessProfileId) REFERENCES public."AccessProfile"(id);
ALTER TABLE public."Organization" ADD CONSTRAINT "Organization_planId_fkey" FOREIGN KEY (planId) REFERENCES public."Plan"(id);
ALTER TABLE public.ai_agents ADD CONSTRAINT ai_agents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.ai_agents ADD CONSTRAINT ai_agents_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id);
ALTER TABLE public.agent_channels ADD CONSTRAINT agent_channels_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.agent_channels ADD CONSTRAINT agent_channels_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id);
ALTER TABLE public.agent_workspaces ADD CONSTRAINT agent_workspaces_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.agent_workspaces ADD CONSTRAINT agent_workspaces_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id);
ALTER TABLE public.agent_triggers ADD CONSTRAINT agent_triggers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.agent_triggers ADD CONSTRAINT agent_triggers_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id);
ALTER TABLE public.agent_permissions ADD CONSTRAINT agent_permissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.agent_permissions ADD CONSTRAINT agent_permissions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id);
ALTER TABLE public.agent_pipelines ADD CONSTRAINT agent_pipelines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.agent_pipelines ADD CONSTRAINT agent_pipelines_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id);
ALTER TABLE public.agent_knowledge_sources ADD CONSTRAINT agent_knowledge_sources_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.agent_knowledge_sources ADD CONSTRAINT agent_knowledge_sources_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id);
ALTER TABLE public.agent_handoff_rules ADD CONSTRAINT agent_handoff_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.agent_handoff_rules ADD CONSTRAINT agent_handoff_rules_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id);
ALTER TABLE public.agent_metrics_config ADD CONSTRAINT agent_metrics_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.agent_metrics_config ADD CONSTRAINT agent_metrics_config_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id);
ALTER TABLE public.agent_simulations ADD CONSTRAINT agent_simulations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.agent_simulations ADD CONSTRAINT agent_simulations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id);
ALTER TABLE public.agent_execution_logs ADD CONSTRAINT agent_execution_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.agent_execution_logs ADD CONSTRAINT agent_execution_logs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id);
ALTER TABLE public.payment_history ADD CONSTRAINT payment_history_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.rental_contracts(id);
ALTER TABLE public.payment_history ADD CONSTRAINT payment_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.contract_renewals ADD CONSTRAINT contract_renewals_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.rental_contracts(id);
ALTER TABLE public.contract_renewals ADD CONSTRAINT contract_renewals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.environments ADD CONSTRAINT environments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.clients ADD CONSTRAINT clients_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.migration_credentials ADD CONSTRAINT migration_credentials_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.migration_jobs(id);
ALTER TABLE public.migration_steps ADD CONSTRAINT migration_steps_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.migration_jobs(id);
ALTER TABLE public.migration_logs ADD CONSTRAINT migration_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.migration_jobs(id);
ALTER TABLE public.migration_errors ADD CONSTRAINT migration_errors_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.migration_jobs(id);
ALTER TABLE public.migration_file_map ADD CONSTRAINT migration_file_map_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.migration_jobs(id);
ALTER TABLE public.migration_table_map ADD CONSTRAINT migration_table_map_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.migration_jobs(id);
ALTER TABLE public.migration_config_snapshots ADD CONSTRAINT migration_config_snapshots_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.migration_jobs(id);
ALTER TABLE public.email_accounts ADD CONSTRAINT email_accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.email_accounts ADD CONSTRAINT email_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.emails ADD CONSTRAINT emails_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.emails ADD CONSTRAINT emails_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.email_accounts(id);
ALTER TABLE public.emails ADD CONSTRAINT emails_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);
ALTER TABLE public.whatsapp_media ADD CONSTRAINT whatsapp_media_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id);
ALTER TABLE public.whatsapp_media ADD CONSTRAINT whatsapp_media_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id);
ALTER TABLE public.whatsapp_media ADD CONSTRAINT whatsapp_media_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.email_events ADD CONSTRAINT email_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.email_events ADD CONSTRAINT email_events_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.email_accounts(id);
ALTER TABLE public.email_events ADD CONSTRAINT email_events_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(id);
ALTER TABLE public.lead_tags ADD CONSTRAINT lead_tags_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.lead_tags ADD CONSTRAINT lead_tags_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);
ALTER TABLE public.lead_followups ADD CONSTRAINT lead_followups_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.lead_followups ADD CONSTRAINT lead_followups_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);
ALTER TABLE public.email_automation_jobs ADD CONSTRAINT email_automation_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.email_automation_jobs ADD CONSTRAINT email_automation_jobs_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(id);
ALTER TABLE public.price_history ADD CONSTRAINT price_history_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE public.price_history ADD CONSTRAINT price_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id);
ALTER TABLE public.property_valuations ADD CONSTRAINT property_valuations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE public.property_valuations ADD CONSTRAINT property_valuations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.property_valuations ADD CONSTRAINT property_valuations_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.profiles(id);
ALTER TABLE public.valuation_rules ADD CONSTRAINT valuation_rules_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.comparable_sales ADD CONSTRAINT comparable_sales_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.comparable_sales ADD CONSTRAINT comparable_sales_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE public.documents ADD CONSTRAINT documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.documents ADD CONSTRAINT documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE public.document_analyses ADD CONSTRAINT document_analyses_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);
ALTER TABLE public.document_analyses ADD CONSTRAINT document_analyses_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE public.document_external_validations ADD CONSTRAINT document_external_validations_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);
ALTER TABLE public.storage_objects ADD CONSTRAINT storage_objects_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id);
ALTER TABLE public.storage_admin_actions ADD CONSTRAINT storage_admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id);
ALTER TABLE public.quiz_campaigns ADD CONSTRAINT quiz_campaigns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.quiz_campaigns ADD CONSTRAINT quiz_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.quiz_submissions ADD CONSTRAINT quiz_submissions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.quiz_submissions ADD CONSTRAINT quiz_submissions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.quiz_campaigns(id);
ALTER TABLE public.quiz_submissions ADD CONSTRAINT quiz_submissions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);
ALTER TABLE public.whatsmeow_identity_keys ADD CONSTRAINT whatsmeow_identity_keys_our_jid_fkey FOREIGN KEY (our_jid) REFERENCES public.whatsmeow_device(jid);
ALTER TABLE public.whatsmeow_pre_keys ADD CONSTRAINT whatsmeow_pre_keys_jid_fkey FOREIGN KEY (jid) REFERENCES public.whatsmeow_device(jid);
ALTER TABLE public.whatsmeow_sessions ADD CONSTRAINT whatsmeow_sessions_our_jid_fkey FOREIGN KEY (our_jid) REFERENCES public.whatsmeow_device(jid);
ALTER TABLE public.whatsmeow_sender_keys ADD CONSTRAINT whatsmeow_sender_keys_our_jid_fkey FOREIGN KEY (our_jid) REFERENCES public.whatsmeow_device(jid);
ALTER TABLE public.whatsmeow_app_state_sync_keys ADD CONSTRAINT whatsmeow_app_state_sync_keys_jid_fkey FOREIGN KEY (jid) REFERENCES public.whatsmeow_device(jid);
ALTER TABLE public.whatsmeow_app_state_version ADD CONSTRAINT whatsmeow_app_state_version_jid_fkey FOREIGN KEY (jid) REFERENCES public.whatsmeow_device(jid);
ALTER TABLE public.whatsmeow_app_state_mutation_macs ADD CONSTRAINT whatsmeow_app_state_mutation_macs_jid_name_fkey FOREIGN KEY (jid, name) REFERENCES public.whatsmeow_app_state_version(jid, name);

ALTER TABLE public.whatsmeow_contacts ADD CONSTRAINT whatsmeow_contacts_our_jid_fkey FOREIGN KEY (our_jid) REFERENCES public.whatsmeow_device(jid);
ALTER TABLE public.whatsmeow_chat_settings ADD CONSTRAINT whatsmeow_chat_settings_our_jid_fkey FOREIGN KEY (our_jid) REFERENCES public.whatsmeow_device(jid);
ALTER TABLE public.whatsmeow_message_secrets ADD CONSTRAINT whatsmeow_message_secrets_our_jid_fkey FOREIGN KEY (our_jid) REFERENCES public.whatsmeow_device(jid);
ALTER TABLE public.whatsmeow_event_buffer ADD CONSTRAINT whatsmeow_event_buffer_our_jid_fkey FOREIGN KEY (our_jid) REFERENCES public.whatsmeow_device(jid);
ALTER TABLE public.whatsmeow_retry_buffer ADD CONSTRAINT whatsmeow_retry_buffer_our_jid_fkey FOREIGN KEY (our_jid) REFERENCES public.whatsmeow_device(jid);
ALTER TABLE public.leases ADD CONSTRAINT leases_previous_lease_id_fkey FOREIGN KEY (previous_lease_id) REFERENCES public.leases(id);
ALTER TABLE public.leases ADD CONSTRAINT leases_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.leases ADD CONSTRAINT leases_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.leases ADD CONSTRAINT leases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.leases ADD CONSTRAINT leases_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE public.leases ADD CONSTRAINT leases_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.clients(id);
ALTER TABLE public.leases ADD CONSTRAINT leases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id);
ALTER TABLE public.leases ADD CONSTRAINT leases_guarantor_id_fkey FOREIGN KEY (guarantor_id) REFERENCES public.clients(id);
ALTER TABLE public.leases ADD CONSTRAINT leases_witness_1_id_fkey FOREIGN KEY (witness_1_id) REFERENCES public.clients(id);
ALTER TABLE public.leases ADD CONSTRAINT leases_witness_2_id_fkey FOREIGN KEY (witness_2_id) REFERENCES public.clients(id);


-- ============================================
-- SAAS WHITELABEL B2B2B EVOLUTION
-- ============================================

-- 1. Add fields to Organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_reseller BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES organizations(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS platform_domain TEXT UNIQUE;

-- 2. Add fields to Site Settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS smtp_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS onboarding_config JSONB DEFAULT '{}'::jsonb;

-- 3. Update RLS on Organizations (Example: Reseller can see their sub-organizations)
-- This assumes RLS is enabled on organizations. 
-- We'll add a policy so that if user is in an organization that is a reseller, they can see organizations where parent_id = their_organization_id
-- We need to check if there is an existing policy. For safety, we just CREATE POLICY, which might fail if it already exists, so we use a DO block.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Reseller can see sub-organizations'
    ) THEN
        CREATE POLICY "Reseller can see sub-organizations"
        ON organizations
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM profiles p 
                JOIN organizations o ON p.organization_id = o.id 
                WHERE p.id = auth.uid() AND o.is_reseller = true AND organizations.parent_id = o.id
            )
        );
    END IF;
END $$;


-- Enable Reseller (Revenda) to view their sub-organizations
DROP POLICY IF EXISTS "Reseller view sub-organizations" ON public.organizations;
CREATE POLICY "Reseller view sub-organizations" ON public.organizations
  FOR SELECT
  USING (
    parent_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- Enable Reseller to manage (update) their sub-organizations
DROP POLICY IF EXISTS "Reseller update sub-organizations" ON public.organizations;
CREATE POLICY "Reseller update sub-organizations" ON public.organizations
  FOR UPDATE
  USING (
    parent_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- Enable Reseller to insert new sub-organizations
DROP POLICY IF EXISTS "Reseller insert sub-organizations" ON public.organizations;
CREATE POLICY "Reseller insert sub-organizations" ON public.organizations
  FOR INSERT
  WITH CHECK (
    parent_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- Enable Reseller to view users belonging to their sub-organizations
DROP POLICY IF EXISTS "Reseller view sub-organization users" ON public.profiles;
CREATE POLICY "Reseller view sub-organization users" ON public.profiles
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations 
      WHERE parent_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
      )
    )
  );

-- Enable Reseller to view site_settings of their sub-organizations
DROP POLICY IF EXISTS "Reseller view sub-organization settings" ON public.site_settings;
CREATE POLICY "Reseller view sub-organization settings" ON public.site_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations 
      WHERE parent_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
      )
    )
  );
