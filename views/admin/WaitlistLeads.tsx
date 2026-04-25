import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
  Filter,
  ArrowUpRight,
  Clock3,
  Globe,
  Settings,
  X
} from 'lucide-react';

const LeadDetailsModal: React.FC<{
  lead: any;
  isOpen: boolean;
  onClose: () => void;
}> = ({ lead, isOpen, onClose }) => {
  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center font-black text-xl">
              {lead.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-tight">
                {lead.name}
              </h3>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
                Interessado em Lista de Espera
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
               <section>
                 <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Informações de Contato</h5>
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Phone size={14} /></div>
                      <span className="font-bold text-slate-700">{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Mail size={14} /></div>
                      <span className="font-bold text-slate-700">{lead.email || 'Não informado'}</span>
                    </div>
                 </div>
               </section>

               <section>
                 <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Linha do Tempo</h5>
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center"><Clock size={14} /></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inscrito em</span>
                        <span className="font-bold text-slate-700">{new Date(lead.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                 </div>
               </section>
            </div>

            <div className="space-y-6">
               <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Origem & Marketing</h5>
                 <div className="space-y-5">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Cadeia de Origem</span>
                      <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-bold">{lead.source}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Canal Orgânico</span>
                      <span className="font-bold text-slate-700 text-sm">{lead.organic_channel || 'Indireto'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Página Captura</span>
                      <span className="font-bold text-orange-600 text-sm">{lead.campaign || 'Página de Lançamento'}</span>
                    </div>
                 </div>
               </section>
            </div>
          </div>

          <section>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Notas Técnicas</h5>
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl">
               <p className="text-slate-500 font-medium italic text-sm">
                 {lead.notes || 'Nenhuma nota adicional registrada pelo sistema.'}
               </p>
            </div>
          </section>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-4">
           <button onClick={onClose} className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors">
              Fechar
           </button>
           <button className="px-8 py-3 bg-orange-500 text-white rounded-2xl font-bold text-sm hover:bg-orange-600 transition-shadow shadow-lg shadow-orange-500/20">
              Transformar em Lead CRM
           </button>
        </div>
      </div>
    </div>
  );
};

const WaitlistLeads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('source', 'Espera Imobzy')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching waitlist leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm)
  );

  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Nome,Email,WhatsApp,Data\n' +
      filteredLeads
        .map(
          (l) =>
            `${l.name},${l.email},${l.phone},${new Date(l.created_at).toLocaleDateString()}`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'lista_espera_imobzy.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">
            Lista de{' '}
            <span className="text-orange-500">Espera e Pré-Lançamento</span>
          </h1>
          <p className="text-slate-500 text-sm">
            Pessoas interessadas que deixaram contatos enquanto seu site está em
            modo "Em Breve".
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Total de Interessados
          </p>
          <p className="text-3xl font-black text-slate-800">{leads.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Novos (Últimos 7 dias)
          </p>
          <p className="text-3xl font-black text-orange-500">
            {
              leads.filter(
                (l) =>
                  new Date(l.created_at) >
                  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ).length
            }
          </p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Página de Origem
          </p>
          <p className="text-3xl font-black text-slate-800">Coming Soon</p>
        </div>
      </div>

      {/* Search & List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por nome, email ou whats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-3 rounded-2xl bg-white border border-slate-200 focus:border-orange-500/50 outline-none text-sm transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 text-slate-400 hover:text-slate-600 transition">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Interessado
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Contatos
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Canal de Origem
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Data de Inscrição
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-8 py-12 text-center text-slate-400 italic"
                  >
                    Carregando contatos...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-8 py-12 text-center text-slate-400 italic"
                  >
                    Nenhum interessado encontrado.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => {
                      setSelectedLead(lead);
                      setIsDetailsOpen(true);
                    }}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {lead.name}
                          </p>
                          <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">
                            Lead de Pré-Lançamento
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail size={14} className="text-slate-400" />
                          {lead.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone size={14} className="text-slate-400" />
                          {lead.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-500">
                      <div className="flex flex-col">
                        <span className="text-slate-800">{lead.organic_channel || 'Orgânico / Direto'}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter italic">Via {lead.source}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Clock size={14} />
                        {new Date(lead.created_at).toLocaleString('pt-BR')}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LeadDetailsModal 
        lead={selectedLead}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedLead(null);
        }}
      />
    </div>
  );
};

export default WaitlistLeads;
