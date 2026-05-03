import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { landingPageService } from '../services/landingPages';
import { LandingPage, BlockType } from '../types/landingPage';
import { supabase } from '../services/supabase';
import MainLandingPage from './LandingPage';
import Login from './Login';
import { SettingsProvider } from '../context/SettingsContext';
import { Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ComingSoon from '../components/ComingSoon';

// Import public block components
import HeaderBlock from '../components/LandingPageBlocks/HeaderBlock';
import FooterBlock from '../components/LandingPageBlocks/FooterBlock';
import HeroBlock from '../components/LandingPageBlocks/HeroBlock';
import PropertyGridBlock from '../components/LandingPageBlocks/PropertyGridBlock';
import TextBlock from '../components/LandingPageBlocks/TextBlock';
import FormBlock from '../components/LandingPageBlocks/FormBlock';
import CTABlock from '../components/LandingPageBlocks/CTABlock';
import SpacerBlock from '../components/LandingPageBlocks/SpacerBlock';
import { v4 as uuidv4 } from 'uuid';
import GalleryBlock from '../components/LandingPageBlocks/GalleryBlock';
import StatsBlock from '../components/LandingPageBlocks/StatsBlock';
import ImageBlock from '../components/LandingPageBlocks/ImageBlock';
import PropertyCarouselBlock from '../components/LandingPageBlocks/PropertyCarouselBlock';
import MapBlock from '../components/LandingPageBlocks/MapBlock';
import TimelineBlock from '../components/LandingPageBlocks/TimelineBlock';
import VideoBlock from '../components/LandingPageBlocks/VideoBlock';
import TestimonialsBlock from '../components/LandingPageBlocks/TestimonialsBlock';
import BrokerCardBlock from '../components/LandingPageBlocks/BrokerCardBlock';
import DividerBlock from '../components/LandingPageBlocks/DividerBlock';

interface PublicLandingPageProps {
  forceSlug?: string;
  forceComingSoon?: boolean;
}

const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  forceSlug,
  forceComingSoon,
}) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const activeSlug = forceSlug || routeSlug;
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [showMainSite, setShowMainSite] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const isPreview = false;
  const page = landingPage;

  useEffect(() => {
    if (activeSlug) {
      loadLandingPage(activeSlug);
    }
  }, [activeSlug, searchParams.get('page')]);

  const loadLandingPage = async (slug: string) => {
    try {
      setLoading(true);
      logger.info('🔍 Loading Public Site for Slug:', slug);

      // 1. Find Organization
      let resolvedOrg: any = null;
      try {
        const { data: org, error: orgError } = await supabase
          .rpc('get_tenant_public', { slug_input: slug })
          .maybeSingle();

        if (!orgError && org) {
          resolvedOrg = org;
        }
      } catch (e) {
        logger.warn('RPC failed, trying direct query');
      }

      if (!resolvedOrg) {
        const { data: orgDirect } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .or(`slug.eq.${slug},custom_domain.eq.${slug},subdomain.eq.${slug}`)
          .maybeSingle();
        resolvedOrg = orgDirect;
      }

      if (!resolvedOrg) {
        logger.error('Organization not found');
        setLoading(false);
        return;
      }

      setOrganization(resolvedOrg);
      const orgId = resolvedOrg.id;

      // 2. Load Settings
      if (orgId) {
        const { data: siteSettings, error: settingsError } = await supabase
          .rpc('get_site_settings_public', { org_id: orgId })
          .maybeSingle();

        if (siteSettings && !settingsError) {
          setSettings(siteSettings);
        } else {
          // Fallback direct query
          const { data: directSettings } = await supabase
            .from('site_settings')
            .select('*')
            .eq('organization_id', orgId)
            .maybeSingle();
          if (directSettings) setSettings(directSettings);
        }
      }

      // 3. Load Content
      const targetPageSlug = searchParams.get('page');
      if (window.location.pathname.endsWith('/site/login')) {
        setShowLogin(true);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('landing_pages')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'published');

      if (targetPageSlug) {
        query = query.eq('slug', targetPageSlug);
      } else {
        query = query
          .in('slug', ['home', 'inicio', 'index', 'main', 'site'])
          .limit(1);
      }

      const { data: pageData } = await query.maybeSingle();

      if (pageData) {
        const mappedPage: any = {
          ...pageData,
          themeConfig: pageData.theme_config || pageData.themeConfig || {},
          metaTitle: pageData.meta_title,
          metaDescription: pageData.meta_description,
          ogImage: pageData.og_image,
        };
        setLandingPage(mappedPage);
        setShowMainSite(false);
      } else if (!targetPageSlug) {
        setShowMainSite(true);
      }

      setLoading(false);
    } catch (err: any) {
      logger.error('Error loading site:', err);
      setError(err.message || 'Erro ao carregar o site');
      setLoading(false);
    }
  };

  const getContainerClass = (width?: string) => {
    return width === 'full' ? 'w-full' : 'max-w-7xl mx-auto px-4';
  };

  const renderBlock = (block: any) => {
    const theme = page?.themeConfig;
    if (!theme) return null;

    switch (block.type) {
      case BlockType.HEADER:
        return <HeaderBlock config={block.config} theme={theme} />;
      case BlockType.FOOTER:
        return <FooterBlock config={block.config} theme={theme} />;
      case BlockType.HERO:
        return <HeroBlock config={block.config} theme={theme} />;
      case BlockType.PROPERTY_GRID:
        return <PropertyGridBlock config={block.config} theme={theme} />;
      case BlockType.TEXT:
        return <TextBlock config={block.config} theme={theme} />;
      case BlockType.FORM:
        return <FormBlock config={block.config} theme={theme} />;
      case BlockType.CTA:
        return <CTABlock config={block.config} theme={theme} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader
            className="animate-spin mx-auto mb-4 text-indigo-600"
            size={48}
          />
          <p className="text-gray-600 font-medium">Carregando experiência...</p>
        </div>
      </div>
    );
  }

  const isSiteOwner =
    profile?.organization_id === organization?.id ||
    profile?.role === 'superadmin';
  const isLive = settings?.is_live === true || settings?.isLive === true;

  if ((forceComingSoon || !isLive) && !isSiteOwner) {
    const isMaintenancePath = location.pathname.includes('/embreve');
    if (!isMaintenancePath && !forceComingSoon) {
      window.location.href = '/embreve';
      return <div className="min-h-screen bg-white" />;
    }
    const agencyName =
      settings?.agency_name ||
      settings?.agencyName ||
      organization?.name ||
      'Imobiliária';
    return (
      <ComingSoon
        organizationId={organization?.id || ''}
        agencyName={agencyName}
      />
    );
  }

  if (showLogin && organization)
    return (
      <SettingsProvider organizationId={organization.id}>
        <Login />
      </SettingsProvider>
    );
  if (showMainSite && organization)
    return (
      <SettingsProvider organizationId={organization.id}>
        <MainLandingPage organizationId={organization.id} />
      </SettingsProvider>
    );

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-6">
            {error || 'Página não encontrada'}
          </p>
          <a
            href="/"
            className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: page.themeConfig.fontFamily || 'sans-serif',
        backgroundColor: page.themeConfig.backgroundColor || '#ffffff',
        color: page.themeConfig.textColor || '#000000',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <title>{page.title}</title>
      {!isLive && isSiteOwner && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-center text-xs font-bold sticky top-0 z-[100] flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          MODO MANUTENÇÃO ATIVO: Você visualiza o site real por ser
          Administrador.
        </div>
      )}
      <div className="flex-1">
        {page.blocks.map((block) => (
          <div
            key={block.id}
            className={getContainerClass(block.containerWidth)}
          >
            {renderBlock(block)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicLandingPage;
