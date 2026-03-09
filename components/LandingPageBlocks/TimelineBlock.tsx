import React from 'react';
import { Circle, CheckCircle, Clock } from 'lucide-react';

export interface TimelineItem {
  title: string;
  description: string;
  time?: string;
  icon?: string;
}

export interface TimelineBlockConfig {
  items: TimelineItem[];
  title?: string;
  layout?: 'left' | 'center';
  color?: string;
}

interface TimelineBlockProps {
  config: TimelineBlockConfig;
  theme: any;
}

const TimelineBlock: React.FC<TimelineBlockProps> = ({ config, theme }) => {
  const primaryColor = config.color || theme.primaryColor || '#3b82f6';

  return (
    <div className="py-8">
      {config.title && (
        <h3 className="text-2xl font-bold text-center mb-12" style={{ fontFamily: theme.headingFontFamily }}>
          {config.title}
        </h3>
      )}

      <div className="relative max-w-3xl mx-auto">
        {/* Vertical Line */}
        <div 
          className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 transform md:-translate-x-1/2 bg-gray-200"
        />

        <div className="space-y-12">
          {config.items.map((item, index) => (
            <div key={index} className="relative flex items-center md:justify-center">
              {/* Icon Marker */}
              <div 
                className="absolute left-8 md:left-1/2 transform -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full border-4 border-white shadow-sm z-10"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
              </div>

              <div className={`flex flex-col md:flex-row w-full ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                {/* Content Side */}
                <div className="w-full md:w-1/2 pl-24 md:pl-0 md:pr-12 md:text-right">
                  <div className={`
                    bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative
                    ${index % 2 === 0 ? 'md:text-left md:ml-12' : 'md:text-right md:mr-12'}
                  `}>
                    {/* Time Badge */}
                    {item.time && (
                      <span 
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3"
                        style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                      >
                        {item.time}
                      </span>
                    )}
                    
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </div>

                {/* Empty Side */}
                <div className="hidden md:block w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimelineBlock;
