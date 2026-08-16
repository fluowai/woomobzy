import React from 'react';
import { CTABlockConfig, LandingPageTheme } from '../../types/landingPage';

interface CTABlockProps {
  config: CTABlockConfig;
  theme: LandingPageTheme;
}

const CTABlock: React.FC<CTABlockProps> = ({ config, theme }) => {
  return (
    <div
      className="py-10 sm:py-16 px-4 text-center"
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
      }}
    >
      <div className="max-w-3xl mx-auto">
        <h2
          className="font-bold mb-3 sm:mb-4"
          style={{
            fontFamily: theme.headingFontFamily || theme.fontFamily,
            fontSize: 'clamp(1.7rem, 5vw, 2.5rem)',
            lineHeight: 1.2,
          }}
        >
          {config.title}
        </h2>

        {config.description && (
          <p className="mb-6 sm:mb-8 opacity-90" style={{ fontSize: '1.25em' }}>
            {config.description}
          </p>
        )}

        <a
          href={config.buttonLink}
          className="inline-block px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold transition-transform hover:scale-105"
          style={{
            backgroundColor: config.textColor,
            color: config.backgroundColor,
            fontSize: '1em',
          }}
        >
          {config.buttonText}
        </a>
      </div>
    </div>
  );
};

export default CTABlock;
