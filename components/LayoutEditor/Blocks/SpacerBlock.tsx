
import React from 'react';
import { Block } from '../../../types';

interface SpacerBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const SpacerBlock: React.FC<SpacerBlockProps> = ({ block, isEditing }) => {
  const height = (block.config as any).height || 60;

  return (
    <div 
      style={{ height }}
      className={isEditing ? 'bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center' : ''}
    >
      {isEditing && (
        <span className="text-xs text-slate-400 font-medium">
          Espaçador ({height}px)
        </span>
      )}
    </div>
  );
};
