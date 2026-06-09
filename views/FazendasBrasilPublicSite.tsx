import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  ChevronDown,
  Facebook,
  Heart,
  Instagram,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Ruler,
  Search,
  Sprout,
  Tractor,
  UsersRound,
  Youtube,
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface FazendasBrasilPublicSiteProps {
  organizationId?: string;
}

type PublicProperty = {
  id: string;
  title: string;
  price?: number;
  city?: string;
  state?: string;
  images?: string[];
  property_type?: string;
  highlighted?: boolean;
  total_area_ha?: number;
  useful_area_ha?: number;
  features?: Record<string, any>;
  aptitude?: string[] | string;
};

const FAZENDAS_ORG_SLUG = 'fazendasbrasil';
const WHATSAPP_NUMBER = '5544998433030';
const PHONE_LABEL = '(44) 99843-3030';
const EMAIL = 'ele@fazendasbrasil.com.br';
const LOGO_URL = '/images/fazendas-brasil/logo.png';
const BROKER_PHOTO_URL = '/images/fazendas-brasil/renato.png';

const fallbackImages = [
  '/templates/template_livestock.png',
  '/templates/template_production.png',
  '/templates/template_investment.png',
  '/templates/elementor_refs/fazenda-produtiva.png',
  '/templates/elementor_refs/fazendas-valor.png',
  '/templates/template_opportunity.png',
];

const fallbackProperties: PublicProperty[] = [
  {
    id: 'fazendas-demo-1',
    title: 'Fazenda em Jatai - GO',
    price: 28000000,
    city: 'Jatai',
    state: 'GO',
    images: [fallbackImages[0]],
    property_type: 'Pecuaria',
    total_area_ha: 820,
  },
  {
    id: 'fazendas-demo-2',
    title: 'Fazenda em Sorriso - MT',
    price: 45000000,
    city: 'Sorriso',
    state: 'MT',
    images: [fallbackImages[1]],
    property_type: 'Agricultura',
    total_area_ha: 1200,
  },
  {
    id: 'fazendas-demo-3',
    title: 'Fazenda em Rio Verde - GO',
    price: 19500000,
    city: 'Rio Verde',
    state: 'GO',
    images: [fallbackImages[2]],
    property_type: 'Agricultura',
    total_area_ha: 650,
  },
  {
    id: 'fazendas-demo-4',
    title: 'Fazenda em Cristalina - GO',
    price: 19500000,
    city: 'Cristalina',
    state: 'GO',
    images: [fallbackImages[3]],
    property_type: 'Pecuaria',
    total_area_ha: 430,
  },
  {
    id: 'fazendas-demo-5',
    title: 'Fazenda em Sao Felix do Araguaia - MT',
    price: 62000000,
    city: 'Sao Felix do Araguaia',
    state: 'MT',
    images: [fallbackImages[4]],
    property_type: 'Pecuaria',
    total_area_ha: 2600,
  },
  {
    id: 'fazendas-demo-6',
    title: 'Fazenda em Barreiras - BA',
    price: 35000000,
    city: 'Barreiras',
    state: 'BA',
    images: [fallbackImages[5]],
    property_type: 'Agricultura',
    total_area_ha: 1500,
  },
];

function formatCurrency(value?: number) {
  if (!value) return 'Sob consulta';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function formatArea(value?: number) {
  if (!value) return 'Area sob consulta';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ha`;
}

function getFeatureNumber(property: PublicProperty, keys: string[]) {
  for (const key of keys) {
    const rawValue = property.features?.[key] ?? (property as any)[key];
    if (typeof rawValue === 'number') return rawValue;
    if (typeof rawValue === 'string') {
      const parsed = Number(rawValue.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

function getPropertyArea(property: PublicProperty) {
  return (
    property.total_area_ha ||
    property.useful_area_ha ||
    getFeatureNumber(property, ['areaHectares', 'area_ha', 'areaHa', 'hectares'])
  );
}

function getAptitude(property: PublicProperty) {
  if (Array.isArray(property.aptitude) && property.aptitude[0]) return property.aptitude[0];
  if (typeof property.aptitude === 'string' && property.aptitude) return property.aptitude;
  return property.property_type || 'Fazenda';
}

function getPropertyImage(property: PublicProperty, index: number) {
  return property.images?.[0] || fallbackImages[index % fallbackImages.length];
}

const FazendasBrasilPublicSite: React.FC<FazendasBrasilPublicSiteProps> = ({
  organizationId,
}) => {
  const [properties, setProperties] = useState<PublicProperty[]>(fallbackProperties);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        let orgId = organizationId;

        if (!orgId) {
          const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', FAZENDAS_ORG_SLUG)
            .maybeSingle();
          orgId = org?.id;
        }

        if (!orgId) return;

        const { data, error } = await supabase
          .from('properties')
          .select(
            'id,title,price,city,state,images,property_type,highlighted,total_area_ha,useful_area_ha,features,aptitude'
          )
          .eq('organization_id', orgId)
          .limit(12);

        if (!error && data && data.length > 0) setProperties(data);
      } catch (error) {
        console.warn('[Fazendas Brasil] Mantendo vitrine de fallback:', error);
      }
    };

    loadProperties();
  }, [organizationId]);

  const featured = useMemo(() => properties.slice(0, 6), [properties]);
  const heroImage = getPropertyImage(featured[0] || fallbackProperties[0], 0);

  return (
    <div className="fb-site">
      <style>{`
        .fb-site {
          --fb-green: #064e2f;
          --fb-green-2: #0b6a3a;
          --fb-gold: #c98b16;
          --fb-gold-2: #f0b11f;
          --fb-ink: #132018;
          --fb-muted: #5c665f;
          --fb-line: #e5e2dc;
          min-height: 100vh;
          color: var(--fb-ink);
          background: #f7f8f4;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .fb-site * { box-sizing: border-box; }
        .fb-shell { width: min(1720px, calc(100% - 88px)); margin: 0 auto; }
        .fb-topbar {
          height: 43px; color: #fff; background: linear-gradient(90deg, #043d25, #022e1d);
          font-size: 13px; font-weight: 700;
        }
        .fb-topbar .fb-shell { height: 100%; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .fb-topbar-group { display: flex; align-items: center; gap: 44px; }
        .fb-topbar-item, .fb-contact-link { display: inline-flex; align-items: center; gap: 9px; color: #fff; text-decoration: none; white-space: nowrap; }
        .fb-nav { height: 86px; background: rgba(255,255,255,.98); border-bottom: 1px solid rgba(20,32,24,.12); position: sticky; top: 0; z-index: 30; }
        .fb-nav .fb-shell { height: 100%; display: flex; align-items: center; justify-content: space-between; gap: 28px; }
        .fb-logo { width: 150px; height: 86px; object-fit: contain; object-position: left center; }
        .fb-menu { display: flex; align-items: center; gap: 42px; font-size: 13px; font-weight: 850; text-transform: uppercase; }
        .fb-menu a { color: #161f19; text-decoration: none; white-space: nowrap; }
        .fb-menu a:first-child { color: var(--fb-gold); position: relative; }
        .fb-menu a:first-child:after { content: ""; position: absolute; left: 0; right: 0; bottom: -20px; height: 2px; background: var(--fb-gold); }
        .fb-btn {
          border: 1px solid rgba(201,139,22,.7); background: transparent; color: var(--fb-green);
          height: 48px; min-width: 0; padding: 0 24px; border-radius: 5px; display: inline-flex;
          align-items: center; justify-content: center; gap: 12px; text-decoration: none; font-size: 13px;
          font-weight: 900; text-transform: uppercase; letter-spacing: 0; white-space: nowrap;
        }
        .fb-btn-primary { background: linear-gradient(180deg, #d69a23, #bd7c0c); color: #fff; border-color: #c98b16; box-shadow: 0 12px 26px rgba(128,83,8,.22); }
        .fb-btn-green { background: linear-gradient(180deg, #075d35, #034827); color: #fff; border-color: #034827; }
        .fb-hero {
          min-height: 444px; position: relative; isolation: isolate; color: #fff;
          background:
            linear-gradient(90deg, rgba(4,43,25,.94), rgba(4,43,25,.58) 38%, rgba(4,43,25,.08) 78%),
            linear-gradient(0deg, rgba(0,0,0,.32), rgba(0,0,0,.12)),
            url("${heroImage}") center / cover no-repeat;
        }
        .fb-hero .fb-shell { position: relative; min-height: 444px; display: flex; align-items: center; }
        .fb-hero-content { width: min(690px, 55vw); padding-bottom: 56px; }
        .fb-kicker { color: var(--fb-gold-2); font-size: 23px; line-height: 1; letter-spacing: .45em; text-transform: uppercase; margin: 0 0 18px; font-weight: 500; }
        .fb-title {
          font-family: Georgia, "Times New Roman", serif; font-size: clamp(48px, 5.1vw, 72px);
          line-height: .96; font-weight: 700; margin: 0 0 18px; letter-spacing: 0;
        }
        .fb-subtitle { font-size: 19px; line-height: 1.42; max-width: 560px; margin: 0 0 28px; color: rgba(255,255,255,.96); }
        .fb-hero-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .fb-broker {
          position: absolute; right: 58px; top: 18px; width: 328px; min-height: 386px; border-radius: 8px;
          background: rgba(255,255,255,.97); color: var(--fb-ink); box-shadow: 0 18px 46px rgba(0,0,0,.24);
          padding: 24px 22px 20px; text-align: center;
        }
        .fb-broker-photo { width: 138px; height: 138px; border-radius: 999px; object-fit: cover; border: 7px solid #fff; box-shadow: 0 0 0 5px rgba(201,139,22,.2), 0 10px 28px rgba(0,0,0,.22); margin: 0 auto 15px; display: block; }
        .fb-help { margin: 0 0 4px; color: var(--fb-green); font-size: 13px; font-weight: 850; font-style: italic; }
        .fb-broker h2 { margin: 0; font-size: 23px; line-height: 1.05; font-weight: 900; }
        .fb-broker small { display: block; margin: 8px 0 14px; color: #646d66; font-size: 13px; }
        .fb-broker-phone { display: inline-flex; align-items: center; gap: 8px; color: var(--fb-green); text-decoration: none; font-size: 21px; font-weight: 500; margin-bottom: 16px; }
        .fb-broker-actions { display: grid; gap: 11px; }
        .fb-search-panel {
          width: min(1280px, calc(100% - 88px)); margin: -48px auto 0; position: relative; z-index: 10;
          background: rgba(255,255,255,.98); border: 1px solid rgba(22,32,24,.08); border-radius: 7px;
          box-shadow: 0 16px 34px rgba(41,35,26,.16); min-height: 96px; display: grid;
          grid-template-columns: 1.05fr 1.05fr 1.05fr 1fr 1.38fr; align-items: stretch;
        }
        .fb-filter { padding: 23px 26px; border-right: 1px solid var(--fb-line); display: flex; align-items: center; gap: 17px; min-width: 0; }
        .fb-filter:last-child { border-right: 0; }
        .fb-filter-icon { color: var(--fb-green-2); flex: 0 0 auto; }
        .fb-filter-copy { min-width: 0; width: 100%; }
        .fb-filter-label { color: #424a44; font-size: 11px; text-transform: uppercase; font-weight: 900; margin-bottom: 10px; }
        .fb-filter-main { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #2b352f; font-size: 14px; }
        .fb-filter-range { display: grid; grid-template-columns: 1fr auto 1fr; gap: 15px; color: #2b352f; font-size: 14px; }
        .fb-section { padding: 24px 0 0; }
        .fb-section-head { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin: 0 0 18px; }
        .fb-heading { font-family: Georgia, "Times New Roman", serif; font-size: 35px; line-height: 1; font-weight: 500; margin: 0 0 8px; }
        .fb-section-head p { color: var(--fb-muted); font-size: 13px; margin: 0; }
        .fb-all-link { color: var(--fb-green); text-decoration: none; display: inline-flex; align-items: center; gap: 14px; font-size: 13px; font-weight: 900; text-transform: uppercase; }
        .fb-grid { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 19px; }
        .fb-card { background: #fff; border: 1px solid var(--fb-line); border-radius: 7px; overflow: hidden; box-shadow: 0 9px 26px rgba(32,37,31,.08); }
        .fb-card-image { height: 148px; background-size: cover; background-position: center; position: relative; }
        .fb-tag { position: absolute; left: 13px; top: 10px; padding: 8px 12px; border-radius: 4px; background: #034827; color: #fff; font-size: 10px; font-weight: 900; text-transform: uppercase; }
        .fb-tag.gold { background: #c98b16; }
        .fb-card-heart { position: absolute; right: 12px; bottom: -28px; width: 30px; height: 30px; color: #59625b; background: #fff; border-radius: 999px; padding: 5px; border: 1px solid var(--fb-line); }
        .fb-card-body { padding: 15px 13px 14px; }
        .fb-card h3 { font-size: 14px; line-height: 1.22; min-height: 34px; margin: 0 30px 10px 0; font-weight: 900; }
        .fb-meta { display: flex; flex-wrap: wrap; gap: 12px; color: #565f58; font-size: 12px; margin-bottom: 12px; }
        .fb-meta span { display: inline-flex; align-items: center; gap: 5px; }
        .fb-price { display: block; color: #065c33; font-size: 18px; font-weight: 950; margin-bottom: 13px; }
        .fb-card .fb-btn { width: 100%; height: 31px; justify-content: flex-end; padding: 0 12px; font-size: 10px; border-color: #b9c3bd; box-shadow: none; }
        .fb-stats {
          margin: 22px auto 0; background: rgba(255,255,255,.88); border: 1px solid var(--fb-line); border-radius: 7px;
          display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); box-shadow: 0 8px 28px rgba(26,34,27,.06);
        }
        .fb-stat { min-height: 74px; padding: 13px 18px; display: flex; justify-content: center; align-items: center; gap: 14px; border-right: 1px solid var(--fb-line); }
        .fb-stat:last-child { border-right: 0; }
        .fb-stat svg { color: var(--fb-green-2); }
        .fb-stat strong { display: block; color: var(--fb-ink); font-size: 22px; line-height: 1; }
        .fb-stat span { display: block; color: #525d56; font-size: 12px; margin-top: 4px; }
        .fb-footer { margin-top: 0; color: rgba(255,255,255,.86); background: radial-gradient(circle at left top, rgba(8,107,58,.55), transparent 28%), linear-gradient(90deg, #043d25, #022c1c); }
        .fb-footer .fb-shell { padding: 26px 0 20px; display: grid; grid-template-columns: 1.6fr 1fr 1fr 1.25fr 1.4fr; gap: 42px; }
        .fb-footer-logo { width: 138px; height: auto; object-fit: contain; margin-bottom: 12px; }
        .fb-footer p, .fb-footer a { color: rgba(255,255,255,.82); font-size: 13px; line-height: 1.5; text-decoration: none; }
        .fb-footer h3 { color: #fff; font-size: 13px; margin: 0 0 10px; text-transform: uppercase; }
        .fb-footer-links { display: grid; gap: 6px; }
        .fb-newsletter { display: flex; align-items: center; border: 1px solid rgba(255,255,255,.28); border-radius: 4px; overflow: hidden; height: 38px; }
        .fb-newsletter input { flex: 1; min-width: 0; height: 100%; border: 0; background: transparent; color: #fff; padding: 0 13px; outline: 0; font-size: 12px; }
        .fb-newsletter button { width: 48px; height: 100%; border: 0; background: var(--fb-gold); color: #fff; display: inline-flex; align-items: center; justify-content: center; }
        .fb-footer-bottom { border-top: 1px solid rgba(255,255,255,.12); padding: 13px 0; font-size: 11px; color: rgba(255,255,255,.72); }
        .fb-footer-bottom .fb-shell { padding: 0; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
        .fb-social { display: flex; align-items: center; gap: 18px; }
        @media (max-width: 1380px) {
          .fb-menu { gap: 22px; }
          .fb-broker { right: 24px; width: 300px; }
          .fb-hero-content { width: min(620px, 52vw); }
          .fb-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
        }
        @media (max-width: 1020px) {
          .fb-shell, .fb-search-panel { width: min(100% - 32px, 760px); }
          .fb-topbar { display: none; }
          .fb-nav { height: auto; position: relative; }
          .fb-nav .fb-shell { padding: 10px 0; flex-wrap: wrap; }
          .fb-logo { width: 128px; height: 66px; }
          .fb-menu { order: 3; width: 100%; overflow-x: auto; padding: 4px 0 7px; }
          .fb-nav .fb-btn-primary { height: 42px; padding: 0 16px; }
          .fb-hero .fb-shell { min-height: auto; display: block; padding: 42px 0 0; }
          .fb-hero-content { width: 100%; padding: 0 0 34px; }
          .fb-broker { position: relative; right: auto; top: auto; width: 100%; max-width: 380px; margin: 0 0 -42px auto; }
          .fb-search-panel { margin-top: 66px; grid-template-columns: repeat(2, minmax(0,1fr)); }
          .fb-filter:nth-child(2n) { border-right: 0; }
          .fb-filter:last-child { grid-column: 1 / -1; }
          .fb-stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .fb-stat { border-bottom: 1px solid var(--fb-line); }
          .fb-footer .fb-shell { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 680px) {
          .fb-menu { gap: 18px; font-size: 12px; }
          .fb-nav .fb-btn-primary { width: 100%; }
          .fb-kicker { font-size: 15px; letter-spacing: .32em; }
          .fb-title { font-size: 43px; }
          .fb-subtitle { font-size: 16px; }
          .fb-hero-actions .fb-btn { width: 100%; }
          .fb-search-panel, .fb-grid, .fb-stats, .fb-footer .fb-shell { grid-template-columns: 1fr; }
          .fb-filter { border-right: 0; border-bottom: 1px solid var(--fb-line); }
          .fb-filter:last-child { border-bottom: 0; }
          .fb-section-head { align-items: start; flex-direction: column; }
          .fb-card-image { height: 190px; }
          .fb-stat { justify-content: flex-start; border-right: 0; }
          .fb-footer-bottom .fb-shell { align-items: flex-start; flex-direction: column; }
        }
      `}</style>

      <div className="fb-topbar">
        <div className="fb-shell">
          <div className="fb-topbar-group">
            <span className="fb-topbar-item">
              <BadgeCheck size={15} />
              Atendimento em todo o Brasil
            </span>
            <span className="fb-topbar-item">
              <Leaf size={15} />
              Especialistas em imoveis rurais
            </span>
          </div>
          <div className="fb-topbar-group">
            <a className="fb-contact-link" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
              <MessageCircle size={15} />
              {PHONE_LABEL}
            </a>
            <a className="fb-contact-link" href={`mailto:${EMAIL}`}>
              <Mail size={15} />
              {EMAIL}
            </a>
          </div>
        </div>
      </div>

      <nav className="fb-nav">
        <div className="fb-shell">
          <a href="#inicio" aria-label="Fazendas Brasil">
            <img className="fb-logo" src={LOGO_URL} alt="Fazendas Brasil" />
          </a>
          <div className="fb-menu" aria-label="Menu principal">
            <a href="#inicio">Inicio</a>
            <a href="#fazendas">Fazendas a venda</a>
            <a href="#quem-somos">Quem somos</a>
            <a href="#servicos">Servicos</a>
            <a href="#regioes">Regioes</a>
            <a href="#blog">Blog</a>
            <a href="#contato">Contato</a>
          </div>
          <a className="fb-btn fb-btn-primary" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
            <UsersRound size={17} />
            Fale com um especialista
          </a>
        </div>
      </nav>

      <header id="inicio" className="fb-hero">
        <div className="fb-shell">
          <div className="fb-hero-content">
            <p className="fb-kicker">As melhores</p>
            <h1 className="fb-title">Fazendas do Brasil em um so lugar</h1>
            <p className="fb-subtitle">
              Conectamos investidores e produtores as melhores oportunidades rurais do pais.
            </p>
            <div className="fb-hero-actions">
              <a className="fb-btn fb-btn-green" href="#fazendas">
                Ver fazendas disponiveis
                <ArrowRight size={18} />
              </a>
              <a className="fb-btn" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                Como podemos ajudar?
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          <aside className="fb-broker" id="contato" aria-label="Especialista Fazendas Brasil">
            <img className="fb-broker-photo" src={BROKER_PHOTO_URL} alt="Renato Vilmar Piovesana" />
            <p className="fb-help">Ola, posso te ajudar?</p>
            <h2>Renato Vilmar Piovesana</h2>
            <small>CRECI 16644F</small>
            <a className="fb-broker-phone" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
              <MessageCircle size={22} />
              {PHONE_LABEL}
            </a>
            <div className="fb-broker-actions">
              <a className="fb-btn fb-btn-green" href="#fazendas">
                Ver meus imoveis
                <ArrowRight size={17} />
              </a>
              <a className="fb-btn" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                Falar no WhatsApp
                <MessageCircle size={17} />
              </a>
            </div>
          </aside>
        </div>
      </header>

      <section className="fb-search-panel" aria-label="Filtros de busca">
        <div className="fb-filter">
          <Sprout className="fb-filter-icon" size={28} />
          <div className="fb-filter-copy">
            <div className="fb-filter-label">Tipo de imovel</div>
            <div className="fb-filter-main">
              Fazenda
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
        <div className="fb-filter">
          <Leaf className="fb-filter-icon" size={28} />
          <div className="fb-filter-copy">
            <div className="fb-filter-label">Aptidao</div>
            <div className="fb-filter-main">
              Selecione
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
        <div className="fb-filter">
          <MapPin className="fb-filter-icon" size={28} />
          <div className="fb-filter-copy">
            <div className="fb-filter-label">Estado</div>
            <div className="fb-filter-main">
              Selecione
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
        <div className="fb-filter">
          <Ruler className="fb-filter-icon" size={28} />
          <div className="fb-filter-copy">
            <div className="fb-filter-label">Hectares</div>
            <div className="fb-filter-range">
              <span>De</span>
              <span>ate</span>
              <span />
            </div>
          </div>
        </div>
        <div className="fb-filter">
          <Banknote className="fb-filter-icon" size={29} />
          <div className="fb-filter-copy">
            <div className="fb-filter-label">Valor (R$)</div>
            <div className="fb-filter-range">
              <span>Min.</span>
              <span />
              <span>Max.</span>
            </div>
          </div>
        </div>
      </section>

      <main className="fb-shell">
        <section id="fazendas" className="fb-section">
          <div className="fb-section-head">
            <div>
              <h2 className="fb-heading">Fazendas disponiveis</h2>
              <p>Selecionamos as melhores oportunidades para voce investir.</p>
            </div>
            <a className="fb-all-link" href="#fazendas">
              Ver todas as fazendas
              <ArrowRight size={18} />
            </a>
          </div>

          <div className="fb-grid">
            {featured.map((property, index) => {
              const tag = index === 0 ? 'Exclusivo' : index === 3 ? 'Destaque' : index % 2 === 0 ? 'Alta produtividade' : 'Oportunidade';
              const area = getPropertyArea(property);

              return (
                <article className="fb-card" key={property.id}>
                  <div className="fb-card-image" style={{ backgroundImage: `url("${getPropertyImage(property, index)}")` }}>
                    <span className={`fb-tag ${index % 2 ? 'gold' : ''}`}>{tag}</span>
                    <Heart className="fb-card-heart" size={30} />
                  </div>
                  <div className="fb-card-body">
                    <h3>{property.title}</h3>
                    <div className="fb-meta">
                      <span>
                        <Ruler size={13} />
                        {formatArea(area)}
                      </span>
                      <span>
                        <Sprout size={13} />
                        {getAptitude(property)}
                      </span>
                    </div>
                    <strong className="fb-price">{formatCurrency(property.price)}</strong>
                    <a className="fb-btn" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                      Ver detalhes
                      <ArrowRight size={14} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="fb-stats" id="quem-somos">
          <div className="fb-stat">
            <Tractor size={34} />
            <div>
              <strong>+120</strong>
              <span>Fazendas disponiveis</span>
            </div>
          </div>
          <div className="fb-stat">
            <MapPin size={34} />
            <div>
              <strong>+10</strong>
              <span>Estados atendidos</span>
            </div>
          </div>
          <div className="fb-stat">
            <BadgeCheck size={34} />
            <div>
              <strong>+20 anos</strong>
              <span>De experiencia</span>
            </div>
          </div>
          <div className="fb-stat">
            <UsersRound size={34} />
            <div>
              <strong>+1.500</strong>
              <span>Clientes atendidos</span>
            </div>
          </div>
          <div className="fb-stat">
            <BarChart3 size={34} />
            <div>
              <strong>+R$ 2 bi</strong>
              <span>Em negocios realizados</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="fb-footer" id="servicos">
        <div className="fb-shell">
          <div>
            <img className="fb-footer-logo" src={LOGO_URL} alt="Fazendas Brasil" />
            <p>Ha mais de 20 anos conectando pessoas as melhores oportunidades rurais do Brasil.</p>
          </div>
          <div className="fb-footer-links">
            <h3>Navegacao</h3>
            <a href="#fazendas">Fazendas a venda</a>
            <a href="#quem-somos">Quem somos</a>
            <a href="#servicos">Servicos</a>
            <a href="#blog">Blog</a>
            <a href="#contato">Contato</a>
          </div>
          <div className="fb-footer-links" id="regioes">
            <h3>Regioes</h3>
            <a href="#fazendas">Centro-Oeste</a>
            <a href="#fazendas">Norte</a>
            <a href="#fazendas">Nordeste</a>
            <a href="#fazendas">Sudeste</a>
            <a href="#fazendas">Sul</a>
          </div>
          <div className="fb-footer-links">
            <h3>Servicos</h3>
            <a href="#contato">Avaliacao de imoveis</a>
            <a href="#contato">Consultoria rural</a>
            <a href="#contato">Compra e venda</a>
            <a href="#contato">Administracao de fazendas</a>
          </div>
          <div id="blog">
            <h3>Newsletter</h3>
            <p>Receba oportunidades exclusivas diretamente no seu e-mail.</p>
            <div className="fb-newsletter">
              <input aria-label="Seu melhor e-mail" placeholder="Seu melhor e-mail" />
              <button type="button" aria-label="Cadastrar e-mail">
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="fb-footer-bottom">
          <div className="fb-shell">
            <span>© 2024 Fazendas Brasil. Todos os direitos reservados.</span>
            <div className="fb-social">
              <a href="#privacidade">Politica de Privacidade</a>
              <a href="#termos">Termos de Uso</a>
              <Instagram size={16} />
              <Facebook size={16} />
              <Youtube size={17} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FazendasBrasilPublicSite;
