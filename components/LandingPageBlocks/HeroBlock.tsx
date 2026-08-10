import React from 'react';
import { HeroBlockConfig, LandingPageTheme } from '../../types/landingPage';

interface HeroBlockProps {
  config: HeroBlockConfig;
  theme: LandingPageTheme;
}

const HeroBlock: React.FC<HeroBlockProps> = ({ config, theme }) => {
  const configuredHeight = Math.max(360, config.height || 650);
  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: `${configuredHeight}px`,
        maxHeight: '90vh',
        minHeight: '420px',
        backgroundImage: `url(${config.backgroundImage || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=2000'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: config.overlayOpacity ?? 0.5 }}
      />

      {/* Content */}
      <div
        className="relative h-full flex items-center justify-center px-4 sm:px-6 lg:px-8"
        style={{ textAlign: config.alignment }}
      >
        <div className="max-w-4xl w-full">
          <h1
            className="font-bold mb-3 sm:mb-4 leading-tight"
            style={{
              color: config.textColor,
              fontFamily: theme.headingFontFamily || theme.fontFamily,
              fontSize: 'clamp(2rem, 7vw, 3rem)',
              lineHeight: 1.12,
            }}
          >
            {config.title}
          </h1>

          {config.subtitle && (
            <p
              className="mb-6 sm:mb-8 leading-relaxed"
              style={{
                color: config.textColor,
                fontSize: 'clamp(1rem, 3.5vw, 1.25rem)',
              }}
            >
              {config.subtitle}
            </p>
          )}

          {config.ctaText && config.ctaLink && (
            <a
              href={config.ctaLink}
              className="inline-block px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold transition-transform hover:scale-105"
              style={{
                backgroundColor: theme.primaryColor,
                color: '#ffffff',
                fontSize: '1em',
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
