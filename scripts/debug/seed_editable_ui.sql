-- SEED DATA FOR SITE TEXTS (100% EDITABLE UI)
-- Execute this in your Supabase SQL Editor

-- Ensure the table exists with the right structure
CREATE TABLE IF NOT EXISTS public.site_texts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value text NOT NULL,
    default_value text NOT NULL,
    category text DEFAULT 'ui',
    section text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert or Update default values
INSERT INTO public.site_texts (key, value, default_value, section, category)
VALUES 
-- STATS
('stats.transactions', '+1.5k', '+1.5k', 'stats', 'content'),
('stats.transactions_label', 'Transações Realizadas', 'Transações Realizadas', 'stats', 'content'),
('stats.volume', '2Bi', '2Bi', 'stats', 'content'),
('stats.volume_label', 'Volume Geral de Vendas', 'Volume Geral de Vendas', 'stats', 'content'),
('stats.years', '15', '15', 'stats', 'content'),
('stats.years_label', 'Anos de Excelência', 'Anos de Excelência', 'stats', 'content'),

-- FEATURED
('featured.badge', 'Venda Exclusiva de Fazendas e Sítios', 'Venda Exclusiva de Fazendas e Sítios', 'featured', 'marketing'),
('featured.category', 'Oportunidades de Ouro', 'Oportunidades de Ouro', 'featured', 'marketing'),
('featured.title', 'Propriedades Premium', 'Propriedades Premium', 'featured', 'marketing'),
('featured.description', 'Nossa curadoria foca em produtividade, localização estratégica e potencial de valorização exponencial.', 'Nossa curadoria foca em produtividade, localização estratégica e potencial de valorização exponencial.', 'featured', 'marketing'),

-- ABOUT FEATURES
('about.feature2_title', 'Regularização Completa', 'Regularização Completa', 'about', 'content'),
('about.feature2_desc', 'Documentação fundiária e licenciamento ambiental', 'Documentação fundiária e licenciamento ambiental', 'about', 'content'),
('about.feature3_title', 'Suporte Financeiro', 'Suporte Financeiro', 'about', 'content'),
('about.feature3_desc', 'Assessoria em crédito rural e financiamento', 'Assessoria em crédito rural e financiamento', 'about', 'content'),
('about.cta_specialist', 'Falar com Especialista', 'Falar com Especialista', 'about', 'ui'),
('about.cta_properties', 'Ver Propriedades', 'Ver Propriedades', 'about', 'ui'),

-- FLOATING
('floating.whatsapp_badge', 'Fale com um corretor agora', 'Fale com um corretor agora', 'floating', 'ui'),

-- FOOTER
('footer.nav_title', 'Navegação', 'Navegação', 'footer', 'navigation'),
('footer.newsletter_title', 'Exclusive Updates', 'Exclusive Updates', 'footer', 'marketing'),
('footer.newsletter_desc', 'Receba nossa curadoria mensal de oportunidades off-market.', 'Receba nossa curadoria mensal de oportunidades off-market.', 'footer', 'marketing'),
('footer.newsletter_placeholder', 'E-mail corporativo', 'E-mail corporativo', 'footer', 'ui'),
('footer.newsletter_button', 'Assinar', 'Assinar', 'footer', 'ui'),

-- LEAD MODAL
('lead_modal.badge', 'Atendimento Select', 'Atendimento Select', 'lead_modal', 'marketing'),
('lead_modal.title_line1', 'Como podemos', 'Como podemos', 'lead_modal', 'marketing'),
('lead_modal.title_line2', 'Ajudar você?', 'Ajudar você?', 'lead_modal', 'marketing'),
('lead_modal.subtitle', 'Preencha os dados abaixo e um consultor entrará em contato em instantes.', 'Preencha os dados abaixo e um consultor entrará em contato em instantes.', 'lead_modal', 'marketing'),
('lead_modal.form_name_label', 'Seu Nome Completo', 'Seu Nome Completo', 'lead_modal', 'ui'),
('lead_modal.form_name_placeholder', 'Ex: João da Silva', 'Ex: João da Silva', 'lead_modal', 'ui'),
('lead_modal.form_phone_label', 'WhatsApp', 'WhatsApp', 'lead_modal', 'ui'),
('lead_modal.form_phone_placeholder', '(00) 00000-0000', '(00) 00000-0000', 'lead_modal', 'ui'),
('lead_modal.form_email_label', 'E-mail (Opcional)', 'E-mail (Opcional)', 'lead_modal', 'ui'),
('lead_modal.form_email_placeholder', 'contato@email.com', 'contato@email.com', 'lead_modal', 'ui'),
('lead_modal.submitting', 'Enviando...', 'Enviando...', 'lead_modal', 'ui'),
('lead_modal.submit_button', 'Solicitar Atendimento Exclusivo', 'Solicitar Atendimento Exclusivo', 'lead_modal', 'ui'),
('lead_modal.privacy_notice', 'Sua privacidade é nossa prioridade absoluta.', 'Sua privacidade é nossa prioridade absoluta.', 'lead_modal', 'ui'),

-- SUBMIT MODAL
('submit_modal.sidebar_title_line1', 'Venda seu', 'Venda seu', 'submit_modal', 'marketing'),
('submit_modal.sidebar_title_line2', 'Imóvel Elite', 'Imóvel Elite', 'submit_modal', 'marketing'),
('submit_modal.sidebar_subtitle', 'Curadoria de Luxo', 'Curadoria de Luxo', 'submit_modal', 'marketing'),
('submit_modal.disclaimer', 'Ao submeter, você concorda que nossa equipe fará uma análise técnica detalhada antes da publicação final.', 'Ao submeter, você concorda que nossa equipe fará uma análise técnica detalhada antes da publicação final.', 'submit_modal', 'ui'),
('submit_modal.step1_label', 'Proprietário', 'Proprietário', 'submit_modal', 'ui'),
('submit_modal.step2_label', 'O Imóvel', 'O Imóvel', 'submit_modal', 'ui'),
('submit_modal.step3_label', 'Localização', 'Localização', 'submit_modal', 'ui'),
('submit_modal.step4_label', 'Mídias', 'Mídias', 'submit_modal', 'ui'),
('submit_modal.success_title', 'Proposta Recebida!', 'Proposta Recebida!', 'submit_modal', 'ui'),
('submit_modal.success_desc', 'Excelente escolha. Nossa equipe de elite já foi notificada e entrará em contato em breve para os próximos passos.', 'Excelente escolha. Nossa equipe de elite já foi notificada e entrará em contato em breve para os próximos passos.', 'submit_modal', 'ui'),
('submit_modal.success_button', 'Voltar para Home', 'Voltar para Home', 'submit_modal', 'ui'),
('submit_modal.step1_title', 'Quem é o proprietário?', 'Quem é o proprietário?', 'submit_modal', 'ui'),
('submit_modal.step1_subtitle', 'Inicie com as informações básicas de contato.', 'Inicie com as informações básicas de contato.', 'submit_modal', 'ui'),
('submit_modal.field_name_label', 'Nome Completo', 'Nome Completo', 'submit_modal', 'ui'),
('submit_modal.field_name_placeholder', 'Ex: Rodrigo Albuquerque', 'Ex: Rodrigo Albuquerque', 'submit_modal', 'ui'),
('submit_modal.field_email_label', 'E-mail Corporativo', 'E-mail Corporativo', 'submit_modal', 'ui'),
('submit_modal.field_email_placeholder', 'rodrigo@email.com', 'rodrigo@email.com', 'submit_modal', 'ui'),
('submit_modal.field_phone_label', 'WhatsApp Direto', 'WhatsApp Direto', 'submit_modal', 'ui'),
('submit_modal.field_phone_placeholder', '(00) 00000-0000', '(00) 00000-0000', 'submit_modal', 'ui'),
('submit_modal.step2_title', 'Detalhes do Imóvel', 'Detalhes do Imóvel', 'submit_modal', 'ui'),
('submit_modal.step2_subtitle', 'O que torna sua propriedade única?', 'O que torna sua propriedade única?', 'submit_modal', 'ui'),
('submit_modal.field_title_impact', 'Título de Impacto', 'Título de Impacto', 'submit_modal', 'ui'),
('submit_modal.field_title_placeholder', 'Ex: Mansão suspensa com vista definitiva para o mar', 'Ex: Mansão suspensa com vista definitiva para o mar', 'submit_modal', 'ui'),
('submit_modal.field_type_label', 'Tipo de Imóvel', 'Tipo de Imóvel', 'submit_modal', 'ui'),
('submit_modal.field_price_label', 'Preço Sugerido (R$)', 'Preço Sugerido (R$)', 'submit_modal', 'ui'),
('submit_modal.field_area_label', 'Área Privativa (m²)', 'Área Privativa (m²)', 'submit_modal', 'ui'),
('submit_modal.step3_title', 'Onde fica?', 'Onde fica?', 'submit_modal', 'ui'),
('submit_modal.step3_subtitle', 'Sua localização deve ser precisa para valorizar o m².', 'Sua localização deve ser precisa para valorizar o m².', 'submit_modal', 'ui'),
('submit_modal.field_address_label', 'Endereço Completo', 'Endereço Completo', 'submit_modal', 'ui'),
('submit_modal.field_address_placeholder', 'Rua, número e CEP', 'Rua, número e CEP', 'submit_modal', 'ui'),
('submit_modal.field_city_label', 'Cidade / Munícipio', 'Cidade / Munícipio', 'submit_modal', 'ui'),
('submit_modal.field_city_placeholder', 'Ex: Ribeirão Preto', 'Ex: Ribeirão Preto', 'submit_modal', 'ui'),
('submit_modal.field_neighborhood_label', 'Bairro / Região', 'Bairro / Região', 'submit_modal', 'ui'),
('submit_modal.field_neighborhood_placeholder', 'Ex: Jardim Botânico', 'Ex: Jardim Botânico', 'submit_modal', 'ui'),
('submit_modal.step4_title', 'Visuais & Galeria', 'Visuais & Galeria', 'submit_modal', 'ui'),
('submit_modal.step4_subtitle', 'Bons visuais aumentam a conversão em até 80%.', 'Bons visuais aumentam a conversão em até 80%.', 'submit_modal', 'ui'),
('submit_modal.add_photos', 'Adicionar Fotografias', 'Adicionar Fotografias', 'submit_modal', 'ui'),
('submit_modal.nav_back', 'Voltar', 'Voltar', 'submit_modal', 'ui'),
('submit_modal.nav_continue', 'Continuar para Passo 0', 'Continuar para Passo 0', 'submit_modal', 'ui'),
('submit_modal.nav_finish', 'Finalizar Submissão', 'Finalizar Submissão', 'submit_modal', 'ui'),

-- PROPERTY TYPES
('property_type.apt', 'Apartamento de Alto Padrão', 'Apartamento de Alto Padrão', 'property_type', 'content'),
('property_type.house', 'Casa / Villa de Luxo', 'Casa / Villa de Luxo', 'property_type', 'content'),
('property_type.farm', 'Fazenda / Haras / Rural', 'Fazenda / Haras / Rural', 'property_type', 'content'),
('property_type.com', 'Corporativo / Industrial', 'Corporativo / Industrial', 'property_type', 'content'),

-- HEADER LANGUAGES
('header.language_pt', 'Português', 'Português', 'header', 'system'),
('header.language_en', 'English', 'English', 'header', 'system'),
('header.language_es', 'Español', 'Español', 'header', 'system'),

-- FINAL DECORATIVE & ERRORS
('decorative.text1', 'Exclusividade & Tradição', 'Exclusividade & Tradição', 'decorative', 'ui'),
('decorative.text2', 'Luxury Urban Living', 'Luxury Urban Living', 'decorative', 'ui'),
('decorative.badge_text', 'Curadoria Especializada 2024', 'Curadoria Especializada 2024', 'decorative', 'ui'),
('submit_modal.error_alert', 'Houve um erro ao enviar seu imóvel. Por favor, tente novamente.', 'Houve um erro ao enviar seu imóvel. Por favor, tente novamente.', 'submit_modal', 'system'),
('lead_modal.default_subject', 'Interesse Geral', 'Interesse Geral', 'lead_modal', 'ui'),
('lead_modal.error_alert', 'Houve um erro ao enviar seus dados. Por favor, tente novamente.', 'Houve um erro ao enviar seus dados. Por favor, tente novamente.', 'lead_modal', 'system'),

-- PROPERTY ADDITIONS
('properties.loading', 'Buscando Propriedades...', 'Buscando Propriedades...', 'properties', 'content'),
('properties.empty', 'Nenhum imóvel encontrado.', 'Nenhum imóvel encontrado.', 'properties', 'content'),
('property_type.farm_badge', 'Fazenda', 'Fazenda', 'properties', 'content'),
('properties.no_photo', 'Sem Foto', 'Sem Foto', 'properties', 'content'),
('property_feature.main_house', 'Casa Sede', 'Casa Sede', 'properties', 'content'),
('property_feature.cattle', 'Gado', 'Gado', 'properties', 'content'),
('properties.price_label', 'Valor de Venda', 'Valor de Venda', 'properties', 'content'),
('properties.price_on_request', 'Sob Consulta', 'Sob Consulta', 'properties', 'content'),
('pagination.page', 'Página', 'Página', 'properties', 'content'),
('pagination.of', 'de', 'de', 'properties', 'content'),

-- CONTACT FORM ADDITIONS
('contact.submitting', 'Enviando...', 'Enviando...', 'contact', 'ui')

ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    default_value = EXCLUDED.default_value,
    section = EXCLUDED.section,
    category = EXCLUDED.category,
    updated_at = now();
