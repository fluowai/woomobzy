import { logger } from '@/utils/logger';
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { getRuntimeEnv } from '@/utils/runtimeConfig';
import { getAllPlatformHosts, PANEL_HOST } from '@/utils/branding';
import { useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';

const PublicLandingPage = lazy(() => import('../views/PublicLandingPage'));

interface DomainRouterProps {
  children: React.ReactNode;
}

const SYSTEM_ROUTES = [
  '/login',
  '/register',
  '/onboarding',
  '/admin',
  '/rural',
  '/urban',
  '/urbano',
  '/superadmin',
  '/impersonate',
  '/lp/',
  '/site/',
  '/embreve',
  '/vendas',
  '/consultoria',
  '/consultoria/qualificacao',
  '/quiz/',
  '/chat',
  '/crm',
  '/reports',
  '/settings',
  '/properties',
  '/whatsapp-instances',
  '/geointeligencia',
  '/cadastro-tecnico',
  '/due-diligence',
  '/dataroom',
  '/waitlist',
  '/site-setup',
  '/visual-editor',
  '/ai-assistant',
  '/contracts',
  '/test-messages',
  '/error',
];

const NESTED_SITE_ROUTE_PREFIXES = new Set(['admin', 'rural', 'urban']);

function isTenantSitePath(path: string) {
  const segments = path.split('/').filter(Boolean);
  return (
    segments.length >= 2 &&
    segments[1] === 'site' &&
    !NESTED_SITE_ROUTE_PREFIXES.has(segments[0])
  );
}

function getTenantSlugFromSitePath(path: string) {
  return path.split('/').filter(Boolean)[0] || '';
}

function cleanHost(host: string) {
  return host.replace(/^www\./, '');
}

function cleanDomain(domain: string) {
  return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

const PUBLIC_DOMAIN_SLUGS: Record<string, string> = {
  'okaimoveis.com.br': 'okaimoveis',
  'www.okaimoveis.com.br': 'okaimoveis',
  'fazendasbrasil.com': 'fazendasbrasil',
  'www.fazendasbrasil.com': 'fazendasbrasil',
  'fazendasbrasil.com.br': 'fazendasbrasil',
  'www.fazendasbrasil.com.br': 'fazendasbrasil',
};

const DomainRouter: React.FC<DomainRouterProps> = ({ children }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';
  const initialSystemPath =
    !isTenantSitePath(window.location.pathname) &&
    (SYSTEM_ROUTES.some((route) =>
      window.location.pathname.startsWith(route)
    ) ||
      window.location.pathname === '/');

  const [isPublicSite, setIsPublicSite] = useState(false);
  const [loading, setLoading] = useState(!initialSystemPath);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const lastCheckedPath = React.useRef<string | null>(null);

  useEffect(() => {
    const currentPath = location.pathname;
    if (lastCheckedPath.current === currentPath) return;
    lastCheckedPath.current = currentPath;

    const checkRoute = async () => {
      try {
        const hostname = window.location.hostname;
        const panelUrl = getRuntimeEnv(
          'VITE_PANEL_URL',
          'https://imob.wootech.com.br'
        );
        const panelHost = cleanDomain(panelUrl);
        const currentHost = cleanHost(hostname);
        const platformHosts = new Set(getAllPlatformHosts().map(cleanHost));
        const panelCleanHost = cleanHost(panelHost);
        const isKnownPlatformHost =
          platformHosts.has(currentHost) || currentHost === panelCleanHost;

        const log = (msg: string) => {
          logger.info(msg);
          if (debugMode) {
            setDebugLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] ${msg}`,
            ]);
          }
        };

        log(`[Router] Checking: ${hostname}${currentPath}`);

        const isSystemDomain =
          hostname.includes('localhost') ||
          hostname === '127.0.0.1' ||
          isKnownPlatformHost;

        if (!isSystemDomain) {
          log(`[Router] Custom domain detected: ${hostname}`);

          if (currentPath.startsWith('/quiz/')) {
            log('[Router] Public quiz route detected');
            setIsPublicSite(false);
            setLoading(false);
            return;
          }

          const normalizedHostname = hostname.toLowerCase();
          const mappedSlug =
            PUBLIC_DOMAIN_SLUGS[normalizedHostname] ||
            PUBLIC_DOMAIN_SLUGS[currentHost];
          if (mappedSlug) {
            log(`[Router] Public domain resolved: ${mappedSlug}`);
            setResolvedSlug(mappedSlug);
            setIsPublicSite(true);
            setLoading(false);
            return;
          }

          try {
            const { data, error } = await supabase
              .rpc('get_tenant_by_domain', { domain_input: currentHost })
              .maybeSingle();

            if (data && !error) {
              const tenant = data as any;
              log(
                `[Router] Tenant found via domain: ${tenant.name} (${tenant.slug})`
              );
              setResolvedSlug(tenant.slug);
              setIsPublicSite(true);
              setLoading(false);
              return;
            }

            log(`[Router] Domain not found in DB: ${hostname}`);
          } catch (error) {
            log(`[Router] Exception checking domain: ${error}`);
          }

          setIsPublicSite(false);
          setLoading(false);
          return;
        }

        const isSystemRoute = SYSTEM_ROUTES.some(
          (route) =>
            currentPath === route ||
            currentPath.startsWith(`${route}/`) ||
            currentPath.startsWith(route)
        );

        if (!isTenantSitePath(currentPath)) {
          if (isSystemRoute || currentPath === '/') {
            log(`[Router] System route detected: ${currentPath}`);
            setIsPublicSite(false);
            setLoading(false);
            return;
          }

          const pathSegments = currentPath.split('/').filter(Boolean);
          if (pathSegments.length === 1 && isKnownPlatformHost) {
            const potentialSlug = pathSegments[0];
            log(`[Router] Potential tenant slug from path: ${potentialSlug}`);

            if (potentialSlug === 'okaimoveis') {
              log('[Router] Resolved to OKA via hardcoded slug');
              setResolvedSlug('okaimoveis');
              setIsPublicSite(true);
              setLoading(false);
              return;
            }

            try {
              const { data, error } = await supabase
                .rpc('get_tenant_public', { slug_input: potentialSlug })
                .maybeSingle();

              if (data && !error) {
                const tenant = data as any;
                log(
                  `[Router] Tenant found via slug: ${tenant.name} (${tenant.slug})`
                );
                setResolvedSlug(tenant.slug);
                setIsPublicSite(true);
                setLoading(false);
                return;
              }
            } catch (error) {
              log(`[Router] Exception resolving tenant slug: ${error}`);
            }
          }

          log(`[Router] Tenant route ignored because it is not /:slug/site`);
          setIsPublicSite(false);
          setLoading(false);
          return;
        }

        const potentialSlug = getTenantSlugFromSitePath(currentPath);
        log(`[Router] Potential tenant slug: ${potentialSlug}`);

        if (potentialSlug) {
          try {
            const { data, error } = await supabase
              .rpc('get_tenant_public', { slug_input: potentialSlug })
              .maybeSingle();

            if (data && !error) {
              const tenant = data as any;
              let customDomain = tenant.custom_domain;

              if (!customDomain) {
                const { data: orgDomain } = await supabase
                  .from('organizations')
                  .select('custom_domain')
                  .eq('slug', tenant.slug)
                  .maybeSingle();
                customDomain = orgDomain?.custom_domain;
              }

              if (
                customDomain &&
                isKnownPlatformHost &&
                currentHost === cleanHost(PANEL_HOST)
              ) {
                const targetUrl = `https://${cleanDomain(customDomain)}${window.location.search || ''}`;
                log(
                  `[Router] Redirecting tenant site to custom domain: ${targetUrl}`
                );
                window.location.replace(targetUrl);
                return;
              }

              log(`[Router] Tenant found: ${tenant.name} (${tenant.slug})`);
              setResolvedSlug(tenant.slug);
              setIsPublicSite(true);
              setLoading(false);
              return;
            }

            if (error)
              log(`[Router] RPC error: ${error.message} (${error.code})`);
          } catch (error) {
            log(`[Router] Exception resolving tenant slug: ${error}`);
          }
        }

        log('[Router] Fallback to main app');
        setIsPublicSite(false);
        setLoading(false);
      } catch (error) {
        logger.info(`[Router] Fatal error in checkRoute: ${error}`);
        setIsPublicSite(false);
        setLoading(false);
      }
    };

    checkRoute();
  }, [location.pathname, debugMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const renderDebug = () => {
    if (!debugMode) return null;
    return (
      <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-xl z-[9999] text-xs font-mono max-w-sm max-h-[80vh] overflow-auto border border-gray-700 pointer-events-auto">
        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
          <h3 className="font-bold text-green-400">Router Debug</h3>
          <button
            onClick={() => setDebugLogs([])}
            className="text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
        <div className="space-y-1">
          {debugLogs.map((log, i) => (
            <div
              key={i}
              className="break-words border-b border-gray-800 pb-1 mb-1 last:border-0"
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isPublicSite && resolvedSlug) {
    return (
      <>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          }
        >
          <PublicLandingPage forceSlug={resolvedSlug} />
        </Suspense>
        {renderDebug()}
      </>
    );
  }

  return (
    <>
      {children}
      {renderDebug()}
    </>
  );
};

export default DomainRouter;
