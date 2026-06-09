import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bath,
  BedDouble,
  Building2,
  ChevronDown,
  Heart,
  Home,
  LayoutGrid,
  List,
  MapPin,
  MessageCircle,
  Phone,
  Rocket,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface OkaPublicSiteProps {
  organizationId?: string;
}

type PublicProperty = {
  id: string;
  title: string;
  price?: number;
  city?: string;
  state?: string;
  neighborhood?: string;
  images?: string[];
  features?: Record<string, any>;
  property_type?: string;
  type?: string;
  highlighted?: boolean;
};

const WHATSAPP_NUMBER = '5547997755555';
const PHONE_LABEL = '(47) 99775-5555';
const OKA_ORG_SLUG = 'okaimoveis';

const fallbackImages = [
  '/templates/urban/urban_sea_view.png',
  '/templates/urban/urban_luxury_pool.png',
  '/templates/urban/urban_gated_community.png',
  '/templates/urban/urban_ready_move.png',
];

const fallbackProperties: PublicProperty[] = [
  {
    id: 'oka-demo-1',
    title: 'Apartamento Frente Mar',
    price: 4950000,
    city: 'Itapema',
    state: 'SC',
    images: [fallbackImages[0]],
    features: { dormitorios: 4, suites: 4, areaM2: 205, vagas: 3 },
    highlighted: true,
  },
  {
    id: 'oka-demo-2',
    title: 'Casa em Condomínio Fechado',
    price: 2650000,
    city: 'Curitiba',
    state: 'PR',
    images: [fallbackImages[2]],
    features: { dormitorios: 3, suites: 3, areaM2: 290, vagas: 4 },
    highlighted: true,
  },
  {
    id: 'oka-demo-3',
    title: 'Apartamento Alto Padrão',
    price: 2260000,
    city: 'Florianópolis',
    state: 'SC',
    images: [fallbackImages[1]],
    features: { dormitorios: 3, suites: 3, areaM2: 156, vagas: 2 },
  },
  {
    id: 'oka-demo-4',
    title: 'Apartamento com Vista',
    price: 1180000,
    city: 'Maringá',
    state: 'PR',
    images: [fallbackImages[3]],
    features: { dormitorios: 2, suites: 2, areaM2: 120, vagas: 2 },
  },
];

function formatCurrency(value?: number) {
  if (!value) return 'Consulte';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function numberFromFeature(features: Record<string, any> | undefined, keys: string[]) {
  if (!features) return 0;
  for (const key of keys) {
    const value = features[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

function propertyImage(property: PublicProperty, index: number) {
  return property.images?.[0] || fallbackImages[index % fallbackImages.length];
}

const OkaPublicSite: React.FC<OkaPublicSiteProps> = ({ organizationId }) => {
  const [properties, setProperties] = useState<PublicProperty[]>(fallbackProperties);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        let orgId = organizationId;

        if (!orgId) {
          const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', OKA_ORG_SLUG)
            .maybeSingle();
          orgId = org?.id;
        }

        if (!orgId) return;

        const { data, error } = await supabase
          .from('properties')
          .select('id,title,price,city,state,neighborhood,images,features,property_type,type,highlighted')
          .eq('organization_id', orgId)
          .eq('status', 'Disponível')
          .limit(8);

        if (!error && data && data.length > 0) setProperties(data);
      } catch (error) {
        console.warn('[OKA] Mantendo imóveis de demonstração:', error);
      }
    };

    loadProperties();
  }, [organizationId]);

  const featured = useMemo(() => properties.slice(0, 4), [properties]);

  return (
    <div className="oka-site">
      <style>{`
        .oka-site {
          --oka-orange: #f04b12;
          --oka-charcoal: #242424;
          --oka-muted: #6d7178;
          --oka-line: #e9e2dc;
          --oka-soft: #faf8f5;
          min-height: 100vh;
          background: #fff;
          color: var(--oka-charcoal);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .oka-site * { box-sizing: border-box; }
        .oka-shell { width: min(1560px, calc(100% - 48px)); margin: 0 auto; }
        .oka-nav {
          position: sticky; top: 0; z-index: 30; height: 74px; background: rgba(255,255,255,.96);
          border-bottom: 1px solid var(--oka-line); backdrop-filter: blur(18px);
        }
        .oka-nav-inner { height: 100%; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .oka-logo { height: 57px; width: 178px; object-fit: contain; object-position: left center; }
        .oka-menu { display: flex; align-items: center; gap: 36px; font-size: 14px; font-weight: 750; }
        .oka-menu a { color: #1f1f1f; text-decoration: none; }
        .oka-menu a:first-child { color: var(--oka-orange); }
        .oka-actions { display: flex; align-items: center; gap: 12px; }
        .oka-btn {
          border: 1px solid var(--oka-line); background: #fff; color: #191919; height: 44px; padding: 0 20px;
          border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          font-size: 14px; font-weight: 800; text-decoration: none; white-space: nowrap; cursor: pointer;
        }
        .oka-btn-primary { background: var(--oka-orange); color: #fff; border-color: var(--oka-orange); box-shadow: 0 14px 30px rgba(240,75,18,.24); }
        .oka-hero {
          position: relative; min-height: 420px; overflow: visible;
          background:
            linear-gradient(90deg, rgba(255,255,255,.98) 0%, rgba(255,255,255,.92) 35%, rgba(255,255,255,.12) 62%, rgba(255,255,255,0) 100%),
            url('/templates/urban/urban_luxury_pool.png') center right / cover no-repeat;
        }
        .oka-hero-content { width: min(1560px, calc(100% - 48px)); margin: 0 auto; padding: 32px 0 86px; }
        .oka-kicker { font-size: 11px; letter-spacing: .46em; font-weight: 900; text-transform: uppercase; margin: 0 0 12px; color: #222; }
        .oka-title {
          font-family: Georgia, "Times New Roman", serif; font-size: clamp(44px, 5.2vw, 80px); line-height: .94;
          max-width: 620px; font-weight: 400; margin: 0 0 14px; letter-spacing: 0;
        }
        .oka-title span { color: var(--oka-orange); }
        .oka-subtitle { color: #4a4d52; font-size: 17px; line-height: 1.35; max-width: 470px; margin: 0 0 22px; }
        .oka-hero-actions { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
        .oka-intelligence {
          width: min(1560px, calc(100% - 48px)); margin: -52px auto 0; position: relative; z-index: 5;
          background: rgba(255,255,255,.98); border: 1px solid rgba(36,36,36,.08); border-radius: 8px;
          box-shadow: 0 18px 48px rgba(38,31,26,.12); display: grid;
          grid-template-columns: 230px 1fr 1fr 1fr 1.2fr 180px; align-items: stretch;
        }
        .oka-intro { padding: 22px 22px; border-right: 1px solid var(--oka-line); }
        .oka-intro h2 { font-family: Georgia, "Times New Roman", serif; font-size: 26px; line-height: 1.04; font-weight: 400; margin: 0 0 10px; }
        .oka-intro h2 span { color: var(--oka-orange); }
        .oka-intro p { font-size: 13px; line-height: 1.45; color: var(--oka-muted); margin: 0; }
        .oka-filter { padding: 22px 16px; border-right: 1px solid var(--oka-line); min-width: 0; }
        .oka-filter-label { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 900; margin-bottom: 12px; }
        .oka-step { width: 20px; height: 20px; border-radius: 999px; background: var(--oka-orange); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; }
        .oka-segments { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
        .oka-segments.three { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .oka-segment {
          min-height: 62px; border: 1px solid var(--oka-line); border-radius: 5px; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 7px; font-size: 12px; font-weight: 750; background: #fff; color: #34363a;
        }
        .oka-segment.active { border-color: var(--oka-orange); color: var(--oka-orange); background: #fff8f5; }
        .oka-select, .oka-range {
          height: 44px; border: 1px solid var(--oka-line); border-radius: 5px; display: flex; align-items: center;
          justify-content: space-between; padding: 0 13px; color: #5c6167; font-size: 12px; background: #fff;
        }
        .oka-range { height: 62px; align-items: stretch; flex-direction: column; justify-content: center; gap: 11px; color: #333; font-weight: 800; }
        .oka-range-line { height: 4px; border-radius: 999px; background: linear-gradient(90deg, var(--oka-orange), var(--oka-orange)); position: relative; }
        .oka-range-line:before, .oka-range-line:after {
          content: ""; position: absolute; top: 50%; transform: translateY(-50%); width: 18px; height: 18px;
          border-radius: 999px; border: 3px solid #fff; background: var(--oka-orange); box-shadow: 0 0 0 1px var(--oka-orange);
        }
        .oka-range-line:before { left: 0; } .oka-range-line:after { right: 0; }
        .oka-search { padding: 22px 16px; display: flex; align-items: end; }
        .oka-search .oka-btn { width: 100%; }
        .oka-section { padding: 24px 0 0; }
        .oka-section-head { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 16px; }
        .oka-heading { font-family: Georgia, "Times New Roman", serif; font-size: 29px; font-weight: 400; margin: 0; }
        .oka-heading span { color: var(--oka-orange); }
        .oka-note { color: var(--oka-muted); font-size: 12px; margin-left: 8px; }
        .oka-link { color: var(--oka-orange); font-size: 13px; font-weight: 800; text-decoration: none; display: inline-flex; gap: 8px; align-items: center; }
        .oka-collections { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 18px; }
        .oka-collection {
          min-height: 124px; border-radius: 7px; overflow: hidden; position: relative; padding: 18px; color: #fff; display: flex; flex-direction: column; justify-content: space-between;
          background-size: cover; background-position: center; isolation: isolate;
        }
        .oka-collection:before { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.08)); z-index: -1; }
        .oka-collection.light { color: #252525; }
        .oka-collection.light:before { background: linear-gradient(90deg, rgba(255,255,255,.86), rgba(255,255,255,.35)); }
        .oka-collection h3 { font-family: Georgia, "Times New Roman", serif; font-size: 20px; font-weight: 400; margin: 0 0 8px; }
        .oka-collection p { font-size: 13px; line-height: 1.35; margin: 0; font-weight: 750; max-width: 270px; }
        .oka-collection strong { color: var(--oka-orange); font-size: 13px; }
        .oka-arrow { position: absolute; right: 14px; bottom: 14px; width: 36px; height: 36px; border-radius: 999px; background: #fff; color: var(--oka-orange); display: inline-flex; align-items: center; justify-content: center; }
        .oka-toolbar { display: flex; align-items: center; gap: 12px; }
        .oka-tool { height: 36px; padding: 0 14px; border: 1px solid var(--oka-line); border-radius: 5px; background: #fff; color: #333; display: inline-flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 750; }
        .oka-view { width: 42px; padding: 0; justify-content: center; }
        .oka-view.active { border-color: var(--oka-orange); color: var(--oka-orange); background: #fff8f5; }
        .oka-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 20px; }
        .oka-card { border: 1px solid var(--oka-line); border-radius: 7px; overflow: hidden; background: #fff; box-shadow: 0 10px 32px rgba(31,31,31,.06); }
        .oka-card-image { height: 142px; background-size: cover; background-position: center; position: relative; }
        .oka-tag { position: absolute; left: 12px; top: 10px; background: #fff; border-radius: 4px; padding: 7px 11px; font-size: 11px; font-weight: 900; color: #29313a; }
        .oka-heart { position: absolute; right: 12px; top: 10px; color: #fff; filter: drop-shadow(0 2px 8px rgba(0,0,0,.32)); }
        .oka-card-body { padding: 14px 14px 12px; }
        .oka-card h3 { font-size: 17px; margin: 0 0 8px; font-weight: 850; }
        .oka-location { color: #6f747a; font-size: 12px; display: flex; gap: 5px; align-items: center; margin-bottom: 12px; }
        .oka-features { display: flex; gap: 16px; color: #6f747a; font-size: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .oka-features span { display: inline-flex; align-items: center; gap: 5px; }
        .oka-price-row { display: flex; justify-content: space-between; align-items: end; gap: 10px; }
        .oka-price { color: var(--oka-orange); font-size: 18px; font-weight: 900; }
        .oka-yield { border: 1px solid var(--oka-line); border-radius: 4px; padding: 7px 11px; min-width: 88px; text-align: center; font-size: 11px; color: #62666c; }
        .oka-yield strong { display: block; color: #1f1f1f; font-size: 12px; }
        .oka-bottom { margin-top: 18px; background: linear-gradient(90deg, rgba(250,248,245,.45), rgba(250,248,245,.95), rgba(250,248,245,.45)); border-top: 1px solid #f1ece8; padding: 16px 0; }
        .oka-trust { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 18px; }
        .oka-trust-item { display: flex; gap: 12px; align-items: center; justify-content: center; color: #555; font-size: 12px; }
        .oka-trust-item strong { display: block; color: #2b2b2b; font-size: 13px; margin-bottom: 2px; }
        .oka-float { position: fixed; right: 24px; bottom: 22px; z-index: 40; display: flex; align-items: end; gap: 10px; }
        .oka-bubble { background: #fff; border: 1px solid var(--oka-line); box-shadow: 0 10px 28px rgba(0,0,0,.12); border-radius: 6px; padding: 11px 14px; font-size: 11px; font-weight: 800; color: #30343a; }
        .oka-whatsapp { width: 58px; height: 58px; border-radius: 999px; background: #25d366; color: #fff; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 12px 26px rgba(37,211,102,.32); }
        @media (max-width: 1180px) {
          .oka-menu { gap: 18px; }
          .oka-intelligence { grid-template-columns: 1fr 1fr; }
          .oka-intro, .oka-filter { border-bottom: 1px solid var(--oka-line); }
          .oka-search { align-items: center; }
          .oka-collections, .oka-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .oka-trust { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 820px) {
          .oka-shell, .oka-hero-content, .oka-intelligence { width: min(100% - 28px, 560px); }
          .oka-nav { height: auto; position: relative; }
          .oka-nav-inner { padding: 12px 0; flex-wrap: wrap; }
          .oka-menu { order: 3; width: 100%; overflow-x: auto; padding: 6px 0 2px; }
          .oka-actions .oka-btn:first-child { display: none; }
          .oka-hero { min-height: auto; background-position: center; }
          .oka-hero-content { padding: 42px 0 90px; }
          .oka-title { font-size: 45px; max-width: 460px; }
          .oka-intelligence { grid-template-columns: 1fr; margin-top: -42px; }
          .oka-intro, .oka-filter { border-right: 0; }
          .oka-search { padding-top: 4px; }
          .oka-section-head { align-items: start; flex-direction: column; }
          .oka-toolbar { flex-wrap: wrap; }
          .oka-collections, .oka-grid, .oka-trust { grid-template-columns: 1fr; }
          .oka-card-image { height: 190px; }
          .oka-float { right: 14px; bottom: 14px; }
          .oka-bubble { display: none; }
        }
      `}</style>

      <nav className="oka-nav">
        <div className="oka-shell oka-nav-inner">
          <a href="/" aria-label="OKA Imóveis">
            <img className="oka-logo" src="/clients/oka/logo.jpeg" alt="OKA Imóveis" />
          </a>
          <div className="oka-menu" aria-label="Menu principal">
            <a href="#inicio">Início</a>
            <a href="#imoveis">Imóveis</a>
            <a href="#investimento">Investimento</a>
            <a href="#regioes">Regiões</a>
            <a href="#sobre">Sobre</a>
            <a href="#contato">Contato</a>
          </div>
          <div className="oka-actions">
            <a className="oka-btn" href={`tel:${WHATSAPP_NUMBER}`}>
              <Phone size={16} />
              {PHONE_LABEL}
            </a>
            <a className="oka-btn oka-btn-primary" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
              Falar com especialista
            </a>
          </div>
        </div>
      </nav>

      <header id="inicio" className="oka-hero">
        <div className="oka-hero-content">
          <p className="oka-kicker">Alto padrão • Investimentos • Consultoria</p>
          <h1 className="oka-title">
            Imóveis que fazem sentido para sua <span>vida</span> e para seu <span>patrimônio</span>.
          </h1>
          <p className="oka-subtitle">
            A OKA seleciona, analisa e apresenta apenas oportunidades reais de valorização.
          </p>
          <div className="oka-hero-actions">
            <a className="oka-btn oka-btn-primary" href="#imoveis">
              Encontrar imóvel ideal
              <ArrowRight size={18} />
            </a>
            <a className="oka-btn" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
              Falar com especialista
              <MessageCircle size={18} />
            </a>
          </div>
        </div>
      </header>

      <section className="oka-intelligence" aria-label="Busca inteligente">
        <div className="oka-intro">
          <h2>
            Encontre com <span>inteligência</span>
          </h2>
          <p>Nosso sistema de curadoria entende seu objetivo e recomenda as melhores oportunidades para você.</p>
        </div>
        <div className="oka-filter">
          <div className="oka-filter-label">
            <span className="oka-step">1</span>
            Qual seu objetivo?
          </div>
          <div className="oka-segments">
            <button className="oka-segment active" type="button">
              <Home size={21} />
              Morar
            </button>
            <button className="oka-segment" type="button">
              <BarChart3 size={21} />
              Investir
            </button>
          </div>
        </div>
        <div className="oka-filter">
          <div className="oka-filter-label">
            <span className="oka-step">2</span>
            Qual seu perfil?
          </div>
          <div className="oka-segments three">
            <button className="oka-segment" type="button">
              <ShieldCheck size={20} />
              Conservador
            </button>
            <button className="oka-segment active" type="button">
              <Scale size={20} />
              Moderado
            </button>
            <button className="oka-segment" type="button">
              <Rocket size={20} />
              Agressivo
            </button>
          </div>
        </div>
        <div className="oka-filter">
          <div className="oka-filter-label">
            <span className="oka-step">3</span>
            Onde deseja?
          </div>
          <div className="oka-select">
            Selecione a cidade
            <ChevronDown size={16} />
          </div>
        </div>
        <div className="oka-filter">
          <div className="oka-filter-label">
            <span className="oka-step">4</span>
            Qual faixa de valor?
          </div>
          <div className="oka-range">
            <span>R$ 500 mil - R$ 5 milhões+</span>
            <div className="oka-range-line" />
          </div>
        </div>
        <div className="oka-search">
          <a className="oka-btn oka-btn-primary" href="#imoveis">
            Buscar oportunidades
            <Search size={17} />
          </a>
        </div>
      </section>

      <main className="oka-shell">
        <section id="investimento" className="oka-section">
          <div className="oka-section-head">
            <div>
              <h2 className="oka-heading">
                Coleções <span>OKA</span>
                <small className="oka-note">Imóveis selecionados com base em análise de valorização, liquidez e oportunidade.</small>
              </h2>
            </div>
            <a className="oka-link" href="#imoveis">
              Ver todas as coleções
              <ArrowRight size={16} />
            </a>
          </div>
          <div className="oka-collections">
            {[
              ['Oportunidades da Semana', 'Imóveis com preço abaixo do mercado.', '6 imóveis', fallbackImages[3], true],
              ['Alto Potencial de Valorização', 'Regiões e imóveis com grande perspectiva de crescimento.', '8 imóveis', fallbackImages[0], false],
              ['Frente Mar / Premium', 'Imóveis exclusivos com vista definitiva para o mar.', '5 imóveis', fallbackImages[1], false],
              ['Abaixo do Mercado', 'Oportunidades únicas com condições especiais.', '7 imóveis', fallbackImages[2], false],
            ].map(([title, text, count, image, light]) => (
              <article key={String(title)} className={`oka-collection ${light ? 'light' : ''}`} style={{ backgroundImage: `url("${image}")` }}>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <strong>{count}</strong>
                <span className="oka-arrow">
                  <ArrowRight size={18} />
                </span>
              </article>
            ))}
          </div>
        </section>

        <section id="imoveis" className="oka-section">
          <div className="oka-section-head">
            <h2 className="oka-heading">Imóveis em destaque</h2>
            <div className="oka-toolbar" aria-label="Opções da vitrine">
              <button className="oka-tool" type="button">
                Ver todos
                <ChevronDown size={15} />
              </button>
              <button className="oka-tool" type="button">
                Ordenar por: Relevância
                <SlidersHorizontal size={15} />
              </button>
              <button className="oka-tool oka-view active" type="button" aria-label="Visualização em grade">
                <LayoutGrid size={17} />
              </button>
              <button className="oka-tool oka-view" type="button" aria-label="Visualização em lista">
                <List size={17} />
              </button>
            </div>
          </div>

          <div className="oka-grid">
            {featured.map((property, index) => {
              const suites = numberFromFeature(property.features, ['suites', 'bedrooms', 'dormitorios']);
              const area = numberFromFeature(property.features, ['areaM2', 'area', 'areaConstruida', 'building_area']);
              const vagas = numberFromFeature(property.features, ['vagas', 'garages', 'parking_spaces']);
              const tag = index === 0 ? 'Oportunidade' : index === 1 ? 'Alto Potencial' : index === 2 ? 'Frente Mar' : 'Abaixo do Mercado';

              return (
                <article className="oka-card" key={property.id}>
                  <div className="oka-card-image" style={{ backgroundImage: `url("${propertyImage(property, index)}")` }}>
                    <span className="oka-tag">{tag}</span>
                    <Heart className="oka-heart" size={24} />
                  </div>
                  <div className="oka-card-body">
                    <h3>{property.title}</h3>
                    <div className="oka-location">
                      <MapPin size={14} />
                      {[property.city, property.state].filter(Boolean).join(' - ') || 'Localização sob consulta'}
                    </div>
                    <div className="oka-features">
                      <span>
                        <BedDouble size={15} />
                        {suites || 3} suítes
                      </span>
                      <span>
                        <Building2 size={15} />
                        {area || 120}m²
                      </span>
                      <span>
                        <Bath size={15} />
                        {vagas || 2} vagas
                      </span>
                    </div>
                    <div className="oka-price-row">
                      <strong className="oka-price">{formatCurrency(property.price)}</strong>
                      <span className="oka-yield">
                        Rentabilidade
                        <strong>{(0.68 + index * 0.07).toFixed(2).replace('.', ',')}% a.m.</strong>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <section id="sobre" className="oka-bottom">
        <div className="oka-shell oka-trust">
          <div className="oka-trust-item">
            <Sparkles size={32} />
            <span>
              <strong>Curadoria Especializada</strong>
              Análise criteriosa de cada imóvel.
            </span>
          </div>
          <div className="oka-trust-item">
            <ShieldCheck size={32} />
            <span>
              <strong>Consultoria Personalizada</strong>
              Entendemos seu objetivo e momento.
            </span>
          </div>
          <div className="oka-trust-item">
            <BarChart3 size={32} />
            <span>
              <strong>Investimento Inteligente</strong>
              Decisões baseadas em dados reais.
            </span>
          </div>
          <div className="oka-trust-item">
            <UserRoundCheck size={32} />
            <span>
              <strong>Atendimento Humanizado</strong>
              Acompanhamento completo em todas as etapas.
            </span>
          </div>
        </div>
      </section>

      <div id="contato" className="oka-float">
        <div className="oka-bubble">Fale com um especialista agora!</div>
        <a className="oka-whatsapp" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp">
          <MessageCircle size={31} />
        </a>
      </div>
    </div>
  );
};

export default OkaPublicSite;
