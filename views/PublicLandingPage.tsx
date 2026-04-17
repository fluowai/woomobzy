import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { landingPageService } from '../services/landingPages';
import { LandingPage, BlockType } from '../types/landingPage';
import { supabase } from '../services/supabase';
import MainLandingPage from './LandingPage';
import Login from './Login'; // Import Login Component
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
import { v4 as uuidv4 } from 'uuid'; // Need uuid for virtual blocks
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
import { useSettings } from '../context/SettingsContext'; // For public page might fallback/fail gracefully if context missing

interface PublicLandingPageProps {
  forceSlug?: string;
  forceComingSoon?: boolean;
}

const PublicLandingPage: React.FC<PublicLandingPageProps> = ({ forceSlug }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  // Prefer the prop from DomainRouter, fallback to URL parameter
  const activeSlug = forceSlug || routeSlug;

  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
  const [error, setError] = useState<string | null>(null); // Added error state
  const [settings, setSettings] = useState<any>(null);
  const { profile } = useAuth(); // Para permitir bypass de admin
  const location = useLocation();
  const [organization, setOrganization] = useState<any>(null);
  const [showMainSite, setShowMainSite] = useState(false); // Flag to show main component
  const [showLogin, setShowLogin] = useState(false); // Flag to show branding login

  // Alias for compatibility with existing render logic
  const page = landingPage;
  const isPreview = false; // Default for public view

  const [searchParams] = useSearchParams(); // Call hook at top level

  useEffect(() => {
    if (activeSlug) {
      loadLandingPage(activeSlug);
    }
  }, [activeSlug, searchParams.get('page')]); // Use values from top-level hook

  const loadLandingPage = async (slug: string) => {
    try {
      setLoading(true);
      console.log('🔍 Loading Public Site for Slug:', slug);

      // 1. Find Organization by Slug
      let resolvedOrg: any = null;

      // Try RPC first
      try {
        const { data: org, error: orgError } = await supabase
          .rpc('get_tenant_public', { slug_input: slug })
          .single();

        if (!orgError && org) {
          resolvedOrg = org;
        } else {
          console.warn('RPC fallback:', orgError?.message);
        }
      } catch (e) {
        console.warn('RPC not available, using direct query');
      }

      // Fallback: direct query
      if (!resolvedOrg) {
        const { data: orgDirect, error: directError } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('slug', slug)
          .single();

        if (orgDirect) {
          resolvedOrg = orgDirect;
        }
      }

      if (!resolvedOrg) {
        console.error('Organization not found for slug:', slug);
        setLoading(false);
        return;
      }

      setOrganization(resolvedOrg);
      const orgId = resolvedOrg.id;

      // 2. Load Public Site Settings
      if (orgId) {
        try {
          const { data: siteSettings } = await supabase
            .rpc('get_site_settings_public', { org_id: orgId })
            .single();
          if (siteSettings) {
            setSettings(siteSettings);
          }
        } catch (e) {
          // RPC might not exist, try direct
          const { data: directSettings } = await supabase
            .from('site_settings')
            .select('*')
            .eq('organization_id', orgId)
            .maybeSingle();
          if (directSettings) setSettings(directSettings);
        }
      }

      // 3. Load Active Landing Page
      if (orgId) {
        const targetPageSlug = searchParams.get('page');

        // Check for Login Route
        const path = window.location.pathname;
        if (path.endsWith('/site/login')) {
          setShowLogin(true);
          setLoading(false);
          return;
        }

        let pageData = null;

        if (targetPageSlug) {
          const { data } = await supabase
            .from('landing_pages')
            .select('*')
            .eq('organization_id', orgId)
            .eq('slug', targetPageSlug)
            .eq('status', 'published')
            .single();
          pageData = data;
        } else {
          const { data } = await supabase
            .from('landing_pages')
            .select('*')
            .eq('organization_id', orgId)
            .eq('status', 'published')
            .in('slug', ['home', 'inicio', 'index', 'main', 'site'])
            .limit(1)
            .maybeSingle();
          pageData = data;
        }

        if (pageData) {
          const mappedPage: any = {
            ...pageData,
            themeConfig: pageData.theme_config || pageData.themeConfig || {},
            metaTitle: pageData.meta_title,
            metaDescription: pageData.meta_description,
            ogImage: pageData.og_image,
            customCss: pageData.custom_css,
            customJs: pageData.custom_js,
            propertySelection:
              pageData.property_selection || pageData.propertySelection,
            formConfig: pageData.form_config || pageData.formConfig,
            createdAt: pageData.created_at,
            updatedAt: pageData.updated_at,
          };
          setLandingPage(mappedPage);
          setShowMainSite(false);
        } else if (!targetPageSlug) {
          // NO HOME PAGE FOUND -> SHOW MAIN SITE COMPONENT
          console.log('Using Main LandingPage Component');
          setShowMainSite(true);
        }
      }

      setLoading(false);

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading site:', err);
      setError(err.message || 'Erro ao carregar o site');
      setLoading(false);
    }
  };

  const getContainerClass = (width?: string) => {
    switch (width) {
      case 'sm':
        return 'max-w-3xl mx-auto px-4';
      case 'md':
        return 'max-w-5xl mx-auto px-4';
      case 'lg':
        return 'max-w-6xl mx-auto px-4';
      case 'xl':
        return 'max-w-7xl mx-auto px-4';
      case 'full':
        return 'w-full';
      default:
        return 'w-full';
    }
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
      case BlockType.IMAGE:
        return <ImageBlock config={block.config} theme={theme} />;
      case BlockType.GALLERY:
        return <GalleryBlock config={block.config} theme={theme} />;
      case BlockType.PROPERTY_CAROUSEL:
        return <PropertyCarouselBlock config={block.config} theme={theme} />;
      case BlockType.STATS:
        return <StatsBlock config={block.config} theme={theme} />;
      case BlockType.FORM:
        return <FormBlock config={block.config} theme={theme} />;
      case BlockType.CTA:
        return <CTABlock config={block.config} theme={theme} />;
      case BlockType.MAP:
        return <MapBlock config={block.config} theme={theme} />;
      case BlockType.TIMELINE:
        return <TimelineBlock config={block.config} theme={theme} />;
      case BlockType.VIDEO:
        return <VideoBlock config={block.config} theme={theme} />;
      case BlockType.TESTIMONIALS:
        return <TestimonialsBlock config={block.config} theme={theme} />;
      case BlockType.BROKER_CARD:
        // Note: Public view might not have access to 'useSettings' context provider if it's outside main App structure
        // But we pass null/undefined and let the block handle fallback or use saved config
        return (
          <BrokerCardBlock
            config={block.config}
            theme={theme}
            settings={null}
          />
        );
      case BlockType.DIVIDER:
        return <DividerBlock config={block.config} />;
      case BlockType.SPACER:
        return <SpacerBlock config={block.config} />;
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
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se o site não estiver LIVE e o usuário não for admin daquela org (ou superadmin), mostrar ComingSoon
  // Se 'settings' for nulo, isLive será falso, então entrará aqui (comportamento desejado: segurança primeiro)
  if ((forceComingSoon || !isLive) && !isSiteOwner) {
    // Se não estivermos já na rota /embreve, podemos redirecionar para ela (opcional, conforme pedido)
    const isMaintenancePath = location.pathname.includes('/embreve');
    if (!isMaintenancePath && !forceComingSoon) {
       window.location.href = '/embreve';
       return <div className="min-h-screen bg-white" />;
    }
    
    return <ComingSoon organizationId={organization?.id || ''} agencyName={settings?.agencyName || organization?.name || 'Imobiliária'} />;
  }

  // RENDER LOGIN IF REQUESTED
  if (showLogin && organization) {
    return (
      <SettingsProvider organizationId={organization.id}>
        <Login />
      </SettingsProvider>
    );
  }

  // RENDER MAIN SITE MODEL IF REQUESTED
  if (showMainSite && organization) {
    return (
      <SettingsProvider organizationId={organization.id}>
        <MainLandingPage organizationId={organization.id} />
      </SettingsProvider>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-4">
            {error || 'Página não encontrada'}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
      {/* SEO Meta Tags */}
      <title>{page.title}</title>
      <meta name="description" content={page.description} />
      {page.metaTitle && <meta property="og:title" content={page.metaTitle} />}
      {page.metaDescription && (
        <meta property="og:description" content={page.metaDescription} />
      )}
      {page.ogImage && <meta property="og:image" content={page.ogImage} />}

      {/* Preview Banner */}
      {isPreview && (
        <div className="bg-yellow-500 text-black px-4 py-2 text-center font-medium sticky top-0 z-50">
          🔍 MODO PREVIEW - Esta página ainda não está publicada
        </div>
      )}

      {/* Admin Maintenance Banner */}
      {!isLive && isSiteOwner && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-center text-xs font-bold sticky top-0 z-[100] flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          MODO MANUTENÇÃO: O público está vendo a página "Em Breve". Você está visualizando o site real por ser Administrador.
        </div>
      )}

      {/* Render all blocks */}
      <div className="flex-1">
        {page.blocks.map((block) => (
          <div
            key={block.id}
            style={block.styles}
            className={getContainerClass(block.containerWidth)}
          >
            {renderBlock(block)}
          </div>
        ))}
      </div>

      {/* Custom CSS */}
      {page.customCss && (
        <style dangerouslySetInnerHTML={{ __html: page.customCss }} />
      )}

      {/* Custom JS */}
      {page.customJs && (
        <script dangerouslySetInnerHTML={{ __html: page.customJs }} />
      )}
    </div>
  );
};

export default PublicLandingPage;
