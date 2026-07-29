import React from 'react';
import { FeaturesBlockConfig, LandingPageTheme } from '../../types/landingPage';

interface FeaturesBlockProps {
  config: FeaturesBlockConfig;
  theme: LandingPageTheme;
}

const FeaturesBlock: React.FC<FeaturesBlockProps> = ({ config, theme }) => {
  const columns = Math.min(4, Math.max(1, config.columns || 3));

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div
        className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {(config.features || []).map((feature, index) => (
          <article
            key={`${feature.title}-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            {feature.icon && (
              <span className="mb-4 block text-3xl" aria-hidden="true">
                {feature.icon}
              </span>
            )}
            <h3
              className="mb-2 text-xl font-bold"
              style={{
                color: theme.textColor,
                fontFamily: theme.headingFontFamily || theme.fontFamily,
              }}
            >
              {feature.title}
            </h3>
            <p className="leading-relaxed text-slate-600">
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default FeaturesBlock;
