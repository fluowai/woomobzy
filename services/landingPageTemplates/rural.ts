import { BlockType } from '../../types/landingPage';
import { LandingPageTemplate, templateBlock, defaultPremiumTheme, landingImage } from './shared';

export const RURAL_TEMPLATES: LandingPageTemplate[] = [
  {
    id: 'rural-fazendas-brasil',
    name: 'Fazendas Brasil Premium',
    description: 'Venda de grandes áreas agrícolas (soja, milho) com foco em produtividade e dados técnicos.',
    thumbnail: landingImage.farm,
    category: 'Venda de Fazenda',
    group: 'Rural',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#166534',
      secondaryColor: '#22c55e',
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
    },
    blocks: [
      {
        ...templateBlock(BlockType.HERO_WITH_FORM, 0, {
          title: 'Fazenda Produtiva de Alta Rentabilidade',
          subtitle: 'Área com excelência em produtividade, topografia plana e abundância de água.',
          backgroundImage: landingImage.crops,
          overlayOpacity: 0.6,
          formTitle: 'Baixar Dossiê Completo',
          submitText: 'Quero Receber',
          fields: [
            { name: 'name', type: 'text', label: 'Nome', required: true },
            { name: 'phone', type: 'tel', label: 'WhatsApp', required: true },
            { name: 'email', type: 'email', label: 'E-mail Corporativo', required: true }
          ],
          height: 700,
          textColor: '#ffffff',
          showBadges: true,
          badges: [
            { icon: 'map', title: '1.200 Hectares', description: 'Área útil' },
            { icon: 'file-text', title: 'Documentação OK', description: 'CAR e GEO prontos' }
          ]
        }, { padding: '0px' }, 'full')
      },
      templateBlock(BlockType.STATS, 1, {
        animated: true,
        columns: 4,
        stats: [
          { label: 'Hectares', value: '1.200', icon: '📏' },
          { label: 'Produtividade', value: 'Alta', icon: '📈' },
          { label: 'Água', value: 'Nascentes', icon: '💧' },
          { label: 'Topografia', value: 'Plana', icon: '🚜' }
        ]
      }, { padding: '60px 20px', backgroundColor: '#166534', textColor: '#ffffff' }),
      templateBlock(BlockType.PROPERTY_GRID, 2, {
        columns: 3,
        gap: 24,
        showFilters: true,
        maxItems: 6,
        sortBy: 'area',
        cardStyle: 'modern'
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.TESTIMONIALS, 3, {
        layout: 'grid',
        showRating: true,
        testimonials: [
          { name: 'Grupo Investidor', text: 'Excelente área, solo rico e logística favorável.', rating: 5 },
          { name: 'Engenheiro Agrônomo', text: 'Potencial incrível para dupla safra.', rating: 5 }
        ]
      }, { padding: '80px 20px', backgroundColor: '#f0fdf4' }),
      templateBlock(BlockType.FOOTER, 4, {}, { padding: '40px 20px', backgroundColor: '#14532d' }, 'full')
    ]
  },
  {
    id: 'rural-agro-invest',
    name: 'Agro Invest',
    description: 'Foco financeiro e corporativo para fundos e grandes investidores.',
    thumbnail: landingImage.warehouse,
    category: 'Investimentos Rurais',
    group: 'Rural',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#0f172a',
      secondaryColor: '#3b82f6',
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
    },
    blocks: [
      templateBlock(BlockType.HERO, 0, {
        title: 'Oportunidades de Investimento no Agro',
        subtitle: 'Terras com alto potencial de valorização e retorno garantido.',
        backgroundImage: landingImage.farm,
        overlayOpacity: 0.7,
        ctaText: 'Ver Portfólio',
        ctaLink: '#imoveis',
        height: 600,
        alignment: 'center',
        textColor: '#ffffff'
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.FEATURES, 1, {
        columns: 3,
        layout: 'grid',
        features: [
          { title: 'Diligência Prévia', description: 'Todas as áreas são checadas juridicamente.', icon: '⚖️' },
          { title: 'Estudo de Solo', description: 'Relatório agronômico completo.', icon: '📊' },
          { title: 'Sigilo', description: 'Transações off-market e NDAs.', icon: '🔒' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.PROPERTY_GRID, 2, {
        columns: 2,
        gap: 32,
        showFilters: true,
        maxItems: 4,
        sortBy: 'price',
        cardStyle: 'minimal'
      }, { padding: '60px 20px', backgroundColor: '#f8fafc' }),
      templateBlock(BlockType.CTA, 3, {
        title: 'Quer receber nosso relatório mensal?',
        description: 'Cadastre-se para receber oportunidades de terras brutas e áreas consolidadas.',
        buttonText: 'Assinar Newsletter',
        buttonLink: '#',
        backgroundColor: '#0f172a',
        textColor: '#ffffff'
      }, { padding: '60px 20px' }),
      templateBlock(BlockType.FOOTER, 4, {}, { padding: '40px 20px', backgroundColor: '#020617' }, 'full')
    ]
  },
  {
    id: 'rural-pecuaria-forte',
    name: 'Pecuária Forte',
    description: 'Propriedades estruturadas para gado, curral e confinamento.',
    thumbnail: landingImage.house,
    category: 'Pecuária',
    group: 'Rural',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#78350f',
      secondaryColor: '#d97706',
      backgroundColor: '#fffbeb',
      textColor: '#451a03',
    },
    blocks: [
      templateBlock(BlockType.HERO, 0, {
        title: 'Fazendas Estruturadas para Pecuária',
        subtitle: 'Curralama de primeira, pastagem formada e abundância de água.',
        backgroundImage: 'https://images.unsplash.com/photo-1544320953-ebbd1bbbbbe8?q=80&w=1920&auto=format&fit=crop',
        overlayOpacity: 0.5,
        ctaText: 'Ver Fazendas',
        ctaLink: '#imoveis',
        height: 600,
        alignment: 'left',
        textColor: '#ffffff'
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.GALLERY, 1, {
        columns: 4,
        gap: 16,
        lightbox: true,
        images: [
          { src: 'https://images.unsplash.com/photo-1544320953-ebbd1bbbbbe8?q=80&w=600&auto=format&fit=crop', alt: 'Gado' },
          { src: landingImage.farm, alt: 'Pasto' },
          { src: landingImage.house, alt: 'Sede' },
          { src: landingImage.interior, alt: 'Curral' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.PROPERTY_GRID, 2, {
        columns: 3,
        gap: 24,
        showFilters: false,
        maxItems: 6,
        sortBy: 'area',
        cardStyle: 'modern'
      }, { padding: '80px 20px', backgroundColor: '#fffbeb' }),
      templateBlock(BlockType.FOOTER, 3, {}, { padding: '40px 20px', backgroundColor: '#451a03' }, 'full')
    ]
  },
  {
    id: 'rural-chacaras-lazer',
    name: 'Chácaras & Lazer',
    description: 'Foco em qualidade de vida, turismo rural e sítios de fim de semana.',
    thumbnail: landingImage.mansion,
    category: 'Lazer e Descanso',
    group: 'Rural',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#0f766e',
      secondaryColor: '#14b8a6',
      backgroundColor: '#f0fdfa',
      textColor: '#134e4a',
    },
    blocks: [
      templateBlock(BlockType.HERO, 0, {
        title: 'O Seu Refúgio Perto da Cidade',
        subtitle: 'Chácaras, Sítios e Haras para você se conectar com a natureza.',
        backgroundImage: landingImage.mansion,
        overlayOpacity: 0.4,
        ctaText: 'Explorar Propriedades',
        ctaLink: '#imoveis',
        height: 600,
        alignment: 'center',
        textColor: '#ffffff'
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.FEATURES, 1, {
        columns: 4,
        layout: 'grid',
        features: [
          { title: 'Piscina e Lazer', description: 'Para curtir com a família.', icon: '🏊' },
          { title: 'Natureza', description: 'Ar puro e tranquilidade.', icon: '🌳' },
          { title: 'Acesso Fácil', description: 'Próximo de rodovias asfaltadas.', icon: '🛣️' },
          { title: 'Segurança', description: 'Em condomínios ou áreas seguras.', icon: '🔒' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.PROPERTY_GRID, 2, {
        columns: 4,
        gap: 16,
        showFilters: true,
        maxItems: 8,
        sortBy: 'price',
        cardStyle: 'classic'
      }, { padding: '80px 20px', backgroundColor: '#f0fdfa' }),
      templateBlock(BlockType.TESTIMONIALS, 3, {
        layout: 'grid',
        showRating: true,
        testimonials: [
          { name: 'Família Costa', text: 'Compramos nosso sítio de fim de semana e foi a melhor decisão!', rating: 5 },
          { name: 'João P.', text: 'O atendimento ajudou a achar um haras com a estrutura exata que eu precisava.', rating: 5 }
        ]
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.FOOTER, 4, {}, { padding: '40px 20px', backgroundColor: '#115e59' }, 'full')
    ]
  },
  {
    id: 'rural-off-market',
    name: 'Rural Off-Market (Sigilo)',
    description: 'Para propriedades gigantescas e fundos institucionais onde o sigilo é exigido.',
    thumbnail: landingImage.farm,
    category: 'Captação de Imóveis',
    group: 'Rural',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#1e3a8a',
      secondaryColor: '#3b82f6',
      backgroundColor: '#eff6ff',
      textColor: '#1e3a8a',
    },
    blocks: [
      templateBlock(BlockType.HERO_WITH_FORM, 0, {
        title: 'Áreas Rurais com Sigilo Absoluto',
        subtitle: 'Operações off-market exclusivas para grupos investidores e fundos.',
        backgroundImage: landingImage.farm,
        overlayOpacity: 0.8,
        formTitle: 'Assinar NDA',
        submitText: 'Solicitar Acesso',
        fields: [
          { name: 'name', type: 'text', label: 'Nome / Empresa', required: true },
          { name: 'email', type: 'email', label: 'E-mail Corporativo', required: true },
          { name: 'phone', type: 'tel', label: 'Telefone', required: true }
        ],
        height: 700,
        textColor: '#ffffff',
        showBadges: true,
        badges: [
          { icon: 'lock', title: '100% Sigiloso', description: 'Informações protegidas por NDA' }
        ]
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.TEXT, 1, {
        content: '<h2>Operações Estruturadas</h2><p>Trabalhamos com propriedades rurais de grande escala que não estão anunciadas publicamente. Nossa equipe cuida de todo o processo de due diligence e estruturação da operação.</p>',
        alignment: 'center',
        fontSize: 18,
        fontWeight: 400,
        color: '#1e3a8a'
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.TIMELINE, 2, {
        title: 'Processo de Aquisição',
        items: [
          { title: 'Contato Inicial', description: 'Assinatura do NDA.' },
          { title: 'Apresentação', description: 'Teaser e dados macro da propriedade.' },
          { title: 'Diligência', description: 'Acesso ao data room e visita in loco.' },
          { title: 'Fechamento', description: 'Estruturação jurídica e financeira.' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#eff6ff' }),
      templateBlock(BlockType.FOOTER, 3, {}, { padding: '40px 20px', backgroundColor: '#172554' }, 'full')
    ]
  }
];
