export type BlockType =
  | 'hero'
  | 'heroWithForm'
  | 'text'
  | 'image'
  | 'gallery'
  | 'propertyGrid'
  | 'propertyCarousel'
  | 'map'
  | 'form'
  | 'cta'
  | 'testimonials'
  | 'stats'
  | 'footer'
  | 'divider'
  | 'spacer'
  | 'header'
  | 'video'
  | 'timeline'
  | 'customHtml'
  | 'brokerCard';

export interface BlockStyles {
  [key: string]: string | number | undefined;
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface Block {
  id: string;
  type: BlockType;
  styles: BlockStyles;
  content: Record<string, unknown>;
}

export interface LandingPage {
  id: string;
  company_id: string;
  slug: string;
  name: string;
  description?: string;
  title?: string;
  blocks: Block[];
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  og_image?: string;
  is_published: boolean;
  is_home: boolean;
  theme?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface LandingPageTemplate {
  id: string;
  name: string;
  category: 'rural' | 'urban' | 'universal';
  thumbnail?: string;
  blocks: Block[];
}
