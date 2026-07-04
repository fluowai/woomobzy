import { LandingPageTemplate } from './shared';
import { BlockType } from '../../types/landingPage';
export const LEGACY_LANDING_PAGE_TEMPLATES: LandingPageTemplate[] = [
  {
    id: 'investment-rural',
    name: 'Investimento em Terra',
    description: 'Focalizado em investidores e rentabilidade agr├¡cola.',
    thumbnail: '/templates/template_investment.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#064e3b',
      secondaryColor: '#d4af37',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Invista em Terra: Seguran├ºa e Alta Rentabilidade',
          subtitle: 'Oportunidades exclusivas em ├íreas de expans├úo agr├¡cola com alto potencial de valoriza├º├úo.',
          backgroundImage: '/templates/template_investment.png',
          overlayOpacity: 0.5,
          ctaText: 'Falar com Especialista',
          ctaLink: '#contato',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      },
      {
        type: BlockType.STATS,
        order: 1,
        visible: true,
        config: {
          stats: [
            { label: 'Hectares Dispon├¡veis', value: '50.000+', icon: 'Map' },
            { label: 'Valoriza├º├úo M├®dia aa', value: '15%', icon: 'TrendingUp' },
            { label: 'Anos de Mercado', value: '25', icon: 'Shield' }
          ],
          columns: 3
        } as any,
        styles: { padding: '80px 20px', backgroundColor: '#f9fafb' },
        responsive: {}
      },
      {
        type: BlockType.PROPERTY_GRID,
        order: 2,
        visible: true,
        config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'modern' },
        styles: { padding: '60px 20px' },
        responsive: {}
      }
    ]
  },
  {
    id: 'production-ready',
    name: 'Fazenda Pronta para Produzir',
    description: 'Ideal para opera├º├úo imediata e infraestrutura completa.',
    thumbnail: '/templates/template_production.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#15803d',
      secondaryColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Fazenda Pronta para Produzir',
          subtitle: 'Infraestrutura completa para soja, milho e algod├úo. Sede moderna e silos de alta capacidade.',
          backgroundImage: '/templates/template_production.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver Instala├º├Áes',
          ctaLink: '#detalhes',
          height: 600,
          alignment: 'left',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      },
      {
        type: BlockType.FEATURES,
        order: 1,
        visible: true,
        config: {
          features: [
            { title: 'Solo F├®rtil', description: 'Alta safra garantida', icon: '­ƒî▒' },
            { title: 'Silos Modernos', description: 'Armazenamento seguro', icon: '­ƒÅù´©Å' },
            { title: 'Acesso F├ícil', description: 'Log├¡stica otimizada', icon: '­ƒÜÜ' }
          ],
          columns: 3
        },
        styles: { padding: '80px 20px' },
        responsive: {}
      }
    ]
  },
  {
    id: 'livestock-focus',
    name: 'Pecu├íria Lucrativa',
    description: 'Especializado em gado de corte e recria.',
    thumbnail: '/templates/template_livestock.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#0f172a',
      secondaryColor: '#f1f5f9',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      fontFamily: 'Inter',
      borderRadius: '0.25rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Ideal para Pecu├íria Lucrativa',
          subtitle: 'Capacidade para 1.000+ cabe├ºas, pastagens rotacionadas e currais de ponta.',
          backgroundImage: '/templates/template_livestock.png',
          overlayOpacity: 0.3,
          ctaText: 'Receber Proposta',
          ctaLink: '#contato',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'opportunity-sale',
    name: 'Oportunidade ├Ünica ├á Vista',
    description: 'Focado em ofertas de ocasi├úo e alta liquidez.',
    thumbnail: '/templates/template_opportunity.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#b91c1c',
      secondaryColor: '#fcd34d',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Oportunidade ├Ünica ├á Vista',
          subtitle: 'Desconto exclusivo para pagamento imediato. Oferta imperd├¡vel!',
          backgroundImage: '/templates/template_opportunity.png',
          overlayOpacity: 0.5,
          ctaText: 'Ver Detalhes Agora',
          ctaLink: '#info',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'lifestyle-rural',
    name: 'Pronta para Morar e Produzir',
    description: 'Estilo de vida no campo com produtividade.',
    thumbnail: '/templates/template_lifestyle.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#064e3b',
      secondaryColor: '#d4af37',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Pronta para Morar e Produzir',
          subtitle: 'Casa sede completa, curral, energia e ├ígua em abund├óncia.',
          backgroundImage: '/templates/template_lifestyle.png',
          overlayOpacity: 0.3,
          ctaText: 'Agendar Visita',
          ctaLink: '#visita',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'location-strategic',
    name: 'Localiza├º├úo que Valoriza',
    description: 'Proximidade estrat├®gica e log├¡stica rural.',
    thumbnail: '/templates/template_location_val.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#0f172a',
      secondaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Localiza├º├úo que Valoriza seu Investimento',
          subtitle: 'A apenas 30 min da cidade e 2h do aeroporto internacional.',
          backgroundImage: '/templates/template_location_val.png',
          overlayOpacity: 0.4,
          ctaText: 'Saiba Mais',
          ctaLink: '#mapa',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'high-productivity',
    name: 'Terra de Alta Produtividade',
    description: 'Focado em agricultura de precis├úo e safra.',
    thumbnail: '/templates/template_tractor_soil.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#422006',
      secondaryColor: '#facc15',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Terra de Alta Produtividade',
          subtitle: 'Solo f├®rtil preparado para a pr├│xima safra recorde.',
          backgroundImage: '/templates/template_tractor_soil.png',
          overlayOpacity: 0.4,
          ctaText: 'Receber Proposta',
          ctaLink: '#form',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'last-units-scarcity',
    name: '├Ültimas Unidades Dispon├¡veis!',
    description: 'Campanha de escassez e urg├¬ncia de venda.',
    thumbnail: '/templates/template_last_units.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#7c2d12',
      secondaryColor: '#ea580c',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: '├Ültimas Unidades Dispon├¡veis!',
          subtitle: 'Compra ├á vista com condi├º├Áes exclusivas por tempo limitado.',
          backgroundImage: '/templates/template_last_units.png',
          overlayOpacity: 0.6,
          ctaText: 'Garantir Agora',
          ctaLink: '#urgente',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'inflation-protection',
    name: 'Prote├º├úo contra Infla├º├úo',
    description: 'Investimento seguro em ativos reais rurais.',
    thumbnail: '/templates/template_inflation_hedge.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#064e3b',
      secondaryColor: '#059669',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Invista em Terra: Prote├º├úo contra Infla├º├úo',
          subtitle: 'Ativos reais que garantem seu patrim├┤nio para o futuro.',
          backgroundImage: '/templates/template_inflation_hedge.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver ├üreas',
          ctaLink: '#areas',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'heritage-legacy',
    name: 'O Legado e Heran├ºa',
    description: 'Tradi├º├úo e patrim├┤nio para as pr├│ximas gera├º├Áes.',
    thumbnail: '/templates/template_broker_legacy.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#334155',
      secondaryColor: '#ca8a04',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'O Legado que sua Fam├¡lia Merece',
          subtitle: 'Construa um patrim├┤nio s├│lido em terras f├®rteis.',
          backgroundImage: '/templates/template_broker_legacy.png',
          overlayOpacity: 0.4,
          ctaText: 'Falar no WhatsApp',
          ctaLink: '#contato',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-luxury-living',
    name: 'Luxo no Cora├º├úo da Cidade',
    description: 'Hero impactante com skyline e foco em apartamentos de alto padr├úo.',
    thumbnail: '/templates/urban/urban_apartment_center.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#0f172a',
      secondaryColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3.5rem', heading2: '2.5rem', heading3: '1.75rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Seu Novo Apartamento no Cora├º├úo da Cidade',
          subtitle: 'Viva onde tudo acontece. Conforto, sofistica├º├úo e a melhor vista urbana.',
          backgroundImage: '/templates/urban/urban_apartment_center.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver Unidades Dispon├¡veis',
          ctaLink: '#imoveis',
          height: 700,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-exclusive-launch',
    name: 'Lan├ºamento Exclusivo',
    description: 'Campanha para novos empreendimentos com design moderno.',
    thumbnail: '/templates/urban/urban_exclusive_launch.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#1e40af',
      secondaryColor: '#60a5fa',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Lan├ºamento Exclusivo na Regi├úo!',
          subtitle: 'Pre├ºos e condi├º├Áes especiais para investidores. Antecipe-se ao lan├ºamento.',
          backgroundImage: '/templates/urban/urban_exclusive_launch.png',
          overlayOpacity: 0.5,
          ctaText: 'Quero Saber Mais',
          ctaLink: '#contato',
          height: 600,
          alignment: 'left',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-land-allotment',
    name: 'Terrenos e Loteamentos',
    description: 'Focado em venda de lotes urbanos e expans├úo.',
    thumbnail: '/templates/urban/urban_land_sale.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#15803d',
      secondaryColor: '#facc15',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Aten├º├úo, Terrenos ├á Venda!',
          subtitle: 'Financiamento direto com a incorporadora. Construa seu sonho hoje.',
          backgroundImage: '/templates/urban/urban_land_sale.png',
          overlayOpacity: 0.3,
          ctaText: 'Consultar Disponibilidade',
          ctaLink: '#mapa',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-luxury-pool-lifestyle',
    name: 'Alto Padr├úo com Piscina',
    description: 'Foco no estilo de vida de luxo e lazer privativo.',
    thumbnail: '/templates/urban/urban_luxury_pool.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#0c4a6e',
      secondaryColor: '#38bdf8',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      fontFamily: 'Inter',
      borderRadius: '0px',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '4rem', heading2: '3rem', heading3: '2rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Lan├ºamento de Luxo em Localiza├º├úo Privilegiada',
          subtitle: 'Aprovamos seu cadastro na hora. Conhe├ºa o novo ├¡cone do skyline.',
          backgroundImage: '/templates/urban/urban_luxury_pool.png',
          overlayOpacity: 0.2,
          ctaText: 'Agendar Visita',
          ctaLink: '#visita',
          height: 800,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-sea-view-apartments',
    name: 'Vista para o Mar',
    description: 'Im├│veis litor├óneos com foco na paisagem.',
    thumbnail: '/templates/urban/urban_sea_view.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#0369a1',
      secondaryColor: '#f1f5f9',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Apartamento com Vista para o Mar',
          subtitle: 'Sinta a brisa e a exclusividade de morar de frente para o azul.',
          backgroundImage: '/templates/urban/urban_sea_view.png',
          overlayOpacity: 0.1,
          ctaText: 'Ver Pre├ºo e Planta',
          ctaLink: '#plantas',
          height: 600,
          alignment: 'left',
          textColor: '#1e3a8a'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-ready-to-move-in',
    name: 'Pronto para Morar',
    description: 'Foco em imobilidade imediata e interiores mobiliados.',
    thumbnail: '/templates/urban/urban_ready_move.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#4b5563',
      secondaryColor: '#10b981',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Apartamentos Prontos para Morar',
          subtitle: 'Mude-se hoje mesmo. Pre├ºos especiais para pagamento ├á vista.',
          backgroundImage: '/templates/urban/urban_ready_move.png',
          overlayOpacity: 0.3,
          ctaText: 'Ver Apartamentos',
          ctaLink: '#lista',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-gated-complex',
    name: 'Condom├¡nio Fechado Urban',
    description: 'Seguran├ºa e infraestrutura para a fam├¡lia.',
    thumbnail: '/templates/urban/urban_gated_community.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#166534',
      secondaryColor: '#fde047',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Seu Lote em Condom├¡nio Fechado',
          subtitle: 'Seguran├ºa 24h e lazer completo para sua fam├¡lia.',
          backgroundImage: '/templates/urban/urban_gated_community.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver Lotes Dispon├¡veis',
          ctaLink: '#lotes',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-rental-lifestyle',
    name: 'Aluguel Sem Complica├º├úo',
    description: 'Foco no mercado de loca├º├úo e agilidade no processo.',
    thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1920&auto=format&fit=crop',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#4338ca',
      secondaryColor: '#818cf8',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Aluguel de Casas e Apartamentos',
          subtitle: 'Alugue r├ípido e sem complica├º├úo. Seu novo lar est├í aqui.',
          backgroundImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1920&auto=format&fit=crop',
          overlayOpacity: 0.5,
          ctaText: 'Conhecer Empreendimentos',
          ctaLink: '#alugue',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-smart-invest',
    name: 'Investimento em Terrenos',
    description: 'Focado em quem busca valoriza├º├úo em terrenos urbanos.',
    thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#1e293b',
      secondaryColor: '#cbd5e1',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      fontFamily: 'Inter',
      borderRadius: '0px',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.5rem', heading3: '1.75rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Seu Terreno Privativo na Cidade',
          subtitle: '├üreas estrat├®gicas com alto potencial de valoriza├º├úo futura.',
          backgroundImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop',
          overlayOpacity: 0.6,
          ctaText: 'Falar com Consultor',
          ctaLink: '#contato',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-incorporatora-credibility',
    name: 'Incorporadora de Credibilidade',
    description: 'Institucional para empresas que buscam transmitir confian├ºa.',
    thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#0f172a',
      secondaryColor: '#f8fafc',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Incorporadora de Credibilidade',
          subtitle: 'Construindo o futuro com solidez e transpar├¬ncia.',
          backgroundImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop',
          overlayOpacity: 0.4,
          ctaText: 'Nossos Empreendimentos',
          ctaLink: '#portfolio',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'loteadora-360-premium',
    name: 'Loteadora 360┬░ Premium',
    description: 'Template de alta convers├úo para lan├ºamentos de loteamentos com foco em infraestrutura e progresso de obra.',
    thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#064e3b',
      secondaryColor: '#facc15',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter',
      borderRadius: '1rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '4rem' },
      fontSize: { base: '1rem', heading1: '4rem', heading2: '3rem', heading3: '2rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'O Estilo de Vida que Voc├¬ Sempre Sonhou',
          subtitle: 'Lotes a partir de 360m┬▓ com infraestrutura completa e financiamento direto. Oportunidade ├║nica de investimento.',
          backgroundImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop',
          overlayOpacity: 0.4,
          ctaText: 'Falar com Consultor',
          ctaLink: '#contato',
          height: 700,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      },
      {
        type: BlockType.STATS,
        order: 1,
        visible: true,
        config: {
          stats: [
            { label: 'Lotes Dispon├¡veis', value: '85%', icon: 'Map' },
            { label: 'Obras Conclu├¡das', value: '70%', icon: 'TrendingUp' },
            { label: 'Valoriza├º├úo Estimada', value: '25% aa', icon: 'Shield' }
          ],
          columns: 3
        } as any,
        styles: { padding: '100px 20px', backgroundColor: '#f0fdf4' },
        responsive: {}
      },
      {
        type: BlockType.FEATURES,
        order: 2,
        visible: true,
        config: {
          features: [
            { title: 'Asfalto CBUQ', description: 'Pavimenta├º├úo de alta qualidade em todo o loteamento.', icon: '­ƒøú´©Å' },
            { title: 'Energia LED', description: 'Ilumina├º├úo p├║blica moderna e econ├┤mica.', icon: '­ƒÆí' },
            { title: '├ürea Verde', description: 'Mais de 10.000m┬▓ de preserva├º├úo e lazer.', icon: '­ƒî│' },
            { title: 'Rede de ├ügua', description: 'Abastecimento garantido com reservat├│rio pr├│prio.', icon: '­ƒÜ░' }
          ],
          columns: 4
        },
        styles: { padding: '80px 20px' },
        responsive: {}
      }
    ]
  }
];
