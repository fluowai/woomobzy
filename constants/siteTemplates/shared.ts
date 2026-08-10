import { BlockType } from '../../types/landingPage';
import { SiteTemplate } from '../../types/site';

export const IMG = {
  luxury: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
  luxury2: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop',
  rural: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=800&fit=crop',
  rural2: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=1200&h=800&fit=crop',
  urban: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop',
  urban2: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&h=800&fit=crop',
  commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=800&fit=crop',
  lots: 'https://images.unsplash.com/photo-1473161924773-228b7e28b17b?w=1200&h=800&fit=crop', // Aéreo loteamento
  mcmv: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&h=800&fit=crop',
  modernHouse: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop',
  classic: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&h=800&fit=crop',
  beach: 'https://images.unsplash.com/photo-1499793983394-2d6e66b9b832?w=1200&h=800&fit=crop',
  eco: 'https://images.unsplash.com/photo-1518005068251-37900150dfca?w=1200&h=800&fit=crop',
};

export const makeTheme = (o: Record<string, any>) => ({
  primaryColor: '#2563eb',
  secondaryColor: '#059669',
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  fontFamily: 'Inter, sans-serif',
  headingFontFamily: 'Inter, sans-serif',
  fontSize: {
    base: '1rem',
    heading1: '3rem',
    heading2: '2rem',
    heading3: '1.5rem',
  },
  borderRadius: '0.75rem',
  spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '4rem' },
  ...o,
});

export interface BuildSiteConfig {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  themeConfig: Record<string, any>;
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  stats?: Array<{ value: string; label: string; icon: string }>;
  features?: Array<{ title: string; description: string; icon: string }>;
  testimonials?: Array<{ name: string; text: string; rating: number }>;
}

/**
 * Helper para gerar os 20 sites de forma padronizada.
 * Gera automaticamente as páginas Início, Imóveis, Sobre e Contato.
 */
export const buildStandardSiteTemplate = (config: BuildSiteConfig): SiteTemplate => {
  const { id, name, description, thumbnail, category, themeConfig, heroImage, heroTitle, heroSubtitle, stats, features, testimonials } = config;

  return {
    id,
    name,
    description,
    thumbnail,
    category,
    globalTheme: makeTheme(themeConfig),
    menuConfig: [
      { id: `${id}-m1`, label: 'Início', type: 'page', pageId: 'home', order: 0 },
      { id: `${id}-m2`, label: 'Imóveis', type: 'page', pageId: 'imoveis', order: 1 },
      { id: `${id}-m3`, label: 'Sobre', type: 'page', pageId: 'sobre', order: 2 },
      { id: `${id}-m4`, label: 'Contato', type: 'page', pageId: 'contato', order: 3 },
    ],
    pages: [
      {
        title: 'Início',
        slug: 'home',
        isHome: true,
        blocks: [
          {
            id: `${id}-hero`,
            type: BlockType.HERO,
            order: 0,
            visible: true,
            config: {
              title: heroTitle,
              subtitle: heroSubtitle,
              backgroundImage: heroImage,
              overlayOpacity: 0.5,
              ctaText: 'Ver Propriedades',
              ctaLink: '/imoveis',
              height: 650,
              alignment: 'center',
              textColor: '#FFFFFF',
            },
            styles: { padding: '0px' },
          },
          ...(features ? [{
            id: `${id}-features`,
            type: BlockType.FEATURES,
            order: 1,
            visible: true,
            config: { features, columns: 3 },
            styles: { padding: '80px 20px', backgroundColor: themeConfig.backgroundColor },
          }] : []),
          ...(stats ? [{
            id: `${id}-stats`,
            type: BlockType.STATS,
            order: 2,
            visible: true,
            config: { stats, columns: 3, animated: true },
            styles: { padding: '60px 20px', backgroundColor: themeConfig.primaryColor },
          }] : []),
          {
            id: `${id}-grid`,
            type: BlockType.PROPERTY_GRID,
            order: 3,
            visible: true,
            config: { columns: 3, gap: 24, showFilters: false, maxItems: 6, sortBy: 'price', cardStyle: 'modern' },
            styles: { padding: '80px 20px', backgroundColor: themeConfig.backgroundColor },
          },
          ...(testimonials ? [{
            id: `${id}-testim`,
            type: BlockType.TESTIMONIALS,
            order: 4,
            visible: true,
            config: { testimonials, layout: 'grid', showRating: true },
            styles: { padding: '80px 20px', backgroundColor: themeConfig.backgroundColor },
          }] : []),
          {
            id: `${id}-footer`,
            type: BlockType.FOOTER,
            order: 5,
            visible: true,
            config: {},
            styles: { padding: '40px 20px', backgroundColor: '#111827' }, // Dark footer base
          }
        ],
      },
      {
        title: 'Imóveis',
        slug: 'imoveis',
        isHome: false,
        blocks: [
          {
            id: `${id}-imp-hero`,
            type: BlockType.HERO,
            order: 0,
            visible: true,
            config: {
              title: 'Catálogo de Imóveis',
              subtitle: 'Encontre a propriedade ideal',
              backgroundImage: heroImage,
              overlayOpacity: 0.6,
              height: 400,
              alignment: 'center',
              textColor: '#FFFFFF',
            },
            styles: { padding: '0px' },
          },
          {
            id: `${id}-imp-grid`,
            type: BlockType.PROPERTY_GRID,
            order: 1,
            visible: true,
            config: { columns: 3, gap: 24, showFilters: true, maxItems: 30, sortBy: 'price', cardStyle: 'modern' },
            styles: { padding: '80px 20px', backgroundColor: themeConfig.backgroundColor },
          },
          {
            id: `${id}-imp-footer`,
            type: BlockType.FOOTER,
            order: 2,
            visible: true,
            config: {},
            styles: { padding: '40px 20px', backgroundColor: '#111827' },
          }
        ],
      },
      {
        title: 'Sobre Nós',
        slug: 'sobre',
        isHome: false,
        blocks: [
          {
            id: `${id}-sob-hero`,
            type: BlockType.HERO,
            order: 0,
            visible: true,
            config: {
              title: 'Nossa História',
              subtitle: 'Conheça nossa trajetória no mercado imobiliário',
              backgroundImage: heroImage,
              overlayOpacity: 0.7,
              height: 400,
              alignment: 'center',
              textColor: '#FFFFFF',
            },
            styles: { padding: '0px' },
          },
          {
            id: `${id}-sob-text`,
            type: BlockType.TEXT,
            order: 1,
            visible: true,
            config: {
              content: `<h2>Quem Somos</h2><p>Trabalhamos incansavelmente para proporcionar a melhor experiência na jornada imobiliária. Nossa missão é conectar pessoas ao local ideal, com transparência, agilidade e segurança jurídica.</p>`,
              fontSize: 16,
              color: themeConfig.textColor,
              alignment: 'left',
            },
            styles: { padding: '80px 20px', backgroundColor: themeConfig.backgroundColor },
          },
          {
            id: `${id}-sob-timeline`,
            type: BlockType.TIMELINE,
            order: 2,
            visible: true,
            config: {
              title: 'Trajetória',
              items: [
                { title: 'Fundação', description: 'Início das atividades', time: '2010' },
                { title: 'Expansão', description: 'Atendimento regionalizado', time: '2015' },
                { title: 'Consolidação', description: 'Milhares de clientes satisfeitos', time: 'Atualidade' },
              ],
            },
            styles: { padding: '60px 20px', backgroundColor: themeConfig.backgroundColor },
          },
          {
            id: `${id}-sob-footer`,
            type: BlockType.FOOTER,
            order: 3,
            visible: true,
            config: {},
            styles: { padding: '40px 20px', backgroundColor: '#111827' },
          }
        ],
      },
      {
        title: 'Contato',
        slug: 'contato',
        isHome: false,
        blocks: [
          {
            id: `${id}-con-form`,
            type: BlockType.HERO_WITH_FORM,
            order: 0,
            visible: true,
            config: {
              title: 'Fale Conosco',
              subtitle: 'Tire suas dúvidas ou agende uma visita',
              backgroundImage: heroImage,
              overlayOpacity: 0.5,
              formTitle: 'Envie sua Mensagem',
              submitText: 'Enviar Mensagem',
              fields: [
                { name: 'name', type: 'text', label: 'Nome', required: true },
                { name: 'phone', type: 'tel', label: 'WhatsApp', required: true },
                { name: 'message', type: 'text', label: 'Como podemos ajudar?', required: true },
              ],
              height: 600,
              textColor: '#FFFFFF',
            },
            styles: { padding: '0px' },
          },
          {
            id: `${id}-con-map`,
            type: BlockType.MAP,
            order: 1,
            visible: true,
            config: { latitude: -23.5505, longitude: -46.6333, zoom: 14 },
            styles: { padding: '0px' },
          },
          {
            id: `${id}-con-footer`,
            type: BlockType.FOOTER,
            order: 2,
            visible: true,
            config: {},
            styles: { padding: '40px 20px', backgroundColor: '#111827' },
          }
        ]
      }
    ]
  };
};
