import React, { useState } from 'react';
import { Users, Send, Loader2, CheckCircle2 } from 'lucide-react';

const PartnerForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    creci: '',
    phone: '',
    email: '',
    city: '',
    specialty: 'RURAL'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 shadow-xl">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Cadastro Realizado!</h3>
        <p className="text-slate-500">
          Bem-vindo à maior rede de negócios rurais. Nossa equipe de expansão entrará em contato para validação do seu cadastro.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <Users size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Seja um Parceiro</h2>
          <p className="text-slate-500 text-xs">Junte-se à nossa rede de corretores especialistas.</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome Completo</label>
           <input 
             required
             type="text"
             value={formData.name}
             onChange={e => setFormData({...formData, name: e.target.value})}
             className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
           />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">CRECI</label>
             <input 
               required
               type="text"
               value={formData.creci}
               onChange={e => setFormData({...formData, creci: e.target.value})}
               className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
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
             />
           </div>
        </div>

        <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Corporativo</label>
           <input 
             required
             type="email"
             value={formData.email}
             onChange={e => setFormData({...formData, email: e.target.value})}
             className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
           />
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cidade Base</label>
             <input 
               required
               type="text"
               value={formData.city}
               onChange={e => setFormData({...formData, city: e.target.value})}
               className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
             />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Especialidade</label>
             <select 
               value={formData.specialty}
               onChange={e => setFormData({...formData, specialty: e.target.value})}
               className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
             >
               <option value="RURAL">Rural (Fazendas)</option>
               <option value="URBANO">Urbano</option>
               <option value="COMERCIAL">Comercial</option>
               <option value="INDUSTRIAL">Industrial</option>
             </select>
           </div>
        </div>
      </div>

      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
        ENVIAR CADASTRO
      </button>
    </form>
  );
};

export default PartnerForm;
