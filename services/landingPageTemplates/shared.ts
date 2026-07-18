import { LandingPageTheme, Block, BlockType } from '../../types/landingPage';
import { v4 as uuidv4 } from 'uuid';

export interface LandingPageTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  group?: string;
  objective?: string;
  style?: string;
  resources?: string[];
  tags?: string[];
  sections?: string[];
  sectionCount?: number;
  pipeline?: string;
  crmTags?: string[];
  conversionEvent?: string;
  themeConfig: LandingPageTheme;
  blocks: Omit<Block, 'id'>[];
}

export const generateBlocksFromTemplate = (
  templateBlocks: Omit<Block, 'id'>[]
): Block[] => {
  return templateBlocks.map((block, index) => ({
    ...block,
    id: uuidv4(),
    order: index,
  }));
};

type PremiumTemplateInput = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  group: string;
  category: string;
  objective: string;
  style: string;
  resources: string[];
  tags: string[];
  pipeline: string;
  crmTags: string[];
  conversionEvent: string;
  theme: Partial<LandingPageTheme>;
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  location: string;
  stats: Array<{ label: string; value: string }>;
  sections: string[];
  highlights: string[];
  formTitle: string;
  formSubmit: string;
};

export const defaultPremiumTheme: LandingPageTheme = {
  primaryColor: '#111827',
  secondaryColor: '#4f46e5',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  fontFamily: 'Inter',
  borderRadius: '1rem',
  spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '4rem' },
  fontSize: {
    base: '1rem',
    heading1: '4rem',
    heading2: '2.75rem',
    heading3: '1.75rem',
  },
};

export const templateBlock = (
  type: BlockType,
  order: number,
  config: any,
  styles: any = {},
  containerWidth: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'xl'
): Omit<Block, 'id'> => ({
  type,
  order,
  visible: true,
  config,
  styles,
  responsive: {},
  containerWidth,
});

export const premiumFormFields = [
  {
    name: 'name',
    label: 'Nome',
    type: 'text',
    required: true,
    placeholder: 'Seu nome completo',
  },
  {
    name: 'phone',
    label: 'WhatsApp',
    type: 'tel',
    required: true,
    placeholder: '(00) 00000-0000',
  },
  {
    name: 'email',
    label: 'E-mail',
    type: 'email',
    required: false,
    placeholder: 'voce@email.com',
  },
  {
    name: 'interest',
    label: 'Interesse',
    type: 'select',
    required: true,
    options: [
      'Agendar visita',
      'Falar no WhatsApp',
      'Receber material',
      'Simular financiamento',
    ],
  },
  {
    name: 'message',
    label: 'Mensagem',
    type: 'textarea',
    required: false,
    placeholder: 'Conte rapidamente o que voce procura',
  },
] as any;

export const buildPremiumTemplate = (
  input: PremiumTemplateInput
): LandingPageTemplate => {
  const theme = { ...defaultPremiumTheme, ...input.theme };
  const galleryImages = [
    { src: input.thumbnail, alt: input.name, caption: 'Imagem principal' },
    {
      src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop',
      alt: 'Ambiente interno',
      caption: 'Ambientes planejados',
    },
    {
      src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1600&auto=format&fit=crop',
      alt: 'Fachada',
      caption: 'Fachada e acesso',
    },
    {
      src: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1600&auto=format&fit=crop',
      alt: 'Area externa',
      caption: 'Area externa',
    },
  ];

  return {
    id: input.id,
    name: input.name,
    description: input.description,
    thumbnail: input.thumbnail,
    category: input.category,
    group: input.group,
    objective: input.objective,
    style: input.style,
    resources: input.resources,
    tags: input.tags,
    sections: input.sections,
    sectionCount: input.sections.length,
    pipeline: input.pipeline,
    crmTags: input.crmTags,
    conversionEvent: input.conversionEvent,
    themeConfig: theme,
    blocks: [
      templateBlock(
        BlockType.HERO,
        0,
        {
          title: input.heroTitle,
          subtitle: input.heroSubtitle,
          backgroundImage: input.thumbnail,
          overlayOpacity: 0.42,
          ctaText: input.ctaText,
          ctaLink: '#contato',
          height: 720,
          alignment: 'center',
          textColor: '#ffffff',
        },
        { padding: '0' },
        'full'
      ),
      templateBlock(
        BlockType.STATS,
        1,
        {
          stats: input.stats.map((stat) => ({ ...stat, icon: '' })),
          columns: Math.min(4, input.stats.length),
        },
        { padding: '80px 20px', backgroundColor: '#f8fafc' }
      ),
      templateBlock(
        BlockType.TEXT,
        2,
        {
          content: `<h2>${input.name}</h2><p>${input.description}</p><ul>${input.highlights.map((item) => `<li>${item}</li>`).join('')}</ul>`,
          alignment: 'left',
          fontSize: 18,
          fontWeight: 400,
          color: theme.textColor,
        },
        { padding: '80px 20px' }
      ),
      templateBlock(
        BlockType.GALLERY,
        3,
        {
          images: galleryImages,
          columns: 4,
          spacing: 18,
          lightbox: true,
        },
        { padding: '60px 20px', backgroundColor: '#ffffff' }
      ),
      templateBlock(
        BlockType.VIDEO,
        4,
        {
          title: 'Tour virtual e video de apresentacao',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          autoplay: false,
          loop: false,
          muted: false,
          controls: true,
          coverImage: input.thumbnail,
        },
        { padding: '70px 20px', backgroundColor: '#f8fafc' }
      ),
      templateBlock(
        BlockType.MAP,
        5,
        {
          address: input.location,
          title: 'Localizacao estrategica',
          description:
            'Mapa integrado para orientar visitas, proximidades e logistica.',
          zoom: 14,
          height: 460,
          showCard: true,
        },
        { padding: '0' },
        'full'
      ),
      templateBlock(
        BlockType.TESTIMONIALS,
        6,
        {
          layout: 'grid',
          showRating: true,
          testimonials: [
            {
              name: 'Cliente comprador',
              text: 'A pagina trouxe todas as informacoes que eu precisava antes de falar com o corretor.',
              rating: 5,
            },
            {
              name: 'Investidor',
              text: 'O material tecnico e a agenda facilitaram a tomada de decisao.',
              rating: 5,
            },
            {
              name: 'Corretor responsavel',
              text: 'Os leads chegam mais qualificados porque a landing ja filtra o interesse.',
              rating: 5,
            },
          ],
        },
        { padding: '80px 20px', backgroundColor: '#f8fafc' }
      ),
      templateBlock(
        BlockType.FORM,
        7,
        {
          title: input.formTitle,
          fields: premiumFormFields,
          submitText: input.formSubmit,
          successMessage:
            'Recebemos seus dados. Um especialista vai falar com voce.',
        },
        { padding: '80px 20px', backgroundColor: '#ffffff' }
      ),
      templateBlock(
        BlockType.CTA,
        8,
        {
          title: 'Pronto para avancar?',
          description:
            'Fale com o corretor, agende uma visita ou receba o material completo no WhatsApp.',
          buttonText: input.ctaText,
          buttonLink: '#contato',
          backgroundColor: theme.primaryColor,
          textColor: '#ffffff',
        },
        { padding: '0' },
        'full'
      ),
    ],
  };
};

export const premiumBaseSections = [
  'Header profissional',
  'Hero com CTA',
  'WhatsApp',
  'Formulario',
  'Galeria',
  'Tour virtual',
  'Video',
  'Mapa',
  'Dados tecnicos',
  'Diferenciais',
  'Prova social',
  'FAQ',
  'Agenda',
  'CRM',
  'SEO e LGPD',
];

type DesignedTemplateInput = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  group: string;
  category: string;
  objective: string;
  style: string;
  resources: string[];
  pipeline: string;
  crmTags: string[];
  conversionEvent: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    footer: string;
  };
  logo: string;
  nav: string[];
  badge: string;
  headline: string;
  highlight?: string;
  subtitle: string;
  price?: string;
  location: string;
  primaryCta: string;
  secondaryCta: string;
  heroImage: string;
  stats: Array<{ label: string; value: string; icon: string }>;
  features: Array<{ title: string; text: string; icon: string }>;
  cards: Array<{ title: string; meta: string; image: string; price?: string }>;
  sections: string[];
  formTitle: string;
  formSubtitle: string;
  faq: string[];
};

export const landingImage = {
  mansion:
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=1920&auto=format&fit=crop',
  house:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop',
  interior:
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1600&auto=format&fit=crop',
  condo:
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=1600&auto=format&fit=crop',
  warehouse:
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1920&auto=format&fit=crop',
  warehouseInside:
    'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?q=80&w=1600&auto=format&fit=crop',
  farm: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop',
  crops:
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop',
  launch:
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1920&auto=format&fit=crop',
  luxuryApt:
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=1920&auto=format&fit=crop',
  family:
    'https://images.unsplash.com/photo-1597047084897-51e81819a499?q=80&w=1920&auto=format&fit=crop',
  lots: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop',
  broker:
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1000&auto=format&fit=crop',
  map: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1600&auto=format&fit=crop',
};

export const buildDesignedTemplate = (
  input: DesignedTemplateInput
): LandingPageTemplate => {
  const cls = `lp-designed-${input.id}`;
  const fieldToken = (key: string) => `{{${key}}}`;
  const editableFields = [
    {
      key: 'logo',
      label: 'Logo / nome da marca',
      type: 'text' as const,
      value: input.logo,
    },
    {
      key: 'whatsappLabel',
      label: 'Botao do topo',
      type: 'text' as const,
      value: 'Fale no WhatsApp',
    },
    {
      key: 'badge',
      label: 'Etiqueta do hero',
      type: 'text' as const,
      value: input.badge,
    },
    {
      key: 'headline',
      label: 'Titulo principal',
      type: 'textarea' as const,
      value: input.headline,
    },
    {
      key: 'highlight',
      label: 'Trecho destacado do titulo',
      type: 'text' as const,
      value: input.highlight || '',
    },
    {
      key: 'subtitle',
      label: 'Subtitulo',
      type: 'textarea' as const,
      value: input.subtitle,
    },
    {
      key: 'location',
      label: 'Localizacao',
      type: 'text' as const,
      value: input.location,
    },
    {
      key: 'price',
      label: 'Preco / chamada de valor',
      type: 'text' as const,
      value: input.price || '',
    },
    {
      key: 'primaryCta',
      label: 'Botao principal',
      type: 'text' as const,
      value: input.primaryCta,
    },
    {
      key: 'secondaryCta',
      label: 'Botao secundario',
      type: 'text' as const,
      value: input.secondaryCta,
    },
    {
      key: 'featuresTitle',
      label: 'Titulo dos diferenciais',
      type: 'textarea' as const,
      value: 'Solucoes desenhadas para converter leads de verdade.',
    },
    {
      key: 'galleryTitle',
      label: 'Titulo da galeria',
      type: 'textarea' as const,
      value:
        input.group === 'Lancamentos'
          ? 'Ambientes, plantas e diferenciais.'
          : input.group === 'Rural'
            ? 'Dados, imagens e materiais tecnicos.'
            : 'Oportunidades selecionadas para voce.',
    },
    {
      key: 'mapTitle',
      label: 'Titulo da localizacao',
      type: 'textarea' as const,
      value: 'Perto do que importa, longe da duvida.',
    },
    {
      key: 'processTitle',
      label: 'Titulo do processo',
      type: 'textarea' as const,
      value: 'Fluxo simples, visual e pronto para atendimento.',
    },
    {
      key: 'testimonialTitle',
      label: 'Titulo da prova social',
      type: 'textarea' as const,
      value: 'Pagina feita para gerar confianca antes do primeiro contato.',
    },
    {
      key: 'testimonialText',
      label: 'Texto do depoimento',
      type: 'textarea' as const,
      value:
        'Informacoes completas, atendimento rapido e processo transparente do inicio ao fim.',
    },
    {
      key: 'formTitle',
      label: 'Titulo do formulario',
      type: 'text' as const,
      value: input.formTitle,
    },
    {
      key: 'formSubtitle',
      label: 'Subtitulo do formulario',
      type: 'textarea' as const,
      value: input.formSubtitle,
    },
    {
      key: 'faqTitle',
      label: 'Titulo do FAQ',
      type: 'text' as const,
      value: 'Duvidas frequentes',
    },
    {
      key: 'footerDescription',
      label: 'Descricao do rodape',
      type: 'textarea' as const,
      value:
        'Landing premium com WhatsApp, CRM, agenda, SEO, LGPD e funil integrado.',
    },
  ];
  const formOptions =
    input.group === 'Rural'
      ? [
          'Compra de fazenda',
          'Venda de fazenda',
          'Visita tecnica',
          'Receber dossie',
        ]
      : input.group === 'Lancamentos'
        ? ['Lista VIP', 'Plantas', 'Simulacao', 'Agendar apresentacao']
        : input.group === 'Aluguel'
          ? [
              'Visita presencial',
              'Visita por video',
              'Pre-cadastro',
              'WhatsApp',
            ]
          : [
              'Agendar visita',
              'Falar no WhatsApp',
              'Receber material',
              'Avaliacao',
            ];

  const html = `
    <main class="${cls}">
      <header class="lp-nav">
        <div class="lp-logo"><span>${input.logo.split(' ')[0]}</span><strong>${fieldToken('logo')}</strong></div>
        <nav>${input.nav.map((item) => `<a href="#${item.toLowerCase().replace(/\s+/g, '-')}">${item}</a>`).join('')}</nav>
        <a class="lp-whatsapp" href="#contato">${fieldToken('whatsappLabel')}</a>
      </header>

      <section class="lp-hero" style="background-image:linear-gradient(90deg, rgba(5,12,22,.86), rgba(5,12,22,.48), rgba(5,12,22,.08)), url('${input.heroImage}')">
        <div class="lp-hero-content">
          <span class="lp-badge">${fieldToken('badge')}</span>
          <h1>${fieldToken('headline')} <em>${fieldToken('highlight')}</em></h1>
          <p>${fieldToken('subtitle')}</p>
          <div class="lp-location">${fieldToken('location')}</div>
          <div class="lp-price">${fieldToken('price')}</div>
          <div class="lp-actions">
            <a class="lp-primary" href="#contato">${fieldToken('primaryCta')}</a>
            <a class="lp-secondary" href="#galeria">${fieldToken('secondaryCta')}</a>
          </div>
        </div>
        <aside class="lp-hero-panel">
          ${input.stats
            .slice(0, 4)
            .map(
              (stat) => `
            <div><span>${stat.icon}</span><strong>${stat.value}</strong><small>${stat.label}</small></div>
          `
            )
            .join('')}
        </aside>
      </section>

      <section class="lp-statbar">
        ${input.stats
          .map(
            (stat) => `
          <div><span>${stat.icon}</span><strong>${stat.value}</strong><small>${stat.label}</small></div>
        `
          )
          .join('')}
      </section>

      <section class="lp-section lp-features">
        <div class="lp-section-title">
          <span>Atuacao especializada</span>
          <h2>${fieldToken('featuresTitle')}</h2>
        </div>
        <div class="lp-feature-grid">
          ${input.features
            .map(
              (feature) => `
            <article>
              <span>${feature.icon}</span>
              <h3>${feature.title}</h3>
              <p>${feature.text}</p>
            </article>
          `
            )
            .join('')}
        </div>
      </section>

      <section id="galeria" class="lp-section lp-dark">
        <div class="lp-section-head">
          <div>
            <span>Galeria e oportunidades</span>
            <h2>${fieldToken('galleryTitle')}</h2>
          </div>
          <a href="#contato">Ver todos</a>
        </div>
        <div class="lp-card-grid">
          ${input.cards
            .map(
              (card) => `
            <article>
              <img src="${card.image}" alt="${card.title}" />
              <div>
                <strong>${card.title}</strong>
                <p>${card.meta}</p>
                ${card.price ? `<b>${card.price}</b>` : ''}
              </div>
            </article>
          `
            )
            .join('')}
        </div>
      </section>

      <section class="lp-section lp-two-cols">
        <div class="lp-map-card">
          <span>Localizacao estrategica</span>
          <h2>${fieldToken('mapTitle')}</h2>
          <p>${fieldToken('location')}. Regiao apresentada com contexto comercial, logistico e decisivo para o lead.</p>
          <ul>
            <li>Acesso rapido aos principais pontos</li>
            <li>Mapa preparado para trafego pago</li>
            <li>Registro de interesse no CRM</li>
          </ul>
          <a class="lp-outline" href="#contato">Ver no mapa</a>
        </div>
        <div class="lp-map-image" style="background-image:url('${landingImage.map}')">
          <strong>${fieldToken('location')}</strong>
        </div>
      </section>

      <section class="lp-section lp-process">
        <div class="lp-section-title">
          <span>Como funciona</span>
          <h2>${fieldToken('processTitle')}</h2>
        </div>
        <div class="lp-steps">
          ${[
            'Contato qualificado',
            'Analise do perfil',
            'Visita ou material',
            'Negociacao segura',
          ]
            .map(
              (step, index) => `
            <div><b>${index + 1}</b><strong>${step}</strong><p>${index === 0 ? 'Lead entra pela landing.' : index === 1 ? 'CRM classifica e organiza.' : index === 2 ? 'Corretor recebe contexto.' : 'Tudo fica registrado.'}</p></div>
          `
            )
            .join('')}
        </div>
      </section>

      <section class="lp-section lp-qualification">
        <div class="lp-testimonial">
          <span>Quem confia, recomenda</span>
          <h2>${fieldToken('testimonialTitle')}</h2>
          <p>"${fieldToken('testimonialText')}"</p>
          <strong>Cliente verificado</strong>
        </div>
        <form id="contato" class="lp-form">
          <h2>${fieldToken('formTitle')}</h2>
          <p>${fieldToken('formSubtitle')}</p>
          <input placeholder="Nome completo" />
          <input placeholder="WhatsApp" />
          <input placeholder="E-mail" />
          <select>${formOptions.map((option) => `<option>${option}</option>`).join('')}</select>
          <textarea placeholder="Mensagem"></textarea>
          <label><input type="checkbox" checked /> Autorizo contato e aceito a politica de privacidade.</label>
          <button type="button">${fieldToken('primaryCta')}</button>
        </form>
      </section>

      <section class="lp-section lp-faq">
        <h2>${fieldToken('faqTitle')}</h2>
        <div>
          ${input.faq.map((item) => `<details><summary>${item}</summary><p>Nossa equipe responde com dados reais, materiais completos e proximo passo claro.</p></details>`).join('')}
        </div>
      </section>

      <footer class="lp-footer">
        <div><strong>${fieldToken('logo')}</strong><p>${fieldToken('footerDescription')}</p></div>
        <div><span>Pipeline</span><p>${input.pipeline}</p></div>
        <div><span>Contato</span><p>(11) 99999-9999<br/>contato@imobzy.com.br</p></div>
      </footer>
    </main>
  `;

  const css = `
    .${cls}{--p:${input.palette.primary};--s:${input.palette.secondary};--a:${input.palette.accent};--bg:${input.palette.background};--tx:${input.palette.text};--ft:${input.palette.footer};font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--tx);background:var(--bg);line-height:1.45}
    .${cls} *{box-sizing:border-box}.${cls} a{text-decoration:none}.${cls} .lp-nav{height:78px;padding:0 clamp(22px,5vw,84px);display:flex;align-items:center;justify-content:space-between;background:var(--ft);color:#fff;position:sticky;top:0;z-index:20}.${cls} .lp-logo{display:flex;align-items:center;gap:12px}.${cls} .lp-logo span{width:38px;height:38px;border:2px solid var(--a);display:grid;place-items:center;color:var(--a);font-weight:900;border-radius:10px}.${cls} .lp-logo strong{font-family:Georgia,serif;font-size:20px;letter-spacing:.02em}.${cls} nav{display:flex;gap:32px}.${cls} nav a{font-size:13px;font-weight:800;color:#fff;opacity:.9}.${cls} .lp-whatsapp,.${cls} .lp-primary,.${cls} .lp-secondary,.${cls} .lp-outline{display:inline-flex;align-items:center;justify-content:center;border-radius:8px;font-weight:900}.${cls} .lp-whatsapp{background:var(--a);color:var(--ft);padding:14px 20px}.${cls} .lp-hero{min-height:720px;background-size:cover;background-position:center;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:48px;align-items:center;padding:80px clamp(24px,6vw,110px);color:#fff}.${cls} .lp-badge{display:inline-flex;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);color:var(--a);border-radius:999px;padding:8px 13px;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.${cls} h1,.${cls} h2{font-family:Georgia,"Times New Roman",serif;letter-spacing:-.035em}.${cls} .lp-hero h1{max-width:780px;font-size:clamp(44px,6vw,82px);line-height:.96;margin:22px 0}.${cls} .lp-hero h1 em{font-style:normal;color:var(--a)}.${cls} .lp-hero p{max-width:650px;font-size:20px;color:rgba(255,255,255,.9)}.${cls} .lp-location{margin-top:18px;font-weight:900}.${cls} .lp-price{font-family:Georgia,serif;font-size:38px;margin-top:22px;color:#fff}.${cls} .lp-actions{display:flex;gap:16px;flex-wrap:wrap;margin-top:30px}.${cls} .lp-primary{background:var(--a);color:var(--ft);padding:17px 28px}.${cls} .lp-secondary{border:1px solid rgba(255,255,255,.55);color:#fff;padding:16px 28px}.${cls} .lp-hero-panel{background:rgba(0,0,0,.46);border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:20px;display:grid;gap:12px;backdrop-filter:blur(14px)}.${cls} .lp-hero-panel div,.${cls} .lp-statbar div{display:grid;grid-template-columns:auto 1fr;gap:0 12px;align-items:center}.${cls} .lp-hero-panel span,.${cls} .lp-statbar span{grid-row:span 2;color:var(--a);font-size:26px}.${cls} .lp-hero-panel strong,.${cls} .lp-statbar strong{font-size:18px}.${cls} small{opacity:.72}.${cls} .lp-statbar{display:grid;grid-template-columns:repeat(${Math.min(6, input.stats.length)},1fr);background:var(--p);color:#fff;padding:28px clamp(22px,5vw,90px);gap:22px}.${cls} .lp-section{padding:74px clamp(22px,5vw,90px)}.${cls} .lp-section-title{text-align:center;max-width:760px;margin:0 auto 44px}.${cls} .lp-section-title span,.${cls} .lp-section-head span,.${cls} .lp-map-card span,.${cls} .lp-testimonial span{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:var(--a)}.${cls} .lp-section-title h2,.${cls} .lp-section-head h2,.${cls} .lp-map-card h2,.${cls} .lp-process h2,.${cls} .lp-faq h2{font-size:clamp(32px,4vw,48px);line-height:1.05;margin:10px 0 0}.${cls} .lp-feature-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:22px}.${cls} .lp-feature-grid article{text-align:center;border-right:1px solid rgba(0,0,0,.12);padding:8px 18px}.${cls} .lp-feature-grid article:last-child{border-right:0}.${cls} .lp-feature-grid span{font-size:42px;color:var(--p)}.${cls} .lp-feature-grid h3{margin:14px 0 8px;color:var(--p)}.${cls} .lp-feature-grid p{font-size:14px;color:#586174}.${cls} .lp-dark{background:var(--p);color:#fff}.${cls} .lp-section-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:30px}.${cls} .lp-section-head a{border:1px solid rgba(255,255,255,.5);color:#fff;border-radius:8px;padding:13px 18px;font-weight:900}.${cls} .lp-card-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}.${cls} .lp-card-grid article{border:1px solid rgba(255,255,255,.22);border-radius:14px;overflow:hidden;background:rgba(255,255,255,.04)}.${cls} .lp-card-grid img{width:100%;height:190px;object-fit:cover}.${cls} .lp-card-grid div{padding:18px}.${cls} .lp-card-grid strong{font-size:17px}.${cls} .lp-card-grid p{color:rgba(255,255,255,.72);min-height:40px}.${cls} .lp-card-grid b{color:var(--a)}.${cls} .lp-two-cols{display:grid;grid-template-columns:420px 1fr;gap:42px;align-items:center}.${cls} .lp-map-card p,.${cls} .lp-map-card li{color:#556070}.${cls} .lp-map-card li{margin:10px 0}.${cls} .lp-outline{border:1px solid var(--p);color:var(--p);padding:13px 18px;margin-top:12px}.${cls} .lp-map-image{height:360px;border-radius:22px;background-size:cover;background-position:center;display:grid;place-items:center;box-shadow:0 20px 60px rgba(15,23,42,.12)}.${cls} .lp-map-image strong{background:#fff;border-radius:16px;padding:24px 34px;box-shadow:0 15px 35px rgba(15,23,42,.16);color:var(--p)}.${cls} .lp-process{background:linear-gradient(135deg,var(--p),var(--ft));color:#fff}.${cls} .lp-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}.${cls} .lp-steps div{text-align:center}.${cls} .lp-steps b{width:54px;height:54px;border-radius:999px;background:var(--a);color:var(--ft);display:grid;place-items:center;margin:0 auto 14px;font-size:22px}.${cls} .lp-steps p{color:rgba(255,255,255,.76)}.${cls} .lp-qualification{display:grid;grid-template-columns:1fr 520px;gap:40px;background:#fff}.${cls} .lp-testimonial{border-radius:24px;background:linear-gradient(135deg,var(--ft),var(--p));color:#fff;padding:42px}.${cls} .lp-testimonial h2{font-size:42px}.${cls} .lp-testimonial p{font-size:20px;color:rgba(255,255,255,.84)}.${cls} .lp-form{border-radius:24px;background:#f8fafc;border:1px solid #e5e7eb;padding:34px;display:grid;gap:14px}.${cls} .lp-form h2{font-size:34px;margin:0}.${cls} .lp-form p{margin:0 0 8px;color:#5b6474}.${cls} input,.${cls} select,.${cls} textarea{width:100%;border:1px solid #d9dee8;border-radius:8px;padding:14px;background:#fff;font:inherit}.${cls} textarea{min-height:96px}.${cls} label{font-size:13px;color:#64748b}.${cls} .lp-form button{border:0;border-radius:8px;background:var(--a);color:var(--ft);font-weight:950;padding:16px;cursor:pointer}.${cls} .lp-faq{background:#fbfaf7}.${cls} .lp-faq>div{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.${cls} details{border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:18px}.${cls} summary{font-weight:900;cursor:pointer}.${cls} .lp-footer{display:grid;grid-template-columns:2fr 1fr 1fr;gap:34px;background:var(--ft);color:#fff;padding:44px clamp(22px,5vw,90px)}.${cls} .lp-footer strong{font-family:Georgia,serif;font-size:22px}.${cls} .lp-footer p{color:rgba(255,255,255,.72)}.${cls} .lp-footer span{color:var(--a);font-weight:900}
    @media(max-width:1024px){.${cls} .lp-nav nav{display:none}.${cls} .lp-hero{grid-template-columns:1fr;min-height:auto}.${cls} .lp-hero-panel,.${cls} .lp-statbar,.${cls} .lp-feature-grid,.${cls} .lp-card-grid,.${cls} .lp-steps,.${cls} .lp-faq>div{grid-template-columns:1fr 1fr}.${cls} .lp-two-cols,.${cls} .lp-qualification,.${cls} .lp-footer{grid-template-columns:1fr}}
    @media(max-width:640px){.${cls} .lp-nav{height:auto;padding:16px;gap:12px;flex-wrap:wrap}.${cls} .lp-hero{padding:60px 20px}.${cls} .lp-hero h1{font-size:42px}.${cls} .lp-statbar,.${cls} .lp-feature-grid,.${cls} .lp-card-grid,.${cls} .lp-steps,.${cls} .lp-faq>div{grid-template-columns:1fr}.${cls} .lp-feature-grid article{border-right:0;border-bottom:1px solid rgba(0,0,0,.1)}.${cls} .lp-section-head{align-items:flex-start;flex-direction:column}.${cls} .lp-section{padding:54px 20px}}
  `;

  return {
    id: input.id,
    name: input.name,
    description: input.description,
    thumbnail: input.thumbnail,
    category: input.category,
    group: input.group,
    objective: input.objective,
    style: input.style,
    resources: input.resources,
    tags: [input.group, input.category, input.objective, input.style],
    sections: input.sections,
    sectionCount: input.sections.length,
    pipeline: input.pipeline,
    crmTags: input.crmTags,
    conversionEvent: input.conversionEvent,
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: input.palette.primary,
      secondaryColor: input.palette.accent,
      backgroundColor: input.palette.background,
      textColor: input.palette.text,
      fontFamily: 'Inter',
      headingFontFamily: 'Georgia',
    },
    blocks: [
      templateBlock(
        BlockType.CUSTOM_HTML,
        0,
        { html, css, editableFields },
        { padding: '0' },
        'full'
      ),
    ],
  };
};

export const designedSections = [
  'Header premium',
  'Hero cinematografico',
  'CTAs WhatsApp e agenda',
  'Barra tecnica',
  'Solucoes e diferenciais',
  'Galeria editorial',
  'Mapa/localizacao',
  'Fluxo de atendimento',
  'Prova social',
  'Formulario qualificado',
  'FAQ',
  'Rodape completo',
];

type ElementorReferenceInput = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  group: string;
  category: string;
  objective: string;
  style: string;
  palette: DesignedTemplateInput['palette'];
  logo: string;
  badge: string;
  headline: string;
  highlight?: string;
  subtitle: string;
  price?: string;
  location: string;
  primaryCta: string;
  secondaryCta: string;
  heroImage: string;
  stats: DesignedTemplateInput['stats'];
  features: DesignedTemplateInput['features'];
  cards: DesignedTemplateInput['cards'];
  formTitle: string;
  formSubtitle: string;
  faq: string[];
};

export const refThumb = (name: string) => `/templates/elementor_refs/${name}`;

export const defaultElementorResources = [
  'WhatsApp',
  'Formulario',
  'Galeria',
  'Mapa',
  'FAQ',
  'Agenda',
  'CRM',
  'SEO',
  'LGPD',
];

export const buildElementorReferenceTemplate = (
  input: ElementorReferenceInput
): LandingPageTemplate =>
  buildDesignedTemplate({
    ...input,
    nav: ['Inicio', 'Detalhes', 'Fotos', 'Localizacao', 'FAQ', 'Contato'],
    resources: defaultElementorResources,
    pipeline: `${input.group} - ${input.objective}`,
    crmTags: [`Tema ${input.group}`, input.objective, input.category],
    conversionEvent: 'landing_template_reference_submit',
    sections: designedSections,
  });
