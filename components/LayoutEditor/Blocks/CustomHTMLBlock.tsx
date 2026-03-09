
import React from 'react';
import { Block } from '../../../types';

interface CustomHTMLBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const CustomHTMLBlock: React.FC<CustomHTMLBlockProps> = ({ block, isEditing }) => {
  const config = block.config as any;
  const htmlContent = config.html || '<p>Digite seu HTML customizado...</p>';

  if (isEditing) {
    return (
      <div className="border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            HTML Customizado
          </span>
        </div>
        <pre className="text-xs text-slate-600 bg-white p-3 rounded overflow-x-auto">
          {htmlContent}
        </pre>
      </div>
    );
  }

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      className="custom-html-block"
    />
  );
};
