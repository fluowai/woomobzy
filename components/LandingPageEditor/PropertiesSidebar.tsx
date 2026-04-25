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
          <BlockStylesEditor
            styles={block.styles}
            onUpdate={(styles) => onUpdate({ styles })}
          />
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

  switch (block.type) {
    case 'hero':
      return (
        <HeroBlockSettings config={block.config} onUpdate={updateConfig} />
      );

    case 'hero_with_form':
      return (
        <HeroWithFormBlockSettings
          config={block.config}
          onUpdate={updateConfig}
        />
      );

    case 'property_grid':
      return (
        <PropertyGridBlockSettings
          config={block.config}
          onUpdate={updateConfig}
          page={page}
          onUpdatePage={onUpdatePage}
        />
      );

    case 'text':
      return (
        <TextBlockSettings config={block.config} onUpdate={updateConfig} />
      );

    case 'form':
      return (
        <FormBlockSettings config={block.config} onUpdate={updateConfig} />
      );

    case 'cta':
      return <CTABlockSettings config={block.config} onUpdate={updateConfig} />;

    case 'spacer':
      return (
        <SpacerBlockSettings config={block.config} onUpdate={updateConfig} />
      );

    case 'custom_html':
      return (
        <CustomHTMLBlockSettings config={block.config as any} onUpdate={updateConfig} />
      );

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
