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
  FOOTER = 'footer',
}

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

export interface AnimationConfig {
  type: 'fade' | 'slide' | 'zoom' | 'bounce' | 'none';
  duration: number;
  delay: number;
  easing?: string;
}

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
  color?: string;
  backgroundColor?: string;
}

export interface ResponsiveConfig {
  mobile?: Partial<BlockStyles>;
  tablet?: Partial<BlockStyles>;
  desktop?: Partial<BlockStyles>;
}

export interface BlockConfig {
  [key: string]: any;
}

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

export interface TextBlockConfig extends BlockConfig {
  content: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  alignment: 'left' | 'center' | 'right' | 'justify';
}

export interface ImageBlockConfig extends BlockConfig {
  src: string;
  alt: string;
  width: string;
  height: string;
  objectFit: 'cover' | 'contain' | 'fill' | 'none';
  link?: string;
}

export interface PropertyGridBlockConfig extends BlockConfig {
  columns: number;
  gap: number;
  showFilters: boolean;
  maxItems: number;
  sortBy: 'price' | 'date' | 'area';
}

export interface StatsBlockConfig extends BlockConfig {
  stats: Array<{
    value: string;
    label: string;
    icon?: string;
  }>;
  columns: number;
}

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

export interface CTABlockConfig extends BlockConfig {
  title: string;
  description?: string;
  buttonText: string;
  buttonLink: string;
  backgroundColor: string;
  textColor: string;
}

export interface LayoutBlock {
  id: string;
  type: BlockType;
  order: number;
  visible: boolean;
  config: BlockConfig;
  styles: BlockStyles;
  responsive: ResponsiveConfig;
  [key: string]: any;
}

export type Block = LayoutBlock;

export interface GlobalStyles {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, number>;
}

export interface Breakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface LayoutConfig {
  version: string;
  mode: 'classic' | 'visual';
  blocks: LayoutBlock[];
  globalStyles: GlobalStyles;
  breakpoints: Breakpoints;
}
