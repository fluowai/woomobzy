import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  Droplets,
  FileCheck2,
  Instagram,
  Leaf,
  LockKeyhole,
  Map,
  MessageCircle,
  Mountain,
  Play,
  ShieldCheck,
  Sprout,
  Tractor,
  TreePine,
  UsersRound,
  Warehouse,
} from 'lucide-react';
import { leadService } from '../services/leads';

interface BreuBrancoLandingPageProps {
  organizationId?: string;
}

const WHATSAPP_NUMBER = '5544998433030';
const WHATSAPP_MESSAGE =
  'Ola, tenho interesse na Fazenda de Breu Branco-PA e gostaria de receber o material completo.';
const LOGO_URL = '/images/fazendas-brasil/logo.png';
const HERO_IMAGE = '/images/fazendas-brasil/breu-branco-hero-clean.webp';
const GALLERY_IMAGES = [
  '/images/fazendas-brasil/reference-category.webp',
  '/images/fazendas-brasil/card-santa-helena.webp',
  '/images/fazendas-brasil/card-boa-vista.webp',
  '/images/fazendas-brasil/card-sao-bento.webp',
  '/images/fazendas-brasil/card-conquista.webp',
  '/images/fazendas-brasil/card-uniao.webp',
];

const highlights = [
  '72 Alqueiroes',
  '348,48 Hectares',
  'Dupla Aptidao',
  'Rica em Agua',
  'Estrutura Nova',
  'Potencial Agricola',
  'Sem Embargos',
  'Silo a 6 km',
];

const differenceCards = [
  {
    icon: Tractor,
    title: 'Pecuaria pronta',
    text: 'Curral com brete e balanca, divisoes, sede, casas de funcionarios e estrutura operacional nova.',
  },
  {
    icon: Droplets,
    title: 'Agua abundante',
    text: '4 tanques, 2 represas, igarape e nascentes permanentes para seguranca produtiva no ano todo.',
  },
  {
    icon: Sprout,
    title: 'Potencial agricola',
    text: 'Mais de 300 hectares aptos para lavoura, topografia plana e divisa com area de soja.',
  },
  {
    icon: Warehouse,
    title: 'Logistica estrategica',
    text: 'Acesso por asfalto e vicinal boa, a 25 km de Breu Branco e com silo/secador a apenas 6 km.',
  },
];

const audienceCards = [
  {
    icon: UsersRound,
    title: 'Pecuaristas em expansao',
    text: 'Expansao imediata da operacao, sem iniciar uma fazenda do zero.',
  },
  {
    icon: Leaf,
    title: 'Produtores de graos',
    text: 'Area plana com potencial de conversao agricola e logistica favoravel.',
  },
  {
    icon: ShieldCheck,
    title: 'Investidores patrimoniais',
    text: 'Ativo real com agua, estrutura, renda potencial e perspectiva de valorizacao.',
  },
];

const materialItems = [
  'Video de drone',
  'Fotos internas',
  'Localizacao aproximada',
  'Informacoes produtivas',
  'Documentacao inicial',
  'Condicoes para visita',
];

const processSteps = [
  'Solicitacao de informacoes',
  'Pre-qualificacao',
  'Envio do material',
  'Reuniao estrategica',
  'Visita tecnica',
  'Negociacao',
];

type LeadForm = {
  name: string;
  phone: string;
  city: string;
  state: string;
  email: string;
  purpose: string;
  investmentRange: string;
  hasRuralOperation: string;
};

const initialForm: LeadForm = {
  name: '',
  phone: '',
  city: '',
  state: '',
  email: '',
  purpose: 'Pecuaria',
  investmentRange: 'R$5M a R$10M',
  hasRuralOperation: 'Sim',
};

function whatsappUrl() {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
}

const BreuBrancoLandingPage: React.FC<BreuBrancoLandingPageProps> = ({ organizationId }) => {
  const [form, setForm] = useState<LeadForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const leadScore = useMemo(() => {
    let score = 55;
    if (form.investmentRange === 'Acima de R$10M') score += 22;
    if (form.investmentRange === 'R$5M a R$10M') score += 18;
    if (form.hasRuralOperation === 'Sim') score += 14;
    if (form.purpose === 'Pecuaria') score += 8;
    if (form.phone && form.city && form.state) score += 6;
    return Math.min(score, 100);
  }, [form]);

  const updateField = (field: keyof LeadForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (organizationId) {
        const notes = [
          'Lead da landing premium Fazenda de Dupla Aptidao em Breu Branco-PA.',
          'Area: 72 alqueiroes / 348,48 hectares.',
          'Diferenciais: pecuaria pronta, agua abundante, estrutura nova, +300 ha com potencial agricola, silo a 6 km, sem embargos.',
          '',
          `Cidade/UF do lead: ${form.city}/${form.state}`,
          `Finalidade da compra: ${form.purpose}`,
          `Faixa de investimento: ${form.investmentRange}`,
          `Ja possui operacao rural: ${form.hasRuralOperation}`,
          `Score estimado: ${leadScore}`,
        ].join('\n');

        await leadService.create({
          organization_id: organizationId,
          organization_slug: 'fazendasbrasil',
          organization_domain: 'fazendasbrasil.com.br',
          owner_email: 'contato@fazendasbrasil.com.br',
          site_key: 'fazendasbrasil',
          referrer_url: window.location.href,
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          source: 'Landing Breu Branco ACP',
          campaign: 'Fazenda Breu Branco PA - Material completo',
          ad_reference: 'Fazenda de Dupla Aptidao em Breu Branco-PA',
          organic_channel: 'Landing page premium',
          notes,
          budget: form.investmentRange as any,
          aptitude_interest: form.purpose as any,
          match_profile: 'rural',
          status: 'Qualificacao',
          classification:
            leadScore >= 82 ? 'Lead qualificado - Alta prioridade' : 'Lead qualificado',
          lead_score: leadScore,
        } as any);
      }
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel salvar o lead agora. Vamos direcionar para o WhatsApp.');
    } finally {
      setSubmitting(false);
      window.location.href = whatsappUrl();
    }
  };

  return (
    <div className="bb-page">
      <style>{`
        .bb-page {
          --bb-green: #082f1f;
          --bb-green-2: #0f4a31;
          --bb-green-3: #123d2a;
          --bb-gold: #caa24b;
          --bb-gold-2: #efd28a;
          --bb-white: #fffdf7;
          --bb-muted: #66736c;
          --bb-line: rgba(202, 162, 75, .28);
          min-height: 100vh;
          color: #10251b;
          background: #fffaf0;
          font-family: Inter, Arial, Helvetica, sans-serif;
        }
        .bb-page * { box-sizing: border-box; }
        .bb-shell { width: min(100% - 40px, 1180px); margin: 0 auto; }
        .bb-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 30;
          background: rgba(8, 47, 31, .9);
          border-bottom: 1px solid rgba(239, 210, 138, .22);
          backdrop-filter: blur(18px);
        }
        .bb-nav .bb-shell {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .bb-logo { width: 158px; height: 56px; object-fit: contain; object-position: left center; filter: drop-shadow(0 10px 18px rgba(0,0,0,.25)); }
        .bb-nav-links { display: flex; align-items: center; gap: 22px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
        .bb-nav-links a { color: rgba(255,255,255,.86); text-decoration: none; }
        .bb-wa-mini {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 16px;
          color: #082f1f;
          background: linear-gradient(135deg, var(--bb-gold-2), var(--bb-gold));
          border-radius: 999px;
          font-weight: 900;
          text-decoration: none;
          box-shadow: 0 18px 34px rgba(0,0,0,.22);
        }
        .bb-hero {
          min-height: 760px;
          padding-top: 118px;
          color: white;
          background:
            radial-gradient(circle at 74% 22%, rgba(239,210,138,.28), transparent 28%),
            linear-gradient(90deg, rgba(3,25,16,.96) 0%, rgba(8,47,31,.82) 44%, rgba(8,47,31,.3) 76%),
            url("${HERO_IMAGE}") center / cover no-repeat;
        }
        .bb-hero .bb-shell {
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) 430px;
          gap: 46px;
          align-items: center;
          min-height: 640px;
        }
        .bb-kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 22px;
          color: var(--bb-gold-2);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .bb-hero h1 {
          max-width: 760px;
          margin: 0;
          font-size: clamp(42px, 6vw, 76px);
          line-height: .95;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        .bb-hero h1 span { color: var(--bb-gold-2); }
        .bb-subtitle {
          max-width: 690px;
          margin: 22px 0 0;
          color: rgba(255,255,255,.92);
          font-size: clamp(18px, 2.1vw, 25px);
          line-height: 1.34;
          font-weight: 700;
        }
        .bb-hero-copy {
          max-width: 610px;
          margin: 18px 0 0;
          color: rgba(255,255,255,.76);
          font-size: 17px;
          line-height: 1.7;
        }
        .bb-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 34px; }
        .bb-btn {
          min-height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 22px;
          border: 1px solid transparent;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .04em;
          text-decoration: none;
          cursor: pointer;
        }
        .bb-btn-primary { color: #0b2d1e; background: linear-gradient(135deg, #ffe8a8, var(--bb-gold)); box-shadow: 0 20px 45px rgba(0,0,0,.28); }
        .bb-btn-secondary { color: #fff; background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.34); }
        .bb-asset-card {
          background: rgba(7, 35, 23, .82);
          border: 1px solid rgba(239,210,138,.28);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 34px 80px rgba(0,0,0,.38);
        }
        .bb-video {
          min-height: 260px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(rgba(0,0,0,.1), rgba(0,0,0,.48)),
            url("${GALLERY_IMAGES[0]}") center / cover no-repeat;
        }
        .bb-play {
          width: 78px;
          height: 78px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: #082f1f;
          background: var(--bb-gold-2);
          box-shadow: 0 18px 42px rgba(0,0,0,.32);
        }
        .bb-asset-body { padding: 22px; }
        .bb-asset-body strong { display: block; color: #fff; font-size: 20px; margin-bottom: 8px; }
        .bb-asset-body p { margin: 0; color: rgba(255,255,255,.72); line-height: 1.6; }
        .bb-proof {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          margin-top: -1px;
          background: var(--bb-green);
          border-top: 1px solid var(--bb-line);
          border-bottom: 1px solid var(--bb-line);
        }
        .bb-proof span {
          min-height: 68px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 14px 10px;
          color: #fff;
          background: rgba(255,255,255,.035);
          font-size: 13px;
          font-weight: 900;
          text-align: center;
          text-transform: uppercase;
        }
        .bb-proof svg { color: var(--bb-gold-2); flex: 0 0 auto; }
        .bb-section { padding: 92px 0; }
        .bb-section.dark { color: #fff; background: var(--bb-green); }
        .bb-section.alt { background: #f6f0e2; }
        .bb-head { max-width: 760px; margin-bottom: 38px; }
        .bb-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--bb-gold);
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .14em;
          text-transform: uppercase;
        }
        .bb-head h2 {
          margin: 12px 0 0;
          font-size: clamp(32px, 4.2vw, 52px);
          line-height: 1.02;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        .bb-head p { margin: 16px 0 0; color: var(--bb-muted); font-size: 17px; line-height: 1.7; }
        .dark .bb-head p { color: rgba(255,255,255,.72); }
        .bb-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
        .bb-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
        .bb-info-card {
          min-height: 250px;
          padding: 28px;
          background: #fff;
          border: 1px solid rgba(15,74,49,.1);
          border-radius: 8px;
          box-shadow: 0 18px 45px rgba(20, 35, 25, .08);
        }
        .dark .bb-info-card { background: rgba(255,255,255,.06); border-color: rgba(239,210,138,.22); box-shadow: none; }
        .bb-info-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          margin-bottom: 22px;
          color: var(--bb-green);
          background: linear-gradient(135deg, #fff4cd, var(--bb-gold));
          border-radius: 8px;
        }
        .bb-info-card h3 { margin: 0 0 12px; font-size: 22px; color: inherit; }
        .bb-info-card p { margin: 0; color: var(--bb-muted); line-height: 1.62; }
        .dark .bb-info-card p { color: rgba(255,255,255,.72); }
        .bb-split { display: grid; grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr); gap: 42px; align-items: center; }
        .bb-map-card {
          position: relative;
          min-height: 470px;
          overflow: hidden;
          border-radius: 8px;
          background:
            radial-gradient(circle at 50% 42%, rgba(202,162,75,.2), transparent 24%),
            linear-gradient(135deg, #0a3624, #082f1f);
          border: 1px solid rgba(239,210,138,.24);
          box-shadow: 0 28px 70px rgba(8,47,31,.2);
        }
        .bb-map-card:before {
          content: "";
          position: absolute;
          inset: 40px;
          background:
            linear-gradient(115deg, transparent 0 25%, rgba(255,255,255,.1) 25% 26%, transparent 26% 100%),
            radial-gradient(circle at 44% 28%, rgba(255,255,255,.18) 0 2px, transparent 3px),
            radial-gradient(circle at 58% 52%, rgba(239,210,138,.9) 0 7px, transparent 8px),
            radial-gradient(circle at 61% 56%, rgba(239,210,138,.32) 0 28px, transparent 29px);
          clip-path: polygon(38% 0, 63% 7%, 79% 27%, 70% 49%, 82% 68%, 58% 100%, 34% 90%, 22% 65%, 28% 43%, 17% 21%);
          border: 1px solid rgba(239,210,138,.32);
        }
        .bb-map-label {
          position: absolute;
          right: 28px;
          bottom: 28px;
          width: min(290px, calc(100% - 56px));
          padding: 20px;
          color: #fff;
          background: rgba(6, 30, 20, .88);
          border: 1px solid rgba(239,210,138,.32);
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }
        .bb-map-label strong { display: block; margin-bottom: 6px; font-size: 20px; }
        .bb-map-label span { color: rgba(255,255,255,.74); line-height: 1.55; }
        .bb-check-list { display: grid; gap: 14px; margin-top: 24px; }
        .bb-check-list span {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #203529;
          font-weight: 800;
        }
        .bb-check-list svg { color: var(--bb-gold); }
        .bb-material {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .bb-material span {
          min-height: 72px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(239,210,138,.22);
          border-radius: 8px;
          font-weight: 850;
        }
        .bb-material svg { color: var(--bb-gold-2); flex: 0 0 auto; }
        .bb-gallery { display: grid; grid-template-columns: 1.2fr .8fr .8fr; grid-auto-rows: 220px; gap: 12px; }
        .bb-gallery-item {
          position: relative;
          overflow: hidden;
          border-radius: 8px;
          background-position: center;
          background-size: cover;
        }
        .bb-gallery-item:first-child { grid-row: span 2; }
        .bb-gallery-item span {
          position: absolute;
          left: 14px;
          bottom: 14px;
          padding: 8px 10px;
          color: #fff;
          background: rgba(8,47,31,.82);
          border: 1px solid rgba(239,210,138,.28);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .bb-about { display: grid; grid-template-columns: .82fr 1.18fr; gap: 36px; align-items: center; }
        .bb-about-card {
          padding: 34px;
          color: #fff;
          background: linear-gradient(145deg, #082f1f, #0f4a31);
          border: 1px solid rgba(239,210,138,.24);
          border-radius: 8px;
        }
        .bb-about-card img { width: 190px; height: 74px; object-fit: contain; object-position: left center; margin-bottom: 26px; filter: drop-shadow(0 12px 22px rgba(0,0,0,.28)); }
        .bb-about-card p { margin: 0; color: rgba(255,255,255,.76); line-height: 1.7; }
        .bb-process {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }
        .bb-step {
          position: relative;
          min-height: 138px;
          padding: 20px 16px;
          color: #fff;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(239,210,138,.22);
          border-radius: 8px;
        }
        .bb-step small { color: var(--bb-gold-2); font-weight: 900; text-transform: uppercase; }
        .bb-step strong { display: block; margin-top: 14px; line-height: 1.35; }
        .bb-form-section { padding: 96px 0; background: linear-gradient(135deg, #f8f2e4, #fffdf7); }
        .bb-form-wrap { display: grid; grid-template-columns: .9fr 1.1fr; gap: 42px; align-items: start; }
        .bb-form-panel {
          padding: 30px;
          background: #fff;
          border: 1px solid rgba(15,74,49,.12);
          border-radius: 8px;
          box-shadow: 0 26px 70px rgba(8,47,31,.12);
        }
        .bb-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .bb-field.full { grid-column: 1 / -1; }
        .bb-field label { display: block; margin-bottom: 7px; color: #173526; font-size: 12px; font-weight: 950; text-transform: uppercase; letter-spacing: .06em; }
        .bb-field input {
          width: 100%;
          height: 48px;
          padding: 0 13px;
          color: #10251b;
          background: #f8f4ea;
          border: 1px solid rgba(15,74,49,.18);
          border-radius: 6px;
          outline: none;
        }
        .bb-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .bb-option {
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 9px;
          border: 1px solid rgba(15,74,49,.18);
          border-radius: 6px;
          background: #f8f4ea;
          color: #173526;
          font-size: 12px;
          font-weight: 900;
          text-align: center;
          cursor: pointer;
        }
        .bb-option.active { color: #082f1f; background: #f2d889; border-color: var(--bb-gold); box-shadow: inset 0 0 0 1px rgba(255,255,255,.35); }
        .bb-submit {
          width: 100%;
          min-height: 56px;
          margin-top: 18px;
          border: 0;
          border-radius: 6px;
          color: #092b1d;
          background: linear-gradient(135deg, #ffe8a8, var(--bb-gold));
          font-size: 14px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .04em;
          cursor: pointer;
        }
        .bb-error { margin-top: 12px; color: #9b3d23; font-size: 13px; font-weight: 800; }
        .bb-lock-box {
          padding: 26px;
          color: #fff;
          background:
            linear-gradient(rgba(8,47,31,.88), rgba(8,47,31,.88)),
            url("${GALLERY_IMAGES[2]}") center / cover no-repeat;
          border-radius: 8px;
          border: 1px solid rgba(239,210,138,.24);
        }
        .bb-lock-box h3 { margin: 18px 0 10px; font-size: 28px; line-height: 1.08; text-transform: uppercase; }
        .bb-lock-box p { margin: 0; color: rgba(255,255,255,.76); line-height: 1.7; }
        .bb-footer { padding: 44px 0 28px; color: rgba(255,255,255,.75); background: #061f15; }
        .bb-footer .bb-shell { display: grid; grid-template-columns: 1fr auto; gap: 28px; align-items: center; }
        .bb-footer img { width: 160px; height: 58px; object-fit: contain; object-position: left center; filter: brightness(1.12); }
        .bb-footer p { max-width: 690px; margin: 10px 0 0; line-height: 1.6; }
        .bb-footer-links { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 14px; }
        .bb-footer-links a { color: #fff; text-decoration: none; font-weight: 800; }
        @media (max-width: 1020px) {
          .bb-nav-links a:not(.bb-wa-mini) { display: none; }
          .bb-hero .bb-shell, .bb-split, .bb-about, .bb-form-wrap { grid-template-columns: 1fr; }
          .bb-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .bb-process { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .bb-asset-card { max-width: 560px; }
        }
        @media (max-width: 760px) {
          .bb-shell { width: min(100% - 28px, 1180px); }
          .bb-nav { position: sticky; }
          .bb-logo { width: 132px; }
          .bb-wa-mini { min-height: 38px; padding: 0 12px; font-size: 12px; }
          .bb-hero { min-height: auto; padding: 48px 0 58px; }
          .bb-hero .bb-shell { min-height: auto; gap: 28px; }
          .bb-proof { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .bb-section, .bb-form-section { padding: 62px 0; }
          .bb-grid-4, .bb-grid-3, .bb-material, .bb-form-grid, .bb-options { grid-template-columns: 1fr; }
          .bb-gallery { grid-template-columns: 1fr; grid-auto-rows: 210px; }
          .bb-gallery-item:first-child { grid-row: span 1; }
          .bb-process { grid-template-columns: 1fr; }
          .bb-footer .bb-shell { grid-template-columns: 1fr; }
          .bb-footer-links { justify-content: flex-start; }
        }
      `}</style>

      <nav className="bb-nav">
        <div className="bb-shell">
          <a href="#inicio" aria-label="Fazendas Brasil">
            <img className="bb-logo" src={LOGO_URL} alt="Fazendas Brasil" />
          </a>
          <div className="bb-nav-links">
            <a href="#diferenciais">Diferenciais</a>
            <a href="#galeria">Galeria</a>
            <a href="#processo">Processo</a>
            <a className="bb-wa-mini" href={whatsappUrl()} target="_blank" rel="noreferrer">
              <MessageCircle size={16} /> WhatsApp
            </a>
          </div>
        </div>
      </nav>

      <header className="bb-hero" id="inicio">
        <div className="bb-shell">
          <div>
            <p className="bb-kicker"><LockKeyhole size={16} /> Metodo ACP - Oferta para compradores qualificados</p>
            <h1>Fazenda de Dupla Aptidao em <span>Breu Branco - PA</span></h1>
            <p className="bb-subtitle">
              72 alqueiroes | 348,48 hectares | Pecuaria pronta e potencial agricola em mais de 300 hectares.
            </p>
            <p className="bb-hero-copy">
              Uma oportunidade para produtores e investidores que buscam patrimonio rural, renda e valorizacao. Informacoes completas apenas para compradores com capacidade real de compra.
            </p>
            <div className="bb-actions">
              <a className="bb-btn bb-btn-primary" href="#captacao">
                Solicitar Material Completo <ArrowRight size={18} />
              </a>
              <a className="bb-btn bb-btn-secondary" href={whatsappUrl()} target="_blank" rel="noreferrer">
                Agendar Visita Tecnica <MessageCircle size={17} />
              </a>
            </div>
          </div>

          <aside className="bb-asset-card" aria-label="Video de drone da fazenda">
            <div className="bb-video">
              <span className="bb-play"><Play size={32} fill="currentColor" /></span>
            </div>
            <div className="bb-asset-body">
              <strong>Drone, agua, estrutura e potencial produtivo.</strong>
              <p>O material completo reune video aereo, fotos internas, localizacao aproximada e dados para analise inicial.</p>
            </div>
          </aside>
        </div>
      </header>

      <section className="bb-proof" aria-label="Destaques da fazenda">
        {highlights.map((item) => (
          <span key={item}><Check size={17} />{item}</span>
        ))}
      </section>

      <section className="bb-section" id="diferenciais">
        <div className="bb-shell">
          <div className="bb-head">
            <span className="bb-eyebrow"><TreePine size={16} /> Por que esta fazenda e diferente?</span>
            <h2>Estrutura pronta, agua e uma tese clara de valorizacao.</h2>
            <p>O ativo combina operacao pecuaria imediata com uma janela agricola relevante para quem avalia expansao em regiao de crescimento no Para.</p>
          </div>
          <div className="bb-grid-4">
            {differenceCards.map((card) => {
              const Icon = card.icon;
              return (
                <article className="bb-info-card" key={card.title}>
                  <span className="bb-info-icon"><Icon size={26} /></span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bb-section dark">
        <div className="bb-shell">
          <div className="bb-head">
            <span className="bb-eyebrow"><UsersRound size={16} /> Para quem esta oportunidade foi desenvolvida?</span>
            <h2>Compradores que entendem producao, agua, logistica e patrimonio.</h2>
          </div>
          <div className="bb-grid-3">
            {audienceCards.map((card) => {
              const Icon = card.icon;
              return (
                <article className="bb-info-card" key={card.title}>
                  <span className="bb-info-icon"><Icon size={26} /></span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bb-section alt">
        <div className="bb-shell bb-split">
          <div className="bb-map-card" aria-label="Mapa do Brasil com destaque no Para">
            <div className="bb-map-label">
              <strong>Breu Branco - PA</strong>
              <span>A 25 km da cidade, com acesso por asfalto e vicinal boa. Divisa com soja e silo/secador a 6 km.</span>
            </div>
          </div>
          <div>
            <div className="bb-head">
              <span className="bb-eyebrow"><Map size={16} /> Oportunidade de patrimonio</span>
              <h2>Terra produtiva de qualidade esta cada vez mais escassa.</h2>
              <p>A demanda por ativos rurais cresce continuamente. Esta propriedade reune producao, agua, infraestrutura, potencial agricola e valorizacao.</p>
            </div>
            <div className="bb-check-list">
              <span><Check size={19} /> Producao com estrutura operacional instalada</span>
              <span><Check size={19} /> Agua permanente para seguranca produtiva</span>
              <span><Check size={19} /> Potencial agricola acima de 300 hectares</span>
              <span><Check size={19} /> Sem embargos ou multas ambientais informadas</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bb-section dark">
        <div className="bb-shell">
          <div className="bb-head">
            <span className="bb-eyebrow"><FileCheck2 size={16} /> O que voce recebera</span>
            <h2>Material completo para decisao tecnica, nao para curiosidade.</h2>
          </div>
          <div className="bb-material">
            {materialItems.map((item) => (
              <span key={item}><BadgeCheck size={20} />{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="bb-section" id="galeria">
        <div className="bb-shell">
          <div className="bb-head">
            <span className="bb-eyebrow"><Mountain size={16} /> Galeria premium</span>
            <h2>Visao aerea, sede, curral, pastagens e recursos hidricos.</h2>
          </div>
          <div className="bb-gallery">
            {GALLERY_IMAGES.map((image, index) => (
              <div
                className="bb-gallery-item"
                key={image}
                style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.02), rgba(0,0,0,.34)), url("${image}")` }}
              >
                <span>{['Videos aereos', 'Sede', 'Curral', 'Pastagens', 'Recursos hidricos', 'Estruturas'][index]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bb-section alt">
        <div className="bb-shell bb-about">
          <div className="bb-about-card">
            <img src={LOGO_URL} alt="Fazendas Brasil" />
            <p>Mais de 25 anos de experiencia em compra, venda, analise estrategica e patrimonio rural. Atendimento consultivo para compradores e investidores no agronegocio.</p>
          </div>
          <div>
            <div className="bb-head">
              <span className="bb-eyebrow"><Building2 size={16} /> Sobre a Fazendas Brasil</span>
              <h2>Autoridade para negociar ativos rurais com sigilo e criterio.</h2>
              <p>Da primeira conversa a visita tecnica, o processo filtra compradores reais, protege informacoes sensiveis e organiza a negociacao com foco em seguranca.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bb-section dark" id="processo">
        <div className="bb-shell">
          <div className="bb-head">
            <span className="bb-eyebrow"><ChevronDown size={16} /> Processo de aquisicao</span>
            <h2>Um funil objetivo para compradores com capacidade financeira.</h2>
          </div>
          <div className="bb-process">
            {processSteps.map((step, index) => (
              <div className="bb-step" key={step}>
                <small>Etapa {index + 1}</small>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bb-form-section" id="captacao">
        <div className="bb-shell bb-form-wrap">
          <div>
            <div className="bb-head">
              <span className="bb-eyebrow"><MessageCircle size={16} /> Solicitar material completo</span>
              <h2>Preencha para receber fotos, videos e condicoes de visita.</h2>
              <p>O envio do material e direcionado a compradores diretos e investidores qualificados. O WhatsApp abre automaticamente apos o cadastro.</p>
            </div>
            <div className="bb-lock-box">
              <ShieldCheck size={34} color="#efd28a" />
              <h3>Exclusividade com seguranca.</h3>
              <p>Localizacao detalhada, documentos e materiais sensiveis sao compartilhados apos pre-qualificacao do comprador.</p>
            </div>
          </div>

          <form className="bb-form-panel" onSubmit={handleSubmit}>
            <div className="bb-form-grid">
              <div className="bb-field">
                <label>Nome</label>
                <input required value={form.name} onChange={(event) => updateField('name', event.target.value)} />
              </div>
              <div className="bb-field">
                <label>Telefone</label>
                <input required type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
              </div>
              <div className="bb-field">
                <label>Cidade</label>
                <input required value={form.city} onChange={(event) => updateField('city', event.target.value)} />
              </div>
              <div className="bb-field">
                <label>Estado</label>
                <input required maxLength={2} value={form.state} onChange={(event) => updateField('state', event.target.value.toUpperCase())} />
              </div>
              <div className="bb-field full">
                <label>E-mail</label>
                <input required type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
              </div>

              <div className="bb-field full">
                <label>Finalidade da compra</label>
                <div className="bb-options">
                  {['Pecuaria', 'Lavoura', 'Investimento'].map((option) => (
                    <button
                      className={`bb-option ${form.purpose === option ? 'active' : ''}`}
                      key={option}
                      type="button"
                      onClick={() => updateField('purpose', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bb-field full">
                <label>Faixa de investimento</label>
                <div className="bb-options">
                  {['Ate R$5 milhoes', 'R$5M a R$10M', 'Acima de R$10M'].map((option) => (
                    <button
                      className={`bb-option ${form.investmentRange === option ? 'active' : ''}`}
                      key={option}
                      type="button"
                      onClick={() => updateField('investmentRange', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bb-field full">
                <label>Ja possui operacao rural?</label>
                <div className="bb-options">
                  {['Sim', 'Nao'].map((option) => (
                    <button
                      className={`bb-option ${form.hasRuralOperation === option ? 'active' : ''}`}
                      key={option}
                      type="button"
                      onClick={() => updateField('hasRuralOperation', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button className="bb-submit" type="submit" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Solicitar Material Completo'}
            </button>
            {error && <div className="bb-error">{error}</div>}
          </form>
        </div>
      </section>

      <footer className="bb-footer">
        <div className="bb-shell">
          <div>
            <img src={LOGO_URL} alt="Fazendas Brasil" />
            <p>Consultoria Estrategica em Patrimonio Rural e Investimentos no Agronegocio. WhatsApp: (44) 99843-3030. CRECI 16644F.</p>
          </div>
          <div className="bb-footer-links">
            <a href={whatsappUrl()} target="_blank" rel="noreferrer">WhatsApp</a>
            <a href="https://www.instagram.com/fazendasbrasiloficial" target="_blank" rel="noreferrer"><Instagram size={16} /> Instagram</a>
            <a href="https://www.fazendasbrasil.com.br" target="_blank" rel="noreferrer">Site</a>
            <a href="#captacao">Politica de Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BreuBrancoLandingPage;
