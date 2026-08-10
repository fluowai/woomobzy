import { SiteTemplate } from '../../types/site';
import { buildStandardSiteTemplate, IMG } from './shared';

export const URBANO_SITE_TEMPLATES: SiteTemplate[] = [
  buildStandardSiteTemplate({
    id: 'site-urbano-penthouse',
    name: 'Penthouse Skyline Site',
    description: 'Site sombrio/luxuoso para coberturas e imóveis de altíssimo padrão.',
    thumbnail: IMG.luxury2,
    category: 'Avulso Alto Padrão',
    heroImage: IMG.luxury2,
    heroTitle: 'O Ápice do Luxo Urbano',
    heroSubtitle: 'Coberturas e mansões suspensas com vistas definitivas.',
    themeConfig: {
      primaryColor: '#000000',
      secondaryColor: '#ca8a04', // Dourado
      backgroundColor: '#0f172a',
      textColor: '#f8fafc',
      fontFamily: 'Outfit, sans-serif',
    },
    features: [
      { title: 'Vistas Panorâmicas', description: 'O skyline da cidade aos seus pés.', icon: '🌆' },
      { title: 'Design Assinado', description: 'Acabamentos de grife mundial.', icon: '✨' },
      { title: 'Privacidade', description: 'Um por andar com elevador biométrico.', icon: '🔒' },
    ],
  }),
  buildStandardSiteTemplate({
    id: 'site-urbano-family',
    name: 'Family Suburb Site',
    description: 'Cores quentes e amigáveis, foco em casas em condomínio fechado.',
    thumbnail: IMG.modernHouse,
    category: 'Casas em Condomínio',
    heroImage: IMG.modernHouse,
    heroTitle: 'O Melhor Para a Sua Família',
    heroSubtitle: 'Casas amplas com segurança e espaço para as crianças.',
    themeConfig: {
      primaryColor: '#c2410c', // Laranja quente
      secondaryColor: '#0369a1',
      backgroundColor: '#fff7ed',
      textColor: '#431407',
      fontFamily: 'Inter, sans-serif',
    },
  }),
  buildStandardSiteTemplate({
    id: 'site-urbano-smart',
    name: 'Smart Studio Site',
    description: 'Estética neon/dark para investidores jovens e locação rápida.',
    thumbnail: IMG.urban,
    category: 'Lançamentos e Studios',
    heroImage: IMG.urban,
    heroTitle: 'Invista no Centro da Ação',
    heroSubtitle: 'Studios inteligentes focados em alta rentabilidade (Airbnb).',
    themeConfig: {
      primaryColor: '#7c3aed', // Roxo Neon
      secondaryColor: '#ec4899', // Pink
      backgroundColor: '#09090b',
      textColor: '#e4e4e7',
      fontFamily: 'Outfit, sans-serif',
    },
  }),
  buildStandardSiteTemplate({
    id: 'site-urbano-minimalista',
    name: 'Minimalista Chic Site',
    description: 'Design super limpo (branco absoluto) para imóveis modernos.',
    thumbnail: IMG.urban2,
    category: 'Design Assinado',
    heroImage: IMG.urban2,
    heroTitle: 'A Beleza do Menos',
    heroSubtitle: 'Arquitetura contemporânea e espaços abertos.',
    themeConfig: {
      primaryColor: '#171717',
      secondaryColor: '#525252',
      backgroundColor: '#ffffff',
      textColor: '#262626',
      fontFamily: 'Inter, sans-serif',
    },
  }),
  buildStandardSiteTemplate({
    id: 'site-urbano-heritage',
    name: 'Heritage Classic Site',
    description: 'Site focado na imobiliária tradicional de bairro.',
    thumbnail: IMG.classic,
    category: 'Imobiliária de Bairro',
    heroImage: IMG.classic,
    heroTitle: 'A Imobiliária da Sua Família',
    heroSubtitle: 'Conhecemos cada rua e cada história do bairro.',
    themeConfig: {
      primaryColor: '#1e3a8a', // Azul Marinho Clássico
      secondaryColor: '#b45309', // Dourado escuro
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
      fontFamily: 'Playfair Display, serif',
    },
  })
];
