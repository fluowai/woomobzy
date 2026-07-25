import { BlockType } from '../../types/landingPage';
import { LandingPageTemplate, templateBlock, defaultPremiumTheme, landingImage } from './shared';

export const INCORPORADORA_TEMPLATES: LandingPageTemplate[] = [
  {
    id: 'incorp-o-loteamento',
    name: 'O Loteamento',
    description: 'Foco em loteamentos e condomínios horizontais (Vídeo, Mapa, Plantas, CTA de Vendas).',
    thumbnail: landingImage.lots,
    category: 'Loteamento',
    group: 'Lançamentos',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#047857',
      secondaryColor: '#f59e0b',
      backgroundColor: '#f0fdf4',
      textColor: '#064e3b',
    },
    blocks: [
      templateBlock(BlockType.HERO_WITH_FORM, 0, {
        title: 'Seu Lote no Melhor Ponto da Cidade',
        subtitle: 'Loteamento aberto com infraestrutura completa. Cadastre-se e ganhe condições especiais de pré-lançamento.',
        backgroundImage: landingImage.lots,
        overlayOpacity: 0.6,
        formTitle: 'Garantir Meu Lote',
        submitText: 'Quero Tabela e Condições',
        fields: [
          { name: 'name', type: 'text', label: 'Nome', required: true },
          { name: 'phone', type: 'tel', label: 'WhatsApp', required: true }
        ],
        height: 600,
        textColor: '#ffffff',
        showBadges: true,
        badges: [
          { icon: 'map-pin', title: 'Excelente Localização', description: 'Perto do centro' },
          { icon: 'check-circle', title: 'Infraestrutura Pronta', description: 'Água, luz e asfalto' }
        ]
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.MAP, 1, {
        latitude: -23.5505,
        longitude: -46.6333,
        zoom: 15,
        markers: [{ lat: -23.5505, lng: -46.6333, title: 'Local do Loteamento' }]
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.FEATURES, 2, {
        columns: 4,
        layout: 'grid',
        features: [
          { title: 'Asfalto', description: '100% asfaltado.', icon: '🛣️' },
          { title: 'Água e Esgoto', description: 'Rede completa.', icon: '💧' },
          { title: 'Energia', description: 'Iluminação em LED.', icon: '⚡' },
          { title: 'Lazer', description: 'Praças equipadas.', icon: '🌳' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.TIMELINE, 3, {
        title: 'Andamento das Obras',
        items: [
          { title: 'Terraplanagem', description: '100% Concluído', time: 'Jan/2025' },
          { title: 'Asfalto e Guias', description: 'Em andamento (80%)', time: 'Mar/2025' },
          { title: 'Liberação para Construir', description: 'Previsão de entrega', time: 'Jul/2025' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#f0fdf4' }),
      templateBlock(BlockType.FOOTER, 4, {}, { padding: '40px 20px', backgroundColor: '#022c22' }, 'full')
    ]
  },
  {
    id: 'incorp-master',
    name: 'Incorporadora Master (Institucional)',
    description: 'Apresentação da Incorporadora, VGV, histórico de prédios entregues.',
    thumbnail: landingImage.launch,
    category: 'Institucional',
    group: 'Lançamentos',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#1e3a8a',
      secondaryColor: '#3b82f6',
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
    },
    blocks: [
      templateBlock(BlockType.HERO, 0, {
        title: 'Construindo Histórias, Entregando Qualidade',
        subtitle: 'Conheça o portfólio da incorporadora líder na região.',
        backgroundImage: landingImage.launch,
        overlayOpacity: 0.7,
        ctaText: 'Ver Nossos Empreendimentos',
        ctaLink: '#imoveis',
        height: 600,
        alignment: 'center',
        textColor: '#ffffff'
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.STATS, 1, {
        animated: true,
        columns: 4,
        stats: [
          { label: 'Obras Entregues', value: '45+', icon: '🏗️' },
          { label: 'Anos de Mercado', value: '20', icon: '📅' },
          { label: 'Unidades Vendidas', value: '5.000', icon: '🔑' },
          { label: 'VGV Entregue', value: 'R$ 2 Bi', icon: '💰' }
        ]
      }, { padding: '60px 20px', backgroundColor: '#1e3a8a', textColor: '#ffffff' }),
      templateBlock(BlockType.PROPERTY_GRID, 2, {
        columns: 3,
        gap: 24,
        showFilters: true,
        maxItems: 6,
        sortBy: 'date',
        cardStyle: 'modern'
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.FOOTER, 3, {}, { padding: '40px 20px', backgroundColor: '#0f172a' }, 'full')
    ]
  },
  {
    id: 'incorp-lancamento-vertical',
    name: 'Lançamento Vertical (Prédio)',
    description: 'Focado em vender apartamentos na planta. Formulário agressivo no topo, carrosel de plantas.',
    thumbnail: landingImage.luxuryApt,
    category: 'Apartamento na Planta',
    group: 'Lançamentos',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#0f172a',
      secondaryColor: '#2563eb',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
    },
    blocks: [
      templateBlock(BlockType.HERO_WITH_FORM, 0, {
        title: 'Seu Novo Apartamento no Centro',
        subtitle: 'Plantas de 2 e 3 dormitórios com sacada gourmet. Reserve no pré-lançamento.',
        backgroundImage: landingImage.luxuryApt,
        overlayOpacity: 0.6,
        formTitle: 'Baixar Apresentação',
        submitText: 'Baixar PDF e Plantas',
        fields: [
          { name: 'name', type: 'text', label: 'Nome', required: true },
          { name: 'phone', type: 'tel', label: 'WhatsApp', required: true },
          { name: 'email', type: 'email', label: 'E-mail', required: true }
        ],
        height: 700,
        textColor: '#ffffff',
        showBadges: false
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.FEATURES, 1, {
        columns: 3,
        layout: 'grid',
        features: [
          { title: 'Lazer Completo', description: 'Piscina, Academia, Salão de Festas.', icon: '🏊' },
          { title: 'Segurança', description: 'Portaria 24h blindada.', icon: '🛡️' },
          { title: 'Localização', description: 'Próximo a supermercados e escolas.', icon: '📍' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#f8fafc' }),
      templateBlock(BlockType.GALLERY, 2, {
        columns: 4,
        gap: 12,
        lightbox: true,
        images: [
          { src: landingImage.interior, alt: 'Living' },
          { src: landingImage.luxuryApt, alt: 'Fachada' },
          { src: landingImage.mansion, alt: 'Piscina' },
          { src: landingImage.interior, alt: 'Varanda Gourmet' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.FOOTER, 3, {}, { padding: '40px 20px', backgroundColor: '#0f172a' }, 'full')
    ]
  },
  {
    id: 'incorp-mcmv',
    name: 'Minha Casa Minha Vida (Popular)',
    description: 'Cores populares (Verde/Azul). Formulário de simulação CAIXA/FGTS logo no topo.',
    thumbnail: landingImage.family,
    category: 'Empreendimento Popular',
    group: 'Lançamentos',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#0ea5e9',
      secondaryColor: '#10b981',
      backgroundColor: '#f0f9ff',
      textColor: '#0f172a',
    },
    blocks: [
      templateBlock(BlockType.HERO_WITH_FORM, 0, {
        title: 'Saia do Aluguel Agora Mesmo!',
        subtitle: 'Apartamentos com subsídio do governo e uso do FGTS na entrada.',
        backgroundImage: landingImage.family,
        overlayOpacity: 0.6,
        formTitle: 'Simular Meu Financiamento',
        submitText: 'Fazer Simulação Grátis',
        fields: [
          { name: 'name', type: 'text', label: 'Nome', required: true },
          { name: 'phone', type: 'tel', label: 'WhatsApp', required: true },
          { name: 'income', type: 'text', label: 'Renda Familiar Bruta', required: true }
        ],
        height: 600,
        textColor: '#ffffff',
        showBadges: true,
        badges: [
          { icon: 'home', title: 'Programa Governo', description: 'Faixas 1, 2 e 3' },
          { icon: 'dollar-sign', title: 'Entrada Facilitada', description: 'Parcele em até 48x' }
        ]
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.TIMELINE, 1, {
        title: 'Como Comprar',
        items: [
          { title: 'Simulação', description: 'Descubra o valor do seu subsídio e parcelas.' },
          { title: 'Documentação', description: 'Envie RG, CPF, Comprovante de Renda e Endereço.' },
          { title: 'Aprovação Caixa', description: 'Avaliamos seu crédito rapidinho.' },
          { title: 'Assinatura', description: 'Você assina o contrato e garante seu apê!' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.FOOTER, 2, {}, { padding: '40px 20px', backgroundColor: '#0ea5e9' }, 'full')
    ]
  },
  {
    id: 'incorp-condominio-fechado',
    name: 'Condomínio Fechado',
    description: 'Foco no clube do condomínio, mapa de localização e terrenos (lotes de alto padrão).',
    thumbnail: landingImage.lots,
    category: 'Lotes Premium',
    group: 'Lançamentos',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#3f2c20',
      secondaryColor: '#d97706',
      backgroundColor: '#fdf8f5',
      textColor: '#291d15',
    },
    blocks: [
      templateBlock(BlockType.HERO, 0, {
        title: 'Condomínio Clube Resort',
        subtitle: 'Lotes a partir de 400m² em um verdadeiro resort.',
        backgroundImage: landingImage.lots,
        overlayOpacity: 0.5,
        ctaText: 'Agendar Visita ao Decorado',
        ctaLink: '#contato',
        height: 600,
        alignment: 'center',
        textColor: '#ffffff'
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.GALLERY, 1, {
        columns: 3,
        gap: 16,
        lightbox: true,
        images: [
          { src: landingImage.lots, alt: 'Pórtico' },
          { src: landingImage.mansion, alt: 'Clube' },
          { src: landingImage.interior, alt: 'Salão de Festas' }
        ]
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.MAP, 2, {
        latitude: -23.5505,
        longitude: -46.6333,
        zoom: 14,
        markers: [{ lat: -23.5505, lng: -46.6333, title: 'Condomínio' }]
      }, { padding: '0px' }, 'full'),
      templateBlock(BlockType.FORM, 3, {
        title: 'Venha conhecer',
        fields: [
          { name: 'name', type: 'text', label: 'Nome', required: true },
          { name: 'phone', type: 'tel', label: 'WhatsApp', required: true }
        ],
        submitText: 'Agendar',
        successMessage: 'Entraremos em contato!'
      }, { padding: '80px 20px', backgroundColor: '#fdf8f5' }),
      templateBlock(BlockType.FOOTER, 4, {}, { padding: '40px 20px', backgroundColor: '#291d15' }, 'full')
    ]
  }
];
