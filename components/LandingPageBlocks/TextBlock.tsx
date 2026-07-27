import React from 'react';
import { TextBlockConfig, LandingPageTheme } from '../../types/landingPage';

interface TextBlockProps {
  config: TextBlockConfig;
  theme: LandingPageTheme;
}

const TextBlock: React.FC<TextBlockProps> = ({ config, theme }) => {
  return (
    <div
      className="prose prose-lg max-w-none px-4 sm:px-6 lg:px-0 text-inherit"
      style={{
        fontWeight: config.fontWeight,
        color: config.color || 'inherit',
        textAlign: config.alignment,
        fontFamily: theme.fontFamily,
        lineHeight: '1.6',
      }}
    >
      <style>{`
        .prose h1 {
          font-size: 2.5em;
          line-height: 1.2;
          margin-bottom: 1rem;
        }
        .prose h2 {
          font-size: 2em;
          line-height: 1.3;
          margin-bottom: 0.875rem;
        }
        .prose h3 {
          font-size: 1.5em;
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
