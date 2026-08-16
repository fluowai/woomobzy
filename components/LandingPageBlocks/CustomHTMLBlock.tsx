import { logger } from '@/utils/logger';
import React, { useMemo, useState } from 'react';
import { CustomHTMLBlockConfig } from '../../types/landingPage';
import {
  PublicLeadContext,
  submitPublicLead,
} from '../../services/publicLeadCapture';
import { sanitizeLandingHtml } from '../../utils/sanitizeLandingHtml';

interface CustomHTMLBlockProps {
  config: CustomHTMLBlockConfig;
  leadContext?: PublicLeadContext;
  enableFormSubmission?: boolean;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderEditableTemplate = (
  html: string,
  fields?: CustomHTMLBlockConfig['editableFields']
) => {
  if (!fields?.length) return html;

  return fields.reduce((output, field) => {
    const token = new RegExp(`{{${field.key}}}`, 'g');
    return output.replace(token, escapeHtml(field.value || ''));
  }, html);
};

const valueFromForm = (
  form: HTMLFormElement,
  names: string[],
  hints: string[]
) => {
  const controls = Array.from(
    form.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('input:not([type="checkbox"]), select, textarea')
  );
  const named = names
    .map((name) => form.elements.namedItem(name))
    .find(
      (element) =>
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
    );
  if (
    named instanceof HTMLInputElement ||
    named instanceof HTMLSelectElement ||
    named instanceof HTMLTextAreaElement
  ) {
    return named.value.trim();
  }
  const hinted = controls.find((control) => {
    const text =
      `${control.name} ${control.getAttribute('placeholder') || ''}`.toLowerCase();
    return hints.some((hint) => text.includes(hint));
  });
  return hinted?.value.trim() || '';
};

const CustomHTMLBlock: React.FC<CustomHTMLBlockProps> = ({
  config,
  leadContext = {},
  enableFormSubmission = false,
}) => {
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');
  const html = useMemo(
    () =>
      sanitizeLandingHtml(
        renderEditableTemplate(config.html, config.editableFields)
      ),
    [config.editableFields, config.html]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLDivElement>) => {
    if (!enableFormSubmission || !(event.target instanceof HTMLFormElement)) {
      return;
    }
    event.preventDefault();
    const form = event.target;
    setStatus('submitting');
    setMessage('Enviando seus dados...');
    try {
      await submitPublicLead(
        {
          name: valueFromForm(form, ['name', 'nome'], ['nome']),
          email: valueFromForm(form, ['email'], ['e-mail', 'email']),
          phone: valueFromForm(
            form,
            ['phone', 'telefone', 'whatsapp'],
            ['telefone', 'whatsapp']
          ),
          notes: valueFromForm(
            form,
            ['message', 'mensagem', 'interest', 'interesse'],
            ['mensagem', 'interesse']
          ),
        },
        leadContext
      );
      form.reset();
      setStatus('success');
      setMessage(
        'Dados enviados. Em breve, um especialista entrará em contato.'
      );
    } catch (error) {
      logger.error('Erro ao enviar formulário da landing page:', error);
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar seus dados. Tente novamente.'
      );
    }
  };

  return (
    <div
      className="custom-html-block-container w-full"
      onSubmit={handleSubmit}
      aria-busy={status === 'submitting'}
    >
      {config.css && <style>{config.css}</style>}
      <div dangerouslySetInnerHTML={{ __html: html }} className="w-full" />
      {enableFormSubmission && message && (
        <p
          role={status === 'error' ? 'alert' : 'status'}
          className={`mx-auto my-4 max-w-2xl rounded-xl px-4 py-3 text-center text-sm font-semibold ${
            status === 'error'
              ? 'bg-red-50 text-red-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default CustomHTMLBlock;
