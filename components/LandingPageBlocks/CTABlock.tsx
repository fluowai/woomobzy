import React from 'react';
import { CTABlockConfig, LandingPageTheme } from '../../types/landingPage';

interface CTABlockProps {
  config: CTABlockConfig;
  theme: LandingPageTheme;
}

const CTABlock: React.FC<CTABlockProps> = ({ config, theme }) => {
  return (
    <div
      className="py-16 px-4 text-center"
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor
      }}
    >
      <div className="max-w-3xl mx-auto">
        <h2
          className="text-4xl font-bold mb-4"
          style={{
            fontFamily: theme.headingFontFamily || theme.fontFamily
          }}
        >
          {config.title}
        </h2>

        {config.description && (
          <p className="text-xl mb-8 opacity-90">
            {config.description}
          </p>
        )}

        <a
          href={config.buttonLink}
          className="inline-block px-8 py-4 rounded-lg font-semibold text-lg transition-transform hover:scale-105"
          style={{
            backgroundColor: config.textColor,
            color: config.backgroundColor
          }}
        >
          {config.buttonText}
        </a>
      </div>
    </div>
  );
};

export default CTABlock;
