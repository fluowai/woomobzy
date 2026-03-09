import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { textsService } from '../services/texts';

interface TextsContextType {
  texts: Record<string, string>;
  t: (key: string, defaultValue?: string) => string;
  updateText: (key: string, value: string) => Promise<void>;
  bulkUpdate: (updates: Array<{ key: string; value: string }>) => Promise<void>;
  resetText: (key: string) => Promise<void>;
  refresh: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  // Visual Editor
  isVisualMode: boolean;
  setVisualMode: (mode: boolean) => void;
  activeKey: string | null;
  setActiveKey: (key: string | null) => void;
}

const TextsContext = createContext<TextsContextType | undefined>(undefined);

interface TextsProviderProps {
  children: ReactNode;
}

export const TextsProvider: React.FC<TextsProviderProps> = ({ children }) => {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Visual Editor States
  const [isVisualMode, setIsVisualMode] = useState(() => {
    return localStorage.getItem('visual_edit_mode') === 'true';
  });
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const setVisualMode = (mode: boolean) => {
    setIsVisualMode(mode);
    localStorage.setItem('visual_edit_mode', mode.toString());
    if (mode) {
      document.body.classList.add('visual-editor-active');
    } else {
      document.body.classList.remove('visual-editor-active');
    }
  };

  // Sincronizar classe do body no carregamento
  useEffect(() => {
    if (isVisualMode) {
      document.body.classList.add('visual-editor-active');
    } else {
      document.body.classList.remove('visual-editor-active');
    }
  }, [isVisualMode]);

  // Função para carregar textos
  const loadTexts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Tentar carregar do cache primeiro
      const cached = localStorage.getItem('site_texts');
      const cacheTime = localStorage.getItem('site_texts_cache_time');
      
      // Cache válido por 1 hora
      const isCacheValid = cacheTime && (Date.now() - parseInt(cacheTime)) < 3600000;
      
      if (cached && isCacheValid) {
        setTexts(JSON.parse(cached));
        setIsLoading(false);
        
        // Carregar em background para atualizar cache
        textsService.getAllTexts().then(({ texts: freshTexts }) => {
          setTexts(freshTexts);
          localStorage.setItem('site_texts', JSON.stringify(freshTexts));
          localStorage.setItem('site_texts_cache_time', Date.now().toString());
        }).catch(console.error);
        
        return;
      }
      
      // Carregar do servidor
      const { texts: freshTexts } = await textsService.getAllTexts();
      setTexts(freshTexts);
      
      // Salvar no cache
      localStorage.setItem('site_texts', JSON.stringify(freshTexts));
      localStorage.setItem('site_texts_cache_time', Date.now().toString());
      
    } catch (err) {
      console.error('Error loading texts:', err);
      setError('Erro ao carregar textos do site');
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar textos ao montar
  useEffect(() => {
    loadTexts();
  }, []);

  // Função t() para buscar texto
  const t = (key: string, defaultValue?: string): string => {
    return texts[key] || defaultValue || key;
  };

  // Atualizar texto individual
  const updateText = async (key: string, value: string) => {
    try {
      await textsService.updateText(key, value);
      
      // Atualizar estado local
      setTexts(prev => ({ ...prev, [key]: value }));
      
      // Atualizar cache
      const updatedTexts = { ...texts, [key]: value };
      localStorage.setItem('site_texts', JSON.stringify(updatedTexts));
      localStorage.setItem('site_texts_cache_time', Date.now().toString());
      
    } catch (err) {
      console.error('Error updating text:', err);
      throw err;
    }
  };

  // Atualização em massa
  const bulkUpdate = async (updates: Array<{ key: string; value: string }>) => {
    try {
      const { results, errors } = await textsService.bulkUpdateTexts(updates);
      
      if (errors.length > 0) {
        console.warn('Some texts failed to update:', errors);
      }
      
      // Atualizar estado local
      const updatedTexts = { ...texts };
      results.forEach(result => {
        updatedTexts[result.key] = result.value;
      });
      
      setTexts(updatedTexts);
      
      // Atualizar cache
      localStorage.setItem('site_texts', JSON.stringify(updatedTexts));
      localStorage.setItem('site_texts_cache_time', Date.now().toString());
      
    } catch (err) {
      console.error('Error in bulk update:', err);
      throw err;
    }
  };

  // Resetar texto para padrão
  const resetText = async (key: string) => {
    try {
      const resetData = await textsService.resetTextToDefault(key);
      
      // Atualizar estado local
      setTexts(prev => ({ ...prev, [key]: resetData.value }));
      
      // Atualizar cache
      const updatedTexts = { ...texts, [key]: resetData.value };
      localStorage.setItem('site_texts', JSON.stringify(updatedTexts));
      localStorage.setItem('site_texts_cache_time', Date.now().toString());
      
    } catch (err) {
      console.error('Error resetting text:', err);
      throw err;
    }
  };

  // Refresh manual
  const refresh = async () => {
    // Limpar cache
    localStorage.removeItem('site_texts');
    localStorage.removeItem('site_texts_cache_time');
    
    await loadTexts();
  };

  const value: TextsContextType = {
    texts,
    t,
    updateText,
    bulkUpdate,
    resetText,
    refresh,
    isLoading,
    error,
    isVisualMode,
    setVisualMode,
    activeKey,
    setActiveKey
  };

  return (
    <TextsContext.Provider value={value}>
      {children}
    </TextsContext.Provider>
  );
};

// Hook para usar o contexto
export const useTexts = (): TextsContextType => {
  const context = useContext(TextsContext);
  
  if (!context) {
    throw new Error('useTexts must be used within a TextsProvider');
  }
  
  return context;
};
