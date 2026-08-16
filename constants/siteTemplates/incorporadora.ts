import { SiteTemplate } from '../../types/site';
import { buildStandardSiteTemplate, IMG } from './shared';

export const INCORPORADORA_SITE_TEMPLATES: SiteTemplate[] = [
  buildStandardSiteTemplate({
    id: 'site-incorp-oasis',
    name: 'Oasis Tower Site',
    description:
      'Site oficial de empreendimento vertical premium (Alto Padrão).',
    thumbnail: IMG.luxury,
    category: 'Empreendimento Alto Padrão',
    heroImage: IMG.luxury,
    heroTitle: 'Oasis Tower Residence',
    heroSubtitle: 'O novo marco da arquitetura de alto padrão na cidade.',
    themeConfig: {
      primaryColor: '#b45309', // Dourado Rosé/Cobre
      secondaryColor: '#000000',
      backgroundColor: '#fafafa',
      textColor: '#171717',
      fontFamily: 'Outfit, sans-serif',
    },
    features: [
      {
        title: 'Lazer Suspenso',
        description: 'Piscina de borda infinita no rooftop.',
        icon: '🏊',
      },
      {
        title: 'Automação',
        description: 'Apartamentos 100% integrados via app.',
        icon: '📱',
      },
      {
        title: 'Vagas Box',
        description: 'Garagem fechada com ponto para carro elétrico.',
        icon: '🚗',
      },
    ],
  }),
  buildStandardSiteTemplate({
    id: 'site-incorp-urban-infinity',
    name: 'Urban Infinity Site',
    description: 'Empreendimentos High-Tech no centro comercial.',
    thumbnail: IMG.urban,
    category: 'High-Tech',
    heroImage: IMG.urban,
    heroTitle: 'Conectado à Cidade',
    heroSubtitle: 'Seu novo apartamento no coração comercial e tecnológico.',
    themeConfig: {
      primaryColor: '#1e3a8a',
      secondaryColor: '#94a3b8', // Prata
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      fontFamily: 'Inter, sans-serif',
    },
  }),
  buildStandardSiteTemplate({
    id: 'site-incorp-boutique',
    name: 'Boutique Residence Site',
    description: 'Foco em exclusividade, com apresentação do arquiteto.',
    thumbnail: IMG.modernHouse,
    category: 'Exclusividade',
    heroImage: IMG.modernHouse,
    heroTitle: 'A Arte de Morar Bem',
    heroSubtitle: 'Apenas 12 unidades exclusivas com design assinado.',
    themeConfig: {
      primaryColor: '#065f46', // Verde Esmeralda
      secondaryColor: '#b45309',
      backgroundColor: '#fefce8',
      textColor: '#1c1917',
      fontFamily: 'Playfair Display, serif',
    },
  }),
  buildStandardSiteTemplate({
    id: 'site-incorp-investor',
    name: 'Investor Yield Site',
    description: 'Site voltado exclusivamente para rentabilidade e Airbnb.',
    thumbnail: IMG.commercial,
    category: 'Investimento em Planta',
    heroImage: IMG.commercial,
    heroTitle: 'Multiplique seu Patrimônio',
    heroSubtitle:
      'Studios projetados para máxima rentabilidade em locação short-stay.',
    themeConfig: {
      primaryColor: '#0f172a',
      secondaryColor: '#10b981', // Verde financeiro
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      fontFamily: 'Inter, sans-serif',
    },
  }),
  buildStandardSiteTemplate({
    id: 'site-incorp-ocean',
    name: 'Vista Ocean Site',
    description: 'Foco em litorais e pé na areia.',
    thumbnail: IMG.beach,
    category: 'Empreendimento Litorâneo',
    heroImage: IMG.beach,
    heroTitle: 'De Frente para o Seu Novo Estilo de Vida',
    heroSubtitle: 'O único pé na areia com infraestrutura de resort.',
    themeConfig: {
      primaryColor: '#0284c7', // Azul Oceano
      secondaryColor: '#fde047', // Areia/Sol
      backgroundColor: '#f0f9ff',
      textColor: '#0c4a6e',
      fontFamily: 'Outfit, sans-serif',
    },
  }),
];
