
import React from 'react';
import { Block, StatsBlockConfig } from '../../../types';

interface StatsBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const StatsBlock: React.FC<StatsBlockProps> = ({ block, isEditing }) => {
  const config = block.config as StatsBlockConfig;

  return (
    <div 
      className="grid gap-8"
      style={{
        gridTemplateColumns: `repeat(${config.columns || 3}, minmax(0, 1fr))`
      }}
    >
      {config.stats?.map((stat, index) => (
        <div key={index} className="text-center">
          <div className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
            {stat.value}
          </div>
          <div className="text-sm uppercase tracking-wider text-slate-500 font-medium">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};
