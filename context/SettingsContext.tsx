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

interface SettingsContextType {
  settings: SiteSettings;
  updateSettings: (newSettings: SiteSettings) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

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
          console.log(
            '📡 [SettingsContext] No organization ID available, using defaults.'
          );
          if (isMounted) {
            setSettings(DEFAULT_SITE_SETTINGS);
          }
          return;
        }

        console.log(
          `📡 [SettingsContext] Loading site settings for org: ${activeOrgId}...`
        );

        // Fetch specific organization settings
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('organization_id', activeOrgId)
          .maybeSingle();

        if (error) {
          console.warn('⚠️ [SettingsContext] Load Error:', error.message);
        } else if (data && isMounted) {
          console.log(
            '✅ [SettingsContext] Settings loaded:',
            data.agency_name
          );
          setSettings({
            ...DEFAULT_SITE_SETTINGS,
            id: data.id,
            agencyName: data.agency_name,
            primaryColor:
              data.primary_color || DEFAULT_SITE_SETTINGS.primaryColor,
            secondaryColor:
              data.secondary_color || DEFAULT_SITE_SETTINGS.secondaryColor,
            headerColor: data.header_color,
            logoUrl: data.logo_url,
            logoHeight: data.logo_height,
            isLive: data.is_live ?? false, // Mapeamento do status de manutenção
            fontFamily: data.font_family,
            baseFontSize: data.base_font_size,
            headingFontSize: data.heading_font_size,
            footerText: data.footer_text,
            templateId: data.template_id,
            socialLinks: {
              instagram: data.instagram_url,
              facebook: data.facebook_url,
              whatsapp: data.whatsapp_number,
            },
            homeContent: data.home_content || {},
            integrations: data.integrations,
          });
        }
      } catch (e) {
        console.error('❌ [SettingsContext] Unexpected error:', e);
      } finally {
        if (isMounted) {
          console.log('🏁 [SettingsContext] finished loading cycle.');
          setSettingsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [propsOrgId, profileOrgId, authLoading]);

  const updateSettings = async (newSettings: SiteSettings) => {
    setSettings(newSettings);

    try {
      const payload: any = {
        agency_name: newSettings.agencyName,
        primary_color: newSettings.primaryColor,
        secondary_color: newSettings.secondaryColor,
        header_color: newSettings.headerColor,
        logo_url: newSettings.logoUrl,
        logo_height: newSettings.logoHeight,
        font_family: newSettings.fontFamily,
        base_font_size: newSettings.baseFontSize,
        heading_font_size: newSettings.headingFontSize,
        footer_text: newSettings.footerText,
        template_id: newSettings.templateId,
        instagram_url: newSettings.socialLinks?.instagram,
        facebook_url: newSettings.socialLinks?.facebook,
        whatsapp_number: newSettings.socialLinks?.whatsapp,
        social_links: newSettings.socialLinks,
        is_live: newSettings.isLive,
        home_content: newSettings.homeContent,
        integrations: newSettings.integrations,
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

      const { data, error } = await supabase
        .from('site_settings')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSettings((prev) => ({ ...prev, id: data.id }));
      }
    } catch (e: any) {
      console.error('Erro ao salvar no Supabase:', e);
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
