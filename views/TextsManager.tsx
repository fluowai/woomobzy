import React, { useState, useEffect } from 'react';
import { useTexts } from '../context/TextsContext';
import { useSettings } from '../context/SettingsContext';
import { Save, Search, Filter, RefreshCw, Type, Layout, Tag, Globe, AlertCircle, CheckCircle2, RotateCcw, MessageCircle, Mail, Home, MousePointer2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TextsManager: React.FC = () => {
  const { texts, updateText, bulkUpdate, resetText, refresh, isLoading, setVisualMode } = useTexts();
  const { settings } = useSettings();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Extrair seções e categorias únicas
  const sections = ['all', ...new Set(Object.keys(texts).map(key => key.split('.')[0]))];
  const categories = ['all', 'ui', 'content', 'marketing', 'navigation', 'system'];

  // Filtrar textos
  const filteredKeys = Object.keys(texts).filter(key => {
    const matchesSearch = key.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          texts[key].toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = selectedSection === 'all' || key.startsWith(selectedSection);
    // Categoria é mais difícil pois não está na chave diretamente, mas vamos tentar inferir ou usar metadados se tivéssemos
    // Por enquanto filtra por chave e valor
    return matchesSearch && matchesSection;
  });

  const handleTextChange = (key: string, value: string) => {
    setEditedTexts(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    if (Object.keys(editedTexts).length === 0) return;
    
    setIsSaving(true);
    try {
      const updates = Object.entries(editedTexts).map(([key, value]) => ({ key, value }));
      await bulkUpdate(updates as any);
      setEditedTexts({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    if (window.confirm('Tem certeza que deseja restaurar este texto para o padrão original?')) {
      try {
        await resetText(key);
        // Remover dos editados se estiver lá
        const newEdited = { ...editedTexts };
        delete newEdited[key];
        setEditedTexts(newEdited);
      } catch (error) {
        console.error('Erro ao restaurar:', error);
      }
    }
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'header': 
      case 'footer': 
      case 'floating': return <Layout size={16} />;
      case 'hero': 
      case 'stats': 
      case 'featured': 
      case 'about': return <Type size={16} />;
      case 'nav': return <Globe size={16} />;
      case 'lead_modal':
      case 'submit_modal': return <MessageCircle size={16} />;
      case 'contact': return <Mail size={16} />;
      case 'property_type': return <Home size={16} />;
      default: return <Tag size={16} />;
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Editor de Textos</h1>
          <p className="text-slate-500">Personalize todos os textos do site em tempo real.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => refresh()}
            className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-slate-600"
            title="Recarregar textos"
          >
            <RefreshCw size={20} />
          </button>

          <button 
            onClick={() => {
              setVisualMode(true);
              navigate('/');
            }}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            <MousePointer2 size={20} />
            Modo Visual (Estilo Elementor)
          </button>
          
          <button 
            onClick={handleSaveAll}
            disabled={Object.keys(editedTexts).length === 0 || isSaving}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
              Object.keys(editedTexts).length > 0 
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-green-600/20' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 size={20} />
            ) : (
              <Save size={20} />
            )}
            {saveSuccess ? 'Salvo!' : `Salvar Alterações (${Object.keys(editedTexts).length})`}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por texto ou chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {sections.map(section => (
            <button
              key={section}
              onClick={() => setSelectedSection(section)}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                selectedSection === section 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {section === 'all' ? 'Todos' : section}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-slate-400 animate-pulse">Carregando textos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredKeys.length === 0 ? (
            <div className="col-span-2 text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500 font-medium">Nenhum texto encontrado com os filtros atuais.</p>
            </div>
          ) : (
            filteredKeys.map(key => {
              const currentValue = editedTexts[key] !== undefined ? editedTexts[key] : texts[key];
              const isEdited = editedTexts[key] !== undefined && editedTexts[key] !== texts[key];
              const section = key.split('.')[0];
              
              return (
                <div key={key} className={`bg-white rounded-xl border p-5 transition-all ${isEdited ? 'border-amber-400 shadow-md ring-1 ring-amber-400' : 'border-slate-100 hover:border-slate-300'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                        {getSectionIcon(section)}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{key}</span>
                    </div>
                    {isEdited && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-full">
                        Editado
                      </span>
                    )}
                  </div>
                  
                  <textarea
                    value={currentValue}
                    onChange={(e) => handleTextChange(key, e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none min-h-[80px]"
                    placeholder="Digite o texto aqui..."
                  />
                  
                  <div className="flex justify-end mt-3 gap-2">
                    <button 
                      onClick={() => handleReset(key)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Restaurar padrão"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default TextsManager;
