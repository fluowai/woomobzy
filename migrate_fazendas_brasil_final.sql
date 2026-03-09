
-- MIGRAÇÃO FAZENDAS BRASIL (FINAL)
-- 1. Cria Organização e Usuário
-- 2. Migra Imóveis
-- 3. Restaura Identidade Visual (Verde/Agro)

DO $$
DECLARE
    -- Configuração
    target_email text := 'contato@fazendasbrasil.com.br';
    org_name text := 'Imobiliária Fazendas Brasil';
    
    -- Variáveis de ID
    new_org_id uuid;
    user_id uuid;
    
BEGIN
    -- 0. Garantir Coluna organization_id na tabela site_settings
    BEGIN
        ALTER TABLE site_settings ADD COLUMN organization_id uuid REFERENCES organizations(id);
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'Coluna organization_id já existe em site_settings.';
    END;

    -- 1. Criar Organização (Se não existir)
    INSERT INTO organizations (name, status, owner_email, plan_id)
    SELECT org_name, 'active', target_email, (SELECT id FROM plans WHERE name = 'Enterprise' LIMIT 1)
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE owner_email = target_email);
    
    -- Pegar ID da Org
    SELECT id INTO new_org_id FROM organizations WHERE owner_email = target_email;
    
    -- 2. Identificar Usuário
    SELECT id INTO user_id FROM auth.users WHERE email = target_email;

    IF new_org_id IS NOT NULL AND user_id IS NOT NULL THEN
        RAISE NOTICE '✅ Organização: % (ID: %)', org_name, new_org_id;
        RAISE NOTICE '✅ Usuário: % (ID: %)', target_email, user_id;

        -- 3. Vincular Usuário à Organização (Admin)
        UPDATE profiles 
        SET organization_id = new_org_id,
            role = 'admin'
        WHERE id = user_id;

        -- 4. MIGRAR DADOS (TUDO QUE TIVER NULL VAI PRA ELE)
        -- Imóveis
        UPDATE properties 
        SET organization_id = new_org_id 
        WHERE organization_id IS NULL;
        RAISE NOTICE '🏠 Imóveis órfãos migrados.';

        -- Leads
        UPDATE leads 
        SET organization_id = new_org_id 
        WHERE organization_id IS NULL;
        RAISE NOTICE '👥 Leads órfãos migrados.';

        -- Landing Pages
        UPDATE landing_pages 
        SET organization_id = new_org_id 
        WHERE organization_id IS NULL;
        RAISE NOTICE '📄 Landing Pages órfãs migradas.';

        -- 5. RESTAURAR SITE / IDENTIDADE VISUAL
        -- Remove configuração global antiga se existir (opcional) ou cria específica
        DELETE FROM site_settings WHERE organization_id = new_org_id;
        
        INSERT INTO site_settings (
            organization_id,
            agency_name,
            primary_color,
            secondary_color,
            header_color, -- Novo (se existir na tabela)
            font_family,
            contact_email,
            contact_phone
        ) VALUES (
            new_org_id,
            'Fazendas Brasil',
            '#2e7d32', -- Verde Agro (Primary)
            '#1b5e20', -- Verde Escuro (Secondary)
            '#1b5e20', -- Header Verde Escuro
            'Lato, sans-serif',
            target_email,
            '62999999999' -- Exemplo
        );
        RAISE NOTICE '🎨 Identidade visual (Verde) restaurada para Fazendas Brasil.';

    ELSE
        RAISE NOTICE '⚠️ AVISO: Usuário ou Organização não encontrados. Verifique se o usuário já criou conta.';
    END IF;

END $$;
