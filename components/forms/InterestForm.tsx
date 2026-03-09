import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

const InterestForm: React.FC = () => {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    purpose: 'COMPRA', // Compra ou Arrendamento
    type: 'FAZENDA',
    location: '',
    minArea: '',
    maxBudget: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simular envio
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // TODO: Integrar com serviço de Leads/CRM
    console.log("Lead Capturado:", formData);
    
    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="bg-green-50 p-8 rounded-3xl text-center border border-green-100">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send size={32} />
        </div>
        <h3 className="text-xl font-bold text-green-800 mb-2">Solicitação Recebida!</h3>
        <p className="text-green-700">
          Nossa equipe de especialistas rural irá buscar as melhores oportunidades para você e entrará em contato em breve.
        </p>
        <button 
          onClick={() => setSuccess(false)}
          className="mt-6 text-sm font-bold text-green-700 hover:text-green-800 underline"
        >
          Enviar nova solicitação
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Encontre para mim</h2>
        <p className="text-slate-500 text-sm">
          Descreva o que você procura e nossa IA rastreará oportunidades exclusivas (on e off-market).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Seu Nome</label>
           <input 
             required
             type="text"
             value={formData.name}
             onChange={e => setFormData({...formData, name: e.target.value})}
             className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
             placeholder="Nome completo"
           />
        </div>
        <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">WhatsApp</label>
           <input 
             required
             type="tel"
             value={formData.phone}
             onChange={e => setFormData({...formData, phone: e.target.value})}
             className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
             placeholder="(00) 00000-0000"
           />
        </div>
      </div>

      <div className="mb-6">
         <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email</label>
         <input 
           required
           type="email"
           value={formData.email}
           onChange={e => setFormData({...formData, email: e.target.value})}
           className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
           placeholder="seu@email.com"
         />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Finalidade</label>
           <select 
             value={formData.purpose}
             onChange={e => setFormData({...formData, purpose: e.target.value})}
             className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
           >
             <option value="COMPRA">Compra</option>
             <option value="ARRENDAMENTO">Arrendamento</option>
           </select>
        </div>
        <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo</label>
           <select 
             value={formData.type}
             onChange={e => setFormData({...formData, type: e.target.value})}
             className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
           >
             <option value="FAZENDA">Fazenda</option>
             <option value="SITIO">Sítio</option>
             <option value="HARAS">Haras</option>
             <option value="TERRA">Terra Nua</option>
           </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Região de Interesse</label>
           <div className="relative">
             <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
             <input 
               type="text"
               value={formData.location}
               onChange={e => setFormData({...formData, location: e.target.value})}
               className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
               placeholder="Cidade/Estado"
             />
           </div>
        </div>
        <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Área Mínima (ha)</label>
           <input 
             type="number"
             value={formData.minArea}
             onChange={e => setFormData({...formData, minArea: e.target.value})}
             className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
             placeholder="Ex: 50"
           />
        </div>
      </div>

      <div className="mb-8">
         <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detalhes do Pedido</label>
         <textarea 
           rows={4}
           value={formData.message}
           onChange={e => setFormData({...formData, message: e.target.value})}
           className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
           placeholder="Descreva aptidão desejada, infraestrutura necessária, orçamento aproximado, etc..."
         />
      </div>

      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
        ENVIAR SOLICITAÇÃO
      </button>

      <p className="text-center text-[10px] text-slate-400 mt-4">
        Seus dados estão protegidos. Não compartilhamos com terceiros.
      </p>
    </form>
  );
};

export default InterestForm;
