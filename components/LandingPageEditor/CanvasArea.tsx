import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Block, BlockType, LandingPageTheme } from '../../types/landingPage';
import {
  GripVertical,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Settings,
} from 'lucide-react';
import HeaderBlock from '../LandingPageBlocks/HeaderBlock';
import FooterBlock from '../LandingPageBlocks/FooterBlock';
import HeroBlock from '../LandingPageBlocks/HeroBlock';
import HeroWithFormBlock from '../LandingPageBlocks/HeroWithFormBlock';
import PropertyGridBlock from '../LandingPageBlocks/PropertyGridBlock';
import TextBlock from '../LandingPageBlocks/TextBlock';
import FormBlock from '../LandingPageBlocks/FormBlock';
import CTABlock from '../LandingPageBlocks/CTABlock';
import SpacerBlock from '../LandingPageBlocks/SpacerBlock';
import GalleryBlock from '../LandingPageBlocks/GalleryBlock';
import StatsBlock from '../LandingPageBlocks/StatsBlock';
import ImageBlock from '../LandingPageBlocks/ImageBlock';
import PropertyCarouselBlock from '../LandingPageBlocks/PropertyCarouselBlock';
import MapBlock from '../LandingPageBlocks/MapBlock';
import TimelineBlock from '../LandingPageBlocks/TimelineBlock';
import VideoBlock from '../LandingPageBlocks/VideoBlock';
import TestimonialsBlock from '../LandingPageBlocks/TestimonialsBlock';
import BrokerCardBlock from '../LandingPageBlocks/BrokerCardBlock';
import DividerBlock from '../LandingPageBlocks/DividerBlock';
import CustomHTMLBlock from '../LandingPageBlocks/CustomHTMLBlock';
import { useSettings } from '../../context/SettingsContext';

interface CanvasAreaProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  themeConfig: LandingPageTheme;
  viewMode: 'desktop' | 'tablet' | 'mobile';
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  themeConfig,
  viewMode,
}) => {
  const { settings } = useSettings();

  return (
    <div className="relative">
      {blocks.map((block) => (
        <SortableBlock
          key={block.id}
          block={block}
          isSelected={selectedBlockId === block.id}
          onSelect={() => onSelectBlock(block.id)}
          onUpdate={(updates) => onUpdateBlock(block.id, updates)}
          onDelete={() => onDeleteBlock(block.id)}
          onDuplicate={() => onDuplicateBlock(block.id)}
          themeConfig={themeConfig}
          viewMode={viewMode}
          settings={settings}
        />
      ))}
    </div>
  );
};

interface SortableBlockProps {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  themeConfig: LandingPageTheme;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  settings?: any;
}

const SortableBlock: React.FC<SortableBlockProps> = ({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  themeConfig,
  viewMode,
  settings,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ visible: !block.visible });
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${!block.visible ? 'opacity-50' : ''}`}
    >
      {/* Block Wrapper with Selection */}
      <div
        onClick={onSelect}
        className={`relative transition-all ${
          isSelected
            ? 'ring-2 ring-blue-500 ring-offset-2'
            : 'hover:ring-2 hover:ring-gray-300'
        }`}
      >
        {/* Toolbar */}
        <div
          className={`absolute -top-10 left-0 right-0 flex items-center justify-between bg-gray-900 text-white px-3 py-2 rounded-t-lg transition-opacity ${
            isSelected || isDragging
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          }`}
          style={{ zIndex: 10 }}
        >
          <div className="flex items-center gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-700 rounded"
            >
              <GripVertical size={16} />
            </div>
            <span className="text-sm font-medium">
              {getBlockTypeName(block.type)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleVisibility}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title={block.visible ? 'Ocultar' : 'Mostrar'}
            >
              {block.visible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button
              onClick={handleDuplicate}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Duplicar"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-red-600 rounded transition-colors"
              title="Excluir"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Block Content */}
        <div style={block.styles as any}>
          {block.styles.customCss && (
            <style>{`.block-${block.id} { ${block.styles.customCss} }`}</style>
          )}
          <div className={`block-${block.id}`}>
            {renderBlock(block, themeConfig, viewMode, settings)}
          </div>
        </div>
      </div>
    </div>
  );
};

function renderBlock(
  block: Block,
  themeConfig: LandingPageTheme,
  viewMode: string,
  settings?: any
) {
  if (!block.visible) {
    return (
      <div className="bg-gray-100 border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
        <EyeOff className="mx-auto mb-2" size={32} />
        <p>Bloco oculto</p>
      </div>
    );
  }

  switch (block.type) {
    case BlockType.HEADER:
      return <HeaderBlock config={block.config} theme={themeConfig} />;

    case BlockType.FOOTER:
      return <FooterBlock config={block.config} theme={themeConfig} />;

    case BlockType.HERO:
      return <HeroBlock config={block.config} theme={themeConfig} />;

    case BlockType.HERO_WITH_FORM:
      return <HeroWithFormBlock config={block.config} theme={themeConfig} />;

    case BlockType.PROPERTY_GRID:
      return <PropertyGridBlock config={block.config} theme={themeConfig} />;

    case BlockType.TEXT:
      return <TextBlock config={block.config} theme={themeConfig} />;

    case BlockType.IMAGE:
      return <ImageBlock config={block.config} theme={themeConfig} />;

    case BlockType.GALLERY:
      return <GalleryBlock config={block.config} theme={themeConfig} />;

    case BlockType.PROPERTY_CAROUSEL:
      return (
        <PropertyCarouselBlock config={block.config} theme={themeConfig} />
      );

    case BlockType.STATS:
      return <StatsBlock config={block.config} theme={themeConfig} />;

    case BlockType.FORM:
      return <FormBlock config={block.config} theme={themeConfig} />;

    case BlockType.CTA:
      return <CTABlock config={block.config} theme={themeConfig} />;

    case BlockType.MAP:
      return <MapBlock config={block.config} theme={themeConfig} />;

    case BlockType.TIMELINE:
      return <TimelineBlock config={block.config} theme={themeConfig} />;

    case BlockType.VIDEO:
      return <VideoBlock config={block.config} theme={themeConfig} />;

    case BlockType.TESTIMONIALS:
      return <TestimonialsBlock config={block.config} theme={themeConfig} />;

    case BlockType.BROKER_CARD:
      return (
        <BrokerCardBlock
          config={block.config}
          theme={themeConfig}
          settings={settings}
        />
      );

    case BlockType.DIVIDER:
      return <DividerBlock config={block.config} />;

    case BlockType.SPACER:
      return <SpacerBlock config={block.config} />;

    case BlockType.CUSTOM_HTML:
      return <CustomHTMLBlock config={block.config as any} />;

    default:
      return (
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
          <Settings className="mx-auto mb-2" size={32} />
          <p>Bloco: {block.type}</p>
          <p className="text-xs mt-1">Em desenvolvimento</p>
        </div>
      );
  }
}

function getBlockTypeName(type: BlockType): string {
  const names: Record<BlockType, string> = {
    [BlockType.HEADER]: 'Cabeçalho',
    [BlockType.FOOTER]: 'Rodapé',
    [BlockType.HERO]: 'Hero',
    [BlockType.HERO_WITH_FORM]: 'Hero com Formulário',
    [BlockType.PROPERTY_GRID]: 'Grade de Imóveis',
    [BlockType.PROPERTY_CAROUSEL]: 'Carrossel de Imóveis',
    [BlockType.PROPERTY_FEATURED]: 'Imóvel em Destaque',
    [BlockType.PROPERTY_SEARCH]: 'Busca de Imóveis',
    [BlockType.TEXT]: 'Texto',
    [BlockType.IMAGE]: 'Imagem',
    [BlockType.VIDEO]: 'Vídeo',
    [BlockType.GALLERY]: 'Galeria',
    [BlockType.FORM]: 'Formulário',
    [BlockType.CTA]: 'Call to Action',
    [BlockType.TESTIMONIALS]: 'Depoimentos',
    [BlockType.STATS]: 'Estatísticas',
    [BlockType.MAP]: 'Mapa',
    [BlockType.BROKER_CARD]: 'Card do Corretor',
    [BlockType.DIVIDER]: 'Divisor',
    [BlockType.FEATURES]: 'Funcionalidades',
    [BlockType.SPACER]: 'Espaçador',
    [BlockType.TIMELINE]: 'Linha do Tempo',
    [BlockType.CUSTOM_HTML]: 'HTML Customizado',
  };

  return names[type] || type;
}

export default CanvasArea;
