import { LandingPageTheme, Block, BlockType } from '../types/landingPage';
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

export const getTemplateById = (id: string): LandingPageTemplate | undefined => {
  return LANDING_PAGE_TEMPLATES.find((t) => t.id === id);
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

const defaultPremiumTheme: LandingPageTheme = {
  primaryColor: '#111827',
  secondaryColor: '#4f46e5',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  fontFamily: 'Inter',
  borderRadius: '1rem',
  spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '4rem' },
  fontSize: { base: '1rem', heading1: '4rem', heading2: '2.75rem', heading3: '1.75rem' }
};

const templateBlock = (
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
  containerWidth
});

const premiumFormFields = [
  { name: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Seu nome completo' },
  { name: 'phone', label: 'WhatsApp', type: 'tel', required: true, placeholder: '(00) 00000-0000' },
  { name: 'email', label: 'E-mail', type: 'email', required: false, placeholder: 'voce@email.com' },
  {
    name: 'interest',
    label: 'Interesse',
    type: 'select',
    required: true,
    options: ['Agendar visita', 'Falar no WhatsApp', 'Receber material', 'Simular financiamento']
  },
  { name: 'message', label: 'Mensagem', type: 'textarea', required: false, placeholder: 'Conte rapidamente o que voce procura' }
] as any;

const buildPremiumTemplate = (input: PremiumTemplateInput): LandingPageTemplate => {
  const theme = { ...defaultPremiumTheme, ...input.theme };
  const galleryImages = [
    { src: input.thumbnail, alt: input.name, caption: 'Imagem principal' },
    { src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop', alt: 'Ambiente interno', caption: 'Ambientes planejados' },
    { src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1600&auto=format&fit=crop', alt: 'Fachada', caption: 'Fachada e acesso' },
    { src: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1600&auto=format&fit=crop', alt: 'Area externa', caption: 'Area externa' }
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
      templateBlock(BlockType.HERO, 0, {
        title: input.heroTitle,
        subtitle: input.heroSubtitle,
        backgroundImage: input.thumbnail,
        overlayOpacity: 0.42,
        ctaText: input.ctaText,
        ctaLink: '#contato',
        height: 720,
        alignment: 'center',
        textColor: '#ffffff'
      }, { padding: '0' }, 'full'),
      templateBlock(BlockType.STATS, 1, {
        stats: input.stats.map((stat) => ({ ...stat, icon: '' })),
        columns: Math.min(4, input.stats.length)
      }, { padding: '80px 20px', backgroundColor: '#f8fafc' }),
      templateBlock(BlockType.TEXT, 2, {
        content: `<h2>${input.name}</h2><p>${input.description}</p><ul>${input.highlights.map((item) => `<li>${item}</li>`).join('')}</ul>`,
        alignment: 'left',
        fontSize: 18,
        fontWeight: 400,
        color: theme.textColor
      }, { padding: '80px 20px' }),
      templateBlock(BlockType.GALLERY, 3, {
        images: galleryImages,
        columns: 4,
        spacing: 18,
        lightbox: true
      }, { padding: '60px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.VIDEO, 4, {
        title: 'Tour virtual e video de apresentacao',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        autoplay: false,
        loop: false,
        muted: false,
        controls: true,
        coverImage: input.thumbnail
      }, { padding: '70px 20px', backgroundColor: '#f8fafc' }),
      templateBlock(BlockType.MAP, 5, {
        address: input.location,
        title: 'Localizacao estrategica',
        description: 'Mapa integrado para orientar visitas, proximidades e logistica.',
        zoom: 14,
        height: 460,
        showCard: true
      }, { padding: '0' }, 'full'),
      templateBlock(BlockType.TESTIMONIALS, 6, {
        layout: 'grid',
        showRating: true,
        testimonials: [
          { name: 'Cliente comprador', text: 'A pagina trouxe todas as informacoes que eu precisava antes de falar com o corretor.', rating: 5 },
          { name: 'Investidor', text: 'O material tecnico e a agenda facilitaram a tomada de decisao.', rating: 5 },
          { name: 'Corretor responsavel', text: 'Os leads chegam mais qualificados porque a landing ja filtra o interesse.', rating: 5 }
        ]
      }, { padding: '80px 20px', backgroundColor: '#f8fafc' }),
      templateBlock(BlockType.FORM, 7, {
        title: input.formTitle,
        fields: premiumFormFields,
        submitText: input.formSubmit,
        successMessage: 'Recebemos seus dados. Um especialista vai falar com voce.'
      }, { padding: '80px 20px', backgroundColor: '#ffffff' }),
      templateBlock(BlockType.CTA, 8, {
        title: 'Pronto para avancar?',
        description: 'Fale com o corretor, agende uma visita ou receba o material completo no WhatsApp.',
        buttonText: input.ctaText,
        buttonLink: '#contato',
        backgroundColor: theme.primaryColor,
        textColor: '#ffffff'
      }, { padding: '0' }, 'full')
    ]
  };
};

const premiumBaseSections = [
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
  'SEO e LGPD'
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

const landingImage = {
  mansion: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=1920&auto=format&fit=crop',
  house: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop',
  interior: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1600&auto=format&fit=crop',
  condo: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=1600&auto=format&fit=crop',
  warehouse: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1920&auto=format&fit=crop',
  warehouseInside: 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?q=80&w=1600&auto=format&fit=crop',
  farm: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop',
  crops: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop',
  launch: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1920&auto=format&fit=crop',
  luxuryApt: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=1920&auto=format&fit=crop',
  family: 'https://images.unsplash.com/photo-1597047084897-51e81819a499?q=80&w=1920&auto=format&fit=crop',
  lots: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop',
  broker: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1000&auto=format&fit=crop',
  map: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1600&auto=format&fit=crop'
};

const buildDesignedTemplate = (input: DesignedTemplateInput): LandingPageTemplate => {
  const cls = `lp-designed-${input.id}`;
  const fieldToken = (key: string) => `{{${key}}}`;
  const editableFields = [
    { key: 'logo', label: 'Logo / nome da marca', type: 'text' as const, value: input.logo },
    { key: 'whatsappLabel', label: 'Botao do topo', type: 'text' as const, value: 'Fale no WhatsApp' },
    { key: 'badge', label: 'Etiqueta do hero', type: 'text' as const, value: input.badge },
    { key: 'headline', label: 'Titulo principal', type: 'textarea' as const, value: input.headline },
    { key: 'highlight', label: 'Trecho destacado do titulo', type: 'text' as const, value: input.highlight || '' },
    { key: 'subtitle', label: 'Subtitulo', type: 'textarea' as const, value: input.subtitle },
    { key: 'location', label: 'Localizacao', type: 'text' as const, value: input.location },
    { key: 'price', label: 'Preco / chamada de valor', type: 'text' as const, value: input.price || '' },
    { key: 'primaryCta', label: 'Botao principal', type: 'text' as const, value: input.primaryCta },
    { key: 'secondaryCta', label: 'Botao secundario', type: 'text' as const, value: input.secondaryCta },
    { key: 'featuresTitle', label: 'Titulo dos diferenciais', type: 'textarea' as const, value: 'Solucoes desenhadas para converter leads de verdade.' },
    { key: 'galleryTitle', label: 'Titulo da galeria', type: 'textarea' as const, value: input.group === 'Lancamentos' ? 'Ambientes, plantas e diferenciais.' : input.group === 'Rural' ? 'Dados, imagens e materiais tecnicos.' : 'Oportunidades selecionadas para voce.' },
    { key: 'mapTitle', label: 'Titulo da localizacao', type: 'textarea' as const, value: 'Perto do que importa, longe da duvida.' },
    { key: 'processTitle', label: 'Titulo do processo', type: 'textarea' as const, value: 'Fluxo simples, visual e pronto para atendimento.' },
    { key: 'testimonialTitle', label: 'Titulo da prova social', type: 'textarea' as const, value: 'Pagina feita para gerar confianca antes do primeiro contato.' },
    { key: 'testimonialText', label: 'Texto do depoimento', type: 'textarea' as const, value: 'Informacoes completas, atendimento rapido e processo transparente do inicio ao fim.' },
    { key: 'formTitle', label: 'Titulo do formulario', type: 'text' as const, value: input.formTitle },
    { key: 'formSubtitle', label: 'Subtitulo do formulario', type: 'textarea' as const, value: input.formSubtitle },
    { key: 'faqTitle', label: 'Titulo do FAQ', type: 'text' as const, value: 'Duvidas frequentes' },
    { key: 'footerDescription', label: 'Descricao do rodape', type: 'textarea' as const, value: 'Landing premium com WhatsApp, CRM, agenda, SEO, LGPD e funil integrado.' }
  ];
  const formOptions = input.group === 'Rural'
    ? ['Compra de fazenda', 'Venda de fazenda', 'Visita tecnica', 'Receber dossie']
    : input.group === 'Lancamentos'
      ? ['Lista VIP', 'Plantas', 'Simulacao', 'Agendar apresentacao']
      : input.group === 'Aluguel'
        ? ['Visita presencial', 'Visita por video', 'Pre-cadastro', 'WhatsApp']
        : ['Agendar visita', 'Falar no WhatsApp', 'Receber material', 'Avaliacao'];

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
          ${input.stats.slice(0, 4).map((stat) => `
            <div><span>${stat.icon}</span><strong>${stat.value}</strong><small>${stat.label}</small></div>
          `).join('')}
        </aside>
      </section>

      <section class="lp-statbar">
        ${input.stats.map((stat) => `
          <div><span>${stat.icon}</span><strong>${stat.value}</strong><small>${stat.label}</small></div>
        `).join('')}
      </section>

      <section class="lp-section lp-features">
        <div class="lp-section-title">
          <span>Atuacao especializada</span>
          <h2>${fieldToken('featuresTitle')}</h2>
        </div>
        <div class="lp-feature-grid">
          ${input.features.map((feature) => `
            <article>
              <span>${feature.icon}</span>
              <h3>${feature.title}</h3>
              <p>${feature.text}</p>
            </article>
          `).join('')}
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
          ${input.cards.map((card) => `
            <article>
              <img src="${card.image}" alt="${card.title}" />
              <div>
                <strong>${card.title}</strong>
                <p>${card.meta}</p>
                ${card.price ? `<b>${card.price}</b>` : ''}
              </div>
            </article>
          `).join('')}
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
          ${['Contato qualificado', 'Analise do perfil', 'Visita ou material', 'Negociacao segura'].map((step, index) => `
            <div><b>${index + 1}</b><strong>${step}</strong><p>${index === 0 ? 'Lead entra pela landing.' : index === 1 ? 'CRM classifica e organiza.' : index === 2 ? 'Corretor recebe contexto.' : 'Tudo fica registrado.'}</p></div>
          `).join('')}
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
      headingFontFamily: 'Georgia'
    },
    blocks: [
      templateBlock(BlockType.CUSTOM_HTML, 0, { html, css, editableFields }, { padding: '0' }, 'full')
    ]
  };
};

const designedSections = [
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
  'Rodape completo'
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

const refThumb = (name: string) => `/templates/elementor_refs/${name}`;

const defaultElementorResources = [
  'WhatsApp',
  'Formulario',
  'Galeria',
  'Mapa',
  'FAQ',
  'Agenda',
  'CRM',
  'SEO',
  'LGPD'
];

const buildElementorReferenceTemplate = (input: ElementorReferenceInput): LandingPageTemplate =>
  buildDesignedTemplate({
    ...input,
    nav: ['Inicio', 'Detalhes', 'Fotos', 'Localizacao', 'FAQ', 'Contato'],
    resources: defaultElementorResources,
    pipeline: `${input.group} - ${input.objective}`,
    crmTags: [`Tema ${input.group}`, input.objective, input.category],
    conversionEvent: 'landing_template_reference_submit',
    sections: designedSections
  });

const ELEMENTOR_REFERENCE_TEMPLATES: LandingPageTemplate[] = [
  buildElementorReferenceTemplate({
    id: 'elementor-urban-living-rental',
    name: 'Urban Living Locacao 360',
    description: 'Pagina de aluguel residencial com tour 360, galeria, agenda, condicoes e WhatsApp.',
    thumbnail: refThumb('urban-living-rental.png'),
    group: 'Aluguel',
    category: 'Apartamento mobiliado',
    objective: 'Agendar visita',
    style: 'Clean premium',
    palette: { primary: '#0b1f55', secondary: '#0f8ca0', accent: '#20c66b', background: '#ffffff', text: '#102047', footer: '#071b44' },
    logo: 'URBAN LIVING',
    badge: 'Em destaque',
    headline: 'Apartamento moderno para aluguel',
    highlight: 'pronto para morar.',
    subtitle: 'Conforto, elegancia e localizacao privilegiada em uma pagina completa para locacao.',
    price: 'R$ 6.900 /mes',
    location: 'Vila Nova Conceicao, Sao Paulo - SP',
    primaryCta: 'Falar no WhatsApp',
    secondaryCta: 'Ver fotos',
    heroImage: landingImage.interior,
    stats: [
      { label: 'Dormitorios', value: '2', icon: 'B' },
      { label: 'Suite', value: '1', icon: 'S' },
      { label: 'Area util', value: '78 m2', icon: 'M' },
      { label: 'Mobiliado', value: 'Sim', icon: 'K' }
    ],
    features: [
      { title: 'Tour 360', text: 'Experiencia guiada para o lead conhecer tudo antes da visita.', icon: '360' },
      { title: 'Agenda', text: 'Horarios claros e chamada direta para conversao.', icon: 'CAL' },
      { title: 'Garantias', text: 'Condicoes de locacao apresentadas sem friccao.', icon: 'OK' },
      { title: 'Proximidades', text: 'Pontos de interesse organizados para decisao rapida.', icon: 'PIN' },
      { title: 'Corretor', text: 'Responsavel visivel com contato imediato.', icon: 'CRM' }
    ],
    cards: [
      { title: 'Sala integrada', meta: 'Ambientes mobiliados e varanda gourmet.', image: landingImage.interior, price: 'Tour virtual' },
      { title: 'Cozinha planejada', meta: 'Layout funcional para morar bem.', image: landingImage.house },
      { title: 'Localizacao nobre', meta: 'Mapa, rotas e conveniencias proximas.', image: landingImage.map },
      { title: 'Agenda de visita', meta: 'Fluxo simples para confirmar horario.', image: landingImage.condo }
    ],
    formTitle: 'Agende sua visita',
    formSubtitle: 'Escolha o melhor horario e receba confirmacao pelo WhatsApp.',
    faq: ['O apartamento sera alugado mobiliado?', 'Qual o prazo minimo de locacao?', 'Aceita pet?', 'Como funciona a visita?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-maison-dor-penthouse',
    name: 'Maison DOr Cobertura Luxo',
    description: 'Tema escuro editorial para cobertura duplex, alto padrao, plantas, concierge e visita privativa.',
    thumbnail: refThumb('maison-dor-penthouse.png'),
    group: 'Alto Padrao',
    category: 'Cobertura duplex',
    objective: 'Visita privativa',
    style: 'Luxo escuro',
    palette: { primary: '#070707', secondary: '#15110d', accent: '#d6a35d', background: '#080808', text: '#f8f0e4', footer: '#030303' },
    logo: 'MAISON DOR',
    badge: 'Cobertura duplex',
    headline: 'O topo de Sao Paulo',
    highlight: 'e todo seu.',
    subtitle: 'Luxo, privacidade e vistas incomparaveis para compradores de altissimo padrao.',
    price: 'R$ 22.800.000',
    location: 'Itaim Bibi, Sao Paulo - SP',
    primaryCta: 'Agendar visita privativa',
    secondaryCta: 'Ver galeria',
    heroImage: landingImage.luxuryApt,
    stats: [
      { label: 'Suites', value: '4', icon: 'S' },
      { label: 'Vagas', value: '6', icon: 'V' },
      { label: 'Privativos', value: '620 m2', icon: 'M' },
      { label: 'Concierge', value: '24h', icon: 'C' }
    ],
    features: [
      { title: 'Hall privativo', text: 'Chegada exclusiva com percepcao imediata de valor.', icon: '01' },
      { title: 'Rooftop', text: 'Piscina, solarium e vista panoramica.', icon: '02' },
      { title: 'Plantas', text: 'Apresentacao visual de pavimentos e possibilidades.', icon: '03' },
      { title: 'Concierge', text: 'Servicos que antecipam desejos.', icon: '04' },
      { title: 'Exclusividade', text: 'Copy e visual para leads qualificados.', icon: '05' }
    ],
    cards: [
      { title: 'Terraco skyline', meta: 'Cenarios que inspiram.', image: landingImage.luxuryApt },
      { title: 'Living duplex', meta: 'Integracao perfeita.', image: landingImage.interior },
      { title: 'Suite master', meta: 'Privacidade absoluta.', image: landingImage.house },
      { title: 'Planta completa', meta: 'Dois pavimentos inteligentes.', image: landingImage.condo }
    ],
    formTitle: 'Agende sua visita privativa',
    formSubtitle: 'Atendimento exclusivo, reservado e sem atrito.',
    faq: ['Qual o valor do condominio?', 'A cobertura sera entregue mobiliada?', 'E possivel personalizar acabamentos?', 'Como funciona a visita privativa?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-nova-casa-portal',
    name: 'Nova Casa Portal Imobiliario',
    description: 'Home completa para imobiliaria com busca, bairros, imoveis, corretores, blog e captacao.',
    thumbnail: refThumb('nova-casa-portal.png'),
    group: 'Institucional',
    category: 'Imobiliaria urbana',
    objective: 'Buscar imoveis',
    style: 'Portal moderno',
    palette: { primary: '#26323a', secondary: '#f7f3ed', accent: '#c95f3e', background: '#ffffff', text: '#202020', footer: '#1f2b32' },
    logo: 'NOVA CASA',
    badge: 'Imobiliaria',
    headline: 'Viva o melhor de Sao Paulo',
    subtitle: 'Encontre o imovel ideal com quem entende seu estilo de vida.',
    location: 'Sao Paulo - SP',
    primaryCta: 'Buscar imoveis',
    secondaryCta: 'Anunciar imovel',
    heroImage: landingImage.condo,
    stats: [
      { label: 'Anos de mercado', value: '12+', icon: 'A' },
      { label: 'Imoveis vendidos', value: '5.200+', icon: 'I' },
      { label: 'Clientes', value: '8.900+', icon: 'C' },
      { label: 'Satisfacao', value: '98%', icon: 'S' }
    ],
    features: [
      { title: 'Comprar', text: 'Imoveis para morar ou investir.', icon: 'H' },
      { title: 'Alugar', text: 'Opcoes completas para locacao.', icon: 'A' },
      { title: 'Lancamentos', text: 'Empreendimentos em destaque.', icon: 'L' },
      { title: 'Anunciar', text: 'Captacao profissional de proprietarios.', icon: 'V' },
      { title: 'Corretores', text: 'Equipe com atendimento humanizado.', icon: 'C' }
    ],
    cards: [
      { title: 'Apartamento em Moema', meta: '2 dorms, 1 suite, 87 m2.', image: landingImage.interior, price: 'R$ 1.250.000' },
      { title: 'Cobertura em Pinheiros', meta: '3 suites, vista aberta.', image: landingImage.luxuryApt, price: 'R$ 2.980.000' },
      { title: 'Apartamento no Itaim', meta: 'Pronto para alugar.', image: landingImage.house, price: 'R$ 4.800 /mes' },
      { title: 'Edificio Horizonte', meta: 'Lancamento exclusivo.', image: landingImage.launch, price: 'Ver condicoes' }
    ],
    formTitle: 'Fale com a gente',
    formSubtitle: 'Receba atendimento para comprar, alugar ou anunciar.',
    faq: ['Como anunciar meu imovel?', 'Vocês atendem locacao?', 'Posso falar com um corretor?', 'Como recebo novidades?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-nova-corporativo',
    name: 'Nova Properties Corporativo',
    description: 'Landing para laje corporativa, galpao ou sala comercial com ficha tecnica e formulario B2B.',
    thumbnail: refThumb('nova-corporativo.png'),
    group: 'Comercial',
    category: 'Laje corporativa',
    objective: 'Falar com especialista',
    style: 'Corporativo clean',
    palette: { primary: '#0b3558', secondary: '#eef6ff', accent: '#f97316', background: '#ffffff', text: '#0f2f55', footer: '#082b46' },
    logo: 'NOVA PROPERTIES',
    badge: 'Para locacao',
    headline: 'Laje corporativa premium',
    highlight: 'no centro financeiro.',
    subtitle: 'Espaco, tecnologia e imagem para impulsionar sua empresa.',
    price: 'R$ 98.500 /mes',
    location: 'Itaim Bibi, Sao Paulo - SP',
    primaryCta: 'Agendar visita',
    secondaryCta: 'Falar com consultor',
    heroImage: landingImage.warehouse,
    stats: [
      { label: 'Area privativa', value: '1.284 m2', icon: 'M' },
      { label: 'Andar', value: '12 andar', icon: 'A' },
      { label: 'Vagas', value: '28', icon: 'V' },
      { label: 'Pe-direito', value: '2,80 m', icon: 'P' }
    ],
    features: [
      { title: 'Produtividade', text: 'Ambiente moderno para performance.', icon: 'PR' },
      { title: 'Flexibilidade', text: 'Layout adaptavel por equipe.', icon: 'FX' },
      { title: 'Certificacao', text: 'Imagem corporativa e ESG.', icon: 'ESG' },
      { title: 'Localizacao', text: 'Acesso rapido a pontos estrategicos.', icon: 'LOC' },
      { title: 'B2B', text: 'Formulario qualificado para empresas.', icon: 'B2B' }
    ],
    cards: [
      { title: 'Open space', meta: 'Planta livre adaptavel.', image: landingImage.warehouseInside },
      { title: 'Recepcao premium', meta: 'Imagem e seguranca.', image: landingImage.interior },
      { title: 'Vista corporativa', meta: 'Endereco de prestigio.', image: landingImage.warehouse },
      { title: 'Layout tecnico', meta: 'Memorial e plantas.', image: landingImage.map }
    ],
    formTitle: 'Fale com um especialista',
    formSubtitle: 'Preencha os dados e receba mais informacoes sobre este imovel.',
    faq: ['Esta disponivel para ocupacao imediata?', 'Ha possibilidade de customizacao?', 'O condominio possui gerador?', 'Quantas vagas estao inclusas?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-fazendas-valor',
    name: 'Fazendas de Valor Pecuaria',
    description: 'Tema rural escuro para fazenda completa, pecuaria, documentacao, drone e material completo.',
    thumbnail: refThumb('fazendas-valor.png'),
    group: 'Rural',
    category: 'Fazenda pecuaria',
    objective: 'Receber material',
    style: 'Rural premium',
    palette: { primary: '#042b1d', secondary: '#061f17', accent: '#c4974b', background: '#06261a', text: '#f8f0db', footer: '#041912' },
    logo: 'FAZENDAS DE VALOR',
    badge: 'Oportunidade exclusiva',
    headline: 'Fazenda completa para pecuaria',
    subtitle: 'Propriedade pronta para operacao com estrutura, logistica e documentacao.',
    price: 'R$ 24.500.000',
    location: 'Sao Felix do Araguaia - MT',
    primaryCta: 'Falar no WhatsApp',
    secondaryCta: 'Baixar material',
    heroImage: landingImage.farm,
    stats: [
      { label: 'Area total', value: '1.284 ha', icon: 'HA' },
      { label: 'Area aberta', value: '980 ha', icon: 'AB' },
      { label: 'Divisoes', value: '28', icon: 'D' },
      { label: 'Capacidade', value: '2.000 cabecas', icon: 'G' }
    ],
    features: [
      { title: 'Documentacao OK', text: 'CAR, CCIR, ITR e matricula organizados.', icon: 'DOC' },
      { title: 'Recursos hidricos', text: 'Represas, rio e nascentes.', icon: 'AG' },
      { title: 'Benfeitorias', text: 'Sede, curral, energia e cercas.', icon: 'SE' },
      { title: 'Logistica', text: 'Acesso claro para compradores.', icon: 'RO' },
      { title: 'Investimento', text: 'Argumentos fortes de liquidez.', icon: 'R$' }
    ],
    cards: [
      { title: 'A fazenda', meta: 'Apresentacao completa da propriedade.', image: landingImage.farm },
      { title: 'Galeria tecnica', meta: 'Pastos, curral e recursos.', image: landingImage.crops },
      { title: 'Video aereo', meta: 'Drone para gerar confianca.', image: landingImage.lots },
      { title: 'Documentacao', meta: 'Tudo preparado para due diligence.', image: landingImage.map }
    ],
    formTitle: 'Receba o material completo',
    formSubtitle: 'Preencha os dados e receba todas as informacoes da fazenda.',
    faq: ['A fazenda esta pronta para producao?', 'Qual a capacidade de lotacao?', 'A documentacao esta regularizada?', 'A fazenda pode ser visitada?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-captacao-rural',
    name: 'Captacao Rural Leads de Fazendas',
    description: 'Landing de captacao para comprar ou vender fazenda, com funil duplo e prova social.',
    thumbnail: refThumb('captacao-rural.png'),
    group: 'Captacao',
    category: 'Leads rurais',
    objective: 'Captar comprador/vendedor',
    style: 'Conversao rural',
    palette: { primary: '#064e2b', secondary: '#eff7ec', accent: '#d6a733', background: '#ffffff', text: '#17231b', footer: '#071a12' },
    logo: 'CAPTACAO RURAL',
    badge: 'Leads de fazendas',
    headline: 'Quer comprar ou vender fazenda?',
    highlight: 'A gente conecta voce.',
    subtitle: 'Leads qualificados, informacoes reais e verificadas para decisoes mais rapidas.',
    location: 'Atuacao nacional',
    primaryCta: 'Quero comprar fazenda',
    secondaryCta: 'Quero vender minha fazenda',
    heroImage: landingImage.crops,
    stats: [
      { label: 'Clientes atendidos', value: '+2.500', icon: 'CL' },
      { label: 'Leads qualificados', value: '+7.800', icon: 'LD' },
      { label: 'Satisfacao', value: '+98%', icon: 'OK' },
      { label: 'Cobertura', value: 'Brasil', icon: 'BR' }
    ],
    features: [
      { title: 'Leads qualificados', text: 'Perfis selecionados para compra ou venda.', icon: 'AL' },
      { title: 'Dados reais', text: 'Informacoes completas e conferidas.', icon: 'DT' },
      { title: 'Agilidade', text: 'Conexao rapida com oportunidades.', icon: 'RA' },
      { title: 'Sigilo', text: 'Processo discreto e profissional.', icon: 'SG' },
      { title: 'Cobertura', text: 'Regioes agricolas do Brasil.', icon: 'BR' }
    ],
    cards: [
      { title: 'Quero comprar', meta: 'Receba oportunidades compativeis.', image: landingImage.farm },
      { title: 'Quero vender', meta: 'Capte compradores qualificados.', image: landingImage.crops },
      { title: 'Cobertura nacional', meta: 'Mapa de atuacao por regiao.', image: landingImage.map },
      { title: 'Depoimentos', meta: 'Prova social para conversao.', image: landingImage.broker }
    ],
    formTitle: 'Receba oportunidades',
    formSubtitle: 'Preencha rapidinho e comece a receber leads qualificados.',
    faq: ['Os leads sao qualificados?', 'Meus dados ficam seguros?', 'Atendem todo o Brasil?', 'Em quanto tempo recebo oportunidades?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-nexo-studios',
    name: 'Nexo Studios Investimento',
    description: 'Pre-lancamento para studios compactos com foco em rentabilidade, demanda e lista VIP.',
    thumbnail: refThumb('nexo-studios.png'),
    group: 'Lancamentos',
    category: 'Studios para investimento',
    objective: 'Lista VIP',
    style: 'Tech neon',
    palette: { primary: '#07111a', secondary: '#101820', accent: '#c7ff17', background: '#07111a', text: '#f8fafc', footer: '#050b10' },
    logo: 'NEXO STUDIOS',
    badge: 'Lancamento exclusivo',
    headline: 'Studios inteligentes.',
    highlight: 'Rentabilidade real.',
    subtitle: 'Studios compactos e completos para investir com seguranca e lucrar com locacao.',
    location: 'Centro financeiro',
    primaryCta: 'Quero receber a tabela',
    secondaryCta: 'Ver plantas',
    heroImage: landingImage.launch,
    stats: [
      { label: 'Rentabilidade ao mes', value: '0,8% a 1,2%', icon: 'R' },
      { label: 'Ao ano estimado', value: '10% a 14%', icon: 'A' },
      { label: 'Locacao', value: 'Alta demanda', icon: 'D' },
      { label: 'Metro', value: '350 m', icon: 'M' }
    ],
    features: [
      { title: 'Gestao facil', text: 'Locacao sem complicacao para investidores.', icon: 'APP' },
      { title: 'Alta demanda', text: 'Regiao preparada para short stay.', icon: 'UP' },
      { title: 'Plantas compactas', text: 'Studios S, M e L apresentados visualmente.', icon: 'PL' },
      { title: 'Amenidades', text: 'Rooftop, coworking e lavanderia.', icon: 'AM' },
      { title: 'Lista VIP', text: 'Captura para condicoes antecipadas.', icon: 'VIP' }
    ],
    cards: [
      { title: 'Studio S', meta: '21 m2, ideal para locacao solo.', image: landingImage.interior },
      { title: 'Studio M', meta: '27 m2, maior procura.', image: landingImage.house },
      { title: 'Studio L', meta: '33 m2, ticket medio alto.', image: landingImage.condo },
      { title: 'App de gestao', meta: 'Performance para o investidor.', image: landingImage.map }
    ],
    formTitle: 'Entre para a lista VIP',
    formSubtitle: 'Receba tabela, preco, plantas e condicoes de lancamento.',
    faq: ['Qual o retorno esperado?', 'Qual o modelo de gestao?', 'Posso financiar?', 'Quando fica pronto?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-vale-do-sol-loteamento',
    name: 'Vale do Sol Loteamento',
    description: 'Tema para loteamento com masterplan, infraestrutura, lotes, mapa e agenda de visita.',
    thumbnail: refThumb('vale-do-sol-loteamento.png'),
    group: 'Loteamentos',
    category: 'Lotes residenciais',
    objective: 'Escolher lote',
    style: 'Natural sofisticado',
    palette: { primary: '#354322', secondary: '#f2eee4', accent: '#c4a45e', background: '#fbf8ef', text: '#1e2417', footer: '#25271e' },
    logo: 'VALE DO SOL',
    badge: 'Lotes em condominio',
    headline: 'O lugar certo para construir',
    highlight: 'seus melhores planos.',
    subtitle: 'Lotes residenciais em regiao de valorizacao com infraestrutura completa.',
    price: 'A partir de R$ 89.900',
    location: 'Regiao em crescimento',
    primaryCta: 'Escolher meu lote',
    secondaryCta: 'Ver masterplan',
    heroImage: landingImage.lots,
    stats: [
      { label: 'Lotes', value: '250 m2+', icon: 'LT' },
      { label: 'Entrada', value: 'Facilitada', icon: 'EF' },
      { label: 'Parcelas', value: '120x', icon: '120' },
      { label: 'Documentacao', value: '100%', icon: 'OK' }
    ],
    features: [
      { title: 'Masterplan', text: 'Quadras, lotes e status de disponibilidade.', icon: 'MP' },
      { title: 'Infraestrutura', text: 'Agua, luz, drenagem e pavimentacao.', icon: 'IF' },
      { title: 'Localizacao', text: 'Mapa estrategico e pontos proximos.', icon: 'LC' },
      { title: 'Condicoes', text: 'Pagamento facilitado e simulacao.', icon: 'R$' },
      { title: 'Agenda', text: 'Visita guiada com consultor.', icon: 'AG' }
    ],
    cards: [
      { title: 'Masterplan', meta: 'Mapa visual dos lotes.', image: landingImage.lots },
      { title: 'Infraestrutura', meta: 'Tudo que sua familia merece.', image: landingImage.farm },
      { title: 'Galeria', meta: 'Visualize o futuro aqui.', image: landingImage.crops },
      { title: 'Localizacao', meta: 'Perto de tudo.', image: landingImage.map }
    ],
    formTitle: 'Fale com um consultor',
    formSubtitle: 'Receba tabela completa, disponibilidade e condicoes.',
    faq: ['Quais sao os tamanhos dos lotes?', 'A documentacao esta regularizada?', 'Posso construir imediatamente?', 'Como faco para reservar um lote?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-reserva-dos-ipes',
    name: 'Reserva dos Ipes Condominio',
    description: 'Lancamento de condominio horizontal com cadastro VIP, casas, lazer, countdown e material completo.',
    thumbnail: refThumb('reserva-dos-ipes.png'),
    group: 'Lancamentos',
    category: 'Condominio horizontal',
    objective: 'Cadastro VIP',
    style: 'Natureza luxo',
    palette: { primary: '#18371f', secondary: '#f5efe3', accent: '#b8733f', background: '#fbf6ee', text: '#26301f', footer: '#142817' },
    logo: 'RESERVA DOS IPES',
    badge: 'Lancamento exclusivo',
    headline: 'Viva o privilegio',
    highlight: 'de pertencer.',
    subtitle: 'Um condominio horizontal cercado pela natureza, com seguranca total e lazer de clube.',
    location: 'Condominio horizontal exclusivo',
    primaryCta: 'Quero ser VIP',
    secondaryCta: 'Ver masterplan',
    heroImage: landingImage.farm,
    stats: [
      { label: 'Area total', value: '310.000 m2', icon: 'AT' },
      { label: 'Lotes', value: '120', icon: 'LT' },
      { label: 'Area verde', value: '+70.000 m2', icon: 'AV' },
      { label: 'Entrega', value: 'Dez/2027', icon: 'EN' }
    ],
    features: [
      { title: 'Casas autorais', text: 'Plantas de alto padrao para familias exigentes.', icon: 'CA' },
      { title: 'Clube exclusivo', text: 'Piscina, spa, quadras e salao.', icon: 'CL' },
      { title: 'Seguranca', text: 'Portaria blindada e monitoramento.', icon: 'SG' },
      { title: 'Natureza', text: 'Paisagismo e areas preservadas.', icon: 'NA' },
      { title: 'Lista VIP', text: 'Condicoes antecipadas de lancamento.', icon: 'VIP' }
    ],
    cards: [
      { title: 'Masterplan', meta: 'Projeto feito para pertencimento.', image: landingImage.lots },
      { title: 'Casa Ipe Amarelo', meta: '250 m2 e terreno amplo.', image: landingImage.house },
      { title: 'Casa Ipe Branco', meta: '320 m2 com lazer privativo.', image: landingImage.condo },
      { title: 'Lazer completo', meta: 'Para todas as idades.', image: landingImage.farm }
    ],
    formTitle: 'Fale com um especialista',
    formSubtitle: 'Receba tabela, plantas e condicoes de lancamento.',
    faq: ['Qual o valor medio das casas?', 'Quais sao as formas de pagamento?', 'Qual a previsao de entrega?', 'O condominio permite animais?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-avaliacao-gratuita',
    name: 'Avaliacao Gratuita de Imovel',
    description: 'Landing agressiva de captacao de proprietarios com avaliacao gratuita, comparativo e WhatsApp.',
    thumbnail: refThumb('avaliacao-gratuita.png'),
    group: 'Captacao',
    category: 'Avaliacao de imovel',
    objective: 'Avaliar imovel',
    style: 'Conversao alta',
    palette: { primary: '#06472d', secondary: '#f7f2e6', accent: '#e0a622', background: '#ffffff', text: '#122019', footer: '#092018' },
    logo: 'NOVA CASA',
    badge: 'Quero vender meu imovel',
    headline: 'Avaliacao',
    highlight: 'gratuita.',
    subtitle: 'Venda com seguranca, rapidez e pelo melhor preco de mercado.',
    location: 'Campinas e regiao',
    primaryCta: 'Quero minha avaliacao gratuita',
    secondaryCta: 'Chamar no WhatsApp',
    heroImage: landingImage.condo,
    stats: [
      { label: 'Imoveis vendidos', value: '+1.200', icon: 'V' },
      { label: 'Avaliacao', value: '4,9/5', icon: 'ST' },
      { label: 'Taxa de sucesso', value: '98%', icon: 'OK' },
      { label: 'Media para vender', value: '23 dias', icon: 'DI' }
    ],
    features: [
      { title: 'Avaliacao precisa', text: 'Estudo completo de mercado.', icon: 'AV' },
      { title: 'Divulgacao maxima', text: 'Portais e redes sociais.', icon: 'MK' },
      { title: 'Atendimento premium', text: 'Acompanhamento proximo.', icon: 'AT' },
      { title: 'Venda rapida', text: 'Estrategia para reduzir burocracia.', icon: 'VR' },
      { title: 'Seguranca total', text: 'Documentacao e negociacao segura.', icon: 'SG' }
    ],
    cards: [
      { title: 'Formulario de avaliacao', meta: 'Dados essenciais para precificar.', image: landingImage.house },
      { title: 'Comparativo', meta: 'Nova Casa vs venda por conta propria.', image: landingImage.map },
      { title: 'Prova social', meta: 'Quem vendeu recomenda.', image: landingImage.broker },
      { title: 'WhatsApp CTA', meta: 'Conversao rapida no rodape.', image: landingImage.interior }
    ],
    formTitle: 'Receba agora sua avaliacao gratuita',
    formSubtitle: 'Sem compromisso e 100% online.',
    faq: ['A avaliacao realmente e gratuita?', 'Preciso assinar contrato?', 'Em quanto tempo recebo?', 'Como e feita a divulgacao?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-refugio-serra',
    name: 'Refugio da Serra Sitio',
    description: 'Tema emocional para sitio, chacara ou lazer rural com fotos, video drone, mapa e agendamento.',
    thumbnail: refThumb('refugio-serra.png'),
    group: 'Rural',
    category: 'Sitio e lazer',
    objective: 'Agendar visita',
    style: 'Editorial natural',
    palette: { primary: '#5c6f52', secondary: '#fbf4e8', accent: '#b96546', background: '#fffaf1', text: '#33402f', footer: '#5f7058' },
    logo: 'REFUGIO DA SERRA',
    badge: 'Seu lugar para viver bem',
    headline: 'Mais natureza. Mais tempo.',
    highlight: 'Mais vida.',
    subtitle: 'Um sitio completo para lazer, descanso e qualidade de vida para toda a familia.',
    price: 'R$ 1.250.000',
    location: 'Aguas de Santa Barbara - SP',
    primaryCta: 'Falar no WhatsApp',
    secondaryCta: 'Receber mais fotos',
    heroImage: landingImage.farm,
    stats: [
      { label: 'Documentacao', value: 'Em dia', icon: 'DOC' },
      { label: 'Regiao', value: '2h de SP', icon: 'SP' },
      { label: 'Lazer', value: 'Completo', icon: 'LZ' },
      { label: 'Visita', value: 'Agendada', icon: 'AG' }
    ],
    features: [
      { title: 'Lago privativo', text: 'Natureza presente todos os dias.', icon: 'LA' },
      { title: 'Piscina', text: 'Lazer para familia e amigos.', icon: 'PI' },
      { title: 'Pomar', text: 'Vida no campo com conforto.', icon: 'PO' },
      { title: 'Casa sede', text: 'Ambiente acolhedor e funcional.', icon: 'CS' },
      { title: 'Internet', text: 'Conexao para morar ou descansar.', icon: 'WI' }
    ],
    cards: [
      { title: 'Conheca cada detalhe', meta: 'Galeria emocional.', image: landingImage.farm },
      { title: 'Veja de cima', meta: 'Video com drone.', image: landingImage.crops },
      { title: 'Localizacao', meta: 'Equilibrio entre tranquilidade e acesso.', image: landingImage.map },
      { title: 'Viva o campo', meta: 'Momentos para ficar na memoria.', image: landingImage.house }
    ],
    formTitle: 'Fale com a gente',
    formSubtitle: 'Respostas rapidas pelo WhatsApp.',
    faq: ['A propriedade possui documentacao?', 'Qual o tamanho total do terreno?', 'A casa e mobiliada?', 'E possivel financiamento?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-campocerto-plantio',
    name: 'CampoCerto Fazenda Plantio',
    description: 'Landing clara para fazenda agricola com produtividade, solo, mapa, documentacao e investimento.',
    thumbnail: refThumb('campocerto-plantio.png'),
    group: 'Rural',
    category: 'Plantio',
    objective: 'Solicitar informacoes',
    style: 'Agro clean',
    palette: { primary: '#075d2c', secondary: '#f7f9f0', accent: '#f4c430', background: '#ffffff', text: '#0d2417', footer: '#04451f' },
    logo: 'CAMPOCERTO',
    badge: 'Fazenda para plantio',
    headline: 'Fazenda para Plantio',
    subtitle: 'Alta produtividade, solo de qualidade e logistica estrategica.',
    price: 'R$ 38.500.000',
    location: 'Santa Helena do Oeste - PR',
    primaryCta: 'Quero mais informacoes',
    secondaryCta: 'Agendar visita',
    heroImage: landingImage.crops,
    stats: [
      { label: 'Area total', value: '1.240 ha', icon: 'HA' },
      { label: 'Agricultavel', value: '1.028 ha', icon: 'AG' },
      { label: 'Solo', value: 'Latossolo', icon: 'SO' },
      { label: 'Logistica', value: 'Ate 75 km', icon: 'LO' }
    ],
    features: [
      { title: 'Solo fertil', text: 'Alta aptidao para graos e fibras.', icon: 'SO' },
      { title: 'Relevo suave', text: 'Facilidade de mecanizacao.', icon: 'RL' },
      { title: 'Pluviometria', text: 'Indice bem distribuido.', icon: 'CH' },
      { title: 'Documentacao', text: '100% regularizada.', icon: 'DOC' },
      { title: 'Tese de investimento', text: 'Argumentos para decisao.', icon: 'TI' }
    ],
    cards: [
      { title: 'Galeria agricola', meta: 'Talhoes e lavouras.', image: landingImage.crops },
      { title: 'Mapa da propriedade', meta: 'Poligono e distancias.', image: landingImage.map },
      { title: 'Potencial produtivo', meta: 'Safras e medias.', image: landingImage.farm },
      { title: 'Infraestrutura', meta: 'Energia, agua e benfeitorias.', image: landingImage.lots }
    ],
    formTitle: 'Receba informacoes completas',
    formSubtitle: 'Preencha o formulario e fale com um especialista.',
    faq: ['Qual e a porcentagem de reserva legal?', 'Ha passivos ambientais?', 'E possivel financiamento?', 'Ha arrendamento vigente?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-corretor-pessoal',
    name: 'Corretor Pessoal Alto Padrao',
    description: 'Site institucional de corretor com autoridade, imoveis selecionados, avaliacao e contato.',
    thumbnail: refThumb('corretor-pessoal.png'),
    group: 'Institucional',
    category: 'Corretor premium',
    objective: 'Falar no WhatsApp',
    style: 'Autoridade premium',
    palette: { primary: '#07382c', secondary: '#fff8ec', accent: '#c99b45', background: '#ffffff', text: '#1c221e', footer: '#061d1c' },
    logo: 'SEU NOME',
    badge: 'Confianca. Experiencia. Resultados.',
    headline: 'Realizo o seu melhor negocio imobiliario.',
    subtitle: 'Especialista em conectar pessoas a imoveis e oportunidades que valorizam patrimonio e realizam sonhos.',
    location: 'Sao Jose dos Campos - SP',
    primaryCta: 'Ver imoveis a venda',
    secondaryCta: 'Avaliacao gratuita',
    heroImage: landingImage.mansion,
    stats: [
      { label: 'Anos de experiencia', value: '+8', icon: 'EX' },
      { label: 'Imoveis negociados', value: '+300', icon: 'IM' },
      { label: 'Atendimento', value: 'Humanizado', icon: 'AT' },
      { label: 'Negociacao', value: 'Segura', icon: 'NG' }
    ],
    features: [
      { title: 'Residenciais', text: 'Casas e apartamentos para morar.', icon: 'RE' },
      { title: 'Comerciais', text: 'Salas, lojas e espacos comerciais.', icon: 'CO' },
      { title: 'Terrenos', text: 'Oportunidades para investir.', icon: 'TE' },
      { title: 'Investimentos', text: 'Renda e valorizacao segura.', icon: 'IN' },
      { title: 'Aluguel', text: 'Opcoes selecionadas.', icon: 'AL' }
    ],
    cards: [
      { title: 'Casa em condominio', meta: '3 suites, 4 banheiros.', image: landingImage.mansion, price: 'R$ 1.580.000' },
      { title: 'Apartamento alto padrao', meta: '3 quartos e vista.', image: landingImage.interior, price: 'R$ 950.000' },
      { title: 'Sala comercial', meta: 'Jardim Aquarius.', image: landingImage.warehouse, price: 'R$ 420.000' },
      { title: 'Terreno em condominio', meta: 'Urbanova.', image: landingImage.lots, price: 'R$ 680.000' }
    ],
    formTitle: 'Fale comigo',
    formSubtitle: 'Preencha o formulario que retorno rapidinho.',
    faq: ['Como funciona a avaliacao?', 'Quais documentos sao necessarios?', 'Vocês atendem outras regioes?', 'Como e feita a divulgacao?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-galpao-logistico',
    name: 'Galpao Logistico Premium',
    description: 'Landing comercial para galpao logistico com ficha tecnica, localizacao, vantagens e visita tecnica.',
    thumbnail: refThumb('galpao-logistico.png'),
    group: 'Comercial',
    category: 'Galpao logistico',
    objective: 'Agendar visita tecnica',
    style: 'Industrial premium',
    palette: { primary: '#061b35', secondary: '#f8fbff', accent: '#ff6b1a', background: '#ffffff', text: '#0b1d35', footer: '#05182f' },
    logo: 'NOVA IMOVEIS CORPORATIVOS',
    badge: 'Imovel comercial / galpao',
    headline: 'Galpao logistico premium',
    highlight: 'em localizacao estrategica.',
    subtitle: 'Estrutura moderna, seguranca e eficiencia para impulsionar sua operacao.',
    price: 'R$ 168.000 /mes',
    location: 'Cajamar - SP',
    primaryCta: 'Agendar visita',
    secondaryCta: 'Fale com especialista',
    heroImage: landingImage.warehouse,
    stats: [
      { label: 'Area construida', value: '12.500 m2', icon: 'AC' },
      { label: 'Terreno', value: '20.000 m2', icon: 'AT' },
      { label: 'Docas', value: '16', icon: 'DC' },
      { label: 'Energia', value: '750 KVA', icon: 'EN' }
    ],
    features: [
      { title: 'Acesso rapido', text: 'Conexao com principais rodovias.', icon: 'AR' },
      { title: 'Mao de obra', text: 'Regiao com oferta profissional.', icon: 'MO' },
      { title: 'Seguranca', text: 'Controle 24h e portaria.', icon: 'SG' },
      { title: 'Infraestrutura', text: 'Servicos essenciais proximos.', icon: 'IF' },
      { title: 'Escalabilidade', text: 'Estrutura pronta para crescer.', icon: 'ES' }
    ],
    cards: [
      { title: 'Interior amplo', meta: 'Piso industrial e pe-direito livre.', image: landingImage.warehouseInside },
      { title: 'Docas elevadas', meta: 'Operacao eficiente.', image: landingImage.warehouse },
      { title: 'Video aereo', meta: 'Visao completa do ativo.', image: landingImage.map },
      { title: 'Equipe tecnica', meta: 'Visita consultiva.', image: landingImage.broker }
    ],
    formTitle: 'Receba mais informacoes',
    formSubtitle: 'Nosso time entra em contato com dados tecnicos.',
    faq: ['Disponivel para venda ou locacao?', 'Qual o prazo minimo?', 'O condominio esta incluso?', 'Ha possibilidade de expansao?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-casa-aluguel',
    name: 'Villaggio Casa para Aluguel',
    description: 'Tema completo para casa terrea de aluguel com tour 360, pet friendly, garantias e agenda.',
    thumbnail: refThumb('casa-aluguel.png'),
    group: 'Aluguel',
    category: 'Casa terrea',
    objective: 'Agendar visita',
    style: 'Residencial clean',
    palette: { primary: '#071837', secondary: '#f7f7fb', accent: '#d09a34', background: '#ffffff', text: '#0e1a34', footer: '#061633' },
    logo: 'VILLAGGIO IMOVEIS',
    badge: 'Para alugar',
    headline: 'Casa terrea moderna',
    highlight: 'para aluguel.',
    subtitle: 'Casa pronta para morar com fotos, tour, garantias e agendamento em poucos cliques.',
    price: 'R$ 3.750 /mes',
    location: 'Jardim das Flores, Campinas - SP',
    primaryCta: 'Agendar visita',
    secondaryCta: 'Falar no WhatsApp',
    heroImage: landingImage.house,
    stats: [
      { label: 'Quartos', value: '3', icon: 'Q' },
      { label: 'Banheiros', value: '2', icon: 'B' },
      { label: 'Area', value: '120 m2', icon: 'A' },
      { label: 'Vagas', value: '2', icon: 'V' }
    ],
    features: [
      { title: 'Tour virtual', text: 'Ambientes navegaveis por comodo.', icon: '360' },
      { title: 'Pet friendly', text: 'Espaco para animais de pequeno porte.', icon: 'PET' },
      { title: 'Garantias', text: 'Seguro fianca, fiador e titulo.', icon: 'OK' },
      { title: 'Agenda', text: 'Presencial ou por video.', icon: 'AG' },
      { title: 'Corretor', text: 'Responsavel claro e acessivel.', icon: 'CR' }
    ],
    cards: [
      { title: 'Fachada moderna', meta: 'Jardim e garagem coberta.', image: landingImage.house },
      { title: 'Sala de estar', meta: 'Tour 360 por ambientes.', image: landingImage.interior },
      { title: 'Area gourmet', meta: 'Espaco externo completo.', image: landingImage.condo },
      { title: 'Agenda de visita', meta: 'Fluxo em 4 etapas.', image: landingImage.broker }
    ],
    formTitle: 'Agendar visita',
    formSubtitle: 'Escolha a melhor forma de conhecer seu proximo lar.',
    faq: ['O imovel aceita criancas?', 'Quais sao as garantias aceitas?', 'Posso fazer alteracoes?', 'Como funciona visita por video?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-fazenda-produtiva',
    name: 'Fazenda Produtiva Venda',
    description: 'Tema rural elegante para fazenda produtiva, ativos, video drone, benfeitorias e material completo.',
    thumbnail: refThumb('fazenda-produtiva.png'),
    group: 'Rural',
    category: 'Fazenda produtiva',
    objective: 'Receber material',
    style: 'Rural classico',
    palette: { primary: '#17381d', secondary: '#f4f0e4', accent: '#d5b562', background: '#fbf8ee', text: '#1f281b', footer: '#102516' },
    logo: 'IMOBILIARIA RURAL',
    badge: 'Oportunidade exclusiva',
    headline: 'Fazenda produtiva',
    highlight: 'a venda.',
    subtitle: 'Ativo rural com produtividade comprovada, estrutura completa e documentacao para transferencia.',
    price: 'R$ 68.000.000',
    location: 'Campo Verde - MT',
    primaryCta: 'Falar no WhatsApp',
    secondaryCta: 'Receber material',
    heroImage: landingImage.farm,
    stats: [
      { label: 'Area total', value: '2.350 ha', icon: 'HA' },
      { label: 'Area aberta', value: '1.880 ha', icon: 'AB' },
      { label: 'Plantio', value: '1.720 ha', icon: 'PL' },
      { label: 'Topografia', value: 'Plana', icon: 'TP' }
    ],
    features: [
      { title: 'Produtividade', text: 'Historico de safras fortes.', icon: 'PR' },
      { title: 'Logistica', text: 'Acesso facil a armazens.', icon: 'LO' },
      { title: 'Recursos hidricos', text: 'Rios, represas e nascentes.', icon: 'AG' },
      { title: 'Documentacao', text: 'CAR, CCIR, SIGEF e matricula.', icon: 'DOC' },
      { title: 'Investimento', text: 'Liquidez e seguranca patrimonial.', icon: 'IN' }
    ],
    cards: [
      { title: 'Galeria da fazenda', meta: 'Talhoes, sede e estruturas.', image: landingImage.farm },
      { title: 'Video aereo', meta: 'Drone para inspecao visual.', image: landingImage.crops },
      { title: 'Benfeitorias', meta: 'Casa sede, curral e energia.', image: landingImage.house },
      { title: 'Localizacao', meta: 'Mapa de rota e logistica.', image: landingImage.map }
    ],
    formTitle: 'Receba o material completo',
    formSubtitle: 'Preencha seus dados e receba o dossie completo da fazenda.',
    faq: ['A fazenda esta arrendada?', 'Qual a forma de pagamento?', 'Aceita permuta?', 'A documentacao esta em dia?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-urbana-casa-venda',
    name: 'Urbana Casa Venda',
    description: 'Landing residencial de venda com hero impactante, galeria, mapa, diferenciais, depoimento e formulario.',
    thumbnail: refThumb('urbana-casa-venda.png'),
    group: 'Venda',
    category: 'Casa alto padrao',
    objective: 'Agendar visita',
    style: 'Residencial premium',
    palette: { primary: '#061a32', secondary: '#f9fafb', accent: '#bd8b3b', background: '#ffffff', text: '#101827', footer: '#061a32' },
    logo: 'URBANA IMOVEIS',
    badge: 'Casa a venda',
    headline: 'Sua nova historia',
    highlight: 'comeca aqui.',
    subtitle: 'Conforto, design e localizacao privilegiada em uma casa pronta para morar.',
    price: 'R$ 1.290.000',
    location: 'Jardim das Flores, Campinas - SP',
    primaryCta: 'Falar no WhatsApp',
    secondaryCta: 'Agendar visita',
    heroImage: landingImage.mansion,
    stats: [
      { label: 'Quartos', value: '4', icon: 'Q' },
      { label: 'Suites', value: '2', icon: 'S' },
      { label: 'Area construida', value: '180 m2', icon: 'AC' },
      { label: 'Terreno', value: '250 m2', icon: 'AT' }
    ],
    features: [
      { title: 'Projeto moderno', text: 'Ambientes amplos e integrados.', icon: 'PM' },
      { title: 'Area gourmet', text: 'Conforto para receber.', icon: 'AG' },
      { title: 'Piscina', text: 'Lazer privativo.', icon: 'PI' },
      { title: 'Acabamentos', text: 'Materiais de alto padrao.', icon: 'AP' },
      { title: 'Seguranca', text: 'Portao e monitoramento.', icon: 'SG' }
    ],
    cards: [
      { title: 'Galeria de fotos', meta: 'Ambientes selecionados.', image: landingImage.interior },
      { title: 'Localizacao', meta: 'Tudo perto de voce.', image: landingImage.map },
      { title: 'Depoimentos', meta: 'Confianca de quem comprou.', image: landingImage.house },
      { title: 'Contato', meta: 'Formulario e WhatsApp.', image: landingImage.broker }
    ],
    formTitle: 'Interessado neste imovel?',
    formSubtitle: 'Preencha o formulario e receba mais informacoes.',
    faq: ['Aceita financiamento?', 'Qual o valor do IPTU?', 'O imovel esta averbado?', 'E possivel comprar com FGTS?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-maison-vertice',
    name: 'Maison Vertice Residences',
    description: 'Tema escuro ultra premium para empreendimento vertical, plantas, lazer, rooftop e visita privativa.',
    thumbnail: refThumb('maison-vertice.png'),
    group: 'Alto Padrao',
    category: 'Empreendimento vertical',
    objective: 'Agendar visita',
    style: 'Luxo escuro',
    palette: { primary: '#080909', secondary: '#17110c', accent: '#c49345', background: '#090909', text: '#f7efe5', footer: '#050505' },
    logo: 'MAISON VERTICE',
    badge: 'Lancamento exclusivo',
    headline: 'Apartamentos de alto padrao que',
    highlight: 'elevam seu estilo de viver.',
    subtitle: 'Sofisticacao, conforto e localizacao privilegiada no coracao do bairro mais desejado.',
    price: 'A partir de R$ 2.950.000',
    location: 'Vila Nova Conceicao, Sao Paulo - SP',
    primaryCta: 'Agendar visita privativa',
    secondaryCta: 'Fale com consultor',
    heroImage: landingImage.luxuryApt,
    stats: [
      { label: 'Area privativa', value: '143 a 198 m2', icon: 'AP' },
      { label: 'Suites', value: '3 a 4', icon: 'ST' },
      { label: 'Vagas', value: '2 a 3', icon: 'VG' },
      { label: 'Torre', value: '28 pavimentos', icon: 'TR' }
    ],
    features: [
      { title: 'Lazer completo', text: 'Piscina, academia e spa.', icon: 'LZ' },
      { title: 'Galeria editorial', text: 'Ambientes de alto impacto visual.', icon: 'GL' },
      { title: 'Plantas inteligentes', text: 'Espacos pensados para cada momento.', icon: 'PL' },
      { title: 'Rooftop', text: 'Vista panoramica da cidade.', icon: 'RF' },
      { title: 'Visita privativa', text: 'Atendimento reservado.', icon: 'VP' }
    ],
    cards: [
      { title: 'Living panoramico', meta: 'Ambientes que inspiram.', image: landingImage.luxuryApt },
      { title: 'Plantas', meta: 'Layouts flexiveis.', image: landingImage.interior },
      { title: 'Rooftop', meta: 'Piscina e lounge.', image: landingImage.condo },
      { title: 'Localizacao', meta: 'Vila Nova Conceicao.', image: landingImage.map }
    ],
    formTitle: 'Receba mais informacoes',
    formSubtitle: 'Saiba tudo sobre o Maison Vertice.',
    faq: ['Qual o prazo de entrega?', 'Como funciona a personalizacao?', 'Quais sao as formas de pagamento?', 'Ha unidades decoradas?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-vista-do-vale',
    name: 'Vista do Vale Lista VIP',
    description: 'Pre-lancamento residencial com lista VIP, localizacao, plantas, lazer, obra e countdown.',
    thumbnail: refThumb('vista-do-vale.png'),
    group: 'Lancamentos',
    category: 'Residencial vertical',
    objective: 'Lista VIP',
    style: 'Lancamento premium',
    palette: { primary: '#064334', secondary: '#f9f3e8', accent: '#d8b16c', background: '#ffffff', text: '#17231f', footer: '#063a31' },
    logo: 'VISTA DO VALE',
    badge: 'Lancamento exclusivo',
    headline: 'O novo endereco dos seus melhores dias.',
    subtitle: 'Apartamentos modernos em localizacao privilegiada, cercados de natureza e conveniencia.',
    location: 'Bairro em crescimento',
    primaryCta: 'Entrar para a lista VIP',
    secondaryCta: 'Ver plantas',
    heroImage: landingImage.launch,
    stats: [
      { label: 'Unidades', value: '2 e 3 dorms', icon: 'UN' },
      { label: 'Prioridade', value: 'Lista VIP', icon: 'VIP' },
      { label: 'Condicoes', value: 'Exclusivas', icon: 'CE' },
      { label: 'Cadastro', value: 'Online', icon: 'ON' }
    ],
    features: [
      { title: 'Localizacao', text: 'Conectado ao que importa.', icon: 'LC' },
      { title: 'Plantas', text: 'Espacos para diferentes momentos.', icon: 'PL' },
      { title: 'Lazer', text: 'Piscina, gourmet, academia e playground.', icon: 'LZ' },
      { title: 'Diferenciais', text: 'Arquitetura moderna e tecnologia.', icon: 'DF' },
      { title: 'Obra', text: 'Transparencia em cada etapa.', icon: 'OB' }
    ],
    cards: [
      { title: '2 dorms com suite', meta: '61 a 72 m2.', image: landingImage.interior },
      { title: '3 dorms com suite', meta: '81 a 97 m2.', image: landingImage.house },
      { title: 'Lazer completo', meta: 'Para toda familia.', image: landingImage.condo },
      { title: 'Cronograma', meta: 'Acompanhe a obra.', image: landingImage.launch }
    ],
    formTitle: 'Nao perca esta oportunidade unica',
    formSubtitle: 'Cadastre-se agora e receba em primeira mao as informacoes.',
    faq: ['Quando comecam as vendas?', 'Como funciona a lista VIP?', 'Quais sao as formas de pagamento?', 'E possivel financiar?']
  }),
  buildElementorReferenceTemplate({
    id: 'elementor-bom-viver-mcmv',
    name: 'Residencial Bom Viver MCMV',
    description: 'Landing popular Minha Casa Minha Vida com simulador, subsidio, FGTS, elegibilidade e agenda.',
    thumbnail: refThumb('bom-viver-mcmv.png'),
    group: 'Lancamentos',
    category: 'Minha Casa Minha Vida',
    objective: 'Simular financiamento',
    style: 'Popular confiavel',
    palette: { primary: '#2168bd', secondary: '#eff8ff', accent: '#22c55e', background: '#ffffff', text: '#13315c', footer: '#f8fafc' },
    logo: 'RESIDENCIAL BOM VIVER',
    badge: 'Lancamento Minha Casa Minha Vida',
    headline: 'Seu novo lar cabe no seu sonho',
    highlight: 'e no seu orçamento.',
    subtitle: 'Apartamentos modernos, lazer completo e condicoes facilitadas pelo Minha Casa Minha Vida.',
    location: 'Jardim Esperanca, Sao Paulo - SP',
    primaryCta: 'Simular financiamento',
    secondaryCta: 'Agendar visita',
    heroImage: landingImage.family,
    stats: [
      { label: 'Quartos', value: '2', icon: 'Q' },
      { label: 'Lazer', value: 'Completo', icon: 'LZ' },
      { label: 'Seguranca', value: 'Fechado', icon: 'SG' },
      { label: 'Subsidio', value: 'Governo', icon: 'SB' }
    ],
    features: [
      { title: 'Subsidio', text: 'Desconto do governo conforme renda.', icon: 'SB' },
      { title: 'Use FGTS', text: 'Entrada ou amortizacao facilitada.', icon: 'FG' },
      { title: 'Entrada facilitada', text: 'Condicoes especiais.', icon: 'EN' },
      { title: 'Parcelas acessiveis', text: 'Planejamento familiar.', icon: 'PA' },
      { title: 'Elegibilidade', text: 'Checklist simples para simular.', icon: 'OK' }
    ],
    cards: [
      { title: 'Localizacao', meta: 'Rotina mais facil.', image: landingImage.map },
      { title: 'Plantas', meta: '2 dormitorios inteligentes.', image: landingImage.interior },
      { title: 'Agende visita', meta: 'Decorado com hora marcada.', image: landingImage.house },
      { title: 'WhatsApp', meta: 'Atendimento rapido.', image: landingImage.family }
    ],
    formTitle: 'Simule seu financiamento',
    formSubtitle: 'Rapido, gratuito e sem compromisso.',
    faq: ['Quem pode participar?', 'Qual o valor do subsidio?', 'Posso usar FGTS?', 'Em quanto tempo posso me mudar?']
  })
];

const DESIGNED_SHOWCASE_TEMPLATES: LandingPageTemplate[] = [
  buildDesignedTemplate({
    id: 'showcase-corretor-premium',
    name: 'Corretor Premium Imobiliario',
    description: 'Modelo institucional como site de corretor premium, com autoridade, imoveis em destaque, avaliacao e captacao.',
    thumbnail: landingImage.mansion,
    group: 'Institucional',
    category: 'Corretor premium',
    objective: 'Falar com corretor',
    style: 'Luxo',
    resources: ['WhatsApp', 'Avaliacao', 'Imoveis em destaque', 'Instagram', 'Formulario', 'CRM'],
    pipeline: 'Pipeline Venda Urbana',
    crmTags: ['Lead Institucional', 'Avaliacao de Imovel'],
    conversionEvent: 'lead_corretor_premium',
    palette: { primary: '#06382f', secondary: '#0b241f', accent: '#c9a24f', background: '#fffaf2', text: '#182129', footer: '#071819' },
    logo: 'Seu Nome Imoveis',
    nav: ['Inicio', 'Sobre', 'Imoveis', 'Servicos', 'Depoimentos', 'Contato'],
    badge: 'Confianca. Experiencia. Resultados.',
    headline: 'Realizo o seu melhor negocio',
    highlight: 'imobiliario.',
    subtitle: 'Especialista em conectar pessoas a imoveis e oportunidades que valorizam patrimonio e realizam sonhos.',
    price: '+300 imoveis negociados',
    location: 'Sao Jose dos Campos - SP',
    primaryCta: 'Ver imoveis a venda',
    secondaryCta: 'Avaliacao gratuita',
    heroImage: landingImage.mansion,
    stats: [
      { label: 'Anos de experiencia', value: '+8', icon: '🏆' },
      { label: 'Imoveis negociados', value: '+300', icon: '🏡' },
      { label: 'Atendimento humanizado', value: '100%', icon: '🤝' },
      { label: 'Negociacao segura', value: 'CRECI', icon: '🔑' }
    ],
    features: [
      { title: 'Residenciais', text: 'Casas, apartamentos e condominios para morar com conforto.', icon: '🏠' },
      { title: 'Comerciais', text: 'Salas, lojas e galpoes para negocios crescerem.', icon: '🏢' },
      { title: 'Terrenos e lotes', text: 'Oportunidades para investir e construir.', icon: '🗺️' },
      { title: 'Investimentos', text: 'Imoveis com alto potencial de renda.', icon: '📈' },
      { title: 'Aluguel', text: 'Opcoes selecionadas para locacao.', icon: '🔑' }
    ],
    cards: [
      { title: 'Casa em Condominio', meta: '4 suites • Alphaville', price: 'R$ 1.580.000', image: landingImage.mansion },
      { title: 'Apartamento Alto Padrao', meta: '3 quartos • Vila Ema', price: 'R$ 950.000', image: landingImage.interior },
      { title: 'Sala Comercial', meta: '45 m2 • Jardim Aquarius', price: 'R$ 420.000', image: landingImage.warehouse },
      { title: 'Terreno em Condominio', meta: '450 m2 • Urbanova', price: 'R$ 680.000', image: landingImage.lots }
    ],
    sections: designedSections,
    formTitle: 'Fale comigo',
    formSubtitle: 'Preencha o formulario que retorno rapidinho.',
    faq: ['Como funciona a avaliacao do meu imovel?', 'Quais documentos sao necessarios?', 'Vocês atendem outras regioes?', 'Como e feita a divulgacao?']
  }),
  buildDesignedTemplate({
    id: 'showcase-galpao-logistico',
    name: 'Galpao Logistico Premium',
    description: 'Modelo corporativo para galpao, docas, patio, pe-direito, mapa logistico e visita tecnica.',
    thumbnail: landingImage.warehouse,
    group: 'Urbana',
    category: 'Galpao',
    objective: 'Alugar imovel',
    style: 'Corporativo',
    resources: ['Ficha tecnica', 'Mapa logistico', 'Agenda tecnica', 'Formulario empresarial', 'WhatsApp', 'CRM'],
    pipeline: 'Pipeline Aluguel',
    crmTags: ['Lead Comercial', 'Galpao'],
    conversionEvent: 'lead_galpao_logistico',
    palette: { primary: '#06152b', secondary: '#0d2340', accent: '#ff6b00', background: '#f7f9fc', text: '#101827', footer: '#06152b' },
    logo: 'Nova Corporativos',
    nav: ['Imoveis', 'Solucoes', 'Sobre nos', 'Clientes', 'Contato'],
    badge: 'Imovel comercial / Galpao',
    headline: 'Galpao Logistico Premium em',
    highlight: 'Localizacao Estrategica',
    subtitle: 'Estrutura moderna, seguranca e eficiencia para impulsionar a sua operacao.',
    price: 'R$ 168.000 /mes',
    location: 'Rodovia Anhanguera, km 72 - Cajamar/SP',
    primaryCta: 'Agendar visita',
    secondaryCta: 'Fale com especialista',
    heroImage: landingImage.warehouse,
    stats: [
      { label: 'Area construida', value: '12.500 m2', icon: '🏭' },
      { label: 'Area de terreno', value: '20.000 m2', icon: '📍' },
      { label: 'Pe-direito livre', value: '12 m', icon: '↕️' },
      { label: 'Docas elevadas', value: '16', icon: '🚚' },
      { label: 'Piso industrial', value: '6 t/m2', icon: '📦' },
      { label: 'Energia trifasica', value: '750 KVA', icon: '⚡' }
    ],
    features: [
      { title: 'Acesso rapido', text: 'Conexao direta com as principais rodovias.', icon: '🚛' },
      { title: 'Mao de obra', text: 'Regiao com oferta de profissionais.', icon: '📍' },
      { title: 'Seguranca', text: 'Portaria e controle 24h.', icon: '🛡️' },
      { title: 'Infraestrutura', text: 'Servicos essenciais proximos.', icon: '🏗️' },
      { title: 'Expansao', text: 'Layout preparado para crescer.', icon: '📈' }
    ],
    cards: [
      { title: 'Area interna', meta: 'Piso industrial e iluminacao LED', image: landingImage.warehouseInside },
      { title: 'Docas elevadas', meta: 'Operacao logistica eficiente', image: landingImage.warehouse },
      { title: 'Patio de manobra', meta: 'Amplo acesso para caminhoes', image: landingImage.lots },
      { title: 'Equipe tecnica', meta: 'Visita acompanhada por especialista', image: landingImage.broker }
    ],
    sections: designedSections,
    formTitle: 'Receba mais informacoes',
    formSubtitle: 'Informe sua empresa e nossa equipe entra em contato.',
    faq: ['O imovel esta disponivel para venda ou locacao?', 'Qual o prazo minimo de locacao?', 'O condominio esta incluso?', 'Pode adaptar o layout?']
  }),
  buildDesignedTemplate({
    id: 'showcase-casa-aluguel-tour',
    name: 'Casa para Aluguel com Tour 360',
    description: 'Modelo de aluguel com tour virtual, garantias aceitas, pet friendly, agenda e contato do corretor.',
    thumbnail: landingImage.house,
    group: 'Aluguel',
    category: 'Casa para aluguel',
    objective: 'Agendar visita',
    style: 'Moderno',
    resources: ['Tour 360', 'Agenda presencial', 'Agenda por video', 'Garantias', 'WhatsApp', 'CRM'],
    pipeline: 'Pipeline Aluguel',
    crmTags: ['Lead Aluguel', 'Abriu Tour Virtual'],
    conversionEvent: 'lead_aluguel_tour',
    palette: { primary: '#06152b', secondary: '#f8f5ee', accent: '#c6923e', background: '#ffffff', text: '#111827', footer: '#07152b' },
    logo: 'Villaggio Imoveis',
    nav: ['Inicio', 'Imovel', 'Fotos', 'Localizacao', 'Condicoes', 'Contato'],
    badge: 'Para alugar',
    headline: 'Casa Terrea Moderna',
    highlight: 'para Aluguel',
    subtitle: 'Tour 360, fotos completas, regras de locacao e visita agendada para conhecer seu proximo lar.',
    price: 'R$ 3.750 /mes',
    location: 'Jardim das Flores, Campinas - SP',
    primaryCta: 'Agendar visita',
    secondaryCta: 'Falar no WhatsApp',
    heroImage: landingImage.house,
    stats: [
      { label: 'Quartos', value: '3', icon: '🛏️' },
      { label: 'Banheiros', value: '2', icon: '🛁' },
      { label: 'Area construida', value: '120 m2', icon: '📐' },
      { label: 'Vagas cobertas', value: '2', icon: '🚗' }
    ],
    features: [
      { title: 'Tour virtual', text: 'Explore cada ambiente sem sair de casa.', icon: '360' },
      { title: 'Pet friendly', text: 'Aceita animais de pequeno e medio porte.', icon: '🐾' },
      { title: 'Garantias', text: 'Fianca, fiador e capitalizacao.', icon: '✅' },
      { title: 'Agenda online', text: 'Escolha dia, horario e tipo de visita.', icon: '📅' },
      { title: 'Corretor direto', text: 'Atendimento rapido no WhatsApp.', icon: '📞' }
    ],
    cards: [
      { title: 'Sala de estar', meta: 'Ambiente integrado e iluminado', image: landingImage.interior },
      { title: 'Cozinha', meta: 'Planejada e funcional', image: landingImage.condo },
      { title: 'Area gourmet', meta: 'Churrasqueira e quintal', image: landingImage.house },
      { title: 'Quintal', meta: 'Espaco pet friendly', image: landingImage.mansion }
    ],
    sections: designedSections,
    formTitle: 'Agendar visita',
    formSubtitle: 'Escolha a melhor forma de conhecer seu proximo lar.',
    faq: ['O imovel aceita criancas?', 'Quais garantias sao aceitas?', 'Qual o prazo minimo?', 'Como funciona a visita por video?']
  }),
  buildDesignedTemplate({
    id: 'showcase-fazenda-produtiva',
    name: 'Fazenda Produtiva a Venda',
    description: 'Modelo rural de alto impacto com area total, documentacao, recursos hidricos, drone e material completo.',
    thumbnail: landingImage.farm,
    group: 'Rural',
    category: 'Fazenda produtiva',
    objective: 'Receber material',
    style: 'Rural premium',
    resources: ['Dossie tecnico', 'Drone', 'CAR/CCIR/SIGEF', 'Mapa rural', 'Formulario qualificado', 'CRM'],
    pipeline: 'Pipeline Rural',
    crmTags: ['Lead Rural', 'Fazenda'],
    conversionEvent: 'lead_fazenda_produtiva',
    palette: { primary: '#183c24', secondary: '#efe8d5', accent: '#d7ae58', background: '#fbf7ee', text: '#1b241c', footer: '#112719' },
    logo: 'Imobiliaria Rural',
    nav: ['A Fazenda', 'Estrutura', 'Recurso Hidrico', 'Documentacao', 'Localizacao', 'FAQ'],
    badge: 'Oportunidade exclusiva',
    headline: 'Fazenda Produtiva',
    highlight: 'a Venda',
    subtitle: 'Area consolidada, documentacao em dia, recursos hidricos e estrutura pronta para operar.',
    price: 'R$ 68.000.000,00',
    location: 'Municipio de Campo Verde - MT',
    primaryCta: 'Receber material completo',
    secondaryCta: 'Falar no WhatsApp',
    heroImage: landingImage.farm,
    stats: [
      { label: 'Area total', value: '2.350 ha', icon: '🌾' },
      { label: 'Area aberta', value: '1.880 ha', icon: '🚜' },
      { label: 'Area de plantio', value: '1.720 ha', icon: '🌱' },
      { label: 'Pluviosidade media', value: '600-900 mm', icon: '🌧️' },
      { label: 'Altitude', value: '380-520 m', icon: '⛰️' },
      { label: 'Topografia', value: 'Suave', icon: '🧭' }
    ],
    features: [
      { title: 'Produtividade', text: 'Historico de altas safras.', icon: '🌾' },
      { title: 'Logistica', text: 'Acesso facil ao asfalto e armazens.', icon: '🛣️' },
      { title: 'Recursos hidricos', text: 'Rios, represas e nascentes.', icon: '💧' },
      { title: 'Estrutura completa', text: 'Benfeitorias modernas.', icon: '🏡' },
      { title: 'Documentacao', text: 'CAR, CCIR, SIGEF e matricula.', icon: '📄' }
    ],
    cards: [
      { title: 'Area agricola', meta: 'Lavoura consolidada', image: landingImage.crops },
      { title: 'Casa sede', meta: 'Estrutura completa', image: landingImage.house },
      { title: 'Recursos hidricos', meta: 'Represas e nascentes', image: landingImage.farm },
      { title: 'Documentacao rural', meta: 'Pronta para transferencia', image: landingImage.broker }
    ],
    sections: designedSections,
    formTitle: 'Receba o material completo',
    formSubtitle: 'Preencha seus dados e receba o dossie da fazenda.',
    faq: ['A fazenda esta arrendada?', 'Qual a forma de pagamento?', 'Aceita permuta?', 'A documentacao esta em dia?']
  }),
  buildDesignedTemplate({
    id: 'showcase-captacao-rural',
    name: 'Captacao Rural Leads de Fazendas',
    description: 'Modelo para captar compradores e vendedores rurais com formulario duplo, cobertura nacional e prova social.',
    thumbnail: landingImage.crops,
    group: 'Captacao',
    category: 'Leads rurais',
    objective: 'Captar comprador rural',
    style: 'Rural conversao',
    resources: ['Formulario comprador/vendedor', 'Cobertura nacional', 'WhatsApp', 'Prova social', 'CRM'],
    pipeline: 'Pipeline Rural',
    crmTags: ['Lead Rural', 'Comprador Rural', 'Vendedor Rural'],
    conversionEvent: 'lead_captacao_rural',
    palette: { primary: '#075e2b', secondary: '#edf8e8', accent: '#caa23a', background: '#ffffff', text: '#1f2937', footer: '#08351d' },
    logo: 'Captacao Rural',
    nav: ['Como Funciona', 'Vantagens', 'Depoimentos', 'Cobertura', 'FAQ', 'Sobre Nos'],
    badge: 'Leads qualificados e verificados',
    headline: 'Quer comprar ou vender',
    highlight: 'fazenda?',
    subtitle: 'A gente conecta voce as melhores oportunidades com informacoes reais, verificadas e seguras.',
    location: 'Cobertura em todo o Brasil',
    primaryCta: 'Quero comprar fazenda',
    secondaryCta: 'Quero vender minha fazenda',
    heroImage: landingImage.crops,
    stats: [
      { label: 'Clientes atendidos', value: '+2.500', icon: '👥' },
      { label: 'Leads qualificados', value: '+7.800', icon: '✅' },
      { label: 'Satisfacao', value: '+98%', icon: '⭐' },
      { label: 'Cobertura', value: 'Brasil', icon: '🗺️' }
    ],
    features: [
      { title: 'Leads qualificados', text: 'Selecionamos compradores e vendedores reais.', icon: '🎯' },
      { title: 'Dados reais', text: 'Informacoes checadas e atualizadas.', icon: '🛡️' },
      { title: 'Agilidade', text: 'Conectamos voce rapidamente.', icon: '⚡' },
      { title: 'Sigilo total', text: 'Negociacoes protegidas.', icon: '🔒' },
      { title: 'Cobertura nacional', text: 'Principais regioes agricolas.', icon: '📍' }
    ],
    cards: [
      { title: 'Comprador de pecuaria', meta: 'MT • ate 3.000 ha', image: landingImage.farm },
      { title: 'Investidor agricola', meta: 'GO • soja e milho', image: landingImage.crops },
      { title: 'Proprietario vendedor', meta: 'PR • atendimento sigiloso', image: landingImage.broker },
      { title: 'Area de expansao', meta: 'MS • oportunidade verificada', image: landingImage.lots }
    ],
    sections: designedSections,
    formTitle: 'Receba oportunidades que combinam com voce',
    formSubtitle: 'Preencha rapidinho e comece a receber leads qualificados.',
    faq: ['Os leads sao realmente qualificados?', 'Meus dados ficam seguros?', 'Como recebo os leads?', 'Vocês atuam em todo o Brasil?']
  }),
  buildDesignedTemplate({
    id: 'showcase-casa-urbana-venda',
    name: 'Casa Urbana a Venda Premium',
    description: 'Modelo de casa urbana como pagina de venda completa, com galeria, destaques, localizacao, FAQ e formulario.',
    thumbnail: landingImage.house,
    group: 'Urbana',
    category: 'Casa a venda',
    objective: 'Vender imovel',
    style: 'Premium claro',
    resources: ['Galeria', 'Localizacao', 'Destaques', 'Formulario', 'Agenda', 'CRM'],
    pipeline: 'Pipeline Venda Urbana',
    crmTags: ['Lead Urbano', 'Casa a Venda'],
    conversionEvent: 'lead_casa_urbana',
    palette: { primary: '#071b2e', secondary: '#f9fafb', accent: '#c5923f', background: '#ffffff', text: '#172033', footer: '#06172b' },
    logo: 'Urbana Imoveis',
    nav: ['Inicio', 'Detalhes', 'Fotos', 'Localizacao', 'Diferenciais', 'Contato'],
    badge: 'Casa a venda',
    headline: 'Sua nova historia',
    highlight: 'comeca aqui.',
    subtitle: 'Conforto, design e localizacao privilegiada em uma casa pronta para morar.',
    price: 'R$ 1.290.000',
    location: 'Jardim das Flores, Campinas/SP',
    primaryCta: 'Falar no WhatsApp',
    secondaryCta: 'Agendar visita',
    heroImage: landingImage.house,
    stats: [
      { label: 'Quartos', value: '4', icon: '🛏️' },
      { label: 'Suites', value: '2', icon: '🛁' },
      { label: 'Banheiros', value: '4', icon: '🚿' },
      { label: 'Vagas', value: '2', icon: '🚗' },
      { label: 'Area construida', value: '180 m2', icon: '📐' },
      { label: 'Terreno', value: '250 m2', icon: '📏' }
    ],
    features: [
      { title: 'Projeto moderno', text: 'Ambientes amplos e integrados.', icon: '✨' },
      { title: 'Area gourmet', text: 'Churrasqueira e conforto.', icon: '🍽️' },
      { title: 'Piscina aquecida', text: 'Lazer com privacidade.', icon: '🏊' },
      { title: 'Acabamentos', text: 'Materiais premium.', icon: '🏛️' },
      { title: 'Seguranca', text: 'Monitoramento e cerca.', icon: '🛡️' }
    ],
    cards: [
      { title: 'Sala integrada', meta: 'Iluminacao natural', image: landingImage.interior },
      { title: 'Cozinha gourmet', meta: 'Marcenaria planejada', image: landingImage.condo },
      { title: 'Suite master', meta: 'Conforto e privacidade', image: landingImage.mansion },
      { title: 'Area externa', meta: 'Piscina e jardim', image: landingImage.house }
    ],
    sections: designedSections,
    formTitle: 'Interessado neste imovel?',
    formSubtitle: 'Receba informacoes completas ou agende uma visita sem compromisso.',
    faq: ['O imovel aceita financiamento?', 'Qual e o valor do IPTU?', 'O imovel esta averbado?', 'E possivel comprar com FGTS?']
  }),
  buildDesignedTemplate({
    id: 'showcase-lancamento-luxo-dark',
    name: 'Lancamento Luxo Dark Editorial',
    description: 'Modelo dark de alto padrao para empreendimento, plantas, rooftop, galeria editorial e visita privada.',
    thumbnail: landingImage.luxuryApt,
    group: 'Lancamentos',
    category: 'Lancamento de luxo',
    objective: 'Captar lead qualificado',
    style: 'Luxo dark',
    resources: ['Galeria premium', 'Plantas', 'Rooftop', 'Agenda privada', 'Formulario qualificado', 'CRM'],
    pipeline: 'Pipeline Lancamentos',
    crmTags: ['Lead Alto Padrao', 'Lancamento Luxo'],
    conversionEvent: 'lead_lancamento_luxo_dark',
    palette: { primary: '#111111', secondary: '#1a1713', accent: '#d5a954', background: '#111111', text: '#efe8dd', footer: '#080808' },
    logo: 'Maison Vertice',
    nav: ['O Empreendimento', 'Plantas', 'Lazer', 'Localizacao', 'Diferenciais', 'Contato'],
    badge: 'Lancamento exclusivo',
    headline: 'Apartamentos de Alto Padrao que',
    highlight: 'Elevam seu Estilo de Viver.',
    subtitle: 'Sofisticacao, conforto e localizacao privilegiada no coracao do bairro mais desejado.',
    price: 'A partir de R$ 2.950.000',
    location: 'Vila Nova Conceicao, Sao Paulo - SP',
    primaryCta: 'Agendar visita privativa',
    secondaryCta: 'Fale com consultor',
    heroImage: landingImage.luxuryApt,
    stats: [
      { label: 'Area privativa', value: '143 a 198 m2', icon: '🛏️' },
      { label: 'Suites', value: '3 a 4', icon: '🛁' },
      { label: 'Vagas', value: '2 a 3', icon: '🚗' },
      { label: 'Torre', value: '1', icon: '🏢' },
      { label: 'Elevadores', value: '2+1', icon: '↕️' }
    ],
    features: [
      { title: 'Piscina com raia', text: 'Climatizada e exclusiva.', icon: '🏊' },
      { title: 'Academia', text: 'Equipamentos premium.', icon: '🏋️' },
      { title: 'Spa e sauna', text: 'Bem-estar completo.', icon: '🧖' },
      { title: 'Salao gourmet', text: 'Receba com elegancia.', icon: '🍷' },
      { title: 'Coworking', text: 'Produtividade com conforto.', icon: '💼' }
    ],
    cards: [
      { title: 'Living panoramico', meta: 'Vista e design', image: landingImage.luxuryApt },
      { title: 'Suite master', meta: 'Amplitude e conforto', image: landingImage.interior },
      { title: 'Planta inteligente', meta: 'Espacos flexiveis', image: landingImage.condo },
      { title: 'Rooftop', meta: 'Cidade aos seus pes', image: landingImage.launch }
    ],
    sections: designedSections,
    formTitle: 'Receba mais informacoes',
    formSubtitle: 'Atendimento exclusivo com especialistas em alto padrao.',
    faq: ['Qual o prazo de entrega?', 'Como funciona a personalizacao?', 'Quais sao as formas de pagamento?', 'Ha unidades decoradas?']
  }),
  buildDesignedTemplate({
    id: 'showcase-lista-vip-lancamento',
    name: 'Lista VIP de Lancamento',
    description: 'Modelo residencial para pre-lancamento com formulario VIP, plantas, localizacao, countdown e beneficios.',
    thumbnail: landingImage.launch,
    group: 'Lancamentos',
    category: 'Pre-lancamento',
    objective: 'Entrar em lista VIP',
    style: 'Residencial premium',
    resources: ['Lista VIP', 'Countdown', 'Plantas', 'Formulario', 'WhatsApp', 'CRM'],
    pipeline: 'Pipeline Lancamentos',
    crmTags: ['Lista VIP', 'Lead Lancamento'],
    conversionEvent: 'lead_lista_vip_showcase',
    palette: { primary: '#0b4a38', secondary: '#f6f1e8', accent: '#d7b56d', background: '#fffaf2', text: '#10231d', footer: '#0b3a2d' },
    logo: 'Vista do Vale',
    nav: ['O Empreendimento', 'Localizacao', 'Plantas', 'Diferenciais', 'Lazer', 'Contato'],
    badge: 'Lancamento exclusivo',
    headline: 'O novo endereco dos seus',
    highlight: 'melhores dias.',
    subtitle: 'Apartamentos modernos em uma localizacao privilegiada, cercados de natureza e conveniencia.',
    location: 'Bairro planejado em crescimento',
    primaryCta: 'Entrar para a lista VIP',
    secondaryCta: 'Fale com especialista',
    heroImage: landingImage.launch,
    stats: [
      { label: 'Preco exclusivo', value: 'VIP', icon: '🏷️' },
      { label: 'Prioridade', value: 'Escolha', icon: '👑' },
      { label: 'Condicoes', value: 'Especiais', icon: '🤝' },
      { label: 'Acompanhamento', value: 'Personalizado', icon: '📞' }
    ],
    features: [
      { title: 'Unidades prioridade', text: 'Escolha antes da abertura.', icon: '🏢' },
      { title: 'Preco especial', text: 'Condicoes de lancamento.', icon: '🏷️' },
      { title: 'Pagamento exclusivo', text: 'Negociacao antecipada.', icon: '💳' },
      { title: 'Eventos', text: 'Visitas e apresentacoes privadas.', icon: '🎟️' },
      { title: 'Obra transparente', text: 'Acompanhamento por etapas.', icon: '📆' }
    ],
    cards: [
      { title: '2 dorms. com suite', meta: '61 a 72 m2', image: landingImage.interior },
      { title: '3 dorms. com suite', meta: '81 a 97 m2', image: landingImage.condo },
      { title: 'Lazer completo', meta: 'Piscina, gourmet e academia', image: landingImage.launch },
      { title: 'Localizacao', meta: 'Conectado ao essencial', image: landingImage.map }
    ],
    sections: designedSections,
    formTitle: 'Entre para a lista VIP',
    formSubtitle: 'Seja o primeiro a receber condicoes e novidades do lancamento.',
    faq: ['Quando comecam as vendas?', 'Como funciona a lista VIP?', 'Quais sao as formas de pagamento?', 'E possivel financiar?']
  }),
  buildDesignedTemplate({
    id: 'showcase-minha-casa-minha-vida',
    name: 'Minha Casa Minha Vida Familia',
    description: 'Modelo claro e acessivel para MCMV com simulacao, beneficios, elegibilidade, plantas e visita.',
    thumbnail: landingImage.family,
    group: 'Lancamentos',
    category: 'Minha Casa Minha Vida',
    objective: 'Simular financiamento',
    style: 'Popular confiavel',
    resources: ['Simulador', 'Renda familiar', 'FGTS', 'Agenda', 'WhatsApp', 'CRM'],
    pipeline: 'Pipeline Minha Casa Minha Vida',
    crmTags: ['Lead Minha Casa Minha Vida'],
    conversionEvent: 'lead_mcmv_showcase',
    palette: { primary: '#1768c7', secondary: '#eaf5ff', accent: '#22c55e', background: '#ffffff', text: '#18345e', footer: '#f9fafb' },
    logo: 'Residencial Bom Viver',
    nav: ['O Empreendimento', 'Plantas', 'Localizacao', 'Beneficios', 'Diferenciais', 'FAQ'],
    badge: 'Lancamento Minha Casa Minha Vida',
    headline: 'Seu novo lar cabe no seu sonho',
    highlight: 'e no seu orcamento.',
    subtitle: 'Apartamentos modernos, lazer completo e condicoes facilitadas para sua familia.',
    location: 'Jardim Esperanca - Sao Paulo/SP',
    primaryCta: 'Simular financiamento',
    secondaryCta: 'Falar no WhatsApp',
    heroImage: landingImage.family,
    stats: [
      { label: 'Quartos', value: '2', icon: '🏠' },
      { label: 'Lazer completo', value: 'Sim', icon: '🎠' },
      { label: 'Seguranca', value: '24h', icon: '🔒' },
      { label: 'FGTS', value: 'Use', icon: '💳' }
    ],
    features: [
      { title: 'Subsidio', text: 'Desconto que pode chegar alto.', icon: '💵' },
      { title: 'Use seu FGTS', text: 'Entrada ou parte do financiamento.', icon: '💳' },
      { title: 'Entrada facilitada', text: 'Conquiste seu apartamento.', icon: '🔑' },
      { title: 'Parcelas acessiveis', text: 'Cabem no bolso da familia.', icon: '📄' },
      { title: 'Elegibilidade', text: 'Criterios claros para aprovar.', icon: '✅' }
    ],
    cards: [
      { title: 'Planta 2 dormitorios', meta: '40,33 m2', image: landingImage.interior },
      { title: 'Planta com varanda', meta: '42,39 m2', image: landingImage.condo },
      { title: 'Decorado', meta: 'Pronto para visita', image: landingImage.family },
      { title: 'Lazer', meta: 'Espaco para toda familia', image: landingImage.launch }
    ],
    sections: designedSections,
    formTitle: 'Simule seu financiamento',
    formSubtitle: 'E rapido, gratuito e sem compromisso.',
    faq: ['Quem pode participar?', 'Qual valor do subsidio?', 'Posso usar meu FGTS?', 'Em quanto tempo posso mudar?']
  }),
  buildDesignedTemplate({
    id: 'showcase-loteamento-masterplan',
    name: 'Loteamento Masterplan',
    description: 'Modelo de venda de lotes com mapa masterplan, infraestrutura, condicoes, agenda e formulario.',
    thumbnail: landingImage.lots,
    group: 'Lotes',
    category: 'Loteamento',
    objective: 'Vender lote',
    style: 'Natural premium',
    resources: ['Masterplan', 'Mapa de lotes', 'Infraestrutura', 'Agenda', 'Formulario', 'CRM'],
    pipeline: 'Pipeline Lancamentos',
    crmTags: ['Lead Lote', 'Loteamento'],
    conversionEvent: 'lead_loteamento_showcase',
    palette: { primary: '#394727', secondary: '#f5f1e6', accent: '#c8a95a', background: '#fbf8ef', text: '#25251e', footer: '#292820' },
    logo: 'Vale do Sol',
    nav: ['O Loteamento', 'Localizacao', 'Lotes', 'Infraestrutura', 'Condicoes', 'Galeria', 'FAQ'],
    badge: 'Lotes em condominio ou loteamento aberto',
    headline: 'O lugar certo para construir seus',
    highlight: 'melhores planos.',
    subtitle: 'Lotes residenciais em uma regiao de valorizacao constante e facil acesso.',
    price: 'A partir de R$ 89.900',
    location: 'Regiao em crescimento',
    primaryCta: 'Escolher meu lote',
    secondaryCta: 'Fale com consultor',
    heroImage: landingImage.lots,
    stats: [
      { label: 'Metragem', value: '250 m2+', icon: '📐' },
      { label: 'Entrada', value: 'Facilitada', icon: '💳' },
      { label: 'Parcelamento', value: '120x', icon: '📆' },
      { label: 'Documentacao', value: 'Regularizada', icon: '📄' }
    ],
    features: [
      { title: 'Agua', text: 'Rede de abastecimento.', icon: '💧' },
      { title: 'Luz', text: 'Iluminacao LED.', icon: '⚡' },
      { title: 'Pavimentacao', text: 'Vias sinalizadas.', icon: '🛣️' },
      { title: 'Drenagem', text: 'Sistema eficiente.', icon: '🌧️' },
      { title: 'Area verde', text: 'Mais natureza para viver.', icon: '🌿' }
    ],
    cards: [
      { title: 'Quadra A', meta: 'Lotes disponiveis', image: landingImage.lots },
      { title: 'Playground', meta: 'Lazer para familia', image: landingImage.launch },
      { title: 'Portaria', meta: 'Controle de acesso', image: landingImage.house },
      { title: 'Mapa geral', meta: 'Masterplan inteligente', image: landingImage.map }
    ],
    sections: designedSections,
    formTitle: 'Fale com um consultor',
    formSubtitle: 'Receba tabela completa, disponibilidade e condicoes.',
    faq: ['Quais sao os tamanhos dos lotes?', 'A documentacao esta regularizada?', 'Posso construir imediatamente?', 'Quais formas de pagamento?']
  })
];

const PREMIUM_LANDING_PAGE_TEMPLATES: LandingPageTemplate[] = [
  buildPremiumTemplate({
    id: 'premium-casa-venda-urbana',
    name: 'Casa a Venda Completa',
    description: 'Landing premium para vender uma casa especifica com galeria, agenda, formulario, WhatsApp e CRM.',
    thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop',
    group: 'Urbana',
    category: 'Casa a venda',
    objective: 'Vender imovel',
    style: 'Moderno',
    resources: ['Agenda', 'WhatsApp', 'Formulario', 'Galeria', 'Mapa', 'CRM'],
    tags: ['casa', 'urbano', 'visita', 'venda'],
    pipeline: 'Pipeline Venda Urbana',
    crmTags: ['Lead Urbano', 'Agendou Visita', 'Formulario Enviado'],
    conversionEvent: 'lead_casa_venda',
    theme: { primaryColor: '#0f172a', secondaryColor: '#4f46e5' },
    heroTitle: 'Casa pronta para morar em localizacao desejada',
    heroSubtitle: 'Fotos grandes, dados completos, visita agendada e atendimento imediato pelo WhatsApp.',
    ctaText: 'Agendar visita',
    location: 'Campinas, Sao Paulo',
    stats: [{ label: 'Quartos', value: '4' }, { label: 'Suites', value: '2' }, { label: 'Vagas', value: '3' }, { label: 'Area', value: '280 m2' }],
    sections: premiumBaseSections,
    highlights: ['Piscina e area gourmet', 'Escritorio privativo', 'Moveis planejados', 'Financiamento e proposta pelo CRM'],
    formTitle: 'Tenho interesse nesta casa',
    formSubmit: 'Enviar interesse'
  }),
  buildPremiumTemplate({
    id: 'premium-apartamento-venda',
    name: 'Apartamento a Venda com Planta',
    description: 'Template para apartamento com condominio, lazer, planta, financiamento, mapa e agenda de visita.',
    thumbnail: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1920&auto=format&fit=crop',
    group: 'Urbana',
    category: 'Apartamento a venda',
    objective: 'Vender imovel',
    style: 'Premium',
    resources: ['Planta', 'Agenda', 'WhatsApp', 'Financiamento', 'Mapa', 'CRM'],
    tags: ['apartamento', 'condominio', 'planta'],
    pipeline: 'Pipeline Venda Urbana',
    crmTags: ['Lead Urbano', 'Lead Apartamento'],
    conversionEvent: 'lead_apartamento_venda',
    theme: { primaryColor: '#1e293b', secondaryColor: '#2563eb' },
    heroTitle: 'Apartamento com lazer completo e visita facil',
    heroSubtitle: 'Mostre preco, condominio, IPTU, planta, financiamento e disponibilidade em uma pagina pronta para converter.',
    ctaText: 'Ver horarios disponiveis',
    location: 'Florianopolis, Santa Catarina',
    stats: [{ label: 'Area privativa', value: '96 m2' }, { label: 'Quartos', value: '3' }, { label: 'Vagas', value: '2' }, { label: 'Andar', value: '12o' }],
    sections: premiumBaseSections,
    highlights: ['Lazer do condominio', 'Planta do imovel', 'Sol da manha/tarde', 'Simulacao de financiamento'],
    formTitle: 'Quero conhecer este apartamento',
    formSubmit: 'Solicitar atendimento'
  }),
  buildPremiumTemplate({
    id: 'premium-casa-alto-padrao',
    name: 'Casa de Alto Padrao Editorial',
    description: 'Pagina sofisticada para imoveis premium, com layout editorial, video, prova de autoridade e qualificacao financeira.',
    thumbnail: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=1920&auto=format&fit=crop',
    group: 'Urbana',
    category: 'Alto padrao',
    objective: 'Vender imovel',
    style: 'Luxo',
    resources: ['Video', 'Galeria', 'Agenda exclusiva', 'Formulario qualificado', 'CRM'],
    tags: ['luxo', 'alto padrao', 'condominio'],
    pipeline: 'Pipeline Venda Urbana',
    crmTags: ['Lead Alto Padrao', 'Lead Qualificado'],
    conversionEvent: 'lead_luxo',
    theme: { primaryColor: '#111111', secondaryColor: '#c8a45d', fontFamily: 'Playfair Display' },
    heroTitle: 'Residencia exclusiva para uma vida sem concessoes',
    heroSubtitle: 'Fotos editoriais, ambientes amplos, seguranca, arquitetura e atendimento consultivo para compradores premium.',
    ctaText: 'Agendar visita exclusiva',
    location: 'Jardins, Sao Paulo',
    stats: [{ label: 'Area construida', value: '620 m2' }, { label: 'Suites', value: '5' }, { label: 'Vagas', value: '6' }, { label: 'Condominio', value: 'Fechado' }],
    sections: premiumBaseSections,
    highlights: ['Video cinematografico', 'Arquitetura assinada', 'Formulario com qualificacao financeira', 'Prova de autoridade do corretor'],
    formTitle: 'Solicitar apresentacao privada',
    formSubmit: 'Enviar solicitacao'
  }),
  buildPremiumTemplate({
    id: 'premium-imovel-comercial',
    name: 'Imovel Comercial Tecnico',
    description: 'Landing para salas, lojas e pontos comerciais com dados de zoneamento, fluxo, mapa e formulario empresarial.',
    thumbnail: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1920&auto=format&fit=crop',
    group: 'Urbana',
    category: 'Comercial',
    objective: 'Vender ou alugar imovel',
    style: 'Corporativo',
    resources: ['Mapa', 'Formulario empresarial', 'Agenda', 'Dados tecnicos', 'CRM'],
    tags: ['comercial', 'empresa', 'investidor'],
    pipeline: 'Pipeline Venda Urbana',
    crmTags: ['Lead Comercial'],
    conversionEvent: 'lead_comercial',
    theme: { primaryColor: '#0f172a', secondaryColor: '#0ea5e9' },
    heroTitle: 'Endereco comercial pronto para sua operacao',
    heroSubtitle: 'Metragem, zoneamento, fluxo de pessoas, vagas e agenda de visita em uma pagina objetiva.',
    ctaText: 'Agendar visita tecnica',
    location: 'Belo Horizonte, Minas Gerais',
    stats: [{ label: 'Area total', value: '480 m2' }, { label: 'Vagas', value: '12' }, { label: 'Pe-direito', value: '4,5 m' }, { label: 'Zoneamento', value: 'ZC' }],
    sections: premiumBaseSections,
    highlights: ['Dados comerciais completos', 'Pontos estrategicos proximos', 'Formulario para CNPJ', 'CRM com pipeline comercial'],
    formTitle: 'Solicitar analise comercial',
    formSubmit: 'Enviar dados'
  }),
  buildPremiumTemplate({
    id: 'premium-galpao-logistico',
    name: 'Galpao Logistico Venda ou Locacao',
    description: 'Template para galpoes com pe-direito, docas, patio, energia, mapa logistico e formulario de empresa.',
    thumbnail: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1920&auto=format&fit=crop',
    group: 'Urbana',
    category: 'Galpao',
    objective: 'Alugar imovel',
    style: 'Corporativo',
    resources: ['Mapa logistico', 'Agenda', 'Formulario empresarial', 'Video', 'CRM'],
    tags: ['galpao', 'logistica', 'locacao'],
    pipeline: 'Pipeline Aluguel',
    crmTags: ['Lead Aluguel', 'Lead Comercial'],
    conversionEvent: 'lead_galpao',
    theme: { primaryColor: '#1f2937', secondaryColor: '#f59e0b' },
    heroTitle: 'Galpao com infraestrutura para alta operacao',
    heroSubtitle: 'Docas, patio, acesso para caminhoes, escritorios e dados tecnicos claros para decisao rapida.',
    ctaText: 'Falar com especialista',
    location: 'Contagem, Minas Gerais',
    stats: [{ label: 'Area construida', value: '4.800 m2' }, { label: 'Docas', value: '8' }, { label: 'Patio', value: '6.000 m2' }, { label: 'Energia', value: 'Trifasica' }],
    sections: premiumBaseSections,
    highlights: ['Acesso rodoviario', 'Mapa logistico', 'Pe-direito operacional', 'Formulario para demanda empresarial'],
    formTitle: 'Tenho interesse no galpao',
    formSubmit: 'Solicitar visita'
  }),
  buildPremiumTemplate({
    id: 'premium-lote-urbano',
    name: 'Lote Urbano com Mapa e Documentacao',
    description: 'Landing para lote ou terreno urbano com imagem aerea, zoneamento, potencial construtivo e documentacao.',
    thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop',
    group: 'Lotes',
    category: 'Lote urbano',
    objective: 'Vender lote',
    style: 'Moderno',
    resources: ['Mapa', 'Documentacao', 'WhatsApp', 'Agenda', 'CRM'],
    tags: ['lote', 'terreno', 'zoneamento'],
    pipeline: 'Pipeline Venda Urbana',
    crmTags: ['Lead Lote'],
    conversionEvent: 'lead_lote_urbano',
    theme: { primaryColor: '#065f46', secondaryColor: '#facc15' },
    heroTitle: 'Terreno urbano com potencial construtivo',
    heroSubtitle: 'Metragem, frente, fundos, zoneamento, mapa e contato direto para proposta.',
    ctaText: 'Escolher meu lote',
    location: 'Goiania, Goias',
    stats: [{ label: 'Metragem', value: '600 m2' }, { label: 'Frente', value: '15 m' }, { label: 'Zoneamento', value: 'Misto' }, { label: 'Documentacao', value: 'OK' }],
    sections: premiumBaseSections,
    highlights: ['Imagem aerea', 'Potencial construtivo', 'Proximidades', 'Documentacao em destaque'],
    formTitle: 'Quero detalhes deste lote',
    formSubmit: 'Receber informacoes'
  }),
  buildPremiumTemplate({
    id: 'premium-pre-lancamento-vip',
    name: 'Pre-Lancamento Lista VIP',
    description: 'Pagina para capturar interessados antes do lancamento oficial com beneficios, contador e lista VIP.',
    thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop',
    group: 'Lancamentos',
    category: 'Pre-lancamento',
    objective: 'Entrar em lista VIP',
    style: 'Premium',
    resources: ['Lista VIP', 'Formulario curto', 'WhatsApp', 'CRM', 'SEO'],
    tags: ['lancamento', 'lista vip', 'trafego pago'],
    pipeline: 'Pipeline Lancamentos',
    crmTags: ['Lead Lancamento', 'Lista VIP'],
    conversionEvent: 'lead_lista_vip',
    theme: { primaryColor: '#312e81', secondaryColor: '#a78bfa' },
    heroTitle: 'Entre primeiro na lista VIP do novo lancamento',
    heroSubtitle: 'Receba condicoes antecipadas, plantas e prioridade de escolha antes da abertura oficial.',
    ctaText: 'Entrar na Lista VIP',
    location: 'Balneario Camboriu, Santa Catarina',
    stats: [{ label: 'Prioridade', value: 'VIP' }, { label: 'Tipologias', value: '2 e 3 dorms' }, { label: 'Condicoes', value: 'Antecipadas' }, { label: 'Atendimento', value: 'Plantao' }],
    sections: premiumBaseSections,
    highlights: ['Formulario curto', 'Beneficios de entrar antes', 'Localizacao do empreendimento', 'CRM para campanha'],
    formTitle: 'Quero entrar na lista VIP',
    formSubmit: 'Garantir prioridade'
  }),
  buildPremiumTemplate({
    id: 'premium-lancamento-padrao',
    name: 'Lancamento Imobiliario Completo',
    description: 'Pagina de empreendimento com renders, plantas, tipologias, financiamento, agenda e tabela de unidades.',
    thumbnail: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1920&auto=format&fit=crop',
    group: 'Lancamentos',
    category: 'Lancamento',
    objective: 'Vender unidades',
    style: 'Moderno',
    resources: ['Plantas', 'Tabela de unidades', 'Agenda', 'Simulacao', 'CRM'],
    tags: ['empreendimento', 'construtora', 'unidades'],
    pipeline: 'Pipeline Lancamentos',
    crmTags: ['Lead Lancamento'],
    conversionEvent: 'lead_lancamento',
    theme: { primaryColor: '#0f172a', secondaryColor: '#22c55e' },
    heroTitle: 'Novo empreendimento com unidades selecionadas',
    heroSubtitle: 'Renders, plantas, diferenciais, localizacao e atendimento com consultor em uma landing completa.',
    ctaText: 'Conhecer unidades',
    location: 'Curitiba, Parana',
    stats: [{ label: 'Torres', value: '2' }, { label: 'Plantas', value: '6' }, { label: 'Entrega', value: '2028' }, { label: 'Unidades', value: 'Limitadas' }],
    sections: premiumBaseSections,
    highlights: ['Tipologias e plantas', 'Tabela de unidades', 'Simulacao de financiamento', 'Agenda com corretor'],
    formTitle: 'Quero conhecer o empreendimento',
    formSubmit: 'Receber plantas'
  }),
  buildPremiumTemplate({
    id: 'premium-lancamento-luxo',
    name: 'Lancamento de Luxo Editorial',
    description: 'Landing sofisticada para empreendimento premium com manifesto, arquitetura, servicos exclusivos e apresentacao privada.',
    thumbnail: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=1920&auto=format&fit=crop',
    group: 'Lancamentos',
    category: 'Lancamento de luxo',
    objective: 'Captar lead qualificado',
    style: 'Luxo',
    resources: ['Video', 'Galeria premium', 'Formulario qualificado', 'Agenda privada', 'CRM'],
    tags: ['luxo', 'incorporadora', 'alto padrao'],
    pipeline: 'Pipeline Lancamentos',
    crmTags: ['Lead Alto Padrao', 'Lead Lancamento'],
    conversionEvent: 'lead_lancamento_luxo',
    theme: { primaryColor: '#0b0b0b', secondaryColor: '#b68d40', fontFamily: 'Playfair Display' },
    heroTitle: 'Um endereco para quem escolhe o extraordinario',
    heroSubtitle: 'Arquitetura assinada, servicos exclusivos, plantas amplas e atendimento reservado.',
    ctaText: 'Agendar apresentacao privada',
    location: 'Ipanema, Rio de Janeiro',
    stats: [{ label: 'Plantas', value: '280 m2+' }, { label: 'Suites', value: '4' }, { label: 'Rooftop', value: 'Exclusivo' }, { label: 'Entrega', value: '2027' }],
    sections: premiumBaseSections,
    highlights: ['Manifesto do empreendimento', 'Arquitetura assinada', 'Servicos exclusivos', 'Qualificacao financeira'],
    formTitle: 'Solicitar atendimento consultivo',
    formSubmit: 'Enviar solicitacao'
  }),
  buildPremiumTemplate({
    id: 'premium-minha-casa-minha-vida',
    name: 'Minha Casa Minha Vida Conversao',
    description: 'Pagina clara e direta para simular financiamento, captar renda familiar, FGTS e documentos necessarios.',
    thumbnail: 'https://images.unsplash.com/photo-1597047084897-51e81819a499?q=80&w=1920&auto=format&fit=crop',
    group: 'Lancamentos',
    category: 'Minha Casa Minha Vida',
    objective: 'Simular financiamento',
    style: 'Popular',
    resources: ['Simulacao', 'Formulario renda', 'WhatsApp', 'Agenda', 'CRM'],
    tags: ['mcmv', 'financiamento', 'fgts'],
    pipeline: 'Pipeline Minha Casa Minha Vida',
    crmTags: ['Lead Minha Casa Minha Vida'],
    conversionEvent: 'lead_mcmv',
    theme: { primaryColor: '#2563eb', secondaryColor: '#10b981' },
    heroTitle: 'Seu apartamento com entrada facilitada',
    heroSubtitle: 'Simule seu financiamento, veja beneficios, use FGTS e fale com um consultor.',
    ctaText: 'Simular meu financiamento',
    location: 'Sao Jose dos Pinhais, Parana',
    stats: [{ label: 'Entrada', value: 'Facilitada' }, { label: 'FGTS', value: 'Aceito' }, { label: 'Subsidio', value: 'Disponivel' }, { label: 'Parcelas', value: 'Acessiveis' }],
    sections: premiumBaseSections,
    highlights: ['Renda familiar', 'Documentos necessarios', 'Quem pode comprar', 'Agenda com consultor'],
    formTitle: 'Quero simular meu financiamento',
    formSubmit: 'Simular agora'
  }),
  buildPremiumTemplate({
    id: 'premium-venda-lotes',
    name: 'Venda de Lotes com Mapa',
    description: 'Template para loteamento com quadras, infraestrutura, condicoes, agenda de visita e CRM.',
    thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop',
    group: 'Lotes',
    category: 'Loteamento',
    objective: 'Vender lote',
    style: 'Rural',
    resources: ['Mapa do loteamento', 'Agenda', 'Formulario', 'WhatsApp', 'CRM'],
    tags: ['loteamento', 'quadras', 'infraestrutura'],
    pipeline: 'Pipeline Lancamentos',
    crmTags: ['Lead Lote'],
    conversionEvent: 'lead_loteamento',
    theme: { primaryColor: '#064e3b', secondaryColor: '#eab308' },
    heroTitle: 'Escolha seu lote em uma regiao em crescimento',
    heroSubtitle: 'Infraestrutura completa, mapa do loteamento, metragens e atendimento para escolher a melhor quadra.',
    ctaText: 'Escolher meu lote',
    location: 'Ribeirao Preto, Sao Paulo',
    stats: [{ label: 'Lotes', value: '360 m2+' }, { label: 'Infraestrutura', value: 'Completa' }, { label: 'Entrada', value: 'Facilitada' }, { label: 'Visita', value: 'No local' }],
    sections: premiumBaseSections,
    highlights: ['Quadras e lotes', 'Agua, luz e pavimentacao', 'Area verde', 'Condicoes de pagamento'],
    formTitle: 'Quero escolher um lote',
    formSubmit: 'Receber opcoes'
  }),
  buildPremiumTemplate({
    id: 'premium-casa-aluguel',
    name: 'Casa para Aluguel com Agenda',
    description: 'Landing de locacao com regras, garantias, tour virtual, agenda presencial/video e pre-analise.',
    thumbnail: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=1920&auto=format&fit=crop',
    group: 'Aluguel',
    category: 'Casa para aluguel',
    objective: 'Alugar imovel',
    style: 'Moderno',
    resources: ['Tour virtual', 'Agenda', 'Formulario', 'WhatsApp', 'CRM'],
    tags: ['aluguel', 'casa', 'garantia'],
    pipeline: 'Pipeline Aluguel',
    crmTags: ['Lead Aluguel'],
    conversionEvent: 'lead_aluguel_casa',
    theme: { primaryColor: '#0f766e', secondaryColor: '#14b8a6' },
    heroTitle: 'Casa para alugar com visita sem friccao',
    heroSubtitle: 'Valor, regras, garantias aceitas, tour virtual e agendamento em poucos cliques.',
    ctaText: 'Agendar visita',
    location: 'Londrina, Parana',
    stats: [{ label: 'Aluguel', value: 'R$ 3.800' }, { label: 'Quartos', value: '3' }, { label: 'Pets', value: 'Aceita' }, { label: 'Visita', value: 'Online ou presencial' }],
    sections: premiumBaseSections,
    highlights: ['Garantias aceitas', 'Tour estilo Google', 'Pre-analise opcional', 'Agenda presencial ou video'],
    formTitle: 'Quero visitar este imovel',
    formSubmit: 'Agendar visita'
  }),
  buildPremiumTemplate({
    id: 'premium-apartamento-aluguel',
    name: 'Apartamento para Aluguel Completo',
    description: 'Template de locacao para apartamento com condominio, IPTU, lazer, regras e agenda.',
    thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1920&auto=format&fit=crop',
    group: 'Aluguel',
    category: 'Apartamento para aluguel',
    objective: 'Alugar imovel',
    style: 'Premium',
    resources: ['Tour virtual', 'Agenda', 'Formulario', 'Mapa', 'CRM'],
    tags: ['aluguel', 'apartamento', 'condominio'],
    pipeline: 'Pipeline Aluguel',
    crmTags: ['Lead Aluguel'],
    conversionEvent: 'lead_aluguel_apartamento',
    theme: { primaryColor: '#334155', secondaryColor: '#38bdf8' },
    heroTitle: 'Apartamento para alugar com informacao completa',
    heroSubtitle: 'Condominio, IPTU, lazer, garantias, tour virtual e WhatsApp para atendimento imediato.',
    ctaText: 'Ver agenda de visita',
    location: 'Porto Alegre, Rio Grande do Sul',
    stats: [{ label: 'Aluguel', value: 'R$ 2.600' }, { label: 'Condominio', value: 'R$ 640' }, { label: 'Quartos', value: '2' }, { label: 'Vaga', value: '1' }],
    sections: premiumBaseSections,
    highlights: ['Lazer do condominio', 'Regras de locacao', 'Garantias aceitas', 'Formulario de interesse'],
    formTitle: 'Tenho interesse no aluguel',
    formSubmit: 'Solicitar visita'
  }),
  buildPremiumTemplate({
    id: 'premium-aluguel-tour-virtual',
    name: 'Aluguel com Tour Virtual 360',
    description: 'Pagina focada em tour 360 com ambientes, botoes de visita presencial/video e evento para CRM.',
    thumbnail: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=1920&auto=format&fit=crop',
    group: 'Aluguel',
    category: 'Tour virtual',
    objective: 'Agendar visita',
    style: 'Moderno',
    resources: ['Tour 360', 'Agenda video', 'WhatsApp', 'Formulario', 'CRM'],
    tags: ['tour 360', 'visita virtual', 'locacao'],
    pipeline: 'Pipeline Aluguel',
    crmTags: ['Abriu Tour Virtual', 'Lead Aluguel'],
    conversionEvent: 'lead_tour_virtual',
    theme: { primaryColor: '#155e75', secondaryColor: '#06b6d4' },
    heroTitle: 'Visite o imovel online antes de sair de casa',
    heroSubtitle: 'Tour por ambientes, fotos complementares, video curto e agendamento presencial ou por video.',
    ctaText: 'Abrir tour virtual',
    location: 'Santos, Sao Paulo',
    stats: [{ label: 'Ambientes', value: '5' }, { label: 'Tour', value: '360' }, { label: 'Video', value: 'Incluido' }, { label: 'Agenda', value: 'Online' }],
    sections: premiumBaseSections,
    highlights: ['Navegacao por comodos', 'Botao gostei deste imovel', 'Agendar visita por video', 'Registro de eventos no CRM'],
    formTitle: 'Gostei deste imovel',
    formSubmit: 'Falar com corretor'
  }),
  buildPremiumTemplate({
    id: 'premium-fazenda-venda',
    name: 'Fazenda a Venda Dossie Completo',
    description: 'Pagina rural completa com hectares, CAR, CCIR, SIGEF, benfeitorias, recursos hidricos, mapa e dossie.',
    thumbnail: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop',
    group: 'Rural',
    category: 'Fazenda a venda',
    objective: 'Receber material',
    style: 'Rural',
    resources: ['Dossie tecnico', 'Mapa rural', 'Drone', 'Agenda tecnica', 'CRM'],
    tags: ['fazenda', 'rural', 'dossie'],
    pipeline: 'Pipeline Rural',
    crmTags: ['Lead Rural', 'Lead Fazenda'],
    conversionEvent: 'lead_fazenda',
    theme: { primaryColor: '#064e3b', secondaryColor: '#d4af37' },
    heroTitle: 'Fazenda completa com informacoes tecnicas reais',
    heroSubtitle: 'Area total, documentacao, recursos hidricos, benfeitorias, logistica e visita tecnica.',
    ctaText: 'Receber dossie completo',
    location: 'Sorriso, Mato Grosso',
    stats: [{ label: 'Area total', value: '1.250 ha' }, { label: 'Area aberta', value: '820 ha' }, { label: 'CAR/CCIR', value: 'OK' }, { label: 'Agua', value: 'Nascentes' }],
    sections: premiumBaseSections,
    highlights: ['CAR, CCIR, SIGEF e matricula', 'Video com drone', 'Casa sede, curral e barracao', 'Logistica e documentacao'],
    formTitle: 'Quero receber o dossie da fazenda',
    formSubmit: 'Receber material'
  }),
  buildPremiumTemplate({
    id: 'premium-fazenda-pecuaria',
    name: 'Fazenda para Pecuaria',
    description: 'Landing rural para pecuaria com capacidade animal, pastos, curral, agua, cercas e visita tecnica.',
    thumbnail: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1920&auto=format&fit=crop',
    group: 'Rural',
    category: 'Pecuaria',
    objective: 'Agendar visita tecnica',
    style: 'Rural',
    resources: ['Drone', 'Mapa rural', 'Formulario qualificado', 'Agenda tecnica', 'CRM'],
    tags: ['pecuaria', 'gado', 'pastagem'],
    pipeline: 'Pipeline Rural',
    crmTags: ['Lead Rural', 'Pecuaria'],
    conversionEvent: 'lead_pecuaria',
    theme: { primaryColor: '#365314', secondaryColor: '#84cc16' },
    heroTitle: 'Area formada para pecuaria com logistica forte',
    heroSubtitle: 'Capacidade animal, divisao de pastos, curral, agua, cercas e proximidade de frigorificos.',
    ctaText: 'Agendar visita tecnica',
    location: 'Rondonopolis, Mato Grosso',
    stats: [{ label: 'Lotacao', value: '1.800 cab.' }, { label: 'Pastos', value: '32' }, { label: 'Curral', value: 'Completo' }, { label: 'Agua', value: 'Perenne' }],
    sections: premiumBaseSections,
    highlights: ['Capacidade animal', 'Tipo de pastagem', 'Frigorificos proximos', 'Formulario para comprador rural'],
    formTitle: 'Quero avaliar esta fazenda',
    formSubmit: 'Solicitar visita'
  }),
  buildPremiumTemplate({
    id: 'premium-fazenda-plantio',
    name: 'Fazenda para Plantio',
    description: 'Template para areas de soja, milho e graos com solo, relevo, altitude, pluviometria e cooperativas proximas.',
    thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop',
    group: 'Rural',
    category: 'Plantio',
    objective: 'Receber dossie tecnico',
    style: 'Rural',
    resources: ['Dossie tecnico', 'Mapa', 'Drone', 'Formulario', 'CRM'],
    tags: ['plantio', 'soja', 'milho'],
    pipeline: 'Pipeline Rural',
    crmTags: ['Lead Rural', 'Plantio'],
    conversionEvent: 'lead_plantio',
    theme: { primaryColor: '#166534', secondaryColor: '#f59e0b' },
    heroTitle: 'Area agricultavel com dados para decisao tecnica',
    heroSubtitle: 'Solo, relevo, altitude, indice pluviometrico, safras possiveis e logistica de escoamento.',
    ctaText: 'Receber dossie da area',
    location: 'Luis Eduardo Magalhaes, Bahia',
    stats: [{ label: 'Agricultavel', value: '2.400 ha' }, { label: 'Altitude', value: '780 m' }, { label: 'Solo', value: 'Argiloso' }, { label: 'Safras', value: '2/ano' }],
    sections: premiumBaseSections,
    highlights: ['Cooperativas proximas', 'Rodovias', 'Armazens', 'Documentacao rural'],
    formTitle: 'Quero o estudo da area',
    formSubmit: 'Solicitar dossie'
  }),
  buildPremiumTemplate({
    id: 'premium-sitio-chacara',
    name: 'Sitio ou Chacara Emocional',
    description: 'Pagina para lazer rural com fotos grandes, piscina, lago, pomar, distancia da cidade e agenda.',
    thumbnail: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=1920&auto=format&fit=crop',
    group: 'Rural',
    category: 'Sitio e chacara',
    objective: 'Agendar visita',
    style: 'Rural',
    resources: ['Galeria', 'Tour virtual', 'WhatsApp', 'Agenda', 'CRM'],
    tags: ['sitio', 'chacara', 'lazer'],
    pipeline: 'Pipeline Rural',
    crmTags: ['Lead Rural', 'Lazer'],
    conversionEvent: 'lead_chacara',
    theme: { primaryColor: '#0f766e', secondaryColor: '#f97316' },
    heroTitle: 'Seu refugio perto da cidade',
    heroSubtitle: 'Casa, piscina, lago, pomar, area gourmet e visita agendada para sentir o lugar.',
    ctaText: 'Agendar visita',
    location: 'Atibaia, Sao Paulo',
    stats: [{ label: 'Area', value: '20.000 m2' }, { label: 'Casa', value: '4 quartos' }, { label: 'Lazer', value: 'Completo' }, { label: 'Distancia', value: '18 km' }],
    sections: premiumBaseSections,
    highlights: ['Fotos grandes', 'Mapa e distancia da cidade', 'Tour virtual', 'FAQ para lazer rural'],
    formTitle: 'Quero conhecer esta chacara',
    formSubmit: 'Marcar visita'
  }),
  buildPremiumTemplate({
    id: 'premium-area-rural-investimento',
    name: 'Area Rural para Investimento',
    description: 'Landing para investidores com potencial produtivo, loteamento, valorizacao, localizacao estrategica e estudo completo.',
    thumbnail: 'https://images.unsplash.com/photo-1492496913980-501348b61469?q=80&w=1920&auto=format&fit=crop',
    group: 'Rural',
    category: 'Investimento rural',
    objective: 'Receber material',
    style: 'Corporativo',
    resources: ['Estudo completo', 'Mapa', 'Formulario qualificado', 'CRM', 'Analytics'],
    tags: ['investimento', 'valorizacao', 'area rural'],
    pipeline: 'Pipeline Rural',
    crmTags: ['Lead Rural', 'Investidor'],
    conversionEvent: 'lead_investimento_rural',
    theme: { primaryColor: '#1f2937', secondaryColor: '#22c55e' },
    heroTitle: 'Area rural com tese clara de valorizacao',
    heroSubtitle: 'Potencial de uso, loteamento, producao, logistica e analise para investidores.',
    ctaText: 'Receber estudo completo',
    location: 'Campo Grande, Mato Grosso do Sul',
    stats: [{ label: 'Area', value: '5.000 ha' }, { label: 'Rodovia', value: '12 km' }, { label: 'Potencial', value: 'Alto' }, { label: 'Documento', value: 'Regular' }],
    sections: premiumBaseSections,
    highlights: ['Potencial de loteamento', 'Analise de valorizacao', 'Localizacao estrategica', 'Formulario para investidor'],
    formTitle: 'Quero analisar esta oportunidade',
    formSubmit: 'Receber estudo'
  }),
  buildPremiumTemplate({
    id: 'premium-captacao-proprietario-rural',
    name: 'Captacao de Proprietarios Rurais',
    description: 'Pagina para captar donos de fazendas com avaliacao, sigilo, analise documental e prova de autoridade.',
    thumbnail: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=1920&auto=format&fit=crop',
    group: 'Captacao',
    category: 'Captacao rural',
    objective: 'Captar proprietario',
    style: 'Rural',
    resources: ['Formulario qualificado', 'LGPD', 'WhatsApp', 'CRM', 'Pipeline captacao'],
    tags: ['captacao', 'proprietario', 'fazenda'],
    pipeline: 'Pipeline Captacao de Imoveis',
    crmTags: ['Proprietario Rural', 'Captacao de Imovel'],
    conversionEvent: 'lead_vender_fazenda',
    theme: { primaryColor: '#064e3b', secondaryColor: '#d97706' },
    heroTitle: 'Quer vender sua fazenda com seguranca?',
    heroSubtitle: 'Avaliacao de mercado, analise documental, divulgacao qualificada e atendimento sigiloso.',
    ctaText: 'Enviar minha propriedade',
    location: 'Brasil',
    stats: [{ label: 'Sigilo', value: 'Total' }, { label: 'Avaliacao', value: 'Tecnica' }, { label: 'CRM', value: 'Captacao' }, { label: 'Atendimento', value: 'Especializado' }],
    sections: premiumBaseSections,
    highlights: ['Como funciona', 'Analise documental', 'Divulgacao qualificada', 'Prova de autoridade'],
    formTitle: 'Quero avaliar minha fazenda',
    formSubmit: 'Enviar propriedade'
  }),
  buildPremiumTemplate({
    id: 'premium-quero-comprar-imovel',
    name: 'Captacao Quero Comprar Imovel',
    description: 'Pagina de captura para compradores urbanos com cidade, tipo, faixa de investimento e prazo de compra.',
    thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1920&auto=format&fit=crop',
    group: 'Captacao',
    category: 'Compradores',
    objective: 'Captar comprador',
    style: 'Moderno',
    resources: ['Formulario qualificado', 'WhatsApp', 'CRM', 'Pipeline venda', 'LGPD'],
    tags: ['comprador', 'lead urbano', 'captacao'],
    pipeline: 'Pipeline Venda Urbana',
    crmTags: ['Lead Urbano', 'Comprador'],
    conversionEvent: 'lead_quero_comprar',
    theme: { primaryColor: '#4f46e5', secondaryColor: '#06b6d4' },
    heroTitle: 'Encontre o imovel certo sem perder tempo',
    heroSubtitle: 'Informe cidade, perfil, faixa de investimento e receba oportunidades compativeis.',
    ctaText: 'Receber oportunidades',
    location: 'Brasil',
    stats: [{ label: 'Tipo', value: 'Casa/Apto' }, { label: 'Faixa', value: 'Personalizada' }, { label: 'CRM', value: 'Automatico' }, { label: 'Contato', value: 'WhatsApp' }],
    sections: premiumBaseSections,
    highlights: ['Campos dinamicos por perfil', 'Tags automaticas', 'Funil de venda urbana', 'Mensagem de WhatsApp pronta'],
    formTitle: 'Quero comprar um imovel',
    formSubmit: 'Enviar perfil'
  }),
  buildPremiumTemplate({
    id: 'premium-quero-vender-imovel',
    name: 'Captacao Quero Vender Meu Imovel',
    description: 'Landing para proprietarios urbanos com avaliacao, urgencia, situacao documental e pipeline de captacao.',
    thumbnail: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1920&auto=format&fit=crop',
    group: 'Captacao',
    category: 'Vendedores',
    objective: 'Captar vendedor',
    style: 'Institucional',
    resources: ['Avaliacao gratuita', 'Formulario qualificado', 'WhatsApp', 'CRM', 'LGPD'],
    tags: ['vendedor', 'captacao', 'avaliacao'],
    pipeline: 'Pipeline Captacao de Imoveis',
    crmTags: ['Proprietario Urbano', 'Captacao de Imovel'],
    conversionEvent: 'lead_vender_imovel',
    theme: { primaryColor: '#0f172a', secondaryColor: '#f97316' },
    heroTitle: 'Venda seu imovel com estrategia e seguranca',
    heroSubtitle: 'Receba avaliacao, plano de divulgacao e atendimento consultivo para captar compradores qualificados.',
    ctaText: 'Avaliar meu imovel',
    location: 'Brasil',
    stats: [{ label: 'Avaliacao', value: 'Gratuita' }, { label: 'Divulgacao', value: 'Qualificada' }, { label: 'CRM', value: 'Captacao' }, { label: 'LGPD', value: 'Inclusa' }],
    sections: premiumBaseSections,
    highlights: ['Valor estimado', 'Situacao documental', 'Urgencia de venda', 'Pipeline de captacao'],
    formTitle: 'Quero vender meu imovel',
    formSubmit: 'Solicitar avaliacao'
  }),
  buildPremiumTemplate({
    id: 'premium-quero-comprar-fazenda',
    name: 'Captacao Quero Comprar Fazenda',
    description: 'Pagina para comprador rural com estado desejado, area, finalidade, investimento e prazo.',
    thumbnail: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1920&auto=format&fit=crop',
    group: 'Captacao',
    category: 'Comprador rural',
    objective: 'Captar comprador rural',
    style: 'Rural',
    resources: ['Formulario rural', 'WhatsApp', 'CRM', 'Pipeline rural', 'LGPD'],
    tags: ['comprar fazenda', 'rural', 'investidor'],
    pipeline: 'Pipeline Rural',
    crmTags: ['Lead Rural', 'Comprador Rural'],
    conversionEvent: 'lead_comprar_fazenda',
    theme: { primaryColor: '#14532d', secondaryColor: '#ca8a04' },
    heroTitle: 'Receba fazendas compativeis com sua estrategia',
    heroSubtitle: 'Informe estado, area, finalidade, investimento e prazo para receber oportunidades qualificadas.',
    ctaText: 'Receber fazendas',
    location: 'Brasil',
    stats: [{ label: 'Finalidade', value: 'Pecuaria/Plantio' }, { label: 'Area', value: 'Personalizada' }, { label: 'Dossie', value: 'Tecnico' }, { label: 'CRM', value: 'Rural' }],
    sections: premiumBaseSections,
    highlights: ['Finalidade da compra', 'Faixa de investimento', 'Estado desejado', 'Prazo para compra'],
    formTitle: 'Quero comprar fazenda',
    formSubmit: 'Enviar perfil rural'
  }),
  buildPremiumTemplate({
    id: 'premium-institucional-corretor',
    name: 'Pagina Institucional de Corretor',
    description: 'Pagina premium para corretor ou imobiliaria com autoridade, especialidades, prova social e captacao.',
    thumbnail: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1920&auto=format&fit=crop',
    group: 'Institucional',
    category: 'Corretor e imobiliaria',
    objective: 'Falar com corretor',
    style: 'Institucional',
    resources: ['Prova social', 'WhatsApp', 'Formulario', 'CRM', 'SEO'],
    tags: ['corretor', 'imobiliaria', 'institucional'],
    pipeline: 'Pipeline Venda Urbana',
    crmTags: ['Lead Institucional'],
    conversionEvent: 'lead_institucional',
    theme: { primaryColor: '#111827', secondaryColor: '#4f46e5' },
    heroTitle: 'Atendimento imobiliario consultivo e orientado por dados',
    heroSubtitle: 'Apresente sua autoridade, especialidades, CRECI, portfolio e canais de contato em uma pagina profissional.',
    ctaText: 'Falar com corretor',
    location: 'Brasil',
    stats: [{ label: 'CRECI', value: 'Ativo' }, { label: 'Especialidades', value: 'Urbano/Rural' }, { label: 'CRM', value: 'Integrado' }, { label: 'SEO', value: 'Pronto' }],
    sections: premiumBaseSections,
    highlights: ['Foto do corretor', 'Redes sociais', 'Prova de autoridade', 'Formulario e WhatsApp'],
    formTitle: 'Quero falar com um especialista',
    formSubmit: 'Enviar contato'
  })
];

const LEGACY_LANDING_PAGE_TEMPLATES: LandingPageTemplate[] = [
  {
    id: 'investment-rural',
    name: 'Investimento em Terra',
    description: 'Focalizado em investidores e rentabilidade agrícola.',
    thumbnail: '/templates/template_investment.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#064e3b',
      secondaryColor: '#d4af37',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Invista em Terra: Segurança e Alta Rentabilidade',
          subtitle: 'Oportunidades exclusivas em áreas de expansão agrícola com alto potencial de valorização.',
          backgroundImage: '/templates/template_investment.png',
          overlayOpacity: 0.5,
          ctaText: 'Falar com Especialista',
          ctaLink: '#contato',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      },
      {
        type: BlockType.STATS,
        order: 1,
        visible: true,
        config: {
          stats: [
            { label: 'Hectares Disponíveis', value: '50.000+', icon: 'Map' },
            { label: 'Valorização Média aa', value: '15%', icon: 'TrendingUp' },
            { label: 'Anos de Mercado', value: '25', icon: 'Shield' }
          ],
          columns: 3
        } as any,
        styles: { padding: '80px 20px', backgroundColor: '#f9fafb' },
        responsive: {}
      },
      {
        type: BlockType.PROPERTY_GRID,
        order: 2,
        visible: true,
        config: { columns: 3, gap: 24, showFilters: true, maxItems: 6, sortBy: 'price', cardStyle: 'modern' },
        styles: { padding: '60px 20px' },
        responsive: {}
      }
    ]
  },
  {
    id: 'production-ready',
    name: 'Fazenda Pronta para Produzir',
    description: 'Ideal para operação imediata e infraestrutura completa.',
    thumbnail: '/templates/template_production.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#15803d',
      secondaryColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Fazenda Pronta para Produzir',
          subtitle: 'Infraestrutura completa para soja, milho e algodão. Sede moderna e silos de alta capacidade.',
          backgroundImage: '/templates/template_production.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver Instalações',
          ctaLink: '#detalhes',
          height: 600,
          alignment: 'left',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      },
      {
        type: BlockType.FEATURES,
        order: 1,
        visible: true,
        config: {
          features: [
            { title: 'Solo Fértil', description: 'Alta safra garantida', icon: '🌱' },
            { title: 'Silos Modernos', description: 'Armazenamento seguro', icon: '🏗️' },
            { title: 'Acesso Fácil', description: 'Logística otimizada', icon: '🚚' }
          ],
          columns: 3
        },
        styles: { padding: '80px 20px' },
        responsive: {}
      }
    ]
  },
  {
    id: 'livestock-focus',
    name: 'Pecuária Lucrativa',
    description: 'Especializado em gado de corte e recria.',
    thumbnail: '/templates/template_livestock.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#0f172a',
      secondaryColor: '#f1f5f9',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      fontFamily: 'Inter',
      borderRadius: '0.25rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Ideal para Pecuária Lucrativa',
          subtitle: 'Capacidade para 1.000+ cabeças, pastagens rotacionadas e currais de ponta.',
          backgroundImage: '/templates/template_livestock.png',
          overlayOpacity: 0.3,
          ctaText: 'Receber Proposta',
          ctaLink: '#contato',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'opportunity-sale',
    name: 'Oportunidade Única à Vista',
    description: 'Focado em ofertas de ocasião e alta liquidez.',
    thumbnail: '/templates/template_opportunity.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#b91c1c',
      secondaryColor: '#fcd34d',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Oportunidade Única à Vista',
          subtitle: 'Desconto exclusivo para pagamento imediato. Oferta imperdível!',
          backgroundImage: '/templates/template_opportunity.png',
          overlayOpacity: 0.5,
          ctaText: 'Ver Detalhes Agora',
          ctaLink: '#info',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'lifestyle-rural',
    name: 'Pronta para Morar e Produzir',
    description: 'Estilo de vida no campo com produtividade.',
    thumbnail: '/templates/template_lifestyle.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#064e3b',
      secondaryColor: '#d4af37',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Pronta para Morar e Produzir',
          subtitle: 'Casa sede completa, curral, energia e água em abundância.',
          backgroundImage: '/templates/template_lifestyle.png',
          overlayOpacity: 0.3,
          ctaText: 'Agendar Visita',
          ctaLink: '#visita',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'location-strategic',
    name: 'Localização que Valoriza',
    description: 'Proximidade estratégica e logística rural.',
    thumbnail: '/templates/template_location_val.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#0f172a',
      secondaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Localização que Valoriza seu Investimento',
          subtitle: 'A apenas 30 min da cidade e 2h do aeroporto internacional.',
          backgroundImage: '/templates/template_location_val.png',
          overlayOpacity: 0.4,
          ctaText: 'Saiba Mais',
          ctaLink: '#mapa',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'high-productivity',
    name: 'Terra de Alta Produtividade',
    description: 'Focado em agricultura de precisão e safra.',
    thumbnail: '/templates/template_tractor_soil.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#422006',
      secondaryColor: '#facc15',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Terra de Alta Produtividade',
          subtitle: 'Solo fértil preparado para a próxima safra recorde.',
          backgroundImage: '/templates/template_tractor_soil.png',
          overlayOpacity: 0.4,
          ctaText: 'Receber Proposta',
          ctaLink: '#form',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'last-units-scarcity',
    name: 'Últimas Unidades Disponíveis!',
    description: 'Campanha de escassez e urgência de venda.',
    thumbnail: '/templates/template_last_units.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#7c2d12',
      secondaryColor: '#ea580c',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Últimas Unidades Disponíveis!',
          subtitle: 'Compra à vista com condições exclusivas por tempo limitado.',
          backgroundImage: '/templates/template_last_units.png',
          overlayOpacity: 0.6,
          ctaText: 'Garantir Agora',
          ctaLink: '#urgente',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'inflation-protection',
    name: 'Proteção contra Inflação',
    description: 'Investimento seguro em ativos reais rurais.',
    thumbnail: '/templates/template_inflation_hedge.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#064e3b',
      secondaryColor: '#059669',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Invista em Terra: Proteção contra Inflação',
          subtitle: 'Ativos reais que garantem seu patrimônio para o futuro.',
          backgroundImage: '/templates/template_inflation_hedge.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver Áreas',
          ctaLink: '#areas',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'heritage-legacy',
    name: 'O Legado e Herança',
    description: 'Tradição e patrimônio para as próximas gerações.',
    thumbnail: '/templates/template_broker_legacy.png',
    category: 'Rural',
    themeConfig: {
      primaryColor: '#334155',
      secondaryColor: '#ca8a04',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Montserrat',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'O Legado que sua Família Merece',
          subtitle: 'Construa um patrimônio sólido em terras férteis.',
          backgroundImage: '/templates/template_broker_legacy.png',
          overlayOpacity: 0.4,
          ctaText: 'Falar no WhatsApp',
          ctaLink: '#contato',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-luxury-living',
    name: 'Luxo no Coração da Cidade',
    description: 'Hero impactante com skyline e foco em apartamentos de alto padrão.',
    thumbnail: '/templates/urban/urban_apartment_center.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#0f172a',
      secondaryColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3.5rem', heading2: '2.5rem', heading3: '1.75rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Seu Novo Apartamento no Coração da Cidade',
          subtitle: 'Viva onde tudo acontece. Conforto, sofisticação e a melhor vista urbana.',
          backgroundImage: '/templates/urban/urban_apartment_center.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver Unidades Disponíveis',
          ctaLink: '#imoveis',
          height: 700,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-exclusive-launch',
    name: 'Lançamento Exclusivo',
    description: 'Campanha para novos empreendimentos com design moderno.',
    thumbnail: '/templates/urban/urban_exclusive_launch.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#1e40af',
      secondaryColor: '#60a5fa',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Lançamento Exclusivo na Região!',
          subtitle: 'Preços e condições especiais para investidores. Antecipe-se ao lançamento.',
          backgroundImage: '/templates/urban/urban_exclusive_launch.png',
          overlayOpacity: 0.5,
          ctaText: 'Quero Saber Mais',
          ctaLink: '#contato',
          height: 600,
          alignment: 'left',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-land-allotment',
    name: 'Terrenos e Loteamentos',
    description: 'Focado em venda de lotes urbanos e expansão.',
    thumbnail: '/templates/urban/urban_land_sale.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#15803d',
      secondaryColor: '#facc15',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Atenção, Terrenos à Venda!',
          subtitle: 'Financiamento direto com a incorporadora. Construa seu sonho hoje.',
          backgroundImage: '/templates/urban/urban_land_sale.png',
          overlayOpacity: 0.3,
          ctaText: 'Consultar Disponibilidade',
          ctaLink: '#mapa',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-luxury-pool-lifestyle',
    name: 'Alto Padrão com Piscina',
    description: 'Foco no estilo de vida de luxo e lazer privativo.',
    thumbnail: '/templates/urban/urban_luxury_pool.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#0c4a6e',
      secondaryColor: '#38bdf8',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      fontFamily: 'Inter',
      borderRadius: '0px',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '4rem', heading2: '3rem', heading3: '2rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Lançamento de Luxo em Localização Privilegiada',
          subtitle: 'Aprovamos seu cadastro na hora. Conheça o novo ícone do skyline.',
          backgroundImage: '/templates/urban/urban_luxury_pool.png',
          overlayOpacity: 0.2,
          ctaText: 'Agendar Visita',
          ctaLink: '#visita',
          height: 800,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-sea-view-apartments',
    name: 'Vista para o Mar',
    description: 'Imóveis litorâneos com foco na paisagem.',
    thumbnail: '/templates/urban/urban_sea_view.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#0369a1',
      secondaryColor: '#f1f5f9',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Apartamento com Vista para o Mar',
          subtitle: 'Sinta a brisa e a exclusividade de morar de frente para o azul.',
          backgroundImage: '/templates/urban/urban_sea_view.png',
          overlayOpacity: 0.1,
          ctaText: 'Ver Preço e Planta',
          ctaLink: '#plantas',
          height: 600,
          alignment: 'left',
          textColor: '#1e3a8a'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-ready-to-move-in',
    name: 'Pronto para Morar',
    description: 'Foco em imobilidade imediata e interiores mobiliados.',
    thumbnail: '/templates/urban/urban_ready_move.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#4b5563',
      secondaryColor: '#10b981',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Apartamentos Prontos para Morar',
          subtitle: 'Mude-se hoje mesmo. Preços especiais para pagamento à vista.',
          backgroundImage: '/templates/urban/urban_ready_move.png',
          overlayOpacity: 0.3,
          ctaText: 'Ver Apartamentos',
          ctaLink: '#lista',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-gated-complex',
    name: 'Condomínio Fechado Urban',
    description: 'Segurança e infraestrutura para a família.',
    thumbnail: '/templates/urban/urban_gated_community.png',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#166534',
      secondaryColor: '#fde047',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Seu Lote em Condomínio Fechado',
          subtitle: 'Segurança 24h e lazer completo para sua família.',
          backgroundImage: '/templates/urban/urban_gated_community.png',
          overlayOpacity: 0.4,
          ctaText: 'Ver Lotes Disponíveis',
          ctaLink: '#lotes',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-rental-lifestyle',
    name: 'Aluguel Sem Complicação',
    description: 'Foco no mercado de locação e agilidade no processo.',
    thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1920&auto=format&fit=crop',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#4338ca',
      secondaryColor: '#818cf8',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Aluguel de Casas e Apartamentos',
          subtitle: 'Alugue rápido e sem complicação. Seu novo lar está aqui.',
          backgroundImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1920&auto=format&fit=crop',
          overlayOpacity: 0.5,
          ctaText: 'Conhecer Empreendimentos',
          ctaLink: '#alugue',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-smart-invest',
    name: 'Investimento em Terrenos',
    description: 'Focado em quem busca valorização em terrenos urbanos.',
    thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#1e293b',
      secondaryColor: '#cbd5e1',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      fontFamily: 'Inter',
      borderRadius: '0px',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.5rem', heading3: '1.75rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Seu Terreno Privativo na Cidade',
          subtitle: 'Áreas estratégicas com alto potencial de valorização futura.',
          backgroundImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop',
          overlayOpacity: 0.6,
          ctaText: 'Falar com Consultor',
          ctaLink: '#contato',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'urban-incorporatora-credibility',
    name: 'Incorporadora de Credibilidade',
    description: 'Institucional para empresas que buscam transmitir confiança.',
    thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#0f172a',
      secondaryColor: '#f8fafc',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      fontFamily: 'Inter',
      borderRadius: '0.5rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
      fontSize: { base: '1rem', heading1: '3rem', heading2: '2.25rem', heading3: '1.875rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'Incorporadora de Credibilidade',
          subtitle: 'Construindo o futuro com solidez e transparência.',
          backgroundImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop',
          overlayOpacity: 0.4,
          ctaText: 'Nossos Empreendimentos',
          ctaLink: '#portfolio',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      }
    ]
  },
  {
    id: 'loteadora-360-premium',
    name: 'Loteadora 360° Premium',
    description: 'Template de alta conversão para lançamentos de loteamentos com foco em infraestrutura e progresso de obra.',
    thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop',
    category: 'Urban',
    themeConfig: {
      primaryColor: '#064e3b',
      secondaryColor: '#facc15',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter',
      borderRadius: '1rem',
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '4rem' },
      fontSize: { base: '1rem', heading1: '4rem', heading2: '3rem', heading3: '2rem' }
    },
    blocks: [
      {
        type: BlockType.HERO,
        order: 0,
        visible: true,
        config: {
          title: 'O Estilo de Vida que Você Sempre Sonhou',
          subtitle: 'Lotes a partir de 360m² com infraestrutura completa e financiamento direto. Oportunidade única de investimento.',
          backgroundImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop',
          overlayOpacity: 0.4,
          ctaText: 'Falar com Consultor',
          ctaLink: '#contato',
          height: 700,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0' },
        responsive: {}
      },
      {
        type: BlockType.STATS,
        order: 1,
        visible: true,
        config: {
          stats: [
            { label: 'Lotes Disponíveis', value: '85%', icon: 'Map' },
            { label: 'Obras Concluídas', value: '70%', icon: 'TrendingUp' },
            { label: 'Valorização Estimada', value: '25% aa', icon: 'Shield' }
          ],
          columns: 3
        } as any,
        styles: { padding: '100px 20px', backgroundColor: '#f0fdf4' },
        responsive: {}
      },
      {
        type: BlockType.FEATURES,
        order: 2,
        visible: true,
        config: {
          features: [
            { title: 'Asfalto CBUQ', description: 'Pavimentação de alta qualidade em todo o loteamento.', icon: '🛣️' },
            { title: 'Energia LED', description: 'Iluminação pública moderna e econômica.', icon: '💡' },
            { title: 'Área Verde', description: 'Mais de 10.000m² de preservação e lazer.', icon: '🌳' },
            { title: 'Rede de Água', description: 'Abastecimento garantido com reservatório próprio.', icon: '🚰' }
          ],
          columns: 4
        },
        styles: { padding: '80px 20px' },
        responsive: {}
      }
    ]
  }
];

export const LANDING_PAGE_TEMPLATES: LandingPageTemplate[] = [
  ...ELEMENTOR_REFERENCE_TEMPLATES,
  ...DESIGNED_SHOWCASE_TEMPLATES,
  ...PREMIUM_LANDING_PAGE_TEMPLATES,
  ...LEGACY_LANDING_PAGE_TEMPLATES
];
