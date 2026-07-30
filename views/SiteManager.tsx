import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { siteService } from '../services/sites';
import { Site, SitePage, SiteTemplate } from '../types/site';
import { SITE_TEMPLATES, applySiteTemplate } from '../constants/siteTemplates';
import GlobalSettings from '../components/SiteEditor/GlobalSettings';
import PropertySelectionPanel from '../components/SiteEditor/PropertySelectionPanel';
import {
  Plus,
  Eye,
  Globe,
  FileText,
  Trash2,
  Copy,
  Layout,
  Palette,
  Check,
  X,
  Loader2,
  ExternalLink,
  Sparkles,
  Wand2,
  PenTool,
  Home,
  Building2,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const SiteManager: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const basePanelPath = location.pathname.startsWith('/urban')
    ? '/urban'
    : '/rural';
  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'pages' | 'settings' | 'templates' | 'imoveis'
  >('pages');
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [orgSlug, setOrgSlug] = useState<string>('');
  const [tableError, setTableError] = useState(false);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);

  useEffect(() => {
    loadSite();
  }, [profile]);

  const loadSite = async () => {
    try {
      setLoading(true);
      setTableError(false);
      if (!profile?.organization_id) return;

      const { data: orgData } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', profile.organization_id)
        .single();
      setOrgSlug(orgData?.slug || '');

      let siteData: Site | null = null;
      try {
        siteData = await siteService.getByOrganization(profile.organization_id);
      } catch (fetchError: any) {
        if (
          fetchError?.code === '42P01' ||
          fetchError?.status === 404 ||
          String(fetchError?.message || '').includes('does not exist') ||
          String(fetchError?.message || '').includes('404')
        ) {
          setTableError(true);
          setLoading(false);
          return;
        }
        throw fetchError;
      }

      if (siteData) {
        setSite(siteData);
        const sitePages = await siteService.listPages(siteData.id);
        setPages(sitePages);
      }
    } catch (error) {
      logger.error('Erro ao carregar site:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSiteFromTemplate = async (template: SiteTemplate) => {
    if (!profile?.organization_id) return;

    setCreatingFromTemplate(true);
    try {
      const orgName = profile?.organization?.name || 'Imobiliária';

      const { data: newSite, error: siteError } = await supabase
        .from('sites')
        .insert({
          organization_id: profile.organization_id,
          name: `${orgName} Site`,
          global_theme: template.globalTheme,
          menu_config: template.menuConfig,
        })
        .select()
        .single();

      if (siteError) throw siteError;

      for (const pageData of template.pages) {
        await siteService.createPage({
          siteId: newSite.id,
          title: pageData.title,
          slug: pageData.slug,
          sortOrder: template.pages.indexOf(pageData),
          blocks: pageData.blocks as any[],
          status: 'published',
          isHome: pageData.isHome,
        });
      }

      await loadSite();
    } catch (error) {
      logger.error('Erro ao criar site:', error);
      alert('Erro ao criar site. Tente novamente.');
    } finally {
      setCreatingFromTemplate(false);
    }
  };

  const handleCreateBlankSite = async () => {
    if (!profile?.organization_id) return;

    setCreatingFromTemplate(true);
    try {
      const orgName = profile?.organization?.name || 'Imobiliária';

      const { data: newSite, error: siteError } = await supabase
        .from('sites')
        .insert({
          organization_id: profile.organization_id,
          name: `${orgName} Site`,
        })
        .select()
        .single();

      if (siteError) throw siteError;

      await supabase.from('site_pages').insert({
        site_id: newSite.id,
        title: 'Início',
        slug: 'home',
        sort_order: 0,
        status: 'published',
        is_home: true,
      });

      await loadSite();
    } catch (error) {
      logger.error('Erro ao criar site:', error);
      alert('Erro ao criar site. Tente novamente.');
    } finally {
      setCreatingFromTemplate(false);
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
      logger.error('Erro ao salvar:', error);
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
      logger.error('Erro ao criar página:', error);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta página?')) return;
    try {
      await siteService.deletePage(pageId);
      setPages(pages.filter((p) => p.id !== pageId));
    } catch (error) {
      logger.error('Erro ao excluir página:', error);
    }
  };

  const handleDuplicatePage = async (pageId: string) => {
    try {
      const dup = await siteService.duplicatePage(pageId);
      setPages([...pages, dup]);
    } catch (error) {
      logger.error('Erro ao duplicar página:', error);
    }
  };

  const handlePublishPage = async (pageId: string, publish: boolean) => {
    try {
      const updated = publish
        ? await siteService.publishPage(pageId)
        : await siteService.unpublishPage(pageId);
      setPages(pages.map((p) => (p.id === pageId ? updated : p)));
    } catch (error) {
      logger.error('Erro ao publicar/despublicar:', error);
    }
  };

  const handleApplyTemplate = async (template: SiteTemplate) => {
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

      await loadSite();
    } catch (error) {
      logger.error('Erro ao aplicar template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditPage = (pageId: string) => {
    navigate(`${basePanelPath}/site/pages/${pageId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (tableError) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Meu Site</h1>
            <p className="text-gray-400 text-sm mt-1">
              Gerencie o site da sua imobiliária
            </p>
          </div>
        </div>
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-8 text-center">
          <Globe size={48} className="mx-auto mb-4 text-yellow-400" />
          <h2 className="text-xl font-bold text-white mb-2">
            Tabela de sites não configurada
          </h2>
          <p className="text-gray-400 max-w-md mx-auto mb-4">
            A tabela{' '}
            <code className="bg-gray-800 px-2 py-0.5 rounded text-yellow-300">
              sites
            </code>{' '}
            não foi encontrada no banco de dados. Execute o script de migração
            no Supabase para habilitar o construtor de sites.
          </p>
          <p className="text-gray-500 text-sm">
            Arquivo:{' '}
            <code className="bg-gray-800 px-2 py-0.5 rounded">
              sql/setup_site_builder.sql
            </code>
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // WELCOME SCREEN: No site created yet
  // ============================================
  if (!site) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-lg shadow-indigo-500/25">
            <Globe size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Crie o Site da sua Imobiliária
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto text-lg">
            Escolha um template profissional para começar rapidamente ou comece
            do zero com total liberdade.
          </p>
        </div>

        {creatingFromTemplate ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
            <p className="text-gray-300 text-lg">Criando seu site...</p>
            <p className="text-gray-500 text-sm mt-1">
              Configurando páginas e tema
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Blank option */}
            <button
              onClick={handleCreateBlankSite}
              className="group bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700 hover:border-indigo-500/50 p-6 text-left transition-all hover:bg-gray-800"
            >
              <div className="w-14 h-14 rounded-xl bg-gray-700/50 group-hover:bg-indigo-600/20 flex items-center justify-center mb-4 transition-colors">
                <Plus
                  size={28}
                  className="text-gray-500 group-hover:text-indigo-400 transition-colors"
                />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">
                Em Branco
              </h3>
              <p className="text-gray-400 text-sm">
                Comece do zero com total flexibilidade
              </p>
            </button>

            {/* Template cards */}
            {SITE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleCreateSiteFromTemplate(template)}
                className="group bg-gray-800 rounded-2xl border border-gray-700 hover:border-indigo-500/50 overflow-hidden text-left transition-all hover:shadow-lg hover:shadow-indigo-500/10"
              >
                <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center relative overflow-hidden">
                  {template.thumbnail ? (
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Layout
                      size={36}
                      className="text-gray-600 group-hover:text-indigo-400 transition-colors"
                    />
                  )}
                  <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2">
                      <Wand2 size={14} /> Usar Template
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-white font-semibold mb-1">
                    {template.name}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                      {template.pages.length} páginas
                    </span>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded capitalize">
                      {template.category}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // DASHBOARD: Site exists - manage pages, settings, templates
  // ============================================
  const siteUrl = orgSlug ? `${window.location.origin}/sites/${orgSlug}` : '#';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Globe size={28} className="text-indigo-400" />
            {site.name}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {pages.length} {pages.length === 1 ? 'página' : 'páginas'}{' '}
            {pages.filter((p) => p.status === 'published').length} publicadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saving && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Salvando...
            </span>
          )}
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Globe size={16} /> Ver Site em Produção
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 border border-gray-700">
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${activeTab === 'pages' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
        >
          <FileText size={16} /> Páginas
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
        >
          <Palette size={16} /> Configurações
        </button>
        <button
          onClick={() => setActiveTab('imoveis')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${activeTab === 'imoveis' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
        >
          <Home size={16} /> Imóveis
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${activeTab === 'templates' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
        >
          <Sparkles size={16} /> Templates
        </button>
      </div>

      {/* Content */}
      {activeTab === 'pages' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">
              Páginas do Site
            </h2>
            <button
              onClick={() => setShowCreatePage(!showCreatePage)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
            >
              <Plus size={16} /> Nova Página
            </button>
          </div>

          {showCreatePage && (
            <div className="flex gap-2 mb-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
              <input
                type="text"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                placeholder="Nome da página (ex: Sobre Nós, Contato...)"
                className="flex-1 bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePage()}
                autoFocus
              />
              <button
                onClick={handleCreatePage}
                className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
              >
                <Check size={16} /> Criar
              </button>
              <button
                onClick={() => setShowCreatePage(false)}
                className="px-4 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="space-y-2">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">
                        {page.title}
                      </span>
                      {page.isHome && (
                        <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50 shrink-0">
                          Home
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      /{page.slug}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${page.status === 'published' ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 'bg-gray-700 text-gray-400'}`}
                  >
                    {page.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={page.isHome ? siteUrl : `${siteUrl}/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 rounded-lg transition-colors"
                    title="Ver página em produção"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={() =>
                      handlePublishPage(page.id, page.status !== 'published')
                    }
                    className={`p-2 rounded-lg transition-colors ${page.status === 'published' ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-green-400 hover:bg-green-400/10'}`}
                    title={
                      page.status === 'published' ? 'Despublicar' : 'Publicar'
                    }
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleDuplicatePage(page.id)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Duplicar"
                  >
                    <Copy size={16} />
                  </button>
                  {page.slug !== 'home' && (
                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditPage(page.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md shadow-indigo-600/20"
                  >
                    <PenTool size={14} /> Editar
                  </button>
                </div>
              </div>
            ))}

            {pages.length === 0 && (
              <div className="text-center py-16 bg-gray-800/50 rounded-2xl border border-gray-700">
                <FileText size={48} className="mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Nenhuma página criada
                </h3>
                <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                  Comece adicionando páginas ao seu site. Cada página pode ser
                  editada com o construtor visual.
                </p>
                <button
                  onClick={() => setShowCreatePage(true)}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                  <Plus size={16} /> Criar Primeira Página
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <GlobalSettings
            site={site}
            pages={pages}
            onUpdate={handleUpdateSite}
          />
        </div>
      )}

      {activeTab === 'imoveis' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Home size={20} className="text-indigo-400" /> Seleção de Imóveis
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Escolha quais imóveis e lançamentos aparecerão no seu site público.
            </p>
          </div>
          <PropertySelectionPanel
            site={site}
            onUpdate={handleUpdateSite}
            saving={saving}
          />
        </div>
      )}

      {activeTab === 'templates' && (
        <div>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              Trocar Template
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Escolha um novo template. As páginas existentes serão mantidas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SITE_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden hover:border-indigo-500/50 transition-all group"
              >
                <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center relative overflow-hidden">
                  {template.thumbnail ? (
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Layout
                      size={48}
                      className="text-gray-600 group-hover:text-indigo-400 transition-colors"
                    />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-white font-semibold">{template.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                      {template.pages.length} páginas
                    </span>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded capitalize">
                      {template.category}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          'Aplicar este template? O tema e o menu serão atualizados.'
                        )
                      ) {
                        handleApplyTemplate(template);
                      }
                    }}
                    disabled={saving}
                    className="w-full mt-4 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Wand2 size={14} />
                    )}
                    Aplicar Template
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
