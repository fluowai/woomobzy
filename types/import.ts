export type ImportMode = 'visual' | 'migration' | 'feed';
export type ImportStatus =
  | 'idle'
  | 'analyzing'
  | 'crawling'
  | 'processing'
  | 'review'
  | 'importing'
  | 'completed'
  | 'error';

export interface VisualIdentity {
  palette: string[];
  fonts: string[];
  primaryColor: string;
  secondaryColor: string;
  suggestedTheme: string;
}

export interface CapturedProperty {
  id: string;
  external_id?: string;
  title: string;
  price: number;
  description: string;
  location: string;
  images: string[];
  features: string[];
  type: string;
  status: string;
  raw_html?: string;
}

export interface ImportJob {
  id: string;
  url: string;
  mode: ImportMode;
  status: ImportStatus;
  progress: number;
  authorized: boolean;
  visualIdentity?: VisualIdentity;
  properties: CapturedProperty[];
  created_at: string;
}
