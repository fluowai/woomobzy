import React from 'react';
import { Block } from '../../../types';
import { Star } from 'lucide-react';

interface TestimonialsBlockProps {
  block: Block;
  isEditing?: boolean;
}

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar?: string;
  rating?: number;
}

export const TestimonialsBlock: React.FC<TestimonialsBlockProps> = ({
  block,
}) => {
  const config = block.config as any;

  const testimonials: Testimonial[] = config.testimonials || [
    {
      name: 'João Silva',
      role: 'Investidor',
      content:
        'Excelente atendimento e propriedades de alta qualidade. Recomendo!',
      rating: 5,
    },
    {
      name: 'Maria Santos',
      role: 'Compradora',
      content:
        'Encontrei a fazenda perfeita para meu negócio. Equipe muito profissional.',
      rating: 5,
    },
    {
      name: 'Carlos Mendes',
      role: 'Vendedor',
      content: 'Venderam minha propriedade em tempo recorde. Muito satisfeito!',
      rating: 5,
    },
  ];

  const columns = config.columns || 3;

  return (
    <div>
      {config.title && (
        <h2 className="text-3xl font-bold text-center mb-12">{config.title}</h2>
      )}

      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex text-amber-400 mb-6">
              {[...Array(testimonial.rating || 5)].map((_, i) => (
                <Star key={i} size={20} fill="currentColor" />
              ))}
            </div>
            <p className="text-slate-600 mb-8 italic">
              &quot;{testimonial.content}&quot;
            </p>

            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                {testimonial.avatar ? (
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  testimonial.name.charAt(0)
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900">{testimonial.name}</p>
                <p className="text-xs text-slate-500">{testimonial.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
