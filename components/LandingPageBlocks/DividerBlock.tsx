import React from 'react';
import { Home, Key, Star, Sparkles } from 'lucide-react';
import { DividerBlockConfig } from '../../types/landingPage';

interface DividerBlockProps {
  config: DividerBlockConfig;
}

const DividerBlock: React.FC<DividerBlockProps> = ({ config }) => {
  const Icon = () => {
    // Optional: add config for icon choice later
    return <Sparkles size={20} className="text-gray-300" />;
  };

  const getBorderStyle = () => {
    switch(config.style) {
      case 'dotted': return 'dotted';
      case 'dashed': return 'dashed';
      default: return 'solid';
    }
  };

  return (
    <div className="w-full flex items-center justify-center gap-4 opacity-50">
      <div 
        className="flex-grow"
        style={{
          height: 0,
          borderTopWidth: `${config.thickness || 1}px`,
          borderTopStyle: getBorderStyle(),
          borderColor: config.color || '#e5e7eb',
          width: config.width || '100%'
        }}
      />
      
      {/* Optional center icon logic could be added here */}
      
      {config.width !== '100%' && (
        <div 
          className="flex-grow"
          style={{
            height: 0,
            borderTopWidth: `${config.thickness || 1}px`,
            borderTopStyle: getBorderStyle(),
            borderColor: config.color || '#e5e7eb',
            width: config.width || '100%'
          }}
        />
      )}
    </div>
  );
};

export default DividerBlock;
