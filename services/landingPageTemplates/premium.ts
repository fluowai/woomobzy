import { BlockType } from '../../types/landingPage';
import {
  LandingPageTemplate,
  templateBlock,
  defaultPremiumTheme,
  landingImage,
} from './shared';

export const PREMIUM_LANDING_PAGE_TEMPLATES: LandingPageTemplate[] = [
  {
    id: 'luxo-mansion-boutique',
    name: 'Mansion Boutique',
    description:
      'Minimalista e focado em apresentar poucas, porém excelentes propriedades (Preto e Dourado).',
    thumbnail: landingImage.mansion,
    category: 'Alto Padrão',
    group: 'Imobiliária',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#000000',
      secondaryColor: '#d4af37',
      backgroundColor: '#111111',
      textColor: '#ffffff',
      fontFamily: 'Playfair Display',
    },
    blocks: [
      templateBlock(
        BlockType.HERO,
        0,
        {
          title: 'Coleção Exclusiva de Mansões',
          subtitle: 'Para aqueles que exigem o extraordinário.',
          backgroundImage: landingImage.mansion,
          overlayOpacity: 0.7,
          ctaText: 'Descobrir Coleção',
          ctaLink: '#imoveis',
          height: 800,
          alignment: 'center',
          textColor: '#ffffff',
        },
        { padding: '0px' },
        'full'
      ),
      templateBlock(
        BlockType.PROPERTY_CAROUSEL,
        1,
        {
          autoplay: true,
          interval: 4000,
          showArrows: true,
          showDots: false,
          itemsPerView: 1,
        },
        { padding: '80px 20px', backgroundColor: '#000000' }
      ),
      templateBlock(
        BlockType.TEXT,
        2,
        {
          content:
            '<h2 style="color:#d4af37;text-align:center">Discrição e Exclusividade</h2><p style="text-align:center;font-size:18px">Nossos corretores atuam com absoluto sigilo para garantir a privacidade de nossos clientes.</p>',
          fontSize: 16,
          fontWeight: 400,
          color: '#ffffff',
          alignment: 'center',
        },
        { padding: '80px 20px', backgroundColor: '#111111' }
      ),
      templateBlock(
        BlockType.FORM,
        3,
        {
          title: 'Atendimento Privado',
          fields: [
            { name: 'name', type: 'text', label: 'Nome', required: true },
            { name: 'email', type: 'email', label: 'E-mail', required: true },
            { name: 'phone', type: 'tel', label: 'Telefone', required: true },
          ],
          submitText: 'Solicitar Contato',
          successMessage: 'Entraremos em contato em breve com total discrição.',
        },
        { padding: '80px 20px', backgroundColor: '#000000' }
      ),
      templateBlock(
        BlockType.FOOTER,
        4,
        {},
        { padding: '60px 20px', backgroundColor: '#111111' },
        'full'
      ),
    ],
  },
  {
    id: 'luxo-minimalist-black',
    name: 'Minimalist Black',
    description:
      'Design 100% Preto e Branco. Foco extremo na tipografia e nos espaços em branco.',
    thumbnail: landingImage.luxuryApt,
    category: 'Alto Padrão',
    group: 'Imobiliária',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      fontFamily: 'Inter',
    },
    blocks: [
      templateBlock(
        BlockType.HERO,
        0,
        {
          title: 'Arquitetura. Design. Vida.',
          subtitle:
            'A seleção mais curada de imóveis contemporâneos da cidade.',
          backgroundImage: landingImage.interior,
          overlayOpacity: 0.1,
          ctaText: 'Ver Portfólio',
          ctaLink: '#imoveis',
          height: 700,
          alignment: 'left',
          textColor: '#000000',
        },
        { padding: '0px' },
        'full'
      ),
      templateBlock(BlockType.SPACER, 1, { height: 80 }, { padding: '0px' }),
      templateBlock(
        BlockType.PROPERTY_GRID,
        2,
        {
          columns: 2,
          gap: 60,
          showFilters: false,
          maxItems: 4,
          sortBy: 'date',
          cardStyle: 'minimal',
        },
        { padding: '20px', backgroundColor: '#ffffff' }
      ),
      templateBlock(BlockType.SPACER, 3, { height: 80 }, { padding: '0px' }),
      templateBlock(
        BlockType.FOOTER,
        4,
        {},
        { padding: '60px 20px', backgroundColor: '#000000' },
        'full'
      ),
    ],
  },
  {
    id: 'luxo-coastal-luxury',
    name: 'Coastal Luxury',
    description:
      'Focado em imóveis de alto padrão no litoral. Cores bege (areia) e azul marinho.',
    thumbnail: landingImage.mansion,
    category: 'Litoral Alto Padrão',
    group: 'Imobiliária',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#0f172a',
      secondaryColor: '#0ea5e9',
      backgroundColor: '#fdfbf7',
      textColor: '#1e293b',
    },
    blocks: [
      templateBlock(
        BlockType.HERO,
        0,
        {
          title: 'Viver de Frente Para o Mar',
          subtitle: 'As melhores coberturas e mansões pé na areia.',
          backgroundImage:
            'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=1920&auto=format&fit=crop',
          overlayOpacity: 0.3,
          ctaText: 'Ver Imóveis no Litoral',
          ctaLink: '#imoveis',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff',
        },
        { padding: '0px' },
        'full'
      ),
      templateBlock(
        BlockType.FEATURES,
        1,
        {
          columns: 3,
          layout: 'grid',
          features: [
            {
              title: 'Pé na Areia',
              description: 'Acesso direto e exclusivo à praia.',
              icon: '🌊',
            },
            {
              title: 'Vista Definitiva',
              description: 'Acorde todos os dias olhando o oceano.',
              icon: '🌅',
            },
            {
              title: 'Clubes Exclusivos',
              description: 'Condomínios com infraestrutura de resort.',
              icon: '🍹',
            },
          ],
        },
        { padding: '80px 20px', backgroundColor: '#fdfbf7' }
      ),
      templateBlock(
        BlockType.PROPERTY_GRID,
        2,
        {
          columns: 3,
          gap: 24,
          showFilters: true,
          maxItems: 6,
          sortBy: 'price',
          cardStyle: 'modern',
        },
        { padding: '80px 20px', backgroundColor: '#ffffff' }
      ),
      templateBlock(
        BlockType.FOOTER,
        3,
        {},
        { padding: '40px 20px', backgroundColor: '#0f172a' },
        'full'
      ),
    ],
  },
  {
    id: 'luxo-private-collection',
    name: 'Private Collection',
    description:
      'Imóveis Off-Market que exigem qualificação prévia (cadastro gigante no topo).',
    thumbnail: landingImage.luxuryApt,
    category: 'Off-Market Alto Padrão',
    group: 'Imobiliária',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#18181b',
      secondaryColor: '#a1a1aa',
      backgroundColor: '#09090b',
      textColor: '#fafafa',
    },
    blocks: [
      templateBlock(
        BlockType.HERO_WITH_FORM,
        0,
        {
          title: 'Oportunidades Off-Market',
          subtitle:
            'Propriedades superexclusivas que não estão listadas publicamente.',
          backgroundImage: landingImage.mansion,
          overlayOpacity: 0.8,
          formTitle: 'Acesso ao Portfólio Privado',
          submitText: 'Solicitar Acesso Restrito',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'Nome / Empresa',
              required: true,
            },
            { name: 'email', type: 'email', label: 'E-mail', required: true },
            { name: 'phone', type: 'tel', label: 'Telefone', required: true },
          ],
          height: 700,
          textColor: '#ffffff',
          showBadges: false,
        },
        { padding: '0px' },
        'full'
      ),
      templateBlock(
        BlockType.TEXT,
        1,
        {
          content:
            '<h2 style="text-align:center">Discrição e Exclusividade</h2><p style="text-align:center">Nós entendemos o valor da privacidade. Solicite o acesso e um de nossos Private Brokers entrará em contato.</p>',
          fontSize: 16,
          fontWeight: 400,
          color: '#fafafa',
          alignment: 'center',
        },
        { padding: '80px 20px', backgroundColor: '#09090b' }
      ),
      templateBlock(
        BlockType.FOOTER,
        2,
        {},
        { padding: '40px 20px', backgroundColor: '#000000' },
        'full'
      ),
    ],
  },
  {
    id: 'luxo-signature-architect',
    name: 'Signature Architect',
    description:
      'Foco em imóveis com assinatura arquitetônica, com muitos espaços de texto e foto (storytelling).',
    thumbnail: landingImage.house,
    category: 'Imóveis Assinados',
    group: 'Imobiliária',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#27272a',
      secondaryColor: '#facc15',
      backgroundColor: '#fafafa',
      textColor: '#27272a',
    },
    blocks: [
      templateBlock(
        BlockType.HERO,
        0,
        {
          title: 'Imóveis com Assinatura',
          subtitle:
            'Casas e apartamentos projetados pelos maiores nomes da arquitetura brasileira.',
          backgroundImage: landingImage.interior,
          overlayOpacity: 0.5,
          ctaText: 'Conhecer as Obras',
          ctaLink: '#imoveis',
          height: 700,
          alignment: 'left',
          textColor: '#ffffff',
        },
        { padding: '0px' },
        'full'
      ),
      templateBlock(
        BlockType.GALLERY,
        1,
        {
          columns: 2,
          gap: 0,
          lightbox: true,
          images: [
            { src: landingImage.house, alt: 'Fachada' },
            { src: landingImage.interior, alt: 'Interior' },
          ],
        },
        { padding: '0px' },
        'full'
      ),
      templateBlock(
        BlockType.PROPERTY_GRID,
        2,
        {
          columns: 2,
          gap: 40,
          showFilters: false,
          maxItems: 4,
          sortBy: 'date',
          cardStyle: 'minimal',
        },
        { padding: '80px 20px', backgroundColor: '#fafafa' }
      ),
      templateBlock(
        BlockType.BROKER_CARD,
        3,
        {
          name: 'Curadoria de Arquitetura',
          photoUrl: landingImage.broker,
          creci: 'Especialista em Design',
          specialty: 'Atendimento Consultivo',
          phone: '(00) 00000-0000',
          email: 'arquitetura@imobzy.com.br',
          description:
            'Temos acesso às propriedades mais cobiçadas das revistas de design.',
        },
        { padding: '80px 20px', backgroundColor: '#ffffff' }
      ),
      templateBlock(
        BlockType.FOOTER,
        4,
        {},
        { padding: '40px 20px', backgroundColor: '#18181b' },
        'full'
      ),
    ],
  },
];
