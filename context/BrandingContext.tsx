import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApiUrl } from '../src/lib/api';
import { logger } from '../utils/logger';

interface Branding {
  organization_id: string;
  platform_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string;
  favicon_url?: string;
}

interface BrandingContextType {
  branding: Branding | null;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: null,
  loading: true,
});

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const domain = window.location.hostname;
        const response = await fetch(getApiUrl(`/api/public/branding?domain=${domain}`));
        const data = await response.json();

        if (data.success && data.branding) {
          setBranding(data.branding);
          // Apply CSS Variables globally
          const root = document.documentElement;
          if (data.branding.primary_color) {
            root.style.setProperty('--color-primary', data.branding.primary_color);
            root.style.setProperty('--color-purple-600', data.branding.primary_color); // Override default purple
          }
          if (data.branding.secondary_color) {
            root.style.setProperty('--color-secondary', data.branding.secondary_color);
          }
          if (data.branding.favicon_url) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = data.branding.favicon_url;
          }
          if (data.branding.platform_name) {
            document.title = data.branding.platform_name;
          }
        }
      } catch (err) {
        logger.error('Error fetching branding:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
