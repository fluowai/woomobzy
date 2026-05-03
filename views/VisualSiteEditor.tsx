import { logger } from '@/utils/logger';
import React, { useEffect, useState, useRef } from 'react';
import { useTexts } from '../context/TextsContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { landingPageService } from '../services/landingPages';
import { geminiService } from '../services/geminiService';
import {
  Loader2,
  Globe,
  ArrowLeft,
  Smartphone,
  Monitor,
  Layout,
  Upload,
  Palette,
  Sparkles,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LANDING_PAGE_TEMPLATES,
  generateBlocksFromTemplate,
} from '../services/landingPageTemplates';

const VisualSiteEditor: React.FC = () => {
  const { setVisualMode } = useTexts();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'mobile'>(
    'desktop'
  );

  const [pageId, setPageId] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // States para a IA Logotipo
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    setVisualMode(true);

    const resolveSiteRoute = async () => {
      try {
        if (!profile?.organization_id) return;
        setOrgId(profile.organization_id);

        const { data: orgData } = await supabase
          .from('organizations')
          .select('slug')
          .eq('id', profile.organization_id)
          .single();

        const targetSlug = orgData?.slug || 'main';
        setSiteSlug(targetSlug);

        // Fetch Main Landing Page
        const { data: lpData } = await supabase
          .from('landing_pages')
          .select('id, theme_config')
          .eq('organization_id', profile.organization_id)
          .eq('status', 'published')
          .in('slug', ['home', 'inicio', 'index', 'main', 'site', targetSlug])
          .limit(1)
          .maybeSingle();

        if (lpData) {
          setPageId(lpData.id);
          setCurrentTheme(lpData.theme_config || {});
        }
      } catch (error) {
        logger.error('Erro ao resolver slug:', error);
      } finally {
        setLoading(false);
      }
    };

    resolveSiteRoute();

    return () => {
      setVisualMode(false);
    };
  }, [profile, setVisualMode]);

  const reloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.location.reload();
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!pageId) return alert('Página principal não encontrada.');
    if (
      !confirm(
        'Deseja aplicar este modelo? A estrutura da página será substituída pelo novo modelo.'
      )
    )
      return;

    const template = LANDING_PAGE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    try {
      setSaving(true);
      const newBlocks = generateBlocksFromTemplate(template.blocks);

      await landingPageService.update(pageId, {
        themeConfig: template.themeConfig,
        blocks: newBlocks,
      });

      setCurrentTheme(template.themeConfig);
      reloadIframe();
    } catch (error) {
      logger.error('Erro ao aplicar template:', error);
      alert('Erro ao mudar de modelo.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !pageId) return;
    const file = e.target.files[0];

    try {
      setUploadingLogo(true);

      // Converte para Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);

        // EXTRAÇÃO DE CORES COM A IA (Gemini)
        const extractedColors = await geminiService.extractColorsFromLogo(
          base64,
          file.type
        );

        // Atualiza a Página com as Novas Cores
        const updatedTheme = {
          ...currentTheme,
          primaryColor: extractedColors.primaryColor,
          secondaryColor: extractedColors.secondaryColor,
        };

        await landingPageService.update(pageId, {
          themeConfig: updatedTheme,
        });

        setCurrentTheme(updatedTheme);

        // Opcional: Atualizar a logo global no siteSettings
        if (orgId) {
          try {
            await supabase.from('site_settings').upsert(
              {
                organization_id: orgId,
                logo: base64,
              },
              { onConflict: 'organization_id' }
            );
          } catch (err) {
            logger.warn(
              'Silent skip se a logo nao for suportada via base64 na DB local.',
              err
            );
          }
        }

        alert(
          '✨ A IA detectou as cores da sua logo e o tema do site foi atualizado!'
        );
        reloadIframe();
        setUploadingLogo(false);
      };
    } catch (error) {
      logger.error('Erro no processamento da logo:', error);
      alert('Erro ao enviar a logo.');
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* Topbar do Editor Visual */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shrink-0 z-10 relative shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm text-gray-300 border border-gray-600"
          >
            <ArrowLeft size={16} /> Voltar
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${isSidebarOpen ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
          >
            <Layout size={16} /> Opções Globais
          </button>

          <div className="flex items-center gap-2 font-semibold text-indigo-400 border-l border-gray-600 pl-4 ml-2">
            <Globe size={18} />
            <span>Construtor Visual</span>
          </div>

          <span className="text-xs text-green-400 bg-green-900/30 border border-green-800/50 px-2 py-1 rounded ml-2 hidden md:inline-block">
            Modo 100% Editável Ativo: Clique em qualquer texto para editar
          </span>
        </div>

        <div className="flex items-center gap-3">
          {saving && (
            <Loader2 className="animate-spin text-gray-400" size={16} />
          )}

          {/* Controls mobile/desktop view */}
          <div className="flex bg-gray-700 p-1 rounded-lg border border-gray-600">
            <button
              onClick={() => setActiveDevice('desktop')}
              className={`p-1.5 rounded ${activeDevice === 'desktop' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              title="Desktop View"
            >
              <Monitor size={16} />
            </button>
            <button
              onClick={() => setActiveDevice('mobile')}
              className={`p-1.5 rounded ${activeDevice === 'mobile' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              title="Mobile View"
            >
              <Smartphone size={16} />
            </button>
          </div>

          <button
            onClick={() => window.open(`/site/${siteSlug}`, '_blank')}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg border border-indigo-500"
          >
            Ver Live <Globe size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Painel Lateral */}
        <div
          className={`absolute lg:relative z-20 h-full bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden border-none'}`}
        >
          {isSidebarOpen && (
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-5 w-80">
              {/* Seção Logo / Cores */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Palette size={16} /> Identidade Visual
                </h3>

                <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4">
                  <label className="block mb-2 text-sm font-medium text-gray-200">
                    Logo Inteligente (IA)
                  </label>
                  <p className="text-xs text-gray-400 mb-4">
                    Faça upload da sua logo e a IA configurará as cores do seu
                    site instantaneamente.
                  </p>

                  {logoPreview && (
                    <div className="mb-4 bg-white/10 rounded-lg p-2 flex justify-center text-center">
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="h-16 object-contain"
                      />
                    </div>
                  )}

                  {currentTheme && (
                    <div className="flex items-center gap-3 mb-4 justify-center">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-8 h-8 rounded-full shadow-lg border-2 border-gray-500"
                          style={{ backgroundColor: currentTheme.primaryColor }}
                        />
                        <span className="text-[10px] text-gray-400">
                          Primária
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-8 h-8 rounded-full shadow-lg border-2 border-gray-500"
                          style={{
                            backgroundColor: currentTheme.secondaryColor,
                          }}
                        />
                        <span className="text-[10px] text-gray-400">
                          Secundária
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      disabled={uploadingLogo}
                    />
                    <label
                      htmlFor="logo-upload"
                      className={`flex items-center justify-center gap-2 w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:shadow-lg transition-all border border-indigo-400 ${uploadingLogo && 'opacity-50 cursor-not-allowed'}`}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      {uploadingLogo
                        ? 'Analisando cores...'
                        : 'Subir Logo com IA'}
                    </label>
                  </div>
                </div>
              </div>

              {/* Seção Templates */}
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layout size={16} /> Modelos Prontos (
                  {window.location.pathname.includes('/rural')
                    ? 'Rural'
                    : 'Urbano'}
                  )
                </h3>

                <div className="space-y-3">
                  {LANDING_PAGE_TEMPLATES.filter((t) =>
                    window.location.pathname.includes('/rural')
                      ? t.category !== 'Urban'
                      : t.category === 'Urban'
                  )
                    .slice(0, 5)
                    .map((template) => (
                      <div
                        key={template.id}
                        onClick={() => handleApplyTemplate(template.id)}
                        className="bg-gray-800 border border-gray-600 rounded-lg p-3 cursor-pointer hover:border-indigo-500 hover:bg-gray-700 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl filter drop-shadow-md">
                            {template.thumbnail}
                          </span>
                          <div className="flex gap-1">
                            <div
                              className="w-3 h-3 rounded-full shadow-sm"
                              style={{
                                backgroundColor:
                                  template.themeConfig.primaryColor,
                              }}
                            />
                            <div
                              className="w-3 h-3 rounded-full shadow-sm"
                              style={{
                                backgroundColor:
                                  template.themeConfig.secondaryColor,
                              }}
                            />
                          </div>
                        </div>
                        <h4 className="font-semibold text-sm text-gray-200 group-hover:text-indigo-400 transition-colors">
                          {template.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {template.category}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Área de Visualização do Iframe */}
        <div className="flex-1 overflow-hidden flex items-start pt-6 justify-center bg-black/95 relative p-4">
          <div
            className="transition-all duration-300 ease-in-out bg-white shadow-2xl overflow-hidden rounded-t-xl mx-auto ring-1 ring-gray-800"
            style={{
              width: activeDevice === 'desktop' ? '100%' : '375px',
              height: '100%',
              maxWidth: activeDevice === 'desktop' ? '1440px' : '375px',
            }}
          >
            <iframe
              ref={iframeRef}
              src={`/site/${siteSlug}`}
              className="w-full h-full border-none"
              title="Editor Visual"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualSiteEditor;
