
import React from 'react';
import { Block, BlockType } from '../../types';
import { useLayoutEditor } from '../../context/LayoutEditorContext';
import { 
  Type, 
  Image as ImageIcon, 
  Layout, 
  BarChart3, 
  Mail, 
  MessageSquare,
  Images,
  Map,
  Code,
  Minus,
  CreditCard,
  UserCircle,
  Megaphone,
  AlignJustify
} from 'lucide-react';

const WIDGET_CATEGORIES = [
  {
    name: 'Básicos',
    widgets: [
      { type: BlockType.HERO, icon: Layout, label: 'Hero/Banner', description: 'Seção principal com imagem de fundo' },
      { type: BlockType.TEXT, icon: Type, label: 'Texto', description: 'Bloco de texto editável' },
      { type: BlockType.IMAGE, icon: ImageIcon, label: 'Imagem', description: 'Imagem com controles' },
      { type: BlockType.SPACER, icon: Minus, label: 'Espaçador', description: 'Espaço em branco' },
      { type: BlockType.DIVIDER, icon: Minus, label: 'Divisor', description: 'Linha divisória' },
    ]
  },
  {
    name: 'Conteúdo',
    widgets: [
      { type: BlockType.PROPERTY_GRID, icon: Layout, label: 'Grid de Imóveis', description: 'Grade de propriedades' },
      { type: BlockType.STATS, icon: BarChart3, label: 'Estatísticas', description: 'Números e métricas' },
      { type: BlockType.TESTIMONIALS, icon: MessageSquare, label: 'Depoimentos', description: 'Avaliações de clientes' },
      { type: BlockType.GALLERY, icon: Images, label: 'Galeria', description: 'Galeria de imagens' },
      { type: BlockType.BROKER_CARD, icon: UserCircle, label: 'Card do Corretor', description: 'Informações do corretor' },
    ]
  },
  {
    name: 'Interação',
    widgets: [
      { type: BlockType.FORM, icon: Mail, label: 'Formulário', description: 'Formulário de contato' },
      { type: BlockType.CTA, icon: Megaphone, label: 'Call-to-Action', description: 'Botão de ação' },
      { type: BlockType.MAP, icon: Map, label: 'Mapa', description: 'Mapa de localização' },
    ]
  },
  {
    name: 'Avançado',
    widgets: [
      { type: BlockType.CUSTOM_HTML, icon: Code, label: 'HTML Customizado', description: 'Código HTML personalizado' },
      { type: BlockType.FOOTER, icon: AlignJustify, label: 'Rodapé', description: 'Rodapé do site' },
    ]
  }
];

export const WidgetPanel: React.FC = () => {
  const { addBlock } = useLayoutEditor();

  const handleDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData('blockType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-900">Widgets</h3>
        <p className="text-xs text-slate-500 mt-1">Arraste para o canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {WIDGET_CATEGORIES.map((category) => (
          <div key={category.name}>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2">
              {category.name}
            </h4>
            <div className="space-y-2">
              {category.widgets.map((widget) => {
                const Icon = widget.icon;
                return (
                  <div
                    key={widget.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, widget.type)}
                    onClick={() => addBlock(widget.type)}
                    className="group bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl p-3 cursor-move transition-all hover:shadow-md active:scale-95"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white group-hover:bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-colors">
                        <Icon size={18} className="text-slate-600 group-hover:text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-900 truncate">
                          {widget.label}
                        </p>
                        <p className="text-[10px] text-slate-500 group-hover:text-indigo-600 leading-tight mt-0.5">
                          {widget.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <p className="text-[9px] text-slate-400 text-center uppercase tracking-wider">
          Clique ou arraste para adicionar
        </p>
      </div>
    </div>
  );
};
