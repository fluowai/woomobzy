
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Block, BlockType, LayoutConfig, BlockStyles, ResponsiveConfig } from '../types';
import { useSettings } from './SettingsContext';

interface LayoutEditorContextType {
  blocks: Block[];
  selectedBlock: Block | null;
  mode: 'edit' | 'preview';
  device: 'mobile' | 'tablet' | 'desktop';
  history: Block[][];
  historyIndex: number;
  
  // Actions
  addBlock: (type: BlockType, position?: number) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  selectBlock: (id: string | null) => void;
  duplicateBlock: (id: string) => void;
  
  // Mode & Device
  setMode: (mode: 'edit' | 'preview') => void;
  setDevice: (device: 'mobile' | 'tablet' | 'desktop') => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Persistence
  saveLayout: () => Promise<void>;
  loadLayout: () => Promise<void>;
  resetLayout: () => void;
  
  // Utility
  getBlockById: (id: string) => Block | undefined;
}

const LayoutEditorContext = createContext<LayoutEditorContextType | undefined>(undefined);

const generateBlockId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createDefaultBlock = (type: BlockType, order: number): Block => {
  const baseBlock: Block = {
    id: generateBlockId(),
    type,
    order,
    visible: true,
    config: {},
    styles: {
      padding: { top: 40, right: 20, bottom: 40, left: 20 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    },
    responsive: {}
  };

  // Default configs por tipo
  switch (type) {
    case BlockType.HERO:
      baseBlock.config = {
        title: 'Título do Hero',
        subtitle: 'Subtítulo opcional',
        backgroundImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
        overlayOpacity: 0.5,
        height: 600,
        alignment: 'center',
        textColor: '#ffffff'
      };
      break;
    case BlockType.TEXT:
      baseBlock.config = {
        content: 'Digite seu texto aqui...',
        fontSize: 16,
        fontWeight: 400,
        color: '#000000',
        alignment: 'left'
      };
      break;
    case BlockType.IMAGE:
      baseBlock.config = {
        src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
        alt: 'Imagem',
        width: '100%',
        height: 'auto',
        objectFit: 'cover'
      };
      break;
    case BlockType.PROPERTY_GRID:
      baseBlock.config = {
        columns: 3,
        gap: 24,
        showFilters: true,
        maxItems: 6,
        sortBy: 'date'
      };
      break;
    case BlockType.STATS:
      baseBlock.config = {
        stats: [
          { value: '1.5k+', label: 'Transações' },
          { value: '2Bi', label: 'Volume de Vendas' },
          { value: '15', label: 'Anos de Experiência' }
        ],
        columns: 3
      };
      break;
    case BlockType.FORM:
      baseBlock.config = {
        title: 'Entre em Contato',
        fields: [
          { name: 'name', type: 'text', label: 'Nome', required: true },
          { name: 'email', type: 'email', label: 'E-mail', required: true },
          { name: 'phone', type: 'tel', label: 'Telefone', required: false },
          { name: 'message', type: 'textarea', label: 'Mensagem', required: true }
        ],
        submitText: 'Enviar',
        successMessage: 'Mensagem enviada com sucesso!'
      };
      break;
    case BlockType.CTA:
      baseBlock.config = {
        title: 'Pronto para começar?',
        description: 'Entre em contato conosco hoje mesmo',
        buttonText: 'Fale Conosco',
        buttonLink: '#contact',
        backgroundColor: '#4F46E5',
        textColor: '#ffffff'
      };
      break;
    case BlockType.SPACER:
      baseBlock.config = {
        height: 60
      };
      baseBlock.styles.padding = { top: 0, right: 0, bottom: 0, left: 0 };
      break;
    case BlockType.DIVIDER:
      baseBlock.config = {
        thickness: 1,
        color: '#e5e7eb',
        width: '100%',
        style: 'solid'
      };
      break;
  }

  return baseBlock;
};

export const LayoutEditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useSettings();
  
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [history, setHistory] = useState<Block[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Carregar layout ao montar
  React.useEffect(() => {
    if (settings.layout_config?.blocks) {
      setBlocks(settings.layout_config.blocks);
      setHistory([settings.layout_config.blocks]);
    }
  }, [settings.layout_config]);

  // Adicionar ao histórico
  const addToHistory = useCallback((newBlocks: Block[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBlocks);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const addBlock = useCallback((type: BlockType, position?: number) => {
    const newBlock = createDefaultBlock(type, position ?? blocks.length);
    const newBlocks = [...blocks];
    
    if (position !== undefined) {
      newBlocks.splice(position, 0, newBlock);
      // Reordenar
      newBlocks.forEach((block, idx) => {
        block.order = idx;
      });
    } else {
      newBlocks.push(newBlock);
    }
    
    setBlocks(newBlocks);
    addToHistory(newBlocks);
    setSelectedBlock(newBlock);
  }, [blocks, addToHistory]);

  const removeBlock = useCallback((id: string) => {
    const newBlocks = blocks.filter(b => b.id !== id);
    newBlocks.forEach((block, idx) => {
      block.order = idx;
    });
    setBlocks(newBlocks);
    addToHistory(newBlocks);
    if (selectedBlock?.id === id) {
      setSelectedBlock(null);
    }
  }, [blocks, selectedBlock, addToHistory]);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    const newBlocks = blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    );
    setBlocks(newBlocks);
    addToHistory(newBlocks);
    
    if (selectedBlock?.id === id) {
      setSelectedBlock({ ...selectedBlock, ...updates });
    }
  }, [blocks, selectedBlock, addToHistory]);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, movedBlock);
    
    // Reordenar
    newBlocks.forEach((block, idx) => {
      block.order = idx;
    });
    
    setBlocks(newBlocks);
    addToHistory(newBlocks);
  }, [blocks, addToHistory]);

  const selectBlock = useCallback((id: string | null) => {
    if (id === null) {
      setSelectedBlock(null);
    } else {
      const block = blocks.find(b => b.id === id);
      setSelectedBlock(block || null);
    }
  }, [blocks]);

  const duplicateBlock = useCallback((id: string) => {
    const blockToDuplicate = blocks.find(b => b.id === id);
    if (!blockToDuplicate) return;
    
    const newBlock: Block = {
      ...blockToDuplicate,
      id: generateBlockId(),
      order: blockToDuplicate.order + 1
    };
    
    const newBlocks = [...blocks];
    newBlocks.splice(blockToDuplicate.order + 1, 0, newBlock);
    
    // Reordenar
    newBlocks.forEach((block, idx) => {
      block.order = idx;
    });
    
    setBlocks(newBlocks);
    addToHistory(newBlocks);
    setSelectedBlock(newBlock);
  }, [blocks, addToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex]);
    }
  }, [history, historyIndex]);

  const saveLayout = useCallback(async () => {
    const layoutConfig: LayoutConfig = {
      version: '1.0',
      mode: 'visual',
      blocks,
      globalStyles: settings.layout_config?.globalStyles || {
        colors: {},
        fonts: {},
        spacing: {}
      },
      breakpoints: settings.layout_config?.breakpoints || {
        mobile: 375,
        tablet: 768,
        desktop: 1440
      }
    };

    await updateSettings({
      ...settings,
      layout_config: layoutConfig
    });
  }, [blocks, settings, updateSettings]);

  const loadLayout = useCallback(async () => {
    if (settings.layout_config?.blocks) {
      setBlocks(settings.layout_config.blocks);
      setHistory([settings.layout_config.blocks]);
      setHistoryIndex(0);
    }
  }, [settings.layout_config]);

  const resetLayout = useCallback(() => {
    setBlocks([]);
    setSelectedBlock(null);
    setHistory([[]]);
    setHistoryIndex(0);
  }, []);

  const getBlockById = useCallback((id: string) => {
    return blocks.find(b => b.id === id);
  }, [blocks]);

  const value: LayoutEditorContextType = {
    blocks,
    selectedBlock,
    mode,
    device,
    history,
    historyIndex,
    addBlock,
    removeBlock,
    updateBlock,
    moveBlock,
    selectBlock,
    duplicateBlock,
    setMode,
    setDevice,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    saveLayout,
    loadLayout,
    resetLayout,
    getBlockById
  };

  return (
    <LayoutEditorContext.Provider value={value}>
      {children}
    </LayoutEditorContext.Provider>
  );
};

export const useLayoutEditor = () => {
  const context = useContext(LayoutEditorContext);
  if (!context) {
    throw new Error('useLayoutEditor deve ser usado dentro de um LayoutEditorProvider');
  }
  return context;
};
