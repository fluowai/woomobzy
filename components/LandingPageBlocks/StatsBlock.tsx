import React from 'react';
import { LandingPageTheme } from '../../types/landingPage';

interface StatsBlockProps {
  config: any;
  theme: LandingPageTheme;
}

const StatsBlock: React.FC<StatsBlockProps> = ({ config, theme }) => {
  const { stats = [], columns = 3 } = config;

  return (
    <div 
      className="grid gap-8"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        backgroundColor: theme.backgroundColor || '#f9fafb'
      }}
    >
      {stats.map((stat: any, idx: number) => (
        <div key={idx} className="text-center p-6">
          {stat.icon && (
            <div className="text-4xl mb-3">{stat.icon}</div>
          )}
          <div 
            className="text-4xl font-bold mb-2"
            style={{ color: theme.primaryColor || '#3b82f6' }}
          >
            {stat.value}
          </div>
          <div 
            className="text-sm font-medium uppercase tracking-wide"
            style={{ color: theme.textColor || '#6b7280' }}
          >
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsBlock;
