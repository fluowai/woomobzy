import React from 'react';
import { Block, LandingPage } from '../../types/landingPage';
import { X, Settings } from 'lucide-react';
import HeroBlockSettings from '../LandingPageBlocks/Settings/HeroBlockSettings';
import HeroWithFormBlockSettings from '../LandingPageBlocks/Settings/HeroWithFormBlockSettings';
import PropertyGridBlockSettings from '../LandingPageBlocks/Settings/PropertyGridBlockSettings';
import TextBlockSettings from '../LandingPageBlocks/Settings/TextBlockSettings';
import FormBlockSettings from '../LandingPageBlocks/Settings/FormBlockSettings';
import CTABlockSettings from '../LandingPageBlocks/Settings/CTABlockSettings';
import SpacerBlockSettings from '../LandingPageBlocks/Settings/SpacerBlockSettings';
import CustomHTMLBlockSettings from '../LandingPageBlocks/Settings/CustomHTMLBlockSettings';
import StatsBlockSettings from '../LandingPageBlocks/Settings/StatsBlockSettings';
import FeaturesBlockSettings from '../LandingPageBlocks/Settings/FeaturesBlockSettings';
import HeaderBlockSettings from '../LandingPageBlocks/Settings/HeaderBlockSettings';
import FooterBlockSettings from '../LandingPageBlocks/Settings/FooterBlockSettings';
import ImageBlockSettings from '../LandingPageBlocks/Settings/ImageBlockSettings';
import GalleryBlockSettings from '../LandingPageBlocks/Settings/GalleryBlockSettings';
import VideoBlockSettings from '../LandingPageBlocks/Settings/VideoBlockSettings';
import PropertyCarouselBlockSettings from '../LandingPageBlocks/Settings/PropertyCarouselBlockSettings';
import PropertyFeaturedBlockSettings from '../LandingPageBlocks/Settings/PropertyFeaturedBlockSettings';
import PropertySearchBlockSettings from '../LandingPageBlocks/Settings/PropertySearchBlockSettings';
import MapBlockSettings from '../LandingPageBlocks/Settings/MapBlockSettings';
import TimelineBlockSettings from '../LandingPageBlocks/Settings/TimelineBlockSettings';
import TestimonialsBlockSettings from '../LandingPageBlocks/Settings/TestimonialsBlockSettings';
import BrokerCardBlockSettings from '../LandingPageBlocks/Settings/BrokerCardBlockSettings';
import DividerBlockSettings from '../LandingPageBlocks/Settings/DividerBlockSettings';
import BlockStylesEditor from './BlockStylesEditor';

interface PropertiesSidebarProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onClose: () => void;
  page: LandingPage;
  onUpdatePage: (page: LandingPage) => void;
}

const PropertiesSidebar: React.FC<PropertiesSidebarProps> = ({
  block,
  onUpdate,
  onClose,
  page,
  onUpdatePage,
}) => {
  const [activeTab, setActiveTab] = React.useState<'content' | 'style'>(
    'content'
  );
  const [styleMode, setStyleMode] = React.useState<'desktop' | 'mobile'>(
    'desktop'
  );

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Propriedades</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'content'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Conteúdo
        </button>
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'style'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Estilo
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'content' ? (
          <div className="space-y-4">
            {renderBlockSettings(block, onUpdate, page, onUpdatePage)}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setStyleMode('desktop')}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                  styleMode === 'desktop'
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Desktop
              </button>
              <button
                onClick={() => setStyleMode('mobile')}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                  styleMode === 'mobile'
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mobile
              </button>
            </div>
            <BlockStylesEditor
              styles={
                styleMode === 'desktop'
                  ? block.styles
                  : block.responsive?.mobile || {}
              }
              onUpdate={(styles) => {
                if (styleMode === 'desktop') {
                  onUpdate({ styles });
                } else {
                  onUpdate({
                    responsive: {
                      ...block.responsive,
                      mobile: styles,
                    },
                  });
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

function renderBlockSettings(
  block: Block,
  onUpdate: (updates: Partial<Block>) => void,
  page: LandingPage,
  onUpdatePage: (page: LandingPage) => void
) {
  const updateConfig = (config: any) => {
    onUpdate({ config });
  };

  const cfg = block.config as any;
  switch (block.type) {
    case 'header':
      return <HeaderBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'footer':
      return <FooterBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'hero':
      return <HeroBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'hero_with_form':
      return <HeroWithFormBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'property_grid':
      return (
        <PropertyGridBlockSettings
          config={cfg}
          onUpdate={updateConfig}
          page={page}
          onUpdatePage={onUpdatePage}
        />
      );

    case 'text':
      return <TextBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'form':
      return <FormBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'cta':
      return <CTABlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'spacer':
      return <SpacerBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'custom_html':
      return <CustomHTMLBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'stats':
      return <StatsBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'features':
      return <FeaturesBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'image':
      return <ImageBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'gallery':
      return <GalleryBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'video':
      return <VideoBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'property_carousel':
      return (
        <PropertyCarouselBlockSettings config={cfg} onUpdate={updateConfig} />
      );

    case 'property_featured':
      return (
        <PropertyFeaturedBlockSettings config={cfg} onUpdate={updateConfig} />
      );

    case 'property_search':
      return (
        <PropertySearchBlockSettings config={cfg} onUpdate={updateConfig} />
      );

    case 'map':
      return <MapBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'timeline':
      return <TimelineBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'testimonials':
      return <TestimonialsBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'broker_card':
      return <BrokerCardBlockSettings config={cfg} onUpdate={updateConfig} />;

    case 'divider':
      return <DividerBlockSettings config={cfg} onUpdate={updateConfig} />;

    default:
      return (
        <div className="text-center py-8 text-gray-500">
          <Settings className="mx-auto mb-2" size={32} />
          <p className="text-sm">Configurações em desenvolvimento</p>
        </div>
      );
  }
}

export default PropertiesSidebar;
