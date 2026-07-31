import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { landingPageService } from '../services/landingPages';
import { LandingPage } from '../types/landingPage';
import { supabase } from '../services/supabase';
import MainLandingPage from './LandingPage';
import { SettingsProvider } from '../context/SettingsContext';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ComingSoon from '../components/ComingSoon';

import PublicBlockRenderer from '../components/LandingPageBlocks/PublicBlockRenderer';
import OkaPublicSite from './OkaPublicSite';
import FazendasBrasilPublicSite from './FazendasBrasilPublicSite';

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
  const [properties, setProperties] = useState<any[]>([]);
  const isImmediateOkaSite = activeSlug === 'okaimoveis';

  const page = landingPage;
  const isDirectLandingPage = location.pathname.startsWith('/lp/');

  useEffect(() => {
    if (landingPage?.id) {
      loadProperties(landingPage.id);
    }
  }, [landingPage?.id]);

  const loadProperties = async (pageId: string) => {
    try {
      const data = await landingPageService.getPageProperties(pageId);
      setProperties(data);
    } catch (err) {
      logger.error('Error loading page properties:', err);
    }
  };

  useEffect(() => {
    if (isImmediateOkaSite) {
      setLoading(false);
      return;
    }

    if (activeSlug) {
      loadLandingPage(activeSlug);
    } else if (forceComingSoon) {
      setLoading(false);
    }
  }, [activeSlug, searchParams.get('page'), isImmediateOkaSite]);

  const loadLandingPage = async (slugOrOrg: string) => {
    try {
      setLoading(true);
      const isDirectLPLink = isDirectLandingPage;
      logger.info(
        '🔍 Loading Public Site. Mode:',
        isDirectLPLink ? 'Direct LP' : 'Org/Subdomain',
        'Value:',
        slugOrOrg
      );

      let resolvedOrg: any = null;
      let targetPage: any = null;

      if (isDirectLPLink) {
        // Mode A: Search by Landing Page Slug directly
        // NOTE: We do NOT join organizations here because RLS on the
        // organizations table blocks anonymous SELECT. Instead we fetch
        // the landing page first, then resolve the org separately.
        const { data: lpData } = await supabase
          .from('landing_pages')
          .select('*')
          .eq('slug', slugOrOrg)
          .eq('status', 'published')
          .maybeSingle();

        if (lpData) {
          targetPage = lpData;
          if (lpData.organization_id) {
            try {
              const { data: org } = await supabase.rpc('get_tenant_public', {
                slug_input: slugOrOrg,
              });
              resolvedOrg = org?.[0] || { id: lpData.organization_id };
            } catch {
              resolvedOrg = { id: lpData.organization_id };
            }
          }
        } else {
          logger.error('Landing page not found by slug:', slugOrOrg);
        }
      }

      // Fallback or Mode B: Resolve by Organization first
      if (!resolvedOrg) {
        try {
          const { data: org, error: orgError } = await supabase.rpc(
            'get_tenant_public',
            { slug_input: slugOrOrg }
          );
          const orgRow = org?.[0];
          if (!orgError && orgRow) resolvedOrg = orgRow;
        } catch (e) {
          logger.warn('RPC failed, trying direct query');
        }

        if (!resolvedOrg) {
          const { data: orgDirect } = await supabase
            .from('organizations')
            .select('id, name, slug, custom_domain')
            .or(
              `slug.eq.${slugOrOrg},custom_domain.eq.${slugOrOrg},subdomain.eq.${slugOrOrg}`
            );
          resolvedOrg = orgDirect?.[0];
        }
      }

      if (!resolvedOrg) {
        if (activeSlug === 'okaimoveis' || activeSlug === 'fazendasbrasil') {
          logger.warn(
            `Organization not found for slug ${activeSlug}, rendering fallback site`
          );
          setOrganization(null);
          setShowMainSite(true);
          setLoading(false);
          return;
        }
        logger.error('Organization not found');
        setLoading(false);
        return;
      }

      setOrganization(resolvedOrg);
      const orgId = resolvedOrg.id;

      // 2. Load Settings
      if (orgId) {
        const { data: siteSettings } = await supabase
          .from('site_settings')
          .select('*')
          .eq('organization_id', orgId)
          .maybeSingle();
        if (siteSettings) setSettings(siteSettings);
      }

      // 3. Load Page Content (if not already loaded in Mode A)
      if (!targetPage) {
        const targetPageSlug = searchParams.get('page');
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
        targetPage = pageData;
      }

      if (targetPage) {
        const mappedPage: any = {
          ...targetPage,
          themeConfig: targetPage.theme_config || targetPage.themeConfig || {},
          metaTitle: targetPage.meta_title,
          metaDescription: targetPage.meta_description,
          ogImage: targetPage.og_image,
        };
        setLandingPage(mappedPage);
        setShowMainSite(false);
      } else {
        setShowMainSite(true);
      }

      setLoading(false);
    } catch (err: any) {
      logger.error('Error loading site:', err);
      setError(err.message || 'Erro ao carregar o site');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!page) return;
    document.title = page.metaTitle || page.title || page.name;
    const description = page.metaDescription || page.description;
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
      );
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [page]);

  const getContainerClass = (width?: string) => {
    const widths: Record<string, string> = {
      sm: 'max-w-3xl',
      md: 'max-w-5xl',
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
    };
    return width === 'full'
      ? 'w-full'
      : `${widths[width || 'xl'] || widths.xl} mx-auto px-4`;
  };

  const toCssString = (styles: Record<string, any> = {}) => {
    return Object.entries(styles)
      .filter(([key]) => key !== 'customCss')
      .map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${value} !important;`;
      })
      .join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2
            className="animate-spin mx-auto mb-4 text-indigo-600"
            size={48}
          />
          <p className="text-gray-600 font-medium">Carregando experiência...</p>
        </div>
      </div>
    );
  }

  if (isImmediateOkaSite) {
    return <OkaPublicSite />;
  }

  const isSiteOwner =
    profile?.organization_id === organization?.id ||
    profile?.role === 'superadmin';
  const isLive = settings?.is_live === true || settings?.isLive === true;
  const isOkaSite =
    activeSlug === 'okaimoveis' ||
    organization?.slug === 'okaimoveis' ||
    organization?.custom_domain === 'okaimoveis.com.br' ||
    organization?.custom_domain === 'www.okaimoveis.com.br';
  const isFazendasBrasilSite =
    organization?.slug === 'fazendasbrasil' ||
    organization?.slug === 'fazendas-brasil' ||
    organization?.custom_domain === 'fazendasbrasil.com' ||
    organization?.custom_domain === 'www.fazendasbrasil.com' ||
    organization?.custom_domain === 'fazendasbrasil.com.br' ||
    organization?.custom_domain === 'www.fazendasbrasil.com.br';

  if (isOkaSite) {
    return <OkaPublicSite organizationId={organization?.id} />;
  }

  if (isFazendasBrasilSite) {
    return <FazendasBrasilPublicSite organizationId={organization?.id} />;
  }

  if ((forceComingSoon || (!isDirectLandingPage && !isLive)) && !isSiteOwner) {
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
      {!isLive && isSiteOwner && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-center text-xs font-bold sticky top-0 z-[100] flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          MODO MANUTENÇÃO ATIVO: Você visualiza o site real por ser
          Administrador.
        </div>
      )}
      <div className="flex-1">
        {(page.blocks || [])
          .filter((block) => block.visible)
          .map((block) => (
            <div
              key={block.id}
              className={getContainerClass(block.containerWidth)}
            >
              <style>{`
              .block-wrapper-${block.id} {
                ${toCssString(block.styles)}
              }
              ${block.styles?.customCss ? `.block-wrapper-${block.id} { ${block.styles.customCss} }` : ''}
              @media (max-width: 768px) {
                .block-wrapper-${block.id} {
                  ${toCssString(block.responsive?.mobile)}
                }
                ${block.responsive?.mobile?.customCss ? `.block-wrapper-${block.id} { ${block.responsive.mobile.customCss} }` : ''}
              }
            `}</style>
              <div className={`block-wrapper-${block.id}`}>
                <PublicBlockRenderer
                  block={block}
                  theme={page.themeConfig}
                  properties={properties}
                  settings={settings}
                  leadContext={{
                    organizationId: organization?.id || page.organizationId,
                    organizationSlug: organization?.slug,
                    landingPageId: page.id,
                    landingPageSlug: page.slug,
                  }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default PublicLandingPage;
