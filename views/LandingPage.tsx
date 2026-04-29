import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Maximize,
  ChevronRight,
  Home,
  Globe,
  Phone,
  Info,
  Mail,
  Instagram,
  Facebook,
  MessageCircle,
  Clock,
  Menu,
  X,
  CheckCircle2,
  DollarSign,
  Terminal,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  Bed,
  Bath,
  Youtube,
  Share2,
  Image as ImageIcon,
} from 'lucide-react';
import { MOCK_PROPERTIES } from '../constants';
import { Link, useNavigate } from 'react-router-dom';
import {
  Property,
  PropertyType,
  PropertyPurpose,
  PropertyAptitude,
} from '../types';
import { useSettings } from '../context/SettingsContext';
import { useTexts } from '../context/TextsContext';
import { propertyService } from '../services/properties';
import { leadService } from '../services/leads';
import { uploadFile } from '../services/storage';
import SiteHeader from '../components/SiteHeader';
import ContactForm from '../components/ContactForm';
import InlineEditable from '../components/InlineEditable';
import ImageEditable from '../components/ImageEditable';
import VisualEditorToolbar from '../components/VisualEditorToolbar';

// Helper to determine text color based on background luminance
const getContrastColor = (hexcolor: string | undefined) => {
  if (!hexcolor) return 'white';
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? 'black' : 'white';
};

const DotGrid: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={`absolute pointer-events-none opacity-[0.15] ${className}`}
    style={{
      backgroundImage:
        'radial-gradient(circle, currentColor 1px, transparent 1px)',
      backgroundSize: '32px 32px',
    }}
  ></div>
);

interface LandingPageProps {
  organizationId?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ organizationId }) => {
  // Rural Property Search Filters
  const [propertyType, setPropertyType] = useState<string>('');
  const [city, setCity] = useState('');
  const [minHectares, setMinHectares] = useState('');
  const [maxHectares, setMaxHectares] = useState('');
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { t } = useTexts();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Lead Capture State
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    subject: 'Interesse Geral',
  });
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Property Submission State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmittingProperty, setIsSubmittingProperty] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [propertyForm, setPropertyForm] = useState<Partial<Property>>({
    title: '',
    price: 0,
    type: PropertyType.FAZENDA,
    location: { city: '', neighborhood: '', state: '', address: '' },
    features: {
      areaHectares: 0,
      areaAlqueires: 0,
      casaSede: false,
      caseiros: 0,
      galpoes: 0,
      currais: false,
      tipoSolo: 'Misto',
      usoAtual: [],
      temGado: false,
      fontesAgua: [],
      percentualMata: 0,
    },
    images: [],
    ownerInfo: { name: '', email: '', phone: '' },
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleSubmitProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProperty(true);
    try {
      await propertyService.submit({
        ...propertyForm,
        organization_id: organizationId,
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setIsSubmitModalOpen(false);
        setSubmitSuccess(false);
        setPropertyForm({
          title: '',
          price: 0,
          type: PropertyType.FAZENDA,
          location: { city: '', neighborhood: '', state: '', address: '' },
          features: {
            areaHectares: 0,
            areaAlqueires: 0,
            casaSede: false,
            caseiros: 0,
            galpoes: 0,
            currais: false,
            tipoSolo: 'Misto',
            usoAtual: [],
            temGado: false,
            fontesAgua: [],
            percentualMata: 0,
          },
          images: [],
          ownerInfo: { name: '', email: '', phone: '' },
        });
      }, 4000);
    } catch (error) {
      console.error('Erro ao submeter imóvel', error);
      alert(
        t(
          'submit_modal.error_alert',
          'Houve um erro ao enviar seu imóvel. Por favor, tente novamente.'
        )
      );
    } finally {
      setIsSubmittingProperty(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadingImage(true);
      try {
        const uploadPromises = Array.from(files).map((file) =>
          uploadFile(file as File, 'property-images')
        );
        const urls = await Promise.all(uploadPromises);
        const validUrls = urls.filter((url): url is string => url !== null);
        setPropertyForm((prev) => ({
          ...prev,
          images: [...(prev.images || []), ...validUrls],
        }));
      } catch (error) {
        console.error('Erro no upload', error);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLead(true);
    try {
      await leadService.create({
        name: leadForm.name,
        phone: leadForm.phone,
        email: leadForm.email,
        source: `Site - ${leadForm.subject}`,
        organization_id: organizationId,
      } as any);
      setLeadSuccess(true);
      setLeadForm({
        name: '',
        phone: '',
        email: '',
        subject: t('lead_modal.default_subject', 'Interesse Geral'),
      });
      setTimeout(() => {
        setIsLeadModalOpen(false);
        setLeadSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Erro ao enviar lead', error);
      alert(
        t(
          'lead_modal.error_alert',
          'Houve um erro ao enviar seus dados. Por favor, tente novamente.'
        )
      );
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  React.useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        // Fetch all properties (no slicing), filtered by org if present
        const data = await propertyService.list(organizationId);
        setProperties(data);
      } catch (error) {
        console.error('Erro ao carregar imóveis da home', error);
      } finally {
        setLoading(false);
      }
    };
    loadProperties();
  }, [organizationId]);

  // Apply filters
  React.useEffect(() => {
    let filtered = properties;

    if (propertyType) {
      filtered = filtered.filter((p) => p.type === propertyType);
    }

    if (city) {
      filtered = filtered.filter((p) =>
        p.location?.city?.toLowerCase().includes(city.toLowerCase())
      );
    }

    if (minHectares) {
      filtered = filtered.filter(
        (p) => (p.features?.areaHectares || 0) >= parseFloat(minHectares)
      );
    }

    if (maxHectares) {
      filtered = filtered.filter(
        (p) => (p.features?.areaHectares || 0) <= parseFloat(maxHectares)
      );
    }

    setFilteredProperties(filtered);
  }, [properties, propertyType, city, minHectares, maxHectares]);

  // Pagination Logic
  const displayProperties =
    filteredProperties.length > 0 ? filteredProperties : properties;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProperties = displayProperties.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(displayProperties.length / itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div
      className="min-h-screen bg-white relative overflow-hidden"
      style={{ fontFamily: '"Poppins", sans-serif', fontSize: '16px' }}
    >
      {/* Decorative Background Elements */}
      <DotGrid className="top-0 left-0 w-1/3 h-[1000px] text-black" />
      <DotGrid className="top-[800px] right-0 w-1/4 h-[1200px] text-black" />
      <div
        className="absolute top-[1200px] -left-20 w-96 h-96 rounded-full blur-[120px] opacity-[0.15] pointer-events-none"
        style={{ backgroundColor: settings.primaryColor }}
      ></div>
      <div
        className="absolute top-[2500px] -right-20 w-96 h-96 rounded-full blur-[120px] opacity-[0.15] pointer-events-none"
        style={{ backgroundColor: settings.primaryColor }}
      ></div>

      {/* Side Decorative Text */}
      <div className="fixed left-6 bottom-32 origin-bottom-left -rotate-90 pointer-events-none hidden xl:block">
        <span
          className="text-[11px] font-black uppercase tracking-[1.2em] opacity-60 whitespace-nowrap"
          style={{ color: settings.secondaryColor }}
        >
          {t('decorative.text1', 'Exclusividade & Tradição')}
        </span>
      </div>
      <div className="fixed right-6 top-1/2 -translate-y-1/2 origin-top-right rotate-90 pointer-events-none hidden xl:block">
        <span
          className="text-[11px] font-black uppercase tracking-[1.2em] opacity-60 whitespace-nowrap"
          style={{ color: settings.secondaryColor }}
        >
          {t('decorative.text2', 'Luxury Urban Living')}
        </span>
      </div>
      <SiteHeader />
      <VisualEditorToolbar />

      {/* Hero Section - Rural Property Focus */}
      <section className="relative h-[700px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80"
            alt="Hero Rural Property"
            className="w-full h-full object-cover brightness-[0.6]"
          />
          {/* Green/Nature Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-black/60"></div>
          <div className="absolute inset-0 bg-[#0f172a]/30 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 max-w-7xl w-full px-6 flex flex-col items-center">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-2xl">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase text-white/90 tracking-[0.3em] font-sans">
                <InlineEditable textKey="hero.badge">
                  {t('hero.badge', 'Terras Produtivas & Investimento Rural')}
                </InlineEditable>
              </span>
            </div>
            <h1
              className="font-black text-white mb-6 leading-[0.85] uppercase italic tracking-tighter"
              style={{
                fontSize: 'clamp(60px, 9vw, 110px)',
                textShadow: '0 10px 30px rgba(0,0,0,0.5)',
                fontFamily: 'Playfair Display, serif',
              }}
            >
              <div className="block" style={{ transform: 'skewX(-5deg)' }}>
                <InlineEditable textKey="hero.title_line1">
                  {t('hero.title_line1', 'TERRA')}
                </InlineEditable>
              </div>
              <div
                className="block text-transparent bg-clip-text bg-gradient-to-b from-green-200 to-green-500"
                style={{ transform: 'skewX(-5deg)' }}
              >
                <InlineEditable textKey="hero.title_line2">
                  {t('hero.title_line2', 'PRODUTIVA')}
                </InlineEditable>
              </div>
            </h1>
            <div className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed italic drop-shadow-md font-serif">
              <InlineEditable textKey="hero.subtitle">
                {t(
                  'hero.subtitle',
                  'Fazendas, sítios e propriedades rurais de alto valor. Seu investimento no agronegócio começa aqui.'
                )}
              </InlineEditable>
            </div>
          </div>

          {/* Full-Width Search Panel */}
          <div className="w-full max-w-[1600px]">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10">
              {/* Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Filter 1: Property Type */}
                <div className="relative">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">
                    <InlineEditable textKey="hero.search.type_label">
                      {t('hero.search.type_label', 'Tipo')}
                    </InlineEditable>
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium outline-none focus:border-green-500 focus:bg-white transition-all"
                  >
                    <option value="">
                      {t('hero.search.type_all', 'Todos')}
                    </option>
                    <option value="Fazenda">
                      {t('hero.search.type_farm', 'Fazenda')}
                    </option>
                    <option value="Sítio">
                      {t('hero.search.type_ranch', 'Sítio')}
                    </option>
                    <option value="Chácara">
                      {t('hero.search.type_smallfarm', 'Chácara')}
                    </option>
                  </select>
                </div>

                {/* Filter 2: City */}
                <div className="relative">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">
                    <InlineEditable textKey="hero.search.city_label">
                      {t('hero.search.city_label', 'Cidade')}
                    </InlineEditable>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t(
                      'hero.search.city_placeholder',
                      'Ex: São Paulo'
                    )}
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium outline-none focus:border-green-500 focus:bg-white transition-all placeholder:text-slate-300"
                  />
                </div>

                {/* Filter 3: Min Hectares */}
                <div className="relative">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">
                    <InlineEditable textKey="hero.search.min_area_label">
                      {t('hero.search.min_area_label', 'Área Mín (ha)')}
                    </InlineEditable>
                  </label>
                  <input
                    type="number"
                    value={minHectares}
                    onChange={(e) => setMinHectares(e.target.value)}
                    placeholder="0"
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium outline-none focus:border-green-500 focus:bg-white transition-all placeholder:text-slate-300"
                  />
                </div>

                {/* Filter 4: Max Hectares */}
                <div className="relative">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">
                    <InlineEditable textKey="hero.search.max_area_label">
                      {t('hero.search.max_area_label', 'Área Máx (ha)')}
                    </InlineEditable>
                  </label>
                  <input
                    type="number"
                    value={maxHectares}
                    onChange={(e) => setMaxHectares(e.target.value)}
                    placeholder="1000+"
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium outline-none focus:border-green-500 focus:bg-white transition-all placeholder:text-slate-300"
                  />
                </div>

                {/* Search Button */}
                <div className="relative flex items-end">
                  <button
                    onClick={() => {
                      document
                        .getElementById('properties-section')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full p-4 rounded-xl text-white font-black uppercase text-xs tracking-wider hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <Search size={18} />
                    <InlineEditable textKey="hero.search.button">
                      {t('hero.search.button', 'Buscar')}
                    </InlineEditable>
                  </button>
                </div>
              </div>

              {/* Results Counter */}
              {(propertyType || city || minHectares || maxHectares) && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-sm text-slate-600 font-medium text-center">
                    <span
                      className="font-black"
                      style={{ color: settings.primaryColor }}
                    >
                      {filteredProperties.length}
                    </span>{' '}
                    {t(
                      'hero.search.results_found',
                      'propriedade(s) encontrada(s)'
                    )}
                    {(propertyType || city || minHectares || maxHectares) && (
                      <button
                        onClick={() => {
                          setPropertyType('');
                          setCity('');
                          setMinHectares('');
                          setMaxHectares('');
                        }}
                        className="ml-4 text-xs font-bold underline hover:no-underline"
                        style={{ color: settings.primaryColor }}
                      >
                        {t('hero.search.clear_filters', 'Limpar filtros')}
                      </button>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Minimalist & High Impact */}
      <section className="py-20 border-b border-slate-100 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center relative z-10">
          <div className="group">
            <h3
              className="text-5xl md:text-6xl font-medium text-slate-900 mb-2 tracking-tight transition-all duration-700 group-hover:-translate-y-2"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              <InlineEditable textKey="stats.transactions">
                {t('stats.transactions', '+1.5k')}
              </InlineEditable>
            </h3>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-amber-600 transition-colors">
              <InlineEditable textKey="stats.transactions_label">
                {t('stats.transactions_label', 'Transações Realizadas')}
              </InlineEditable>
            </p>
          </div>

          <div className="hidden md:block absolute right-1/3 top-1/2 -translate-y-1/2 w-px h-16 bg-slate-200"></div>
          <div className="hidden md:block absolute left-1/3 top-1/2 -translate-y-1/2 w-px h-16 bg-slate-200"></div>

          <div className="group">
            <h3
              className="text-5xl md:text-6xl font-medium text-slate-900 mb-2 tracking-tight transition-all duration-700 group-hover:-translate-y-2"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              <InlineEditable textKey="stats.volume">
                {t('stats.volume', '2Bi')}
              </InlineEditable>
            </h3>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-amber-600 transition-colors">
              <InlineEditable textKey="stats.volume_label">
                {t('stats.volume_label', 'Volume Geral de Vendas')}
              </InlineEditable>
            </p>
          </div>

          <div className="group">
            <h3
              className="text-5xl md:text-6xl font-medium text-slate-900 mb-2 tracking-tight transition-all duration-700 group-hover:-translate-y-2"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              <InlineEditable textKey="stats.years">
                {t('stats.years', '15')}
              </InlineEditable>
            </h3>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-amber-600 transition-colors">
              <InlineEditable textKey="stats.years_label">
                {t('stats.years_label', 'Anos de Excelência')}
              </InlineEditable>
            </p>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section
        id="propriedades"
        className="relative max-w-[1600px] mx-auto px-4 md:px-6 py-16 md:py-32"
      >
        {/* Floating Decorative Badge */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full shadow-2xl border border-slate-50 flex flex-col items-center justify-center p-6 text-center rotate-12 group hover:rotate-0 transition-transform hidden xl:flex">
          <div
            className="w-12 h-12 rounded-full mb-2 flex items-center justify-center"
            style={{ backgroundColor: settings.primaryColor }}
          >
            <Home className="text-white" size={24} />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest leading-none">
            {settings.homeContent?.badgeText ||
              t('decorative.badge_text', 'Curadoria Especializada 2024')}
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8">
          <div className="max-w-4xl w-full">
            <div className="flex gap-4 mb-6">
              <div className="px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-slate-900 border border-slate-900 text-white whitespace-nowrap">
                <InlineEditable textKey="featured.badge">
                  {t('featured.badge', 'Venda Exclusiva de Fazendas e Sítios')}
                </InlineEditable>
              </div>
            </div>
            <span
              className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 block"
              style={{ color: settings.primaryColor }}
            >
              <InlineEditable textKey="featured.category">
                {t('featured.category', 'Oportunidades de Ouro')}
              </InlineEditable>
            </span>
            <h2
              className="font-black mb-8 uppercase italic leading-tight"
              style={{
                color: settings.secondaryColor,
                fontSize: `${(settings.headingFontSize || 48) * 0.8}px`,
              }}
            >
              <InlineEditable textKey="featured.title">
                {settings.homeContent?.featuredTitle ||
                  t('featured.title', 'Propriedades Premium')}
              </InlineEditable>
            </h2>
            <div
              className="w-32 h-3 mb-8 rounded-full"
              style={{ backgroundColor: settings.primaryColor }}
            ></div>
            <div className="text-black/60 text-xl font-medium leading-relaxed italic">
              <InlineEditable textKey="featured.description">
                "
                {settings.homeContent?.featuredDescription ||
                  t(
                    'featured.description',
                    'Nossa curadoria foca em produtividade, localização estratégica e potencial de valorização exponencial.'
                  )}
                "
              </InlineEditable>
            </div>
          </div>
          {/* Pagination Controls Top */}
          <div className="flex gap-4">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {loading ? (
            <div className="col-span-3 text-center py-20">
              <div
                className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                style={{ borderColor: settings.primaryColor }}
              ></div>
              <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                <InlineEditable textKey="properties.loading">
                  {t('properties.loading', 'Buscando Propriedades...')}
                </InlineEditable>
              </span>
            </div>
          ) : properties.length === 0 ? (
            <div className="col-span-3 text-center py-20 text-black/60 bg-slate-50 rounded-3xl border border-dashed">
              <InlineEditable textKey="properties.empty">
                {t('properties.empty', 'Nenhum imóvel encontrado.')}
              </InlineEditable>
            </div>
          ) : (
            currentProperties.map((property) => (
              <div
                key={property.id}
                onClick={() => navigate(`/property/${property.id}`)}
                className="group bg-white rounded-[4rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] transition-all duration-500 border-0 flex flex-col h-full cursor-pointer relative hover:-translate-y-3"
              >
                {/* Floating Header */}
                <div className="absolute top-6 left-0 right-0 z-20 px-6 flex justify-between items-start pointer-events-none">
                  <div className="bg-white/90 backdrop-blur-md px-5 py-2 rounded-full shadow-lg">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                      {property.location.neighborhood || property.location.city}
                    </span>
                  </div>
                  {property.type === PropertyType.FAZENDA && (
                    <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg">
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        <InlineEditable textKey="property_type.farm_badge">
                          {t('property_type.farm_badge', 'Fazenda')}
                        </InlineEditable>
                      </span>
                    </div>
                  )}
                </div>

                {/* Image Section - Taller & Sleeker */}
                <div className="relative h-[450px] overflow-hidden w-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-50 transition-colors">
                  {property.images?.[0] ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.dataset.hasError) return;
                        target.dataset.hasError = 'true';

                        if (settings.logoUrl && target.src !== settings.logoUrl) {
                          target.src = settings.logoUrl;
                          target.classList.add(
                            'object-contain',
                            'p-12',
                            'opacity-50'
                          );
                          target.classList.remove('object-cover');
                        } else {
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }
                      }}
                    />
                  ) : (
                    /* Fallback for No Image Initial State */
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 p-12">
                      {settings.logoUrl ? (
                        <img
                          src={settings.logoUrl}
                          alt="Logo"
                          className="max-w-[150px] md:max-w-[200px] object-contain opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-4 opacity-20">
                          <Home size={64} />
                          <span className="text-xs font-black uppercase tracking-widest">
                            <InlineEditable textKey="properties.no_photo">
                              {t('properties.no_photo', 'Sem Foto')}
                            </InlineEditable>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gradient only if there is an image acting as cover */}
                  {property.images?.[0] && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                  )}

                  {/* Content Overlay */}
                  <div
                    className={`absolute bottom-8 left-8 right-8 text-white z-10 ${!property.images?.[0] ? 'text-slate-900' : ''}`}
                  >
                    <h3
                      className={`text-2xl font-light italic leading-tight mb-2 ${!property.images?.[0] ? 'text-slate-900' : 'text-white'}`}
                      style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                      {property.title}
                    </h3>
                    <div
                      className={`h-px w-10 mb-4 group-hover:w-full transition-all duration-700 ${!property.images?.[0] ? 'bg-slate-300' : 'bg-white/40'}`}
                    ></div>

                    {/* Features in Image */}
                    <div
                      className={`flex items-center gap-6 ${!property.images?.[0] ? 'text-slate-500' : 'text-white/90'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Maximize size={16} strokeWidth={1.5} />
                        <span className="text-xs font-medium">
                          {property.features.areaHectares} ha
                        </span>
                      </div>
                      {property.features.casaSede && (
                        <div className="flex items-center gap-2">
                          <Home size={16} strokeWidth={1.5} />
                          <span className="text-xs font-medium">
                            <InlineEditable textKey="property_feature.main_house">
                              {t('property_feature.main_house', 'Casa Sede')}
                            </InlineEditable>
                          </span>
                        </div>
                      )}
                      {property.features.temGado && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">
                            🐄{' '}
                            <InlineEditable textKey="property_feature.cattle">
                              {t('property_feature.cattle', 'Gado')}
                            </InlineEditable>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Minimal Info */}
                <div className="p-8 bg-white flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">
                      {t('properties.price_label', 'Valor de Venda')}
                    </p>
                    <p
                      className="text-2xl font-medium tracking-tight text-slate-900"
                      style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                      {property.price > 0
                        ? property.price.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })
                        : t('properties.price_on_request', 'Sob Consulta')}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors duration-300 shadow-sm">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Info Bottom */}
        {!loading && totalPages > 1 && (
          <div className="mt-16 flex flex-col items-center justify-center gap-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {t('pagination.page', 'Página')} {currentPage}{' '}
              {t('pagination.of', 'de')} {totalPages}
            </span>
            <div className="flex gap-4">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className="px-8 py-3 rounded-2xl bg-slate-50 text-slate-900 font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all disabled:opacity-30"
              >
                Anterior
              </button>
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className="px-8 py-3 rounded-2xl bg-slate-50 text-slate-900 font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all disabled:opacity-30"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Service Blocks Section - Professional Rural Focus */}
      <section className="py-32 px-4 md:px-6 bg-white">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <h2
              className="text-5xl md:text-7xl font-black uppercase mb-6"
              style={{ color: settings.primaryColor }}
            >
              <InlineEditable textKey="services.title">
                {t('services.title', 'Nossos Serviços')}
              </InlineEditable>
            </h2>
            <div
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{ color: settings.secondaryColor }}
            >
              <InlineEditable textKey="services.subtitle">
                {t('services.subtitle', 'Especialistas em Propriedades Rurais')}
              </InlineEditable>
            </div>
            <div className="text-slate-600 text-lg max-w-3xl mx-auto leading-relaxed">
              <InlineEditable textKey="services.description">
                {t(
                  'services.description',
                  'Conectamos investidores a fazendas e sítios de alto potencial produtivo. Experiência comprovada no mercado de terras rurais do Brasil.'
                )}
              </InlineEditable>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Service 1: Compra */}
            <div className="group bg-slate-50 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500">
              <div className="relative h-64 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80"
                  alt="Compra de Fazendas"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-6 left-6">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase">
                    <InlineEditable textKey="services.buy.title">
                      {t('services.buy.title', 'Compra')}
                    </InlineEditable>
                  </h3>
                </div>
              </div>
              <div className="p-8">
                <h4 className="text-2xl font-bold mb-4 text-slate-900">
                  <InlineEditable textKey="services.buy.subtitle">
                    {t(
                      'services.buy.subtitle',
                      'Aquisição de Fazendas e Sítios'
                    )}
                  </InlineEditable>
                </h4>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>
                      <InlineEditable textKey="services.buy.feature1">
                        {t(
                          'services.buy.feature1',
                          'Análise técnica de solo e recursos hídricos'
                        )}
                      </InlineEditable>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>
                      <InlineEditable textKey="services.buy.feature2">
                        {t(
                          'services.buy.feature2',
                          'Avaliação de potencial produtivo e rentabilidade'
                        )}
                      </InlineEditable>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>
                      <InlineEditable textKey="services.buy.feature3">
                        {t(
                          'services.buy.feature3',
                          'Due diligence completa e segurança jurídica'
                        )}
                      </InlineEditable>
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Service 2: Venda */}
            <div className="group bg-slate-50 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500">
              <div className="relative h-64 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=800&q=80"
                  alt="Venda de Propriedades Rurais"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-6 left-6">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase">
                    <InlineEditable textKey="services.sell.title">
                      {t('services.sell.title', 'Venda')}
                    </InlineEditable>
                  </h3>
                </div>
              </div>
              <div className="p-8">
                <h4 className="text-2xl font-bold mb-4 text-slate-900">
                  <InlineEditable textKey="services.sell.subtitle">
                    {t('services.sell.subtitle', 'Comercialização Estratégica')}
                  </InlineEditable>
                </h4>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>
                      <InlineEditable textKey="services.sell.feature1">
                        {t(
                          'services.sell.feature1',
                          'Marketing direcionado a investidores qualificados'
                        )}
                      </InlineEditable>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>
                      <InlineEditable textKey="services.sell.feature2">
                        {t(
                          'services.sell.feature2',
                          'Precificação baseada em análise de mercado'
                        )}
                      </InlineEditable>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>
                      <InlineEditable textKey="services.sell.feature3">
                        {t(
                          'services.sell.feature3',
                          'Negociação profissional e confidencial'
                        )}
                      </InlineEditable>
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Service 3: Consultoria */}
            <div className="group bg-slate-50 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500">
              <div className="relative h-64 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80"
                  alt="Consultoria Rural"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-6 left-6">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase">
                    <InlineEditable textKey="services.consulting.title">
                      {t('services.consulting.title', 'Consultoria')}
                    </InlineEditable>
                  </h3>
                </div>
              </div>
              <div className="p-8">
                <h4 className="text-2xl font-bold mb-4 text-slate-900">
                  <InlineEditable textKey="services.consulting.subtitle">
                    {t(
                      'services.consulting.subtitle',
                      'Assessoria Especializada'
                    )}
                  </InlineEditable>
                </h4>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>
                      <InlineEditable textKey="services.consulting.feature1">
                        {t(
                          'services.consulting.feature1',
                          'Regularização fundiária e ambiental'
                        )}
                      </InlineEditable>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>
                      <InlineEditable textKey="services.consulting.feature2">
                        {t(
                          'services.consulting.feature2',
                          'Planejamento de uso e viabilidade econômica'
                        )}
                      </InlineEditable>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>
                      <InlineEditable textKey="services.consulting.feature3">
                        {t(
                          'services.consulting.feature3',
                          'Suporte em financiamento e crédito rural'
                        )}
                      </InlineEditable>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section - Modern Expert Layout */}
      <section className="py-24 px-4 md:px-6 bg-white">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            {/* Left: Photo with decorative elements */}
            <div className="relative">
              <div className="relative w-full max-w-md mx-auto">
                {/* Decorative background shape */}
                <div
                  className="absolute inset-0 rounded-3xl transform rotate-6 opacity-10"
                  style={{ backgroundColor: settings.primaryColor }}
                ></div>

                {/* Main photo container */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                  <ImageEditable textKey="about.broker_photo">
                    <img
                      src={
                        settings.homeContent?.broker?.photoUrl ||
                        'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80'
                      }
                      alt="Especialista em Propriedades Rurais"
                      className="w-full h-auto"
                    />
                  </ImageEditable>

                  {/* Badge overlay */}
                  <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: settings.primaryColor }}
                      >
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                          <InlineEditable textKey="about.creci_badge">
                            {t('about.creci_badge', 'Especialista Certificado')}
                          </InlineEditable>
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          <InlineEditable textKey="about.creci_info">
                            {t('about.creci_info', 'CRECI Ativo • 20+ Anos')}
                          </InlineEditable>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats cards */}
                <div className="absolute -right-8 top-1/4 hidden lg:block">
                  <div className="bg-white rounded-2xl shadow-xl p-6 w-32">
                    <p
                      className="text-3xl font-black mb-1"
                      style={{ color: settings.primaryColor }}
                    >
                      <InlineEditable textKey="about.stat_properties">
                        {t('about.stat_properties', '500+')}
                      </InlineEditable>
                    </p>
                    <p className="text-xs font-bold text-slate-600">
                      <InlineEditable textKey="about.stat_properties_label">
                        {t(
                          'about.stat_properties_label',
                          'Propriedades Vendidas'
                        )}
                      </InlineEditable>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div>
              <span
                className="text-xs font-black uppercase tracking-[0.3em] mb-4 block"
                style={{ color: settings.primaryColor }}
              >
                <InlineEditable textKey="about.badge">
                  {t('about.badge', 'Especialista')}
                </InlineEditable>
              </span>

              <h2
                className="text-4xl md:text-5xl font-black uppercase leading-tight mb-6"
                style={{ color: settings.secondaryColor }}
              >
                <InlineEditable textKey="about.title">
                  {t('about.title', 'Mais de 20 Anos no Mercado Rural')}
                </InlineEditable>
              </h2>

              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                <InlineEditable textKey="about.description">
                  {t(
                    'about.description',
                    'Conectamos investidores e produtores rurais às melhores oportunidades em fazendas e sítios produtivos. Nossa experiência no agronegócio brasileiro garante segurança e rentabilidade em cada transação.'
                  )}
                </InlineEditable>
              </p>

              {/* Features list */}
              <div className="space-y-4 mb-10">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">
                      <InlineEditable textKey="about.feature1_title">
                        {t('about.feature1_title', 'Análise Técnica Completa')}
                      </InlineEditable>
                    </h4>
                    <p className="text-sm text-slate-600">
                      <InlineEditable textKey="about.feature1_desc">
                        {t(
                          'about.feature1_desc',
                          'Avaliação de solo, recursos hídricos e potencial produtivo'
                        )}
                      </InlineEditable>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">
                      <InlineEditable textKey="about.feature2_title">
                        {t('about.feature2_title', 'Regularização Completa')}
                      </InlineEditable>
                    </h4>
                    <p className="text-sm text-slate-600">
                      <InlineEditable textKey="about.feature2_desc">
                        {t(
                          'about.feature2_desc',
                          'Documentação fundiária e licenciamento ambiental'
                        )}
                      </InlineEditable>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">
                      <InlineEditable textKey="about.feature3_title">
                        {t('about.feature3_title', 'Suporte Financeiro')}
                      </InlineEditable>
                    </h4>
                    <p className="text-sm text-slate-600">
                      <InlineEditable textKey="about.feature3_desc">
                        {t(
                          'about.feature3_desc',
                          'Assessoria em crédito rural e financiamento'
                        )}
                      </InlineEditable>
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() =>
                    window.open(
                      `https://wa.me/${settings.contactPhone?.replace(/\D/g, '')}`,
                      '_blank'
                    )
                  }
                  className="px-8 py-4 text-white text-sm font-black uppercase tracking-wider hover:opacity-90 transition-all rounded-xl shadow-lg flex items-center justify-center gap-2"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <InlineEditable textKey="about.cta_specialist">
                    {t('about.cta_specialist', 'Falar com Especialista')}
                  </InlineEditable>
                </button>

                <button
                  onClick={() => navigate('/properties')}
                  className="px-8 py-4 border-2 text-sm font-black uppercase tracking-wider hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all rounded-xl"
                  style={{
                    borderColor: settings.secondaryColor,
                    color: settings.secondaryColor,
                  }}
                >
                  <InlineEditable textKey="about.cta_properties">
                    {t('about.cta_properties', 'Ver Propriedades')}
                  </InlineEditable>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp Bridge */}
      <div className="fixed bottom-10 right-10 z-[100] group flex items-center gap-4">
        <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-slate-100 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0 pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-widest text-black">
            <InlineEditable textKey="floating.whatsapp_badge">
              {t('floating.whatsapp_badge', 'Fale com um corretor agora')}
            </InlineEditable>
          </span>
        </div>
        <button
          onClick={() =>
            window.open(
              `https://wa.me/${settings.contactPhone?.replace(/\D/g, '')}`,
              '_blank'
            )
          }
          className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-500 text-white flex items-center justify-center shadow-[0_20px_50px_rgba(34,197,94,0.4)] hover:scale-110 active:scale-95 transition-all animate-bounce"
        >
          <MessageCircle
            size={30}
            className="md:w-[36px] md:h-[36px]"
            fill="white"
          />
        </button>
      </div>

      {/* Contact Form Section */}
      <ContactForm />

      {/* Footer - High End Minimalist - CONVERSAR Style */}
      <footer className="bg-[#1a1a1a] text-white pt-24 pb-12 border-t border-white/5 font-sans">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="md:col-span-1">
            <h2
              className="text-3xl font-black mb-8 tracking-tight text-white"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <InlineEditable textKey="footer.logo_text">
                {t('footer.logo_text', 'CONVERSAR')}
              </InlineEditable>
              <span className="text-green-600">.</span>
            </h2>
            <p className="text-white/70 text-sm leading-relaxed mb-8">
              <InlineEditable textKey="footer.description">
                {t(
                  'footer.description',
                  'Nossa equipe de especialistas está pronta para ajudá-lo a encontrar a propriedade rural perfeita. Entre em contato e descubra as melhores oportunidades do mercado.'
                )}
              </InlineEditable>
            </p>
            <div className="flex gap-4">
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all group">
                <Instagram
                  size={16}
                  className="opacity-60 group-hover:opacity-100"
                />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all group">
                <Youtube
                  size={16}
                  className="opacity-60 group-hover:opacity-100"
                />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all group">
                <Mail
                  size={16}
                  className="opacity-60 group-hover:opacity-100"
                />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-8 text-white">
              <InlineEditable textKey="footer.nav_title">
                {t('footer.nav_title', 'Navegação')}
              </InlineEditable>
            </h4>
            <ul className="space-y-4 text-base font-bold text-white tracking-widest uppercase">
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 group">
                <span className="w-0 group-hover:w-2 h-px bg-green-600 transition-all"></span>
                <InlineEditable textKey="footer.properties_title">
                  {t('footer.properties_title', 'Propriedades')}
                </InlineEditable>
              </li>
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 group">
                <span className="w-0 group-hover:w-2 h-px bg-green-600 transition-all"></span>
                <InlineEditable textKey="footer.services_title">
                  {t('footer.services_title', 'Serviços')}
                </InlineEditable>
              </li>
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 group">
                <span className="w-0 group-hover:w-2 h-px bg-amber-600 transition-all"></span>
                <InlineEditable textKey="footer.about_title">
                  {t('footer.about_title', 'Sobre')}
                </InlineEditable>
              </li>
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 group">
                <span className="w-0 group-hover:w-2 h-px bg-amber-600 transition-all"></span>
                <InlineEditable textKey="footer.contact_title">
                  {t('footer.contact_title', 'Contato')}
                </InlineEditable>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-8 text-white">
              {t('footer.contact_title', 'Contato')}
            </h4>
            <ul className="space-y-4 text-sm text-white/70">
              <li>
                <div className="font-bold text-white/40 uppercase tracking-wider text-xs mb-1">
                  <InlineEditable textKey="header.contact_whatsapp_label">
                    {t('header.contact_whatsapp_label', 'WhatsApp')}
                  </InlineEditable>
                </div>
                <div className="text-white font-bold">
                  <InlineEditable textKey="contact.phone_value">
                    {t(
                      'contact.phone_value',
                      settings.contactPhone || '(44) 99843-3030'
                    )}
                  </InlineEditable>
                </div>
              </li>
              <li>
                <div className="font-bold text-white/40 uppercase tracking-wider text-xs mb-1">
                  <InlineEditable textKey="header.contact_email_label">
                    {t('header.contact_email_label', 'Email')}
                  </InlineEditable>
                </div>
                <div className="text-white font-bold">
                  <InlineEditable textKey="contact.email_value">
                    {t(
                      'contact.email_value',
                      settings.contactEmail || 'contato@imobiliaria.com'
                    )}
                  </InlineEditable>
                </div>
              </li>
              <li className="pt-2">
                <div className="font-bold text-white/40 uppercase tracking-wider text-xs">
                  <InlineEditable textKey="footer.creci">
                    {t('footer.creci', 'CRECI 4222J PJ')}
                  </InlineEditable>
                </div>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-8 text-white">
              <InlineEditable textKey="footer.newsletter_title">
                {t('footer.newsletter_title', 'Exclusive Updates')}
              </InlineEditable>
            </h4>
            <p className="text-white text-sm mb-6">
              <InlineEditable textKey="footer.newsletter_desc">
                {t(
                  'footer.newsletter_desc',
                  'Receba nossa curadoria mensal de oportunidades off-market.'
                )}
              </InlineEditable>
            </p>
            <div className="flex border-b border-white/10 pb-2 group focus-within:border-white">
              <input
                type="email"
                placeholder={t(
                  'footer.newsletter_placeholder',
                  'E-mail corporativo'
                )}
                className="bg-transparent outline-none text-white placeholder:text-white/20 w-full text-sm py-2"
              />
              <button className="text-sm font-black uppercase tracking-widest text-white hover:text-green-500 transition-colors">
                <InlineEditable textKey="footer.newsletter_button">
                  {t('footer.newsletter_button', 'Assinar')}
                </InlineEditable>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-sm uppercase tracking-[0.2em] text-white gap-4 px-6 md:px-0">
          <p>
            <InlineEditable textKey="footer.copyright">
              {t('footer.copyright', '© 2024 CONVERSAR - Propriedades Rurais.')}
            </InlineEditable>
          </p>
          <div className="flex gap-8">
            <Link to="/admin" className="hover:text-white/40 transition-colors">
              <InlineEditable textKey="footer.admin_access">
                {t('footer.admin_access', 'Admin Access')}
              </InlineEditable>
            </Link>
            <span>
              <InlineEditable textKey="footer.creci">
                {t('footer.creci', 'CRECI 4222J PJ')}
              </InlineEditable>
            </span>
          </div>
        </div>
      </footer>

      {/* Lead Capture Modal */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={() => setIsLeadModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setIsLeadModalOpen(false)}
              className="absolute top-8 right-8 w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-black transition-colors"
            >
              <X size={24} />
            </button>
            <div className="p-12 md:p-16">
              <div className="mb-10 text-center">
                <span
                  className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 block"
                  style={{ color: settings.primaryColor }}
                >
                  <InlineEditable textKey="lead_modal.badge">
                    {t('lead_modal.badge', 'Atendimento Select')}
                  </InlineEditable>
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-black uppercase italic tracking-tighter leading-none mb-4">
                  <InlineEditable textKey="lead_modal.title_line1">
                    {t('lead_modal.title_line1', 'Como podemos')}
                  </InlineEditable>{' '}
                  <br />
                  <span style={{ color: settings.primaryColor }}>
                    <InlineEditable textKey="lead_modal.title_line2">
                      {t('lead_modal.title_line2', 'Ajudar você?')}
                    </InlineEditable>
                  </span>
                </h2>
                <p className="text-black/60 font-medium italic">
                  <InlineEditable textKey="lead_modal.subtitle">
                    {t(
                      'lead_modal.subtitle',
                      'Preencha os dados abaixo e um consultor entrará em contato em instantes.'
                    )}
                  </InlineEditable>
                </p>
              </div>

              {leadSuccess ? (
                <div className="text-center py-10 animate-bounce">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} className="text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-black text-black uppercase italic">
                    Mensagem Enviada!
                  </h3>
                  <p className="text-black/60">Obrigado pela confiança.</p>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">
                      <InlineEditable textKey="lead_modal.form_name_label">
                        {t('lead_modal.form_name_label', 'Seu Nome Completo')}
                      </InlineEditable>
                    </p>
                    <input
                      required
                      type="text"
                      className="w-full px-8 py-5 rounded-full bg-slate-50 border border-slate-100 focus:border-slate-300 focus:bg-white transition-all outline-none font-bold text-slate-700"
                      placeholder={t(
                        'lead_modal.form_name_placeholder',
                        'Ex: João da Silva'
                      )}
                      value={leadForm.name}
                      onChange={(e) =>
                        setLeadForm({ ...leadForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">
                        <InlineEditable textKey="lead_modal.form_phone_label">
                          {t('lead_modal.form_phone_label', 'WhatsApp')}
                        </InlineEditable>
                      </p>
                      <input
                        required
                        type="tel"
                        className="w-full px-8 py-5 rounded-full bg-slate-50 border border-slate-100 focus:border-slate-300 focus:bg-white transition-all outline-none font-bold text-slate-700"
                        placeholder={t(
                          'lead_modal.form_phone_placeholder',
                          '(00) 00000-0000'
                        )}
                        value={leadForm.phone}
                        onChange={(e) =>
                          setLeadForm({ ...leadForm, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">
                        <InlineEditable textKey="lead_modal.form_email_label">
                          {t(
                            'lead_modal.form_email_label',
                            'E-mail (Opcional)'
                          )}
                        </InlineEditable>
                      </p>
                      <input
                        type="email"
                        className="w-full px-8 py-5 rounded-full bg-slate-50 border border-slate-100 focus:border-slate-300 focus:bg-white transition-all outline-none font-bold text-slate-700"
                        placeholder={t(
                          'lead_modal.form_email_placeholder',
                          'contato@email.com'
                        )}
                        value={leadForm.email}
                        onChange={(e) =>
                          setLeadForm({ ...leadForm, email: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="pt-4">
                    <button
                      disabled={isSubmittingLead}
                      type="submit"
                      className="w-full py-6 rounded-full font-black uppercase text-xs tracking-[0.3em] text-white transition-all shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      {isSubmittingLead
                        ? t('lead_modal.submitting', 'Enviando...')
                        : t(
                            'lead_modal.submit_button',
                            'Solicitar Atendimento Exclusivo'
                          )}
                    </button>
                  </div>
                </form>
              )}
            </div>
            <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {t(
                  'lead_modal.privacy_notice',
                  'Sua privacidade é nossa prioridade absoluta.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* LUXURY Property Submission Modal - RE-DESIGNED */}
      {isSubmitModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 backdrop-blur-md animate-in fade-in duration-500"
          style={{ backgroundColor: settings.secondaryColor + 'cc' }}
        >
          <div className="bg-white w-full max-w-6xl h-full max-h-[850px] rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            {/* Sidebar - Progressive Tracker */}
            <div
              className="w-full md:w-80 p-10 flex flex-col justify-between relative overflow-hidden shrink-0"
              style={{ backgroundColor: settings.secondaryColor }}
            >
              {/* Background Glow */}
              <div
                className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 0% 0%, ${settings.primaryColor}, transparent 70%)`,
                }}
              ></div>

              <div className="relative z-10">
                <div className="mb-12">
                  <h2 className="text-white text-2xl font-black italic tracking-tighter uppercase leading-tight">
                    <InlineEditable textKey="submit_modal.sidebar_title_line1">
                      {t('submit_modal.sidebar_title_line1', 'Venda seu')}
                    </InlineEditable>{' '}
                    <br />
                    <span style={{ color: settings.primaryColor }}>
                      <InlineEditable textKey="submit_modal.sidebar_title_line2">
                        {t('submit_modal.sidebar_title_line2', 'Imóvel Elite')}
                      </InlineEditable>
                    </span>
                  </h2>
                  <p className="text-lg font-medium tracking-tight opacity-70">
                    <InlineEditable textKey="submit_modal.sidebar_subtitle">
                      {t('submit_modal.sidebar_subtitle', 'Curadoria de Luxo')}
                    </InlineEditable>
                  </p>
                </div>

                <div className="space-y-10">
                  {[
                    {
                      step: 1,
                      label: t('submit_modal.step1_label', 'Proprietário'),
                      icon: Info,
                    },
                    {
                      step: 2,
                      label: t('submit_modal.step2_label', 'O Imóvel'),
                      icon: Home,
                    },
                    {
                      step: 3,
                      label: t('submit_modal.step3_label', 'Localização'),
                      icon: MapPin,
                    },
                    {
                      step: 4,
                      label: t('submit_modal.step4_label', 'Mídias'),
                      icon: ImageIcon,
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="flex items-center gap-5 group cursor-default"
                    >
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          activeStep === item.step
                            ? 'bg-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                            : activeStep > item.step
                              ? 'text-white'
                              : 'bg-white/5 text-white/30'
                        }`}
                        style={{
                          backgroundColor:
                            activeStep > item.step
                              ? settings.primaryColor
                              : undefined,
                          color:
                            activeStep === item.step
                              ? settings.secondaryColor
                              : undefined,
                        }}
                      >
                        {activeStep > item.step ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <item.icon size={18} />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest transition-colors ${activeStep === item.step ? 'text-white' : 'text-white/20'}`}
                        >
                          Passo 0{item.step}
                        </span>
                        <span
                          className={`text-sm font-bold transition-colors ${activeStep === item.step ? 'text-white' : 'text-white/40'}`}
                        >
                          {item.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-12 pt-10 border-t border-white/10 hidden md:block">
                <p className="text-[10px] text-white/30 font-medium leading-relaxed uppercase tracking-tighter">
                  <InlineEditable textKey="submit_modal.disclaimer">
                    {t(
                      'submit_modal.disclaimer',
                      'Ao submeter, você concorda que nossa equipe fará uma análise técnica detalhada antes da publicação final.'
                    )}
                  </InlineEditable>
                </p>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full bg-slate-50/30">
              {/* Top Bar */}
              <div className="p-8 md:p-10 flex items-center justify-end">
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 hover:text-red-500 rounded-full shadow-lg transition-all hover:rotate-90"
                >
                  <X size={20} />
                </button>
              </div>

              {submitSuccess ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="relative mb-10 group">
                    <div
                      className="absolute inset-0 blur-3xl rounded-full opacity-20 group-hover:blur-[60px] transition-all duration-1000"
                      style={{ backgroundColor: settings.primaryColor }}
                    ></div>
                    <div
                      className="w-28 h-28 text-white rounded-[2rem] flex items-center justify-center relative z-10 shadow-2xl animate-in zoom-in duration-500 rotate-3 group-hover:rotate-0 transition-transform"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      <CheckCircle2 size={48} strokeWidth={3} />
                    </div>
                  </div>
                  <h3
                    className="text-4xl font-black italic uppercase tracking-tighter mb-4"
                    style={{ color: settings.secondaryColor }}
                  >
                    <InlineEditable textKey="submit_modal.success_title">
                      {t('submit_modal.success_title', 'Proposta Recebida!')}
                    </InlineEditable>
                  </h3>
                  <p className="text-black/60 max-w-sm mx-auto leading-relaxed font-medium">
                    <InlineEditable textKey="submit_modal.success_desc">
                      {t(
                        'submit_modal.success_desc',
                        'Excelente escolha. Nossa equipe de elite já foi notificada e entrará em contato em breve para os próximos passos.'
                      )}
                    </InlineEditable>
                  </p>
                  <button
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="mt-12 px-12 py-5 text-white rounded-full font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all"
                    style={{ backgroundColor: settings.secondaryColor }}
                  >
                    <InlineEditable textKey="submit_modal.success_button">
                      {t('submit_modal.success_button', 'Voltar para Home')}
                    </InlineEditable>
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-8 md:px-20 pb-10 custom-scrollbar flex flex-col">
                  {/* Steps Content */}
                  <div className="flex-1">
                    {activeStep === 1 && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                        <div>
                          <h3
                            className="text-3xl font-black italic uppercase tracking-tighter mb-2"
                            style={{ color: settings.secondaryColor }}
                          >
                            <InlineEditable textKey="submit_modal.step1_title">
                              {t(
                                'submit_modal.step1_title',
                                'Quem é o proprietário?'
                              )}
                            </InlineEditable>
                          </h3>
                          <p className="text-black/60 font-medium">
                            <InlineEditable textKey="submit_modal.step1_subtitle">
                              {t(
                                'submit_modal.step1_subtitle',
                                'Inicie com as informações básicas de contato.'
                              )}
                            </InlineEditable>
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-8">
                          <div className="group">
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-1 transition-colors group-focus-within:text-black">
                              <InlineEditable textKey="submit_modal.field_name_label">
                                {t(
                                  'submit_modal.field_name_label',
                                  'Nome Completo'
                                )}
                              </InlineEditable>
                            </label>
                            <input
                              required
                              type="text"
                              value={propertyForm.ownerInfo?.name}
                              onChange={(e) =>
                                setPropertyForm({
                                  ...propertyForm,
                                  ownerInfo: {
                                    ...propertyForm.ownerInfo!,
                                    name: e.target.value,
                                  },
                                })
                              }
                              className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                              style={
                                {
                                  '--tw-ring-color':
                                    settings.primaryColor + '15',
                                  borderColor: 'var(--focus-border-color)',
                                } as any
                              }
                              onFocus={(e) =>
                                (e.target.style.borderColor =
                                  settings.primaryColor)
                              }
                              onBlur={(e) => (e.target.style.borderColor = '')}
                              placeholder={t(
                                'submit_modal.field_name_placeholder',
                                'Ex: Rodrigo Albuquerque'
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="group">
                              <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                                <InlineEditable textKey="submit_modal.field_email_label">
                                  {t(
                                    'submit_modal.field_email_label',
                                    'E-mail Corporativo'
                                  )}
                                </InlineEditable>
                              </label>
                              <input
                                required
                                type="email"
                                value={propertyForm.ownerInfo?.email}
                                onChange={(e) =>
                                  setPropertyForm({
                                    ...propertyForm,
                                    ownerInfo: {
                                      ...propertyForm.ownerInfo!,
                                      email: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                                onFocus={(e) =>
                                  (e.target.style.borderColor =
                                    settings.primaryColor)
                                }
                                onBlur={(e) =>
                                  (e.target.style.borderColor = '')
                                }
                                placeholder={t(
                                  'submit_modal.field_email_placeholder',
                                  'rodrigo@email.com'
                                )}
                              />
                            </div>
                            <div className="group">
                              <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                                <InlineEditable textKey="submit_modal.field_phone_label">
                                  {t(
                                    'submit_modal.field_phone_label',
                                    'WhatsApp Direto'
                                  )}
                                </InlineEditable>
                              </label>
                              <input
                                required
                                type="tel"
                                value={propertyForm.ownerInfo?.phone}
                                onChange={(e) =>
                                  setPropertyForm({
                                    ...propertyForm,
                                    ownerInfo: {
                                      ...propertyForm.ownerInfo!,
                                      phone: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                                onFocus={(e) =>
                                  (e.target.style.borderColor =
                                    settings.primaryColor)
                                }
                                onBlur={(e) =>
                                  (e.target.style.borderColor = '')
                                }
                                placeholder={t(
                                  'submit_modal.field_phone_placeholder',
                                  '(00) 00000-0000'
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeStep === 2 && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                        <div>
                          <h3
                            className="text-3xl font-black italic uppercase tracking-tighter mb-2"
                            style={{ color: settings.secondaryColor }}
                          >
                            <InlineEditable textKey="submit_modal.step2_title">
                              {t(
                                'submit_modal.step2_title',
                                'Detalhes do Imóvel'
                              )}
                            </InlineEditable>
                          </h3>
                          <p className="text-black/60 font-medium">
                            <InlineEditable textKey="submit_modal.step2_subtitle">
                              {t(
                                'submit_modal.step2_subtitle',
                                'O que torna sua propriedade única?'
                              )}
                            </InlineEditable>
                          </p>
                        </div>
                        <div className="space-y-8">
                          <div className="group">
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                              <InlineEditable textKey="submit_modal.field_title_impact">
                                {t(
                                  'submit_modal.field_title_impact',
                                  'Título de Impacto'
                                )}
                              </InlineEditable>
                            </label>
                            <input
                              required
                              type="text"
                              value={propertyForm.title}
                              onChange={(e) =>
                                setPropertyForm({
                                  ...propertyForm,
                                  title: e.target.value,
                                })
                              }
                              className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                              onFocus={(e) =>
                                (e.target.style.borderColor =
                                  settings.primaryColor)
                              }
                              onBlur={(e) => (e.target.style.borderColor = '')}
                              placeholder={t(
                                'submit_modal.field_title_placeholder',
                                'Ex: Mansão suspensa com vista definitiva para o mar'
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="group">
                              <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                                <InlineEditable textKey="submit_modal.field_type_label">
                                  {t(
                                    'submit_modal.field_type_label',
                                    'Tipo de Imóvel'
                                  )}
                                </InlineEditable>
                              </label>
                              <div className="relative">
                                <select
                                  className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none appearance-none cursor-pointer shadow-sm transition-all"
                                  value={propertyForm.type}
                                  onChange={(e) =>
                                    setPropertyForm({
                                      ...propertyForm,
                                      type: e.target.value as any,
                                    })
                                  }
                                  onFocus={(e) =>
                                    (e.target.style.borderColor =
                                      settings.primaryColor)
                                  }
                                  onBlur={(e) =>
                                    (e.target.style.borderColor = '')
                                  }
                                >
                                  <option value="Apartamento">
                                    {t(
                                      'property_type.apt',
                                      'Apartamento de Alto Padrão'
                                    )}
                                  </option>
                                  <option value="Casa">
                                    {t(
                                      'property_type.house',
                                      'Casa / Villa de Luxo'
                                    )}
                                  </option>
                                  <option value="Terreno">
                                    {t(
                                      'property_type.farm',
                                      'Fazenda / Haras / Rural'
                                    )}
                                  </option>
                                  <option value="Comercial">
                                    {t(
                                      'property_type.com',
                                      'Corporativo / Industrial'
                                    )}
                                  </option>
                                </select>
                                <ChevronRight
                                  className="absolute right-8 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none"
                                  size={16}
                                />
                              </div>
                            </div>
                            <div className="group">
                              <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                                <InlineEditable textKey="submit_modal.field_price_label">
                                  {t(
                                    'submit_modal.field_price_label',
                                    'Preço Sugerido (R$)'
                                  )}
                                </InlineEditable>
                              </label>
                              <input
                                type="number"
                                value={propertyForm.price}
                                onChange={(e) =>
                                  setPropertyForm({
                                    ...propertyForm,
                                    price: Number(e.target.value),
                                  })
                                }
                                className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-black outline-none transition-all shadow-sm"
                                style={{ color: settings.primaryColor }}
                                onFocus={(e) =>
                                  (e.target.style.borderColor =
                                    settings.primaryColor)
                                }
                                onBlur={(e) =>
                                  (e.target.style.borderColor = '')
                                }
                              />
                            </div>
                          </div>
                          <div className="group w-1/2">
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                              <InlineEditable textKey="submit_modal.field_area_label">
                                {t(
                                  'submit_modal.field_area_label',
                                  'Área Privativa (m²)'
                                )}
                              </InlineEditable>
                            </label>
                            <input
                              type="number"
                              value={propertyForm.features?.area}
                              onChange={(e) =>
                                setPropertyForm({
                                  ...propertyForm,
                                  features: {
                                    ...propertyForm.features!,
                                    area: Number(e.target.value),
                                  },
                                })
                              }
                              className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                              onFocus={(e) =>
                                (e.target.style.borderColor =
                                  settings.primaryColor)
                              }
                              onBlur={(e) => (e.target.style.borderColor = '')}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeStep === 3 && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                        <div>
                          <h3
                            className="text-3xl font-black italic uppercase tracking-tighter mb-2"
                            style={{ color: settings.secondaryColor }}
                          >
                            <InlineEditable textKey="submit_modal.step3_title">
                              {t('submit_modal.step3_title', 'Onde fica?')}
                            </InlineEditable>
                          </h3>
                          <p className="text-black/60 font-medium">
                            <InlineEditable textKey="submit_modal.step3_subtitle">
                              {t(
                                'submit_modal.step3_subtitle',
                                'Sua localização deve ser precisa para valorizar o m².'
                              )}
                            </InlineEditable>
                          </p>
                        </div>
                        <div className="space-y-8">
                          <div className="group">
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                              <InlineEditable textKey="submit_modal.field_address_label">
                                {t(
                                  'submit_modal.field_address_label',
                                  'Endereço Completo'
                                )}
                              </InlineEditable>
                            </label>
                            <input
                              required
                              type="text"
                              value={propertyForm.location?.address}
                              onChange={(e) =>
                                setPropertyForm({
                                  ...propertyForm,
                                  location: {
                                    ...propertyForm.location!,
                                    address: e.target.value,
                                  },
                                })
                              }
                              className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                              onFocus={(e) =>
                                (e.target.style.borderColor =
                                  settings.primaryColor)
                              }
                              onBlur={(e) => (e.target.style.borderColor = '')}
                              placeholder={t(
                                'submit_modal.field_address_placeholder',
                                'Rua, número e CEP'
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="group">
                              <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                                <InlineEditable textKey="submit_modal.field_city_label">
                                  {t(
                                    'submit_modal.field_city_label',
                                    'Cidade / Munícipio'
                                  )}
                                </InlineEditable>
                              </label>
                              <input
                                required
                                type="text"
                                value={propertyForm.location?.city}
                                onChange={(e) =>
                                  setPropertyForm({
                                    ...propertyForm,
                                    location: {
                                      ...propertyForm.location!,
                                      city: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                                onFocus={(e) =>
                                  (e.target.style.borderColor =
                                    settings.primaryColor)
                                }
                                onBlur={(e) =>
                                  (e.target.style.borderColor = '')
                                }
                                placeholder={t(
                                  'submit_modal.field_city_placeholder',
                                  'Ex: Ribeirão Preto'
                                )}
                              />
                            </div>
                            <div className="group">
                              <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                                <InlineEditable textKey="submit_modal.field_neighborhood_label">
                                  {t(
                                    'submit_modal.field_neighborhood_label',
                                    'Bairro / Região'
                                  )}
                                </InlineEditable>
                              </label>
                              <input
                                required
                                type="text"
                                value={propertyForm.location?.neighborhood}
                                onChange={(e) =>
                                  setPropertyForm({
                                    ...propertyForm,
                                    location: {
                                      ...propertyForm.location!,
                                      neighborhood: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                                onFocus={(e) =>
                                  (e.target.style.borderColor =
                                    settings.primaryColor)
                                }
                                onBlur={(e) =>
                                  (e.target.style.borderColor = '')
                                }
                                placeholder={t(
                                  'submit_modal.field_neighborhood_placeholder',
                                  'Ex: Jardim Botânico'
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeStep === 4 && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                        <div>
                          <h3
                            className="text-3xl font-black italic uppercase tracking-tighter mb-2"
                            style={{ color: settings.secondaryColor }}
                          >
                            <InlineEditable textKey="submit_modal.step4_title">
                              {t(
                                'submit_modal.step4_title',
                                'Visuais & Galeria'
                              )}
                            </InlineEditable>
                          </h3>
                          <p className="text-black/60 font-medium">
                            <InlineEditable textKey="submit_modal.step4_subtitle">
                              {t(
                                'submit_modal.step4_subtitle',
                                'Bons visuais aumentam a conversão em até 80%.'
                              )}
                            </InlineEditable>
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                          {propertyForm.images?.map((img, idx) => (
                            <div
                              key={idx}
                              className="relative aspect-[4/5] rounded-[2rem] overflow-hidden group border-2 border-white shadow-xl hover:scale-[1.02] transition-all"
                            >
                              <img
                                src={img}
                                className="w-full h-full object-cover"
                              />
                              <div
                                className="absolute inset-0 bg-red-500/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer"
                                onClick={() =>
                                  setPropertyForm((prev) => ({
                                    ...prev,
                                    images: prev.images?.filter(
                                      (_, i) => i !== idx
                                    ),
                                  }))
                                }
                              >
                                <Trash2 size={24} />
                              </div>
                            </div>
                          ))}
                          <label
                            className="aspect-[4/5] border-3 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 hover:border-slate-950 transition-all bg-white cursor-pointer group shadow-sm"
                            style={{ borderColor: 'transparent' }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.borderColor =
                                settings.secondaryColor)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.borderColor = '')
                            }
                          >
                            {uploadingImage ? (
                              <Loader2
                                className="animate-spin"
                                size={32}
                                style={{ color: settings.secondaryColor }}
                              />
                            ) : (
                              <>
                                <div
                                  className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 group-hover:text-white transition-all"
                                  style={
                                    {
                                      backgroundColor:
                                        'var(--hover-bg, #f8fafc)',
                                    } as any
                                  }
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      settings.secondaryColor)
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor = '')
                                  }
                                >
                                  <Plus size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">
                                  <InlineEditable textKey="submit_modal.add_photos">
                                    {t(
                                      'submit_modal.add_photos',
                                      'Adicionar Fotografias'
                                    )}
                                  </InlineEditable>
                                </span>
                              </>
                            )}
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm -mx-8 md:-mx-20 px-8 md:px-20 pb-10 sticky bottom-0">
                    <button
                      type="button"
                      onClick={() =>
                        activeStep > 1 && setActiveStep(activeStep - 1)
                      }
                      disabled={activeStep === 1}
                      className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-black disabled:opacity-0 transition-all flex items-center gap-2"
                    >
                      <ChevronRight className="rotate-180" size={16} />{' '}
                      <InlineEditable textKey="submit_modal.nav_back">
                        {t('submit_modal.nav_back', 'Voltar')}
                      </InlineEditable>
                    </button>

                    {activeStep < 4 ? (
                      <button
                        type="button"
                        onClick={() => setActiveStep(activeStep + 1)}
                        className="px-12 py-5 text-white rounded-full font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
                        style={{
                          backgroundColor: settings.primaryColor,
                          color: getContrastColor(settings.primaryColor),
                        }}
                      >
                        <InlineEditable textKey="submit_modal.nav_continue">
                          {t(
                            'submit_modal.nav_continue',
                            'Continuar para Passo 0'
                          )}
                        </InlineEditable>{' '}
                        {activeStep + 1}
                        <ChevronRight
                          size={16}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmitProperty}
                        disabled={isSubmittingProperty}
                        className="px-16 py-5 text-white rounded-full font-black uppercase text-[11px] tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group disabled:opacity-50"
                        style={{
                          backgroundColor: settings.primaryColor,
                          color: getContrastColor(settings.primaryColor),
                        }}
                      >
                        {isSubmittingProperty ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <Sparkles size={18} />
                        )}
                        <InlineEditable textKey="submit_modal.nav_finish">
                          {t('submit_modal.nav_finish', 'Finalizar Submissão')}
                        </InlineEditable>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
