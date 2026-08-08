import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { FileText, Plus, Search, Eye, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SystemContract {
  id: string;
  contract_type: 'reseller' | 'agency';
  status: 'draft' | 'pending_signature' | 'active' | 'terminated';
  contratante_details: any;
  created_at: string;
}

const STATUS_LABELS = {
  draft: 'Rascunho',
  pending_signature: 'Aguardando Assinatura',
  active: 'Ativo',
  terminated: 'Encerrado',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  pending_signature: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  terminated: 'bg-red-100 text-red-800',
};

const SystemContracts: React.FC = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<SystemContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchContracts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('system_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setContracts(data || []);
    } catch (err) {
      console.error('Error fetching contracts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const filteredContracts = contracts.filter((c) => {
    const term = search.toLowerCase();
    const nome = c.contratante_details?.nome?.toLowerCase() || '';
    return nome.includes(term) || c.contract_type.includes(term);
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Contratos do Sistema
          </h1>
          <p className="text-slate-500">
            Gerencie os contratos de revenda e imobiliárias.
          </p>
        </div>
        <button
          onClick={() => navigate('/mega-admin/contracts/new')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition"
        >
          <Plus size={20} />
          Novo Contrato
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por contratante..."
              className="w-full pl-10 pr-4 py-2 border rounded-md"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                <th className="p-4 font-medium">Contratante</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Data de Criação</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="p-4 font-medium text-slate-700">
                      {contract.contratante_details?.nome || 'N/A'}
                    </td>
                    <td className="p-4">
                      {contract.contract_type === 'reseller'
                        ? 'Revenda'
                        : 'Imobiliária'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[contract.status]}`}
                      >
                        {STATUS_LABELS[contract.status]}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">
                      {format(
                        new Date(contract.created_at),
                        "dd 'de' MMMM, yyyy",
                        { locale: ptBR }
                      )}
                    </td>
                    <td className="p-4 flex gap-2 justify-end">
                      <button
                        onClick={() =>
                          navigate(`/mega-admin/contracts/${contract.id}/edit`)
                        }
                        className="p-2 text-slate-400 hover:text-indigo-600 transition"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() =>
                          navigate(
                            `/mega-admin/contracts/${contract.id}/preview`
                          )
                        }
                        className="p-2 text-slate-400 hover:text-slate-800 transition"
                        title="Visualizar Contrato PDF"
                      >
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SystemContracts;
