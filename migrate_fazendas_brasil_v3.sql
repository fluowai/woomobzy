
-- MIGRAÇÃO FAZENDAS BRASIL (VISUAL DEFINITIVO)
-- Autoras: Você e a Inteligência Suprema do Design 🎨

DO $$
DECLARE
    -- Configuração
    target_email text := 'contato@fazendasbrasil.com.br';
    
    -- IDs
    new_org_id uuid;
    
BEGIN
    -- 1. Identificar Organização
    SELECT id INTO new_org_id FROM organizations WHERE owner_email = target_email;

    IF new_org_id IS NULL THEN
        RAISE EXCEPTION 'Organização Fazendas Brasil não encontrada! Rode o script anterior primeiro.';
    END IF;

    -- 2. Limpar Settings Antigas
    DELETE FROM site_settings WHERE organization_id = new_org_id;

    -- 3. Inserir Settings com Cores Oficiais e Fotos
    INSERT INTO site_settings (
        organization_id,
        agency_name,
        
        -- CORES DA LOGO (Extraídas Visualmente)
        primary_color,   -- Verde Bandeira/Agro
        secondary_color, -- Azul Marinho da Logo
        header_color,    -- Branco ou Azul Marinho
        
        logo_url,        -- Logo Local
        font_family,
        
        contact_email,
        contact_phone,
        
        -- DADOS ESPECÍFICOS DO CORRETOR (Renato)
        home_content
    ) VALUES (
        new_org_id,
        'Fazendas Brasil',
        
        '#009c3b', -- Verde Bandeira (aprox) da Logo
        '#002776', -- Azul Marinho da Logo
        '#ffffff', -- Header Branco (para o logo se destacar) ou '#002776'
        
        '/images/fazendas-brasil/logo.png', -- Caminho da logo
        'Lato, sans-serif',
        
        target_email,
        '44998433030', -- Telefone da Print
        
        -- JSON com a foto do Renato
        jsonb_build_object(
            'broker_name', 'Renato Vilmar Piovesana',
            'broker_creci', 'CRECI 16644F',
            'broker_photo', '/images/fazendas-brasil/renato.png', -- FOTO DO CORRETOR
            'broker_bio', 'Mais de 20 anos no mercado rural. Conectamos investidores e produtores rurais às melhores oportunidades.',
            'hero_title', 'Especialista em Fazendas e Áreas Rurais',
            'hero_subtitle', 'Segurança e rentabilidade em cada transação.'
        )
    );

    RAISE NOTICE '✅ Identidade Visual da Fazendas Brasil atualizada com sucesso!';
    RAISE NOTICE '   - Logo: /images/fazendas-brasil/logo.png';
    RAISE NOTICE '   - Foto Corretor: /images/fazendas-brasil/renato.png';
    RAISE NOTICE '   - Cores: Verde (#009c3b) e Azul (#002776)';

END $$;
