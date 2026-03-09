import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { landingPageService } from '../services/landingPages';
import { propertyService } from '../services/properties';
import { generateLandingPageFromProperty } from '../services/ai';
import { getTemplateById, generateBlocksFromTemplate } from '../services/landingPageTemplates';
import { LandingPage, LandingPageStatus } from '../types/landingPage';
import { Property } from '../types';
import TemplateSelector from '../components/TemplateSelector';
import { 
  Plus, 
  Edit2, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Search,
  Filter,
  BarChart3,
  Globe,
  FileText,
  Sparkles,
  Loader
} from 'lucide-react';
import AICloneModal from '../components/LandingPageEditor/AICloneModal';
import CloneSiteWrapper from '../components/LandingPageEditor/CloneSiteWrapper';

const LandingPageManager: React.FC = () => {
  const { user, profile } = useAuth();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LandingPageStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  
  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await landingPageService.list();
      setPages(data);
    } catch (error) {
      console.error('❌ [LandingPageManager] Erro ao carregar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta landing page?')) return;

    try {
      await landingPageService.delete(id);
      await loadPages();
    } catch (error) {
      console.error('Error deleting landing page:', error);
      alert('Erro ao excluir landing page');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await landingPageService.duplicate(id);
      await loadPages();
    } catch (error) {
      console.error('Error duplicating landing page:', error);
      alert('Erro ao duplicar landing page');
    }
  };

  const handleToggleStatus = async (page: LandingPage) => {
    try {
      if (page.status === LandingPageStatus.PUBLISHED) {
        await landingPageService.unpublish(page.id);
      } else {
        await landingPageService.publish(page.id);
      }
      await loadPages();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Erro ao alterar status');
    }
  };

  const filteredPages = pages.filter(page => {
    const matchesSearch = page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: LandingPageStatus) => {
    const styles = {
      [LandingPageStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [LandingPageStatus.PUBLISHED]: 'bg-green-100 text-green-800',
      [LandingPageStatus.ARCHIVED]: 'bg-red-100 text-red-800'
    };

    const labels = {
      [LandingPageStatus.DRAFT]: 'Rascunho',
      [LandingPageStatus.PUBLISHED]: 'Publicado',
      [LandingPageStatus.ARCHIVED]: 'Arquivado'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Landing Pages</h1>
            <p className="text-gray-600 mt-1">
              Crie e gerencie landing pages personalizadas para seus imóveis
            </p>
          </div>
          <div className="flex gap-3">
             <button
              onClick={() => setShowAIModal(true)}
              data-ai-button
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl group"
            >
              <Sparkles size={20} className="group-hover:animate-pulse" />
              Criar com IA
            </button>
            <button
               onClick={() => setShowCloneModal(true)}
               className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-lg hover:shadow-xl group"
             >
               <Copy size={20} />
               Clonar Site
             </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm hover:shadow-md"
            >
              <Plus size={20} />
              Nova Landing Page
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value={LandingPageStatus.DRAFT}>Rascunho</option>
              <option value={LandingPageStatus.PUBLISHED}>Publicado</option>
              <option value={LandingPageStatus.ARCHIVED}>Arquivado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total de Páginas</p>
              <p className="text-2xl font-bold text-gray-900">{pages.length}</p>
            </div>
            <FileText className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Publicadas</p>
              <p className="text-2xl font-bold text-green-600">
                {pages.filter(p => p.status === LandingPageStatus.PUBLISHED).length}
              </p>
            </div>
            <Globe className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total de Visitas</p>
              <p className="text-2xl font-bold text-purple-600">
                {pages.reduce((sum, p) => sum + p.viewsCount, 0).toLocaleString()}
              </p>
            </div>
            <Eye className="text-purple-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total de Leads</p>
              <p className="text-2xl font-bold text-orange-600">
                {pages.reduce((sum, p) => sum + p.leadsCount, 0).toLocaleString()}
              </p>
            </div>
            <BarChart3 className="text-orange-600" size={32} />
          </div>
        </div>
      </div>

      {/* Pages Grid */}
      {filteredPages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' 
              ? 'Nenhuma landing page encontrada'
              : 'Nenhuma landing page criada ainda'
            }
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando sua primeira landing page personalizada'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar Primeira Landing Page
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map((page) => (
            <div key={page.id} className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow overflow-hidden">
              {/* Preview Image */}
              <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <Globe size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm opacity-75">Preview não disponível</p>
                  </div>
                </div>
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  {getStatusBadge(page.status)}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">
                  {page.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4 truncate">
                  /{page.slug}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Eye size={16} />
                    <span>{page.viewsCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 size={16} />
                    <span>{page.leadsCount}</span>
                  </div>
                  {page.leadsCount > 0 && page.viewsCount > 0 && (
                    <div className="text-green-600 font-medium">
                      {((page.leadsCount / page.viewsCount) * 100).toFixed(1)}% conv.
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => window.location.href = `/admin/landing-pages/${page.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>

                  <button
                    onClick={() => handleToggleStatus(page)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      page.status === LandingPageStatus.PUBLISHED
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                    title={page.status === LandingPageStatus.PUBLISHED ? 'Despublicar' : 'Publicar'}
                  >
                    {page.status === LandingPageStatus.PUBLISHED ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>

                  <button
                    onClick={() => handleDuplicate(page.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Duplicar"
                  >
                    <Copy size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(page.id)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* View Link */}
                {page.status === LandingPageStatus.PUBLISHED && (
                  <a
                    href={`/lp/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink size={14} />
                    Ver página publicada
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateLandingPageModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadPages();
          }}
        />
      )}

      {showAIModal && (
        <CreateAILandingPageModal
          onClose={() => setShowAIModal(false)}
          onCreated={() => {
            setShowAIModal(false);
            loadPages();
          }}
        />
      )}

      {/* Clone Modal */}
      {showCloneModal && (
        <CloneSiteWrapper 
          onClose={() => setShowCloneModal(false)}
        />
      )}
    </div>
  );
};

// ============================================
// CREATE MODAL COMPONENT
// ============================================

interface CreateLandingPageModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateLandingPageModal: React.FC<CreateLandingPageModalProps> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'templates' | 'blank'>('templates');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-gerar slug
    const autoSlug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(autoSlug);
  };

  const handleSelectTemplate = async (templateId: string) => {
    if (!user?.id) {
      alert('Erro: usuário não autenticado');
      return;
    }

    try {
      setCreating(true);
      const template = getTemplateById(templateId);
      if (!template) throw new Error('Template não encontrado');

      const newPage = await landingPageService.create({
        userId: user.id,
        name: template.name,
        slug: template.id + '-' + Date.now(),
        title: template.name,
        templateId: template.id,
        themeConfig: template.themeConfig,
        blocks: generateBlocksFromTemplate(template.blocks),
        settings: {
          headerStyle: 'transparent',
          footerStyle: 'minimal',
          showBranding: true
        },
        propertySelection: {
          mode: 'manual' as any,
          propertyIds: [],
          filters: {},
          sortBy: 'price',
          sortOrder: 'desc',
          limit: 12
        },
        formConfig: {
          enabled: true,
          fields: ['name', 'email', 'phone', 'message'],
          submitText: 'Enviar Mensagem',
          successMessage: 'Mensagem enviada com sucesso!',
          whatsappEnabled: true,
          emailEnabled: true
        },
        status: LandingPageStatus.DRAFT
      });

      // Redirecionar para o editor
      window.location.href = `/admin/landing-pages/${newPage.id}`;
    } catch (error) {
      console.error('Error creating from template:', error);
      alert('Erro ao criar landing page');
      setCreating(false);
    }
  };

  const handleCreateBlank = async () => {
    if (!user?.id) {
      alert('Erro: usuário não autenticado');
      return;
    }

    if (!name || !slug) {
      alert('Preencha nome e slug');
      return;
    }

    try {
      setCreating(true);

      const newPage = await landingPageService.create({
        userId: user.id,
        name,
        slug,
        title: name,
        templateId: 'blank',
        themeConfig: {
          primaryColor: '#2563eb',
          secondaryColor: '#10b981',
          backgroundColor: '#ffffff',
          textColor: '#111827',
          fontFamily: 'Inter',
          fontSize: {
            base: '16px',
            heading1: '48px',
            heading2: '36px',
            heading3: '24px'
          },
          borderRadius: '8px',
          spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px'
          }
        },
        blocks: [],
        settings: {
          headerStyle: 'transparent',
          footerStyle: 'minimal',
          showBranding: true
        },
        propertySelection: {
          mode: 'manual' as any,
          propertyIds: [],
          filters: {},
          sortBy: 'price',
          sortOrder: 'desc',
          limit: 12
        },
        formConfig: {
          enabled: true,
          fields: ['name', 'email', 'phone', 'message'],
          submitText: 'Enviar Mensagem',
          successMessage: 'Mensagem enviada com sucesso!',
          whatsappEnabled: true,
          emailEnabled: true
        },
        status: LandingPageStatus.DRAFT
      });

      // Redirecionar para o editor
      window.location.href = `/admin/landing-pages/${newPage.id}`;
    } catch (error) {
      console.error('Error creating landing page:', error);
      alert('Erro ao criar landing page');
      setCreating(false);
    }
  };

  const handleCreateWithAI = () => {
    onClose();
    // Trigger AI modal
    const aiButton = document.querySelector('[data-ai-button]') as HTMLButtonElement;
    if (aiButton) aiButton.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Nova Landing Page
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Templates Prontos
            </button>
            <button
              onClick={() => setActiveTab('blank')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'blank'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ✨ Página em Branco
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'templates' && (
            <TemplateSelector
              onSelectTemplate={handleSelectTemplate}
              onCreateBlank={() => setActiveTab('blank')}
              onCreateWithAI={handleCreateWithAI}
            />
          )}

          {activeTab === 'blank' && (
            <div className="p-8 max-w-md mx-auto">
              <h3 className="text-xl font-bold mb-4">Criar Página em Branco</h3>
              <p className="text-gray-600 mb-6">
                Comece do zero e construa sua landing page com total flexibilidade
              </p>

              <form onSubmit={(e) => { e.preventDefault(); handleCreateBlank(); }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Landing Page
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex: Fazendas Premium 2026"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    autoFocus
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug (URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">/lp/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="fazendas-premium-2026"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    URL amigável para sua landing page
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={creating}
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={creating}
                  >
                    {creating ? 'Criando...' : 'Criar e Editar'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// AI CREATE MODAL COMPONENT
// ============================================

const CreateAILandingPageModal: React.FC<CreateLandingPageModalProps> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'template' | 'property' | 'generating'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [searchProp, setSearchProp] = useState('');
  const [generationStage, setGenerationStage] = useState('Analizando imóvel...');

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const data = await propertyService.list();
      setProperties(data);
    } catch (error) {
      console.error('Failed to load properties', error);
    } finally {
      setLoadingProps(false);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setStep('property');
  };

  const handleGenerate = async () => {
    console.log('handleGenerate called');
    console.log('Selected Prop ID:', selectedPropId);
    console.log('User ID:', user?.id);
    
    if (!selectedPropId || !user?.id) {
      console.error('Missing required data for generation', { selectedPropId, userId: user?.id });
      alert('Erro: Informações do usuário incompletas.');
      return;
    }

    const property = properties.find(p => p.id === selectedPropId);
    if (!property) {
      console.error('Property not found');
      return;
    }

    try {
      setStep('generating');
      
      // AI Generation
      setGenerationStage('Escrevendo copy persuasiva...');
      console.log('Calling generateLandingPageFromProperty...');
      const aiData = await generateLandingPageFromProperty(property);
      console.log('AI Data received:', aiData);
      
      setGenerationStage('Montando layout v2.0...');
      
      // Slug Generation
      const baseSlug = (aiData.name || property.title)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      // Create Page (without organizationId to avoid FK constraint)
      setGenerationStage('Salvando página...');
      const newPage = await landingPageService.create({
        userId: user.id,
        name: aiData.name || property.title,
        title: aiData.title || property.title,
        description: aiData.description,
        slug: uniqueSlug,
        templateId: 'ai-generated',
        themeConfig: aiData.themeConfig as any,
        blocks: aiData.blocks || [],
        settings: {
          headerStyle: 'transparent',
          footerStyle: 'minimal',
          showBranding: true
        },
        propertySelection: {
          mode: 'manual',
          propertyIds: [property.id],
          filters: {},
          sortBy: 'price',
          limit: 1
        },
        formConfig: {
          enabled: true,
          fields: ['name', 'email', 'phone', 'message'],
          submitText: 'Agendar Visita',
          successMessage: 'Recebemos seu contato!',
          whatsappEnabled: true,
          emailEnabled: true
        },
        status: LandingPageStatus.DRAFT
      } as any);

      console.log('Page created:', newPage);

      // Redirect
      window.location.href = `/admin/landing-pages/${newPage.id}`;

    } catch (error: any) {
      console.error("AI Generation failed:", error);
      alert("Falha na geração: " + error.message);
      setStep('property');
    }
  };

  const filteredProps = properties.filter(p => 
    p.title.toLowerCase().includes(searchProp.toLowerCase()) || 
    p.location.city.toLowerCase().includes(searchProp.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        
        {step === 'template' && (
          <>
            <div className="p-6 border-b border-gray-100">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                     <Sparkles size={24} />
                   </div>
                   <div>
                     <h2 className="text-xl font-bold text-gray-900">✨ Criar com IA - Escolha um Template</h2>
                     <p className="text-sm text-gray-500">Selecione um design base para sua landing page</p>
                   </div>
                 </div>
                 <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TemplateSelector
                onSelectTemplate={handleSelectTemplate}
                onCreateBlank={() => handleSelectTemplate('blank')}
                onCreateWithAI={() => {}}
              />
            </div>
          </>
        )}

        {step === 'property' && (
          <>
            <div className="p-6 border-b border-gray-100">
               <div className="flex items-center gap-3 mb-2">
                 <button 
                   onClick={() => setStep('template')} 
                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-2xl"
                   title="Voltar para templates"
                 >
                   ←
                 </button>
                 <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                   <Sparkles size={24} />
                 </div>
                 <div>
                   <h2 className="text-xl font-bold text-gray-900">Escolha o Imóvel</h2>
                   <p className="text-sm text-gray-500">A IA vai gerar conteúdo personalizado para este imóvel</p>
                 </div>
               </div>
            </div>

            <div className="p-4 border-b border-gray-100 bg-gray-50">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                   type="text"
                   placeholder="Buscar imóvel..."
                   className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                   value={searchProp}
                   onChange={e => setSearchProp(e.target.value)}
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
               {loadingProps ? (
                 <div className="text-center py-10 text-gray-400">Carregando imóveis...</div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {filteredProps.map(p => (
                     <div 
                       key={p.id}
                       onClick={() => setSelectedPropId(p.id)}
                       className={`border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md flex gap-3 ${selectedPropId === p.id ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50' : 'border-gray-200 bg-white'}`}
                     >
                       <img 
                         src={p.images[0] || 'https://via.placeholder.com/100'} 
                         className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                       />
                       <div className="flex-1 overflow-hidden">
                          <h4 className="font-bold text-gray-800 truncate text-sm">{p.title}</h4>
                          <p className="text-xs text-gray-500 truncate">{p.location.city} - {p.location.state}</p>
                          <p className="text-xs font-semibold text-purple-600 mt-1">R$ {p.price.toLocaleString('pt-BR')}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
               <button 
                 onClick={onClose}
                 className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors"
               >
                 Cancelar
               </button>
               <button 
                 onClick={handleGenerate}
                 disabled={!selectedPropId}
                 className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-200"
               >
                 <Sparkles size={18} />
                 Gerar Página Mágica
               </button>
            </div>
          </>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center p-12 text-center h-[500px]">
             <div className="relative mb-8">
               <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
               <div className="relative bg-white p-4 rounded-full shadow-xl">
                 <Sparkles size={48} className="text-indigo-600 animate-spin-slow" />
               </div>
             </div>
             
             <h3 className="text-2xl font-bold text-gray-900 mb-2">Criando sua Landing Page</h3>
             <p className="text-gray-500 mb-8 max-w-sm mx-auto">
               Nossa IA está analisando os dados do imóvel, escrevendo textos persuasivos e montando o layout perfeito.
             </p>

             <div className="flex items-center gap-3 bg-indigo-50 px-5 py-2 rounded-full">
               <Loader size={16} className="text-indigo-600 animate-spin" />
               <span className="text-sm font-medium text-indigo-700">{generationStage}</span>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LandingPageManager;
