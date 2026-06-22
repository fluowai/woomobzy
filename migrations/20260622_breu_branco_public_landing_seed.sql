CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Public campaign assets for Fazendas Brasil - Breu Branco/PA.
-- This keeps the public landing page reproducible after deploys and database rebuilds.

DO $$
DECLARE
  fazendas_org_id UUID := 'ee2eafa9-929a-460e-a38a-2e13d259e7cb';
  owner_user_id UUID;
  whatsapp_number TEXT := '5544998433030';
  whatsapp_link TEXT := 'https://wa.me/5544998433030?text=Ol%C3%A1%2C%20tenho%20interesse%20na%20Fazenda%20de%20Breu%20Branco-PA%20e%20gostaria%20de%20receber%20o%20material%20completo.';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = fazendas_org_id) THEN
    RETURN;
  END IF;

  SELECT id INTO owner_user_id
  FROM public.profiles
  WHERE id = '44c2da9d-c597-4857-adec-d200d3897084'
    AND organization_id = fazendas_org_id
  LIMIT 1;

  INSERT INTO public.quiz_campaigns (
    organization_id,
    title,
    slug,
    property_label,
    status,
    whatsapp_number,
    qualification_threshold,
    intro_title,
    intro_copy,
    success_message,
    disqualification_message,
    questions,
    branding,
    created_by
  )
  SELECT
    fazendas_org_id,
    'Fazenda de Dupla Aptidao em Breu Branco-PA',
    campaign_slug,
    '72 alqueiroes | 348,48 hectares | Pecuaria pronta e potencial agricola',
    'active',
    whatsapp_number,
    70,
    'Perfil de comprador para Fazenda em Breu Branco-PA',
    'Responda algumas perguntas rapidas para receber o material completo e avancar para uma visita tecnica com a equipe Fazendas Brasil.',
    'Perfil compativel. Vamos continuar pelo WhatsApp para envio do material completo.',
    'Obrigado pelo interesse. Neste momento, as informacoes completas sao direcionadas a compradores com perfil financeiro aderente.',
    $questions$[
      {"id":"purpose","label":"Qual a finalidade principal da compra?","type":"single","required":true,"options":[{"value":"pecuaria","label":"Pecuaria","score":20},{"value":"lavoura","label":"Lavoura","score":20},{"value":"investimento","label":"Investimento patrimonial","score":20},{"value":"pesquisa","label":"Ainda estou apenas pesquisando","score":0,"reason":"Lead em fase inicial de pesquisa"}]},
      {"id":"budget","label":"Qual faixa de investimento voce considera?","type":"single","required":true,"options":[{"value":"ate-5m","label":"Ate R$5 milhoes","score":0,"disqualify":true,"reason":"Faixa abaixo do perfil da oportunidade"},{"value":"5m-10m","label":"R$5M a R$10M","score":25},{"value":"acima-10m","label":"Acima de R$10M","score":30}]},
      {"id":"operation","label":"Voce ja possui operacao rural?","type":"single","required":true,"options":[{"value":"sim","label":"Sim","score":20},{"value":"investidor","label":"Nao, estou comprando como investidor","score":14},{"value":"representante","label":"Represento comprador direto","score":10}]},
      {"id":"visit","label":"Se o material fizer sentido, voce pode avancar para visita tecnica?","type":"single","required":true,"options":[{"value":"sim","label":"Sim, posso avancar","score":20},{"value":"material","label":"Quero avaliar material primeiro","score":10},{"value":"sem-prazo","label":"Ainda nao tenho prazo","score":0,"reason":"Sem prazo de visita"}]},
      {"id":"role","label":"Voce e o decisor da compra?","type":"single","required":true,"options":[{"value":"decisor","label":"Decisor/comprador direto","score":15},{"value":"socio","label":"Socio/familiar envolvido","score":10},{"value":"corretor","label":"Corretor/intermediario","score":0,"reason":"Intermediario"}]}
    ]$questions$::jsonb,
    jsonb_build_object(
      'primary', '#062c1d',
      'secondary', '#d6b25e',
      'background', '#f7f2e8',
      'logo', '/images/fazendas-brasil/logo.png',
      'side_image', '/images/fazendas-brasil/breu-branco-hero-clean.webp',
      'lead_source', 'Landing Page Breu Branco ACP',
      'match_profile', 'rural',
      'niche', 'rural'
    ),
    owner_user_id
  FROM (VALUES ('breu-branco'), ('fazenda-breu-branco')) AS s(campaign_slug)
  ON CONFLICT (organization_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    property_label = EXCLUDED.property_label,
    status = EXCLUDED.status,
    whatsapp_number = EXCLUDED.whatsapp_number,
    qualification_threshold = EXCLUDED.qualification_threshold,
    intro_title = EXCLUDED.intro_title,
    intro_copy = EXCLUDED.intro_copy,
    success_message = EXCLUDED.success_message,
    disqualification_message = EXCLUDED.disqualification_message,
    questions = EXCLUDED.questions,
    branding = EXCLUDED.branding,
    updated_at = now();

  INSERT INTO public.landing_pages (
    organization_id,
    user_id,
    name,
    slug,
    title,
    description,
    meta_title,
    meta_description,
    og_image,
    template_id,
    theme_config,
    blocks,
    settings,
    property_selection,
    form_config,
    status,
    published_at,
    custom_css
  )
  SELECT
    fazendas_org_id,
    owner_user_id,
    'Fazenda Breu Branco - Landing Page Premium',
    page_slug,
    'Fazenda de Dupla Aptidao em Breu Branco - PA',
    '72 alqueiroes, 348,48 hectares, pecuaria pronta e potencial agricola em Breu Branco/PA.',
    'Fazenda de Dupla Aptidao em Breu Branco - PA | Fazendas Brasil',
    'Oportunidade rural premium com agua, estrutura nova, pecuaria pronta e potencial agricola em mais de 300 hectares.',
    '/images/fazendas-brasil/breu-branco-hero-clean.webp',
    'rural-investment-premium',
    $theme${
      "primaryColor": "#062c1d",
      "secondaryColor": "#d6b25e",
      "accentColor": "#f2d98d",
      "backgroundColor": "#f7f2e8",
      "textColor": "#10241a",
      "fontFamily": "Inter, system-ui, sans-serif",
      "headingFontFamily": "Playfair Display, Georgia, serif",
      "fontSize": {"base":"16px","heading1":"56px","heading2":"36px","heading3":"24px"},
      "borderRadius": "8px",
      "spacing": {"xs":"8px","sm":"12px","md":"20px","lg":"32px","xl":"56px"}
    }$theme$::jsonb,
    replace($blocks$[
      {
        "id": "hero-breu-branco",
        "type": "hero",
        "order": 1,
        "visible": true,
        "containerWidth": "full",
        "config": {
          "title": "Fazenda de Dupla Aptidao em Breu Branco - PA",
          "subtitle": "72 alqueiroes | 348,48 hectares | Pecuaria pronta e potencial agricola em mais de 300 hectares.",
          "backgroundImage": "/images/fazendas-brasil/breu-branco-hero-clean.webp",
          "overlayOpacity": 0.62,
          "ctaText": "Solicitar Material Completo",
          "ctaLink": "__WHATSAPP_LINK__",
          "height": 720,
          "alignment": "left",
          "textColor": "#ffffff"
        },
        "styles": {"padding":"0px"}
      },
      {
        "id": "destaques-breu-branco",
        "type": "text",
        "order": 2,
        "visible": true,
        "containerWidth": "full",
        "config": {
          "content": "<section class=\"breu-band\"><span>72 Alqueiroes</span><span>348,48 Hectares</span><span>Dupla Aptidao</span><span>Rica em Agua</span><span>Estrutura Nova</span><span>Potencial Agricola</span><span>Sem Embargos</span><span>Silo a 6 km</span></section>",
          "fontSize": 16,
          "fontWeight": 700,
          "color": "#ffffff",
          "alignment": "center"
        },
        "styles": {"padding":"0px","backgroundColor":"#062c1d"}
      },
      {
        "id": "diferenciais-breu-branco",
        "type": "text",
        "order": 3,
        "visible": true,
        "containerWidth": "xl",
        "config": {
          "content": "<h2>Por que esta fazenda e diferente?</h2><div class=\"breu-grid\"><article><h3>Pecuaria pronta</h3><p>Curral, divisoes, sede e estrutura operacional para iniciar ou expandir a operacao.</p></article><article><h3>Agua abundante</h3><p>4 tanques, 2 represas, igarape e nascentes permanentes.</p></article><article><h3>Potencial agricola</h3><p>Mais de 300 hectares aptos para lavoura, com area plana e vizinhanca produtiva.</p></article><article><h3>Logistica estrategica</h3><p>Divisa com soja e silo/secador a apenas 6 km.</p></article></div>",
          "fontSize": 18,
          "fontWeight": 400,
          "color": "#10241a",
          "alignment": "left"
        },
        "styles": {"padding":"80px 20px","backgroundColor":"#f7f2e8"}
      },
      {
        "id": "publico-breu-branco",
        "type": "text",
        "order": 4,
        "visible": true,
        "containerWidth": "full",
        "config": {
          "content": "<section class=\"breu-dark\"><div><h2>Para quem esta oportunidade foi desenvolvida?</h2><div class=\"breu-grid\"><article><h3>Pecuaristas em expansao</h3><p>Expansao imediata da operacao com estrutura ja implantada.</p></article><article><h3>Produtores de graos</h3><p>Area plana e potencial de conversao agricola.</p></article><article><h3>Investidores patrimoniais</h3><p>Ativo real, protecao patrimonial e valorizacao no agro.</p></article></div></div></section>",
          "fontSize": 18,
          "fontWeight": 400,
          "color": "#ffffff",
          "alignment": "left"
        },
        "styles": {"padding":"0px","backgroundColor":"#062c1d"}
      },
      {
        "id": "patrimonio-breu-branco",
        "type": "text",
        "order": 5,
        "visible": true,
        "containerWidth": "xl",
        "config": {
          "content": "<h2>Oportunidade de patrimonio</h2><p>A demanda por terras produtivas cresce continuamente e ativos rurais de qualidade sao cada vez mais escassos. Esta propriedade reune producao, agua, infraestrutura, potencial agricola e valorizacao.</p>",
          "fontSize": 20,
          "fontWeight": 400,
          "color": "#10241a",
          "alignment": "center"
        },
        "styles": {"padding":"80px 20px","backgroundColor":"#ffffff"}
      },
      {
        "id": "material-breu-branco",
        "type": "text",
        "order": 6,
        "visible": true,
        "containerWidth": "xl",
        "config": {
          "content": "<h2>O que voce recebera</h2><div class=\"breu-list\"><span>Video de drone</span><span>Fotos internas</span><span>Localizacao aproximada</span><span>Informacoes produtivas</span><span>Documentacao inicial</span><span>Condicoes para visita</span></div>",
          "fontSize": 18,
          "fontWeight": 500,
          "color": "#10241a",
          "alignment": "center"
        },
        "styles": {"padding":"72px 20px","backgroundColor":"#f7f2e8"}
      },
      {
        "id": "cta-breu-branco",
        "type": "cta",
        "order": 7,
        "visible": true,
        "containerWidth": "full",
        "config": {
          "title": "Informacoes completas apenas para compradores qualificados",
          "description": "Oportunidade exclusiva, sem embargos e com analise especializada da Fazendas Brasil.",
          "buttonText": "Agendar Visita Tecnica",
          "buttonLink": "__WHATSAPP_LINK__",
          "backgroundColor": "#062c1d",
          "textColor": "#f2d98d"
        },
        "styles": {"padding":"0px"}
      },
      {
        "id": "form-breu-branco",
        "type": "form",
        "order": 8,
        "visible": true,
        "containerWidth": "lg",
        "config": {
          "title": "Solicitar Material Completo",
          "fields": [
            {"name":"name","type":"text","label":"Nome","required":true,"placeholder":"Seu nome completo"},
            {"name":"phone","type":"tel","label":"Telefone","required":true,"placeholder":"WhatsApp com DDD"},
            {"name":"cidade","type":"text","label":"Cidade","required":true,"placeholder":"Sua cidade"},
            {"name":"estado","type":"text","label":"Estado","required":true,"placeholder":"UF"},
            {"name":"email","type":"email","label":"E-mail","required":true,"placeholder":"seu@email.com"},
            {"name":"finalidade","type":"select","label":"Finalidade da compra","required":true,"options":["Pecuaria","Lavoura","Investimento"]},
            {"name":"investimento","type":"select","label":"Faixa de investimento","required":true,"options":["Ate R$5 milhoes","R$5M a R$10M","Acima de R$10M"]},
            {"name":"operacao","type":"select","label":"Ja possui operacao rural?","required":true,"options":["Sim","Nao"]}
          ],
          "submitText": "Solicitar Material Completo",
          "successMessage": "Cadastro recebido. A equipe Fazendas Brasil fara o atendimento pelo WhatsApp."
        },
        "styles": {"padding":"72px 20px","backgroundColor":"#ffffff"}
      }
    ]$blocks$, '__WHATSAPP_LINK__', whatsapp_link)::jsonb,
    '{"headerStyle":"minimal","footerStyle":"minimal","showBranding":false}'::jsonb,
    '{"mode":"manual","propertyIds":[],"filters":{},"sortBy":"date","sortOrder":"desc","limit":1}'::jsonb,
    jsonb_build_object(
      'enabled', true,
      'fields', jsonb_build_array('name', 'phone', 'cidade', 'estado', 'email', 'finalidade', 'investimento', 'operacao'),
      'submitText', 'Solicitar Material Completo',
      'successMessage', 'Cadastro recebido. A equipe Fazendas Brasil fara o atendimento pelo WhatsApp.',
      'whatsappEnabled', true,
      'emailEnabled', false,
      'whatsappNumber', whatsapp_number
    ),
    'published',
    now(),
    $css$
      .breu-band{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:#d6b25e;color:#fff}
      .breu-band span{display:block;background:#062c1d;padding:18px 12px;text-align:center;text-transform:uppercase;letter-spacing:.08em;font-size:12px}
      .breu-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-top:28px}
      .breu-grid article{border:1px solid rgba(214,178,94,.35);border-radius:8px;padding:24px;background:rgba(255,255,255,.72)}
      .breu-grid h3{margin-top:0;color:#d6b25e}
      .breu-dark{background:#062c1d;padding:84px 20px}
      .breu-dark>div{max-width:1180px;margin:0 auto}
      .breu-dark article{background:rgba(255,255,255,.06);color:#fff}
      .breu-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:28px}
      .breu-list span{border:1px solid rgba(6,44,29,.16);border-radius:8px;background:#fff;padding:18px;font-weight:700}
    $css$
  FROM (VALUES ('fazenda-breu-branco'), ('breu-branco-lp')) AS s(page_slug)
  ON CONFLICT (organization_id, slug) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    name = EXCLUDED.name,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    meta_title = EXCLUDED.meta_title,
    meta_description = EXCLUDED.meta_description,
    og_image = EXCLUDED.og_image,
    template_id = EXCLUDED.template_id,
    theme_config = EXCLUDED.theme_config,
    blocks = EXCLUDED.blocks,
    settings = EXCLUDED.settings,
    property_selection = EXCLUDED.property_selection,
    form_config = EXCLUDED.form_config,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    custom_css = EXCLUDED.custom_css,
    updated_at = now();
END $$;
