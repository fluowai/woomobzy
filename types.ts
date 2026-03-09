
export enum PropertyStatus {
  AVAILABLE = 'Disponível',
  RENTED = 'Alugado',
  SOLD = 'Vendido',
  RESERVED = 'Reservado',
  PENDING = 'Pendente'
}

export enum PropertyType {
  FAZENDA = 'Fazenda',
  SITIO = 'Sítio',
  CHACARA = 'Chácara',
  ESTANCIA = 'Estância',
  HARAS = 'Haras',
  GRANJA = 'Granja',
  AGROPECUARIA = 'Agropecuária',
  TERRENO_RURAL = 'Terreno Rural',
  GLEBA = 'Gleba',
  LOTE_RURAL = 'Lote Rural',
  AREA_PRODUTIVA = 'Área Produtiva'
}

export enum PropertyPurpose {
  SALE = 'Venda',
  RENT = 'Aluguel',
  BOTH = 'Venda e Aluguel'
}

export enum PropertyAptitude {
  AGRICULTURE = 'Agricultura',
  CATTLE = 'Pecuária',
  MIXED = 'Mista',
  FORESTRY = 'Silvicultura',
  LEISURE = 'Lazer',
  COFFEE = 'Café',
  GRAINS = 'Grãos',
  FRUIT = 'Fruticultura',
  DAIRY = 'Leite',
  REFORESTATION = 'Reflorestamento'
}

export enum TopographyType {
  PLANA = 'Plana',
  ONDULADA = 'Ondulada',
  LEVE_ONDULADA = 'Levemente Ondulada',
  MONTANHOSA = 'Montanhosa'
}

export enum SoilTexture {
  ARENOSO = 'Arenoso',
  ARGILOSO = 'Argiloso',
  MISTO = 'Misto',
  MASSAPE = 'Massapê',
  TERRA_ROXA = 'Terra Roxa',
  LATOSSOLO = 'Latossolo'
}

export enum AlqueireType {
  PAULISTA = 'Paulista (2.42 ha)',
  MINEIRO = 'Mineiro (4.84 ha)',
  GOIANO = 'Goiano (4.84 ha)',
  BAIANO = 'Baiano (9.68 ha)'
}

export enum LivestockCategory {
  CORTE = 'Gado de Corte',
  LEITE = 'Gado de Leite',
  CRIA = 'Cria',
  RECRIA = 'Recria',
  ENGORDA = 'Engorda',
  CICLO_COMPLETO = 'Ciclo Completo'
}

export interface Property {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  descriptionDraft?: string;
  price: number;
  type: PropertyType;
  purpose: PropertyPurpose;
  aptitude: PropertyAptitude[];
  status: PropertyStatus;
  location: {
    city: string;
    neighborhood: string;
    state: string;
    address: string;
  };
  features: {
    // Área e Medidas
    areaHectares: number;        
    areaAlqueires?: number;      
    alqueireType?: AlqueireType;
    areaAcres?: number;
    areaM2?: number;
    preferredUnit?: 'ha' | 'alqueire' | 'acre' | 'm2';
    
    // Características da Terra
    topography?: TopographyType;
    soilTexture?: SoilTexture;
    altitude?: number;
    pluviometry?: number;
    supportCapacity?: number; // UA/ha
    
    // Infraestrutura Rural
    infra?: {
      casaSede: boolean;
      casasFuncionarios: number;
      curral: boolean;
      brete: boolean;
      balanca: boolean;
      galpaes: number;
      barracao: boolean;
      paiol: boolean;
      tulha: boolean;
      armazem: boolean;
      confinamento: boolean;
      cocheira: boolean;
      estabulo: boolean;
      cercas: string;
      piquetes: number;
      estradasInternas: boolean;
      energiaEletrica: boolean;
      energiaSolar: boolean;
      pocoArtesiano: boolean;
      caixaDagua: boolean;
      irrigacao: boolean;
      pivotCentral: boolean;
    };
    
    // Recursos Hídricos
    water?: {
      rio: boolean;
      corrego: boolean;
      riacho: boolean;
      nascente: boolean;
      represa: boolean;
      acude: boolean;
      lago: boolean;
      bebedouros: boolean;
      captacaoAgua: boolean;
      outorga: boolean;
    };
    
    // Pecuária
    livestock?: {
      category: LivestockCategory[];
      totalHeads: number;
      ua: number;
      confinamento: boolean;
    };
    
    // Agricultura
    agriculture?: {
      crops: string[];
      safra: string;
      rotation: boolean;
      irrigatedArea: number;
      mechanizableArea: number;
    };
    
    // Documentação Legal
    legal?: {
      matricula: string;
      escritura: boolean;
      ccir: boolean;
      ccirNumber?: string;
      car: boolean;
      carNumber?: string;
      itr: boolean;
      itrNumber?: string;
      geo: boolean;
      geoNumber?: string;
      reservaLegal: number; // %
      app: number; // %
      incra: string;
      outorgaAgua: boolean;
      regularizacaoFundiaria: boolean;
    };
    
    // Comercialização
    commercial?: {
      pricePerHa?: number;
      pricePerAlqueire?: number;
      isPorteiraFechada: boolean;
      permuta: boolean;
      arrendamento: boolean;
      parcelado: boolean;
    };

    // Legado/Compatibilidade
    casaSede?: boolean;
    caseiros?: number;
    galpoes?: number;
    currais?: boolean;
    tipoSolo?: string;
    usoAtual?: string[];
    temGado?: boolean;
    capacidadeCabecas?: number;
    fontesAgua?: string[];
    percentualMata?: number;
  };
  images: string[];
  highlighted?: boolean;
  ownerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  brokerId: string;
  createdAt: string;
  analysis?: PropertyAnalysis;
}

export interface ClimateData {
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  avgRainfall: number;
  totalRainfall: number;
  humidity: number;
  season: string;
  location: string;
}

export interface PropertyAnalysis {
  climate: ClimateData;
  aptitude: {
    cattle: {
      score: number;
      type: string[];
      notes: string;
    };
    agriculture: {
      score: number;
      crops: string[];
      notes: string;
    };
  };
  risks: string[];
  opportunities: string[];
  overallScore: number;
  aiInsights: string;
  analyzedAt: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: 'Novo' | 'Em Atendimento' | 'Proposta' | 'Fechado' | 'Perdido';
  aptitude_interest?: PropertyAptitude[];
  budget?: number;
  preferences?: {
    type?: PropertyType;
    neighborhood?: string;
    minArea?: number;
    states?: string[];
  };
  createdAt: string;
  propertyId?: string;
  notes?: string;
  property?: {
    title: string;
    price: number;
    image: string;
  };
}

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'BROKER';
  agencyName: string;
  avatar: string;
}

// ============================================
// VISUAL LAYOUT EDITOR TYPES
// ============================================

// Tipos de blocos disponíveis
export enum BlockType {
  HERO = 'hero',
  TEXT = 'text',
  IMAGE = 'image',
  PROPERTY_GRID = 'property_grid',
  STATS = 'stats',
  FORM = 'form',
  TESTIMONIALS = 'testimonials',
  GALLERY = 'gallery',
  MAP = 'map',
  CUSTOM_HTML = 'custom_html',
  SPACER = 'spacer',
  DIVIDER = 'divider',
  BROKER_CARD = 'broker_card',
  CTA = 'cta',
  FOOTER = 'footer'
}

// Configuração de espaçamento
export interface SpacingConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Configuração de background
export interface BackgroundConfig {
  type: 'color' | 'gradient' | 'image';
  value: string;
  overlay?: string;
  opacity?: number;
}

// Configuração de borda
export interface BorderConfig {
  width: number;
  style: 'solid' | 'dashed' | 'dotted' | 'none';
  color: string;
  radius: number;
}

// Configuração de animação
export interface AnimationConfig {
  type: 'fade' | 'slide' | 'zoom' | 'bounce' | 'none';
  duration: number;
  delay: number;
  easing?: string;
}

// Estilos aplicáveis a qualquer bloco
export interface BlockStyles {
  padding?: SpacingConfig;
  margin?: SpacingConfig;
  background?: BackgroundConfig;
  border?: BorderConfig;
  shadow?: string;
  animation?: AnimationConfig;
  width?: string;
  height?: string;
  display?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

// Configurações responsivas
export interface ResponsiveConfig {
  mobile?: Partial<BlockStyles>;
  tablet?: Partial<BlockStyles>;
  desktop?: Partial<BlockStyles>;
}

// Configurações específicas por tipo de bloco (base genérica)
export interface BlockConfig {
  [key: string]: any;
}

// Configuração do bloco Hero
export interface HeroBlockConfig extends BlockConfig {
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

// Configuração do bloco Text
export interface TextBlockConfig extends BlockConfig {
  content: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  alignment: 'left' | 'center' | 'right' | 'justify';
}

// Configuração do bloco Image
export interface ImageBlockConfig extends BlockConfig {
  src: string;
  alt: string;
  width: string;
  height: string;
  objectFit: 'cover' | 'contain' | 'fill' | 'none';
  link?: string;
}

// Configuração do bloco Property Grid
export interface PropertyGridBlockConfig extends BlockConfig {
  columns: number;
  gap: number;
  showFilters: boolean;
  maxItems: number;
  sortBy: 'price' | 'date' | 'area';
}

// Configuração do bloco Stats
export interface StatsBlockConfig extends BlockConfig {
  stats: Array<{
    value: string;
    label: string;
    icon?: string;
  }>;
  columns: number;
}

// Configuração do bloco Form
export interface FormBlockConfig extends BlockConfig {
  title: string;
  fields: Array<{
    name: string;
    type: 'text' | 'email' | 'tel' | 'textarea';
    label: string;
    required: boolean;
    placeholder?: string;
  }>;
  submitText: string;
  successMessage: string;
}

// Configuração do bloco CTA
export interface CTABlockConfig extends BlockConfig {
  title: string;
  description?: string;
  buttonText: string;
  buttonLink: string;
  backgroundColor: string;
  textColor: string;
}

// Configuração base de um bloco
export interface Block {
  id: string;
  type: BlockType;
  order: number;
  visible: boolean;
  config: BlockConfig;
  styles: BlockStyles;
  responsive: ResponsiveConfig;
}

// Estilos globais do layout
export interface GlobalStyles {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, number>;
}

// Breakpoints responsivos
export interface Breakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

// Configuração completa do layout
export interface LayoutConfig {
  version: string;
  mode: 'classic' | 'visual';
  blocks: Block[];
  globalStyles: GlobalStyles;
  breakpoints: Breakpoints;
}


export interface SiteSettings {
  id?: string; // Add optional ID for database persistence
  agencyName: string; // Add agency name
  templateId: 'modern' | 'classic' | 'minimal';
  primaryColor: string;
  secondaryColor: string;
  headerColor?: string; // Add specific header color
  logoUrl: string;
  logoHeight?: number; // Tamanho da logo em pixels
  fontFamily?: string; // Fonte principal
  baseFontSize?: number; // Tamanho base do texto
  headingFontSize?: number; // Tamanho dos títulos
  contactPhone: string;
  contactEmail: string;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  footerText: string;
  homeContent?: {
    heroTitle?: string;
    heroSubtitle?: string;
    featuredTitle?: string;
    featuredSubtitle?: string;
    featuredDescription?: string;
    badgeText?: string;
    heroFontSize?: number;
    broker?: {
      name?: string;
      photoUrl?: string;
      creci?: string;
      specialty?: string;
      phone?: string;
      instagram?: string;
    };
  };
  integrations?: {
    evolutionApi?: {
      baseUrl: string;
      token: string;
      instanceName: string;
      enabled: boolean;
    };
    groq?: {
      apiKey: string;
      model?: string;
    };
    gemini?: {
      apiKey: string;
    };
  };
  // Visual Layout Editor
  layout_config?: LayoutConfig;
  custom_css?: string;
  custom_js?: string;
}
