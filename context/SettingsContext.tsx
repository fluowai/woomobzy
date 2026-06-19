import { logger } from '@/utils/logger';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { SiteSettings } from '../types';
import { DEFAULT_SITE_SETTINGS } from '../constants';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { callApi } from '../src/lib/api';

interface SettingsContextType {
  settings: SiteSettings;
  updateSettings: (newSettings: SiteSettings) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

const LEGACY_ORANGE_COLORS = new Set(['#ff6b00', '#f97316', '#ea580c', '#ff6600']);
const normalizeBrandColor = (color?: string | null) => {
  if (!color) return DEFAULT_SITE_SETTINGS.primaryColor;
  return LEGACY_ORANGE_COLORS.has(color.trim().toLowerCase())
    ? DEFAULT_SITE_SETTINGS.primaryColor
    : color;
};

const sanitizeClientIntegrations = (integrations: SiteSettings['integrations']) => {
  if (!integrations) return integrations;
  const safe = { ...integrations };
  if (safe.orulo) {
    safe.orulo = { enabled: safe.orulo.enabled };
  }
  return safe;
};

export const SettingsProvider: React.FC<{
  children: ReactNode;
  organizationId?: string;
}> = ({ children, organizationId: propsOrgId }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Use Auth context, safely handling if it's missing (though it shouldn't be in this app structure)
  let authContext: any = null;
  try {
    authContext = useAuth();
  } catch (e) {
    // If used completely outside AuthProvider
  }
  const profileOrgId = authContext?.profile?.organization_id;
  const authLoading = authContext?.loading || false;

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      // Determine which organization ID to load settings for
      const activeOrgId = propsOrgId || profileOrgId;

      // If no explicit org ID is provided and auth is still loading, wait before fetching
      if (!propsOrgId && authLoading) {
        return;
      }

      try {
        if (isMounted) setSettingsLoading(true);

        if (!activeOrgId) {
          logger.info(
            '📡 [SettingsContext] No organization ID available, using defaults.'
          );
          if (isMounted) {
            setSettings(DEFAULT_SITE_SETTINGS);
          }
          return;
        }

        logger.info(
          `📡 [SettingsContext] Loading site settings for org: ${activeOrgId}...`
        );

        // Fetch specific organization settings
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('organization_id', activeOrgId)
          .maybeSingle();

        if (error) {
          logger.warn('⚠️ [SettingsContext] Load Error:', error.message);
        } else if (data && isMounted) {
          const layoutConfig = data.layout_config || {};
          logger.info(
            '✅ [SettingsContext] Settings loaded:',
            data.agency_name
          );
          setSettings({
            ...DEFAULT_SITE_SETTINGS,
            id: data.id,
            agencyName: data.agency_name,
            primaryColor: normalizeBrandColor(data.primary_color),
            secondaryColor:
              data.secondary_color || DEFAULT_SITE_SETTINGS.secondaryColor,
            headerColor: data.header_color,
            logoUrl: data.logo_url,
            logoHeight: layoutConfig.logoHeight,
            isLive: layoutConfig.isLive ?? false,
            fontFamily: layoutConfig.fontFamily,
            baseFontSize: layoutConfig.baseFontSize,
            headingFontSize: layoutConfig.headingFontSize,
            footerText: data.footer_text,
            templateId: layoutConfig.templateId || DEFAULT_SITE_SETTINGS.templateId,
            contactEmail: data.contact_email || DEFAULT_SITE_SETTINGS.contactEmail,
            contactPhone:
              data.contact_phone ||
              data.social_links?.whatsapp ||
              DEFAULT_SITE_SETTINGS.contactPhone,
            socialLinks: {
              instagram: data.social_links?.instagram || data.instagram_url,
              facebook: data.social_links?.facebook || data.facebook_url,
              whatsapp: data.social_links?.whatsapp || data.whatsapp_url,
              youtube: data.social_links?.youtube || data.youtube_url,
              linkedin: data.social_links?.linkedin || data.linkedin_url,
            },
            homeContent: layoutConfig.homeContent || {},
            integrations: sanitizeClientIntegrations(data.integrations),
          });
        }
      } catch (e) {
        logger.error('❌ [SettingsContext] Unexpected error:', e);
      } finally {
        if (isMounted) {
          logger.info('🏁 [SettingsContext] finished loading cycle.');
          setSettingsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [propsOrgId, profileOrgId, authLoading]);

  // Apply settings to CSS variables whenever settings change
  useEffect(() => {
    const root = document.documentElement;

    const hexToRgb = (hex: string): string | null => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return null;
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    };

    if (settings.primaryColor) {
      root.style.setProperty('--color-primary', settings.primaryColor);
      const rgb = hexToRgb(settings.primaryColor);
      if (rgb) {
        root.style.setProperty('--color-primary-alpha-10', `rgba(${rgb}, 0.1)`);
        root.style.setProperty('--color-primary-alpha-15', `rgba(${rgb}, 0.15)`);
        root.style.setProperty('--color-primary-alpha-20', `rgba(${rgb}, 0.2)`);
      }
    }
    if (settings.secondaryColor) {
      root.style.setProperty('--color-accent', settings.secondaryColor);
    }
    if (settings.fontFamily) {
      root.style.setProperty('--font-sans', `'${settings.fontFamily}', system-ui, sans-serif`);
    }
  }, [settings]);


  const updateSettings = async (newSettings: SiteSettings) => {
    setSettings(newSettings);

    try {
      const payload: any = {
        agency_name: newSettings.agencyName,
        primary_color: newSettings.primaryColor,
        secondary_color: newSettings.secondaryColor,
        header_color: newSettings.headerColor,
        logo_url: newSettings.logoUrl,
        footer_text: newSettings.footerText,
        social_links: newSettings.socialLinks,
        facebook_url: newSettings.socialLinks?.facebook,
        instagram_url: newSettings.socialLinks?.instagram,
        whatsapp_url: newSettings.socialLinks?.whatsapp,
        youtube_url: newSettings.socialLinks?.youtube,
        linkedin_url: newSettings.socialLinks?.linkedin,
        layout_config: {
          logoHeight: newSettings.logoHeight,
          fontFamily: newSettings.fontFamily,
          baseFontSize: newSettings.baseFontSize,
          headingFontSize: newSettings.headingFontSize,
          templateId: newSettings.templateId,
          isLive: newSettings.isLive,
          homeContent: newSettings.homeContent,
        },
        integrations: sanitizeClientIntegrations(newSettings.integrations),
        contact_email: newSettings.contactEmail,
        contact_phone: newSettings.contactPhone,
        updated_at: new Date().toISOString(),
      };

      const idToUse = newSettings.id || (settings as any).id;

      if (idToUse) {
        payload.id = idToUse;
      }

      // AUDIT FIX: Always include organization_id to prevent orphan records
      const activeOrgId = propsOrgId || profileOrgId;
      if (activeOrgId) {
        payload.organization_id = activeOrgId;
      }

      const response = await callApi('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = response.settings;
      const ignoredMissingColumns = response.ignoredMissingColumns || [];

      if (ignoredMissingColumns.length > 0) {
        logger.warn(
          'Site settings salvas ignorando colunas ausentes no schema:',
          ignoredMissingColumns
        );
      }

      if (data) {
        setSettings((prev) => ({ ...prev, id: data.id }));
      }
    } catch (e: any) {
      logger.error('Erro ao salvar no Supabase:', e);
      alert(`Erro ao salvar configurações: ${e.message || e}`);
    }
  };

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, loading: settingsLoading }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings deve ser usado dentro de um SettingsProvider');
  }
  return context;
};
