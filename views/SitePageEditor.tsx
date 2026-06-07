import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useAuth } from '../context/AuthContext';
import { siteService } from '../services/sites';
import { Site, SitePage, SiteMenuItem } from '../types/site';
import { Block, BlockType, LandingPageStatus } from '../types/landingPage';
import BlocksSidebar from '../components/LandingPageEditor/BlocksSidebar';
import CanvasArea from '../components/LandingPageEditor/CanvasArea';
import PropertiesSidebar from '../components/LandingPageEditor/PropertiesSidebar';
import ThemeCustomizer from '../components/LandingPageEditor/ThemeCustomizer';
import SEOSettings from '../components/LandingPageEditor/SEOSettings';
import {
  Save, Eye, Globe, Settings, Palette, Code,
  Smartphone, Tablet, Monitor, ArrowLeft, Loader,
  Wand2, Sparkles, Check,
} from 'lucide-react';
import { supabase } from '../services/supabase';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const SitePageEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [page, setPage] = useState<SitePage | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showSEOSettings, setShowSEOSettings] = useState(false);
  const [showGlobalHeader, setShowGlobalHeader] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (id) loadPage();
  }, [id]);

  const loadPage = async () => {
    try {
      setLoading(true);
      if (!id) return;

      const pageData = await siteService.getPageById(id);
      setPage(pageData);

      if (profile?.organization_id) {
        const siteData = await siteService.getByOrganization(profile.organization_id);
        setSite(siteData);
      }
    } catch (error) {
      console.error('Erro ao carregar página:', error);
      navigate('/admin/site');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    try {
      const updated = await siteService.updatePage(page.id, {
        blocks: page.blocks,
        title: page.title,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
      });
      setPage(updated);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = (blockType: BlockType) => {
    if (!page) return;

    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type: blockType,
      order: page.blocks.length,
      visible: true,
      config: getDefaultConfig(blockType),
      styles: getDefaultStyles(blockType),
    };

    setPage({
      ...page,
      blocks: [...page.blocks, newBlock],
    });
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<Block>) => {
    if (!page) return;
    setPage({
      ...page,
      blocks: page.blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b)),
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!page) return;
    setPage({
      ...page,
      blocks: page.blocks.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, order: i })),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !page) return;

    const oldIndex = page.blocks.findIndex((b) => b.id === active.id);
    const newIndex = page.blocks.findIndex((b) => b.id === over.id);
    const newBlocks = arrayMove(page.blocks, oldIndex, newIndex).map((b: Block, i: number) => ({ ...b, order: i }));
    setPage({ ...page, blocks: newBlocks });
  };

  const getDefaultConfig = (type: BlockType): any => {
    const configs: Record<string, any> = {
      [BlockType.HERO]: { title: 'Título', subtitle: 'Subtítulo', backgroundImage: '', overlayOpacity: 0.4, ctaText: 'Saiba Mais', height: 500, alignment: 'center', textColor: '#ffffff' },
      [BlockType.TEXT]: { content: '<p>Adicione seu texto aqui...</p>', fontSize: 16, fontWeight: 400, color: '#1e293b', alignment: 'left' },
      [BlockType.IMAGE]: { src: '', alt: 'Imagem', width: '100%', height: 'auto', objectFit: 'cover' },
      [BlockType.FORM]: { title: 'Entre em Contato', fields: [{ name: 'name', type: 'text', label: 'Nome', required: true, placeholder: 'Seu nome' }, { name: 'email', type: 'email', label: 'Email', required: true, placeholder: 'seu@email.com' }, { name: 'message', type: 'textarea', label: 'Mensagem', required: false, placeholder: 'Sua mensagem' }], submitText: 'Enviar', successMessage: 'Mensagem enviada!' },
      [BlockType.CTA]: { title: 'Pronto para começar?', description: '', buttonText: 'Fale Conosco', buttonLink: '#', backgroundColor: '#2563eb', textColor: '#ffffff' },
      [BlockType.PROPERTY_GRID]: { columns: 3, gap: 24, showFilters: true, maxItems: 12, sortBy: 'price', cardStyle: 'modern' },
      [BlockType.PROPERTY_CAROUSEL]: { autoplay: true, interval: 5000, showArrows: true, showDots: true, itemsPerView: 3 },
      [BlockType.STATS]: { stats: [{ value: '500+', label: 'Clientes', icon: '👥' }, { value: '15', label: 'Anos', icon: '⭐' }], columns: 2, animated: true },
      [BlockType.TESTIMONIALS]: { testimonials: [{ name: 'Cliente', rating: 5, text: 'Excelente serviço!' }], layout: 'carousel', showRating: true },
      [BlockType.MAP]: { latitude: -23.5505, longitude: -46.6333, zoom: 12, markers: [] },
      [BlockType.GALLERY]: { images: [], columns: 3, gap: 16, lightbox: true },
      [BlockType.VIDEO]: { url: '', autoplay: false, loop: false, muted: false, controls: true },
      [BlockType.FEATURES]: { features: [{ title: 'Feature 1', description: 'Descrição', icon: '✅' }], columns: 3 },
      [BlockType.BROKER_CARD]: { name: 'Nome do Corretor', creci: '', phone: '', email: '' },
      [BlockType.TIMELINE]: { title: 'Nossa História', items: [{ title: '2024', description: 'Marco importante' }] },
      [BlockType.CUSTOM_HTML]: { html: '<div>Seu HTML aqui</div>' },
      [BlockType.SPACER]: { height: 60 },
      [BlockType.DIVIDER]: { style: 'solid', color: '#e5e7eb', thickness: 1, width: '100%' },
    };
    return configs[type] || {};
  };

  const getDefaultStyles = (type: BlockType): any => {
    const styles: Record<string, any> = {
      [BlockType.HERO]: { padding: '0px' },
      [BlockType.STATS]: { padding: '60px 20px', backgroundColor: '#f8fafc' },
      [BlockType.CTA]: { padding: '80px 20px' },
      [BlockType.FORM]: { padding: '60px 20px' },
      [BlockType.TEXT]: { padding: '40px 20px' },
      [BlockType.IMAGE]: { padding: '20px' },
      [BlockType.SPACER]: {},
      [BlockType.DIVIDER]: { padding: '20px 0' },
    };
    return styles[type] || { padding: '40px 20px' };
  };

  const handleAutoSave = async () => {
    if (page) await handleSave();
  };

  useEffect(() => {
    if (!page) return;
    const timer = setTimeout(handleAutoSave, 30000);
    return () => clearTimeout(timer);
  }, [page?.blocks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Topbar */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/site')}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-300"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="h-6 w-px bg-gray-700" />
          <input
            type="text"
            value={page.title}
            onChange={(e) => setPage({ ...page, title: e.target.value })}
            className="bg-transparent text-white font-semibold text-lg outline-none border-b border-transparent focus:border-indigo-500 px-1"
          />
          <span className="text-xs text-gray-500">/{page.slug}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${page.status === 'published' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
            {page.status === 'published' ? 'Publicado' : 'Rascunho'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Device switcher */}
          <div className="flex bg-gray-700 p-1 rounded-lg border border-gray-600">
            {(['desktop', 'tablet', 'mobile'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded ${viewMode === mode ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                {mode === 'desktop' ? <Monitor size={15} /> : mode === 'tablet' ? <Tablet size={15} /> : <Smartphone size={15} />}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowThemeCustomizer(!showThemeCustomizer)}
            className={`p-2 rounded ${showThemeCustomizer ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            title="Tema"
          >
            <Palette size={16} />
          </button>

          <button
            onClick={() => setShowSEOSettings(!showSEOSettings)}
            className={`p-2 rounded ${showSEOSettings ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            title="SEO"
          >
            <Settings size={16} />
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>

          {lastSaved && (
            <span className="text-xs text-gray-500">Salvo às {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Blocks Sidebar */}
        <BlocksSidebar onAddBlock={handleAddBlock} />

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <div className={`mx-auto transition-all duration-300 ${viewMode === 'desktop' ? 'max-w-full' : viewMode === 'tablet' ? 'max-w-3xl' : 'max-w-sm'}`}>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={page.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <CanvasArea
                  blocks={page.blocks}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  onUpdateBlock={handleUpdateBlock}
                  onDeleteBlock={handleDeleteBlock}
                />
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Properties Sidebar */}
        {selectedBlockId && (
          <PropertiesSidebar
            block={page.blocks.find((b) => b.id === selectedBlockId)!}
            onUpdate={(updates) => handleUpdateBlock(selectedBlockId, updates)}
            onClose={() => setSelectedBlockId(null)}
          />
        )}

        {/* Theme Customizer */}
        {showThemeCustomizer && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <ThemeCustomizer
              theme={site?.globalTheme || {}}
              onUpdate={(themeUpdates) => {
                // Save global theme via site update
              }}
              onClose={() => setShowThemeCustomizer(false)}
            />
          </div>
        )}

        {/* SEO Settings */}
        {showSEOSettings && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto p-4">
            <SEOSettings
              metaTitle={page.metaTitle || page.title}
              metaDescription={page.metaDescription || ''}
              ogImage={page.ogImage || ''}
              onUpdate={(seo) => setPage({ ...page, ...seo })}
              onClose={() => setShowSEOSettings(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SitePageEditor;
