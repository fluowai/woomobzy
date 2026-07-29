import fs from 'fs';

const filePath = './constants/siteTemplates.ts';
let content = fs.readFileSync(filePath, 'utf8');

// The new templates to add. We will use simple definitions with different colors.
const newTemplates = `
  // --- NOVOS TEMPLATES RURAIS ---
  {
    id: 'agro-moderno',
    name: 'Agro Moderno',
    description: 'Foco em sustentabilidade e tecnologia no campo.',
    thumbnail: IMG.rural,
    category: 'rural',
    globalTheme: makeTheme({ primaryColor: '#4CAF50', secondaryColor: '#388E3C', backgroundColor: '#F1F8E9', textColor: '#1B5E20' }),
    menuConfig: [ { id: 'am-1', label: 'Início', type: 'page', pageId: 'home', order: 0 }, { id: 'am-2', label: 'Imóveis', type: 'page', pageId: 'imoveis', order: 1 } ],
    pages: [{
      title: 'Início', slug: 'home', isHome: true,
      blocks: [
        { id: 'am-hero', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Tecnologia & Sustentabilidade', subtitle: 'As melhores terras para o agronegócio do futuro.', backgroundImage: IMG.eco, overlayOpacity: 0.5, height: 600, alignment: 'center', textColor: '#F1F8E9' }, styles: { padding: '0px' } },
        { id: 'am-grid', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }, {
      title: 'Imóveis', slug: 'imoveis', isHome: false,
      blocks: [
        { id: 'am-hero-2', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Propriedades Rurais', subtitle: 'Conheça nosso portfólio', backgroundImage: IMG.eco2, overlayOpacity: 0.5, height: 400, alignment: 'center', textColor: '#F1F8E9' }, styles: { padding: '0px' } },
        { id: 'am-grid-2', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 30, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }]
  },
  {
    id: 'fazenda-classica',
    name: 'Fazenda Clássica',
    description: 'Para propriedades tradicionais e históricas.',
    thumbnail: IMG.rural2,
    category: 'rural',
    globalTheme: makeTheme({ primaryColor: '#8D6E63', secondaryColor: '#5D4037', backgroundColor: '#EFEBE9', textColor: '#3E2723', fontFamily: 'Lora, serif' }),
    menuConfig: [ { id: 'fc-1', label: 'Início', type: 'page', pageId: 'home', order: 0 }, { id: 'fc-2', label: 'Imóveis', type: 'page', pageId: 'imoveis', order: 1 } ],
    pages: [{
      title: 'Início', slug: 'home', isHome: true,
      blocks: [
        { id: 'fc-hero', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Tradição e História', subtitle: 'Fazendas que carregam o legado do campo.', backgroundImage: IMG.rural2, overlayOpacity: 0.5, height: 600, alignment: 'center', textColor: '#EFEBE9' }, styles: { padding: '0px' } },
        { id: 'fc-grid', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'classic' }, styles: { padding: '60px 20px' } }
      ]
    }, {
      title: 'Imóveis', slug: 'imoveis', isHome: false,
      blocks: [
        { id: 'fc-hero-2', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Propriedades Históricas', subtitle: 'Conheça nosso portfólio', backgroundImage: IMG.rural, overlayOpacity: 0.5, height: 400, alignment: 'center', textColor: '#EFEBE9' }, styles: { padding: '0px' } },
        { id: 'fc-grid-2', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 30, sortBy: 'price', cardStyle: 'classic' }, styles: { padding: '60px 20px' } }
      ]
    }]
  },
  {
    id: 'haras-premium',
    name: 'Haras Premium',
    description: 'Especializado em propriedades equestres.',
    thumbnail: IMG.luxury,
    category: 'rural',
    globalTheme: makeTheme({ primaryColor: '#5D4037', secondaryColor: '#3E2723', backgroundColor: '#F5F5F5', textColor: '#212121', fontFamily: 'Playfair Display, serif' }),
    menuConfig: [ { id: 'hp-1', label: 'Início', type: 'page', pageId: 'home', order: 0 }, { id: 'hp-2', label: 'Imóveis', type: 'page', pageId: 'imoveis', order: 1 } ],
    pages: [{
      title: 'Início', slug: 'home', isHome: true,
      blocks: [
        { id: 'hp-hero', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Excelência Equestre', subtitle: 'As melhores instalações para criação e esporte.', backgroundImage: IMG.luxury, overlayOpacity: 0.5, height: 600, alignment: 'center', textColor: '#F5F5F5' }, styles: { padding: '0px' } },
        { id: 'hp-grid', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }, {
      title: 'Imóveis', slug: 'imoveis', isHome: false,
      blocks: [
        { id: 'hp-hero-2', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Estruturas Completas', subtitle: 'Conheça nosso portfólio', backgroundImage: IMG.luxury2, overlayOpacity: 0.5, height: 400, alignment: 'center', textColor: '#F5F5F5' }, styles: { padding: '0px' } },
        { id: 'hp-grid-2', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 30, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }]
  },
  {
    id: 'sitios-lazer',
    name: 'Sítios & Lazer',
    description: 'Focado em pequenas propriedades de descanso.',
    thumbnail: IMG.eco,
    category: 'rural',
    globalTheme: makeTheme({ primaryColor: '#FF9800', secondaryColor: '#F57C00', backgroundColor: '#FFF3E0', textColor: '#E65100' }),
    menuConfig: [ { id: 'sl-1', label: 'Início', type: 'page', pageId: 'home', order: 0 }, { id: 'sl-2', label: 'Imóveis', type: 'page', pageId: 'imoveis', order: 1 } ],
    pages: [{
      title: 'Início', slug: 'home', isHome: true,
      blocks: [
        { id: 'sl-hero', type: BlockType.HERO, order: 0, visible: true, config: { title: 'O Seu Refúgio', subtitle: 'Momentos inesquecíveis perto da natureza.', backgroundImage: IMG.eco, overlayOpacity: 0.5, height: 600, alignment: 'center', textColor: '#FFF3E0' }, styles: { padding: '0px' } },
        { id: 'sl-grid', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }, {
      title: 'Imóveis', slug: 'imoveis', isHome: false,
      blocks: [
        { id: 'sl-hero-2', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Paz e Descanso', subtitle: 'Conheça nosso portfólio', backgroundImage: IMG.eco2, overlayOpacity: 0.5, height: 400, alignment: 'center', textColor: '#FFF3E0' }, styles: { padding: '0px' } },
        { id: 'sl-grid-2', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 30, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }]
  },
  {
    id: 'agronegocio-pro',
    name: 'Agronegócio Pro',
    description: 'Focado em grandes áreas de lavoura e pecuária.',
    thumbnail: IMG.rural,
    category: 'rural',
    globalTheme: makeTheme({ primaryColor: '#3F51B5', secondaryColor: '#303F9F', backgroundColor: '#E8EAF6', textColor: '#1A237E' }),
    menuConfig: [ { id: 'ap-1', label: 'Início', type: 'page', pageId: 'home', order: 0 }, { id: 'ap-2', label: 'Imóveis', type: 'page', pageId: 'imoveis', order: 1 } ],
    pages: [{
      title: 'Início', slug: 'home', isHome: true,
      blocks: [
        { id: 'ap-hero', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Produtividade Máxima', subtitle: 'Áreas estratégicas para grandes negócios.', backgroundImage: IMG.rural, overlayOpacity: 0.5, height: 600, alignment: 'center', textColor: '#E8EAF6' }, styles: { padding: '0px' } },
        { id: 'ap-grid', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }, {
      title: 'Imóveis', slug: 'imoveis', isHome: false,
      blocks: [
        { id: 'ap-hero-2', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Grandes Áreas', subtitle: 'Conheça nosso portfólio', backgroundImage: IMG.rural2, overlayOpacity: 0.5, height: 400, alignment: 'center', textColor: '#E8EAF6' }, styles: { padding: '0px' } },
        { id: 'ap-grid-2', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 30, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }]
  },

  // --- NOVOS TEMPLATES URBANOS ---
  {
    id: 'urban-minimal',
    name: 'Urban Minimal',
    description: 'Clean e direto, ideal para studios e apartamentos compactos.',
    thumbnail: IMG.urban,
    category: 'urban',
    globalTheme: makeTheme({ primaryColor: '#000000', secondaryColor: '#333333', backgroundColor: '#FFFFFF', textColor: '#000000', fontFamily: 'Outfit, sans-serif' }),
    menuConfig: [ { id: 'um-1', label: 'Início', type: 'page', pageId: 'home', order: 0 }, { id: 'um-2', label: 'Imóveis', type: 'page', pageId: 'imoveis', order: 1 } ],
    pages: [{
      title: 'Início', slug: 'home', isHome: true,
      blocks: [
        { id: 'um-hero', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Viver o Agora', subtitle: 'Studios e apartamentos práticos no centro de tudo.', backgroundImage: IMG.urban, overlayOpacity: 0.5, height: 600, alignment: 'center', textColor: '#FFFFFF' }, styles: { padding: '0px' } },
        { id: 'um-grid', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'minimal' }, styles: { padding: '60px 20px' } }
      ]
    }, {
      title: 'Imóveis', slug: 'imoveis', isHome: false,
      blocks: [
        { id: 'um-hero-2', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Praticidade Urbana', subtitle: 'Conheça nosso portfólio', backgroundImage: IMG.urban2, overlayOpacity: 0.5, height: 400, alignment: 'center', textColor: '#FFFFFF' }, styles: { padding: '0px' } },
        { id: 'um-grid-2', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 30, sortBy: 'price', cardStyle: 'minimal' }, styles: { padding: '60px 20px' } }
      ]
    }]
  },
  {
    id: 'corporate-glass',
    name: 'Corporate Glass',
    description: 'Focado em lajes corporativas e escritórios comerciais.',
    thumbnail: IMG.commercial,
    category: 'urban',
    globalTheme: makeTheme({ primaryColor: '#1E88E5', secondaryColor: '#1565C0', backgroundColor: '#E3F2FD', textColor: '#0D47A1' }),
    menuConfig: [ { id: 'cg-1', label: 'Início', type: 'page', pageId: 'home', order: 0 }, { id: 'cg-2', label: 'Imóveis', type: 'page', pageId: 'imoveis', order: 1 } ],
    pages: [{
      title: 'Início', slug: 'home', isHome: true,
      blocks: [
        { id: 'cg-hero', type: BlockType.HERO, order: 0, visible: true, config: { title: 'O Futuro dos Negócios', subtitle: 'Lajes e salas corporativas de alto padrão.', backgroundImage: IMG.commercial, overlayOpacity: 0.5, height: 600, alignment: 'center', textColor: '#E3F2FD' }, styles: { padding: '0px' } },
        { id: 'cg-grid', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }, {
      title: 'Imóveis', slug: 'imoveis', isHome: false,
      blocks: [
        { id: 'cg-hero-2', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Escritórios Premium', subtitle: 'Conheça nosso portfólio', backgroundImage: IMG.commercial2, overlayOpacity: 0.5, height: 400, alignment: 'center', textColor: '#E3F2FD' }, styles: { padding: '0px' } },
        { id: 'cg-grid-2', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 30, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }]
  },
  {
    id: 'residencial-familia',
    name: 'Residencial Família',
    description: 'Aconchegante e voltado para casas de condomínio.',
    thumbnail: IMG.classic,
    category: 'urban',
    globalTheme: makeTheme({ primaryColor: '#E91E63', secondaryColor: '#C2185B', backgroundColor: '#FCE4EC', textColor: '#880E4F' }),
    menuConfig: [ { id: 'rf-1', label: 'Início', type: 'page', pageId: 'home', order: 0 }, { id: 'rf-2', label: 'Imóveis', type: 'page', pageId: 'imoveis', order: 1 } ],
    pages: [{
      title: 'Início', slug: 'home', isHome: true,
      blocks: [
        { id: 'rf-hero', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Onde Famílias Crescem', subtitle: 'Casas aconchegantes em bairros e condomínios perfeitos.', backgroundImage: IMG.classic, overlayOpacity: 0.5, height: 600, alignment: 'center', textColor: '#FCE4EC' }, styles: { padding: '0px' } },
        { id: 'rf-grid', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'classic' }, styles: { padding: '60px 20px' } }
      ]
    }, {
      title: 'Imóveis', slug: 'imoveis', isHome: false,
      blocks: [
        { id: 'rf-hero-2', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Casas para Família', subtitle: 'Conheça nosso portfólio', backgroundImage: IMG.classic2, overlayOpacity: 0.5, height: 400, alignment: 'center', textColor: '#FCE4EC' }, styles: { padding: '0px' } },
        { id: 'rf-grid-2', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 30, sortBy: 'price', cardStyle: 'classic' }, styles: { padding: '60px 20px' } }
      ]
    }]
  },
  {
    id: 'lofts-studios',
    name: 'Lofts & Studios',
    description: 'Design jovem e industrial.',
    thumbnail: IMG.bold,
    category: 'urban',
    globalTheme: makeTheme({ primaryColor: '#FF5722', secondaryColor: '#E64A19', backgroundColor: '#FBE9E7', textColor: '#BF360C' }),
    menuConfig: [ { id: 'ls-1', label: 'Início', type: 'page', pageId: 'home', order: 0 }, { id: 'ls-2', label: 'Imóveis', type: 'page', pageId: 'imoveis', order: 1 } ],
    pages: [{
      title: 'Início', slug: 'home', isHome: true,
      blocks: [
        { id: 'ls-hero', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Estilo Industrial', subtitle: 'Design jovem e moderno nos melhores bairros.', backgroundImage: IMG.bold, overlayOpacity: 0.5, height: 600, alignment: 'center', textColor: '#FBE9E7' }, styles: { padding: '0px' } },
        { id: 'ls-grid', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }, {
      title: 'Imóveis', slug: 'imoveis', isHome: false,
      blocks: [
        { id: 'ls-hero-2', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Studios Descolados', subtitle: 'Conheça nosso portfólio', backgroundImage: IMG.bold2, overlayOpacity: 0.5, height: 400, alignment: 'center', textColor: '#FBE9E7' }, styles: { padding: '0px' } },
        { id: 'ls-grid-2', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 30, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }]
  },
  {
    id: 'alto-padrao-urbano',
    name: 'Alto Padrão Urbano',
    description: 'Escuro e luxuoso, focado em coberturas e mansões.',
    thumbnail: IMG.cinema,
    category: 'urban',
    globalTheme: makeTheme({ primaryColor: '#D4AF37', secondaryColor: '#AA8C2C', backgroundColor: '#111111', textColor: '#F5F5F5', fontFamily: 'Playfair Display, serif' }),
    menuConfig: [ { id: 'ap-u-1', label: 'Início', type: 'page', pageId: 'home', order: 0 }, { id: 'ap-u-2', label: 'Imóveis', type: 'page', pageId: 'imoveis', order: 1 } ],
    pages: [{
      title: 'Início', slug: 'home', isHome: true,
      blocks: [
        { id: 'ap-u-hero', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Exclusividade Urbana', subtitle: 'Coberturas e mansões com assinaturas.', backgroundImage: IMG.cinema, overlayOpacity: 0.5, height: 600, alignment: 'center', textColor: '#F5F5F5' }, styles: { padding: '0px' } },
        { id: 'ap-u-grid', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }, {
      title: 'Imóveis', slug: 'imoveis', isHome: false,
      blocks: [
        { id: 'ap-u-hero-2', type: BlockType.HERO, order: 0, visible: true, config: { title: 'Luxo e Design', subtitle: 'Conheça nosso portfólio', backgroundImage: IMG.cinema2, overlayOpacity: 0.5, height: 400, alignment: 'center', textColor: '#F5F5F5' }, styles: { padding: '0px' } },
        { id: 'ap-u-grid-2', type: BlockType.PROPERTY_GRID, order: 1, visible: true, config: { columns: 3, gap: 24, showFilters: true, maxItems: 30, sortBy: 'price', cardStyle: 'modern' }, styles: { padding: '60px 20px' } }
      ]
    }]
  }
];
`;

const exportLine = 'export const SITE_TEMPLATES: SiteTemplate[] = [';
const exportIndex = content.indexOf(exportLine);

if (exportIndex !== -1) {
  // Find the closing bracket of the array. Since the array is large, we can search for the start of the next export.
  const nextExportLine = 'export const generateSiteFromTemplate';
  let nextExportIndex = content.indexOf(nextExportLine);
  if (nextExportIndex === -1) {
    // If not found, let's just find the last "];" before the end.
    nextExportIndex = content.lastIndexOf('];');
  } else {
    nextExportIndex = content.lastIndexOf('];', nextExportIndex);
  }

  if (nextExportIndex !== -1) {
    // We insert right before the '];'
    content = content.slice(0, nextExportIndex) + ',' + newTemplates + '\n' + content.slice(nextExportIndex);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Templates successfully added.');
  } else {
    console.log('Could not find the end of SITE_TEMPLATES array.');
  }
} else {
  console.log('Could not find export const SITE_TEMPLATES');
}
