import { BlockType, LandingPageStatus } from '../types/landingPage';

export const LANDING_PAGE_MODELS = [
  {
    id: 'investment-rural',
    name: 'Investimento em Terra',
    thumbnail: '/templates/template_investment.png',
    description: 'Focado em investidores de grande porte e rentabilidade.',
    slug: 'investimento-em-terra',
    blocks: [
      {
        id: 'hero-1',
        type: BlockType.HERO,
        order: 0,
        visible: true,
        settings: {
          title: 'Invista em Terra: Segurança e Alta Rentabilidade',
          subtitle: 'Oportunidades exclusivas em áreas de expansão agrícola com alto potencial de valorização.',
          ctaText: 'Falar com Especialista',
          ctaLink: '#contato',
          backgroundImage: '/templates/template_investment.png',
          overlayOpacity: 0.5,
          height: '80vh'
        },
        styles: { padding: '0', textAlign: 'center' }
      },
      {
        id: 'stats-1',
        type: BlockType.STATS,
        order: 1,
        visible: true,
        settings: {
          items: [
            { label: 'Hectares Disponíveis', value: '50.000+', icon: 'Map' },
            { label: 'Valorização Média aa', value: '15%', icon: 'TrendingUp' },
            { label: 'Anos de Mercado', value: '25', icon: 'ShieldCheck' }
          ]
        },
        styles: { padding: '60px 0', backgroundColor: '#f8fafc' }
      },
      {
        id: 'property-grid-1',
        type: BlockType.PROPERTY_GRID,
        order: 2,
        visible: true,
        settings: {
          title: 'Áreas de Destaque',
          mode: 'filter',
          filters: { type: ['FAZENDA'], minArea: 500 },
          columns: 3
        },
        styles: { padding: '80px 0' }
      }
    ]
  },
  {
    id: 'production-ready',
    name: 'Fazenda Pronta para Produzir',
    thumbnail: '/templates/template_production.png',
    description: 'Ideal para quem busca entrar em operação imediata.',
    slug: 'fazenda-pronta-produzir',
    blocks: [
      {
        id: 'hero-2',
        type: BlockType.HERO,
        order: 0,
        visible: true,
        settings: {
          title: 'Fazenda Pronta para Produzir',
          subtitle: 'Infraestrutura completa para soja, milho e algodão. Sede moderna e silos de alta capacidade.',
          ctaText: 'Ver Detalhas das Instalações',
          backgroundImage: '/templates/template_production.png',
          height: '70vh'
        },
        styles: { padding: '0' }
      },
      {
        id: 'property-featured-1',
        type: BlockType.PROPERTY_FEATURED,
        order: 1,
        visible: true,
        settings: {
          title: 'Imóvel em Destaque: Ouro do Cerrado',
          propertyId: 'auto'
        },
        styles: { padding: '80px 0' }
      }
    ]
  },
  {
    id: 'livestock-focus',
    name: 'Pecuária Lucrativa',
    thumbnail: '/templates/template_livestock.png',
    description: 'Especializado em gado de corte e recria.',
    slug: 'pecuaria-lucrativa',
    blocks: [
      {
        id: 'hero-3',
        type: BlockType.HERO,
        order: 0,
        visible: true,
        settings: {
          title: 'Ideal para Pecuária Lucrativa',
          subtitle: 'Capacidade para 1.000+ cabeças, pastagens rotacionadas e currais de ponta.',
          ctaText: 'Agendar Visita Técnica',
          backgroundImage: '/templates/template_livestock.png'
        },
        styles: { padding: '0' }
      }
    ]
  },
  {
    id: 'opportunity-sale',
    name: 'Oportunidade Única à Vista',
    thumbnail: '/templates/template_opportunity.png',
    description: 'Focado em ofertas de ocasião e liquidez.',
    slug: 'oportunidade-unica',
    blocks: [
      {
        id: 'hero-4',
        type: BlockType.HERO,
        order: 0,
        visible: true,
        settings: {
          title: 'Oportunidade Única à Vista',
          subtitle: 'Desconto exclusivo para pagamento imediato. Área com documentação 100% ok.',
          ctaText: 'Garantir Prioridade',
          backgroundImage: '/templates/template_opportunity.png'
        },
        styles: { padding: '0' }
      }
    ]
  },
  {
    id: 'lifestyle-rural',
    name: 'Morar e Produzir',
    thumbnail: '/templates/template_lifestyle.png',
    description: 'Para quem busca qualidade de vida no campo.',
    slug: 'pronta-para-morar',
    blocks: [
      {
        id: 'hero-5',
        type: BlockType.HERO,
        order: 0,
        visible: true,
        settings: {
          title: 'Pronta para Morar e Produzir',
          subtitle: 'Casa sede cinematográfica, corrego de água cristalina e horta orgânica.',
          ctaText: 'Conhecer meu Novo Lar',
          backgroundImage: '/templates/template_lifestyle.png'
        },
        styles: { padding: '0' }
      }
    ]
  },
  {
    id: 'location-strategic',
    name: 'Localização Estratégica',
    thumbnail: '/templates/template_location_val.png',
    description: 'Próximo a centros urbanos e logística.',
    slug: 'localizacao-estrategica',
    blocks: [
      {
        id: 'hero-6',
        type: BlockType.HERO,
        order: 0,
        visible: true,
        settings: {
          title: 'Localização que Valoriza seu Investimento',
          subtitle: 'A apenas 30 min da cidade e 2h do aeroporto internacional.',
          ctaText: 'Ver Mapa de Logística',
          backgroundImage: '/templates/template_location_val.png'
        },
        styles: { padding: '0' }
      }
    ]
  },
  {
    id: 'high-productivity',
    name: 'Alta Produtividade',
    thumbnail: '/templates/template_tractor_soil.png',
    description: 'Terras férteis com alto teor de argila.',
    slug: 'alta-produtividade',
    blocks: [
      {
        id: 'hero-7',
        type: BlockType.HERO,
        order: 0,
        visible: true,
        settings: {
          title: 'Terra de Alta Produtividade',
          subtitle: 'Solo de terra roxa com alto teor de argila e excelente regime pluviométrico.',
          ctaText: 'Receber Laudo de Solo',
          backgroundImage: '/templates/template_tractor_soil.png'
        },
        styles: { padding: '0' }
      }
    ]
  },
  {
    id: 'last-units-scarcity',
    name: 'Últimas Unidades',
    thumbnail: '/templates/template_last_units.png',
    description: 'Para lançamentos e condomínios rurais.',
    slug: 'ultimas-unidades',
    blocks: [
      {
        id: 'hero-8',
        type: BlockType.HERO,
        order: 0,
        visible: true,
        settings: {
          title: 'Últimas Unidades Disponíveis!',
          subtitle: 'Oportunidade final de adquirir seu lote rural no Condomínio do Sol.',
          ctaText: 'Reservar Agora',
          backgroundImage: '/templates/template_last_units.png'
        },
        styles: { padding: '0' }
      }
    ]
  },
  {
    id: 'inflation-hedge',
    name: 'Proteção contra Inflação',
    thumbnail: '/templates/template_inflation_hedge.png',
    description: 'Foco em ativos reais e segurança jurídica.',
    slug: 'protecao-inflacao',
    blocks: [
      {
        id: 'hero-9',
        type: BlockType.HERO,
        order: 0,
        visible: true,
        settings: {
          title: 'Invista em Terra: Proteção contra Inflação',
          subtitle: 'Mantenha seu patrimônio seguro em ativos reais de liquidez crescente.',
          ctaText: 'Falar com Consultor Financeiro',
          backgroundImage: '/templates/template_inflation_hedge.png'
        },
        styles: { padding: '0' }
      }
    ]
  },
  {
    id: 'legacy-heritage',
    name: 'O Legado e Herança',
    thumbnail: '/templates/template_broker_legacy.png',
    description: 'Para sucessão familiar e holdings.',
    slug: 'legado-e-heranca',
    blocks: [
      {
        id: 'hero-10',
        type: BlockType.HERO,
        order: 0,
        visible: true,
        settings: {
          title: 'O Legado que sua Família Merece',
          subtitle: 'Construa um patrimônio sólido para as próximas gerações.',
          ctaText: 'Planejar Sucessão',
          backgroundImage: '/templates/template_broker_legacy.png'
        },
        styles: { padding: '0' }
      }
    ]
  }
];
