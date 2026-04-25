import { LandingPageTheme, Block, BlockType } from '../types/landingPage';
import { v4 as uuidv4 } from 'uuid';

export interface LandingPageTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  themeConfig: LandingPageTheme;
  blocks: Omit<Block, 'id'>[];
}

export const generateBlocksFromTemplate = (
  templateBlocks: Omit<Block, 'id'>[]
): Block[] => {
  return templateBlocks.map((block, index) => ({
    ...block,
    id: uuidv4(),
    order: index,
  }));
};

export const getTemplateById = (id: string): LandingPageTemplate | undefined => {
  return LANDING_PAGE_TEMPLATES.find((t) => t.id === id);
};

export const LANDING_PAGE_TEMPLATES: LandingPageTemplate[] = [
  {
    id: 'investment-rural',
    name: 'Investimento em Terra',
    description: 'Focalizado em investidores e rentabilidade agrícola.',
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
          title: 'Invista em Terra: Segurança e Alta Rentabilidade',
          subtitle: 'Oportunidades exclusivas em áreas de expansão agrícola com alto potencial de valorização.',
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
            { label: 'Hectares Disponíveis', value: '50.000+', icon: 'Map' },
            { label: 'Valorização Média aa', value: '15%', icon: 'TrendingUp' },
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
        config: { columns: 3, gap: 24, maxItems: 6, sortBy: 'price', cardStyle: 'modern' },
        styles: { padding: '60px 20px' },
        responsive: {}
      }
    ]
  },
  {
    id: 'production-ready',
    name: 'Fazenda Pronta para Produzir',
    description: 'Ideal para operação imediata e infraestrutura completa.',
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
          subtitle: 'Infraestrutura completa para soja, milho e algodão. Sede moderna e silos de alta capacidade.',
          backgroundImage: '/templates/template_production.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver Instalações',
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
            { title: 'Solo Fértil', description: 'Alta safra garantida', icon: '🌱' },
            { title: 'Silos Modernos', description: 'Armazenamento seguro', icon: '🏗️' },
            { title: 'Acesso Fácil', description: 'Logística otimizada', icon: '🚚' }
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
    name: 'Pecuária Lucrativa',
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
          title: 'Ideal para Pecuária Lucrativa',
          subtitle: 'Capacidade para 1.000+ cabeças, pastagens rotacionadas e currais de ponta.',
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
    name: 'Oportunidade Única à Vista',
    description: 'Focado em ofertas de ocasião e alta liquidez.',
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
          title: 'Oportunidade Única à Vista',
          subtitle: 'Desconto exclusivo para pagamento imediato. Oferta imperdível!',
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
          subtitle: 'Casa sede completa, curral, energia e água em abundância.',
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
    name: 'Localização que Valoriza',
    description: 'Proximidade estratégica e logística rural.',
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
          title: 'Localização que Valoriza seu Investimento',
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
    description: 'Focado em agricultura de precisão e safra.',
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
          subtitle: 'Solo fértil preparado para a próxima safra recorde.',
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
    name: 'Últimas Unidades Disponíveis!',
    description: 'Campanha de escassez e urgência de venda.',
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
          title: 'Últimas Unidades Disponíveis!',
          subtitle: 'Compra à vista com condições exclusivas por tempo limitado.',
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
    name: 'Proteção contra Inflação',
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
          title: 'Invista em Terra: Proteção contra Inflação',
          subtitle: 'Ativos reais que garantem seu patrimônio para o futuro.',
          backgroundImage: '/templates/template_inflation_hedge.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver Áreas',
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
    name: 'O Legado e Herança',
    description: 'Tradição e patrimônio para as próximas gerações.',
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
          title: 'O Legado que sua Família Merece',
          subtitle: 'Construa um patrimônio sólido em terras férteis.',
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
    name: 'Luxo no Coração da Cidade',
    description: 'Hero impactante com skyline e foco em apartamentos de alto padrão.',
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
          title: 'Seu Novo Apartamento no Coração da Cidade',
          subtitle: 'Viva onde tudo acontece. Conforto, sofisticação e a melhor vista urbana.',
          backgroundImage: '/templates/urban/urban_apartment_center.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver Unidades Disponíveis',
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
    name: 'Lançamento Exclusivo',
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
          title: 'Lançamento Exclusivo na Região!',
          subtitle: 'Preços e condições especiais para investidores. Antecipe-se ao lançamento.',
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
    description: 'Focado em venda de lotes urbanos e expansão.',
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
          title: 'Atenção, Terrenos à Venda!',
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
    name: 'Alto Padrão com Piscina',
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
          title: 'Lançamento de Luxo em Localização Privilegiada',
          subtitle: 'Aprovamos seu cadastro na hora. Conheça o novo ícone do skyline.',
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
    description: 'Imóveis litorâneos com foco na paisagem.',
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
          ctaText: 'Ver Preço e Planta',
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
          subtitle: 'Mude-se hoje mesmo. Preços especiais para pagamento à vista.',
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
    name: 'Condomínio Fechado Urban',
    description: 'Segurança e infraestrutura para a família.',
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
          title: 'Seu Lote em Condomínio Fechado',
          subtitle: 'Segurança 24h e lazer completo para sua família.',
          backgroundImage: '/templates/urban/urban_gated_community.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver Lotes Disponíveis',
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
    name: 'Aluguel Sem Complicação',
    description: 'Foco no mercado de locação e agilidade no processo.',
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
          subtitle: 'Alugue rápido e sem complicação. Seu novo lar está aqui.',
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
    description: 'Focado em quem busca valorização em terrenos urbanos.',
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
          subtitle: 'Áreas estratégicas com alto potencial de valorização futura.',
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
    description: 'Institucional para empresas que buscam transmitir confiança.',
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
          subtitle: 'Construindo o futuro com solidez e transparência.',
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
  }
];
