import React, { useState } from 'react';
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Droplets,
  FileCheck2,
  Home,
  Instagram,
  Lock,
  MapPinned,
  MessageCircle,
  Play,
  ShieldCheck,
  Sprout,
  Tractor,
  Warehouse,
  Wheat,
} from 'lucide-react';
import { leadService } from '../services/leads';

interface BreuBrancoLandingPageProps {
  organizationId?: string;
}

const WHATSAPP_NUMBER = '5544998433030';
const WHATSAPP_MESSAGE =
  'Olá, tenho interesse na Fazenda de Breu Branco-PA e gostaria de receber o material completo.';
const LOGO_URL = '/images/fazendas-brasil/logo.png';
const HERO_IMAGE = '/images/fazendas-brasil/breu-branco-hero-clean.webp';

const heroBenefits = [
  {
    icon: Droplets,
    title: 'Rica em água',
    text: '4 tanques, 2 represas, nascentes e igarapé',
  },
  {
    icon: Home,
    title: 'Estrutura completa',
    text: 'Casa sede, 3 casas de funcionários e galpão',
  },
  {
    icon: Tractor,
    title: 'Curral completo',
    text: 'Brete e balança pronto para operar',
  },
  {
    icon: Wheat,
    title: 'Potencial agrícola',
    text: 'Faz lavoura em +300 ha',
  },
  {
    icon: MapPinned,
    title: 'Excelente logística',
    text: 'A 25 km da cidade e silo/secador a 6 km',
  },
];

const opportunities = [
  {
    icon: Tractor,
    title: 'Para pecuaristas',
    text: 'Fazenda pronta para operar e expandir seu rebanho com segurança e estrutura completa.',
  },
  {
    icon: Sprout,
    title: 'Para produtores de grãos',
    text: 'Topografia plana e aberta, lavoura em mais de 300 ha e divisa com soja produtiva.',
  },
  {
    icon: CircleDollarSign,
    title: 'Para investidores',
    text: 'Ativo sólido, produtivo e com grande potencial de valorização patrimonial e geração de renda.',
  },
];

const numbers = [
  { icon: Banknote, value: '72', title: 'Alqueirões', note: '348,48 hectares' },
  { icon: Wheat, value: '300+', title: 'Hectares', note: 'aptos para lavoura' },
  { icon: Droplets, value: '4', title: 'Tanques', note: '2 represas e nascentes permanentes' },
  { icon: Warehouse, value: '6 km', title: 'Do silo/secador', note: 'logística estratégica' },
  { icon: MapPinned, value: '25 km', title: 'Da cidade', note: 'acesso por asfalto e vicinal boa' },
  { icon: FileCheck2, value: '100%', title: 'Documentada', note: 'sem embargos ou multas ambientais' },
];

const quizGroups = [
  {
    id: 'interest',
    title: '1. Qual o seu interesse?',
    options: ['Pecuária', 'Lavoura', 'Investimento'],
  },
  {
    id: 'role',
    title: '2. Você é:',
    options: ['Comprador direto', 'Representante de comprador', 'Corretor parceiro'],
  },
  {
    id: 'payment',
    title: '3. Qual a forma de aquisição?',
    options: ['À vista', 'Entrada + prazo', 'Financiamento'],
  },
  {
    id: 'budget',
    title: '4. Qual o valor aproximado disponível para investimento?',
    options: ['Até R$ 2 milhões', 'R$ 2 a R$ 5 milhões', 'R$ 5 a R$ 10 milhões', 'Acima de R$ 10 milhões'],
  },
  {
    id: 'operation',
    title: '5. Você possui operação rural atualmente?',
    options: ['Sim', 'Não'],
  },
  {
    id: 'visit',
    title: '6. Tem disponibilidade para visitar a propriedade?',
    options: ['Sim', 'Não'],
  },
  {
    id: 'timeline',
    title: '7. Em quanto tempo pretende comprar?',
    options: ['Imediatamente', 'Até 3 meses', 'Até 6 meses', 'Apenas pesquisando'],
  },
];

const processItems = [
  { icon: ClipboardCheck, text: 'Você envia suas respostas' },
  { icon: BadgeCheck, text: 'Analisamos seu perfil' },
  { icon: FileCheck2, text: 'Enviamos o dossiê completo' },
  { icon: MapPinned, text: 'Agendamos uma visita' },
  { icon: ShieldCheck, text: 'Negociação segura e transparente' },
];

const trustItems = [
  { icon: FileCheck2, text: 'Documentação 100% regular' },
  { icon: ShieldCheck, text: 'Sem embargos ambientais' },
  { icon: Home, text: 'Estrutura nova em alvenaria' },
  { icon: Droplets, text: 'Água abundante o ano todo' },
  { icon: MapPinned, text: 'Logística privilegiada e vizinhança produtiva' },
];

type CaptureForm = {
  name: string;
  phone: string;
  email: string;
  cityState: string;
};

const initialCapture: CaptureForm = {
  name: '',
  phone: '',
  email: '',
  cityState: '',
};

function whatsappUrl() {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
}

const BreuBrancoLandingPage: React.FC<BreuBrancoLandingPageProps> = ({
  organizationId,
}) => {
  const [capture, setCapture] = useState(initialCapture);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateCapture = (field: keyof CaptureForm, value: string) => {
    setCapture((current) => ({ ...current, [field]: value }));
  };

  const saveLeadAndRedirect = async (source: string) => {
    setSubmitting(true);
    setError('');

    try {
      if (organizationId) {
        const notes = [
          'Lead da landing Fazenda de Dupla Aptidão em Breu Branco - PA.',
          '72 alqueirões / 348,48 hectares.',
          'Estrutura completa, rica em água, curral completo, potencial agrícola e excelente logística.',
          '',
          `Cidade / Estado: ${capture.cityState || 'Não informado'}`,
          `Origem do formulário: ${source}`,
          `Respostas do formulário: ${JSON.stringify(quizAnswers)}`,
        ].join('\n');

        await leadService.create({
          organization_id: organizationId,
          organization_slug: 'fazendasbrasil',
          organization_domain: 'fazendasbrasil.com.br',
          owner_email: 'contato@fazendasbrasil.com.br',
          site_key: 'fazendasbrasil',
          referrer_url: window.location.href,
          name: capture.name || 'Lead Fazenda Breu Branco',
          phone: capture.phone,
          email: capture.email || undefined,
          source: 'Landing Fazenda Breu Branco',
          campaign: 'Dossiê Fazenda Breu Branco - PA',
          ad_reference: 'Fazenda de Dupla Aptidão em Breu Branco - PA',
          organic_channel: 'Landing page',
          notes,
          match_profile: 'rural',
          status: 'Qualificação',
          classification: 'Solicitou dossiê da fazenda',
          lead_score: 85,
        } as any);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'Não foi possível registrar o lead agora. Vamos direcionar para o WhatsApp.'
      );
    } finally {
      setSubmitting(false);
      window.location.href = whatsappUrl();
    }
  };

  const handleHeroSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveLeadAndRedirect('Dossiê completo');
  };

  const handleQuizSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveLeadAndRedirect('Questionário de qualificação');
  };

  return (
    <main className="bb-page">
      <style>{`
        .bb-page {
          --green: #002c17;
          --green-2: #063b20;
          --green-3: #0b4a28;
          --gold: #f6b51e;
          --gold-2: #f7c94a;
          --cream: #f7f3e9;
          --text: #092314;
          --muted: #3f4a42;
          min-height: 100vh;
          color: var(--text);
          background: var(--cream);
          font-family: Arial, Helvetica, sans-serif;
        }
        .bb-page * { box-sizing: border-box; }
        .bb-wrap { width: min(100% - 68px, 1320px); margin: 0 auto; }
        .bb-hero {
          position: relative;
          min-height: 760px;
          color: #fff;
          background:
            linear-gradient(90deg, rgba(0,31,15,.96) 0%, rgba(0,42,19,.78) 38%, rgba(0,42,19,.2) 72%),
            linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.2)),
            url("${HERO_IMAGE}") center / cover no-repeat;
        }
        .bb-top {
          height: 105px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .bb-logo { width: 170px; height: auto; display: block; }
        .bb-doc-badge {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 320px;
          padding: 15px 22px;
          color: #102016;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 10px 28px rgba(0,0,0,.22);
        }
        .bb-doc-badge strong { display: block; font-size: 14px; text-transform: uppercase; }
        .bb-doc-badge span { display: block; margin-top: 2px; font-size: 13px; font-weight: 700; }
        .bb-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 70px;
          align-items: start;
          padding-top: 70px;
        }
        .bb-sale-tag {
          display: inline-flex;
          padding: 9px 14px;
          color: #fff;
          background: #0d6a32;
          border-radius: 3px;
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .bb-hero h1 {
          max-width: 690px;
          margin: 18px 0 0;
          color: #fff;
          font-size: clamp(54px, 7vw, 84px);
          line-height: .98;
          letter-spacing: -1px;
          font-weight: 900;
        }
        .bb-hero h1 span {
          display: block;
          margin-top: 20px;
          color: var(--gold-2);
          font-size: clamp(34px, 3.9vw, 48px);
          line-height: 1.05;
          text-transform: uppercase;
        }
        .bb-hero-sub {
          max-width: 760px;
          margin: 30px 0 0;
          color: #fff;
          font-size: 20px;
          line-height: 1.55;
          font-weight: 800;
        }
        .bb-lead-card {
          padding: 28px 24px 24px;
          background: linear-gradient(160deg, rgba(0,39,18,.96), rgba(0,27,13,.96));
          border: 1px solid rgba(255,255,255,.9);
          border-radius: 8px;
          box-shadow: 0 20px 55px rgba(0,0,0,.42);
        }
        .bb-lead-card h2 {
          margin: 0;
          color: var(--gold-2);
          font-size: 24px;
          line-height: 1.15;
          text-align: center;
          text-transform: uppercase;
        }
        .bb-lead-card h2 span { display: block; color: #fff; }
        .bb-lead-card p {
          margin: 22px auto;
          max-width: 250px;
          color: #fff;
          text-align: center;
          font-size: 15px;
          line-height: 1.45;
          font-weight: 700;
        }
        .bb-lead-card input {
          width: 100%;
          height: 55px;
          margin-bottom: 10px;
          padding: 0 16px;
          color: #1b261f;
          background: #fff;
          border: 0;
          border-radius: 4px;
          font-size: 14px;
          outline: none;
        }
        .bb-yellow-btn {
          width: 100%;
          height: 65px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 0;
          border-radius: 5px;
          color: #091d10;
          background: linear-gradient(180deg, #ffc52d, #f5a914);
          font-size: 18px;
          font-weight: 950;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
        }
        .bb-secure {
          display: flex;
          justify-content: center;
          gap: 7px;
          margin-top: 14px;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          opacity: .9;
        }
        .bb-benefits {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,40,18,.9);
          border-top: 1px solid rgba(255,255,255,.12);
        }
        .bb-benefit-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0;
        }
        .bb-benefit {
          min-height: 150px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 18px 18px 16px;
          text-align: center;
          border-left: 1px solid rgba(247,201,74,.28);
        }
        .bb-benefit:last-child { border-right: 1px solid rgba(247,201,74,.28); }
        .bb-benefit svg { width: 50px; height: 50px; color: var(--gold-2); stroke-width: 1.6; }
        .bb-benefit strong {
          margin-top: 10px;
          color: #fff;
          font-size: 13px;
          line-height: 1.1;
          text-transform: uppercase;
        }
        .bb-benefit span {
          margin-top: 6px;
          max-width: 160px;
          color: #fff;
          font-size: 12px;
          line-height: 1.25;
          font-weight: 700;
        }
        .bb-section { padding: 44px 0; background: var(--cream); }
        .bb-intro-grid {
          display: grid;
          grid-template-columns: 470px minmax(0, 1fr);
          gap: 58px;
          align-items: start;
        }
        .bb-section-title {
          margin: 0;
          color: #0b2b17;
          font-size: 27px;
          line-height: 1.1;
          font-weight: 950;
          text-transform: uppercase;
        }
        .bb-copy {
          margin: 16px 0 20px;
          color: #0b2114;
          font-size: 15px;
          line-height: 1.45;
          font-weight: 700;
        }
        .bb-video-card {
          overflow: hidden;
          border-radius: 5px;
          background: #0b321a;
          box-shadow: 0 10px 22px rgba(0,0,0,.18);
        }
        .bb-video-thumb {
          min-height: 240px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(rgba(0,0,0,.02), rgba(0,0,0,.12)),
            url("${HERO_IMAGE}") center / cover no-repeat;
        }
        .bb-play {
          width: 86px;
          height: 86px;
          display: grid;
          place-items: center;
          color: #fff;
          background: rgba(0,0,0,.34);
          border: 4px solid #fff;
          border-radius: 999px;
        }
        .bb-video-btn {
          width: 100%;
          min-height: 66px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #fff;
          background: #002f18;
          border: 0;
          border-top: 7px solid var(--cream);
          font-size: 15px;
          font-weight: 950;
          text-transform: uppercase;
        }
        .bb-opportunities h2 { text-align: center; margin-bottom: 62px; }
        .bb-card-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .bb-op-card {
          min-height: 335px;
          padding: 44px 38px;
          background: #fff;
          border: 1px solid #d5d5d0;
          border-radius: 6px;
          box-shadow: 0 8px 18px rgba(0,0,0,.15);
        }
        .bb-op-card svg { width: 58px; height: 58px; color: #092715; stroke-width: 1.9; }
        .bb-op-card h3 {
          margin: 34px 0 22px;
          color: #0a2012;
          font-size: 17px;
          line-height: 1.2;
          font-weight: 950;
          text-transform: uppercase;
        }
        .bb-op-card p {
          margin: 0;
          color: #17291d;
          font-size: 15px;
          line-height: 1.58;
          font-weight: 700;
        }
        .bb-dark-band {
          padding: 38px 0 40px;
          color: #fff;
          background:
            linear-gradient(90deg, #002f18, #073d20 50%, #002b16);
        }
        .bb-dark-band h2 {
          margin: 0 0 34px;
          color: #fff;
          text-align: center;
          font-size: 28px;
          font-weight: 950;
          text-transform: uppercase;
        }
        .bb-number-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0;
        }
        .bb-number {
          min-height: 175px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-left: 1px solid rgba(247,201,74,.34);
        }
        .bb-number:last-child { border-right: 1px solid rgba(247,201,74,.34); }
        .bb-number svg { width: 48px; height: 48px; color: var(--gold-2); stroke-width: 1.7; }
        .bb-number b {
          display: block;
          margin-top: 13px;
          color: var(--gold-2);
          font-size: 48px;
          line-height: .95;
          font-weight: 950;
        }
        .bb-number strong {
          margin-top: 8px;
          color: #fff;
          font-size: 15px;
          text-transform: uppercase;
        }
        .bb-number span {
          max-width: 150px;
          margin-top: 7px;
          color: #fff;
          font-size: 13px;
          line-height: 1.25;
          font-weight: 700;
        }
        .bb-quiz-section { padding: 56px 0; background: var(--cream); }
        .bb-quiz-title {
          max-width: 820px;
          margin: 0 auto;
          color: #0a2a17;
          text-align: center;
          font-size: 29px;
          line-height: 1.18;
          font-weight: 950;
          text-transform: uppercase;
        }
        .bb-quiz-sub {
          margin: 12px 0 28px;
          text-align: center;
          color: #27372d;
          font-size: 14px;
          font-weight: 700;
        }
        .bb-quiz-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 325px;
          gap: 28px;
          align-items: stretch;
        }
        .bb-quiz-card {
          padding: 28px 32px 22px;
          background: #fff;
          border: 1px solid #dedbd3;
          border-radius: 5px;
          box-shadow: 0 6px 16px rgba(0,0,0,.08);
        }
        .bb-question-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 25px 34px;
        }
        .bb-question {
          padding-right: 24px;
          border-right: 1px solid #d5d2ca;
        }
        .bb-question:nth-child(3),
        .bb-question:nth-child(6),
        .bb-question:nth-child(7) { border-right: 0; }
        .bb-question:last-child {
          grid-column: 1 / 3;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border-top: 1px solid #d5d2ca;
          padding-top: 20px;
        }
        .bb-question h3 {
          grid-column: 1 / -1;
          margin: 0 0 13px;
          color: #0c2014;
          font-size: 13px;
          line-height: 1.25;
          font-weight: 950;
          text-transform: uppercase;
        }
        .bb-radio {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 12px;
          color: #1d2a21;
          font-size: 14px;
          font-weight: 700;
        }
        .bb-radio input {
          width: 17px;
          height: 17px;
          accent-color: #063b20;
        }
        .bb-submit-row {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 26px;
          align-items: center;
          margin-top: 22px;
          padding-top: 20px;
          border-top: 1px solid #d5d2ca;
        }
        .bb-green-btn {
          min-height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #fff;
          background: #002f18;
          border: 0;
          border-radius: 3px;
          font-size: 16px;
          font-weight: 950;
          text-transform: uppercase;
          cursor: pointer;
        }
        .bb-submit-note {
          margin-top: 12px;
          color: #7c7770;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
        }
        .bb-how {
          padding: 32px 28px;
          color: #fff;
          background: linear-gradient(160deg, #003019, #052714);
          border: 2px solid #002615;
          border-radius: 7px;
          box-shadow: 0 10px 20px rgba(0,0,0,.22);
        }
        .bb-how h3 {
          margin: 0 0 28px;
          color: var(--gold-2);
          font-size: 18px;
          text-transform: uppercase;
        }
        .bb-how-item {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 26px;
          color: #fff;
          font-size: 14px;
          font-weight: 800;
        }
        .bb-how-item svg {
          width: 42px;
          height: 42px;
          padding: 8px;
          color: var(--gold-2);
          border: 1px solid var(--gold-2);
          border-radius: 999px;
          flex: 0 0 auto;
        }
        .bb-service-box {
          margin-top: 16px;
          padding: 20px 18px;
          color: #0a2012;
          background: linear-gradient(180deg, #ffc52d, #e49e10);
          border-radius: 4px;
        }
        .bb-service-box h4 {
          margin: 0 0 12px;
          font-size: 16px;
          text-transform: uppercase;
        }
        .bb-service-box p {
          margin: 0 0 16px;
          font-size: 14px;
          line-height: 1.35;
          font-weight: 700;
        }
        .bb-whatsapp-box {
          min-height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--gold-2);
          background: #002f18;
          border-radius: 5px;
          font-size: 22px;
          font-weight: 950;
          text-decoration: none;
        }
        .bb-trust {
          padding: 43px 0 38px;
          color: #fff;
          background:
            linear-gradient(rgba(0,42,19,.82), rgba(0,42,19,.82)),
            url("${HERO_IMAGE}") center 63% / cover no-repeat;
        }
        .bb-trust h2 {
          margin: 0 0 30px;
          text-align: center;
          color: #fff;
          font-size: 31px;
          font-weight: 950;
          text-transform: uppercase;
        }
        .bb-trust-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0;
        }
        .bb-trust-item {
          min-height: 112px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-left: 1px solid rgba(247,201,74,.35);
        }
        .bb-trust-item:last-child { border-right: 1px solid rgba(247,201,74,.35); }
        .bb-trust-item svg {
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          color: var(--gold-2);
          stroke-width: 1.7;
        }
        .bb-trust-item span {
          max-width: 160px;
          color: #fff;
          font-size: 13px;
          line-height: 1.25;
          font-weight: 800;
        }
        .bb-footer {
          color: #fff;
          background: linear-gradient(90deg, #003019, #063b20 45%, #002b16);
        }
        .bb-footer-main {
          min-height: 190px;
          display: grid;
          grid-template-columns: 1fr 360px 1fr;
          gap: 30px;
          align-items: center;
        }
        .bb-footer h2 {
          margin: 0;
          font-size: 25px;
          line-height: 1.28;
          text-transform: uppercase;
        }
        .bb-footer h2 span { display: block; color: var(--gold-2); }
        .bb-footer p {
          margin: 16px 0 0;
          max-width: 620px;
          color: #fff;
          font-size: 17px;
          line-height: 1.42;
        }
        .bb-footer-logo { width: 165px; margin: 0 auto; display: block; }
        .bb-agent {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 12px;
          color: var(--gold-2);
          font-size: 18px;
          font-weight: 950;
        }
        .bb-agent small {
          display: block;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
        }
        .bb-social {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .bb-social span,
        .bb-social a {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          color: #fff;
          border-radius: 999px;
          font-weight: 950;
          text-decoration: none;
        }
        .bb-social .fb { background: #2467d7; }
        .bb-social .ig { background: linear-gradient(135deg,#7646ff,#e12b80,#ff9d20); }
        .bb-social .yt { background: #ed1b24; }
        .bb-footer-bottom {
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          color: rgba(255,255,255,.74);
          border-top: 1px solid rgba(255,255,255,.16);
          font-size: 12px;
        }
        .bb-footer-bottom a { color: rgba(255,255,255,.74); text-decoration: none; }
        .bb-error {
          margin-top: 10px;
          color: #ffd36b;
          text-align: center;
          font-size: 12px;
          font-weight: 800;
        }
        @media (max-width: 1100px) {
          .bb-wrap { width: min(100% - 32px, 1320px); }
          .bb-hero { padding-bottom: 0; }
          .bb-hero-grid,
          .bb-intro-grid,
          .bb-quiz-layout,
          .bb-footer-main { grid-template-columns: 1fr; }
          .bb-benefits { position: static; margin-top: 50px; }
          .bb-benefit-grid,
          .bb-number-grid,
          .bb-trust-grid { grid-template-columns: repeat(2, 1fr); }
          .bb-card-row,
          .bb-question-grid { grid-template-columns: 1fr; }
          .bb-question,
          .bb-question:nth-child(3),
          .bb-question:nth-child(6),
          .bb-question:nth-child(7) { border-right: 0; }
          .bb-question:last-child { grid-column: auto; grid-template-columns: 1fr; }
          .bb-submit-row { grid-template-columns: 1fr; }
          .bb-social { justify-content: center; }
        }
        @media (max-width: 680px) {
          .bb-top { height: auto; padding: 22px 0; align-items: flex-start; }
          .bb-logo { width: 132px; }
          .bb-doc-badge { min-width: 0; padding: 12px; }
          .bb-hero-grid { padding-top: 26px; gap: 28px; }
          .bb-hero h1 { font-size: 46px; }
          .bb-hero h1 span { font-size: 28px; }
          .bb-lead-card { padding: 22px 18px; }
          .bb-benefit-grid,
          .bb-number-grid,
          .bb-trust-grid { grid-template-columns: 1fr; }
          .bb-section-title,
          .bb-dark-band h2,
          .bb-quiz-title,
          .bb-trust h2 { font-size: 24px; }
        }
      `}</style>

      <section className="bb-hero">
        <div className="bb-wrap">
          <div className="bb-top">
            <img className="bb-logo" src={LOGO_URL} alt="Fazendas Brasil" />
            <div className="bb-doc-badge">
              <ShieldCheck size={36} />
              <div>
                <strong>100% documentada</strong>
                <span>Sem embargos ou multas ambientais</span>
              </div>
            </div>
          </div>

          <div className="bb-hero-grid">
            <div>
              <span className="bb-sale-tag">Fazenda à venda</span>
              <h1>
                Fazenda de
                <br />
                Dupla Aptidão
                <span>Em Breu Branco - PA</span>
              </h1>
              <p className="bb-hero-sub">
                72 alqueirões (348,48 ha) com estrutura completa, rica em água
                e potencial para mais de 300 ha de lavoura.
              </p>
            </div>

            <form className="bb-lead-card" onSubmit={handleHeroSubmit}>
              <h2>
                Receba o dossiê
                <span>completo da fazenda</span>
              </h2>
              <p>
                Preencha seus dados e receba vídeos, fotos, mapas e informações
                detalhadas.
              </p>
              <input
                required
                placeholder="Nome completo"
                value={capture.name}
                onChange={(event) => updateCapture('name', event.target.value)}
              />
              <input
                required
                placeholder="WhatsApp (com DDD)"
                value={capture.phone}
                onChange={(event) => updateCapture('phone', event.target.value)}
              />
              <input
                required
                type="email"
                placeholder="E-mail"
                value={capture.email}
                onChange={(event) => updateCapture('email', event.target.value)}
              />
              <input
                required
                placeholder="Cidade / Estado"
                value={capture.cityState}
                onChange={(event) =>
                  updateCapture('cityState', event.target.value)
                }
              />
              <button className="bb-yellow-btn" disabled={submitting} type="submit">
                Quero receber agora
              </button>
              <span className="bb-secure">
                <Lock size={13} /> Seus dados estão seguros conosco.
              </span>
              {error && <div className="bb-error">{error}</div>}
            </form>
          </div>
        </div>

        <div className="bb-benefits">
          <div className="bb-wrap bb-benefit-grid">
            {heroBenefits.map((item) => {
              const Icon = item.icon;
              return (
                <div className="bb-benefit" key={item.title}>
                  <Icon />
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bb-section">
        <div className="bb-wrap bb-intro-grid">
          <div>
            <h2 className="bb-section-title">Conheça a fazenda</h2>
            <p className="bb-copy">
              Assista ao vídeo e veja de perto a estrutura, a água, as pastagens
              e o potencial desta excelente oportunidade.
            </p>
            <div className="bb-video-card">
              <div className="bb-video-thumb">
                <span className="bb-play">
                  <Play size={44} fill="currentColor" />
                </span>
              </div>
              <a className="bb-video-btn" href={whatsappUrl()}>
                Assistir vídeo completo
              </a>
            </div>
          </div>

          <div className="bb-opportunities">
            <h2 className="bb-section-title">
              Uma fazenda, várias oportunidades
            </h2>
            <div className="bb-card-row">
              {opportunities.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="bb-op-card" key={item.title}>
                    <Icon />
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bb-dark-band">
        <div className="bb-wrap">
          <h2>Números que comprovam o potencial</h2>
          <div className="bb-number-grid">
            {numbers.map((item) => {
              const Icon = item.icon;
              return (
                <div className="bb-number" key={item.title}>
                  <Icon />
                  <b>{item.value}</b>
                  <strong>{item.title}</strong>
                  <span>{item.note}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bb-quiz-section">
        <div className="bb-wrap">
          <h2 className="bb-quiz-title">
            Quase lá! Para enviarmos o material completo, precisamos te conhecer
            melhor.
          </h2>
          <p className="bb-quiz-sub">Responda algumas perguntas rápidas:</p>

          <div className="bb-quiz-layout">
            <form className="bb-quiz-card" onSubmit={handleQuizSubmit}>
              <div className="bb-question-grid">
                {quizGroups.map((group) => (
                  <fieldset className="bb-question" key={group.id}>
                    <h3>{group.title}</h3>
                    {group.options.map((option) => (
                      <label className="bb-radio" key={option}>
                        <input
                          required={!quizAnswers[group.id]}
                          type="radio"
                          name={group.id}
                          value={option}
                          checked={quizAnswers[group.id] === option}
                          onChange={() =>
                            setQuizAnswers((current) => ({
                              ...current,
                              [group.id]: option,
                            }))
                          }
                        />
                        {option}
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>

              <div className="bb-submit-row">
                <div />
                <div>
                  <button className="bb-green-btn" disabled={submitting} type="submit">
                    Enviar respostas
                  </button>
                  <div className="bb-submit-note">
                    <Lock size={11} /> Suas informações estão protegidas.
                  </div>
                </div>
              </div>
            </form>

            <aside className="bb-how">
              <h3>Como funciona?</h3>
              {processItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="bb-how-item" key={item.text}>
                    <Icon />
                    <span>{item.text}</span>
                  </div>
                );
              })}

              <div className="bb-service-box">
                <h4>Atendimento personalizado</h4>
                <p>Fale direto com nossa equipe pelo WhatsApp.</p>
                <a className="bb-whatsapp-box" href={whatsappUrl()}>
                  <MessageCircle size={26} /> (44) 99843-3030
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bb-trust">
        <div className="bb-wrap">
          <h2>Compra segura, negócio transparente</h2>
          <div className="bb-trust-grid">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <div className="bb-trust-item" key={item.text}>
                  <Icon />
                  <span>{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="bb-footer">
        <div className="bb-wrap bb-footer-main">
          <div>
            <h2>
              Fazenda pronta. Estrutura completa.
              <span>Potencial comprovado. É hora de investir!</span>
            </h2>
            <p>
              Preencha o formulário e receba agora o dossiê completo com todas
              as informações da Fazenda em Breu Branco - PA.
            </p>
          </div>

          <div>
            <img className="bb-footer-logo" src={LOGO_URL} alt="Fazendas Brasil" />
            <div className="bb-agent">
              <MessageCircle size={25} />
              <span>
                <small>Renato Piovesana</small>
                (44) 99843-3030
              </span>
            </div>
          </div>

          <div className="bb-social">
            <span className="fb">f</span>
            <a
              className="ig"
              href="https://www.instagram.com/fazendasbrasiloficial"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <Instagram size={19} />
            </a>
            <span className="yt">▶</span>
          </div>
        </div>

        <div className="bb-wrap bb-footer-bottom">
          <span>© 2024 Fazendas Brasil - Todos os direitos reservados.</span>
          <span>
            <a href="#top">Política de Privacidade</a> &nbsp; • &nbsp;
            <a href="#top">Termos de Uso</a>
          </span>
        </div>
      </footer>
    </main>
  );
};

export default BreuBrancoLandingPage;
