import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { siteService } from '../services/sites';
import { Site, SitePage, SiteMenuItem, SiteTemplate } from '../types/site';
import { SITE_TEMPLATES, applySiteTemplate, getSiteTemplateById } from '../constants/siteTemplates';
import GlobalSettings from '../components/SiteEditor/GlobalSettings';
import MenuEditor from '../components/SiteEditor/MenuEditor';
import { LandingPageTheme } from '../types/landingPage';
import {
  Plus, Settings, Eye, Globe, FileText, Trash2, Copy, ChevronRight,
  Layout, Palette, Check, X, Loader2, ExternalLink, ArrowLeft,
  Sparkles, PanelRightOpen, PanelRightClose,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const SiteManager: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const basePanelPath = location.pathname.startsWith('/urban') ? '/urban' : '/rural';
  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pages' | 'settings' | 'templates'>('pages');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [orgSlug, setOrgSlug] = useState<string>('');

  useEffect(() => {
    loadSite();
  }, [profile]);

  const loadSite = async () => {
    try {
      setLoading(true);
      if (!profile?.organization_id) return;

      const { data: orgData } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', profile.organization_id)
        .single();
      setOrgSlug(orgData?.slug || '');

      let siteData = await siteService.getByOrganization(profile.organization_id);

      if (!siteData) {
        const { data: newSite, error } = await supabase
          .from('sites')
          .insert({ organization_id: profile.organization_id, name: 'Meu Site' })
          .select()
          .single();

        if (newSite) {
          await supabase
            .from('site_pages')
            .insert({ site_id: newSite.id, title: 'Início', slug: 'home', sort_order: 0, status: 'published', is_home: true });
        }

        siteData = await siteService.getByOrganization(profile.organization_id);
      }

      if (siteData) {
        setSite(siteData);
        const sitePages = await siteService.listPages(siteData.id);
        setPages(sitePages);
      }
    } catch (error) {
      console.error('Erro ao carregar site:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSite = async (updates: Partial<Site>) => {
    if (!site) return;
    const updated = { ...site, ...updates };
    setSite(updated);
    setSaving(true);
    try {
      await siteService.update(site.id, updates);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePage = async () => {
    if (!site || !newPageTitle.trim()) return;
    try {
      const page = await siteService.createPage({
        siteId: site.id,
        title: newPageTitle.trim(),
        status: 'draft',
      });
      setPages([...pages, page]);
      setNewPageTitle('');
      setShowCreatePage(false);
      navigate(`${basePanelPath}/site/pages/${page.id}`);
    } catch (error) {
      console.error('Erro ao criar página:', error);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta página?')) return;
    try {
      await siteService.deletePage(pageId);
      setPages(pages.filter((p) => p.id !== pageId));
    } catch (error) {
      console.error('Erro ao excluir página:', error);
    }
  };

  const handleDuplicatePage = async (pageId: string) => {
    try {
      const dup = await siteService.duplicatePage(pageId);
      setPages([...pages, dup]);
    } catch (error) {
      console.error('Erro ao duplicar página:', error);
    }
  };

  const handlePublishPage = async (pageId: string, publish: boolean) => {
    try {
      const updated = publish
        ? await siteService.publishPage(pageId)
        : await siteService.unpublishPage(pageId);
      setPages(pages.map((p) => (p.id === pageId ? updated : p)));
    } catch (error) {
      console.error('Erro ao publicar/despublicar:', error);
    }
  };

  const applyTemplate = async (template: SiteTemplate) => {
    if (!site) return;
    const orgName = profile?.organization?.name || 'Imobiliária';
    const result = applySiteTemplate(template, orgName);

    setSaving(true);
    try {
      await siteService.update(site.id, {
        name: result.name,
        globalTheme: result.globalTheme,
        menuConfig: result.menuConfig,
      });

      for (const pageData of result.pages) {
        await siteService.createPage({
          siteId: site.id,
          ...pageData,
        });
      }

      setShowTemplateModal(false);
      await loadSite();
    } catch (error) {
      console.error('Erro ao aplicar template:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  const siteUrl = orgSlug ? `${window.location.origin}/site/${orgSlug}` : '#';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Meu Site</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie o site da sua imobiliária</p>
        </div>
        <div className="flex items-center gap-3">
          {site && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Eye size={16} /> Ver Site
            </a>
          )}
          {saving && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Salvando...
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 border border-gray-700">
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'pages' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <FileText size={16} /> Páginas
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <Palette size={16} /> Configurações
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'templates' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <Sparkles size={16} /> Templates
        </button>
      </div>

      {/* Content */}
      {activeTab === 'pages' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Páginas do Site</h2>
            <button
              onClick={() => setShowCreatePage(!showCreatePage)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Nova Página
            </button>
          </div>

          {showCreatePage && (
            <div className="flex gap-2 mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <input
                type="text"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                placeholder="Nome da página..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600 focus:border-indigo-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePage()}
                autoFocus
              />
              <button onClick={handleCreatePage} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium">
                <Check size={16} />
              </button>
              <button onClick={() => setShowCreatePage(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-medium">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="space-y-2">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-indigo-400" />
                  <div>
                    <span className="text-white font-medium">
                      {page.title}
                      {page.isHome && <span className="ml-2 text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded">Home</span>}
                    </span>
                    <div className="text-xs text-gray-500 mt-0.5">/{page.slug}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${page.status === 'published' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {page.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePublishPage(page.id, page.status !== 'published')}
                    className={`p-2 rounded ${page.status === 'published' ? 'text-yellow-400 hover:bg-gray-700' : 'text-green-400 hover:bg-gray-700'}`}
                    title={page.status === 'published' ? 'Despublicar' : 'Publicar'}
                  >
                    {page.status === 'published' ? <Eye size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => handleDuplicatePage(page.id)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                    title="Duplicar"
                  >
                    <Copy size={16} />
                  </button>
                  {!page.isHome && (
                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`${basePanelPath}/site/pages/${page.id}`)}
                    className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    Editar <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}

            {pages.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText size={48} className="mx-auto mb-3 opacity-30" />
                <p>Nenhuma página criada ainda</p>
                <p className="text-sm mt-1">Clique em "Nova Página" para começar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && site && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <GlobalSettings
            site={site}
            pages={pages}
            onUpdate={handleUpdateSite}
          />
        </div>
      )}

      {activeTab === 'templates' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Modelos de Site</h2>
            <p className="text-gray-400 text-sm mt-1">Escolha um modelo pré-pronto para começar rapidamente</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SITE_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-indigo-500/50 transition-all group"
              >
                <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <Layout size={48} className="text-gray-600" />
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold">{template.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">{template.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                      {template.pages.length} páginas
                    </span>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded capitalize">
                      {template.category}
                    </span>
                  </div>
                  <button
                    onClick={() => applyTemplate(template)}
                    className="w-full mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Usar este Modelo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteManager;
