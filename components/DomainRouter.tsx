import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useTexts } from '../context/TextsContext';
import PublicLandingPage from '../views/PublicLandingPage';

interface DomainRouterProps {
    children: React.ReactNode;
}

const DomainRouter: React.FC<DomainRouterProps> = ({ children }) => {
    const [isPublicSite, setIsPublicSite] = useState(false);
    const [loading, setLoading] = useState(true);
    const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
    const location = useLocation(); 
    const { isVisualMode } = useTexts();
    
    // Debug Logic
    const [searchParams] = useSearchParams();
    const debugMode = searchParams.get('debug') === 'true';
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    
    useEffect(() => {
        const checkRoute = async () => {
             const hostname = window.location.hostname;
             const path = window.location.pathname;

             const log = (msg: string) => {
                 console.log(msg);
                 if (debugMode) setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
             };

             log(`🌍 [Router] Checking: ${hostname}${path}`);


             // 1. Whitelist (System Domains)


             // 1. Whitelist (System Domains)
             const panelUrl = import.meta.env.VITE_PANEL_URL || '';
             // Remove protocol and trailing slash
             const panelHost = panelUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
             
             // Normalize current hostname (remove www.)
             const cleanHostname = hostname.replace(/^www\./, '');
             const cleanPanelHost = panelHost.replace(/^www\./, '');







             const isSystemDomain = 
                 hostname.includes('localhost') || 
                 hostname.includes('vercel.app') || 
                 hostname === 'app.imobisaas.com.br' ||
                 hostname === panelHost;


             // 2. Custom Domain Logic
             if (!isSystemDomain) {
                 log(`🌍 [Router] Custom Domain detected: ${hostname}`);
                 
                 // Try to resolve tenant by domain
                 try {
                     const { data, error } = await supabase
                         .rpc('get_tenant_by_domain', { domain_input: cleanHostname })
                         .single();

                     if (data && !error) {
                         log(`✅ [Router] Tenant Found via Domain: ${data.name} (${data.slug})`);
                         setResolvedSlug(data.slug);
                         setIsPublicSite(true);
                         setLoading(false);
                         return;
                     } else {
                         log(`❌ [Router] Domain not found in DB: ${hostname}`);
                         // If domain points here but not in DB, maybe show a generic "Domain not connected" or 404
                         // For now, fall through to main app or just show nothing? 
                         // Better to show the main app (maybe they are just testing CNAME) or a 404.
                         // Let's set isPublicSite=true but slug=null to trigger a 404/Empty view if we confuse it?
                         // Actually, if we return here with slug=null, it renders {children} which is the Main App.
                         // This is confusing for a random domain. 
                         // But let's stick to current behavior (render children) for fallback.
                     }
                 } catch (e) {
                     log(`❌ [Router] Exception checking domain: ${e}`);
                 }
                
                // If we didn't return above (domain not found), fallback to Main App 
                 setIsPublicSite(false);
                 setLoading(false);
                 return;
             }

             // 3. Sub-path Logic (Slug)
             const systemRoutes = ['/login', '/register', '/onboarding', '/admin', '/superadmin', '/impersonate', '/lp/'];
             const isSystemRoute = systemRoutes.some(r => path.startsWith(r));

             if (isSystemRoute || path === '/') {
                 log(`⚡ [Router] System Route: ${path}`);
                 setIsPublicSite(false);
                 setLoading(false);
                 return;
             }

             // Extract potential slug
             const potentialSlug = path.split('/')[1]; 
             log(`🔍 [Router] Potential Slug: ${potentialSlug}`);

             if (potentialSlug) {
                 log(`🔄 [Router] Calling RPC get_tenant_public...`);
                 try {
                     const { data, error } = await supabase
                         .rpc('get_tenant_public', { slug_input: potentialSlug })
                         .single();

                     if (data && !error) {
                         log(`✅ [Router] Tenant Found: ${data.name} (${data.slug})`);
                         setResolvedSlug(data.slug);
                         setIsPublicSite(true);
                         setLoading(false);
                         return;
                     } else {
                         if(error) log(`❌ [Router] RPC Error: ${error.message} (${error.code})`);
                         else log(`⚠️ [Router] RPC returned no data`);
                     }
                 } catch (e) {
                     log(`❌ [Router] Exception: ${e}`);
                 }
             } else {
                 log(`⚠️ [Router] No slug found in path`);
             }

             log(`🛑 [Router] Fallback to Main App (Not a tenant route)`);
             // Default: Render main app
             setIsPublicSite(false);
             setLoading(false);
        };

        checkRoute();
        
    }, [location.pathname, debugMode]); 


    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

    const renderDebug = () => {
        if (!debugMode) return null;
        return (
             <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-xl z-[9999] text-xs font-mono max-w-sm max-h-[80vh] overflow-auto border border-gray-700 pointer-events-auto">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
                    <h3 className="font-bold text-green-400">🔍 Router Debug</h3>
                    <button onClick={() => setDebugLogs([])} className="text-gray-400 hover:text-white">Clear</button>
                </div>
                <div className="space-y-1">
                    {debugLogs.map((log, i) => (
                        <div key={i} className="break-words border-b border-gray-800 pb-1 mb-1 last:border-0">{log}</div>
                    ))}
                </div>
            </div>
        );
    };

    if (isPublicSite && resolvedSlug) {
        return (
            <>
                <PublicLandingPage forceSlug={resolvedSlug} />
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
