// ============================================
// LANDING PAGE BUILDER - TYPES
// ============================================

import {
  Property,
  PropertyType,
  PropertyPurpose,
  PropertyStatus,
} from '../types';

// ============================================
// ENUMS
// ============================================

export enum LandingPageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum BlockType {
  // Structure
  HEADER = 'header',
  FOOTER = 'footer',

  // Hero & Headers
  HERO = 'hero',
  HERO_WITH_FORM = 'hero_with_form',

  // Property Blocks
  PROPERTY_GRID = 'property_grid',
  PROPERTY_CAROUSEL = 'property_carousel',
  PROPERTY_FEATURED = 'property_featured',
  PROPERTY_SEARCH = 'property_search',

  // Content Blocks
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  GALLERY = 'gallery',

  // Interactive Blocks
  FORM = 'form',
  CTA = 'cta',
  TESTIMONIALS = 'testimonials',
  STATS = 'stats',
  MAP = 'map',
  TIMELINE = 'timeline',

  // Info Blocks
  BROKER_CARD = 'broker_card',
  FEATURES = 'features',

  // Layout Blocks
  SPACER = 'spacer',
  DIVIDER = 'divider',

  // Advanced
  CUSTOM_HTML = 'custom_html',
}

export enum PropertySelectionMode {
  MANUAL = 'manual',
  FILTER = 'filter',
  ALL = 'all',
}

// ============================================
// INTERFACES - Property Selection
// ============================================

export interface PropertyFilters {
  type?: PropertyType[];
  purpose?: PropertyPurpose[];
  minPrice?: number;
  maxPrice?: number;
  city?: string[];
  state?: string[];
  minArea?: number;
  maxArea?: number;
  status?: PropertyStatus[];
  highlighted?: boolean;
}

export interface PropertySelectionConfig {
  mode: PropertySelectionMode;
  propertyIds?: string[];
  filters?: PropertyFilters;
  sortBy?: 'price' | 'area' | 'date' | 'random';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

// ============================================
// INTERFACES - Block Configuration
// ============================================

export interface SpacingConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BackgroundConfig {
  type: 'color' | 'gradient' | 'image';
  value: string;
  overlay?: string;
  opacity?: number;
}

export interface BorderConfig {
  width: number;
  style: 'solid' | 'dashed' | 'dotted' | 'none';
  color: string;
  radius: number;
}

export interface BlockStyles {
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  textColor?: string;
  borderRadius?: string;
  boxShadow?: string;
  width?: string;
  height?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

export interface ResponsiveStyles {
  mobile?: Partial<BlockStyles>;
  tablet?: Partial<BlockStyles>;
  desktop?: Partial<BlockStyles>;
}

// ============================================
// BLOCK CONFIGS - Specific Types
// ============================================

export interface HeroWithFormBlockConfig {
  title: string;
  subtitle?: string;
  backgroundImage: string;
  overlayOpacity: number;
  formTitle: string;
  formSubtitle?: string;
  submitText: string;
  fields: FormField[];
  height: number;
  textColor: string;
  guideImageUrl?: string;
  showBadges: boolean;
  badges?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export interface HeroBlockConfig {
  title: string;
  subtitle?: string;
  backgroundImage: string;
  overlayOpacity: number;
  ctaText?: string;
  ctaLink?: string;
  height: number;
  alignment: 'left' | 'center' | 'right';
  textColor: string;
}

export interface TextBlockConfig {
  content: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  alignment: 'left' | 'center' | 'right' | 'justify';
}

export interface ImageBlockConfig {
  src: string;
  alt: string;
  width: string;
  height: string;
  objectFit: 'cover' | 'contain' | 'fill' | 'none';
  link?: string;
}

export interface VideoBlockConfig {
  url: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  controls: boolean;
}

export interface PropertyGridBlockConfig {
  columns: number;
  gap: number;
  showFilters: boolean;
  maxItems: number;
  sortBy: 'price' | 'date' | 'area';
  cardStyle: 'modern' | 'classic' | 'minimal';
}

export interface PropertyCarouselBlockConfig {
  autoplay: boolean;
  interval: number;
  showArrows: boolean;
  showDots: boolean;
  itemsPerView: number;
}

export interface PropertyFeaturedBlockConfig {
  propertyId?: string;
  layout: 'image-left' | 'image-right' | 'image-top';
  showGallery: boolean;
  ctaText: string;
}

export interface FormField {
  name: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormBlockConfig {
  title: string;
  fields: FormField[];
  submitText: string;
  successMessage: string;
}

export interface CTABlockConfig {
  title: string;
  description?: string;
  buttonText: string;
  buttonLink: string;
  backgroundColor: string;
  textColor: string;
}

export interface BrokerCardBlockConfig {
  name: string;
  photoUrl: string;
  creci: string;
  specialty: string;
  phone: string;
  email: string;
  instagram?: string;
  description?: string;
}

export interface TestimonialItem {
  name: string;
  photo?: string;
  rating: number;
  text: string;
  date?: string;
}

export interface TestimonialsBlockConfig {
  testimonials: TestimonialItem[];
  layout: 'carousel' | 'grid';
  showRating: boolean;
}

export interface StatItem {
  value: string;
  label: string;
  icon?: string;
}

export interface StatsBlockConfig {
  stats: StatItem[];
  columns: number;
  animated: boolean;
}

export interface MapBlockConfig {
  latitude: number;
  longitude: number;
  zoom: number;
  markers?: Array<{
    lat: number;
    lng: number;
    title: string;
  }>;
}

export interface GalleryBlockConfig {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  columns: number;
  gap: number;
  lightbox: boolean;
}

export interface SpacerBlockConfig {
  height: number;
}

export interface DividerBlockConfig {
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  thickness: number;
  width: string;
}

export interface CustomHTMLBlockConfig {
  html: string;
  css?: string;
  js?: string;
}

export interface Feature {
  title: string;
  description: string;
  icon?: string;
}

export interface FeaturesBlockConfig {
  features: Feature[];
  columns: number;
  layout?: 'grid' | 'list';
}

export interface TimelineItem {
  title: string;
  description: string;
  time?: string;
}

export interface TimelineBlockConfig {
  title?: string;
  items: TimelineItem[];
}

// Union type for all block configs
export type BlockConfig =
  | HeroWithFormBlockConfig
  | HeroBlockConfig
  | TextBlockConfig
  | ImageBlockConfig
  | VideoBlockConfig
  | PropertyGridBlockConfig
  | PropertyCarouselBlockConfig
  | PropertyFeaturedBlockConfig
  | FormBlockConfig
  | CTABlockConfig
  | BrokerCardBlockConfig
  | TestimonialsBlockConfig
  | StatsBlockConfig
  | MapBlockConfig
  | GalleryBlockConfig
  | FeaturesBlockConfig
  | TimelineBlockConfig
  | SpacerBlockConfig
  | DividerBlockConfig
  | CustomHTMLBlockConfig;

// ============================================
// INTERFACES - Block
// ============================================

export interface Block {
  id: string;
  type: BlockType;
  order: number;
  visible: boolean;
  config: BlockConfig;
  styles: BlockStyles;
  responsive?: ResponsiveStyles;
  containerWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// ============================================
// INTERFACES - Theme
// ============================================

export interface LandingPageTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  headingFontFamily?: string;
  fontSize: {
    base: string;
    heading1: string;
    heading2: string;
    heading3: string;
  };
  borderRadius: string;
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// ============================================
// INTERFACES - Form Config
// ============================================

export interface LandingPageFormConfig {
  enabled: boolean;
  fields: string[];
  submitText: string;
  successMessage: string;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  recipientEmail?: string;
  whatsappNumber?: string;
}

// ============================================
// INTERFACES - Settings
// ============================================

export interface LandingPageSettings {
  headerStyle: 'transparent' | 'solid' | 'minimal';
  footerStyle: 'minimal' | 'full' | 'none';
  showBranding: boolean;
}

// ============================================
// INTERFACES - Landing Page (Main)
// ============================================

export interface LandingPage {
  id: string;
  organizationId?: string;
  userId: string;

  // Identificação
  name: string;
  slug: string;
  title: string;
  description?: string;

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogImage?: string;

  // Visual
  templateId: string;
  themeConfig: LandingPageTheme;
  blocks: Block[];
  settings: LandingPageSettings;

  // Imóveis
  propertySelection: PropertySelectionConfig;

  // Formulário
  formConfig: LandingPageFormConfig;

  // Status
  status: LandingPageStatus;
  publishedAt?: string;
  viewsCount: number;
  leadsCount: number;

  // Custom Code
  customCss?: string;
  customJs?: string;
  customHead?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================
// INTERFACES - Saved Blocks
// ============================================

export interface SavedBlock {
  id: string;
  organizationId?: string;
  name: string;
  type: BlockType;
  config: BlockConfig;
  thumbnail?: string;
  isTemplate: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// INTERFACES - Analytics
// ============================================

export enum AnalyticsEventType {
  VIEW = 'view',
  CLICK = 'click',
  FORM_SUBMIT = 'form_submit',
  PROPERTY_VIEW = 'property_view',
  CTA_CLICK = 'cta_click',
  PHONE_CLICK = 'phone_click',
  EMAIL_CLICK = 'email_click',
  WHATSAPP_CLICK = 'whatsapp_click',
}

export interface LandingPageAnalyticsEvent {
  id: string;
  landingPageId: string;
  eventType: AnalyticsEventType;
  eventData?: Record<string, any>;

  // Visitor Info
  visitorId: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;

  // Geo
  country?: string;
  city?: string;

  createdAt: string;
}

export interface LandingPageAnalytics {
  totalViews: number;
  totalLeads: number;
  conversionRate: number;
  viewsByDate: Array<{ date: string; count: number }>;
  leadsByDate: Array<{ date: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  eventsByType: Array<{ type: string; count: number }>;
}

// ============================================
// INTERFACES - Templates
// ============================================

export interface LandingPageTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: 'property' | 'broker' | 'agency' | 'launch';
  blocks: Block[];
  themeConfig: LandingPageTheme;
  settings: LandingPageSettings;
}

// ============================================
// UTILITY TYPES
// ============================================

export type CreateLandingPageInput = Omit<
  LandingPage,
  'id' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'leadsCount'
>;
export type UpdateLandingPageInput = Partial<
  Omit<
    LandingPage,
    'id' | 'createdAt' | 'updatedAt' | 'organizationId' | 'userId'
  >
>;

// ============================================
// BLOCK METADATA
// ============================================

export interface BlockMetadata {
  type: BlockType;
  name: string;
  description: string;
  icon: string;
  category: 'content' | 'property' | 'interactive' | 'layout';
  defaultConfig: BlockConfig;
  defaultStyles: BlockStyles;
}

export const BLOCK_METADATA: Record<BlockType, BlockMetadata> = {
  [BlockType.HEADER]: {
    type: BlockType.HEADER,
    name: 'Cabeçalho',
    description: 'Logotipo e menu superior',
    icon: '🏢',
    category: 'layout',
    defaultConfig: {} as any,
    defaultStyles: {
      padding: '0px',
    },
  },
  [BlockType.FOOTER]: {
    type: BlockType.FOOTER,
    name: 'Rodapé',
    description: 'Informações finais e links',
    icon: '🔻',
    category: 'layout',
    defaultConfig: {} as any,
    defaultStyles: {
      padding: '40px 20px',
      backgroundColor: '#f9fafb',
    },
  },
  [BlockType.HERO]: {
    type: BlockType.HERO,
    name: 'Hero',
    description: 'Seção de destaque com imagem de fundo',
    icon: '🖼️',
    category: 'content',
    defaultConfig: {
      title: 'Título Principal',
      subtitle: 'Subtítulo descritivo',
      backgroundImage: '',
      overlayOpacity: 0.5,
      ctaText: 'Saiba Mais',
      ctaLink: '#',
      height: 600,
      alignment: 'center',
      textColor: '#ffffff',
    } as HeroBlockConfig,
    defaultStyles: {
      padding: '0px',
    },
  },

  [BlockType.HERO_WITH_FORM]: {
    type: BlockType.HERO_WITH_FORM,
    name: 'Hero com Formulário',
    description: 'Hero com formulário de captura lateral',
    icon: '🎯',
    category: 'content',
    defaultConfig: {
      title: 'Encontre sua Fazenda dos Sonhos',
      subtitle:
        'Assine para receber ofertas exclusivas e novidades sobre os melhores imóveis rurais.',
      backgroundImage: '',
      overlayOpacity: 0.3,
      formTitle: 'Receba novas oportunidades em imóveis rurais!',
      formSubtitle:
        'Cadastre-se para receber ofertas e novidades de imóveis rurais. Prometemos não enviar spam.',
      submitText: 'Quero Receber Ofertas Exclusivas',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Nome completo',
          required: true,
          placeholder: 'Nome completo',
        },
        {
          name: 'email',
          type: 'email',
          label: 'Seu e-mail',
          required: true,
          placeholder: 'Seu e-mail',
        },
        {
          name: 'phone',
          type: 'tel',
          label: 'Telefone (WhatsApp)',
          required: true,
          placeholder: 'Telefone (WhatsApp)',
        },
        {
          name: 'region',
          type: 'select',
          label: 'Região de Interesse',
          required: false,
          options: ['Norte', 'Sul', 'Centro-Oeste', 'Sudeste', 'Nordeste'],
        },
      ],
      height: 700,
      textColor: '#ffffff',
      showBadges: true,
      badges: [
        {
          icon: 'shield',
          title: 'Cadastro 100% seguro',
          description: 'Seus dados protegidos.',
        },
        {
          icon: 'star',
          title: 'Ofertas exclusivas',
          description: 'Receba propriedades selecionadas.',
        },
        {
          icon: 'clock',
          title: 'Primeiro a saber',
          description: 'Acesse novas oportunidades antes de todos.',
        },
      ],
    } as HeroWithFormBlockConfig,
    defaultStyles: {
      padding: '0px',
      textAlign: 'center',
    },
  },
  [BlockType.PROPERTY_GRID]: {
    type: BlockType.PROPERTY_GRID,
    name: 'Grade de Imóveis',
    description: 'Exibe imóveis em formato de grade',
    icon: '🏘️',
    category: 'property',
    defaultConfig: {
      columns: 3,
      gap: 24,
      showFilters: true,
      maxItems: 12,
      sortBy: 'price',
      cardStyle: 'modern',
    } as PropertyGridBlockConfig,
    defaultStyles: {
      padding: '60px 20px',
    },
  },
  [BlockType.FORM]: {
    type: BlockType.FORM,
    name: 'Formulário',
    description: 'Formulário de contato',
    icon: '📝',
    category: 'interactive',
    defaultConfig: {
      title: 'Entre em Contato',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Nome',
          required: true,
          placeholder: 'Seu nome',
        },
        {
          name: 'email',
          type: 'email',
          label: 'E-mail',
          required: true,
          placeholder: 'seu@email.com',
        },
        {
          name: 'phone',
          type: 'tel',
          label: 'Telefone',
          required: true,
          placeholder: '(00) 00000-0000',
        },
        {
          name: 'message',
          type: 'textarea',
          label: 'Mensagem',
          required: false,
          placeholder: 'Sua mensagem',
        },
      ],
      submitText: 'Enviar',
      successMessage: 'Mensagem enviada com sucesso!',
    } as FormBlockConfig,
    defaultStyles: {
      padding: '60px 20px',
      backgroundColor: '#f9fafb',
    },
  },
  [BlockType.CTA]: {
    type: BlockType.CTA,
    name: 'Call to Action',
    description: 'Chamada para ação',
    icon: '🎯',
    category: 'interactive',
    defaultConfig: {
      title: 'Pronto para começar?',
      description: 'Entre em contato conosco hoje mesmo',
      buttonText: 'Falar com Especialista',
      buttonLink: '#contato',
      backgroundColor: '#2563eb',
      textColor: '#ffffff',
    } as CTABlockConfig,
    defaultStyles: {
      padding: '80px 20px',
      textAlign: 'center',
    },
  },
  [BlockType.TEXT]: {
    type: BlockType.TEXT,
    name: 'Texto',
    description: 'Bloco de texto editável',
    icon: '📄',
    category: 'content',
    defaultConfig: {
      content: '<p>Adicione seu texto aqui...</p>',
      fontSize: 16,
      fontWeight: 400,
      color: '#111827',
      alignment: 'left',
    } as TextBlockConfig,
    defaultStyles: {
      padding: '40px 20px',
    },
  },
  [BlockType.IMAGE]: {
    type: BlockType.IMAGE,
    name: 'Imagem',
    description: 'Imagem única com redimensionamento',
    icon: '🖼️',
    category: 'content',
    defaultConfig: {
      src: '',
      alt: 'Imagem',
      width: '100%',
      height: 'auto',
      objectFit: 'cover',
    } as ImageBlockConfig,
    defaultStyles: {
      padding: '20px',
    },
  },
  [BlockType.VIDEO]: {
    type: BlockType.VIDEO,
    name: 'Vídeo',
    description: 'Embed de vídeo (YouTube/Vimeo)',
    icon: '🎥',
    category: 'content',
    defaultConfig: {
      url: '',
      autoplay: false,
      loop: false,
      muted: false,
      controls: true,
    } as VideoBlockConfig,
    defaultStyles: {
      padding: '20px',
    },
  },
  [BlockType.SPACER]: {
    type: BlockType.SPACER,
    name: 'Espaçador',
    description: 'Espaço em branco vertical',
    icon: '↕️',
    category: 'layout',
    defaultConfig: {
      height: 60,
    } as SpacerBlockConfig,
    defaultStyles: {},
  },
  [BlockType.DIVIDER]: {
    type: BlockType.DIVIDER,
    name: 'Divisor',
    description: 'Linha divisória horizontal',
    icon: '➖',
    category: 'layout',
    defaultConfig: {
      style: 'solid',
      color: '#e5e7eb',
      thickness: 1,
      width: '100%',
    } as DividerBlockConfig,
    defaultStyles: {
      padding: '20px 0',
    },
  },
  [BlockType.STATS]: {
    type: BlockType.STATS,
    name: 'Estatísticas',
    description: 'Números de destaque',
    icon: '📈',
    category: 'content',
    defaultConfig: {
      stats: [
        { value: '1000+', label: 'Clientes Satisfeitos', icon: '👥' },
        { value: '500+', label: 'Propriedades Vendidas', icon: '🏡' },
        { value: '15', label: 'Anos de Experiência', icon: '⭐' },
      ],
      columns: 3,
      animated: true,
    } as StatsBlockConfig,
    defaultStyles: {
      padding: '60px 20px',
    },
  },
  [BlockType.PROPERTY_CAROUSEL]: {
    type: BlockType.PROPERTY_CAROUSEL,
    name: 'Carrossel de Imóveis',
    description: 'Exibe imóveis em carrossel deslizável',
    icon: '🎠',
    category: 'property',
    defaultConfig: {
      columns: 3,
      gap: 16,
      showFilters: false,
      maxItems: 6,
      sortBy: 'price',
      cardStyle: 'modern',
      autoPlay: true,
      interval: 5000,
    } as PropertyGridBlockConfig,
    defaultStyles: {
      padding: '60px 20px',
    },
  },
  [BlockType.PROPERTY_FEATURED]: {
    type: BlockType.PROPERTY_FEATURED,
    name: 'Imóvel em Destaque',
    description: 'Destaca um imóvel principal',
    icon: '⭐',
    category: 'property',
    defaultConfig: {
      showDetails: true,
      showMap: true,
      showGallery: true,
    } as any,
    defaultStyles: {
      padding: '60px 20px',
    },
  },
  [BlockType.PROPERTY_SEARCH]: {
    type: BlockType.PROPERTY_SEARCH,
    name: 'Busca de Imóveis',
    description: 'Filtro avançado de busca',
    icon: '🔍',
    category: 'interactive',
    defaultConfig: {
      showFilters: true,
      showMap: true,
      resultsPerPage: 12,
    } as any,
    defaultStyles: {
      padding: '40px 20px',
    },
  },
  [BlockType.GALLERY]: {
    type: BlockType.GALLERY,
    name: 'Galeria de Imagens',
    description: 'Galeria com lightbox',
    icon: '🖼️',
    category: 'content',
    defaultConfig: {
      columns: 3,
      gap: 16,
      images: [],
    } as any,
    defaultStyles: {
      padding: '40px 20px',
    },
  },
  [BlockType.TESTIMONIALS]: {
    type: BlockType.TESTIMONIALS,
    name: 'Depoimentos',
    description: 'Lista de depoimentos de clientes',
    icon: '💬',
    category: 'content',
    defaultConfig: {
      testimonials: [
        {
          name: 'João Silva',
          text: 'Excelente serviço, recomendo!',
          avatar: '',
          rating: 5,
        },
      ],
      columns: 3,
    } as any,
    defaultStyles: {
      padding: '60px 20px',
    },
  },
  [BlockType.MAP]: {
    type: BlockType.MAP,
    name: 'Mapa',
    description: 'Mapa interativo de localização',
    icon: '🗺️',
    category: 'interactive',
    defaultConfig: {
      latitude: -23.5505,
      longitude: -46.6333,
      zoom: 12,
      markers: [],
    } as any,
    defaultStyles: {
      padding: '0px',
      height: '500px',
    },
  },
  [BlockType.TIMELINE]: {
    type: BlockType.TIMELINE,
    name: 'Cronologia',
    description: 'Timeline de eventos ou processo',
    icon: '📅',
    category: 'content',
    defaultConfig: {
      events: [
        { date: '2024', title: 'Evento 1', description: 'Descrição' },
      ],
    } as any,
    defaultStyles: {
      padding: '60px 20px',
    },
  },
  [BlockType.BROKER_CARD]: {
    type: BlockType.BROKER_CARD,
    name: 'Cartão de Broker',
    description: 'Informações do agente/broker',
    icon: '👤',
    category: 'content',
    defaultConfig: {
      name: 'Nome do Broker',
      title: 'Agente Imobiliário',
      image: '',
      phone: '',
      email: '',
      whatsapp: '',
    } as any,
    defaultStyles: {
      padding: '40px 20px',
    },
  },
  [BlockType.FEATURES]: {
    type: BlockType.FEATURES,
    name: 'Características',
    description: 'Lista de características destacadas',
    icon: '✨',
    category: 'content',
    defaultConfig: {
      features: [
        {
          title: 'Característica 1',
          description: 'Descrição',
          icon: '🎯',
        },
      ],
      columns: 3,
    } as any,
    defaultStyles: {
      padding: '60px 20px',
    },
  },
  [BlockType.CUSTOM_HTML]: {
    type: BlockType.CUSTOM_HTML,
    name: 'HTML Customizado',
    description: 'Código HTML personalizado',
    icon: '💻',
    category: 'interactive',
    defaultConfig: {
      html: '<div>Seu HTML aqui</div>',
    } as any,
    defaultStyles: {
      padding: '20px',
    },
  },
};
