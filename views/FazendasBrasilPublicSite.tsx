import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  CircleDollarSign,
  Facebook,
  FileText,
  Gem,
  Handshake,
  Headphones,
  Heart,
  Instagram,
  Leaf,
  Lock,
  Mail,
  Menu,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
  UsersRound,
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { leadService } from '../services/leads';

interface FazendasBrasilPublicSiteProps {
  organizationId?: string;
}

type PublicProperty = {
  id: string;
  title: string;
  price?: number;
  city?: string;
  state?: string;
  images?: string[] | string;
  property_type?: string;
  total_area_ha?: number;
  useful_area_ha?: number;
  features?: Record<string, any>;
  aptitude?: string[] | string;
};

const FAZENDAS_ORG_SLUGS = [
  'fazendasbrasil',
  'fazendas-brasil',
  'imobiliaria-fazendas-brasil',
  'imobiliariafazendasbrasil',
  'fazendasbrasil1',
];
const FAZENDAS_ORG_ID = 'ee2eafa9-929a-460e-a38a-2e13d259e7cb';
const WHATSAPP_NUMBER = '5544998433030';
const PHONE_LABEL = '(44) 99843-3030';
const EMAIL = 'contato@fazendasbrasil.com.br';
const LOGO_URL = '/images/fazendas-brasil/logo.png';
const BROKER_IMAGE = '/images/fazendas-brasil/broker-renato.jpeg';
const HERO_IMAGE = 'https://nb.consultio.com.br/imobzycrm/ee2eafa9-929a-460e-a38a-2e13d259e7cb/fazendasbrasil-crm49/site/hero/fazendas-brasil-hero-clean.webp';
const CARD_FALLBACK_IMAGE = 'https://nb.consultio.com.br/imobzycrm/ee2eafa9-929a-460e-a38a-2e13d259e7cb/fazendasbrasil-crm49/site/fallback/fazendas-brasil-card-fallback.webp';
const BROKER_NAME = 'Renato Piovesana';
const PROPERTIES_PER_PAGE = 12;
const PROPERTIES_PER_GRID = 4;

const quizQuestions = [
  {
    id: 'objective',
    label: 'Qual e o objetivo principal?',
    options: ['Comprar para produzir', 'Investimento patrimonial', 'Expansao rural', 'Reserva familiar'],
  },
  {
    id: 'budgetRange',
    label: 'Qual faixa de investimento?',
    options: ['Ate R$ 10 mi', 'R$ 10 mi a R$ 30 mi', 'R$ 30 mi a R$ 70 mi', 'Acima de R$ 70 mi'],
  },
  {
    id: 'timeline',
    label: 'Quando pretende avançar?',
    options: ['Imediatamente', 'Em ate 30 dias', 'Em 3 meses', 'Ainda pesquisando'],
  },
  {
    id: 'areaNeed',
    label: 'Qual tamanho faz sentido?',
    options: ['Ate 500 ha', '500 a 1.500 ha', '1.500 a 3.000 ha', 'Acima de 3.000 ha'],
  },
  {
    id: 'payment',
    label: 'Como pretende negociar?',
    options: ['A vista', 'Entrada e prazo', 'Financiamento', 'Depende da oportunidade'],
  },
];

const fallbackProperties: PublicProperty[] = [
  {
    id: 'fazendas-demo-1',
    title: 'Fazenda Santa Helena',
    price: 85000000,
    city: 'Goias',
    state: 'GO',
    images: ['/images/fazendas-brasil/card-santa-helena.webp'],
    property_type: 'Pecuaria',
    total_area_ha: 2350,
  },
  {
    id: 'fazendas-demo-2',
    title: 'Fazenda Boa Vista',
    price: 62000000,
    city: 'Mato Grosso',
    state: 'MT',
    images: ['/images/fazendas-brasil/card-boa-vista.webp'],
    property_type: 'Agricultura',
    total_area_ha: 1650,
  },
  {
    id: 'fazendas-demo-3',
    title: 'Fazenda Sao Bento',
    price: 38000000,
    city: 'Mato Grosso do Sul',
    state: 'MS',
    images: ['/images/fazendas-brasil/card-sao-bento.webp'],
    property_type: 'Pecuaria',
    total_area_ha: 1280,
  },
  {
    id: 'fazendas-demo-4',
    title: 'Fazenda Conquista',
    price: 95000000,
    city: 'Bahia',
    state: 'BA',
    images: ['/images/fazendas-brasil/card-conquista.webp'],
    property_type: 'Pecuaria',
    total_area_ha: 3600,
  },
];

const highlights = ['Destaque', 'Exclusivo', 'Oportunidade', 'Destaque'];

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Seguranca total',
    text: 'Todos os fazendas passam por rigorosa analise documental e juridica.',
  },
  {
    icon: Gem,
    title: 'Imoveis exclusivos',
    text: 'Selecao criteriosa das melhores fazendas de alto padrao do mercado.',
  },
  {
    icon: UsersRound,
    title: 'Atendimento personalizado',
    text: 'Consultores especialistas para entender e atender suas necessidades.',
  },
  {
    icon: Handshake,
    title: 'Experiencia e tradicao',
    text: 'Mais de 25 anos conectando pessoas aos melhores negocios rurais.',
  },
  {
    icon: Leaf,
    title: 'Atuacao nacional',
    text: 'Fazendas em todos os estados do Brasil com total cobertura.',
  },
];

const footerStats = [
  { icon: UsersRound, value: '+25 anos', label: 'de experiencia no mercado' },
  { icon: FileText, value: '+1.000', label: 'fazendas negociadas' },
  { icon: UsersRound, value: '+10.000', label: 'clientes atendidos' },
  { icon: MapPin, value: 'Todo o Brasil', label: 'atuacao nacional' },
  { icon: Star, value: 'Referencia', label: 'em imoveis rurais de alto padrao' },
];

function normalizeImages(images?: string[] | string) {
  if (Array.isArray(images)) return images.filter(Boolean);
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return images ? [images] : [];
    }
  }
  return [];
}

function isLegacyBrokenImage(url: string) {
  return /supabase\.(co|com)\/storage\/v1\/object\/public\/imobzyimg/i.test(String(url || ''));
}

function formatCurrency(value?: number) {
  const amount = toNumber(value);
  if (!amount) return 'Sob consulta';
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function formatArea(value?: number) {
  const area = toNumber(value);
  if (!area) return 'Sob consulta';
  return `${area.toLocaleString('pt-BR', { maximumFractionDigits: area < 100 ? 1 : 0 })} ha`;
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const normalized = value
      .replace(/[^\d.,-]/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getFeatureNumber(property: PublicProperty, keys: string[]) {
  for (const key of keys) {
    const rawValue = property.features?.[key] ?? (property as any)[key];
    const parsed = toNumber(rawValue);
    if (parsed) return parsed;
  }
  return 0;
}

function normalizeProperty(property: any): PublicProperty {
  return {
    ...property,
    price: toNumber(property.price),
    total_area_ha: toNumber(property.total_area_ha),
    useful_area_ha: toNumber(property.useful_area_ha),
  };
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
  const images = normalizeImages(property.images).filter((image) => !isLegacyBrokenImage(image));
  return images[0] || CARD_FALLBACK_IMAGE || normalizeImages(fallbackProperties[index % fallbackProperties.length].images)[0] || HERO_IMAGE;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const FazendasBrasilPublicSite: React.FC<FazendasBrasilPublicSiteProps> = ({
  organizationId,
}) => {
  const [properties, setProperties] = useState<PublicProperty[]>(fallbackProperties);
  const [resolvedOrganizationId, setResolvedOrganizationId] = useState<string | undefined>(organizationId || FAZENDAS_ORG_ID);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProperties, setTotalProperties] = useState(fallbackProperties.length);
  const [isUsingFallback, setIsUsingFallback] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PublicProperty | null>(null);
  const [leadStep, setLeadStep] = useState<'contact' | 'quiz' | 'success'>('contact');
  const [quizIndex, setQuizIndex] = useState(0);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setIsUsingFallback(false);
        let orgId = organizationId || FAZENDAS_ORG_ID;
        setResolvedOrganizationId(orgId);

        if (!organizationId) {
          const { data: org } = await supabase
            .from('organizations')
            .select('id, slug, custom_domain')
            .or(
              `id.eq.${FAZENDAS_ORG_ID},slug.in.(${FAZENDAS_ORG_SLUGS.join(',')}),custom_domain.ilike.*fazendasbrasil*`
            )
            .limit(1)
            .maybeSingle();
          orgId = org?.id || FAZENDAS_ORG_ID;
        }

        setResolvedOrganizationId(orgId);

        if (!orgId) {
          setProperties(fallbackProperties);
          setTotalProperties(fallbackProperties.length);
          setIsUsingFallback(true);
          return;
        }

        const from = (currentPage - 1) * PROPERTIES_PER_PAGE;
        const to = from + PROPERTIES_PER_PAGE - 1;

        const { data, error, count } = await supabase
          .from('properties')
          .select(
            'id,title,price,city,state,images,property_type,total_area_ha,useful_area_ha,features,aptitude',
            { count: 'exact' }
          )
          .eq('organization_id', orgId)
          .range(from, to);

        if (!error && data && data.length > 0) {
          setProperties(data.map(normalizeProperty));
          setTotalProperties(count || data.length);
          setIsUsingFallback(false);
          return;
        }

        setProperties(fallbackProperties);
        setTotalProperties(fallbackProperties.length);
        setIsUsingFallback(true);
      } catch (error) {
        console.warn('[Fazendas Brasil] Mantendo vitrine de fallback:', error);
        setResolvedOrganizationId(organizationId || FAZENDAS_ORG_ID);
        setProperties(fallbackProperties);
        setTotalProperties(fallbackProperties.length);
        setIsUsingFallback(true);
      }
    };

    loadProperties();
  }, [organizationId, currentPage]);

  const propertyGrids = useMemo(() => {
    const grids: PublicProperty[][] = [];
    for (let i = 0; i < properties.length; i += PROPERTIES_PER_GRID) {
      grids.push(properties.slice(i, i + PROPERTIES_PER_GRID));
    }
    return grids;
  }, [properties]);

  const totalPages = Math.max(1, Math.ceil(totalProperties / PROPERTIES_PER_PAGE));
  const firstPropertyIndex = isUsingFallback ? 1 : (currentPage - 1) * PROPERTIES_PER_PAGE + 1;
  const lastPropertyIndex = isUsingFallback
    ? properties.length
    : Math.min(currentPage * PROPERTIES_PER_PAGE, totalProperties);

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setMobileMenuOpen(false);
    setCurrentPage(nextPage);
    window.requestAnimationFrame(() => {
      document.getElementById('fazendas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openLeadFlow = (property: PublicProperty) => {
    setMobileMenuOpen(false);
    setSelectedProperty(property);
    setLeadStep('contact');
    setQuizIndex(0);
    setLeadError('');
    setQuizAnswers({});
  };

  const closeLeadFlow = () => {
    if (leadSubmitting) return;
    setSelectedProperty(null);
    setLeadStep('contact');
    setQuizIndex(0);
    setLeadError('');
    setLeadForm({ name: '', phone: '', email: '' });
    setQuizAnswers({});
  };

  const qualifyScore = (answers: Record<string, string>) => {
    let score = 45;
    if (answers.timeline === 'Imediatamente') score += 20;
    if (answers.timeline === 'Em ate 30 dias') score += 15;
    if (answers.budgetRange === 'Acima de R$ 70 mi') score += 15;
    if (answers.budgetRange === 'R$ 30 mi a R$ 70 mi') score += 12;
    if (answers.payment === 'A vista') score += 15;
    if (answers.objective && answers.areaNeed) score += 10;
    return Math.min(score, 100);
  };

  const handleContactSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLeadError('');
    setLeadStep('quiz');
  };

  const handleQuizAnswer = (answer: string) => {
    const question = quizQuestions[quizIndex];
    const nextAnswers = { ...quizAnswers, [question.id]: answer };
    setQuizAnswers(nextAnswers);

    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex((current) => current + 1);
      return;
    }

    submitQualifiedLead(nextAnswers);
  };

  const submitQualifiedLead = async (answers: Record<string, string>) => {
    if (!selectedProperty || !resolvedOrganizationId) {
      setLeadError('Nao foi possivel identificar a Fazendas Brasil para salvar o lead.');
      return;
    }

    setLeadSubmitting(true);
    setLeadError('');

    try {
      const score = qualifyScore(answers);
      const area = getPropertyArea(selectedProperty);
      const notes = [
        `Lead qualificado pelo site Fazendas Brasil.`,
        `Imovel de interesse: ${selectedProperty.title}`,
        selectedProperty.city || selectedProperty.state ? `Localizacao do imovel: ${[selectedProperty.city, selectedProperty.state].filter(Boolean).join(' / ')}` : null,
        area ? `Area do imovel: ${formatArea(area)}` : null,
        selectedProperty.price ? `Valor do imovel: ${formatCurrency(selectedProperty.price)}` : null,
        '',
        'Respostas do quiz:',
        ...quizQuestions.map((question) => `- ${question.label} ${answers[question.id] || 'Nao informado'}`),
      ].filter(Boolean).join('\n');

      await leadService.create({
        organization_id: resolvedOrganizationId,
        organization_slug: 'fazendasbrasil',
        organization_domain: window.location.hostname.replace(/^www\./, '') || 'fazendasbrasil.com',
        owner_email: EMAIL,
        site_key: 'fazendasbrasil',
        referrer_url: window.location.href,
        name: leadForm.name,
        phone: leadForm.phone,
        email: leadForm.email || undefined,
        propertyId: isUuid(selectedProperty.id) ? selectedProperty.id : undefined,
        source: 'Site Fazendas Brasil',
        ad_reference: selectedProperty.title,
        organic_channel: 'Site publico',
        campaign: 'Qualificacao de imovel rural',
        notes,
        budget: answers.budgetRange as any,
        aptitude_interest: getAptitude(selectedProperty) as any,
        match_profile: 'rural',
        status: 'Qualificação',
        classification: score >= 75 ? 'Lead qualificado - Alta prioridade' : 'Lead qualificado',
        lead_score: score,
      } as any);

      setLeadStep('success');
    } catch (error: any) {
      setLeadError(error?.message || 'Erro ao cadastrar lead. Tente novamente.');
    } finally {
      setLeadSubmitting(false);
    }
  };

  return (
    <div className="fb-site">
      <style>{`
        .fb-site {
          --fb-green: #006b31;
          --fb-green-dark: #003f1d;
          --fb-green-deep: #002f18;
          --fb-gold: #ffd500;
          --fb-blue: #06318a;
          --fb-ink: #052b1c;
          --fb-muted: #64706b;
          --fb-line: #dfe8e4;
          min-height: 100vh;
          color: var(--fb-ink);
          background: #f4f7f4;
          font-family: "Arial Narrow", Arial, Helvetica, sans-serif;
        }
        .fb-site * { box-sizing: border-box; }
        .fb-shell { width: min(100% - 74px, 1700px); margin: 0 auto; }
        .fb-topbar {
          height: 40px;
          color: #fff;
          background: linear-gradient(90deg, #004c1e, #006f2c);
          font-size: 12px;
          font-weight: 800;
        }
        .fb-topbar .fb-shell,
        .fb-topbar-group,
        .fb-topbar-item,
        .fb-top-action {
          height: 100%;
          display: flex;
          align-items: center;
        }
        .fb-topbar .fb-shell { justify-content: space-between; gap: 18px; }
        .fb-topbar-group { gap: 58px; }
        .fb-topbar-item { gap: 8px; white-space: nowrap; }
        .fb-topbar svg { color: var(--fb-gold); }
        .fb-top-actions { display: flex; align-items: center; gap: 6px; height: 100%; }
        .fb-top-action {
          min-width: 130px;
          justify-content: center;
          gap: 8px;
          padding: 0 18px;
          color: #fff;
          background: #00471f;
          text-decoration: none;
          font-weight: 950;
        }
        .fb-top-action.yellow { color: #071d0f; background: var(--fb-gold); border-radius: 5px; height: 31px; }
        .fb-nav {
          height: 126px;
          background: #fff;
          box-shadow: 0 1px 0 rgba(0,0,0,.05);
          position: relative;
          z-index: 5;
        }
        .fb-nav .fb-shell { height: 100%; display: flex; align-items: center; justify-content: space-between; gap: 34px; }
        .fb-logo {
          width: 176px;
          height: 106px;
          object-fit: contain;
          object-position: left center;
          filter: drop-shadow(0 8px 14px rgba(0,0,0,.1));
        }
        .fb-menu { display: flex; align-items: center; gap: 44px; font-size: 12px; font-weight: 950; text-transform: uppercase; }
        .fb-menu a { color: #00130b; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; white-space: nowrap; }
        .fb-menu-toggle {
          display: none;
          width: 44px;
          height: 44px;
          border: 1px solid #d3e2da;
          border-radius: 6px;
          background: #fff;
          color: var(--fb-green-dark);
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .fb-mobile-contact { display: none; }
        .fb-favorites {
          height: 38px;
          border-radius: 5px;
          background: #006b31;
          color: #fff;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 0 16px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          box-shadow: 0 6px 14px rgba(0,80,35,.22);
        }
        .fb-favorites svg { color: var(--fb-gold); }
        .fb-count { width: 20px; height: 20px; border-radius: 999px; background: var(--fb-gold); color: #063013; display: inline-grid; place-items: center; font-size: 11px; }
        .fb-hero {
          min-height: 512px;
          color: #fff;
          background:
            linear-gradient(90deg, rgba(0,24,13,.95) 0%, rgba(0,45,19,.72) 34%, rgba(0,47,23,.28) 59%, rgba(0,0,0,.05) 100%),
            url("${HERO_IMAGE}") center / cover no-repeat;
        }
        .fb-hero .fb-shell { min-height: 512px; display: flex; align-items: center; }
        .fb-hero-content { width: min(560px, 55vw); padding: 42px 0 82px; }
        .fb-kicker {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 22px;
          color: var(--fb-gold);
          font-size: 13px;
          font-weight: 950;
          text-transform: uppercase;
        }
        .fb-kicker:before { content: ""; width: 48px; height: 2px; background: var(--fb-gold); display: block; }
        .fb-title {
          margin: 0 0 18px;
          font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
          font-size: clamp(56px, 6.5vw, 78px);
          line-height: .91;
          text-transform: uppercase;
          letter-spacing: 0;
        }
        .fb-title span { display: block; }
        .fb-title .gold { color: var(--fb-gold); }
        .fb-title .green { color: #06a85b; }
        .fb-subtitle { max-width: 470px; margin: 0 0 25px; color: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.45; font-weight: 700; }
        .fb-hero-points { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 26px; margin-bottom: 30px; }
        .fb-point { display: flex; align-items: center; gap: 11px; min-width: 0; }
        .fb-point-icon { width: 45px; height: 45px; border-radius: 999px; border: 2px solid var(--fb-gold); color: var(--fb-gold); background: rgba(0,98,43,.5); display: grid; place-items: center; flex: 0 0 auto; }
        .fb-point strong { display: block; font-size: 11px; font-weight: 950; text-transform: uppercase; }
        .fb-point span span { display: block; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.35; }
        .fb-actions { display: flex; flex-wrap: wrap; gap: 14px; }
        .fb-btn {
          min-height: 42px;
          border: 1px solid currentColor;
          border-radius: 5px;
          padding: 0 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #fff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          white-space: nowrap;
          text-align: center;
        }
        .fb-btn-green { color: #fff; background: var(--fb-green); border-color: var(--fb-green); }
        .fb-btn-outline { color: #fff; background: rgba(0,0,0,.08); border-color: rgba(255,255,255,.75); }
        .fb-btn-yellow { color: #051b0d; background: var(--fb-gold); border-color: var(--fb-gold); }
        .fb-search {
          width: min(100% - 74px, 1700px);
          margin: -60px auto 0;
          position: relative;
          z-index: 4;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 16px 38px rgba(9,29,19,.18);
          padding: 23px 26px 14px;
        }
        .fb-search-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) 180px; align-items: center; }
        .fb-filter { min-height: 58px; border-right: 1px solid var(--fb-line); padding: 0 22px 0 0; display: flex; align-items: center; gap: 16px; min-width: 0; }
        .fb-filter svg { color: #0c3520; flex: 0 0 auto; }
        .fb-filter-label { color: #163327; font-size: 10px; font-weight: 950; text-transform: uppercase; margin-bottom: 7px; }
        .fb-filter-main { color: #68736f; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
        .fb-search-button { height: 56px; border: 0; border-radius: 5px; background: var(--fb-green); color: #fff; display: inline-flex; align-items: center; justify-content: center; gap: 10px; font-size: 12px; font-weight: 950; text-transform: uppercase; }
        .fb-search-button svg { color: var(--fb-gold); }
        .fb-advanced { border-top: 1px solid var(--fb-line); margin-top: 16px; padding-top: 13px; text-align: center; color: #0e2d1c; font-size: 11px; font-weight: 950; text-transform: uppercase; }
        .fb-section { padding: 30px 0 24px; }
        .fb-section-head { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 21px; }
        .fb-heading { margin: 0; color: var(--fb-green-dark); font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif; font-size: 27px; line-height: 1; text-transform: uppercase; }
        .fb-heading:after { content: ""; width: 40px; height: 2px; background: var(--fb-gold); display: block; margin-top: 9px; }
        .fb-all-link { color: var(--fb-green-dark); display: inline-flex; align-items: center; gap: 12px; text-decoration: none; font-size: 11px; font-weight: 950; text-transform: uppercase; }
        .fb-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .fb-grid-group { margin-bottom: 18px; }
        .fb-grid-group:last-of-type { margin-bottom: 0; }
        .fb-card { background: #fff; border: 1px solid rgba(0,88,42,.1); border-radius: 6px; overflow: hidden; box-shadow: 0 10px 26px rgba(7,36,20,.08); }
        .fb-card-image { height: 132px; background-position: center; background-size: cover; position: relative; }
        .fb-sale { position: absolute; left: 13px; top: 12px; border-radius: 4px; background: var(--fb-green); color: #fff; padding: 7px 11px; font-size: 10px; font-weight: 950; text-transform: uppercase; }
        .fb-card-body { padding: 17px 15px 14px; }
        .fb-card h3 { margin: 0 0 8px; color: var(--fb-blue); font-size: 15px; line-height: 1.2; font-weight: 950; }
        .fb-location { color: #46645a; display: flex; align-items: center; gap: 6px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; margin-bottom: 16px; }
        .fb-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 17px; font-family: Arial, Helvetica, sans-serif; color: #1c3c2d; font-size: 12px; }
        .fb-spec { display: flex; align-items: center; gap: 7px; min-width: 0; }
        .fb-price { display: block; color: var(--fb-green); font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 950; margin-bottom: 17px; }
        .fb-card-link { width: 100%; border: 0; border-top: 1px solid #b8ded0; padding: 12px 0 0; color: var(--fb-green); background: transparent; display: flex; justify-content: space-between; align-items: center; text-decoration: none; font-size: 11px; font-weight: 950; text-transform: uppercase; cursor: pointer; }
        .fb-pagination {
          margin-top: 26px;
          border-top: 1px solid var(--fb-line);
          padding-top: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          font-family: Arial, Helvetica, sans-serif;
        }
        .fb-page-summary { color: #52635b; font-size: 12px; font-weight: 800; }
        .fb-page-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .fb-page-button {
          min-width: 36px;
          height: 36px;
          border: 1px solid #bed5cb;
          border-radius: 5px;
          background: #fff;
          color: var(--fb-green-dark);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          cursor: pointer;
        }
        .fb-page-button.active { background: var(--fb-green); border-color: var(--fb-green); color: #fff; }
        .fb-page-button:disabled { opacity: .45; cursor: not-allowed; }
        .fb-lead-modal {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(0, 20, 10, .72);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .fb-lead-dialog {
          width: min(100%, 560px);
          max-height: min(92vh, 760px);
          overflow: hidden;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 30px 80px rgba(0,0,0,.35);
          display: flex;
          flex-direction: column;
        }
        .fb-lead-head {
          padding: 20px 22px;
          color: #fff;
          background: linear-gradient(135deg, #00491f, #007b39);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }
        .fb-lead-head small { color: var(--fb-gold); display: block; margin-bottom: 6px; font-size: 11px; font-weight: 950; text-transform: uppercase; }
        .fb-lead-head h2 { margin: 0; font-size: 22px; line-height: 1.08; font-weight: 950; }
        .fb-lead-close {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(255,255,255,.35);
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          color: #fff;
          display: grid;
          place-items: center;
          cursor: pointer;
          flex: 0 0 auto;
        }
        .fb-lead-body { padding: 22px; overflow-y: auto; font-family: Arial, Helvetica, sans-serif; }
        .fb-lead-property {
          border: 1px solid #dce9e1;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 18px;
          display: grid;
          grid-template-columns: 88px 1fr;
          gap: 13px;
          align-items: center;
          background: #f7fbf8;
        }
        .fb-lead-thumb { height: 66px; border-radius: 6px; background-position: center; background-size: cover; }
        .fb-lead-property strong { display: block; color: var(--fb-blue); font-size: 14px; line-height: 1.2; }
        .fb-lead-property span { display: block; color: #52635b; font-size: 12px; margin-top: 4px; }
        .fb-lead-form { display: grid; gap: 12px; }
        .fb-field label { display: block; color: #294238; font-size: 11px; font-weight: 950; text-transform: uppercase; margin-bottom: 7px; }
        .fb-field input {
          width: 100%;
          min-height: 48px;
          border: 1px solid #cfe0d7;
          border-radius: 7px;
          background: #fff;
          padding: 0 14px;
          color: #102b1d;
          font-size: 16px;
          font-weight: 800;
          outline: 0;
        }
        .fb-field input:focus { border-color: var(--fb-green); box-shadow: 0 0 0 3px rgba(0,107,49,.12); }
        .fb-lead-primary {
          min-height: 50px;
          border: 0;
          border-radius: 7px;
          background: var(--fb-green);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 18px;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          cursor: pointer;
        }
        .fb-quiz-progress { color: #607168; font-size: 12px; font-weight: 900; margin-bottom: 9px; }
        .fb-quiz-question { margin: 0 0 16px; color: #082a18; font-size: 22px; line-height: 1.15; font-weight: 950; }
        .fb-quiz-options { display: grid; gap: 10px; }
        .fb-quiz-option {
          min-height: 50px;
          border: 1px solid #cfe0d7;
          border-radius: 8px;
          background: #fff;
          color: #123622;
          padding: 12px 14px;
          text-align: left;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }
        .fb-quiz-option:hover { border-color: var(--fb-green); background: #f3fbf6; }
        .fb-quiz-back {
          margin-top: 14px;
          border: 0;
          background: transparent;
          color: var(--fb-green-dark);
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          cursor: pointer;
        }
        .fb-lead-error { margin-top: 12px; color: #b42318; font-size: 12px; font-weight: 800; }
        .fb-success-box {
          padding: 20px;
          border-radius: 10px;
          background: #f0fbf4;
          color: #063f1d;
          text-align: center;
        }
        .fb-success-box h3 { margin: 12px 0 8px; font-size: 22px; font-weight: 950; }
        .fb-success-box p { margin: 0 0 18px; color: #315344; font-size: 14px; line-height: 1.5; }
        .fb-why {
          margin: 0 auto 0;
          background: #fff;
          border-radius: 7px;
          box-shadow: 0 10px 28px rgba(8,35,18,.08);
          padding: 26px 20px;
          display: grid;
          grid-template-columns: 1.05fr repeat(5, 1fr);
          align-items: center;
        }
        .fb-intro { padding: 0 15px; }
        .fb-intro h2 { margin: 0; color: var(--fb-blue); font-size: 18px; line-height: 1.16; font-weight: 950; text-transform: uppercase; }
        .fb-intro h2 span { color: var(--fb-green); display: block; }
        .fb-benefit { min-height: 108px; border-left: 1px solid #ccd8d2; padding: 0 20px; text-align: center; font-family: Arial, Helvetica, sans-serif; }
        .fb-benefit svg { color: var(--fb-green); margin-bottom: 12px; stroke-width: 1.8; }
        .fb-benefit h3 { margin: 0 0 8px; color: #092218; font-size: 11px; line-height: 1.2; font-weight: 950; text-transform: uppercase; }
        .fb-benefit p { margin: 0; color: #55635e; font-size: 10.5px; line-height: 1.45; }
        .fb-broker {
          margin: 24px auto 0;
          border: 1px solid rgba(0,107,49,.16);
          border-radius: 8px;
          background:
            linear-gradient(110deg, #fff 0%, #fff 48%, rgba(255,213,0,.12) 48%, rgba(255,213,0,.06) 100%),
            #fff;
          box-shadow: 0 14px 36px rgba(8,35,18,.08);
          overflow: hidden;
          display: grid;
          grid-template-columns: 260px 1fr auto;
          align-items: center;
          gap: 28px;
          padding: 22px 28px;
          font-family: Arial, Helvetica, sans-serif;
        }
        .fb-broker-photo-wrap { display: flex; align-items: center; gap: 18px; min-width: 0; }
        .fb-broker-photo {
          width: 112px;
          height: 112px;
          border-radius: 999px;
          border: 5px solid #fff;
          outline: 3px solid var(--fb-gold);
          object-fit: cover;
          object-position: 50% 18%;
          box-shadow: 0 12px 26px rgba(0,49,24,.18);
          background: #fff;
          flex: 0 0 auto;
        }
        .fb-broker-logo { width: 92px; height: 70px; object-fit: contain; filter: drop-shadow(0 6px 10px rgba(0,0,0,.12)); }
        .fb-broker small { display: block; color: var(--fb-green); font-size: 12px; font-weight: 950; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 7px; }
        .fb-broker h2 { margin: 0 0 8px; color: var(--fb-blue); font-size: clamp(22px, 2.2vw, 32px); line-height: 1; font-weight: 950; text-transform: uppercase; }
        .fb-broker p { margin: 0; max-width: 680px; color: #355447; font-size: 14px; line-height: 1.5; font-weight: 700; }
        .fb-broker-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 13px; }
        .fb-broker-meta span {
          min-height: 30px;
          border-radius: 999px;
          background: #f0f8f3;
          color: #0a3a21;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 950;
        }
        .fb-broker-action {
          min-height: 46px;
          border-radius: 6px;
          background: var(--fb-blue);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 18px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          white-space: nowrap;
          box-shadow: 0 10px 22px rgba(6,49,138,.18);
        }
        .fb-stats-strip {
          margin: 24px auto 0;
          width: min(100% - 74px, 1700px);
          border: 1px solid rgba(0,107,49,.18);
          border-top: 4px solid var(--fb-gold);
          border-radius: 8px;
          background:
            linear-gradient(135deg, rgba(255,213,0,.12), rgba(255,255,255,0) 42%),
            linear-gradient(180deg, #ffffff, #f3faf6);
          color: #06351f;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          overflow: hidden;
          box-shadow: 0 18px 45px rgba(6,49,26,.1);
        }
        .fb-stat { min-height: 82px; padding: 16px 24px; display: flex; align-items: center; gap: 17px; border-right: 1px solid #d9e7df; }
        .fb-stat:last-child { border-right: 0; }
        .fb-stat svg {
          color: #006b31;
          flex: 0 0 auto;
          padding: 7px;
          border-radius: 999px;
          background: var(--fb-gold);
          box-shadow: 0 8px 18px rgba(255,213,0,.28);
        }
        .fb-stat strong { display: block; color: var(--fb-blue); font-size: 16px; line-height: 1; text-transform: uppercase; }
        .fb-stat span { display: block; color: #214033; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.15; font-weight: 800; }
        .fb-footer {
          margin-top: 34px;
          padding-top: 42px;
          background:
            radial-gradient(circle at 14% 0%, rgba(255,213,0,.12), transparent 30%),
            linear-gradient(135deg, #002f18 0%, #004d24 55%, #06318a 140%);
          color: #fff;
          font-family: Arial, Helvetica, sans-serif;
        }
        .fb-footer .fb-shell { padding: 0 0 20px; display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: 48px; }
        .fb-footer-logo {
          width: 150px;
          margin-bottom: 12px;
          padding: 8px;
          border-radius: 10px;
          background: rgba(255,255,255,.96);
          box-shadow: 0 10px 24px rgba(0,0,0,.18);
        }
        .fb-footer p,
        .fb-footer a { color: rgba(255,255,255,.9); text-decoration: none; font-size: 12px; line-height: 1.5; }
        .fb-footer h3 { margin: 0 0 14px; color: #fff; font-size: 12px; font-weight: 950; text-transform: uppercase; }
        .fb-footer-links { display: grid; align-content: start; gap: 8px; }
        .fb-social { display: flex; gap: 12px; margin-top: 10px; }
        .fb-social span { width: 24px; height: 24px; border-radius: 999px; background: rgba(255,255,255,.16); display: grid; place-items: center; }
        .fb-contact-row { display: flex; align-items: flex-start; gap: 9px; margin-bottom: 10px; }
        .fb-footer-bottom { border-top: 1px solid rgba(255,255,255,.16); padding: 10px 0; color: rgba(255,255,255,.75); font-size: 11px; }
        .fb-footer-bottom .fb-shell { padding: 0; display: flex; justify-content: space-between; gap: 16px; }
        .fb-footer-bottom .heart { color: #ff3c3c; }
        @media (max-width: 1240px) {
          .fb-menu { gap: 20px; }
          .fb-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .fb-why { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 0; }
          .fb-intro { padding-bottom: 12px; }
          .fb-benefit:nth-child(2n) { border-left: 0; }
          .fb-stats-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .fb-broker { grid-template-columns: 1fr; align-items: start; }
          .fb-broker-action { width: fit-content; }
        }
        @media (max-width: 900px) {
          .fb-shell,
          .fb-search,
          .fb-stats-strip { width: min(100% - 28px, 760px); }
          .fb-topbar { display: none; }
          .fb-nav { height: 84px; position: sticky; top: 0; z-index: 30; box-shadow: 0 8px 22px rgba(0,0,0,.08); }
          .fb-nav .fb-shell { position: relative; padding: 0; gap: 10px; }
          .fb-logo { width: 138px; height: 92px; }
          .fb-menu-toggle { display: inline-flex; order: 3; margin-left: 0; flex: 0 0 auto; }
          .fb-menu {
            position: absolute;
            left: 0;
            right: 0;
            top: calc(100% + 8px);
            display: none;
            grid-template-columns: 1fr;
            gap: 0;
            overflow: hidden;
            border: 1px solid #dce8e1;
            border-radius: 10px;
            background: #fff;
            box-shadow: 0 22px 46px rgba(3,36,18,.18);
          }
          .fb-menu.is-open { display: grid; }
          .fb-menu a {
            min-height: 48px;
            justify-content: space-between;
            padding: 0 16px;
            border-bottom: 1px solid #edf3ef;
            font-size: 12px;
          }
          .fb-menu a:last-child { border-bottom: 0; }
          .fb-mobile-contact {
            display: inline-flex;
            min-height: 50px;
            align-items: center;
            justify-content: center !important;
            gap: 8px;
            margin: 8px;
            border-radius: 7px;
            background: var(--fb-green);
            color: #fff !important;
          }
          .fb-favorites { order: 2; margin-left: auto; }
          .fb-hero .fb-shell { min-height: auto; }
          .fb-hero-content { width: 100%; padding: 46px 0 92px; }
          .fb-search { margin-top: -58px; }
          .fb-search-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .fb-filter { border: 1px solid var(--fb-line); border-radius: 5px; padding: 10px 12px; }
          .fb-filter-main { min-width: 0; }
          .fb-search-button { grid-column: 1 / -1; }
          .fb-hero-points { grid-template-columns: 1fr; }
          .fb-footer .fb-shell { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .fb-broker { padding: 20px; gap: 18px; }
        }
        @media (max-width: 620px) {
          .fb-site { background: #f6faf7; }
          .fb-shell,
          .fb-search,
          .fb-stats-strip { width: calc(100% - 24px); }
          .fb-nav { height: 74px; }
          .fb-logo { width: 112px; height: 68px; }
          .fb-favorites { display: none; }
          .fb-menu-toggle { margin-left: auto; }
          .fb-hero {
            min-height: auto;
            background:
              linear-gradient(180deg, rgba(0,24,13,.95) 0%, rgba(0,45,19,.82) 52%, rgba(0,47,23,.42) 100%),
              url("${HERO_IMAGE}") 61% center / cover no-repeat;
          }
          .fb-hero-content { padding: 34px 0 96px; }
          .fb-kicker { margin-bottom: 16px; font-size: 11px; }
          .fb-kicker:before { width: 34px; }
          .fb-title { font-size: clamp(38px, 12vw, 46px); line-height: .94; }
          .fb-subtitle { font-size: 15px; }
          .fb-hero-points { gap: 12px; margin-bottom: 22px; }
          .fb-point { align-items: flex-start; }
          .fb-point-icon { width: 40px; height: 40px; }
          .fb-actions { gap: 10px; }
          .fb-actions .fb-btn,
          .fb-favorites,
          .fb-all-link { width: 100%; }
          .fb-btn { min-height: 48px; padding: 0 14px; white-space: normal; }
          .fb-search { margin-top: -52px; padding: 14px; border-radius: 10px; }
          .fb-filter { min-height: 54px; gap: 12px; }
          .fb-filter svg { width: 20px; height: 20px; }
          .fb-filter-main { font-size: 12px; overflow-wrap: anywhere; }
          .fb-heading { font-size: 24px; }
          .fb-section-head,
          .fb-pagination,
          .fb-footer-bottom .fb-shell { align-items: flex-start; flex-direction: column; }
          .fb-page-controls { justify-content: flex-start; }
          .fb-search-row,
          .fb-cards,
          .fb-why,
          .fb-broker,
          .fb-stats-strip,
          .fb-footer .fb-shell { grid-template-columns: 1fr; }
          .fb-broker-photo-wrap { justify-content: space-between; }
          .fb-broker-photo { width: 96px; height: 96px; }
          .fb-broker-logo { width: 82px; }
          .fb-broker-action { width: 100%; }
          .fb-benefit { border-left: 0; border-top: 1px solid #ccd8d2; padding-top: 22px; }
          .fb-stat { border-right: 0; border-bottom: 1px solid #d9e7df; }
          .fb-card-image { height: 175px; }
          .fb-card { border-radius: 10px; }
          .fb-card-body { padding: 18px 16px 16px; }
          .fb-card h3 { font-size: 17px; }
          .fb-specs { grid-template-columns: 1fr; gap: 9px; }
          .fb-card-link { min-height: 42px; }
          .fb-page-button { min-width: 42px; height: 42px; padding: 0 10px; }
          .fb-lead-modal { align-items: flex-end; padding: 0; }
          .fb-lead-dialog { width: 100%; max-height: 94vh; border-radius: 18px 18px 0 0; }
          .fb-lead-head { padding: 18px 16px; }
          .fb-lead-body { padding: 16px; }
          .fb-lead-property { grid-template-columns: 76px 1fr; }
          .fb-lead-thumb { height: 62px; }
          .fb-quiz-question { font-size: 19px; }
        }
        @media (max-width: 380px) {
          .fb-title { font-size: 36px; }
          .fb-page-controls { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .fb-page-button { width: 100%; padding: 0 6px; font-size: 10px; }
        }
      `}</style>

      <div className="fb-topbar">
        <div className="fb-shell">
          <div className="fb-topbar-group">
            <span className="fb-topbar-item"><Star size={14} />Especialistas em fazendas de alto padrao</span>
            <span className="fb-topbar-item"><Headphones size={14} />Atendimento personalizado</span>
            <span className="fb-topbar-item"><Lock size={14} />Sigilo absoluto</span>
            <span className="fb-topbar-item"><Handshake size={14} />Experiencia e tradicao</span>
          </div>
          <div className="fb-top-actions">
            <a className="fb-top-action" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
              <MessageCircle size={15} />{PHONE_LABEL}
            </a>
            <a className="fb-top-action yellow" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
              <MessageCircle size={14} />Fale conosco
            </a>
          </div>
        </div>
      </div>

      <nav className="fb-nav" id="inicio">
        <div className="fb-shell">
          <a href="#inicio" aria-label="Fazendas Brasil">
            <img className="fb-logo" src={LOGO_URL} alt="Fazendas Brasil" />
          </a>
          <button
            className="fb-menu-toggle"
            type="button"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="fazendas-mobile-menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={23} /> : <Menu size={24} />}
          </button>
          <div
            className={`fb-menu ${mobileMenuOpen ? 'is-open' : ''}`}
            id="fazendas-mobile-menu"
            aria-label="Menu principal"
          >
            <a href="#fazendas" onClick={() => setMobileMenuOpen(false)}>Fazendas a venda <ChevronDown size={13} /></a>
            <a href="#quem-somos" onClick={() => setMobileMenuOpen(false)}>Quem somos</a>
            <a href="#servicos" onClick={() => setMobileMenuOpen(false)}>Servicos <ChevronDown size={13} /></a>
            <a href="#localizacoes" onClick={() => setMobileMenuOpen(false)}>Localizacoes <ChevronDown size={13} /></a>
            <a href="#noticias" onClick={() => setMobileMenuOpen(false)}>Noticias</a>
            <a href="#contato" onClick={() => setMobileMenuOpen(false)}>Contato</a>
            <a className="fb-mobile-contact" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" onClick={() => setMobileMenuOpen(false)}>
              <MessageCircle size={16} />Fale conosco
            </a>
          </div>
          <a className="fb-favorites" href="#fazendas">
            <Heart size={17} />
            Favoritos
            <span className="fb-count">0</span>
          </a>
        </div>
      </nav>

      <header className="fb-hero">
        <div className="fb-shell">
          <div className="fb-hero-content">
            <p className="fb-kicker">Excelencia em negocios rurais</p>
            <h1 className="fb-title">
              <span>As melhores</span>
              <span className="gold">fazendas</span>
              <span>do Brasil</span>
              <span className="green">estao aqui!</span>
            </h1>
            <p className="fb-subtitle">
              Conectamos compradores exigentes as melhores oportunidades. Fazendas selecionadas com rigor e total seguranca.
            </p>
            <div className="fb-hero-points">
              <div className="fb-point">
                <span className="fb-point-icon"><ShieldCheck size={23} /></span>
                <span><strong>Seguranca</strong><span>Negocios com total seguranca juridica</span></span>
              </div>
              <div className="fb-point">
                <span className="fb-point-icon"><Gem size={23} /></span>
                <span><strong>Exclusividade</strong><span>Imoveis rurais de alto padrao selecionados</span></span>
              </div>
              <div className="fb-point">
                <span className="fb-point-icon"><UsersRound size={23} /></span>
                <span><strong>Atendimento</strong><span>Consultores especialistas ao seu lado</span></span>
              </div>
            </div>
            <div className="fb-actions">
              <a className="fb-btn fb-btn-green" href="#fazendas">
                Ver fazendas a venda <ArrowRight size={18} />
              </a>
              <a className="fb-btn fb-btn-outline" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                Falar com especialista <MessageCircle size={17} />
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="fb-search" aria-label="Busca de fazendas">
        <div className="fb-search-row">
          <div className="fb-filter">
            <MapPin size={24} />
            <div>
              <div className="fb-filter-label">Localizacao</div>
              <div className="fb-filter-main">Selecione o estado <ChevronDown size={14} /></div>
            </div>
          </div>
          <div className="fb-filter">
            <SlidersHorizontal size={24} />
            <div>
              <div className="fb-filter-label">Area total</div>
              <div className="fb-filter-main">Selecione a area <ChevronDown size={14} /></div>
            </div>
          </div>
          <div className="fb-filter">
            <Leaf size={24} />
            <div>
              <div className="fb-filter-label">Atividade principal</div>
              <div className="fb-filter-main">Selecione a atividade <ChevronDown size={14} /></div>
            </div>
          </div>
          <div className="fb-filter">
            <CircleDollarSign size={24} />
            <div>
              <div className="fb-filter-label">Valor</div>
              <div className="fb-filter-main">Selecione o valor <ChevronDown size={14} /></div>
            </div>
          </div>
          <button className="fb-search-button" type="button">Buscar fazendas <Search size={17} /></button>
        </div>
        <div className="fb-advanced"><Search size={14} /> Busca avancada <ChevronDown size={14} /></div>
      </section>

      <main className="fb-shell">
        <section className="fb-section" id="fazendas">
          <div className="fb-section-head">
            <h2 className="fb-heading">Imoveis em destaque</h2>
            <a className="fb-all-link" href="#fazendas">Ver todos os imoveis <ArrowRight size={17} /></a>
          </div>

          {propertyGrids.map((grid, gridIndex) => (
            <div className="fb-grid-group" key={`grid-${gridIndex + 1}`}>
              <div className="fb-cards">
                {grid.map((property, index) => {
                  const absoluteIndex = gridIndex * PROPERTIES_PER_GRID + index;
                  const area = getPropertyArea(property);
                  return (
                    <article className="fb-card" key={property.id}>
                      <div className="fb-card-image" style={{ backgroundImage: `url("${getPropertyImage(property, absoluteIndex)}")` }}>
                        <span className="fb-sale">{highlights[absoluteIndex % highlights.length]}</span>
                      </div>
                      <div className="fb-card-body">
                        <h3>{property.title}</h3>
                        <div className="fb-location"><MapPin size={12} />{property.city || property.state || 'Brasil'}</div>
                        <div className="fb-specs">
                          <span className="fb-spec"><BadgeCheck size={14} />{formatArea(area)}</span>
                          <span className="fb-spec"><Heart size={14} />{getAptitude(property)}</span>
                        </div>
                        <strong className="fb-price">{formatCurrency(property.price)}</strong>
                        <button className="fb-card-link" type="button" onClick={() => openLeadFlow(property)}>
                          Ver detalhes <ArrowRight size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="fb-pagination" aria-label="Paginacao de imoveis">
            <div className="fb-page-summary">
              Mostrando {firstPropertyIndex} a {lastPropertyIndex} de {totalProperties} imoveis
            </div>
            <div className="fb-page-controls">
              <button
                className="fb-page-button"
                type="button"
                disabled={currentPage === 1 || isUsingFallback}
                onClick={() => goToPage(currentPage - 1)}
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  className={`fb-page-button ${page === currentPage ? 'active' : ''}`}
                  type="button"
                  key={page}
                  disabled={isUsingFallback}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="fb-page-button"
                type="button"
                disabled={currentPage === totalPages || isUsingFallback}
                onClick={() => goToPage(currentPage + 1)}
              >
                Proxima
              </button>
            </div>
          </div>
        </section>

        <section className="fb-why" id="quem-somos">
          <div className="fb-intro">
            <h2>Por que escolher a <span>Fazendas Brasil?</span></h2>
          </div>
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div className="fb-benefit" key={benefit.title}>
                <Icon size={35} />
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </div>
            );
          })}
        </section>

        <section className="fb-broker" aria-label="Especialista responsavel">
          <div className="fb-broker-photo-wrap">
            <img className="fb-broker-photo" src={BROKER_IMAGE} alt={BROKER_NAME} />
            <img className="fb-broker-logo" src={LOGO_URL} alt="Fazendas Brasil" />
          </div>
          <div>
            <small>Especialista responsavel</small>
            <h2>{BROKER_NAME}</h2>
            <p>
              Atendimento consultivo para compradores e investidores que buscam fazendas, areas rurais e oportunidades selecionadas em todo o Brasil.
            </p>
            <div className="fb-broker-meta">
              <span><BadgeCheck size={14} />CRECI 16644F</span>
              <span><Phone size={14} />{PHONE_LABEL}</span>
            </div>
          </div>
          <a className="fb-broker-action" href="#fazendas">
            Ver imoveis <ArrowRight size={17} />
          </a>
        </section>
      </main>

      <section className="fb-stats-strip" id="servicos">
        {footerStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div className="fb-stat" key={stat.value}>
              <Icon size={38} />
              <span><strong>{stat.value}</strong>{stat.label}</span>
            </div>
          );
        })}
      </section>

      <footer className="fb-footer" id="localizacoes">
        <div className="fb-shell">
          <div>
            <img className="fb-footer-logo" src={LOGO_URL} alt="Fazendas Brasil" />
            <p>Conectamos compradores exigentes as melhores fazendas do Brasil, com seguranca, sigilo e excelencia em cada negociacao.</p>
            <div className="fb-social">
              <span><Facebook size={14} /></span>
              <span><Instagram size={14} /></span>
              <span><MessageCircle size={14} /></span>
              <span><Mail size={14} /></span>
            </div>
          </div>
          <div className="fb-footer-links">
            <h3>Navegacao</h3>
            <a href="#fazendas">Fazendas a venda</a>
            <a href="#quem-somos">Quem somos</a>
            <a href="#servicos">Servicos</a>
            <a href="#localizacoes">Localizacoes</a>
            <a href="#noticias">Noticias</a>
            <a href="#contato">Contato</a>
          </div>
          <div className="fb-footer-links">
            <h3>Servicos</h3>
            <a href="#contato">Avaliacao de imoveis</a>
            <a href="#contato">Consultoria rural</a>
            <a href="#contato">Intermediacao de negocios</a>
            <a href="#contato">Regularizacao fundiaria</a>
            <a href="#contato">Laudos e vistorias</a>
          </div>
          <div className="fb-footer-links" id="noticias">
            <h3>Informacoes</h3>
            <a href="#contato">Perguntas frequentes</a>
            <a href="#contato">Politica de privacidade</a>
            <a href="#contato">Termos de uso</a>
            <a href="#contato">Trabalhe conosco</a>
          </div>
          <div id="contato">
            <h3>Contato</h3>
            <div className="fb-contact-row"><Phone size={14} /> <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">{PHONE_LABEL}</a></div>
            <div className="fb-contact-row"><Mail size={14} /> <a href={`mailto:${EMAIL}`}>{EMAIL}</a></div>
            <div className="fb-contact-row"><MapPin size={14} /> <p>Rua Deputado Branco Mendes, 390<br />Centro - Colorado/PR</p></div>
          </div>
        </div>
        <div className="fb-footer-bottom">
          <div className="fb-shell">
            <span>© 2024 Fazendas Brasil. Todos os direitos reservados.</span>
            <span>Desenvolvido com amor por Agencia Rural</span>
          </div>
        </div>
      </footer>

      {selectedProperty && (
        <div className="fb-lead-modal" role="dialog" aria-modal="true" aria-label="Cadastro de interesse">
          <div className="fb-lead-dialog">
            <div className="fb-lead-head">
              <div>
                <small>Atendimento especializado</small>
                <h2>{leadStep === 'success' ? 'Lead qualificado' : 'Receba informacoes deste imovel'}</h2>
              </div>
              <button className="fb-lead-close" type="button" onClick={closeLeadFlow} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="fb-lead-body">
              <div className="fb-lead-property">
                <div
                  className="fb-lead-thumb"
                  style={{ backgroundImage: `url("${getPropertyImage(selectedProperty, 0)}")` }}
                />
                <div>
                  <strong>{selectedProperty.title}</strong>
                  <span>
                    {[selectedProperty.city, selectedProperty.state].filter(Boolean).join(' / ') || 'Fazendas Brasil'} - {formatCurrency(selectedProperty.price)}
                  </span>
                </div>
              </div>

              {leadStep === 'contact' && (
                <form className="fb-lead-form" onSubmit={handleContactSubmit}>
                  <div className="fb-field">
                    <label>Nome completo</label>
                    <input
                      required
                      value={leadForm.name}
                      onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="fb-field">
                    <label>Telefone / WhatsApp</label>
                    <input
                      required
                      type="tel"
                      value={leadForm.phone}
                      onChange={(event) => setLeadForm({ ...leadForm, phone: event.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="fb-field">
                    <label>Email opcional</label>
                    <input
                      type="email"
                      value={leadForm.email}
                      onChange={(event) => setLeadForm({ ...leadForm, email: event.target.value })}
                      placeholder="voce@email.com"
                    />
                  </div>
                  <button className="fb-lead-primary" type="submit">
                    Continuar qualificacao <ArrowRight size={17} />
                  </button>
                  {leadError && <div className="fb-lead-error">{leadError}</div>}
                </form>
              )}

              {leadStep === 'quiz' && (
                <div>
                  <div className="fb-quiz-progress">
                    Pergunta {quizIndex + 1} de {quizQuestions.length}
                  </div>
                  <h3 className="fb-quiz-question">{quizQuestions[quizIndex].label}</h3>
                  <div className="fb-quiz-options">
                    {quizQuestions[quizIndex].options.map((option) => (
                      <button
                        className="fb-quiz-option"
                        type="button"
                        key={option}
                        disabled={leadSubmitting}
                        onClick={() => handleQuizAnswer(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <button
                    className="fb-quiz-back"
                    type="button"
                    disabled={leadSubmitting}
                    onClick={() => {
                      if (quizIndex === 0) {
                        setLeadStep('contact');
                        return;
                      }
                      setQuizIndex((current) => current - 1);
                    }}
                  >
                    Voltar
                  </button>
                  {leadSubmitting && <div className="fb-quiz-progress">Salvando lead qualificado no Kanban...</div>}
                  {leadError && <div className="fb-lead-error">{leadError}</div>}
                </div>
              )}

              {leadStep === 'success' && (
                <div className="fb-success-box">
                  <ShieldCheck size={42} />
                  <h3>Cadastro enviado com sucesso</h3>
                  <p>
                    Seu perfil foi qualificado e um card foi criado no Kanban da equipe Fazendas Brasil para atendimento consultivo.
                  </p>
                  <button className="fb-lead-primary" type="button" onClick={closeLeadFlow}>
                    Concluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FazendasBrasilPublicSite;
