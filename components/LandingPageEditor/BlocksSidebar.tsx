import React, { useState } from 'react';
import { BlockType, BLOCK_METADATA } from '../../types/landingPage';
import { 
  Type, 
  Image, 
  Video, 
  Layout,
  FormInput,
  Target,
  MessageSquare,
  BarChart3,
  Map,
  User,
  Minus,
  Code,
  Search
} from 'lucide-react';

interface BlocksSidebarProps {
  onAddBlock: (type: BlockType) => void;
}

const BlocksSidebar: React.FC<BlocksSidebarProps> = ({ onAddBlock }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'content' | 'property' | 'interactive' | 'layout'>('all');

  const blockCategories = [
    { id: 'all', label: 'Todos', icon: Layout },
    { id: 'content', label: 'Conteúdo', icon: Type },
    { id: 'property', label: 'Imóveis', icon: Layout },
    { id: 'interactive', label: 'Interativos', icon: Target },
    { id: 'layout', label: 'Layout', icon: Minus }
  ];

  const blocks = [
    {
      type: BlockType.HERO,
      name: 'Hero',
      description: 'Seção de destaque com imagem de fundo',
      icon: Image,
      category: 'content'
    },
    {
      type: BlockType.HERO_WITH_FORM,
      name: 'Hero com Formulário',
      description: 'Hero premium com captura de leads',
      icon: Target,
      category: 'content'
    },

    {
      type: BlockType.PROPERTY_GRID,
      name: 'Grade de Imóveis',
      description: 'Exibe imóveis em formato de grade',
      icon: Layout,
      category: 'property'
    },
    {
      type: BlockType.TEXT,
      name: 'Texto',
      description: 'Bloco de texto editável',
      icon: Type,
      category: 'content'
    },
    {
      type: BlockType.IMAGE,
      name: 'Imagem',
      description: 'Imagem única',
      icon: Image,
      category: 'content'
    },
    {
      type: BlockType.VIDEO,
      name: 'Vídeo',
      description: 'Embed de vídeo',
      icon: Video,
      category: 'content'
    },
    {
      type: BlockType.FORM,
      name: 'Formulário',
      description: 'Formulário de contato',
      icon: FormInput,
      category: 'interactive'
    },
    {
      type: BlockType.CTA,
      name: 'Call to Action',
      description: 'Chamada para ação',
      icon: Target,
      category: 'interactive'
    },
    {
      type: BlockType.TESTIMONIALS,
      name: 'Depoimentos',
      description: 'Carrossel de depoimentos',
      icon: MessageSquare,
      category: 'interactive'
    },
    {
      type: BlockType.STATS,
      name: 'Estatísticas',
      description: 'Números de destaque',
      icon: BarChart3,
      category: 'content'
    },
    {
      type: BlockType.MAP,
      name: 'Mapa',
      description: 'Mapa interativo',
      icon: Map,
      category: 'interactive'
    },
    {
      type: BlockType.BROKER_CARD,
      name: 'Card do Corretor',
      description: 'Informações do corretor',
      icon: User,
      category: 'content'
    },
    {
      type: BlockType.SPACER,
      name: 'Espaçador',
      description: 'Espaço em branco',
      icon: Minus,
      category: 'layout'
    },
    {
      type: BlockType.DIVIDER,
      name: 'Divisor',
      description: 'Linha divisória',
      icon: Minus,
      category: 'layout'
    },
    {
      type: BlockType.CUSTOM_HTML,
      name: 'HTML Customizado',
      description: 'Código HTML personalizado',
      icon: Code,
      category: 'layout'
    }
  ];

  const filteredBlocks = blocks.filter(block => {
    const matchesSearch = block.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         block.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || block.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Blocos</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar blocos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {blockCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id as any)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <category.icon size={14} />
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Blocks List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredBlocks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Nenhum bloco encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBlocks.map(block => {
              const Icon = block.icon;
              return (
                <button
                  key={block.type}
                  onClick={() => onAddBlock(block.type)}
                  className="w-full flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group"
                >
                  <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Icon size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-0.5">
                      {block.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {block.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600 text-center">
          Arraste blocos para o canvas para começar
        </p>
      </div>
    </div>
  );
};

export default BlocksSidebar;
