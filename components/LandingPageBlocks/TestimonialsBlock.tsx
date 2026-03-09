import React from 'react';
import { Star, Quote } from 'lucide-react';
import { TestimonialsBlockConfig } from '../../types/landingPage';

interface TestimonialsBlockProps {
  config: TestimonialsBlockConfig;
  theme: any;
}

const TestimonialsBlock: React.FC<TestimonialsBlockProps> = ({ config, theme }) => {
  const primaryColor = theme.primaryColor || '#3b82f6';

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={i < rating ? "fill-current" : "text-gray-200"}
            style={{ color: i < rating ? '#fbbf24' : undefined }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className={`grid gap-8 ${
        config.layout === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1 md:grid-cols-2' // Carousel layout fallback to grid for now simpler implementation
      }`}>
        {config.testimonials.map((item, index) => (
          <div 
            key={index}
            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full relative"
          >
            <Quote 
              className="absolute top-6 right-6 opacity-10" 
              size={40} 
              style={{ color: primaryColor }}
            />
            
            {config.showRating && renderStars(item.rating)}
            
            <p className="text-gray-600 mb-6 flex-grow italic leading-relaxed">
              "{item.text}"
            </p>
            
            <div className="flex items-center gap-4 mt-auto">
              {item.photo ? (
                <img 
                  src={item.photo} 
                  alt={item.name} 
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  {item.name.charAt(0)}
                </div>
              )}
              
              <div>
                <h4 className="font-bold text-gray-900">{item.name}</h4>
                {item.date && (
                  <span className="text-xs text-gray-400 block">{item.date}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestimonialsBlock;
