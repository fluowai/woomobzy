import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useAuth } from '../context/AuthContext';
import { landingPageService } from '../services/landingPages';
import { LandingPage, Block, BlockType, LandingPageStatus } from '../types/landingPage';
import { 
  Save, 
  Eye, 
  Globe, 
  Settings, 
  Palette,
  Code,
  Smartphone,
  Tablet,
  Monitor,
  ArrowLeft,
  Loader,
  Wand2,
} from 'lucide-react';
import BlocksSidebar from '../components/LandingPageEditor/BlocksSidebar';
import CanvasArea from '../components/LandingPageEditor/CanvasArea';
import PropertiesSidebar from '../components/LandingPageEditor/PropertiesSidebar';
import ThemeCustomizer from '../components/LandingPageEditor/ThemeCustomizer';
import SEOSettings from '../components/LandingPageEditor/SEOSettings';
import AICloneModal from '../components/LandingPageEditor/AICloneModal';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const LandingPageEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [page, setPage] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showSEOSettings, setShowSEOSettings] = useState(false);
  const [showAICloneModal, setShowAICloneModal] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load page
  useEffect(() => {
    if (id) {
      loadPage();
    }
  }, [id]);

  // Auto-save
  useEffect(() => {
    if (!page || !autoSaveEnabled) return;

    const timer = setTimeout(() => {
      handleSave(true);
    }, 30000); // Auto-save a cada 30 segundos

    return () => clearTimeout(timer);
  }, [page, autoSaveEnabled]);

  const loadPage = async () => {
    try {
      setLoading(true);
      if (id) {
        const data = await landingPageService.getById(id);
        setPage(data);
      }
    } catch (error) {
      console.error('Error loading page:', error);
      alert('Erro ao carregar landing page');
      navigate('/landing-pages');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!page) return;

    try {
      setSaving(true);
      console.log('🔵 Salvando landing page...', page.id);
      console.log('📝 Dados para salvar:', {
        name: page.name,
        title: page.title,
        blocksCount: page.blocks.length
      });
      
      await landingPageService.update(page.id, {
        name: page.name,
        title: page.title,
        description: page.description,
        blocks: page.blocks,
        themeConfig: page.themeConfig,
        settings: page.settings,
        propertySelection: page.propertySelection,
        formConfig: page.formConfig,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        metaKeywords: page.metaKeywords,
        ogImage: page.ogImage,
        customCss: page.customCss,
        customJs: page.customJs,
        customHead: page.customHead
      });
      
      console.log('✅ Salvo com sucesso!');
      setLastSaved(new Date());
      
      if (!isAutoSave) {
        alert('Landing page salva com sucesso!');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      if (!isAutoSave) {
        alert('Erro ao salvar landing page: ' + (error as Error).message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!page) return;

    if (!confirm('Deseja publicar esta landing page? Ela ficará visível publicamente.')) {
      return;
    }

    try {
      setSaving(true);
      await landingPageService.publish(page.id);
      alert('Landing page publicada com sucesso!');
      await loadPage();
    } catch (error) {
      console.error('Error publishing page:', error);
      alert('Erro ao publicar landing page');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = (type: BlockType) => {
    if (!page) return;

    const newBlock: Block = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      order: page.blocks.length,
      visible: true,
      config: getDefaultBlockConfig(type),
      styles: getDefaultBlockStyles(type),
      responsive: {}
    };

    setPage({
      ...page,
      blocks: [...page.blocks, newBlock]
    });

    setSelectedBlockId(newBlock.id);
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<Block>) => {
    if (!page) return;

    setPage({
      ...page,
      blocks: page.blocks.map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      )
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!page) return;

    if (!confirm('Deseja excluir este bloco?')) return;

    setPage({
      ...page,
      blocks: page.blocks.filter(block => block.id !== blockId)
    });

    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const handleDuplicateBlock = (blockId: string) => {
    if (!page) return;

    const blockToDuplicate = page.blocks.find(b => b.id === blockId);
    if (!blockToDuplicate) return;

    const duplicatedBlock: Block = {
      ...blockToDuplicate,
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      order: page.blocks.length
    };

    setPage({
      ...page,
      blocks: [...page.blocks, duplicatedBlock]
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!page) return;

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = page.blocks.findIndex(b => b.id === active.id);
      const newIndex = page.blocks.findIndex(b => b.id === over.id);

      const reorderedBlocks = arrayMove(page.blocks, oldIndex, newIndex).map((block: Block, index: number) => ({
        ...block,
        order: index
      }));

      setPage({
        ...page,
        blocks: reorderedBlocks
      });
    }
  };

  const handlePreview = () => {
    if (!page) return;
    
    // Salvar antes de visualizar
    handleSave(true);
    
    // Abrir preview em nova aba
    window.open(`/lp/${page.slug}?preview=true`, '_blank');
  };

  const handleAICloneApply = (layoutConfig: any) => {
    if (!page || !layoutConfig.blocks) return;
    
    // Replace blocks with AI generated ones
    // We Map them to ensure they have valid IDs and defaults
    const newBlocks = layoutConfig.blocks.map((b: any, index: number) => ({
      ...b,
      id: `block_${Date.now()}_${index}`,
      order: index,
      visible: true,
      // Ensure config/styles exist if AI missed them
      config: b.config || {}, 
      styles: b.styles || {},
      responsive: b.responsive || {} 
    }));

    setPage({
      ...page,
      blocks: newBlocks
    });

    setShowAICloneModal(false);
    alert('Site clonado com sucesso! Verifique os novos blocos.');
  };

  const getViewModeWidth = () => {
    switch (viewMode) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      case 'desktop':
      default:
        return '100%';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600">Carregando editor...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-900 mb-4">Landing page não encontrada</p>
          <button
            onClick={() => navigate('/landing-pages')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar para Landing Pages
          </button>
        </div>
      </div>
    );
  }

  const selectedBlock = selectedBlockId 
    ? page.blocks.find(b => b.id === selectedBlockId) 
    : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/landing-pages')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <input
              type="text"
              value={page.name}
              onChange={(e) => setPage({ ...page, name: e.target.value })}
              className="text-lg font-semibold border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            />
            <p className="text-xs text-gray-500">
              {lastSaved ? `Salvo às ${lastSaved.toLocaleTimeString()}` : 'Não salvo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('desktop')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'desktop' ? 'bg-white shadow' : 'hover:bg-gray-200'
              }`}
              title="Desktop"
            >
              <Monitor size={18} />
            </button>
            <button
              onClick={() => setViewMode('tablet')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'tablet' ? 'bg-white shadow' : 'hover:bg-gray-200'
              }`}
              title="Tablet"
            >
              <Tablet size={18} />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'mobile' ? 'bg-white shadow' : 'hover:bg-gray-200'
              }`}
              title="Mobile"
            >
              <Smartphone size={18} />
            </button>
          </div>

          {/* AI Clone Button */}
          <button
             onClick={() => setShowAICloneModal(true)}
             className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
             title="Clonar Site com IA"
           >
             <Wand2 size={18} />
             <span className="hidden md:inline font-medium">Magic Clone</span>
           </button>

          {/* Actions */}
          <button
            onClick={() => setShowThemeCustomizer(true)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Tema"
          >
            <Palette size={18} />
            <span className="hidden md:inline">Tema</span>
          </button>

          <button
            onClick={() => setShowSEOSettings(true)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="SEO"
          >
            <Settings size={18} />
            <span className="hidden md:inline">SEO</span>
          </button>

          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Eye size={18} />
            <span className="hidden md:inline">Preview</span>
          </button>

          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            <span className="hidden md:inline">Salvar</span>
          </button>

          {page.status !== LandingPageStatus.PUBLISHED && (
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Globe size={18} />
              <span className="hidden md:inline">Publicar</span>
            </button>
          )}

          {page.status === LandingPageStatus.PUBLISHED && (
            <button
              onClick={() => {
                const url = `${window.location.origin}/lp/${page.slug}`;
                navigator.clipboard.writeText(url);
                alert('Link copiado! ' + url);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Globe size={18} />
              <span className="hidden md:inline">Copiar Link</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Blocks */}
        <BlocksSidebar onAddBlock={handleAddBlock} />

        {/* Center - Canvas */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6">
          <div 
            className="mx-auto bg-white shadow-lg transition-all duration-300"
            style={{ 
              width: getViewModeWidth(),
              minHeight: '100%'
            }}
          >
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={page.blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <CanvasArea
                  blocks={page.blocks}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  onUpdateBlock={handleUpdateBlock}
                  onDeleteBlock={handleDeleteBlock}
                  onDuplicateBlock={handleDuplicateBlock}
                  themeConfig={page.themeConfig}
                  viewMode={viewMode}
                />
              </SortableContext>
            </DndContext>

            {page.blocks.length === 0 && (
              <div className="flex items-center justify-center h-96 text-gray-400">
                <div className="text-center">
                  <Code size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum bloco adicionado</p>
                  <p className="text-sm mt-2">
                    Arraste blocos da barra lateral para começar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        {selectedBlock && (
          <PropertiesSidebar
            block={selectedBlock}
            onUpdate={(updates) => handleUpdateBlock(selectedBlock.id, updates)}
            onClose={() => setSelectedBlockId(null)}
            page={page}
            onUpdatePage={setPage}
          />
        )}
      </div>

      {/* Theme Customizer Modal */}
      {showThemeCustomizer && (
        <ThemeCustomizer
          themeConfig={page.themeConfig}
          onUpdate={(themeConfig) => setPage({ ...page, themeConfig })}
          onClose={() => setShowThemeCustomizer(false)}
        />
      )}

      {/* SEO Settings Modal */}
      {showSEOSettings && (
        <SEOSettings
          page={page}
          onUpdate={setPage}
          onClose={() => setShowSEOSettings(false)}
        />
      )}

      {/* AI Clone Modal */}
      {showAICloneModal && (
        <AICloneModal
          onClone={handleAICloneApply}
          onClose={() => setShowAICloneModal(false)}
        />
      )}
    </div>
  );
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDefaultBlockConfig(type: BlockType): any {
  switch (type) {
    case BlockType.HERO:
      return {
        title: 'Título Principal',
        subtitle: 'Subtítulo descritivo',
        backgroundImage: '',
        overlayOpacity: 0.5,
        ctaText: 'Saiba Mais',
        ctaLink: '#',
        height: 600,
        alignment: 'center',
        textColor: '#ffffff'
      };

    case BlockType.HERO_WITH_FORM:
      return {
        title: 'Encontre sua Fazenda dos Sonhos',
        subtitle: 'Assine para receber ofertas exclusivas e novidades sobre os melhores imóveis rurais.',
        backgroundImage: '',
        overlayOpacity: 0.3,
        formTitle: 'Receba novas oportunidades em imóveis rurais!',
        formSubtitle: 'Cadastre-se para receber ofertas e novidades de imóveis rurais. Prometemos não enviar spam.',
        submitText: 'Quero Receber Ofertas Exclusivas',
        fields: [
          { name: 'name', type: 'text', label: 'Nome completo', required: true, placeholder: 'Nome completo' },
          { name: 'email', type: 'email', label: 'Seu e-mail', required: true, placeholder: 'Seu e-mail' },
          { name: 'phone', type: 'tel', label: 'Telefone (WhatsApp)', required: true, placeholder: 'Telefone (WhatsApp)' },
          { name: 'region', type: 'select', label: 'Região de Interesse', required: false, options: ['Norte', 'Sul', 'Centro-Oeste', 'Sudeste', 'Nordeste'] }
        ],
        height: 700,
        textColor: '#ffffff',
        showBadges: true,
        badges: [
          { icon: 'shield', title: 'Cadastro 100% seguro', description: 'Seus dados protegidos.' },
          { icon: 'star', title: 'Ofertas exclusivas', description: 'Receba propriedades selecionadas.' },
          { icon: 'clock', title: 'Primeiro a saber', description: 'Acesse novas oportunidades antes de todos.' }
        ]
      };

    case BlockType.PROPERTY_GRID:
      return {
        columns: 3,
        gap: 24,
        showFilters: false,
        maxItems: 12,
        sortBy: 'price',
        cardStyle: 'modern'
      };

    case BlockType.TEXT:
      return {
        content: '<p>Adicione seu texto aqui...</p>',
        fontSize: 16,
        fontWeight: 400,
        color: '#111827',
        alignment: 'left'
      };

    case BlockType.IMAGE:
      return {
        src: '',
        alt: 'Imagem',
        width: '100%',
        height: 'auto',
        objectFit: 'cover',
        link: ''
      };

    case BlockType.GALLERY:
      return {
        images: [],
        columns: 3,
        spacing: 16,
        lightbox: true
      };

    case BlockType.PROPERTY_CAROUSEL:
      return {
        images: [],
        autoplay: false,
        autoplayDelay: 4000,
        showThumbnails: true,
        showDots: true
      };

    case BlockType.STATS:
      return {
        stats: [
          { value: '1000+', label: 'Clientes Satisfeitos', icon: '👥' },
          { value: '500+', label: 'Propriedades Vendidas', icon: '🏡' },
          { value: '15', label: 'Anos de Experiência', icon: '⭐' }
        ],
        columns: 3
      };

    case BlockType.FEATURES:
      return {
        features: [
          { title: 'Característica 1', description: 'Descrição', icon: '✓' },
          { title: 'Característica 2', description: 'Descrição', icon: '✓' },
          { title: 'Característica 3', description: 'Descrição', icon: '✓' }
        ],
        columns: 3
      };

    case BlockType.TESTIMONIALS:
      return {
        testimonials: [
          { 
            name: 'Cliente 1', 
            text: 'Excelente atendimento!', 
            avatar: '', 
            rating: 5 
          }
        ],
        layout: 'carousel'
      };

    case BlockType.FORM:
      return {
        title: 'Entre em Contato',
        fields: [
          { name: 'name', type: 'text', label: 'Nome', required: true, placeholder: 'Seu nome' },
          { name: 'email', type: 'email', label: 'E-mail', required: true, placeholder: 'seu@email.com' },
          { name: 'phone', type: 'tel', label: 'Telefone', required: true, placeholder: '(00) 00000-0000' },
          { name: 'message', type: 'textarea', label: 'Mensagem', required: false, placeholder: 'Sua mensagem' }
        ],
        submitText: 'Enviar',
        successMessage: 'Mensagem enviada com sucesso!'
      };

    case BlockType.CTA:
      return {
        title: 'Pronto para começar?',
        description: 'Entre em contato conosco hoje mesmo',
        buttonText: 'Falar com Especialista',
        buttonLink: '#contato',
        backgroundColor: '#2563eb',
        textColor: '#ffffff'
      };

    case BlockType.SPACER:
      return {
        height: 60
      };

    case BlockType.DIVIDER:
      return {
        style: 'solid',
        color: '#e5e7eb',
        thickness: 1,
        width: '100%'
      };

    case BlockType.MAP:
      return {
        latitude: -23.550520,
        longitude: -46.633308,
        zoom: 15,
        height: 400
      };

    case BlockType.BROKER_CARD:
      return {
        name: 'Corretor',
        photo: '',
        creci: '',
        phone: '',
        email: '',
        bio: 'Especialista em imóveis rurais'
      };

    case BlockType.FOOTER:
      return {
        columns: [
          {
            title: 'Empresa',
            links: [
              { text: 'Sobre', url: '#' },
              { text: 'Contato', url: '#' }
            ]
          }
        ],
        copyright: '© 2024 Todos os direitos reservados'
      };

    default:
      return {};
  }
}

function getDefaultBlockStyles(type: BlockType): any {
  switch (type) {
    case BlockType.HERO:
      return {
        padding: '80px 20px',
        textAlign: 'center'
      };

    case BlockType.HERO_WITH_FORM:
      return {
        padding: '0px',
        textAlign: 'center'
      };

    case BlockType.PROPERTY_GRID:
    case BlockType.FORM:
      return {
        padding: '60px 20px'
      };

    case BlockType.TEXT:
      return {
        padding: '40px 20px'
      };

    case BlockType.CTA:
      return {
        padding: '80px 20px',
        textAlign: 'center'
      };

    default:
      return {
        padding: '20px'
      };
  }
}

export default LandingPageEditor;
