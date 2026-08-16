import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../services/supabase';
import { woosignService } from '../../services/woosign';
import type { DocumensoEnvelope } from '../../services/woosign';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  COMPLETED: 'Concluído',
  REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado',
};

const WooSignEnvelopes: React.FC = () => {
  const [items, setItems] = useState<DocumensoEnvelope[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await woosignService.listEnvelopes();
      setItems(data);
    } catch (error) {
      toast.error('Erro ao carregar envelopes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">WooSign</h1>
          <p className="text-slate-500 text-sm">Envelopes de assinatura</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Título</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Criado em</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{item.title}</td>
                  <td className="px-4 py-3">
                    {STATUS_LABELS[item.status] || item.status}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={async () => {
                        await woosignService.sendEnvelope(item.id);
                        toast.success('Envelope enviado');
                        load();
                      }}
                      className="mr-2 text-blue-600 hover:text-blue-700"
                    >
                      Enviar
                    </button>
                    <button
                      onClick={async () => {
                        await woosignService.cancelEnvelope(item.id);
                        toast.success('Envelope cancelado');
                        load();
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Nenhum envelope encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WooSignEnvelopes;
