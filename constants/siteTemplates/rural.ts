import { SiteTemplate } from '../../types/site';
import { buildStandardSiteTemplate, IMG } from './shared';

export const RURAL_SITE_TEMPLATES: SiteTemplate[] = [
  buildStandardSiteTemplate({
    id: 'site-rural-hacienda',
    name: 'Hacienda Premium Site',
    description:
      'Site corporativo focado em grandes investidores e fazendas produtivas.',
    thumbnail: IMG.rural,
    category: 'Venda de Fazenda',
    heroImage: IMG.rural,
    heroTitle: 'Fazendas Produtivas e de Alto Valor',
    heroSubtitle: 'Oportunidades exclusivas no agronegócio brasileiro.',
    themeConfig: {
      primaryColor: '#166534',
      secondaryColor: '#ca8a04',
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
      fontFamily: 'Playfair Display, serif',
    },
    features: [
      {
        title: 'Due Diligence',
        description: 'Garantia jurídica e ambiental.',
        icon: '⚖️',
      },
      {
        title: 'Alta Produtividade',
        description: 'Terras férteis para soja e milho.',
        icon: '🌽',
      },
      {
        title: 'Off-Market',
        description: 'Sigilo absoluto nas negociações.',
        icon: '🔒',
      },
    ],
    stats: [
      { value: '1.2M+', label: 'Hectares Negociados', icon: '📏' },
      { value: '500+', label: 'Clientes Satisfeitos', icon: '🤝' },
      { value: '15', label: 'Anos de Mercado', icon: '⭐' },
    ],
    testimonials: [
      {
        name: 'Grupo Investidor',
        text: 'Excelente área adquirida com logística favorável.',
        rating: 5,
      },
      {
        name: 'Eng. Agrônomo',
        text: 'Potencial incrível para dupla safra no cerrado.',
        rating: 5,
      },
    ],
  }),
  buildStandardSiteTemplate({
    id: 'site-rural-refugio',
    name: 'Refúgio Sereno Site',
    description: 'Focado em sítios, chácaras de lazer e qualidade de vida.',
    thumbnail: IMG.rural2,
    category: 'Sítios e Chácaras',
    heroImage: IMG.rural2,
    heroTitle: 'Seu Refúgio Longe da Cidade',
    heroSubtitle:
      'Chácaras e sítios perfeitos para lazer ou moradia tranquila.',
    themeConfig: {
      primaryColor: '#064e3b',
      secondaryColor: '#854d0e',
      backgroundColor: '#fdfcf8',
      textColor: '#292524',
      fontFamily: 'Inter, sans-serif',
    },
    features: [
      {
        title: 'Conexão com a Natureza',
        description: 'Áreas verdes preservadas.',
        icon: '🌳',
      },
      {
        title: 'Lazer Completo',
        description: 'Piscinas, lagos e trilhas.',
        icon: '🏊',
      },
      {
        title: 'Segurança',
        description: 'Em condomínios rurais fechados.',
        icon: '🛡️',
      },
    ],
    stats: [
      { value: '100+', label: 'Sítios Vendidos', icon: '🏡' },
      { value: '100%', label: 'Paz de Espírito', icon: '🧘' },
      { value: '24h', label: 'Suporte', icon: '📞' },
    ],
  }),
  buildStandardSiteTemplate({
    id: 'site-rural-agrotech',
    name: 'AgroTech Capital Site',
    description: 'Investimento em terras brutas com foco tecnológico.',
    thumbnail: IMG.commercial,
    category: 'Terras para Investimento',
    heroImage: IMG.commercial,
    heroTitle: 'O Futuro do Agronegócio',
    heroSubtitle: 'Terras brutas e consolidadas para alta rentabilidade.',
    themeConfig: {
      primaryColor: '#1e3a8a',
      secondaryColor: '#3b82f6',
      backgroundColor: '#eff6ff',
      textColor: '#1e3a8a',
      fontFamily: 'Inter, sans-serif',
    },
  }),
  buildStandardSiteTemplate({
    id: 'site-rural-haras',
    name: 'Haras Aristocrata Site',
    description: 'Estética voltada para propriedades equestres e luxo rústico.',
    thumbnail: IMG.luxury,
    category: 'Haras',
    heroImage: IMG.luxury,
    heroTitle: 'Tradição e Nobreza Equestre',
    heroSubtitle: 'As melhores estruturas para criação de cavalos.',
    themeConfig: {
      primaryColor: '#7f1d1d', // Bordô
      secondaryColor: '#451a03',
      backgroundColor: '#fef3c7',
      textColor: '#451a03',
      fontFamily: 'Playfair Display, serif',
    },
  }),
  buildStandardSiteTemplate({
    id: 'site-rural-eco',
    name: 'Eco Lodge Site',
    description: 'Pousadas e turismo rural voltado à sustentabilidade.',
    thumbnail: IMG.eco,
    category: 'Turismo Rural',
    heroImage: IMG.eco,
    heroTitle: 'Sustentabilidade e Conforto',
    heroSubtitle: 'Invista no ecoturismo em áreas preservadas.',
    themeConfig: {
      primaryColor: '#14b8a6',
      secondaryColor: '#0f766e',
      backgroundColor: '#f0fdfa',
      textColor: '#134e4a',
      fontFamily: 'Inter, sans-serif',
    },
  }),
];
