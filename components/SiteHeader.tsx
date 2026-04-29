import React, { useState } from 'react';
import {
  Home,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  ChevronDown,
  User,
  Menu,
  X,
  MessageCircle,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useTexts } from '../context/TextsContext';
import InlineEditable from './InlineEditable';
import ImageEditable from './ImageEditable';
import { useNavigate } from 'react-router-dom';

const SiteHeader: React.FC = () => {
  const { settings } = useSettings();
  const { t } = useTexts();

  const navigate = useNavigate();
  // We need to know if we are on a Tenant Site to determine Login URL
  // SiteHeader is inside PublicLandingPage which might have a different Router context or just be standard
  // If we are at /:slug, we want login to be /:slug/site/login
  // The easiest way is to check the URL
  const currentPath = window.location.pathname;
  const isTenantSite =
    currentPath !== '/' &&
    !currentPath.startsWith('/admin') &&
    !currentPath.startsWith('/login');

  const handleLoginClick = () => {
    navigate('/login');
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper to strip non-digits for phone links
  const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

  // Smooth scroll to properties section
  const scrollToProperties = () => {
    const element = document.getElementById('propriedades');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // If not on landing page, navigate there first
      navigate('/#propriedades');
    }
  };

  // Smooth scroll to contact form
  const scrollToContact = () => {
    const element = document.getElementById('contato');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/#contato');
    }
  };

  return (
    <header className="flex flex-col w-full font-sans shadow-md">
      {/* 1. TOP BAR (Primary Color) */}
      <div
        className="w-full text-white text-[11px] font-bold py-2 px-4 md:px-6 flex justify-between items-center"
        style={{ backgroundColor: settings.primaryColor }}
      >
        <div className="flex flex-wrap gap-4 md:gap-8 items-center">
          <span>
            <InlineEditable textKey="header.creci">
              {t('header.creci', 'CRECI/PR 4.222J')}
            </InlineEditable>
          </span>
          <button className="hover:underline">
            <InlineEditable textKey="header.cta_register">
              {t('header.cta_register', 'Cadastre sua Propriedade Rural')}
            </InlineEditable>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <span className="opacity-80">
              <InlineEditable textKey="header.translate_label">
                {t('header.translate_label', 'TRADUZIR SITE:')}
              </InlineEditable>
            </span>
            <select className="bg-white text-black text-xs rounded px-2 py-0.5 outline-none cursor-pointer">
              <option>
                {t('header.language_select', 'Selecione o idioma')}
              </option>
              <option>{t('header.language_pt', 'Português')}</option>
              <option>{t('header.language_en', 'English')}</option>
              <option>{t('header.language_es', 'Español')}</option>
            </select>
          </div>
          <button
            onClick={handleLoginClick}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded flex items-center gap-2 transition-colors"
          >
            <User size={12} />
            <InlineEditable textKey="header.login_button">
              {t('header.login_button', 'Acessar Sistema')}
            </InlineEditable>
          </button>
        </div>
      </div>

      {/* 2. MAIN HEADER (White) */}
      <div className="bg-white py-4 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div onClick={() => navigate('/')} className="cursor-pointer">
            {settings.logoUrl ? (
              <ImageEditable textKey="header.logo">
                <img
                  src={settings.logoUrl}
                  alt={settings.agencyName}
                  className="h-16 md:h-20 object-contain"
                />
              </ImageEditable>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-2xl"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  I
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-serif text-slate-800 tracking-tight leading-none">
                    <InlineEditable textKey="header.logo_fallback_name">
                      {t('header.logo_fallback_name', 'ImobiSaaS')}
                    </InlineEditable>
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400">
                    <InlineEditable textKey="header.logo_fallback_subtitle">
                      {t(
                        'header.logo_fallback_subtitle',
                        'Propriedades Rurais'
                      )}
                    </InlineEditable>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="hidden md:flex items-center gap-8 md:gap-12 text-slate-700">
            <div className="flex items-center gap-3">
              <MessageCircle
                size={28}
                style={{ color: settings.primaryColor }}
              />{' '}
              {/* Using MessageCircle for WhatsApp */}
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold">
                  <InlineEditable textKey="header.contact_whatsapp_label">
                    {t('header.contact_whatsapp_label', 'WhatsApp')}
                  </InlineEditable>
                </span>
                <span className="text-sm text-slate-500">
                  <InlineEditable textKey="contact.phone_value">
                    {t(
                      'contact.phone_value',
                      settings.contactPhone || '(44) 99843-3030'
                    )}
                  </InlineEditable>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={28} style={{ color: settings.primaryColor }} />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold">
                  <InlineEditable textKey="header.contact_phone_label">
                    {t('header.contact_phone_label', 'Telefone')}
                  </InlineEditable>
                </span>
                <span className="text-sm text-slate-500">
                  <InlineEditable textKey="contact.phone_value">
                    {t(
                      'contact.phone_value',
                      settings.contactPhone || '(44) 99843-3030'
                    )}
                  </InlineEditable>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={28} style={{ color: settings.primaryColor }} />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold">
                  <InlineEditable textKey="header.contact_email_label">
                    {t('header.contact_email_label', 'Email')}
                  </InlineEditable>
                </span>
                <span className="text-sm text-slate-500">
                  <InlineEditable textKey="contact.email_value">
                    {t(
                      'contact.email_value',
                      settings.contactEmail || 'contato@imobiliaria.com'
                    )}
                  </InlineEditable>
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden absolute top-12 right-4 text-slate-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={32} /> : <Menu size={32} />}
          </button>
        </div>
      </div>

      {/* 3. NAVIGATION BAR (Primary Color) */}
      <div
        className="w-full hidden md:block"
        style={{ backgroundColor: settings.primaryColor }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-[50px] flex items-center justify-between text-white">
          {/* Links */}
          <nav className="flex items-center gap-0 h-full">
            <NavItem
              label={t('nav.home', 'Início')}
              textKey="nav.home"
              onClick={() => navigate('/')}
            />
            <NavItem
              label={t('nav.about', 'Sobre Nós')}
              textKey="nav.about"
              hasDropdown
            />
            <NavItem
              label={t('nav.farms', 'Fazendas')}
              textKey="nav.farms"
              onClick={scrollToProperties}
            />
            <NavItem
              label={t('nav.ranches', 'Sítios')}
              textKey="nav.ranches"
              onClick={scrollToProperties}
            />
            <NavItem
              label={t('nav.lands', 'Terras Produtivas')}
              textKey="nav.lands"
              onClick={scrollToProperties}
            />
            <NavItem
              label={t('nav.blog', 'Blog')}
              textKey="nav.blog"
              onClick={() => {}}
            />
            <NavItem
              label={t('nav.contact', 'Contato')}
              textKey="nav.contact"
              onClick={scrollToContact}
            />
          </nav>

          {/* Socials */}
          <div className="flex items-center gap-3 pl-8 border-l border-white/20 h-full">
            <SocialIcon icon={<Youtube size={16} />} />
            <SocialIcon icon={<Instagram size={16} />} />
            <SocialIcon icon={<Facebook size={16} />} />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="flex flex-col text-sm font-bold text-slate-700">
            <a
              onClick={() => {
                navigate('/');
                setMobileMenuOpen(false);
              }}
              className="px-6 py-4 border-b hover:bg-slate-50"
            >
              {t('nav.home', 'Início')}
            </a>
            <a className="px-6 py-4 border-b hover:bg-slate-50">
              {t('nav.about', 'Sobre Nós')}
            </a>
            <a
              onClick={() => {
                scrollToProperties();
                setMobileMenuOpen(false);
              }}
              className="px-6 py-4 border-b hover:bg-slate-50"
            >
              {t('nav.farms', 'Fazendas')}
            </a>
            <a
              onClick={() => {
                scrollToProperties();
                setMobileMenuOpen(false);
              }}
              className="px-6 py-4 border-b hover:bg-slate-50"
            >
              {t('nav.ranches', 'Sítios')}
            </a>
            <a
              onClick={() => {
                scrollToProperties();
                setMobileMenuOpen(false);
              }}
              className="px-6 py-4 border-b hover:bg-slate-50"
            >
              {t('nav.lands', 'Terras Produtivas')}
            </a>
            <a
              onClick={() => {
                scrollToContact();
                setMobileMenuOpen(false);
              }}
              className="px-6 py-4 border-b hover:bg-slate-50"
            >
              {t('nav.contact', 'Contato')}
            </a>
            <div className="px-6 py-4 bg-slate-50 flex gap-4 justify-center">
              <SocialIcon icon={<Youtube size={20} />} dark />
              <SocialIcon icon={<Instagram size={20} />} dark />
              <SocialIcon icon={<Facebook size={20} />} dark />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

// Sub-components
const NavItem = ({
  label,
  textKey,
  onClick,
  hasDropdown,
}: {
  label: string;
  textKey: string;
  onClick?: () => void;
  hasDropdown?: boolean;
}) => (
  <InlineEditable
    textKey={textKey}
    onClick={onClick}
    className="h-full px-5 flex items-center gap-1 cursor-pointer hover:bg-black/10 transition-colors text-[13px] font-medium uppercase tracking-wide whitespace-nowrap"
  >
    {label}
    {hasDropdown && <ChevronDown size={14} className="opacity-70" />}
  </InlineEditable>
);

const SocialIcon = ({
  icon,
  dark,
}: {
  icon: React.ReactNode;
  dark?: boolean;
}) => (
  <div
    className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${dark ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white text-orange-600 hover:bg-white/90'}`}
  >
    {icon}
  </div>
);

export default SiteHeader;
