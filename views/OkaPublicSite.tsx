import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BedDouble,
  Building2,
  Car,
  ChevronDown,
  Heart,
  Home,
  Instagram,
  LayoutGrid,
  Linkedin,
  Mail,
  MapPin,
  Maximize2,
  Menu,
  MessageCircle,
  Phone,
  Quote,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  X,
  Youtube,
} from 'lucide-react';

interface OkaPublicSiteProps {
  organizationId?: string;
}

type OkaProperty = {
  id: string;
  tag: string;
  title: string;
  type: string;
  city: string;
  state: string;
  suites: number;
  area: number;
  vagas: number;
  price: number;
  yield: string;
  image: string;
  imagePosition?: string;
};

const WHATSAPP_NUMBER = '5547997755555';
const PHONE_LABEL = '(47) 99775-5555';
const HERO_IMAGE = '/templates/urban/urban_luxury_pool.png';
const SEA_VIEW_IMAGE = '/templates/urban/urban_sea_view.png';
const GATED_IMAGE = '/templates/urban/urban_gated_community.png';
const READY_IMAGE = '/templates/urban/urban_ready_move.png';

const properties: OkaProperty[] = [
  {
    id: 'frente-mar',
    tag: 'Frente Mar',
    title: 'Apartamento Frente Mar',
    type: 'Apartamento',
    city: 'Itapema',
    state: 'SC',
    suites: 4,
    area: 205,
    vagas: 3,
    price: 4950000,
    yield: '0,68% a.m.',
    image: SEA_VIEW_IMAGE,
    imagePosition: 'center 48%',
  },
  {
    id: 'condominio',
    tag: 'Condomínio Fechado',
    title: 'Casa em Condomínio',
    type: 'Casa',
    city: 'Curitiba',
    state: 'PR',
    suites: 3,
    area: 290,
    vagas: 4,
    price: 2650000,
    yield: '0,75% a.m.',
    image: GATED_IMAGE,
    imagePosition: 'center 68%',
  },
  {
    id: 'alto-padrao',
    tag: 'Alto Padrão',
    title: 'Apartamento Alto Padrão',
    type: 'Apartamento',
    city: 'Florianópolis',
    state: 'SC',
    suites: 3,
    area: 156,
    vagas: 2,
    price: 2260000,
    yield: '0,82% a.m.',
    image: HERO_IMAGE,
    imagePosition: 'center 44%',
  },
  {
    id: 'vista',
    tag: 'Destaque',
    title: 'Apartamento com Vista',
    type: 'Apartamento',
    city: 'Maringá',
    state: 'PR',
    suites: 2,
    area: 120,
    vagas: 2,
    price: 1180000,
    yield: '0,89% a.m.',
    image: READY_IMAGE,
    imagePosition: 'center 72%',
  },
];

const cities = ['Itapema', 'Balneário Camboriú', 'Florianópolis', 'Curitiba', 'Maringá'];
const propertyTypes = ['Apartamento', 'Casa', 'Comercial', 'Terreno'];
const priceOptions = [
  { label: 'Todos', value: 0 },
  { label: 'Até R$ 1.500.000', value: 1500000 },
  { label: 'Até R$ 3.000.000', value: 3000000 },
  { label: 'Até R$ 5.000.000', value: 5000000 },
];

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function whatsappUrl(message = 'Olá! Quero falar com um especialista da OKA Imóveis.') {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

const OkaPublicSite: React.FC<OkaPublicSiteProps> = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [purpose, setPurpose] = useState<'comprar' | 'investir'>('comprar');
  const [type, setType] = useState('');
  const [city, setCity] = useState('');
  const [priceMax, setPriceMax] = useState(0);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const clearFilters = useCallback(() => {
    setPurpose('comprar');
    setType('');
    setCity('');
    setPriceMax(0);
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      if (type && property.type !== type) return false;
      if (city && property.city !== city) return false;
      if (priceMax > 0 && property.price > priceMax) return false;
      return true;
    });
  }, [city, priceMax, type]);

  return (
    <div className="oka-site">
      <style>{`
        .oka-site {
          --oka-orange: #ff4b18;
          --oka-orange-dark: #ea3d0d;
          --oka-black: #15191d;
          --oka-text: #20242a;
          --oka-muted: #6b717a;
          --oka-line: #e8ebef;
          --oka-soft: #f7f8fa;
          --oka-shadow: 0 24px 58px rgba(28, 33, 40, .1);
          min-height: 100vh;
          background: #fff;
          color: var(--oka-text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .oka-site * { box-sizing: border-box; }
        .oka-shell {
          width: min(1710px, calc(100% - 176px));
          margin: 0 auto;
        }
        .oka-hidden { display: none !important; }
        .oka-nav {
          height: 72px;
          background: rgba(255, 255, 255, .98);
          border-bottom: 1px solid rgba(18, 24, 32, .08);
          position: sticky;
          top: 0;
          z-index: 60;
          backdrop-filter: blur(18px);
        }
        .oka-nav-inner {
          height: 100%;
          display: grid;
          grid-template-columns: 210px 1fr auto;
          align-items: center;
          gap: 26px;
        }
        .oka-logo {
          display: inline-flex;
          align-items: center;
          width: 154px;
          height: 56px;
          text-decoration: none;
        }
        .oka-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: left center;
          display: block;
        }
        .oka-menu {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 48px;
          font-size: 13px;
          font-weight: 800;
        }
        .oka-menu a {
          color: #161b20;
          text-decoration: none;
        }
        .oka-menu a:hover,
        .oka-menu a:first-of-type {
          color: var(--oka-orange);
        }
        .oka-actions {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .oka-btn {
          height: 44px;
          border-radius: 6px;
          border: 1px solid var(--oka-line);
          background: #fff;
          color: #15191d;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 22px;
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
        }
        .oka-btn:hover { transform: translateY(-1px); }
        .oka-btn-primary {
          background: var(--oka-orange);
          border-color: var(--oka-orange);
          color: #fff;
          box-shadow: 0 12px 28px rgba(255, 75, 24, .22);
        }
        .oka-btn-primary:hover {
          background: var(--oka-orange-dark);
          border-color: var(--oka-orange-dark);
        }
        .oka-menu-toggle,
        .oka-menu-close,
        .oka-mobile-actions {
          display: none;
        }
        .oka-hero {
          min-height: 624px;
          display: flex;
          align-items: center;
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background:
            linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,.96) 34%, rgba(255,255,255,.66) 49%, rgba(255,255,255,.12) 70%, rgba(255,255,255,0) 100%),
            linear-gradient(180deg, rgba(255,255,255,0) 62%, rgba(255,255,255,.72) 100%),
            url('${HERO_IMAGE}') right center / cover no-repeat;
        }
        .oka-hero-content {
          padding: 74px 0 98px;
          max-width: 670px;
        }
        .oka-kicker {
          margin: 0 0 22px;
          color: #15191d;
          font-size: 12px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: .34em;
          text-transform: uppercase;
        }
        .oka-title {
          margin: 0;
          color: #16191f;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 64px;
          font-weight: 400;
          line-height: 1.07;
          letter-spacing: 0;
        }
        .oka-title span,
        .oka-heading span,
        .oka-region-title span,
        .oka-testimonial-title span {
          color: var(--oka-orange);
        }
        .oka-subtitle {
          max-width: 560px;
          margin: 24px 0 0;
          color: #23282f;
          font-size: 17px;
          line-height: 1.68;
          font-weight: 500;
        }
        .oka-hero-actions {
          display: flex;
          gap: 22px;
          align-items: center;
          margin-top: 42px;
        }
        .oka-hero-actions .oka-btn {
          height: 62px;
          padding: 0 30px;
        }
        .oka-search-section {
          padding: 56px 0 0;
          background: #fff;
        }
        .oka-heading {
          margin: 0;
          color: #14181d;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 43px;
          line-height: 1.12;
          font-weight: 400;
          letter-spacing: 0;
        }
        .oka-section-copy {
          margin: 10px 0 0;
          color: #737985;
          font-size: 15px;
          line-height: 1.55;
        }
        .oka-filter-card {
          min-height: 220px;
          margin-top: 30px;
          padding: 36px 36px 26px;
          border: 1px solid rgba(22, 28, 35, .08);
          border-radius: 8px;
          background: rgba(255,255,255,.98);
          box-shadow: var(--oka-shadow);
        }
        .oka-filter-grid {
          display: grid;
          grid-template-columns: 292px 1fr 250px 250px 220px;
          gap: 36px;
          align-items: end;
        }
        .oka-filter-group {
          min-width: 0;
        }
        .oka-filter-label {
          display: block;
          margin: 0 0 16px;
          color: #242a31;
          font-size: 12px;
          font-weight: 950;
        }
        .oka-segment-row,
        .oka-type-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .oka-choice {
          height: 58px;
          border: 1px solid var(--oka-line);
          border-radius: 6px;
          background: #fff;
          color: #343a42;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 19px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          transition: border-color .18s ease, color .18s ease, background .18s ease;
        }
        .oka-choice:hover,
        .oka-choice.active {
          border-color: var(--oka-orange);
          color: var(--oka-orange);
          background: #fff7f3;
        }
        .oka-type-row .oka-choice {
          min-width: 112px;
        }
        .oka-select-wrap {
          height: 58px;
          position: relative;
        }
        .oka-select-wrap select {
          width: 100%;
          height: 100%;
          appearance: none;
          border: 1px solid var(--oka-line);
          border-radius: 6px;
          background: #fff;
          color: #737985;
          font-size: 12px;
          font-weight: 700;
          padding: 0 42px 0 16px;
          outline: none;
          cursor: pointer;
        }
        .oka-select-wrap svg {
          pointer-events: none;
          position: absolute;
          right: 15px;
          top: 50%;
          color: #8a919b;
          transform: translateY(-50%);
        }
        .oka-filter-action .oka-btn {
          width: 100%;
          height: 58px;
          padding: 0 28px;
          font-size: 14px;
        }
        .oka-clear-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .oka-clear {
          border: 0;
          background: transparent;
          color: var(--oka-orange);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }
        .oka-featured {
          padding: 64px 0 0;
        }
        .oka-section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-bottom: 26px;
        }
        .oka-count {
          color: var(--oka-orange);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 950;
          margin-left: 8px;
        }
        .oka-outline {
          height: 48px;
          border: 1px solid var(--oka-orange);
          border-radius: 6px;
          background: #fff;
          color: var(--oka-orange);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 20px;
          font-size: 12px;
          font-weight: 950;
          text-decoration: none;
          cursor: pointer;
        }
        .oka-property-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 28px;
        }
        .oka-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid rgba(22, 28, 35, .09);
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 15px 36px rgba(22, 28, 35, .08);
        }
        .oka-card a {
          color: inherit;
          text-decoration: none;
          display: block;
        }
        .oka-card-image {
          height: 214px;
          position: relative;
          overflow: hidden;
          background: #eef0f2;
        }
        .oka-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform .35s ease;
        }
        .oka-card:hover .oka-card-image img {
          transform: scale(1.04);
        }
        .oka-tag {
          position: absolute;
          left: 14px;
          top: 14px;
          min-height: 28px;
          border-radius: 5px;
          background: #fff;
          color: #2d3540;
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          font-size: 11px;
          font-weight: 950;
          box-shadow: 0 8px 18px rgba(17, 24, 32, .08);
        }
        .oka-heart {
          position: absolute;
          right: 16px;
          top: 15px;
          color: #fff;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,.35));
        }
        .oka-card-body {
          padding: 24px 22px 28px;
        }
        .oka-card h3 {
          margin: 0 0 14px;
          color: #161b21;
          font-size: 19px;
          line-height: 1.2;
          font-weight: 950;
        }
        .oka-location {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #7b828d;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .oka-features {
          display: flex;
          align-items: center;
          gap: 18px;
          color: #7b828d;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 27px;
          flex-wrap: wrap;
        }
        .oka-features span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .oka-price-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
        }
        .oka-price {
          color: var(--oka-orange);
          font-size: 21px;
          line-height: 1;
          font-weight: 950;
        }
        .oka-yield {
          min-width: 86px;
          border: 1px solid var(--oka-line);
          border-radius: 5px;
          padding: 8px 9px;
          color: #8a919b;
          font-size: 10px;
          line-height: 1.2;
          text-align: center;
          font-weight: 800;
        }
        .oka-yield strong {
          display: block;
          margin-top: 3px;
          color: #20242a;
          font-size: 11px;
        }
        .oka-empty {
          grid-column: 1 / -1;
          padding: 42px;
          border: 1px solid var(--oka-line);
          border-radius: 8px;
          color: #737985;
          text-align: center;
          font-size: 14px;
        }
        .oka-regions {
          padding: 72px 0 0;
        }
        .oka-regions-layout {
          display: grid;
          grid-template-columns: 500px minmax(0, 1fr);
          gap: 72px;
          align-items: stretch;
        }
        .oka-region-copy {
          padding-top: 18px;
        }
        .oka-region-title {
          margin: 16px 0 0;
          color: #15191d;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 37px;
          font-weight: 400;
          line-height: 1.16;
          letter-spacing: 0;
        }
        .oka-region-copy p:not(.oka-kicker) {
          margin: 24px 0 26px;
          color: #727984;
          font-size: 15px;
          line-height: 1.7;
        }
        .oka-link {
          color: var(--oka-orange);
          display: inline-flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 950;
        }
        .oka-region-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 26px;
        }
        .oka-region-card {
          min-height: 372px;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: flex-end;
          padding: 0 28px 34px;
          color: #fff;
          background-size: cover;
          background-position: center;
          text-decoration: none;
          isolation: isolate;
          box-shadow: 0 16px 32px rgba(22, 28, 35, .12);
        }
        .oka-region-card:before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(12,16,20,.08), rgba(12,16,20,.83));
          z-index: -1;
        }
        .oka-region-card strong {
          display: block;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 31px;
          font-weight: 400;
          line-height: 1.1;
          margin-bottom: 12px;
        }
        .oka-region-card span {
          display: block;
          max-width: 220px;
          font-size: 14px;
          line-height: 1.45;
          font-weight: 900;
        }
        .oka-benefits {
          padding: 78px 0 54px;
        }
        .oka-benefit-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 52px;
        }
        .oka-benefit {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 18px;
          align-items: center;
        }
        .oka-benefit svg {
          color: #1f2730;
        }
        .oka-benefit strong {
          display: block;
          color: #252b33;
          font-size: 14px;
          line-height: 1.25;
          font-weight: 950;
          margin-bottom: 4px;
        }
        .oka-benefit span {
          display: block;
          color: #737985;
          font-size: 13px;
          line-height: 1.35;
          font-weight: 600;
        }
        .oka-testimonials {
          border-top: 1px solid rgba(22, 28, 35, .08);
          background: #fff;
          padding: 58px 0 64px;
        }
        .oka-testimonial-head {
          width: min(1510px, calc(100% - 260px));
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .oka-testimonial-title {
          margin: 0;
          color: #15191d;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 35px;
          line-height: 1.1;
          font-weight: 400;
        }
        .oka-testimonial-grid {
          width: min(1510px, calc(100% - 260px));
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 28px;
        }
        .oka-testimonial {
          min-height: 202px;
          border: 1px solid rgba(22, 28, 35, .12);
          border-radius: 8px;
          background: #fff;
          padding: 30px 36px 28px;
          color: #67707b;
        }
        .oka-testimonial svg {
          color: #b8bec7;
          margin-bottom: 12px;
        }
        .oka-testimonial p {
          min-height: 74px;
          margin: 0;
          color: #6c737e;
          font-size: 14px;
          line-height: 1.55;
          font-weight: 650;
        }
        .oka-author {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 12px;
          align-items: center;
          margin-top: 20px;
        }
        .oka-avatar {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: linear-gradient(135deg, #173344, #f05a25);
          font-size: 12px;
          font-weight: 950;
        }
        .oka-author strong {
          display: block;
          color: #252b33;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 950;
        }
        .oka-author span {
          display: block;
          color: #7b828d;
          font-size: 12px;
          line-height: 1.3;
          margin-top: 3px;
        }
        .oka-dots {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          margin-top: 28px;
        }
        .oka-dots span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #dde1e6;
        }
        .oka-dots span:first-child {
          background: var(--oka-orange);
        }
        .oka-cta {
          min-height: 204px;
          color: #fff;
          background:
            linear-gradient(90deg, rgba(11,15,18,.92), rgba(11,15,18,.62), rgba(11,15,18,.9)),
            url('${SEA_VIEW_IMAGE}') center 56% / cover no-repeat;
          display: flex;
          align-items: center;
        }
        .oka-cta-inner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 48px;
        }
        .oka-cta h2 {
          margin: 0;
          max-width: 560px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 43px;
          line-height: 1.05;
          font-weight: 400;
        }
        .oka-cta p {
          max-width: 540px;
          margin: 14px 0 0;
          color: rgba(255,255,255,.82);
          font-size: 15px;
          line-height: 1.55;
          font-weight: 600;
        }
        .oka-cta-actions {
          display: flex;
          align-items: center;
          gap: 26px;
        }
        .oka-cta-actions .oka-btn {
          height: 62px;
          min-width: 310px;
        }
        .oka-footer {
          background: #101315;
          color: #9ea5ad;
        }
        .oka-footer-main {
          padding: 54px 0 42px;
          display: grid;
          grid-template-columns: 1.5fr .8fr .85fr 1.2fr;
          gap: 86px;
        }
        .oka-footer-logo {
          display: inline-flex;
          align-items: flex-end;
          gap: 3px;
          color: #fff;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 39px;
          line-height: 1;
          letter-spacing: .05em;
          text-decoration: none;
        }
        .oka-footer-logo span:last-child {
          color: var(--oka-orange);
        }
        .oka-footer-brand p {
          max-width: 328px;
          margin: 22px 0 26px;
          color: #a7adb4;
          font-size: 14px;
          line-height: 1.7;
        }
        .oka-social {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .oka-social a {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #b5bbc2;
          text-decoration: none;
        }
        .oka-footer h3 {
          margin: 0 0 20px;
          color: #fff;
          font-size: 13px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: .14em;
          text-transform: uppercase;
        }
        .oka-footer ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 12px;
        }
        .oka-footer a,
        .oka-footer li {
          color: #a7adb4;
          font-size: 14px;
          line-height: 1.45;
          text-decoration: none;
        }
        .oka-footer-contact li {
          display: grid;
          grid-template-columns: 18px 1fr;
          gap: 12px;
          align-items: start;
        }
        .oka-footer-contact svg {
          margin-top: 2px;
          color: #b5bbc2;
        }
        .oka-footer-bottom {
          border-top: 1px solid rgba(255,255,255,.06);
          padding: 20px 0;
          color: #747b83;
          font-size: 12px;
        }
        .oka-footer-bottom .oka-shell {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }
        .oka-footer-bottom a {
          color: #8c939a;
          margin-left: 34px;
        }
        .oka-float {
          position: fixed;
          right: 28px;
          bottom: 26px;
          z-index: 80;
          width: 60px;
          height: 60px;
          border-radius: 999px;
          background: #20d466;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 16px 32px rgba(32, 212, 102, .32);
          text-decoration: none;
        }
        @media (max-width: 1420px) {
          .oka-shell { width: min(1180px, calc(100% - 64px)); }
          .oka-nav-inner { grid-template-columns: 180px 1fr auto; }
          .oka-menu { gap: 26px; }
          .oka-filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .oka-filter-action { grid-column: span 2; }
          .oka-property-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .oka-regions-layout { grid-template-columns: 1fr; gap: 36px; }
          .oka-region-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .oka-testimonial-head,
          .oka-testimonial-grid { width: min(1180px, calc(100% - 64px)); }
          .oka-footer-main { gap: 44px; }
        }
        @media (max-width: 980px) {
          .oka-shell,
          .oka-testimonial-head,
          .oka-testimonial-grid {
            width: min(640px, calc(100% - 32px));
          }
          .oka-nav { height: auto; }
          .oka-nav-inner {
            min-height: 72px;
            display: flex;
            justify-content: space-between;
          }
          .oka-logo { width: 134px; }
          .oka-actions .oka-btn { display: none; }
          .oka-menu-toggle {
            width: 42px;
            height: 42px;
            border: 1px solid var(--oka-line);
            border-radius: 6px;
            background: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #15191d;
          }
          .oka-menu {
            position: fixed;
            inset: 0 0 0 auto;
            width: min(360px, 86vw);
            background: #fff;
            z-index: 100;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;
            gap: 0;
            padding: 22px 24px;
            transform: translateX(105%);
            transition: transform .22s ease;
            box-shadow: -20px 0 44px rgba(15, 20, 26, .18);
          }
          .oka-menu.open { transform: translateX(0); }
          .oka-menu-close {
            width: 42px;
            height: 42px;
            margin: 0 0 12px auto;
            border: 1px solid var(--oka-line);
            border-radius: 6px;
            background: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .oka-menu a {
            padding: 17px 0;
            border-bottom: 1px solid var(--oka-line);
            font-size: 16px;
          }
          .oka-mobile-actions {
            display: grid;
            gap: 12px;
            margin-top: 24px;
          }
          .oka-mobile-actions .oka-btn {
            display: inline-flex;
            width: 100%;
          }
          .oka-hero {
            min-height: auto;
            background:
              linear-gradient(90deg, rgba(255,255,255,.98), rgba(255,255,255,.86), rgba(255,255,255,.56)),
              url('${HERO_IMAGE}') center / cover no-repeat;
          }
          .oka-hero-content { padding: 44px 0 72px; }
          .oka-title { font-size: 44px; }
          .oka-subtitle { font-size: 15px; }
          .oka-hero-actions,
          .oka-cta-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .oka-hero-actions .oka-btn,
          .oka-cta-actions .oka-btn {
            width: 100%;
            min-width: 0;
          }
          .oka-heading { font-size: 33px; }
          .oka-filter-grid { grid-template-columns: 1fr; gap: 24px; }
          .oka-filter-action { grid-column: auto; }
          .oka-type-row { flex-wrap: wrap; }
          .oka-type-row .oka-choice { flex: 1 1 calc(50% - 8px); min-width: 0; }
          .oka-property-grid,
          .oka-region-grid,
          .oka-benefit-grid,
          .oka-testimonial-grid,
          .oka-footer-main {
            grid-template-columns: 1fr;
          }
          .oka-card-image { height: 220px; }
          .oka-section-head,
          .oka-testimonial-head,
          .oka-cta-inner {
            display: grid;
            grid-template-columns: 1fr;
            justify-items: start;
          }
          .oka-region-card { min-height: 260px; }
          .oka-benefits { padding-top: 48px; }
          .oka-cta { padding: 42px 0; }
          .oka-cta h2 { font-size: 34px; }
          .oka-footer-main { gap: 34px; }
          .oka-footer-bottom .oka-shell { justify-content: center; text-align: center; }
          .oka-footer-bottom a { margin: 0 12px; }
        }
        @media (max-width: 560px) {
          .oka-shell,
          .oka-testimonial-head,
          .oka-testimonial-grid {
            width: calc(100% - 28px);
          }
          .oka-kicker { font-size: 10px; letter-spacing: .24em; }
          .oka-title { font-size: 35px; }
          .oka-heading,
          .oka-region-title,
          .oka-testimonial-title { font-size: 29px; }
          .oka-hero-actions .oka-btn,
          .oka-cta-actions .oka-btn { height: 54px; }
          .oka-search-section { padding-top: 38px; }
          .oka-filter-card { padding: 22px 16px; }
          .oka-segment-row { display: grid; grid-template-columns: 1fr 1fr; }
          .oka-choice { padding: 0 12px; }
          .oka-card-body { padding: 18px; }
          .oka-price-row { align-items: flex-start; flex-direction: column; }
          .oka-regions-layout { gap: 24px; }
          .oka-benefit { grid-template-columns: 36px 1fr; }
          .oka-testimonial { padding: 24px 22px; }
          .oka-footer-main { padding-top: 42px; }
          .oka-float { right: 18px; bottom: 18px; }
        }
      `}</style>

      <nav className="oka-nav">
        <div className="oka-shell oka-nav-inner">
          <a className="oka-logo" href="#inicio" aria-label="OKA Imóveis">
            <img src="/clients/oka/logo.jpeg" alt="OKA Imóveis" />
          </a>

          <div className={`oka-menu${menuOpen ? ' open' : ''}`} aria-label="Menu principal">
            <button className="oka-menu-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
              <X size={22} />
            </button>
            <a href="#inicio" onClick={() => setMenuOpen(false)}>Início</a>
            <a href="#imoveis" onClick={() => setMenuOpen(false)}>Imóveis</a>
            <a href="#investimento" onClick={() => setMenuOpen(false)}>Investimento</a>
            <a href="#regioes" onClick={() => setMenuOpen(false)}>Regiões</a>
            <a href="#sobre" onClick={() => setMenuOpen(false)}>Sobre</a>
            <a href="#contato" onClick={() => setMenuOpen(false)}>Contato</a>
            <div className="oka-mobile-actions">
              <a className="oka-btn" href={`tel:${WHATSAPP_NUMBER}`}>
                <Phone size={16} />
                {PHONE_LABEL}
              </a>
              <a className="oka-btn oka-btn-primary" href={whatsappUrl()} target="_blank" rel="noreferrer">
                Falar com especialista
              </a>
            </div>
          </div>

          <div className="oka-actions">
            <a className="oka-btn" href={`tel:${WHATSAPP_NUMBER}`}>
              <Phone size={16} />
              {PHONE_LABEL}
            </a>
            <a className="oka-btn oka-btn-primary" href={whatsappUrl()} target="_blank" rel="noreferrer">
              Falar com especialista
            </a>
            <button className="oka-menu-toggle" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
              <Menu size={23} />
            </button>
          </div>
        </div>
      </nav>

      <header id="inicio" className="oka-hero">
        <div className="oka-shell">
          <div className="oka-hero-content">
            <p className="oka-kicker">Alto padrão • Investimentos • Consultoria</p>
            <h1 className="oka-title">
              Imóveis que fazem sentido para sua <span>vida</span> e para seu <span>patrimônio</span>.
            </h1>
            <p className="oka-subtitle">
              Curadoria especializada com foco em liquidez, localização e aderência ao seu momento.
            </p>
            <div className="oka-hero-actions">
              <a className="oka-btn oka-btn-primary" href={whatsappUrl('Olá! Quero encontrar meu imóvel ideal com a OKA Imóveis.')} target="_blank" rel="noreferrer">
                Fale com especialista
                <UserRoundCheck size={17} />
              </a>
              <a className="oka-btn" href={whatsappUrl()} target="_blank" rel="noreferrer">
                Fale pelo WhatsApp
                <MessageCircle size={17} />
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="oka-search-section" aria-label="Busca de imóveis">
        <div className="oka-shell">
          <h2 className="oka-heading">Encontre seu imóvel <span>ideal</span></h2>
          <p className="oka-section-copy">Use os filtros abaixo para encontrar o imóvel ideal para você.</p>

          <div className="oka-filter-card">
            <div className="oka-filter-grid">
              <div className="oka-filter-group">
                <span className="oka-filter-label">Finalidade</span>
                <div className="oka-segment-row">
                  <button className={`oka-choice${purpose === 'comprar' ? ' active' : ''}`} type="button" onClick={() => setPurpose('comprar')}>
                    <Home size={16} />
                    Comprar
                  </button>
                  <button className={`oka-choice${purpose === 'investir' ? ' active' : ''}`} type="button" onClick={() => setPurpose('investir')}>
                    <BarChart3 size={16} />
                    Investir
                  </button>
                </div>
              </div>

              <div className="oka-filter-group">
                <span className="oka-filter-label">Tipo de imóvel</span>
                <div className="oka-type-row">
                  {propertyTypes.map((item) => (
                    <button key={item} className={`oka-choice${type === item ? ' active' : ''}`} type="button" onClick={() => setType(type === item ? '' : item)}>
                      {item === 'Comercial' && <Building2 size={15} />}
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="oka-filter-group">
                <span className="oka-filter-label">Cidade</span>
                <div className="oka-select-wrap">
                  <select value={city} onChange={(event) => setCity(event.target.value)} aria-label="Cidade">
                    <option value="">Selecione a cidade</option>
                    {cities.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>

              <div className="oka-filter-group">
                <span className="oka-filter-label">Valor máximo</span>
                <div className="oka-select-wrap">
                  <select value={priceMax} onChange={(event) => setPriceMax(Number(event.target.value))} aria-label="Valor máximo">
                    {priceOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>

              <div className="oka-filter-action">
                <a className="oka-btn oka-btn-primary" href="#imoveis">
                  Ver imóveis
                  <Search size={17} />
                </a>
              </div>
            </div>

            <div className="oka-clear-row">
              <button className="oka-clear" type="button" onClick={clearFilters}>
                Limpar filtros
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="oka-shell">
        <section id="imoveis" className="oka-featured">
          <div className="oka-section-head">
            <h2 className="oka-heading">
              Imóveis em destaque <span className="oka-count">({filteredProperties.length} imóveis)</span>
            </h2>
            <a className="oka-outline" href={whatsappUrl('Olá! Quero ver todos os imóveis da OKA Imóveis.')} target="_blank" rel="noreferrer">
              Ver todos
              <LayoutGrid size={17} />
            </a>
          </div>

          <div className="oka-property-grid">
            {filteredProperties.length === 0 ? (
              <div className="oka-empty">Nenhum imóvel encontrado com os filtros selecionados.</div>
            ) : (
              filteredProperties.map((property) => (
                <article className="oka-card" key={property.id}>
                  <a href={whatsappUrl(`Olá! Tenho interesse no imóvel: ${property.title} - ${formatCurrency(property.price)}`)} target="_blank" rel="noreferrer">
                    <div className="oka-card-image">
                      <img src={property.image} alt={property.title} style={{ objectPosition: property.imagePosition || 'center' }} loading="lazy" />
                      <span className="oka-tag">{property.tag}</span>
                      <Heart className="oka-heart" size={24} />
                    </div>
                    <div className="oka-card-body">
                      <h3>{property.title}</h3>
                      <div className="oka-location">
                        <MapPin size={14} />
                        {property.city} - {property.state}
                      </div>
                      <div className="oka-features">
                        <span><BedDouble size={15} />{property.suites} suítes</span>
                        <span><Maximize2 size={14} />{property.area}m²</span>
                        <span><Car size={15} />{property.vagas} vagas</span>
                      </div>
                      <div className="oka-price-row">
                        <strong className="oka-price">{formatCurrency(property.price)}</strong>
                        <span className="oka-yield">
                          Rentabilidade
                          <strong>{property.yield}</strong>
                        </span>
                      </div>
                    </div>
                  </a>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <section id="regioes" className="oka-regions">
        <div className="oka-shell oka-regions-layout">
          <div className="oka-region-copy">
            <p className="oka-kicker">Regiões selecionadas</p>
            <h2 className="oka-region-title">Onde morar bem também precisa fazer sentido como <span>patrimônio</span>.</h2>
            <p>
              A vitrine da OKA fica mais objetiva quando a busca parte de praças com demanda real,
              padrão construtivo consistente e potencial de revenda. Por isso, cada região entra na conversa com critério.
            </p>
            <a className="oka-link" href={whatsappUrl('Olá! Quero conversar sobre a melhor região para comprar ou investir.')} target="_blank" rel="noreferrer">
              Conversar sobre melhor região
              <ArrowRight size={16} />
            </a>
          </div>

          <div className="oka-region-grid">
            <a className="oka-region-card" href="#imoveis" style={{ backgroundImage: `url(${SEA_VIEW_IMAGE})`, backgroundPosition: 'center 52%' }}>
              <span>
                <strong>Litoral SC</strong>
                Frente mar, liquidez e alto padrão
              </span>
            </a>
            <a className="oka-region-card" href="#imoveis" style={{ backgroundImage: `url(${GATED_IMAGE})`, backgroundPosition: 'center 62%' }}>
              <span>
                <strong>Condomínios</strong>
                Privacidade, segurança e área verde
              </span>
            </a>
            <a className="oka-region-card" href="#investimento" style={{ backgroundImage: `url(${HERO_IMAGE})`, backgroundPosition: 'center 45%' }}>
              <span>
                <strong>Investimento</strong>
                Imóveis com leitura de valorização
              </span>
            </a>
          </div>
        </div>
      </section>

      <section id="sobre" className="oka-benefits">
        <div className="oka-shell oka-benefit-grid">
          <div className="oka-benefit">
            <Sparkles size={34} />
            <span>
              <strong>Curadoria Especializada</strong>
              Análise criteriosa de cada imóvel.
            </span>
          </div>
          <div className="oka-benefit">
            <ShieldCheck size={34} />
            <span>
              <strong>Consultoria Personalizada</strong>
              Entendemos seu objetivo e momento.
            </span>
          </div>
          <div className="oka-benefit" id="investimento">
            <BarChart3 size={34} />
            <span>
              <strong>Investimento Inteligente</strong>
              Decisões baseadas em dados reais.
            </span>
          </div>
          <div className="oka-benefit">
            <UserRoundCheck size={34} />
            <span>
              <strong>Atendimento Humanizado</strong>
              Acompanhamento completo em todas as etapas.
            </span>
          </div>
        </div>
      </section>

      <section className="oka-testimonials" aria-label="Depoimentos">
        <div className="oka-testimonial-head">
          <h2 className="oka-testimonial-title">O que nossos <span>clientes</span> dizem</h2>
          <a className="oka-link" href={whatsappUrl('Olá! Quero conhecer mais depoimentos de clientes da OKA.')} target="_blank" rel="noreferrer">
            Ver mais depoimentos
            <ArrowRight size={15} />
          </a>
        </div>
        <div className="oka-testimonial-grid">
          <article className="oka-testimonial">
            <Quote size={22} />
            <p>A OKA entendeu exatamente o que procurávamos e apresentou opções que fizeram total sentido para nossa família e nosso futuro.</p>
            <div className="oka-author">
              <span className="oka-avatar">MJ</span>
              <span>
                <strong>Mariana e João</strong>
                Balneário Camboriú - SC
              </span>
            </div>
          </article>
          <article className="oka-testimonial">
            <Quote size={22} />
            <p>Investimos com segurança e transparência. O retorno superou nossas expectativas desde os primeiros meses.</p>
            <div className="oka-author">
              <span className="oka-avatar">CM</span>
              <span>
                <strong>Carlos Mendes</strong>
                Investidor - Curitiba/PR
              </span>
            </div>
          </article>
          <article className="oka-testimonial">
            <Quote size={22} />
            <p>Atendimento impecável do início ao fim. Sentimos confiança em cada detalhe do processo.</p>
            <div className="oka-author">
              <span className="oka-avatar">FL</span>
              <span>
                <strong>Fernanda Lima</strong>
                Florianópolis - SC
              </span>
            </div>
          </article>
        </div>
        <div className="oka-dots" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="oka-cta">
        <div className="oka-shell oka-cta-inner">
          <div>
            <h2>Pronto para encontrar seu próximo imóvel?</h2>
            <p>Fale com um especialista e receba uma curadoria personalizada para o seu objetivo.</p>
          </div>
          <div className="oka-cta-actions">
            <a className="oka-btn oka-btn-primary" href={whatsappUrl()} target="_blank" rel="noreferrer">
              Falar com especialista
              <UserRoundCheck size={17} />
            </a>
            <a className="oka-btn" href={whatsappUrl()} target="_blank" rel="noreferrer">
              Fale pelo WhatsApp
              <MessageCircle size={17} />
            </a>
          </div>
        </div>
      </section>

      <footer id="contato" className="oka-footer">
        <div className="oka-shell oka-footer-main">
          <div className="oka-footer-brand">
            <a className="oka-footer-logo" href="#inicio" aria-label="OKA Imóveis">
              <span>OK</span><span>A</span>
            </a>
            <p>
              A OKA Imóveis seleciona, analisa e apresenta apenas oportunidades reais de valorização.
              Curadoria especializada em imóveis de alto padrão e investimentos inteligentes.
            </p>
            <div className="oka-social">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={16} /></a>
              <a href={whatsappUrl()} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={16} /></a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube size={16} /></a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={16} /></a>
            </div>
          </div>

          <div>
            <h3>Imóveis</h3>
            <ul>
              <li><a href="#imoveis">Apartamentos</a></li>
              <li><a href="#imoveis">Casas</a></li>
              <li><a href="#imoveis">Coberturas</a></li>
              <li><a href="#imoveis">Terrenos</a></li>
              <li><a href="#imoveis">Comerciais</a></li>
              <li><a href="#imoveis">Lançamentos</a></li>
            </ul>
          </div>

          <div>
            <h3>Institucional</h3>
            <ul>
              <li><a href="#sobre">Sobre Nós</a></li>
              <li><a href="#investimento">Investimento</a></li>
              <li><a href="#regioes">Regiões</a></li>
              <li><a href="#contato">Contato</a></li>
            </ul>
          </div>

          <div>
            <h3>Contato</h3>
            <ul className="oka-footer-contact">
              <li>
                <Phone size={15} />
                <span>
                  <a href={`tel:${WHATSAPP_NUMBER}`}>{PHONE_LABEL}</a><br />
                  <a href={whatsappUrl()} target="_blank" rel="noreferrer">Fale pelo WhatsApp</a>
                </span>
              </li>
              <li>
                <Mail size={15} />
                <a href="mailto:contato@okaimoveis.com.br">contato@okaimoveis.com.br</a>
              </li>
              <li>
                <MapPin size={15} />
                <span>Atendimento em todo o Brasil<br />Base: Santa Catarina</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="oka-footer-bottom">
          <div className="oka-shell">
            <span>© 2026 OKA Imóveis. Todos os direitos reservados.</span>
            <span>
              <a href="#inicio">Política de Privacidade</a>
              <a href="#inicio">Termos de Uso</a>
            </span>
          </div>
        </div>
      </footer>

      <a className="oka-float" href={whatsappUrl()} target="_blank" rel="noreferrer" aria-label="Falar pelo WhatsApp">
        <MessageCircle size={31} />
      </a>
    </div>
  );
};

export default OkaPublicSite;
