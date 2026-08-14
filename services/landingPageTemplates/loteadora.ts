import { BlockType } from '../../types/landingPage';
import {
  LandingPageTemplate,
  templateBlock,
  defaultPremiumTheme,
  landingImage,
} from './shared';

export const LOTEADORA_TEMPLATES: LandingPageTemplate[] = [
  {
    id: 'loteadora-masterplan-vision',
    name: 'Masterplan Vision',
    description:
      'Foco em lançamentos de loteamentos abertos com mapa interativo e captura de leads.',
    thumbnail: landingImage.lots,
    category: 'Lançamento de Loteamento',
    group: 'Loteadora',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#1d4ed8', // Azul Corporativo
      secondaryColor: '#15803d', // Verde Grama
      backgroundColor: '#f1f5f9', // Cinza Claro
      textColor: '#1e293b',
      fontFamily: 'Montserrat, sans-serif',
    },
    blocks: [
      templateBlock(
        BlockType.HERO_WITH_FORM,
        0,
        {
          title: 'O Futuro Começa Aqui',
          subtitle:
            'Lotes a partir de 250m² em localização estratégica. Cadastre-se e garanta condições de pré-lançamento.',
          backgroundImage: landingImage.lots,
          overlayOpacity: 0.7,
          formTitle: 'Reserve o Seu Lote',
          submitText: 'Garantir Condição',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'Nome Completo',
              required: true,
            },
            { name: 'phone', type: 'tel', label: 'WhatsApp', required: true },
            { name: 'email', type: 'email', label: 'E-mail', required: true },
          ],
          height: 700,
          textColor: '#ffffff',
          showBadges: true,
          badges: [
            {
              icon: 'map',
              title: 'Excelente Topografia',
              description: 'Lotes Planos',
            },
            {
              icon: 'trending-up',
              title: 'Alta Valorização',
              description: 'Vetor de Crescimento',
            },
          ],
        },
        { padding: '0px' },
        'full'
      ),
      templateBlock(
        BlockType.MAP,
        1,
        {
          latitude: -23.5505,
          longitude: -46.6333,
          zoom: 15,
          markers: [
            { lat: -23.5505, lng: -46.6333, title: 'Local do Empreendimento' },
          ],
        },
        { padding: '0px' },
        'full'
      ),
      templateBlock(
        BlockType.FEATURES,
        2,
        {
          columns: 3,
          layout: 'grid',
          features: [
            {
              title: 'Asfalto e Meio-Fio',
              description: 'Infraestrutura 100% pronta.',
              icon: '🛣️',
            },
            {
              title: 'Água e Esgoto',
              description: 'Rede completa.',
              icon: '💧',
            },
            {
              title: 'Energia',
              description: 'Iluminação pública em LED.',
              icon: '⚡',
            },
          ],
        },
        { padding: '80px 20px', backgroundColor: '#ffffff' }
      ),
      templateBlock(
        BlockType.FOOTER,
        3,
        {},
        { padding: '40px 20px', backgroundColor: '#1e3a8a' },
        'full'
      ),
    ],
  },
  {
    id: 'loteadora-naturale-viver',
    name: 'Naturale Viver',
    description:
      'Condomínio Fechado Sustentável focado na natureza e bem-estar.',
    thumbnail: landingImage.family,
    category: 'Condomínio Fechado',
    group: 'Loteadora',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#166534', // Tons terrosos/verde
      secondaryColor: '#854d0e',
      backgroundColor: '#fdfcf8',
      textColor: '#1c1917',
      fontFamily: 'Montserrat, sans-serif',
    },
    blocks: [
      templateBlock(
        BlockType.HERO,
        0,
        {
          title: 'Viva em Harmonia com a Natureza',
          subtitle:
            'Lotes em condomínio fechado cercado por área verde preservada.',
          backgroundImage: landingImage.family,
          overlayOpacity: 0.5,
          ctaText: 'Falar com Consultor',
          ctaLink: '#',
          height: 650,
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
          columns: 3,
          gap: 16,
          lightbox: true,
          images: [
            { src: landingImage.farm, alt: 'Trilha Ecológica' },
            { src: landingImage.mansion, alt: 'Clube' },
            { src: landingImage.lots, alt: 'Lotes' },
          ],
        },
        { padding: '80px 20px', backgroundColor: '#ffffff' }
      ),
      templateBlock(
        BlockType.TIMELINE,
        2,
        {
          title: 'Estágio das Obras',
          items: [
            {
              title: 'Terraplanagem',
              description: '100% Concluído',
              time: 'Pronto',
            },
            {
              title: 'Rede Elétrica e Água',
              description: 'Em andamento (90%)',
              time: 'Próximo mês',
            },
            {
              title: 'Área de Lazer',
              description: 'Iniciando fundação',
              time: 'Em 3 meses',
            },
            {
              title: 'Entrega',
              description: 'Liberação para construir',
              time: 'Em 6 meses',
            },
          ],
        },
        { padding: '80px 20px', backgroundColor: '#f0fdf4' }
      ),
      templateBlock(
        BlockType.CTA,
        3,
        {
          title: 'Gostou do projeto?',
          description:
            'Agende uma visita ao local e conheça o condomínio de perto.',
          buttonText: 'Agendar Visita (WhatsApp)',
          buttonLink: '#',
          backgroundColor: '#166534',
          textColor: '#ffffff',
        },
        { padding: '80px 20px' }
      ),
      templateBlock(
        BlockType.FOOTER,
        4,
        {},
        { padding: '40px 20px', backgroundColor: '#14532d' },
        'full'
      ),
    ],
  },
  {
    id: 'loteadora-urban-connect',
    name: 'Urban Connect',
    description:
      'Lotes Comerciais e Mistos com alto fluxo e potencial construtivo.',
    thumbnail: landingImage.warehouse,
    category: 'Lotes Comerciais',
    group: 'Loteadora',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#334155', // Azul Aço/Cinza
      secondaryColor: '#eab308', // Amarelo
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      fontFamily: 'Montserrat, sans-serif',
    },
    blocks: [
      templateBlock(
        BlockType.HERO_WITH_FORM,
        0,
        {
          title: 'O Novo Centro de Negócios',
          subtitle:
            'Lotes comerciais em avenida de alto fluxo. Traga sua empresa.',
          backgroundImage: landingImage.warehouse,
          overlayOpacity: 0.8,
          formTitle: 'Falar com Plantão de Vendas',
          submitText: 'Agendar Reunião',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'Empresa / Nome',
              required: true,
            },
            { name: 'phone', type: 'tel', label: 'Telefone', required: true },
          ],
          height: 600,
          textColor: '#ffffff',
          showBadges: true,
          badges: [
            {
              icon: 'trending-up',
              title: 'Alto Tráfego',
              description: 'Avenida Principal',
            },
          ],
        },
        { padding: '0px' },
        'full'
      ),
      templateBlock(
        BlockType.STATS,
        1,
        {
          animated: true,
          columns: 3,
          stats: [
            { label: 'Veículos/dia', value: '15.000+', icon: '🚗' },
            { label: 'Lotes Restantes', value: '12', icon: '📍' },
            { label: 'Valorização', value: '45%', icon: '📈' },
          ],
        },
        {
          padding: '60px 20px',
          backgroundColor: '#334155',
          textColor: '#ffffff',
        }
      ),
      templateBlock(
        BlockType.FOOTER,
        2,
        {},
        { padding: '40px 20px', backgroundColor: '#0f172a' },
        'full'
      ),
    ],
  },
  {
    id: 'loteadora-exclusive-resort',
    name: 'Exclusive Resort',
    description:
      'Lotes de alto padrão em condomínio resort (foco em lago, piscina, luxo).',
    thumbnail: landingImage.mansion,
    category: 'Condomínio Alto Padrão',
    group: 'Loteadora',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#0891b2', // Turquesa
      secondaryColor: '#0e7490',
      backgroundColor: '#ffffff',
      textColor: '#164e63',
      fontFamily: 'Montserrat, sans-serif',
    },
    blocks: [
      templateBlock(
        BlockType.HERO,
        0,
        {
          title: 'O Melhor Resort é a Sua Casa',
          subtitle: 'Últimos lotes premium de frente para o lago.',
          backgroundImage: landingImage.mansion,
          overlayOpacity: 0.4,
          ctaText: 'Solicitar Apresentação VIP',
          ctaLink: '#',
          height: 700,
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
          columns: 4,
          layout: 'grid',
          features: [
            {
              title: 'Praia Exclusiva',
              description: 'Faixa de areia privativa.',
              icon: '🏖️',
            },
            {
              title: 'Clube Náutico',
              description: 'Marina para embarcações.',
              icon: '⛵',
            },
            {
              title: 'Spa & Wellness',
              description: 'Saunas e massagem.',
              icon: '🧘',
            },
            {
              title: 'Quadras de Tênis',
              description: 'Esporte e lazer.',
              icon: '🎾',
            },
          ],
        },
        { padding: '80px 20px', backgroundColor: '#ecfeff' }
      ),
      templateBlock(
        BlockType.FOOTER,
        2,
        {},
        { padding: '40px 20px', backgroundColor: '#164e63' },
        'full'
      ),
    ],
  },
  {
    id: 'loteadora-primeiro-bairro',
    name: 'Primeiro Bairro',
    description:
      'Loteamento de bairro planejado com foco em financiamento facilitado (popular).',
    thumbnail: landingImage.lots,
    category: 'Bairro Planejado',
    group: 'Loteadora',
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: '#ea580c', // Laranja
      secondaryColor: '#0284c7', // Azul Celeste
      backgroundColor: '#fff7ed',
      textColor: '#1e293b',
      fontFamily: 'Montserrat, sans-serif',
    },
    blocks: [
      templateBlock(
        BlockType.HERO_WITH_FORM,
        0,
        {
          title: 'Seu Lote Com Parcelas Que Cabem No Bolso',
          subtitle:
            'Bairro planejado com infraestrutura completa e financiamento direto sem burocracia.',
          backgroundImage: landingImage.lots,
          overlayOpacity: 0.6,
          formTitle: 'Simular Parcelas',
          submitText: 'Fazer Simulação',
          fields: [
            { name: 'name', type: 'text', label: 'Nome', required: true },
            { name: 'phone', type: 'tel', label: 'WhatsApp', required: true },
            {
              name: 'parcela',
              type: 'text',
              label: 'Parcela ideal (R$)',
              required: false,
            },
          ],
          height: 650,
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
            '<h2>Tudo Perto de Você</h2><p>Nosso bairro planejado conta com áreas destinadas a escolas, supermercados e posto de saúde. Você não vai precisar sair do bairro para resolver a sua vida.</p>',
          alignment: 'center',
          fontSize: 18,
          fontWeight: 400,
          color: '#1e293b',
        },
        { padding: '60px 20px', backgroundColor: '#ffffff' }
      ),
      templateBlock(
        BlockType.FOOTER,
        2,
        {},
        { padding: '40px 20px', backgroundColor: '#9a3412' },
        'full'
      ),
    ],
  },
];
