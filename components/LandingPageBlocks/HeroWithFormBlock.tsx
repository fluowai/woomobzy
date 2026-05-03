import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import {
  HeroWithFormBlockConfig,
  LandingPageTheme,
} from '../../types/landingPage';
import { Send, CheckCircle, Shield, Star, Clock } from 'lucide-react';
import { getApiUrl } from '../../src/lib/api';

interface HeroWithFormBlockProps {
  config: HeroWithFormBlockConfig;
  theme: LandingPageTheme;
}

const HeroWithFormBlock: React.FC<HeroWithFormBlockProps> = ({
  config,
  theme,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { getTrackingData, trackFacebookEvent, trackGoogleEvent } =
        await import('../../utils/tracking');
      const trackingData = getTrackingData();

      const leadData = {
        name: formData.name || '',
        email: formData.email || '',
        phone: formData.phone || '',
        message: `Interesse na região: ${formData.region || 'Não informada'}`,
        source: 'Landing Page: ' + config.title,
        ...trackingData,
      };

      const response = await fetch(getApiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });

      if (response.ok) {
        setSubmitted(true);
        trackFacebookEvent('Lead', { content_name: 'Hero Form' });
        trackGoogleEvent('generate_lead', { event_label: 'Hero Form' });
      }
    } catch (error) {
      logger.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'shield':
        return <Shield size={24} />;
      case 'star':
        return <Star size={24} />;
      case 'clock':
        return <Clock size={24} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative overflow-hidden bg-[#f5f2eb]">
      {/* Hero Background Section */}
      <div
        className="relative min-h-[500px] flex flex-col items-center justify-start pt-16 px-4"
        style={{
          backgroundImage: config.backgroundImage
            ? `url(${config.backgroundImage})`
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay for better text readability */}
        <div
          className="absolute inset-0 bg-black/20 pointer-events-none"
          style={{ opacity: config.overlayOpacity }}
        />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl text-center mb-12">
          <h2 className="text-sm uppercase tracking-widest text-white/90 font-medium mb-2 drop-shadow-md">
            Encontre sua
          </h2>
          <h1
            className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg"
            style={{
              color: '#ffffff',
              fontFamily:
                theme.headingFontFamily || "'Playfair Display', serif",
            }}
          >
            {config.title}
          </h1>
          {config.subtitle && (
            <p className="text-lg md:text-xl text-white drop-shadow-md max-w-2xl mx-auto">
              {config.subtitle}
            </p>
          )}
        </div>

        {/* Form and Guide Section */}
        <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-end -mb-24 px-4 md:px-0">
          {/* Form Card */}
          <div className="bg-[#fdfbf7] p-6 rounded-t-xl shadow-2xl border-t-8 border-[#4a5d23]">
            <h3 className="text-xl font-bold text-[#333333] mb-4 text-center leading-tight">
              {config.formTitle}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {config.fields.map((field) => (
                <div key={field.name}>
                  <div className="relative">
                    {field.type === 'select' ? (
                      <select
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={(e) =>
                          handleChange(field.name, e.target.value)
                        }
                        required={field.required}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded text-gray-700 outline-none focus:ring-2 focus:ring-[#4a5d23]/50 transition-all appearance-none"
                      >
                        <option value="">{field.label}</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        name={field.name}
                        placeholder={field.label}
                        value={formData[field.name] || ''}
                        onChange={(e) =>
                          handleChange(field.name, e.target.value)
                        }
                        required={field.required}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded text-gray-700 outline-none focus:ring-2 focus:ring-[#4a5d23]/50 transition-all"
                      />
                    )}
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting || submitted}
                className="w-full py-4 bg-[#4a5d23] hover:bg-[#3d4d1d] text-white font-bold rounded shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
              >
                {submitting
                  ? 'PROCESSANDO...'
                  : submitted
                    ? 'ENVIADO COM SUCESSO!'
                    : config.submitText}
              </button>
            </form>

            {config.formSubtitle && (
              <p className="mt-4 text-[10px] text-gray-500 text-center uppercase tracking-tighter">
                {config.formSubtitle}
              </p>
            )}
          </div>

          {/* Guide Image - Hidden on mobile for focus on form */}
          <div className="hidden md:flex justify-end relative">
            <div className="relative w-full max-w-[400px]">
              {config.guideImageUrl ? (
                <img
                  src={config.guideImageUrl}
                  alt="Rural Specialist"
                  className="w-full h-auto object-contain drop-shadow-2xl"
                />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-gray-400 italic">
                  Imagem do Guia
                </div>
              )}
              {/* Callout Bubble */}
              <div className="absolute top-1/2 -left-32 bg-[#4a5d23]/90 text-white p-4 rounded-3xl rounded-tr-none shadow-xl max-w-[200px] transform rotate-[-5deg]">
                <p className="text-sm font-medium leading-tight">
                  Cadastre-se grátis e descubra a fazenda dos seus sonhos!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges Section */}
      <div className="pt-32 pb-12 px-4 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {config.badges?.map((badge, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center text-center group"
            >
              <div className="mb-4 p-4 rounded-full bg-[#f5f2eb] text-[#4a5d23] group-hover:scale-110 transition-transform">
                {getBadgeIcon(badge.icon)}
              </div>
              <h4 className="font-bold text-[#333333] mb-1">{badge.title}</h4>
              <p className="text-sm text-gray-500 leading-snug">
                {badge.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroWithFormBlock;
