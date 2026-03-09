import React, { useState } from 'react';
import { Mail, Phone, MessageCircle, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useTexts } from '../context/TextsContext';
import InlineEditable from './InlineEditable';
import axios from 'axios';

const ContactForm: React.FC = () => {
  const { settings } = useSettings();
  const { t } = useTexts();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setSubmitError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Importar função de tracking
      const { getTrackingData, trackFacebookEvent, trackGoogleEvent } = await import('../utils/tracking');
      
      // Capturar dados de tracking
      const trackingData = getTrackingData();
      
      // Enviar formulário com dados de tracking
      const response = await axios.post('http://localhost:3002/api/contact', {
        ...formData,
        ...trackingData
      });
      
      if (response.data.success) {
        setSubmitSuccess(true);
        setFormData({ name: '', email: '', phone: '', message: '' });
        
        // Disparar eventos de conversão nos pixels
        trackFacebookEvent('Lead', {
          content_name: 'Contact Form',
          content_category: 'Contact',
          value: 0,
          currency: 'BRL'
        });
        
        trackGoogleEvent('generate_lead', {
          event_category: 'Contact',
          event_label: 'Contact Form',
          value: 0
        });
        
        console.log('✅ Lead criado com tracking data:', trackingData);
        
        // Reset success message after 5 seconds
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 5000);
      }
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      setSubmitError(error.response?.data?.error || 'Erro ao enviar mensagem. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contato" className="relative bg-[#1a1a1a] py-24 md:py-32 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', 
          backgroundSize: '32px 32px' 
        }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column - Info */}
          <div className="text-white">
            <div className="inline-block px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em] bg-green-600/20 border border-green-600/30 text-green-400 mb-8">
              <InlineEditable textKey="contact.badge">{t('contact.badge', 'Fale Conosco')}</InlineEditable>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-black uppercase italic leading-tight mb-8 tracking-tighter">
              <InlineEditable textKey="contact.title">{t('contact.title', 'Vamos Conversar')}</InlineEditable><span className="text-green-600">?</span>
            </h2>
            
            <p className="text-white/60 text-lg leading-relaxed mb-12">
              <InlineEditable textKey="contact.description">{t('contact.description', 'Nossa equipe de especialistas está pronta para ajudá-lo a encontrar a propriedade rural perfeita. Entre em contato e descubra as melhores oportunidades do mercado.')}</InlineEditable>
            </p>

            {/* Contact Info Cards */}
            <div className="space-y-6">
              <div className="flex items-start gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-green-600/10 border border-green-600/20 flex items-center justify-center group-hover:bg-green-600 transition-all">
                  <MessageCircle size={24} className="text-green-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white/40 uppercase tracking-widest mb-1"><InlineEditable textKey="contact.whatsapp_label">{t('contact.whatsapp_label', 'WhatsApp')}</InlineEditable></div>
                  <div className="text-white font-bold"><InlineEditable textKey="contact.phone_value">{t('contact.phone_value', settings.contactPhone || '(44) 99843-3030')}</InlineEditable></div>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-green-600/10 border border-green-600/20 flex items-center justify-center group-hover:bg-green-600 transition-all">
                  <Mail size={24} className="text-green-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white/40 uppercase tracking-widest mb-1"><InlineEditable textKey="contact.email_label">{t('contact.email_label', 'Email')}</InlineEditable></div>
                  <div className="text-white font-bold"><InlineEditable textKey="contact.email_value">{t('contact.email_value', settings.contactEmail || 'contato@fazendasbrasil.com')}</InlineEditable></div>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-green-600/10 border border-green-600/20 flex items-center justify-center group-hover:bg-green-600 transition-all">
                  <Phone size={24} className="text-green-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white/40 uppercase tracking-widest mb-1"><InlineEditable textKey="contact.phone_label">{t('contact.phone_label', 'Telefone')}</InlineEditable></div>
                  <div className="text-white font-bold"><InlineEditable textKey="contact.phone_value">{t('contact.phone_value', settings.contactPhone || '(44) 99843-3030')}</InlineEditable></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="relative">
            {/* Success Message Overlay */}
            {submitSuccess && (
              <div className="absolute inset-0 bg-green-600 rounded-3xl flex flex-col items-center justify-center z-20 animate-in fade-in duration-300">
                <CheckCircle2 size={64} className="text-white mb-6" />
                <h3 className="text-2xl font-black text-white mb-2"><InlineEditable textKey="contact.submit_success_title">{t('contact.submit_success_title', 'Mensagem Enviada!')}</InlineEditable></h3>
                <p className="text-white/80 text-center px-8">
                  <InlineEditable textKey="contact.submit_success_message">{t('contact.submit_success_message', 'Recebemos seu contato. Nossa equipe entrará em contato em breve!')}</InlineEditable>
                </p>
              </div>
            )}

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-white/60 uppercase tracking-widest mb-3">
                    <InlineEditable textKey="contact.form_name_label">{t('contact.form_name_label', 'Nome Completo')}</InlineEditable>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-green-600 transition-all"
                    placeholder={t('contact.form_name_placeholder', 'Seu nome')}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-white/60 uppercase tracking-widest mb-3">
                    <InlineEditable textKey="contact.form_email_label">{t('contact.form_email_label', 'Email')}</InlineEditable>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-green-600 transition-all"
                    placeholder={t('contact.form_email_placeholder', 'seu@email.com')}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold text-white/60 uppercase tracking-widest mb-3">
                    <InlineEditable textKey="contact.form_phone_label">{t('contact.form_phone_label', 'Telefone / WhatsApp')}</InlineEditable>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-green-600 transition-all"
                    placeholder={t('contact.form_phone_placeholder', '(00) 00000-0000')}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-bold text-white/60 uppercase tracking-widest mb-3">
                    <InlineEditable textKey="contact.form_message_label">{t('contact.form_message_label', 'Mensagem')}</InlineEditable>
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-green-600 transition-all resize-none"
                    placeholder={t('contact.form_message_placeholder', 'Como podemos ajudá-lo?')}
                  />
                </div>

                {/* Error Message */}
                {submitError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-6 py-4 text-red-400 text-sm">
                    {submitError}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-black uppercase tracking-widest py-5 rounded-xl flex items-center justify-center gap-3 transition-all hover:shadow-lg hover:shadow-green-600/20 disabled:cursor-not-allowed group"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <InlineEditable textKey="contact.submitting">{t('contact.submitting', 'Enviando...')}</InlineEditable>
                    </>
                  ) : (
                    <>
                      <Send size={20} className="group-hover:translate-x-1 transition-transform" />
                      <InlineEditable textKey="contact.submit_button">{t('contact.submit_button', 'Enviar Mensagem')}</InlineEditable>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ContactForm;
