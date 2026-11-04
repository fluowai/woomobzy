import { X, CheckCircle2 } from 'lucide-react';
import { useTexts } from '../context/TextsContext';
import { useSettings } from '../context/SettingsContext';
import InlineEditable from './InlineEditable';

interface LeadCaptureModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  leadSuccess: boolean;
  leadForm: { name: string; phone: string; email: string; subject: string };
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (field: string, value: string) => void;
}

const LeadCaptureModal: React.FC<LeadCaptureModalProps> = ({
  isOpen,
  isSubmitting,
  leadSuccess,
  leadForm,
  onClose,
  onSubmit,
  onFormChange,
}) => {
  const { t } = useTexts();
  const { settings } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        onClick={onClose}
      ></div>
      <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-black transition-colors"
        >
          <X size={24} />
        </button>
        <div className="p-12 md:p-16">
          <div className="mb-10 text-center">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block"
              style={{ color: settings.primaryColor }}
            >
              <InlineEditable textKey="lead_modal.badge">
                {t('lead_modal.badge', 'Atendimento Select')}
              </InlineEditable>
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-black uppercase italic tracking-tighter leading-none mb-4">
              <InlineEditable textKey="lead_modal.title_line1">
                {t('lead_modal.title_line1', 'Como podemos')}
              </InlineEditable>{' '}
              <br />
              <span style={{ color: settings.primaryColor }}>
                <InlineEditable textKey="lead_modal.title_line2">
                  {t('lead_modal.title_line2', 'Ajudar você?')}
                </InlineEditable>
              </span>
            </h2>
            <p className="text-black/60 font-medium italic">
              <InlineEditable textKey="lead_modal.subtitle">
                {t(
                  'lead_modal.subtitle',
                  'Preencha os dados abaixo e um consultor entrará em contato em instantes.'
                )}
              </InlineEditable>
            </p>
          </div>

          {leadSuccess ? (
            <div className="text-center py-10 animate-bounce">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-black uppercase italic">
                Mensagem Enviada!
              </h3>
              <p className="text-black/60">Obrigado pela confiança.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">
                  <InlineEditable textKey="lead_modal.form_name_label">
                    {t('lead_modal.form_name_label', 'Seu Nome Completo')}
                  </InlineEditable>
                </p>
                <input
                  required
                  type="text"
                  className="w-full px-8 py-5 rounded-full bg-slate-50 border border-slate-100 focus:border-slate-300 focus:bg-white transition-all outline-none font-bold text-slate-700"
                  placeholder={t(
                    'lead_modal.form_name_placeholder',
                    'Ex: João da Silva'
                  )}
                  value={leadForm.name}
                  onChange={(e) => onFormChange('name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">
                    <InlineEditable textKey="lead_modal.form_phone_label">
                      {t('lead_modal.form_phone_label', 'WhatsApp')}
                    </InlineEditable>
                  </p>
                  <input
                    required
                    type="tel"
                    className="w-full px-8 py-5 rounded-full bg-slate-50 border border-slate-100 focus:border-slate-300 focus:bg-white transition-all outline-none font-bold text-slate-700"
                    placeholder={t(
                      'lead_modal.form_phone_placeholder',
                      '(00) 00000-0000'
                    )}
                    value={leadForm.phone}
                    onChange={(e) => onFormChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">
                    <InlineEditable textKey="lead_modal.form_email_label">
                      {t('lead_modal.form_email_label', 'E-mail (Opcional)')}
                    </InlineEditable>
                  </p>
                  <input
                    type="email"
                    className="w-full px-8 py-5 rounded-full bg-slate-50 border border-slate-100 focus:border-slate-300 focus:bg-white transition-all outline-none font-bold text-slate-700"
                    placeholder={t(
                      'lead_modal.form_email_placeholder',
                      'contato@email.com'
                    )}
                    value={leadForm.email}
                    onChange={(e) => onFormChange('email', e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full py-6 rounded-full font-bold uppercase text-xs tracking-[0.3em] text-white transition-all shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  {isSubmitting
                    ? t('lead_modal.submitting', 'Enviando...')
                    : t(
                        'lead_modal.submit_button',
                        'Solicitar Atendimento Exclusivo'
                      )}
                </button>
              </div>
            </form>
          )}
        </div>
        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {t(
              'lead_modal.privacy_notice',
              'Sua privacidade é nossa prioridade absoluta.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeadCaptureModal;
