import { logger } from '@/utils/logger';
import React, { useId, useState } from 'react';
import { FormBlockConfig, LandingPageTheme } from '../../types/landingPage';
import { Send, CheckCircle } from 'lucide-react';
import {
  PublicLeadContext,
  submitPublicLead,
} from '../../services/publicLeadCapture';

interface FormBlockProps {
  config: FormBlockConfig;
  theme: LandingPageTheme;
  leadContext?: PublicLeadContext;
}

const FormBlock: React.FC<FormBlockProps> = ({
  config,
  theme,
  leadContext = {},
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const formId = useId();

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      // Importar função de tracking
      const { getTrackingData, trackFacebookEvent, trackGoogleEvent } =
        await import('../../utils/tracking');

      // Capturar dados de tracking
      const trackingData = getTrackingData();

      // Collect any custom fields into notes
      const customNotes = (config.fields || [])
        .filter((f) => !['name', 'email', 'phone', 'message'].includes(f.name))
        .map((f) => `${f.label}: ${formData[f.name] || 'Não informado'}`)
        .join('\n');

      const baseNotes = formData.message || formData.mensagem || '';
      const finalNotes = [baseNotes, customNotes].filter(Boolean).join('\n\n');

      // Preparar dados do formulário
      const leadData = {
        name: formData.name || '',
        email: formData.email || '',
        phone: formData.phone || formData.telefone || '',
        notes: finalNotes || 'Contato via Landing Page Form',
        source: 'Landing Page Form',
        ...trackingData,
        referrer_url: window.location.href,
      };

      // Enviar para API
      await submitPublicLead(leadData, leadContext);
      setSubmitted(true);

      // Disparar eventos de conversão somente após confirmação da API
      trackFacebookEvent('Lead', {
        content_name: 'Landing Page Form',
        content_category: 'Lead Generation',
        value: 0,
        currency: 'BRL',
      });

      trackGoogleEvent('generate_lead', {
        event_category: 'Landing Page',
        event_label: 'Form Submission',
        value: 0,
      });

      logger.info('✅ Lead criado via landing page com dados de tracking');
    } catch (error) {
      logger.error('Error submitting form:', error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar seus dados. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
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
              fontFamily: theme.headingFontFamily || theme.fontFamily,
            }}
          >
            {config.successMessage}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto w-full">
        <h2
          className="font-bold text-center mb-6 sm:mb-8"
          style={{
            color: theme.textColor,
            fontFamily: theme.headingFontFamily || theme.fontFamily,
            fontSize: 'clamp(1.6rem, 5vw, 2.5rem)',
            lineHeight: 1.2,
          }}
        >
          {config.title}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6"
          aria-busy={submitting}
        >
          {(config.fields || []).map((field) => {
            const fieldId = `${formId}-${field.name}`;
            return (
              <div key={field.name}>
                <label
                  htmlFor={fieldId}
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.textColor }}
                >
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    id={fieldId}
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    style={{
                      fontFamily: theme.fontFamily,
                    }}
                  />
                ) : field.type === 'select' && field.options ? (
                  <select
                    id={fieldId}
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    style={{
                      fontFamily: theme.fontFamily,
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
                    id={fieldId}
                    type={field.type}
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    style={{
                      fontFamily: theme.fontFamily,
                    }}
                  />
                )}
              </div>
            );
          })}

          {submitError && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: theme.primaryColor,
              fontSize: '1em',
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
