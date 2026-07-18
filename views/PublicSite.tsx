import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { siteService } from '../services/sites';
import { Site, SitePage, SiteMenuItem } from '../types/site';
import { Block, BlockType, LandingPageTheme } from '../types/landingPage';
import HeaderBlock from '../components/LandingPageBlocks/HeaderBlock';
import FooterBlock from '../components/LandingPageBlocks/FooterBlock';
import HeroBlock from '../components/LandingPageBlocks/HeroBlock';
import PropertyGridBlock from '../components/LandingPageBlocks/PropertyGridBlock';
import PropertyCarouselBlock from '../components/LandingPageBlocks/PropertyCarouselBlock';
import TextBlock from '../components/LandingPageBlocks/TextBlock';
import FormBlock from '../components/LandingPageBlocks/FormBlock';
import CTABlock from '../components/LandingPageBlocks/CTABlock';
import SpacerBlock from '../components/LandingPageBlocks/SpacerBlock';
import DividerBlock from '../components/LandingPageBlocks/DividerBlock';
import GalleryBlock from '../components/LandingPageBlocks/GalleryBlock';
import StatsBlock from '../components/LandingPageBlocks/StatsBlock';
import ImageBlock from '../components/LandingPageBlocks/ImageBlock';
import MapBlock from '../components/LandingPageBlocks/MapBlock';
import TimelineBlock from '../components/LandingPageBlocks/TimelineBlock';
import VideoBlock from '../components/LandingPageBlocks/VideoBlock';
import TestimonialsBlock from '../components/LandingPageBlocks/TestimonialsBlock';
import BrokerCardBlock from '../components/LandingPageBlocks/BrokerCardBlock';
import HeroWithFormBlock from '../components/LandingPageBlocks/HeroWithFormBlock';
import { Loader2, Menu, X, Phone, Mail, MapPin, Instagram, Facebook, Youtube, Linkedin, MessageCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import FazendasBrasilPublicSite from './FazendasBrasilPublicSite';

interface PublicSiteProps {
  forceOrgSlug?: string;
}

const PublicSite: React.FC<PublicSiteProps> = ({ forceOrgSlug }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const siteSegmentIndex = pathSegments.indexOf('site');
  const nestedSiteSlug =
    siteSegmentIndex >= 0 &&
    ['rural', 'urban', 'admin'].includes(routeSlug || '') &&
    pathSegments[siteSegmentIndex + 1]
      ? pathSegments[siteSegmentIndex + 1]
      : undefined;
  const orgSlug = forceOrgSlug || nestedSiteSlug || routeSlug;

  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [currentPage, setCurrentPage] = useState<SitePage | null>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const isFazendasBrasilSite =
    orgSlug === 'fazendasbrasil' || orgSlug === 'fazendas-brasil';

  useEffect(() => {
    if (orgSlug && !isFazendasBrasilSite) loadSite();
  }, [orgSlug, isFazendasBrasilSite]);

  useEffect(() => {
    if (pages.length > 0) {
      const path = location.pathname;
      const pageSlug = path.split('/').filter(Boolean).pop() || 'home';
      const found = pages.find((p) => p.slug === pageSlug) || pages.find((p) => p.isHome) || pages[0];
      setCurrentPage(found);
    }
  }, [location.pathname, pages]);

  useEffect(() => {
    if (currentPage && site) {
      loadProperties();
    }
  }, [currentPage?.id]);

  const loadSite = async () => {
    try {
      setLoading(true);
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, custom_domain')
        .eq('slug', orgSlug)
        .maybeSingle();

      if (!org) {
        setLoading(false);
        return;
      }

      setOrganization(org);

      const { data: siteData } = await supabase
        .from('sites')
        .select('*')
        .eq('organization_id', org.id)
        .maybeSingle();

      if (!siteData) {
        setLoading(false);
        return;
      }

      const mappedSite: Site = {
        id: siteData.id,
        organizationId: siteData.organization_id,
        name: siteData.name,
        isActive: siteData.is_active ?? true,
        logoUrl: siteData.logo_url,
        faviconUrl: siteData.favicon_url,
        globalTheme: siteData.global_theme || {},
        globalHeader: siteData.global_header || [],
        globalFooter: siteData.global_footer || [],
        menuConfig: siteData.menu_config || [],
        contactInfo: siteData.contact_info || {},
        socialLinks: siteData.social_links || {},
        customCss: siteData.custom_css,
        customJs: siteData.custom_js,
        customHead: siteData.custom_head,
        createdAt: siteData.created_at,
        updatedAt: siteData.updated_at,
      };
      setSite(mappedSite);

      const { data: pageData } = await supabase
        .from('site_pages')
        .select('*')
        .eq('site_id', siteData.id)
        .eq('status', 'published')
        .order('sort_order', { ascending: true });

      const mappedPages: SitePage[] = (pageData || []).map((p: any) => ({
        id: p.id,
        siteId: p.site_id,
        title: p.title,
        slug: p.slug,
        sortOrder: p.sort_order || 0,
        blocks: p.blocks || [],
        themeOverrides: p.theme_overrides || {},
        metaTitle: p.meta_title,
        metaDescription: p.meta_description,
        metaKeywords: p.meta_keywords || [],
        ogImage: p.og_image,
        status: p.status,
        isHome: p.is_home || false,
        customCss: p.custom_css,
        customJs: p.custom_js,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      setPages(mappedPages);
    } catch (error) {
      logger.error('Erro ao carregar site público:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    if (!site) return;
    try {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('organization_id', site.organizationId)
        .limit(20);
      setProperties(data || []);
    } catch (error) {
      logger.error('Erro ao carregar imóveis:', error);
    }
  };

  const renderBlock = (block: Block) => {
    const theme = (site?.globalTheme || {}) as LandingPageTheme;
    const cfg = block.config as any;

    switch (block.type) {
      case BlockType.HEADER:
        return <HeaderBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.FOOTER:
        return <FooterBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.HERO:
        return <HeroBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.HERO_WITH_FORM:
        return <HeroWithFormBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.PROPERTY_GRID:
        return <PropertyGridBlock key={block.id} config={cfg} theme={theme} properties={properties} />;
      case BlockType.PROPERTY_CAROUSEL:
        return <PropertyCarouselBlock key={block.id} config={cfg} theme={theme} properties={properties} />;
      case BlockType.TEXT:
        return <TextBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.IMAGE:
        return <ImageBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.FORM:
        return <FormBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.CTA:
        return <CTABlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.STATS:
        return <StatsBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.TESTIMONIALS:
        return <TestimonialsBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.GALLERY:
        return <GalleryBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.MAP:
        return <MapBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.VIDEO:
        return <VideoBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.SPACER:
        return <SpacerBlock key={block.id} config={cfg} />;
      case BlockType.DIVIDER:
        return <DividerBlock key={block.id} config={cfg} />;
      case BlockType.TIMELINE:
        return <TimelineBlock key={block.id} config={cfg} theme={theme} />;
      case BlockType.BROKER_CARD:
        return <BrokerCardBlock key={block.id} config={cfg} theme={theme} />;
      default:
        return null;
    }
  };

  const getMenuItems = (): SiteMenuItem[] => {
    if (site?.menuConfig && site.menuConfig.length > 0) {
      return site.menuConfig;
    }
    return pages.map((p, i) => ({
      id: p.id,
      label: p.title,
      type: 'page' as const,
      pageId: p.slug,
      order: i,
    }));
  };

  const getMenuUrl = (item: SiteMenuItem): string => {
    if (item.type === 'custom') return item.url || '#';
    const target = pages.find((p) => p.slug === item.pageId);
    if (target?.isHome) return `/${orgSlug}`;
    return `/${orgSlug}/${item.pageId}`;
  };

  const theme = site?.globalTheme || {};
  const primaryColor = theme.primaryColor || '#2563eb';
  const secondaryColor = theme.secondaryColor || '#0d9488';
  const fontFamily = theme.fontFamily || 'Inter, sans-serif';
  const textColor = theme.textColor || '#1e293b';

  const siteName = organization?.name || site?.name || 'Site';
  if (isFazendasBrasilSite) {
    return <FazendasBrasilPublicSite organizationId={organization?.id} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin" size={32} style={{ color: primaryColor }} />
      </div>
    );
  }

  if (!site || !currentPage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <p className="text-lg">Site não encontrado</p>
        <p className="text-sm mt-1">Entre em contato com a administração</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily }}>
      {site.customHead && <div dangerouslySetInnerHTML={{ __html: site.customHead }} />}

      <style>{`
        :root {
          --primary: ${primaryColor};
          --primary-dark: ${primaryColor}dd;
          --secondary: ${secondaryColor};
          --text-color: ${textColor};
        }
        body { margin: 0; font-family: ${fontFamily}; color: ${textColor}; }
        ${site.customCss || ''}
      `}</style>

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href={`/${orgSlug}`} className="flex items-center gap-3">
              {site.logoUrl ? (
                <img src={site.logoUrl} alt={siteName} className="h-10 w-auto" />
              ) : (
                <span className="text-xl font-bold" style={{ color: primaryColor }}>{siteName}</span>
              )}
            </a>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-1">
              {getMenuItems().map((item) => {
                const isActive = item.type === 'page' && currentPage.slug === item.pageId;
                return (
                  <a
                    key={item.id}
                    href={getMenuUrl(item)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                    style={{ color: isActive ? primaryColor : textColor }}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>

            {/* Contact buttons */}
            <div className="hidden md:flex items-center gap-2">
              {site.contactInfo?.whatsapp && (
                <a
                  href={`https://wa.me/${site.contactInfo.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {getMenuItems().map((item) => (
                <a
                  key={item.id}
                  href={getMenuUrl(item)}
                  className="block px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <hr className="my-2 border-gray-100" />
              {site.contactInfo?.whatsapp && (
                <a
                  href={`https://wa.me/${site.contactInfo.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-white rounded-lg"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <MessageCircle size={18} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* PAGE CONTENT */}
      <main>
        {currentPage.blocks
          .sort((a, b) => a.order - b.order)
          .filter((b) => b.visible !== false)
          .map(renderBlock)}
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <h3 className="text-white font-bold text-lg mb-3">{siteName}</h3>
              <p className="text-sm text-gray-400">Soluções completas em imóveis rurais e urbanos.</p>
              {site.socialLinks && (
                <div className="flex gap-3 mt-4">
                  {site.socialLinks.instagram && (
                    <a href={site.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                      <Instagram size={20} />
                    </a>
                  )}
                  {site.socialLinks.facebook && (
                    <a href={site.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                      <Facebook size={20} />
                    </a>
                  )}
                  {site.socialLinks.youtube && (
                    <a href={site.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                      <Youtube size={20} />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-3">Páginas</h4>
              <div className="space-y-2">
                {getMenuItems().map((item) => (
                  <a key={item.id} href={getMenuUrl(item)} className="block text-sm text-gray-400 hover:text-white transition-colors">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-3">Contato</h4>
              <div className="space-y-3 text-sm">
                {site.contactInfo?.phone && (
                  <a href={`tel:${site.contactInfo.phone}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <Phone size={14} /> {site.contactInfo.phone}
                  </a>
                )}
                {site.contactInfo?.whatsapp && (
                  <a href={`https://wa.me/${site.contactInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
                {site.contactInfo?.email && (
                  <a href={`mailto:${site.contactInfo.email}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <Mail size={14} /> {site.contactInfo.email}
                  </a>
                )}
                {site.contactInfo?.address && (
                  <p className="flex items-center gap-2 text-gray-400">
                    <MapPin size={14} /> {site.contactInfo.address}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {siteName}. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Custom JS */}
      {site.customJs && <script dangerouslySetInnerHTML={{ __html: site.customJs }} />}
    </div>
  );
};

export default PublicSite;
