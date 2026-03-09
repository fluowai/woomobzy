import React from 'react';
import { TextBlockConfig, LandingPageTheme } from '../../types/landingPage';

interface TextBlockProps {
  config: TextBlockConfig;
  theme: LandingPageTheme;
}

const TextBlock: React.FC<TextBlockProps> = ({ config, theme }) => {
  // Ajustar tamanho de fonte para mobile (reduzir em 20-30%)
  const baseFontSize = config.fontSize || 16;
  const mobileFontSize = Math.max(14, Math.round(baseFontSize * 0.75));
  
  return (
    <div
      className="prose prose-lg max-w-none px-4 sm:px-6 lg:px-0"
      style={{
        fontSize: `${mobileFontSize}px`,
        fontWeight: config.fontWeight,
        color: config.color,
        textAlign: config.alignment,
        fontFamily: theme.fontFamily,
        lineHeight: '1.6'
      }}
    >
      <style>{`
        @media (min-width: 640px) {
          .prose {
            font-size: ${Math.round(baseFontSize * 0.85)}px;
          }
        }
        @media (min-width: 768px) {
          .prose {
            font-size: ${baseFontSize}px;
          }
        }
        .prose h1 {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          line-height: 1.2;
          margin-bottom: 1rem;
        }
        .prose h2 {
          font-size: clamp(1.5rem, 3.5vw, 2rem);
          line-height: 1.3;
          margin-bottom: 0.875rem;
        }
        .prose h3 {
          font-size: clamp(1.25rem, 3vw, 1.75rem);
          line-height: 1.4;
          margin-bottom: 0.75rem;
        }
        .prose p {
          margin-bottom: 1rem;
          line-height: 1.7;
        }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: config.content }} />
    </div>
  );
};

export default TextBlock;
