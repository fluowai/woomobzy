import { BlockType } from '../../types/landingPage';
import { LandingPageTemplate, templateBlock, defaultPremiumTheme, landingImage } from './shared';

export const URBANO_TEMPLATES: LandingPageTemplate[] = [
  {
    id: 'urbano-classic',
    name: 'Urban Classic',
    description: 'Design limpo e tradicional, focado em busca fácil e confiança.',
    thumbnail: landingImage.house,
    category: 'Avulso Alto Padrão',
    group: 'Imobiliária',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#0f172a',
      secondaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
    },
    blocks: [
      templateBlock(BlockType.HERO, 0, {
        title: 'Encontre o Imóvel dos Seus Sonhos',
        subtitle: 'As melhores opções da cidade selecionadas para você.',
        backgroundImage: landingImage.house,
        overlayOpacity: 0.5,
        ctaText: 'Ver Imóveis',
        ctaLink: '#imoveis',
        height: 600,
        alignment: 'center',
        textColor: '#ffffff'
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.FEATURES, 1, {
        columns: 3,
        layout: 'grid',
        features: [
          { title: 'Busca Inteligente', description: 'Filtre por bairro, preço e tipo.', icon: '🔍' },
          { title: 'Atendimento Rápido', description: 'Corretores online o tempo todo.', icon: '⚡' },
          { title: 'Compra Segura', description: 'Assessoria jurídica inclusa.', icon: '🛡️' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#f8fafc' }),
      templateBlock(BlockType.PROPERTY_GRID, 2, {
        columns: 3,
        gap: 24,
        showFilters: true,
        maxItems: 6,
        sortBy: 'price',
        cardStyle: 'modern'
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.BROKER_CARD, 3, {
        name: 'Equipe de Vendas',
        photoUrl: landingImage.broker,
        creci: 'CRECI 12345-J',
        specialty: 'Especialistas em imóveis urbanos',
        phone: '(00) 00000-0000',
        email: 'contato@imobzy.com.br',
        description: 'Estamos prontos para te ajudar a encontrar o lar perfeito.'
      }, { padding: '60px 20px', backgroundColor: '#f8fafc' }),
      templateBlock(BlockType.FOOTER, 4, {}, { padding: '40px 20px', backgroundColor: '#0f172a' }, 'full')
    ]
  },
  {
    id: 'urbano-metropole-smart',
    name: 'Metrópole Smart',
    description: 'Dark mode, moderno, ideal para studios e apartamentos compactos.',
    thumbnail: landingImage.luxuryApt,
    category: 'Lançamentos e Studios',
    group: 'Imobiliária',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#171717',
      secondaryColor: '#a8a29e',
      backgroundColor: '#0a0a0a',
      textColor: '#e5e5e5',
    },
    blocks: [
      templateBlock(BlockType.HERO_WITH_FORM, 0, {
        title: 'Moradia Inteligente na Metrópole',
        subtitle: 'Studios e compactos perto do metrô. Assine para receber lançamentos.',
        backgroundImage: landingImage.luxuryApt,
        overlayOpacity: 0.7,
        formTitle: 'Receba Lançamentos Exclusivos',
        submitText: 'Quero Receber',
        fields: [
          { name: 'name', type: 'text', label: 'Nome', required: true },
          { name: 'phone', type: 'tel', label: 'WhatsApp', required: true }
        ],
        height: 700,
        textColor: '#ffffff',
        showBadges: true,
        badges: [
          { icon: 'subway', title: 'Perto do Metrô', description: 'Mobilidade total' },
          { icon: 'wifi', title: 'Pronto para morar', description: 'Mobiliados' }
        ]
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.PROPERTY_CAROUSEL, 1, {
        autoplay: true,
        interval: 3000,
        showArrows: true,
        showDots: true,
        itemsPerView: 3
      }, { padding: '80px 20px', backgroundColor: '#171717' }),
      templateBlock(BlockType.FOOTER, 2, {}, { padding: '40px 20px', backgroundColor: '#000000' }, 'full')
    ]
  },
  {
    id: 'urbano-bairro-prime',
    name: 'Bairro Prime',
    description: 'Cores quentes (terracota). Foco no bairro, vida em família e comércio local.',
    thumbnail: landingImage.family,
    category: 'Imóveis Familiares',
    group: 'Imobiliária',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#9a3412',
      secondaryColor: '#f97316',
      backgroundColor: '#fff7ed',
      textColor: '#431407',
    },
    blocks: [
      templateBlock(BlockType.HERO, 0, {
        title: 'Viva no Melhor Ponto da Cidade',
        subtitle: 'Espaço, segurança e qualidade de vida para sua família.',
        backgroundImage: landingImage.family,
        overlayOpacity: 0.4,
        ctaText: 'Explorar Bairro',
        ctaLink: '#imoveis',
        height: 600,
        alignment: 'left',
        textColor: '#ffffff'
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.TESTIMONIALS, 1, {
        layout: 'grid',
        showRating: true,
        testimonials: [
          { name: 'Família Silva', text: 'Encontramos a casa perfeita perto da escola das crianças.', rating: 5 },
          { name: 'Carlos E.', text: 'O atendimento foi focado exatamente no que a gente precisava.', rating: 5 }
        ]
      }, { padding: '80px 20px', backgroundColor: '#ffedd5' }),
      templateBlock(BlockType.PROPERTY_GRID, 2, {
        columns: 2,
        gap: 32,
        showFilters: false,
        maxItems: 4,
        sortBy: 'date',
        cardStyle: 'classic'
      }, { padding: '80px 20px' }),
      templateBlock(BlockType.MAP, 3, {
        latitude: -23.5505,
        longitude: -46.6333,
        zoom: 14,
        markers: [{ lat: -23.5505, lng: -46.6333, title: 'Nossa Região' }]
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.FOOTER, 4, {}, { padding: '40px 20px', backgroundColor: '#7c2d12' }, 'full')
    ]
  },
  {
    id: 'urbano-aluguel-express',
    name: 'Aluguel Express',
    description: 'Focado em locação descomplicada, sem fiador e 100% online.',
    thumbnail: landingImage.interior,
    category: 'Locação',
    group: 'Imobiliária',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#4f46e5',
      secondaryColor: '#818cf8',
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
    },
    blocks: [
      templateBlock(BlockType.HERO, 0, {
        title: 'Alugue sem Burocracia',
        subtitle: 'Processo 100% digital, sem fiador e aprovação em 15 minutos.',
        backgroundImage: landingImage.interior,
        overlayOpacity: 0.6,
        ctaText: 'Ver Imóveis para Alugar',
        ctaLink: '#imoveis',
        height: 500,
        alignment: 'center',
        textColor: '#ffffff'
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.FEATURES, 1, {
        columns: 4,
        layout: 'grid',
        features: [
          { title: 'Sem Fiador', description: 'Use cartão de crédito ou seguro fiança.', icon: '💳' },
          { title: '100% Digital', description: 'Assinatura pelo celular.', icon: '📱' },
          { title: 'Rápido', description: 'Aprovação em minutos.', icon: '⚡' },
          { title: 'Suporte', description: 'Manutenção garantida.', icon: '🔧' }
        ]
      }, { padding: '60px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.PROPERTY_GRID, 2, {
        columns: 4,
        gap: 16,
        showFilters: true,
        maxItems: 8,
        sortBy: 'price',
        cardStyle: 'modern'
      }, { padding: '60px 20px' }),
      templateBlock(BlockType.CTA, 3, {
        title: 'Dúvidas sobre locação?',
        description: 'Chame nosso time no WhatsApp e resolva na hora.',
        buttonText: 'Falar no WhatsApp',
        buttonLink: '#',
        backgroundColor: '#4f46e5',
        textColor: '#ffffff'
      }, { padding: '60px 20px' }),
      templateBlock(BlockType.FOOTER, 4, {}, { padding: '40px 20px', backgroundColor: '#1e293b' }, 'full')
    ]
  },
  {
    id: 'urbano-avaliador-pro',
    name: 'Avaliador Pro (Captação)',
    description: 'Focado em captar proprietários interessados em vender ou alugar.',
    thumbnail: landingImage.broker,
    category: 'Captação',
    group: 'Imobiliária',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#047857',
      secondaryColor: '#10b981',
      backgroundColor: '#f0fdf4',
      textColor: '#064e3b',
    },
    blocks: [
      templateBlock(BlockType.HERO_WITH_FORM, 0, {
        title: 'Descubra o Valor Real do Seu Imóvel',
        subtitle: 'Avaliação gratuita e sem compromisso feita por especialistas da sua região.',
        backgroundImage: landingImage.house,
        overlayOpacity: 0.6,
        formTitle: 'Solicite uma Avaliação',
        submitText: 'Quero Avaliar Meu Imóvel',
        fields: [
          { name: 'name', type: 'text', label: 'Nome', required: true },
          { name: 'phone', type: 'tel', label: 'WhatsApp', required: true },
          { name: 'address', type: 'text', label: 'Endereço do Imóvel', required: true }
        ],
        height: 600,
        textColor: '#ffffff',
        showBadges: false
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.TIMELINE, 1, {
        title: 'Como funciona nossa venda',
        items: [
          { title: 'Avaliação Precisa', description: 'Analisamos o mercado local para o preço certo.' },
          { title: 'Fotos Profissionais', description: 'Seu imóvel com a melhor apresentação.' },
          { title: 'Marketing Direcionado', description: 'Anúncios para quem realmente quer comprar.' },
          { title: 'Fechamento Seguro', description: 'Assessoria jurídica completa até a entrega das chaves.' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.STATS, 2, {
        animated: true,
        columns: 3,
        stats: [
          { label: 'Imóveis Vendidos', value: '500+', icon: '🔑' },
          { label: 'Dias Média Venda', value: '45', icon: '⏱️' },
          { label: 'Clientes Satisfeitos', value: '100%', icon: '⭐' }
        ]
      }, { padding: '60px 20px', backgroundColor: '#047857' }),
      templateBlock(BlockType.FOOTER, 3, {}, { padding: '40px 20px', backgroundColor: '#022c22' }, 'full')
    ]
  }
];
