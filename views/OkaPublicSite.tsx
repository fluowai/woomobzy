import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ArrowRight,
  BarChart3,
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
  Sparkles,
  UserRoundCheck,
  Menu,
  X,
  ChevronRight,
  Mail,
  Instagram,
  Youtube,
  Linkedin,
  ChevronUp,
  AlertCircle,
  Maximize2,
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

const CIDADES = ['Itapema', 'Balneário Camboriú', 'Florianópolis', 'Curitiba', 'Maringá', 'Londrina', 'Joinville', 'São Paulo'];

const OkaPublicSite: React.FC<OkaPublicSiteProps> = ({ organizationId }) => {
  const [properties, setProperties] = useState<PublicProperty[]>(fallbackProperties);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterObjetivo, setFilterObjetivo] = useState<'morar' | 'investir'>('morar');
  const [filterPerfil, setFilterPerfil] = useState<string>('moderado');
  const [filterCity, setFilterCity] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState(0);
  const [showAllProperties, setShowAllProperties] = useState(false);
  const [loading, setLoading] = useState(false);

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

        setLoading(true);
        const { data, error } = await supabase
          .from('properties')
          .select('id,title,price,city,state,neighborhood,images,features,property_type,type,highlighted')
          .eq('organization_id', orgId)
          .eq('status', 'Disponível')
          .order('highlighted', { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) setProperties(data);
        setLoading(false);
      } catch (error) {
        console.warn('[OKA] Mantendo imóveis de demonstração:', error);
        setLoading(false);
      }
    };

    loadProperties();
  }, [organizationId]);

  const filtered = useMemo(() => {
    let list = [...properties];
    if (filterCity) {
      list = list.filter((p) => p.city?.toLowerCase().includes(filterCity.toLowerCase()));
    }
    if (filterPriceMax > 0) {
      list = list.filter((p) => (p.price || 0) <= filterPriceMax);
    }
    return list;
  }, [properties, filterCity, filterPriceMax]);

  const featured = useMemo(() => properties.slice(0, 4), [properties]);
  const displayProperties = showAllProperties ? filtered : filtered.slice(0, 4);
  const hasActiveFilters = filterCity || filterPriceMax > 0;
  const uniqueCities = useMemo(() => {
    const cities = new Set(properties.map((p) => p.city).filter(Boolean));
    return [...CIDADES, ...cities].filter((v, i, a) => a.indexOf(v) === i);
  }, [properties]);

  const clearFilters = useCallback(() => {
    setFilterCity('');
    setFilterPriceMax(0);
    setFilterObjetivo('morar');
    setFilterPerfil('moderado');
  }, []);

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
        .hidden { display: none !important; }
        .oka-shell { width: min(1560px, calc(100% - 48px)); margin: 0 auto; }
        .oka-nav {
          position: sticky; top: 0; z-index: 30; height: 74px; background: rgba(255,255,255,.96);
          border-bottom: 1px solid var(--oka-line); backdrop-filter: blur(18px);
        }
        .oka-nav-inner { height: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .oka-logo-wrap { display: flex; align-items: center; gap: 0; flex-shrink: 0; text-decoration: none; }
        .oka-logo-img { height: 57px; width: 178px; object-fit: contain; object-position: left center; display: block; }
        .oka-logo-fallback { height: 57px; display: flex; align-items: center; font-family: Georgia, serif; font-size: 26px; font-weight: 700; color: var(--oka-charcoal); white-space: nowrap; }
        .oka-logo-fallback span { color: var(--oka-orange); }
        .oka-menu { display: flex; align-items: center; gap: 32px; font-size: 14px; font-weight: 750; }
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
        .oka-mobile-toggle { display: none; }
        .oka-menu-overlay { display: none; }

        .oka-footer {
          background: var(--oka-charcoal); color: #b0b3b8; margin-top: 64px; padding: 56px 0 0;
        }
        .oka-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr; gap: 40px; padding-bottom: 40px; }
        .oka-footer-brand p { font-size: 13px; line-height: 1.6; margin: 16px 0 20px; color: #9a9ea6; }
        .oka-footer-social { display: flex; gap: 10px; }
        .oka-footer-social a {
          width: 40px; height: 40px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12); display: inline-flex;
          align-items: center; justify-content: center; color: #b0b3b8; transition: all .2s;
        }
        .oka-footer-social a:hover { border-color: var(--oka-orange); color: var(--oka-orange); background: rgba(240,75,18,.08); }
        .oka-footer h4 { color: #fff; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 18px; }
        .oka-footer-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
        .oka-footer-links a { color: #9a9ea6; font-size: 13px; text-decoration: none; transition: color .2s; display: inline-flex; align-items: center; gap: 6px; }
        .oka-footer-links a:hover { color: var(--oka-orange); }
        .oka-footer-contact { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
        .oka-footer-contact li { display: flex; gap: 10px; font-size: 13px; color: #9a9ea6; }
        .oka-footer-contact a { color: #9a9ea6; text-decoration: none; }
        .oka-footer-contact a:hover { color: var(--oka-orange); }
        .oka-footer-bottom { border-top: 1px solid rgba(255,255,255,.06); padding: 20px 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 12px; color: #7a7f89; }
        .oka-footer-bottom a { color: #7a7f89; text-decoration: none; }
        .oka-footer-bottom a:hover { color: var(--oka-orange); }
        .oka-logo-footer { height: 42px; width: 130px; object-fit: contain; object-position: left center; }

        .oka-mobile-menu { display: none; }
        .oka-mobile-toggle { display: none; background: none; border: none; cursor: pointer; padding: 8px; color: var(--oka-charcoal); }

        .oka-filter-active {
          background: #fff8f5; padding: 10px 14px; border-radius: 5px; border: 1px solid #fdd7c8; margin-bottom: 8px;
          display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--oka-orange); font-weight: 750;
        }
        .oka-filter-active button {
          margin-left: auto; border: none; background: rgba(240,75,18,.1); color: var(--oka-orange); border-radius: 4px;
          padding: 4px 10px; font-size: 11px; font-weight: 800; cursor: pointer;
        }
        .oka-city-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px,1fr)); gap: 8px; }
        .oka-city-btn {
          height: 38px; border: 1px solid var(--oka-line); border-radius: 5px; background: #fff; font-size: 12px;
          font-weight: 700; color: #34363a; cursor: pointer; transition: all .15s; padding: 0 10px;
        }
        .oka-city-btn:hover { border-color: var(--oka-orange); color: var(--oka-orange); }
        .oka-city-btn.active { border-color: var(--oka-orange); background: #fff8f5; color: var(--oka-orange); }
        .oka-more-btn {
          display: block; width: 100%; padding: 14px; border: 1px solid var(--oka-line); border-radius: 5px;
          background: #fff; font-size: 13px; font-weight: 800; color: var(--oka-orange); cursor: pointer;
          text-align: center; margin-top: 18px; transition: all .15s;
        }
        .oka-more-btn:hover { background: var(--oka-orange); color: #fff; border-color: var(--oka-orange); }
        .oka-empty { text-align: center; padding: 48px 24px; color: var(--oka-muted); font-size: 13px; grid-column: 1 / -1; }
        .oka-empty strong { display: block; font-size: 16px; color: var(--oka-charcoal); margin-bottom: 6px; }
        .oka-card-image-wrap { position: relative; width: 100%; aspect-ratio: 16 / 11; overflow: hidden; background: #f5f3f0; }
        .oka-card-image-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .4s ease; }
        .oka-card:hover .oka-card-image-wrap img { transform: scale(1.05); }
        .oka-count { font-size: 12px; color: var(--oka-muted); margin-left: 8px; }

        @media (max-width: 1180px) {
          .oka-menu { gap: 18px; }
          .oka-intelligence { grid-template-columns: 1fr 1fr; }
          .oka-intro, .oka-filter { border-bottom: 1px solid var(--oka-line); }
          .oka-search { align-items: center; }
          .oka-collections, .oka-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .oka-trust { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .oka-footer-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 1060px) {
          .oka-menu { gap: 16px; font-size: 13px; }
          .oka-actions { gap: 8px; }
          .oka-actions .oka-btn { padding: 0 14px; font-size: 13px; }
        }
        @media (max-width: 960px) {
          .oka-actions .oka-btn:first-child { display: none; }
          .oka-menu { gap: 12px; font-size: 12px; }
        }
        @media (max-width: 820px) {
          .oka-shell, .oka-hero-content, .oka-intelligence { width: min(100% - 28px, 560px); }
          .oka-nav { height: auto; position: relative; }
          .oka-nav-inner { padding: 12px 0; flex-wrap: wrap; justify-content: space-between; }
          .oka-mobile-toggle { display: flex; align-items: center; justify-content: center; order: 3; }
          .oka-menu { display: none; }
          .oka-menu.open { display: flex; flex-direction: column; position: fixed; top: 0; left: 0; width: 100%; height: 100dvh; background: rgba(255,255,255,.98); z-index: 100; padding: 80px 28px 28px; gap: 8px; overflow-y: auto; }
          .oka-menu.open a { padding: 14px 0; font-size: 18px; border-bottom: 1px solid var(--oka-line); width: 100%; display: flex; justify-content: space-between; align-items: center; }
          .oka-menu-overlay.open { display: block; position: fixed; inset: 0; z-index: 99; background: rgba(0,0,0,.3); }
          .oka-menu.open a:first-child { color: var(--oka-orange); }
          .oka-actions .oka-btn:first-child { display: none; }
          .oka-actions .oka-btn-primary { display: none; }
          .oka-menu.open ~ .oka-actions { display: flex; }
          .oka-hero { min-height: auto; background-position: 65% center; }
          .oka-hero-content { padding: 32px 0 90px; }
          .oka-title { font-size: clamp(36px, 8vw, 52px); max-width: 100%; letter-spacing: -.01em; }
          .oka-subtitle { font-size: 15px; max-width: 100%; }
          .oka-kicker { font-size: 10px; }
          .oka-hero-actions { flex-direction: column; align-items: stretch; }
          .oka-hero-actions .oka-btn { justify-content: center; }
          .oka-intelligence { grid-template-columns: 1fr; margin-top: -32px; }
          .oka-intro, .oka-filter { border-right: 0; }
          .oka-search { padding-top: 4px; }
          .oka-section-head { align-items: start; flex-direction: column; }
          .oka-heading { font-size: 24px; }
          .oka-toolbar { flex-wrap: wrap; }
          .oka-collections, .oka-grid, .oka-trust { grid-template-columns: 1fr; }
          .oka-grid { gap: 16px; }
          .oka-card-image-wrap { aspect-ratio: 16 / 10; }
          .oka-card-body { padding: 12px 12px 14px; }
          .oka-card h3 { font-size: 15px; }
          .oka-price { font-size: 16px; }
          .oka-features { gap: 12px; font-size: 11px; }
          .oka-float { right: 14px; bottom: 14px; }
          .oka-bubble { display: none; }
          .oka-footer-grid { grid-template-columns: 1fr; gap: 32px; }
          .oka-footer { padding: 40px 0 0; }
          .oka-footer-bottom { flex-direction: column; text-align: center; }
          .oka-segments { grid-template-columns: 1fr 1fr; }
          .oka-segments.three { grid-template-columns: repeat(3, minmax(0,1fr)); }
        }
        @media (max-width: 480px) {
          .oka-shell, .oka-hero-content, .oka-intelligence { width: calc(100% - 24px); }
          .oka-title { font-size: 32px; }
          .oka-segments { grid-template-columns: 1fr; }
          .oka-segments.three { grid-template-columns: 1fr 1fr; }
          .oka-collections, .oka-grid { gap: 12px; }
          .oka-intro { padding: 18px; }
          .oka-intro h2 { font-size: 22px; }
          .oka-filter { padding: 16px 14px; }
          .oka-card-image-wrap { aspect-ratio: 4 / 3; }
          .oka-price { font-size: 15px; }
        }
      `}</style>

      <nav className="oka-nav">
        <div className="oka-shell oka-nav-inner">
          <a className="oka-logo-wrap" href="/" aria-label="OKA Imóveis">
            <img className="oka-logo-img" src="/clients/oka/logo.jpeg" alt="OKA Imóveis"
              onError={(e) => { const t = e.currentTarget; t.style.display = 'none'; t.nextElementSibling?.classList.remove('hidden'); }}
            />
            <span className="oka-logo-fallback hidden">OKA<span>.</span></span>
          </a>
          <div className={`oka-menu${menuOpen ? ' open' : ''}`} aria-label="Menu principal">
            <a href="#inicio" onClick={() => setMenuOpen(false)}>Início <ChevronRight size={16} /></a>
            <a href="#imoveis" onClick={() => setMenuOpen(false)}>Imóveis <ChevronRight size={16} /></a>
            <a href="#investimento" onClick={() => setMenuOpen(false)}>Investimento <ChevronRight size={16} /></a>
            <a href="#regioes" onClick={() => setMenuOpen(false)}>Regiões <ChevronRight size={16} /></a>
            <a href="#sobre" onClick={() => setMenuOpen(false)}>Sobre <ChevronRight size={16} /></a>
            <a href="#contato" onClick={() => setMenuOpen(false)}>Contato <ChevronRight size={16} /></a>
          </div>
          <div className="oka-actions">
            <a className="oka-btn" href={`tel:${WHATSAPP_NUMBER}`}>
              <Phone size={16} />
              {PHONE_LABEL}
            </a>
            <a className="oka-btn oka-btn-primary" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
              Falar com especialista
            </a>
            <button className="oka-mobile-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        <div className={`oka-menu-overlay${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />
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
            <button className={`oka-segment${filterObjetivo === 'morar' ? ' active' : ''}`} type="button" onClick={() => setFilterObjetivo('morar')}>
              <Home size={21} />
              Morar
            </button>
            <button className={`oka-segment${filterObjetivo === 'investir' ? ' active' : ''}`} type="button" onClick={() => setFilterObjetivo('investir')}>
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
            <button className={`oka-segment${filterPerfil === 'conservador' ? ' active' : ''}`} type="button" onClick={() => setFilterPerfil('conservador')}>
              <ShieldCheck size={20} />
              Conservador
            </button>
            <button className={`oka-segment${filterPerfil === 'moderado' ? ' active' : ''}`} type="button" onClick={() => setFilterPerfil('moderado')}>
              <Scale size={20} />
              Moderado
            </button>
            <button className={`oka-segment${filterPerfil === 'agressivo' ? ' active' : ''}`} type="button" onClick={() => setFilterPerfil('agressivo')}>
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
          <div className="oka-city-list">
            {uniqueCities.slice(0, 6).map((city) => (
              <button key={city} className={`oka-city-btn${filterCity === city ? ' active' : ''}`} type="button" onClick={() => setFilterCity(filterCity === city ? '' : city)}>
                {city}
              </button>
            ))}
          </div>
        </div>
        <div className="oka-filter">
          <div className="oka-filter-label">
            <span className="oka-step">4</span>
            Qual valor máximo?
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[0, 500000, 1000000, 2000000, 5000000].map((val) => (
              <button key={val} className={`oka-city-btn${filterPriceMax === val ? ' active' : ''}`} type="button" onClick={() => setFilterPriceMax(filterPriceMax === val ? 0 : val)}>
                {val === 0 ? 'Todos' : formatCurrency(val)}
              </button>
            ))}
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
            <div>
              <h2 className="oka-heading">
                {hasActiveFilters ? 'Resultado da busca' : 'Imóveis em destaque'}
                <span className="oka-count">({filtered.length} imóveis)</span>
              </h2>
            </div>
            <div className="oka-toolbar" aria-label="Opções da vitrine">
              {hasActiveFilters && (
                <button className="oka-tool" type="button" onClick={clearFilters} style={{ color: 'var(--oka-orange)', borderColor: '#fdd7c8' }}>
                  <X size={15} />
                  Limpar filtros
                </button>
              )}
              <button className="oka-tool oka-view active" type="button" aria-label="Grade">
                <LayoutGrid size={17} />
              </button>
              <button className="oka-tool oka-view" type="button" aria-label="Lista">
                <List size={17} />
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="oka-filter-active">
              <AlertCircle size={14} />
              Filtros ativos
              {filterCity && <span> · Cidade: <strong>{filterCity}</strong></span>}
              {filterPriceMax > 0 && <span> · Até <strong>{formatCurrency(filterPriceMax)}</strong></span>}
              <button type="button" onClick={clearFilters}>Limpar</button>
            </div>
          )}

          <div className="oka-grid">
            {displayProperties.length === 0 ? (
              <div className="oka-empty">
                <strong>Nenhum imóvel encontrado</strong>
                Tente ajustar os filtros ou ampliar a busca
              </div>
            ) : (
              displayProperties.map((property, index) => {
                const suites = numberFromFeature(property.features, ['suites', 'bedrooms', 'dormitorios']);
                const area = numberFromFeature(property.features, ['areaM2', 'area', 'areaConstruida', 'building_area']);
                const vagas = numberFromFeature(property.features, ['vagas', 'garages', 'parking_spaces']);
                const tag = index === 0 ? 'Oportunidade' : index === 1 ? 'Alto Potencial' : index === 2 ? 'Frente Mar' : 'Destaque';
                const imgSrc = property.images?.[0] || fallbackImages[index % fallbackImages.length];

                return (
                  <article className="oka-card" key={property.id}>
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Tenho interesse no imóvel: ${property.title} - ${formatCurrency(property.price)}`)}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="oka-card-image-wrap">
                        <img src={imgSrc} alt={property.title} loading="lazy" />
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
                            <Maximize2 size={14} />
                            {area || 120}m²
                          </span>
                          <span>
                            <Building2 size={15} />
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
                    </a>
                  </article>
                );
              })
            )}
          </div>

          {filtered.length > 4 && (
            <button className="oka-more-btn" type="button" onClick={() => setShowAllProperties(!showAllProperties)}>
              {showAllProperties ? 'Mostrar menos' : `Ver todos os ${filtered.length} imóveis`}
              {showAllProperties ? <ChevronUp size={16} style={{ marginLeft: 6 }} /> : <ChevronDown size={16} style={{ marginLeft: 6 }} />}
            </button>
          )}
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

      <footer className="oka-footer" id="contato">
        <div className="oka-shell">
          <div className="oka-footer-grid">
            <div className="oka-footer-brand">
              <img className="oka-logo-footer" src="/clients/oka/logo.jpeg" alt="OKA Imóveis"
                onError={(e) => { const t = e.currentTarget; t.style.display = 'none'; t.parentElement?.querySelector('.oka-logo-footer-fallback')?.classList.remove('hidden'); }}
              />
              <span className="oka-logo-footer-fallback hidden" style={{ height: 42, display: 'inline-flex', alignItems: 'center', fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: '#fff' }}>OKA<span style={{ color: 'var(--oka-orange)' }}>.</span></span>
              <p>
                A OKA Imóveis seleciona, analisa e apresenta apenas oportunidades reais de valorização.
                Curadoria especializada em imóveis de alto padrão e investimentos inteligentes.
              </p>
              <div className="oka-footer-social">
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                  <MessageCircle size={18} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                  <Instagram size={18} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">
                  <Youtube size={18} />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                  <Linkedin size={18} />
                </a>
              </div>
            </div>

            <div>
              <h4>Imóveis</h4>
              <ul className="oka-footer-links">
                <li><a href="#imoveis">Apartamentos <ChevronRight size={12} /></a></li>
                <li><a href="#imoveis">Casas <ChevronRight size={12} /></a></li>
                <li><a href="#imoveis">Coberturas <ChevronRight size={12} /></a></li>
                <li><a href="#imoveis">Terrenos <ChevronRight size={12} /></a></li>
                <li><a href="#imoveis">Comerciais <ChevronRight size={12} /></a></li>
                <li><a href="#imoveis">Lançamentos <ChevronRight size={12} /></a></li>
              </ul>
            </div>

            <div>
              <h4>Institucional</h4>
              <ul className="oka-footer-links">
                <li><a href="#sobre">Sobre Nós <ChevronRight size={12} /></a></li>
                <li><a href="#investimento">Investimento <ChevronRight size={12} /></a></li>
                <li><a href="#regioes">Regiões <ChevronRight size={12} /></a></li>
                <li><a href="#contato">Contato <ChevronRight size={12} /></a></li>
              </ul>
            </div>

            <div>
              <h4>Contato</h4>
              <ul className="oka-footer-contact">
                <li>
                  <Phone size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    <a href={`tel:${WHATSAPP_NUMBER}`}>{PHONE_LABEL}</a>
                    <br />
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">Fale pelo WhatsApp</a>
                  </span>
                </li>
                <li>
                  <Mail size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <a href="mailto:contato@okaimoveis.com.br">contato@okaimoveis.com.br</a>
                </li>
                <li>
                  <MapPin size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Atendimento em todo o Brasil<br />Base: Santa Catarina</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="oka-footer-bottom">
          <div className="oka-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%', flexWrap: 'wrap' }}>
            <span>&copy; {new Date().getFullYear()} OKA Imóveis. Todos os direitos reservados.</span>
            <span>
              <a href="#inicio">Política de Privacidade</a>
              {' · '}
              <a href="#inicio">Termos de Uso</a>
            </span>
          </div>
        </div>
      </footer>

      <div className="oka-float">
        <div className="oka-bubble">Fale com um especialista agora!</div>
        <a className="oka-whatsapp" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp">
          <MessageCircle size={31} />
        </a>
      </div>
    </div>
  );
};

export default OkaPublicSite;
