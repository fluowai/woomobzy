
import React from 'react';
import { Block, BlockType } from '../../types';
import { HeroBlock } from './Blocks/HeroBlock';
import { TextBlock } from './Blocks/TextBlock';
import { ImageBlock } from './Blocks/ImageBlock';
import { PropertyGridBlock } from './Blocks/PropertyGridBlock';
import { StatsBlock } from './Blocks/StatsBlock';
import { FormBlock } from './Blocks/FormBlock';
import { CTABlock } from './Blocks/CTABlock';
import { SpacerBlock } from './Blocks/SpacerBlock';
import { DividerBlock } from './Blocks/DividerBlock';
import { TestimonialsBlock } from './Blocks/TestimonialsBlock';
import { GalleryBlock } from './Blocks/GalleryBlock';
import { MapBlock } from './Blocks/MapBlock';
import { BrokerCardBlock } from './Blocks/BrokerCardBlock';
import { FooterBlock } from './Blocks/FooterBlock';
import { CustomHTMLBlock } from './Blocks/CustomHTMLBlock';

interface BlockRendererProps {
  block: Block;
  isEditing?: boolean;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ block, isEditing = true }) => {
  // Aplicar estilos do bloco
  const blockStyles: React.CSSProperties = {
    paddingTop: block.styles.padding?.top || 0,
    paddingRight: block.styles.padding?.right || 0,
    paddingBottom: block.styles.padding?.bottom || 0,
    paddingLeft: block.styles.padding?.left || 0,
    marginTop: block.styles.margin?.top || 0,
    marginRight: block.styles.margin?.right || 0,
    marginBottom: block.styles.margin?.bottom || 0,
    marginLeft: block.styles.margin?.left || 0,
    width: block.styles.width,
    height: block.styles.height,
    display: block.styles.display,
    textAlign: block.styles.textAlign,
  };

  // Background
  if (block.styles.background) {
    const bg = block.styles.background;
    if (bg.type === 'color') {
      blockStyles.backgroundColor = bg.value;
    } else if (bg.type === 'gradient') {
      blockStyles.background = bg.value;
    } else if (bg.type === 'image') {
      blockStyles.backgroundImage = `url(${bg.value})`;
      blockStyles.backgroundSize = 'cover';
      blockStyles.backgroundPosition = 'center';
    }
  }

  // Border
  if (block.styles.border) {
    const border = block.styles.border;
    blockStyles.border = `${border.width}px ${border.style} ${border.color}`;
    blockStyles.borderRadius = border.radius;
  }

  // Shadow
  if (block.styles.shadow) {
    blockStyles.boxShadow = block.styles.shadow;
  }

  // Renderizar componente específico baseado no tipo
  const renderBlockContent = () => {
    switch (block.type) {
      case BlockType.HERO:
        return <HeroBlock block={block} isEditing={isEditing} />;
      case BlockType.TEXT:
        return <TextBlock block={block} isEditing={isEditing} />;
      case BlockType.IMAGE:
        return <ImageBlock block={block} isEditing={isEditing} />;
      case BlockType.PROPERTY_GRID:
        return <PropertyGridBlock block={block} isEditing={isEditing} />;
      case BlockType.STATS:
        return <StatsBlock block={block} isEditing={isEditing} />;
      case BlockType.FORM:
        return <FormBlock block={block} isEditing={isEditing} />;
      case BlockType.CTA:
        return <CTABlock block={block} isEditing={isEditing} />;
      case BlockType.SPACER:
        return <SpacerBlock block={block} isEditing={isEditing} />;
      case BlockType.DIVIDER:
        return <DividerBlock block={block} isEditing={isEditing} />;
      case BlockType.TESTIMONIALS:
        return <TestimonialsBlock block={block} isEditing={isEditing} />;
      case BlockType.GALLERY:
        return <GalleryBlock block={block} isEditing={isEditing} />;
      case BlockType.MAP:
        return <MapBlock block={block} isEditing={isEditing} />;
      case BlockType.BROKER_CARD:
        return <BrokerCardBlock block={block} isEditing={isEditing} />;
      case BlockType.FOOTER:
        return <FooterBlock block={block} isEditing={isEditing} />;
      case BlockType.CUSTOM_HTML:
        return <CustomHTMLBlock block={block} isEditing={isEditing} />;
      default:
        return (
          <div className="p-8 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg text-center">
            <p className="text-slate-500 font-medium">
              Bloco "{block.type}" ainda não implementado
            </p>
          </div>
        );
    }
  };

  return (
    <div style={blockStyles} className="block-wrapper">
      {renderBlockContent()}
    </div>
  );
};
