-- Seed inicial com todos os textos do site
-- Organizado por seções para facilitar manutenção

-- ============================================
-- HEADER (SiteHeader.tsx)
-- ============================================
INSERT INTO site_texts (key, value, category, section, description, default_value) VALUES
('header.creci', 'CRECI/PR 4.222J', 'content', 'header', 'Número do CRECI exibido no topo do site', 'CRECI/PR 4.222J'),
('header.cta_register', 'Cadastre sua Propriedade Rural', 'marketing', 'header', 'CTA para cadastro de propriedades', 'Cadastre sua Propriedade Rural'),
('header.translate_label', 'TRADUZIR SITE:', 'ui', 'header', 'Label do seletor de idioma', 'TRADUZIR SITE:'),
('header.language_select', 'Selecione o idioma', 'ui', 'header', 'Placeholder do seletor de idioma', 'Selecione o idioma'),
('header.login_button', 'Acessar Sistema', 'ui', 'header', 'Texto do botão de login', 'Acessar Sistema'),
('header.logo_fallback_name', 'ImobiSaaS', 'content', 'header', 'Nome da empresa (fallback quando não há logo)', 'ImobiSaaS'),
('header.logo_fallback_subtitle', 'Propriedades Rurais', 'content', 'header', 'Subtítulo da empresa (fallback)', 'Propriedades Rurais'),
('header.contact_whatsapp_label', 'WhatsApp', 'ui', 'header', 'Label do contato WhatsApp', 'WhatsApp'),
('header.contact_phone_label', 'Telefone', 'ui', 'header', 'Label do contato telefone', 'Telefone'),
('header.contact_email_label', 'Email', 'ui', 'header', 'Label do contato email', 'Email'),

-- Navegação
('nav.home', 'Início', 'navigation', 'header', 'Menu: Início', 'Início'),
('nav.about', 'Sobre Nós', 'navigation', 'header', 'Menu: Sobre Nós', 'Sobre Nós'),
('nav.farms', 'Fazendas', 'navigation', 'header', 'Menu: Fazendas', 'Fazendas'),
('nav.ranches', 'Sítios', 'navigation', 'header', 'Menu: Sítios', 'Sítios'),
('nav.lands', 'Terras Produtivas', 'navigation', 'header', 'Menu: Terras Produtivas', 'Terras Produtivas'),
('nav.blog', 'Blog', 'navigation', 'header', 'Menu: Blog', 'Blog'),
('nav.contact', 'Contato', 'navigation', 'header', 'Menu: Contato', 'Contato'),

-- ============================================
-- HERO SECTION (LandingPage.tsx)
-- ============================================
('hero.badge', 'Terras Produtivas & Investimento Rural', 'marketing', 'hero', 'Badge acima do título principal', 'Terras Produtivas & Investimento Rural'),
('hero.title_line1', 'TERRA', 'marketing', 'hero', 'Primeira linha do título principal', 'TERRA'),
('hero.title_line2', 'PRODUTIVA', 'marketing', 'hero', 'Segunda linha do título principal', 'PRODUTIVA'),
('hero.subtitle', 'Fazendas, sítios e propriedades rurais de alto valor. Seu investimento no agronegócio começa aqui.', 'marketing', 'hero', 'Subtítulo do hero', 'Fazendas, sítios e propriedades rurais de alto valor. Seu investimento no agronegócio começa aqui.'),

-- Busca
('hero.search.type_label', 'Tipo', 'ui', 'hero', 'Label do filtro de tipo de propriedade', 'Tipo'),
('hero.search.type_all', 'Todos', 'ui', 'hero', 'Opção "Todos" no filtro de tipo', 'Todos'),
('hero.search.type_farm', 'Fazenda', 'ui', 'hero', 'Opção "Fazenda" no filtro', 'Fazenda'),
('hero.search.type_ranch', 'Sítio', 'ui', 'hero', 'Opção "Sítio" no filtro', 'Sítio'),
('hero.search.type_smallfarm', 'Chácara', 'ui', 'hero', 'Opção "Chácara" no filtro', 'Chácara'),
('hero.search.city_label', 'Cidade', 'ui', 'hero', 'Label do filtro de cidade', 'Cidade'),
('hero.search.city_placeholder', 'Ex: São Paulo', 'ui', 'hero', 'Placeholder do campo cidade', 'Ex: São Paulo'),
('hero.search.min_area_label', 'Área Mín (ha)', 'ui', 'hero', 'Label da área mínima', 'Área Mín (ha)'),
('hero.search.max_area_label', 'Área Máx (ha)', 'ui', 'hero', 'Label da área máxima', 'Área Máx (ha)'),
('hero.search.button', 'Buscar', 'ui', 'hero', 'Texto do botão de busca', 'Buscar'),
('hero.search.results_found', 'propriedade(s) encontrada(s)', 'ui', 'hero', 'Texto de resultados encontrados', 'propriedade(s) encontrada(s)'),
('hero.search.clear_filters', 'Limpar filtros', 'ui', 'hero', 'Link para limpar filtros', 'Limpar filtros'),

-- Textos decorativos laterais
('hero.side_text_left', 'Exclusividade & Tradição', 'content', 'hero', 'Texto decorativo lateral esquerdo', 'Exclusividade & Tradição'),
('hero.side_text_right', 'Luxury Urban Living', 'content', 'hero', 'Texto decorativo lateral direito', 'Luxury Urban Living'),

-- ============================================
-- STATS SECTION (Estatísticas)
-- ============================================
('stats.transactions_number', '+1.5k', 'content', 'stats', 'Número de transações realizadas', '+1.5k'),
('stats.transactions_label', 'Transações Realizadas', 'content', 'stats', 'Label das transações', 'Transações Realizadas'),
('stats.volume_number', '2Bi', 'content', 'stats', 'Volume geral de vendas', '2Bi'),
('stats.volume_label', 'Volume Geral de Vendas', 'content', 'stats', 'Label do volume de vendas', 'Volume Geral de Vendas'),
('stats.years_number', '15', 'content', 'stats', 'Anos de experiência', '15'),
('stats.years_label', 'Anos de Excelência', 'content', 'stats', 'Label dos anos de experiência', 'Anos de Excelência'),

-- ============================================
-- PROPERTIES SECTION (Propriedades)
-- ============================================
('properties.badge', 'Venda Exclusiva de Fazendas e Sítios', 'marketing', 'properties', 'Badge da seção de propriedades', 'Venda Exclusiva de Fazendas e Sítios'),
('properties.subtitle', 'Oportunidades de Ouro', 'marketing', 'properties', 'Subtítulo da seção', 'Oportunidades de Ouro'),
('properties.title', 'Propriedades Premium', 'marketing', 'properties', 'Título da seção', 'Propriedades Premium'),
('properties.description', 'Nossa curadoria foca em produtividade, localização estratégica e potencial de valorização exponencial.', 'marketing', 'properties', 'Descrição da seção', 'Nossa curadoria foca em produtividade, localização estratégica e potencial de valorização exponencial.'),
('properties.loading', 'Buscando Propriedades...', 'system', 'properties', 'Mensagem de carregamento', 'Buscando Propriedades...'),
('properties.empty', 'Nenhum imóvel encontrado.', 'system', 'properties', 'Mensagem quando não há propriedades', 'Nenhum imóvel encontrado.'),
('properties.price_label', 'Valor de Venda', 'ui', 'properties', 'Label do preço', 'Valor de Venda'),
('properties.price_consult', 'Sob Consulta', 'ui', 'properties', 'Texto quando preço não informado', 'Sob Consulta'),
('properties.badge_curated', 'Curadoria Especializada 2024', 'marketing', 'properties', 'Badge flutuante de curadoria', 'Curadoria Especializada 2024'),
('properties.feature_house', 'Casa Sede', 'ui', 'properties', 'Label da feature casa sede', 'Casa Sede'),
('properties.feature_cattle', 'Gado', 'ui', 'properties', 'Label da feature gado', 'Gado'),
('properties.type_farm', 'Fazenda', 'ui', 'properties', 'Label tipo fazenda', 'Fazenda'),

-- Paginação
('properties.pagination_page', 'Página', 'ui', 'properties', 'Texto "Página" na paginação', 'Página'),
('properties.pagination_of', 'de', 'ui', 'properties', 'Texto "de" na paginação', 'de'),
('properties.pagination_prev', 'Anterior', 'ui', 'properties', 'Botão página anterior', 'Anterior'),
('properties.pagination_next', 'Próxima', 'ui', 'properties', 'Botão próxima página', 'Próxima'),

-- ============================================
-- SERVICES SECTION (Serviços)
-- ============================================
('services.title', 'Nossos Serviços', 'marketing', 'services', 'Título da seção de serviços', 'Nossos Serviços'),
('services.subtitle', 'Especialistas em Propriedades Rurais', 'marketing', 'services', 'Subtítulo da seção', 'Especialistas em Propriedades Rurais'),
('services.description', 'Conectamos investidores a fazendas e sítios de alto potencial produtivo. Experiência comprovada no mercado de terras rurais do Brasil.', 'marketing', 'services', 'Descrição da seção', 'Conectamos investidores a fazendas e sítios de alto potencial produtivo. Experiência comprovada no mercado de terras rurais do Brasil.'),

-- Serviço: Compra
('services.buy.title', 'Compra', 'marketing', 'services', 'Título do serviço de compra', 'Compra'),
('services.buy.subtitle', 'Aquisição de Fazendas e Sítios', 'marketing', 'services', 'Subtítulo do serviço', 'Aquisição de Fazendas e Sítios'),
('services.buy.feature1', 'Análise técnica de solo e recursos hídricos', 'content', 'services', 'Feature 1 do serviço de compra', 'Análise técnica de solo e recursos hídricos'),
('services.buy.feature2', 'Avaliação de potencial produtivo e rentabilidade', 'content', 'services', 'Feature 2 do serviço de compra', 'Avaliação de potencial produtivo e rentabilidade'),
('services.buy.feature3', 'Due diligence completa e segurança jurídica', 'content', 'services', 'Feature 3 do serviço de compra', 'Due diligence completa e segurança jurídica'),

-- Serviço: Venda
('services.sell.title', 'Venda', 'marketing', 'services', 'Título do serviço de venda', 'Venda'),
('services.sell.subtitle', 'Comercialização Estratégica', 'marketing', 'services', 'Subtítulo do serviço', 'Comercialização Estratégica'),
('services.sell.feature1', 'Marketing direcionado a investidores qualificados', 'content', 'services', 'Feature 1 do serviço de venda', 'Marketing direcionado a investidores qualificados'),
('services.sell.feature2', 'Precificação baseada em análise de mercado', 'content', 'services', 'Feature 2 do serviço de venda', 'Precificação baseada em análise de mercado'),
('services.sell.feature3', 'Negociação profissional e confidencial', 'content', 'services', 'Feature 3 do serviço de venda', 'Negociação profissional e confidencial'),

-- Serviço: Consultoria
('services.consulting.title', 'Consultoria', 'marketing', 'services', 'Título do serviço de consultoria', 'Consultoria'),
('services.consulting.subtitle', 'Assessoria Especializada', 'marketing', 'services', 'Subtítulo do serviço', 'Assessoria Especializada'),
('services.consulting.feature1', 'Regularização fundiária e ambiental', 'content', 'services', 'Feature 1 do serviço de consultoria', 'Regularização fundiária e ambiental'),
('services.consulting.feature2', 'Planejamento de uso e viabilidade econômica', 'content', 'services', 'Feature 2 do serviço de consultoria', 'Planejamento de uso e viabilidade econômica'),
('services.consulting.feature3', 'Suporte em financiamento e crédito rural', 'content', 'services', 'Feature 3 do serviço de consultoria', 'Suporte em financiamento e crédito rural'),

-- ============================================
-- ABOUT SECTION (Sobre)
-- ============================================
('about.badge', 'Especialista', 'marketing', 'about', 'Badge da seção sobre', 'Especialista'),
('about.title', 'Mais de 20 Anos no Mercado Rural', 'marketing', 'about', 'Título da seção', 'Mais de 20 Anos no Mercado Rural'),
('about.description', 'Conectamos investidores e produtores rurais às melhores oportunidades em fazendas e sítios produtivos. Nossa experiência no agronegócio brasileiro garante segurança e rentabilidade em cada transação.', 'content', 'about', 'Descrição da seção', 'Conectamos investidores e produtores rurais às melhores oportunidades em fazendas e sítios produtivos. Nossa experiência no agronegócio brasileiro garante segurança e rentabilidade em cada transação.'),
('about.creci_badge', 'Especialista Certificado', 'content', 'about', 'Badge de certificação', 'Especialista Certificado'),
('about.creci_info', 'CRECI Ativo • 20+ Anos', 'content', 'about', 'Informação do CRECI', 'CRECI Ativo • 20+ Anos'),
('about.stat_properties', '500+', 'content', 'about', 'Número de propriedades vendidas', '500+'),
('about.stat_properties_label', 'Propriedades Vendidas', 'content', 'about', 'Label das propriedades vendidas', 'Propriedades Vendidas'),
('about.feature1_title', 'Análise Técnica Completa', 'content', 'about', 'Título da feature 1', 'Análise Técnica Completa'),
('about.feature1_desc', 'Avaliação de solo, recursos hídricos e potencial produtivo', 'content', 'about', 'Descrição da feature 1', 'Avaliação de solo, recursos hídricos e potencial produtivo'),

-- ============================================
-- CONTACT SECTION (Contato)
-- ============================================
('contact.badge', 'Fale Conosco', 'marketing', 'contact', 'Badge da seção de contato', 'Fale Conosco'),
('contact.title', 'Vamos Conversar?', 'marketing', 'contact', 'Título da seção', 'Vamos Conversar?'),
('contact.description', 'Nossa equipe de especialistas está pronta para ajudá-lo a encontrar a propriedade rural perfeita. Entre em contato e descubra as melhores oportunidades do mercado.', 'marketing', 'contact', 'Descrição da seção', 'Nossa equipe de especialistas está pronta para ajudá-lo a encontrar a propriedade rural perfeita. Entre em contato e descubra as melhores oportunidades do mercado.'),
('contact.whatsapp_label', 'WhatsApp', 'ui', 'contact', 'Label do WhatsApp', 'WhatsApp'),
('contact.email_label', 'Email', 'ui', 'contact', 'Label do email', 'Email'),
('contact.phone_label', 'Telefone', 'ui', 'contact', 'Label do telefone', 'Telefone'),

-- Formulário
('contact.form.name_label', 'Nome Completo', 'ui', 'contact', 'Label do campo nome', 'Nome Completo'),
('contact.form.name_placeholder', 'Seu nome', 'ui', 'contact', 'Placeholder do campo nome', 'Seu nome'),
('contact.form.email_label', 'Email', 'ui', 'contact', 'Label do campo email', 'Email'),
('contact.form.email_placeholder', 'seu@email.com', 'ui', 'contact', 'Placeholder do campo email', 'seu@email.com'),
('contact.form.phone_label', 'Telefone / WhatsApp', 'ui', 'contact', 'Label do campo telefone', 'Telefone / WhatsApp'),
('contact.form.phone_placeholder', '(00) 00000-0000', 'ui', 'contact', 'Placeholder do campo telefone', '(00) 00000-0000'),
('contact.form.message_label', 'Mensagem', 'ui', 'contact', 'Label do campo mensagem', 'Mensagem'),
('contact.form.message_placeholder', 'Como podemos ajudá-lo?', 'ui', 'contact', 'Placeholder do campo mensagem', 'Como podemos ajudá-lo?'),
('contact.form.submit', 'Enviar Mensagem', 'ui', 'contact', 'Texto do botão de envio', 'Enviar Mensagem'),
('contact.form.sending', 'Enviando...', 'system', 'contact', 'Texto durante envio', 'Enviando...'),
('contact.form.success_title', 'Mensagem Enviada!', 'system', 'contact', 'Título da mensagem de sucesso', 'Mensagem Enviada!'),
('contact.form.success_message', 'Recebemos seu contato. Nossa equipe entrará em contato em breve!', 'system', 'contact', 'Mensagem de sucesso completa', 'Recebemos seu contato. Nossa equipe entrará em contato em breve!'),
('contact.form.error_default', 'Erro ao enviar mensagem. Por favor, tente novamente.', 'system', 'contact', 'Mensagem de erro padrão', 'Erro ao enviar mensagem. Por favor, tente novamente.'),

-- ============================================
-- FOOTER
-- ============================================
('footer.creci', 'CRECI 4222J PJ', 'content', 'footer', 'CRECI no rodapé', 'CRECI 4222J PJ'),
('footer.rights', 'Todos os direitos reservados', 'content', 'footer', 'Texto de direitos reservados', 'Todos os direitos reservados'),
('footer.about_title', 'Sobre', 'navigation', 'footer', 'Título da coluna Sobre', 'Sobre'),
('footer.services_title', 'Serviços', 'navigation', 'footer', 'Título da coluna Serviços', 'Serviços'),
('footer.contact_title', 'Contato', 'navigation', 'footer', 'Título da coluna Contato', 'Contato')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  category = EXCLUDED.category,
  section = EXCLUDED.section,
  description = EXCLUDED.description,
  default_value = EXCLUDED.default_value,
  updated_at = NOW();
