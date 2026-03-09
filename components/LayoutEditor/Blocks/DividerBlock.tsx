
import React from 'react';
import { Block } from '../../../types';

interface DividerBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const DividerBlock: React.FC<DividerBlockProps> = ({ block, isEditing }) => {
  const config = block.config as any;
  
  return (
    <div className="flex items-center justify-center">
      <hr 
        style={{
          width: config.width || '100%',
          borderWidth: config.thickness || 1,
          borderStyle: config.style || 'solid',
          borderColor: config.color || '#e5e7eb'
        }}
      />
    </div>
  );
};
