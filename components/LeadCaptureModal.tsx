
import React, { useState } from 'react';
import { X, MessageCircle, Loader2 } from 'lucide-react';
import { leadService } from '../services/leads';
import { useSettings } from '../context/SettingsContext';

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyTitle: string;
  propertyId: string;
}

const LeadCaptureModal: React.FC<LeadCaptureModalProps> = ({ isOpen, onClose, propertyTitle, propertyId }) => {
  const { settings } = useSettings();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Save Lead to CRM (Non-blocking or handled gracefully)
      try {
        await leadService.create({
          name,
          phone,
          propertyId: propertyId,
          source: 'WhatsApp',
          status: 'Novo'
        });
      } catch (dbError) {
        console.error('Failed to save lead to CRM:', dbError);
        // Continue to redirect anyway
      }

      // 2. Trigger WhatsApp Automation (Serverless)
      try {
        await fetch('/api/send-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name, 
            phone, 
            propertyTitle 
          })
        });
      } catch (apiError) {
        console.error('Failed to trigger automation:', apiError);
      }

      // 3. Redirect to WhatsApp (User Interface)
      const message = `Olá! Me chamo ${name}. Gostaria de mais informações sobre o imóvel: ${propertyTitle}`;
      const whatsappNumber = settings.socialLinks?.whatsapp?.replace(/\D/g, '') || '';
      
      if (whatsappNumber) {
         // Pequeno delay para garantir que a requisição anterior não seja cancelada pelo navegador
         setTimeout(() => {
            window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
            onClose();
         }, 500);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
        >
          <X size={20} className="text-slate-500" />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Falar no WhatsApp</h2>
            <p className="text-slate-500 text-sm">
              Preencha seus dados para iniciar o atendimento sobre o imóvel <strong>{propertyTitle}</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Seu Nome</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                placeholder="Como gostaria de ser chamado?"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Seu WhatsApp</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                placeholder="(DDD) 99999-9999"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-xl uppercase tracking-widest shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Iniciando...
                </>
              ) : (
                <>
                  <MessageCircle size={20} />
                  Iniciar Conversa
                </>
              )}
            </button>
            
            <p className="text-center text-[10px] text-slate-400 mt-4">
              Seus dados estão seguros e serão utilizados apenas para este atendimento.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LeadCaptureModal;
