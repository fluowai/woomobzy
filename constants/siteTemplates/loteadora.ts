import { SiteTemplate } from '../../types/site';
import { buildStandardSiteTemplate, IMG } from './shared';

export const LOTEADORA_SITE_TEMPLATES: SiteTemplate[] = [
  buildStandardSiteTemplate({
    id: 'site-loteadora-masterplan',
    name: 'Masterplan Vision Site',
    description: 'Foco no grupo loteador corporativo. Mostra o mapa de loteamentos.',
    thumbnail: IMG.lots,
    category: 'Loteamentos Abertos',
    heroImage: IMG.lots,
    heroTitle: 'Loteamentos que Desenvolvem Cidades',
    heroSubtitle: 'Conheça nossos bairros planejados e lotes comerciais.',
    themeConfig: {
      primaryColor: '#1d4ed8', // Azul Corporativo
      secondaryColor: '#15803d', // Verde
      backgroundColor: '#f1f5f9',
      textColor: '#0f172a',
      fontFamily: 'Montserrat, sans-serif',
    },
    features: [
      { title: 'Infraestrutura Completa', description: 'Asfalto, água, luz e esgoto.', icon: '🏗️' },
      { title: 'Localização Estratégica', description: 'Vetores de crescimento.', icon: '📍' },
      { title: 'Financiamento Direto', description: 'Sem burocracia bancária.', icon: '💰' },
    ],
  }),
  buildStandardSiteTemplate({
    id: 'site-loteadora-naturale',
    name: 'Naturale Viver Site',
    description: 'Condomínios horizontais ecológicos.',
    thumbnail: IMG.eco,
    category: 'Condomínio Sustentável',
    heroImage: IMG.eco,
    heroTitle: 'O Seu Terreno Junto à Natureza',
    heroSubtitle: 'Lotes em condomínio fechado cercado por área verde preservada.',
    themeConfig: {
      primaryColor: '#166534',
      secondaryColor: '#854d0e',
      backgroundColor: '#fdfcf8',
      textColor: '#1c1917',
      fontFamily: 'Montserrat, sans-serif',
    },
  }),
  buildStandardSiteTemplate({
    id: 'site-loteadora-urban',
    name: 'Urban Connect Site',
    description: 'Lotes comerciais e bairros mistos de alto tráfego.',
    thumbnail: IMG.commercial,
    category: 'Lotes Comerciais',
    heroImage: IMG.commercial,
    heroTitle: 'O Endereço do Seu Negócio',
    heroSubtitle: 'Lotes comerciais nas vias de maior crescimento da região.',
    themeConfig: {
      primaryColor: '#334155',
      secondaryColor: '#eab308',
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      fontFamily: 'Montserrat, sans-serif',
    },
  }),
  buildStandardSiteTemplate({
    id: 'site-loteadora-resort',
    name: 'Exclusive Resort Site',
    description: 'Clube e lotes de luxo de frente para a água.',
    thumbnail: IMG.luxury,
    category: 'Condomínio Resort',
    heroImage: IMG.luxury,
    heroTitle: 'Um Resort Para Chamar de Lar',
    heroSubtitle: 'Lotes premium em condomínio de altíssimo padrão.',
    themeConfig: {
      primaryColor: '#0891b2', // Turquesa
      secondaryColor: '#0e7490',
      backgroundColor: '#ffffff',
      textColor: '#164e63',
      fontFamily: 'Montserrat, sans-serif',
    },
  }),
  buildStandardSiteTemplate({
    id: 'site-loteadora-bairro',
    name: 'Primeiro Bairro Site',
    description: 'Focado em lotes populares e programa MCMV.',
    thumbnail: IMG.mcmv,
    category: 'Bairro Planejado Popular',
    heroImage: IMG.mcmv,
    heroTitle: 'O Terreno da Sua Casa Própria',
    heroSubtitle: 'Lotes com parcelas que cabem no seu bolso.',
    themeConfig: {
      primaryColor: '#ea580c', // Laranja
      secondaryColor: '#0284c7', // Azul Celeste
      backgroundColor: '#fff7ed',
      textColor: '#1e293b',
      fontFamily: 'Montserrat, sans-serif',
    },
  })
];
