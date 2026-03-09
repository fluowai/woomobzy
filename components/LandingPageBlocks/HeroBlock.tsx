import React from 'react';
import { HeroBlockConfig, LandingPageTheme } from '../../types/landingPage';

interface HeroBlockProps {
  config: HeroBlockConfig;
  theme: LandingPageTheme;
}

const HeroBlock: React.FC<HeroBlockProps> = ({ config, theme }) => {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: `${config.height}px`,
        minHeight: '400px',
        backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay */}
      {config.backgroundImage && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: config.overlayOpacity }}
        />
      )}

      {/* Content */}
      <div
        className="relative h-full flex items-center justify-center px-4 sm:px-6 lg:px-8"
        style={{ textAlign: config.alignment }}
      >
        <div className="max-w-4xl w-full">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 leading-tight"
            style={{
              color: config.textColor,
              fontFamily: theme.headingFontFamily || theme.fontFamily
            }}
          >
            {config.title}
          </h1>

          {config.subtitle && (
            <p
              className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 leading-relaxed"
              style={{ color: config.textColor }}
            >
              {config.subtitle}
            </p>
          )}

          {config.ctaText && config.ctaLink && (
            <a
              href={config.ctaLink}
              className="inline-block px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-transform hover:scale-105"
              style={{
                backgroundColor: theme.primaryColor,
                color: '#ffffff'
              }}
            >
              {config.ctaText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroBlock;
