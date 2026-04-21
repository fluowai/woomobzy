import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
  Mail,
  Phone,
  Clock,
  User,
  Download,
  Search,
  Filter,
} from 'lucide-react';

const WaitlistLeads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
                    className="hover:bg-slate-50/50 transition-colors group"
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
    </div>
  );
};

export default WaitlistLeads;
