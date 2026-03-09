import React, { useState } from 'react';
import { FormBlockConfig, LandingPageTheme } from '../../types/landingPage';
import { Send, CheckCircle } from 'lucide-react';

interface FormBlockProps {
  config: FormBlockConfig;
  theme: LandingPageTheme;
}

const FormBlock: React.FC<FormBlockProps> = ({ config, theme }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Importar função de tracking
      const { getTrackingData, trackFacebookEvent, trackGoogleEvent } = await import('../../utils/tracking');
      
      // Capturar dados de tracking
      const trackingData = getTrackingData();
      
      // Preparar dados do formulário
      const leadData = {
        name: formData.name || '',
        email: formData.email || '',
        phone: formData.phone || formData.telefone || '',
        message: formData.message || formData.mensagem || '',
        ...trackingData
      };
      
      // Enviar para API
      const response = await fetch('http://localhost:3002/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      if (response.ok) {
        setSubmitted(true);
        
        // Disparar eventos de conversão
        trackFacebookEvent('Lead', {
          content_name: 'Landing Page Form',
          content_category: 'Lead Generation',
          value: 0,
          currency: 'BRL'
        });
        
        trackGoogleEvent('generate_lead', {
          event_category: 'Landing Page',
          event_label: 'Form Submission',
          value: 0
        });
        
        console.log('✅ Lead criado via landing page com tracking data');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }

    // Reset após 3 segundos
    setTimeout(() => {
      setSubmitted(false);
      setFormData({});
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle
            size={64}
            className="mx-auto mb-4"
            style={{ color: theme.secondaryColor }}
          />
          <h3
            className="text-2xl font-bold mb-2"
            style={{
              color: theme.textColor,
              fontFamily: theme.headingFontFamily || theme.fontFamily
            }}
          >
            {config.successMessage}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h2
          className="text-3xl font-bold text-center mb-8"
          style={{
            color: theme.textColor,
            fontFamily: theme.headingFontFamily || theme.fontFamily
          }}
        >
          {config.title}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {config.fields.map((field) => (
            <div key={field.name}>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: theme.textColor }}
              >
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                  style={{
                    fontFamily: theme.fontFamily
                  }}
                />
              ) : field.type === 'select' && field.options ? (
                <select
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                  style={{
                    fontFamily: theme.fontFamily
                  }}
                >
                  <option value="">Selecione...</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                  style={{
                    fontFamily: theme.fontFamily
                  }}
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-lg text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: theme.primaryColor
            }}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Enviando...
              </>
            ) : (
              <>
                <Send size={20} />
                {config.submitText}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormBlock;
