---
description: Sistema de Landing Pages Editáveis - Planejamento Completo
---

# 🎨 Sistema de Landing Pages Editáveis para CRM Imobiliário

## 📋 Visão Geral

Sistema completo de criação e edição de landing pages dentro do CRM, permitindo que corretores criem páginas personalizadas para divulgar imóveis específicos ou coleções de imóveis, com editor visual drag-and-drop e integração total com o banco de dados de propriedades.

---

## 🎯 Objetivos Principais

1. **Editor Visual Intuitivo**: Interface drag-and-drop para construir landing pages sem código
2. **Integração com Imóveis**: Seleção e exibição dinâmica de imóveis cadastrados no CRM
3. **Personalização Total**: Controle sobre cores, fontes, layouts e conteúdo
4. **Responsividade**: Landing pages otimizadas para desktop, tablet e mobile
5. **SEO Otimizado**: Meta tags, URLs amigáveis e performance
6. **Geração de Leads**: Formulários integrados ao CRM
7. **Analytics**: Rastreamento de visitas e conversões
8. **Multi-tenant**: Cada corretor/agência tem suas próprias landing pages

---

## 🏗️ Arquitetura do Sistema

### 1. Estrutura de Dados (Database Schema)

```sql
-- Tabela de Landing Pages
CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identificação
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT[],
  og_image TEXT,

  -- Configuração Visual
  template_id VARCHAR(50) DEFAULT 'modern',
  theme_config JSONB DEFAULT '{}',

  -- Layout (Blocos do Editor Visual)
  blocks JSONB DEFAULT '[]',

  -- Configurações
  settings JSONB DEFAULT '{
    "primaryColor": "#2563eb",
    "secondaryColor": "#10b981",
    "fontFamily": "Inter",
    "headerStyle": "transparent",
    "footerStyle": "minimal"
  }',

  -- Imóveis Vinculados
  property_selection JSONB DEFAULT '{
    "mode": "manual",
    "propertyIds": [],
    "filters": {},
    "sortBy": "price",
    "limit": 12
  }',

  -- Formulário de Contato
  form_config JSONB DEFAULT '{
    "enabled": true,
    "fields": ["name", "email", "phone", "message"],
    "submitText": "Enviar Mensagem",
    "successMessage": "Mensagem enviada com sucesso!",
    "whatsappEnabled": true,
    "emailEnabled": true
  }',

  -- Status e Analytics
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  published_at TIMESTAMP,
  views_count INTEGER DEFAULT 0,
  leads_count INTEGER DEFAULT 0,

  -- Custom Code
  custom_css TEXT,
  custom_js TEXT,
  custom_head TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Blocos de Conteúdo (para reutilização)
CREATE TABLE landing_page_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- hero, property_grid, testimonial, cta, etc.
  config JSONB NOT NULL,
  thumbnail TEXT,

  is_template BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Analytics
CREATE TABLE landing_page_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,

  event_type VARCHAR(50) NOT NULL, -- view, click, form_submit, property_view
  event_data JSONB,

  -- Dados do Visitante
  visitor_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,

  -- Geolocalização
  country VARCHAR(2),
  city VARCHAR(100),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para Performance
CREATE INDEX idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX idx_landing_pages_org ON landing_pages(organization_id);
CREATE INDEX idx_landing_pages_status ON landing_pages(status);
CREATE INDEX idx_landing_page_analytics_page ON landing_page_analytics(landing_page_id);
CREATE INDEX idx_landing_page_analytics_event ON landing_page_analytics(event_type);
CREATE INDEX idx_landing_page_analytics_date ON landing_page_analytics(created_at);

-- RLS Policies
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view their org landing pages"
  ON landing_pages FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create landing pages"
  ON landing_pages FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org landing pages"
  ON landing_pages FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org landing pages"
  ON landing_pages FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Políticas para visualização pública (landing pages publicadas)
CREATE POLICY "Public can view published landing pages"
  ON landing_pages FOR SELECT
  USING (status = 'published');
```

### 2. Tipos TypeScript

```typescript
// types/landingPage.ts

export enum LandingPageStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

export enum BlockType {
  HERO = "hero",
  PROPERTY_GRID = "property_grid",
  PROPERTY_CAROUSEL = "property_carousel",
  PROPERTY_FEATURED = "property_featured",
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  GALLERY = "gallery",
  TESTIMONIALS = "testimonials",
  STATS = "stats",
  CTA = "cta",
  FORM = "form",
  MAP = "map",
  BROKER_CARD = "broker_card",
  SPACER = "spacer",
  DIVIDER = "divider",
  CUSTOM_HTML = "custom_html",
}

export interface PropertySelectionConfig {
  mode: "manual" | "filter" | "all";
  propertyIds?: string[];
  filters?: {
    type?: PropertyType[];
    purpose?: PropertyPurpose[];
    minPrice?: number;
    maxPrice?: number;
    city?: string[];
    minArea?: number;
    maxArea?: number;
    status?: PropertyStatus[];
  };
  sortBy?: "price" | "area" | "date" | "random";
  sortOrder?: "asc" | "desc";
  limit?: number;
}

export interface BlockConfig {
  id: string;
  type: BlockType;
  order: number;
  visible: boolean;
  settings: Record<string, any>;
  styles: {
    padding?: string;
    margin?: string;
    backgroundColor?: string;
    backgroundImage?: string;
    textColor?: string;
    borderRadius?: string;
    boxShadow?: string;
  };
  responsive?: {
    mobile?: Partial<BlockConfig["styles"]>;
    tablet?: Partial<BlockConfig["styles"]>;
  };
}

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

export interface LandingPage {
  id: string;
  organizationId: string;
  userId: string;

  name: string;
  slug: string;
  title: string;
  description?: string;

  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogImage?: string;

  templateId: string;
  themeConfig: LandingPageTheme;
  blocks: BlockConfig[];
  settings: Record<string, any>;

  propertySelection: PropertySelectionConfig;
  formConfig: {
    enabled: boolean;
    fields: string[];
    submitText: string;
    successMessage: string;
    whatsappEnabled: boolean;
    emailEnabled: boolean;
  };

  status: LandingPageStatus;
  publishedAt?: string;
  viewsCount: number;
  leadsCount: number;

  customCss?: string;
  customJs?: string;
  customHead?: string;

  createdAt: string;
  updatedAt: string;
}

export interface LandingPageAnalytics {
  id: string;
  landingPageId: string;
  eventType: "view" | "click" | "form_submit" | "property_view";
  eventData?: Record<string, any>;
  visitorId: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
  city?: string;
  createdAt: string;
}
```

---

## 🎨 Componentes do Sistema

### 1. Componentes de Interface (Frontend)

#### A. Gerenciador de Landing Pages

```
views/LandingPageManager.tsx
├── Lista de Landing Pages
├── Filtros e Busca
├── Cards com Preview
├── Ações: Editar, Duplicar, Excluir, Publicar
├── Analytics Resumido
└── Botão "Nova Landing Page"
```

#### B. Editor Visual

```
views/LandingPageEditor.tsx
├── Toolbar Superior
│   ├── Nome da Página
│   ├── Botões: Salvar, Preview, Publicar
│   └── Configurações Globais
├── Sidebar Esquerda (Blocos)
│   ├── Seção de Blocos Disponíveis
│   ├── Blocos de Conteúdo
│   ├── Blocos de Imóveis
│   └── Blocos Salvos
├── Canvas Central (Preview)
│   ├── Área de Drop
│   ├── Blocos Arrastáveis
│   └── Indicadores de Posição
└── Sidebar Direita (Propriedades)
    ├── Configurações do Bloco Selecionado
    ├── Estilos
    ├── Responsividade
    └── Ações do Bloco
```

#### C. Blocos de Conteúdo

**1. Hero Block**

```typescript
// components/LandingPageBlocks/HeroBlock.tsx
- Background: Imagem/Vídeo/Gradiente
- Título e Subtítulo editáveis
- CTA Button
- Overlay com opacidade ajustável
- Altura customizável
```

**2. Property Grid Block**

```typescript
// components/LandingPageBlocks/PropertyGridBlock.tsx
- Seleção de imóveis (manual ou filtros)
- Layout: Grid/Lista/Carrossel
- Colunas responsivas
- Filtros visíveis/ocultos
- Card style customizável
```

**3. Property Featured Block**

```typescript
// components/LandingPageBlocks/PropertyFeaturedBlock.tsx
- Destaque para 1 imóvel específico
- Layout: Imagem + Detalhes
- CTA personalizado
- Galeria de fotos
```

**4. Form Block**

```typescript
// components/LandingPageBlocks/FormBlock.tsx
- Campos customizáveis
- Validação
- Integração com CRM (criação de leads)
- Envio para WhatsApp/Email
- Mensagem de sucesso
```

**5. Broker Card Block**

```typescript
// components/LandingPageBlocks/BrokerCardBlock.tsx
- Foto do corretor
- Nome, CRECI, Especialidade
- Contatos (WhatsApp, Email, Instagram)
- Descrição
```

**6. Testimonials Block**

```typescript
// components/LandingPageBlocks/TestimonialsBlock.tsx
- Carrossel de depoimentos
- Foto, nome, avaliação
- Texto do depoimento
```

**7. Stats Block**

```typescript
// components/LandingPageBlocks/StatsBlock.tsx
- Números de destaque
- Ícones
- Animação de contagem
```

**8. CTA Block**

```typescript
// components/LandingPageBlocks/CTABlock.tsx
- Título e descrição
- Botão de ação
- Background customizável
```

**9. Text/Image/Video Blocks**

```typescript
// Blocos básicos de conteúdo
- Editor de texto rico
- Upload de imagens
- Embed de vídeos (YouTube, Vimeo)
```

#### D. Configurações e Customização

```
components/LandingPageEditor/
├── ThemeCustomizer.tsx
│   ├── Seletor de Cores
│   ├── Seletor de Fontes
│   ├── Espaçamentos
│   └── Border Radius
├── PropertySelector.tsx
│   ├── Modo Manual (Checkboxes)
│   ├── Modo Filtros (Formulário)
│   └── Preview dos Selecionados
├── SEOSettings.tsx
│   ├── Meta Title
│   ├── Meta Description
│   ├── Keywords
│   └── Open Graph Image
└── AdvancedSettings.tsx
    ├── Custom CSS
    ├── Custom JavaScript
    ├── Custom Head Tags
    └── Analytics Integration
```

### 2. Serviços (Backend)

```typescript
// services/landingPages.ts

export const landingPageService = {
  // CRUD Básico
  async list(organizationId: string): Promise<LandingPage[]>
  async getById(id: string): Promise<LandingPage>
  async getBySlug(slug: string): Promise<LandingPage>
  async create(data: Partial<LandingPage>): Promise<LandingPage>
  async update(id: string, data: Partial<LandingPage>): Promise<LandingPage>
  async delete(id: string): Promise<void>
  async duplicate(id: string): Promise<LandingPage>

  // Publicação
  async publish(id: string): Promise<LandingPage>
  async unpublish(id: string): Promise<LandingPage>

  // Imóveis
  async getPageProperties(pageId: string): Promise<Property[]>
  async updatePropertySelection(pageId: string, config: PropertySelectionConfig): Promise<void>

  // Analytics
  async trackView(pageId: string, visitorData: any): Promise<void>
  async trackEvent(pageId: string, eventType: string, eventData: any): Promise<void>
  async getAnalytics(pageId: string, dateRange?: { start: Date; end: Date }): Promise<Analytics>

  // Templates
  async getTemplates(): Promise<LandingPageTemplate[]>
  async createFromTemplate(templateId: string, data: Partial<LandingPage>): Promise<LandingPage>

  // Blocos Salvos
  async saveBlock(block: BlockConfig): Promise<SavedBlock>
  async getSavedBlocks(organizationId: string): Promise<SavedBlock[]>
}
```

---

## 🚀 Fases de Implementação

### **FASE 1: Fundação (Semana 1)**

#### 1.1 Database Schema

- [ ] Criar tabelas no Supabase
- [ ] Configurar RLS policies
- [ ] Criar índices de performance
- [ ] Testar queries básicas

#### 1.2 Tipos e Interfaces

- [ ] Criar `types/landingPage.ts`
- [ ] Atualizar `types.ts` principal
- [ ] Definir enums e interfaces

#### 1.3 Serviço Base

- [ ] Implementar `services/landingPages.ts`
- [ ] CRUD completo
- [ ] Testes de integração

---

### **FASE 2: Interface de Gerenciamento (Semana 2)**

#### 2.1 Landing Page Manager

- [ ] Criar `views/LandingPageManager.tsx`
- [ ] Lista com cards de preview
- [ ] Filtros e busca
- [ ] Ações: Criar, Editar, Duplicar, Excluir
- [ ] Modal de criação rápida

#### 2.2 Formulário de Criação

- [ ] Modal/Página de nova landing page
- [ ] Seleção de template
- [ ] Configurações iniciais
- [ ] Validação de slug único

#### 2.3 Analytics Dashboard

- [ ] Componente de estatísticas
- [ ] Gráficos de visitas
- [ ] Taxa de conversão
- [ ] Origem de tráfego

---

### **FASE 3: Editor Visual - Core (Semana 3-4)**

#### 3.1 Estrutura do Editor

- [ ] Layout do editor (3 colunas)
- [ ] Toolbar superior
- [ ] Sidebar de blocos
- [ ] Canvas de preview
- [ ] Sidebar de propriedades

#### 3.2 Drag & Drop

- [ ] Implementar react-beautiful-dnd ou dnd-kit
- [ ] Área de drop no canvas
- [ ] Reordenação de blocos
- [ ] Indicadores visuais
- [ ] Undo/Redo

#### 3.3 Sistema de Blocos Base

- [ ] Componente base `Block.tsx`
- [ ] Wrapper com controles (editar, mover, deletar)
- [ ] Sistema de seleção
- [ ] Highlight do bloco ativo

---

### **FASE 4: Blocos de Conteúdo (Semana 5-6)**

#### 4.1 Blocos Básicos

- [ ] Hero Block
- [ ] Text Block (rich editor)
- [ ] Image Block
- [ ] Video Block
- [ ] Spacer/Divider

#### 4.2 Blocos de Imóveis

- [ ] Property Grid Block
- [ ] Property Carousel Block
- [ ] Property Featured Block
- [ ] Property Search Block

#### 4.3 Blocos Interativos

- [ ] Form Block
- [ ] CTA Block
- [ ] Broker Card Block
- [ ] Testimonials Block
- [ ] Stats Block
- [ ] Map Block

#### 4.4 Configuradores de Blocos

- [ ] Panel de configuração para cada tipo
- [ ] Validação de campos
- [ ] Preview em tempo real

---

### **FASE 5: Seleção de Imóveis (Semana 7)**

#### 5.1 Property Selector

- [ ] Modo Manual (lista com checkboxes)
- [ ] Modo Filtros (formulário de filtros)
- [ ] Modo Todos
- [ ] Preview dos imóveis selecionados
- [ ] Ordenação e limite

#### 5.2 Integração

- [ ] Carregar imóveis do banco
- [ ] Aplicar filtros dinâmicos
- [ ] Atualizar preview em tempo real
- [ ] Salvar configuração

---

### **FASE 6: Customização Visual (Semana 8)**

#### 6.1 Theme Customizer

- [ ] Seletor de cores (primária, secundária, accent)
- [ ] Seletor de fontes (Google Fonts)
- [ ] Tamanhos de fonte
- [ ] Espaçamentos globais
- [ ] Border radius

#### 6.2 Estilos por Bloco

- [ ] Editor de estilos inline
- [ ] Padding/Margin
- [ ] Background (cor, imagem, gradiente)
- [ ] Bordas e sombras
- [ ] Responsividade (mobile, tablet, desktop)

#### 6.3 Custom Code

- [ ] Editor de CSS customizado
- [ ] Editor de JavaScript customizado
- [ ] Custom Head tags
- [ ] Preview com custom code aplicado

---

### **FASE 7: Publicação e Preview (Semana 9)**

#### 7.1 Sistema de Preview

- [ ] Preview em nova aba
- [ ] Preview responsivo (mobile, tablet, desktop)
- [ ] Preview com dados reais
- [ ] Compartilhamento de preview (link temporário)

#### 7.2 Publicação

- [ ] Validação antes de publicar
- [ ] Geração de slug otimizado
- [ ] Publicação com versionamento
- [ ] Despublicar
- [ ] Agendar publicação (futuro)

#### 7.3 Roteamento Público

- [ ] Rota pública `/lp/:slug`
- [ ] Componente de renderização
- [ ] SSR/SSG (se aplicável)
- [ ] Meta tags dinâmicas
- [ ] Open Graph

---

### **FASE 8: Formulários e Leads (Semana 10)**

#### 8.1 Form Builder

- [ ] Configurador de campos
- [ ] Validação customizável
- [ ] Estilos do formulário
- [ ] Mensagens de sucesso/erro

#### 8.2 Integração com CRM

- [ ] Criar lead ao submeter
- [ ] Associar lead à landing page
- [ ] Notificações (email, WhatsApp)
- [ ] Auto-resposta

#### 8.3 Tracking

- [ ] Rastrear origem do lead
- [ ] UTM parameters
- [ ] Cookies de sessão

---

### **FASE 9: Analytics e Tracking (Semana 11)**

#### 9.1 Event Tracking

- [ ] Track page views
- [ ] Track clicks em CTAs
- [ ] Track form submissions
- [ ] Track property views

#### 9.2 Dashboard de Analytics

- [ ] Visitas por dia/semana/mês
- [ ] Taxa de conversão
- [ ] Origem de tráfego
- [ ] Imóveis mais visualizados
- [ ] Mapa de calor (futuro)

#### 9.3 Integrações

- [ ] Google Analytics
- [ ] Facebook Pixel
- [ ] Google Tag Manager

---

### **FASE 10: Templates e Otimizações (Semana 12)**

#### 10.1 Templates Prontos

- [ ] Template "Imóvel Único"
- [ ] Template "Catálogo de Imóveis"
- [ ] Template "Lançamento"
- [ ] Template "Corretor Pessoal"
- [ ] Template "Agência"

#### 10.2 Biblioteca de Blocos

- [ ] Salvar blocos customizados
- [ ] Compartilhar blocos entre páginas
- [ ] Importar/Exportar blocos

#### 10.3 Performance

- [ ] Lazy loading de imagens
- [ ] Otimização de CSS/JS
- [ ] Cache de páginas publicadas
- [ ] CDN para assets

#### 10.4 SEO

- [ ] Sitemap automático
- [ ] Robots.txt
- [ ] Schema.org markup
- [ ] Canonical URLs

---

## 📱 Fluxo de Uso

### Para o Corretor:

1. **Criar Nova Landing Page**

   - Acessa "Landing Pages" no menu
   - Clica em "Nova Landing Page"
   - Escolhe um template ou começa do zero
   - Define nome e slug

2. **Editar Conteúdo**

   - Arrasta blocos da sidebar para o canvas
   - Configura cada bloco (textos, imagens, cores)
   - Seleciona imóveis para exibir
   - Customiza formulário de contato

3. **Personalizar Visual**

   - Ajusta cores do tema
   - Escolhe fontes
   - Define espaçamentos
   - Adiciona CSS customizado (opcional)

4. **Configurar SEO**

   - Define meta title e description
   - Adiciona keywords
   - Faz upload de imagem Open Graph

5. **Preview e Publicar**

   - Visualiza em diferentes dispositivos
   - Testa formulário
   - Publica quando estiver satisfeito
   - Compartilha o link

6. **Acompanhar Resultados**
   - Visualiza analytics
   - Monitora leads gerados
   - Ajusta estratégia

---

## 🎨 Design System

### Paleta de Cores Sugerida

```css
--primary: #2563eb; /* Azul principal */
--secondary: #10b981; /* Verde secundário */
--accent: #f59e0b; /* Laranja destaque */
--background: #ffffff; /* Fundo branco */
--surface: #f9fafb; /* Cinza claro */
--text: #111827; /* Texto escuro */
--text-muted: #6b7280; /* Texto secundário */
--border: #e5e7eb; /* Bordas */
--error: #ef4444; /* Vermelho erro */
--success: #10b981; /* Verde sucesso */
```

### Tipografia

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
--font-heading: "Poppins", sans-serif;

--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem; /* 36px */
--text-5xl: 3rem; /* 48px */
```

### Espaçamentos

```css
--spacing-xs: 0.25rem; /* 4px */
--spacing-sm: 0.5rem; /* 8px */
--spacing-md: 1rem; /* 16px */
--spacing-lg: 1.5rem; /* 24px */
--spacing-xl: 2rem; /* 32px */
--spacing-2xl: 3rem; /* 48px */
--spacing-3xl: 4rem; /* 64px */
```

---

## 🔧 Tecnologias Utilizadas

### Frontend

- **React** + **TypeScript**
- **Vite** (build tool)
- **TailwindCSS** (styling)
- **dnd-kit** ou **react-beautiful-dnd** (drag & drop)
- **react-quill** ou **tiptap** (rich text editor)
- **react-color** (color picker)
- **recharts** (analytics charts)
- **react-helmet-async** (SEO meta tags)

### Backend

- **Supabase** (database, auth, storage)
- **PostgreSQL** (database)
- **Edge Functions** (serverless functions)

### Integrações

- **Google Fonts API**
- **Unsplash API** (imagens de stock)
- **Google Analytics**
- **WhatsApp Business API**

---

## ✅ Checklist de Funcionalidades

### Essenciais (MVP)

- [ ] CRUD de landing pages
- [ ] Editor visual com drag & drop
- [ ] 5 blocos básicos (Hero, Property Grid, Text, Form, CTA)
- [ ] Seleção manual de imóveis
- [ ] Customização de cores e fontes
- [ ] Formulário de contato integrado ao CRM
- [ ] Preview responsivo
- [ ] Publicação com slug único
- [ ] Rota pública para visualização
- [ ] Analytics básico (views, leads)

### Importantes (Fase 2)

- [ ] 10+ tipos de blocos
- [ ] Seleção de imóveis por filtros
- [ ] Templates prontos
- [ ] Biblioteca de blocos salvos
- [ ] Custom CSS/JS
- [ ] SEO completo
- [ ] Duplicação de páginas
- [ ] Versionamento
- [ ] Analytics avançado

### Desejáveis (Futuro)

- [ ] A/B Testing
- [ ] Agendamento de publicação
- [ ] Colaboração em tempo real
- [ ] Importar/Exportar páginas
- [ ] Marketplace de templates
- [ ] Integração com redes sociais
- [ ] Chat ao vivo
- [ ] Popup builder
- [ ] Email marketing integration

---

## 📊 Métricas de Sucesso

1. **Adoção**: 80% dos corretores criam pelo menos 1 landing page
2. **Conversão**: Taxa de conversão média > 3%
3. **Performance**: Tempo de carregamento < 2s
4. **Usabilidade**: Tempo médio para criar uma página < 15min
5. **Leads**: Aumento de 40% na geração de leads

---

## 🚨 Considerações Importantes

### Performance

- Implementar lazy loading para imagens
- Minificar CSS/JS customizado
- Cache de páginas publicadas
- CDN para assets estáticos

### Segurança

- Sanitizar HTML customizado
- Validar JavaScript customizado
- Rate limiting para formulários
- Proteção contra spam

### UX

- Auto-save a cada 30 segundos
- Indicador de salvamento
- Undo/Redo
- Atalhos de teclado
- Tour guiado para novos usuários

### Responsividade

- Mobile-first design
- Breakpoints: 640px, 768px, 1024px, 1280px
- Preview em diferentes dispositivos
- Touch-friendly para tablets

---

## 📚 Recursos e Referências

### Inspirações

- **Webflow**: Editor visual profissional
- **Wix**: Simplicidade e templates
- **Unbounce**: Foco em conversão
- **Carrd**: Minimalismo
- **Notion**: UX de blocos

### Bibliotecas Úteis

- `dnd-kit`: Drag and drop moderno
- `react-grid-layout`: Layouts responsivos
- `tiptap`: Editor de texto rico
- `react-colorful`: Color picker leve
- `framer-motion`: Animações
- `react-hook-form`: Formulários performáticos

---

## 🎯 Próximos Passos Imediatos

1. **Revisar e aprovar este planejamento**
2. **Criar branch feature/landing-page-builder**
3. **Implementar FASE 1 (Database Schema)**
4. **Criar protótipo de interface no Figma** (opcional)
5. **Começar desenvolvimento da FASE 2**

---

## 📝 Notas Finais

Este sistema transformará o CRM em uma ferramenta completa de marketing digital, permitindo que corretores criem experiências personalizadas para seus clientes sem depender de desenvolvedores ou ferramentas externas.

**Tempo estimado total**: 12 semanas (3 meses)
**Complexidade**: Alta
**Impacto no negócio**: Muito Alto
**Prioridade**: Alta

---

**Criado em**: 2026-01-14
**Versão**: 1.0
**Status**: Aguardando Aprovação
