

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SiteSettings } from '../types';
import { DEFAULT_SITE_SETTINGS } from '../constants';
import { supabase } from '../services/supabase';


interface SettingsContextType {
  settings: SiteSettings;
  updateSettings: (newSettings: SiteSettings) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Carregar configurações do Supabase (Single Tenant)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettingsLoading(true);
        
        // Always get the first/only settings row
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .limit(1)
          .single();

        if (error) {
           console.log("Settings Load Info:", error.message);
        } else if (data) {
          setSettings({
            ...DEFAULT_SITE_SETTINGS,
            id: data.id,
            agencyName: data.agency_name || DEFAULT_SITE_SETTINGS.agencyName,
            templateId: data.template_id || DEFAULT_SITE_SETTINGS.templateId,
            primaryColor: data.primary_color || DEFAULT_SITE_SETTINGS.primaryColor,
            secondaryColor: data.secondary_color || DEFAULT_SITE_SETTINGS.secondaryColor,
            headerColor: data.header_color, 
            logoUrl: data.logo_url || DEFAULT_SITE_SETTINGS.logoUrl,
            logoHeight: data.logo_height || 80, 
            fontFamily: data.font_family || 'Inter, sans-serif',
            baseFontSize: data.base_font_size || 16,
            headingFontSize: data.heading_font_size || 48,
            contactPhone: data.contact_phone || DEFAULT_SITE_SETTINGS.contactPhone,
            contactEmail: data.contact_email || DEFAULT_SITE_SETTINGS.contactEmail,
            footerText: data.footer_text || DEFAULT_SITE_SETTINGS.footerText,
            socialLinks: {
              instagram: data.instagram_url,
              facebook: data.facebook_url,
              whatsapp: data.whatsapp_number
            },
            homeContent: data.home_content || {}, 
            integrations: data.integrations 
          });
        }
      } catch (e) {
        console.error("Erro inesperado ao carregar settings:", e);
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();
  }, []); 

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
        home_content: newSettings.homeContent, 
        integrations: newSettings.integrations,
        updated_at: new Date().toISOString()
      };

      const idToUse = newSettings.id || (settings as any).id;
      
      if (idToUse) {
        payload.id = idToUse;
      }

      const { data, error } = await supabase
        .from('site_settings')
        .upsert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
          setSettings(prev => ({ ...prev, id: data.id }));
      }

    } catch (e: any) {
      console.error("Erro ao salvar no Supabase:", e);
      alert(`Erro ao salvar configurações: ${e.message || e}`);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading: settingsLoading }}>
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

