import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, GitMerge, Plus, Trash2, Edit2, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';

interface QueuesManagerModalProps {
  onClose: () => void;
}

export const QueuesManagerModal: React.FC<QueuesManagerModalProps> = ({
  onClose,
}) => {
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');

  const loadQueues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_queues')
        .select('*, whatsapp_queue_users(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQueues(data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar filas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueues();
  }, []);

  const handleCreate = async () => {
    if (!newQueueName.trim()) return;
    try {
      const { data: orgData } = await supabase.auth.getSession();
      const orgId = orgData?.session?.user?.user_metadata?.organization_id;
      if (!orgId) throw new Error('Organização não encontrada');

      const { error } = await supabase.from('whatsapp_queues').insert({
        name: newQueueName.trim(),
        organization_id: orgId,
      });

      if (error) throw error;
      toast.success('Fila criada com sucesso!');
      setNewQueueName('');
      setIsCreating(false);
      loadQueues();
    } catch (err: any) {
      toast.error('Erro ao criar fila: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta fila?')) return;
    try {
      const { error } = await supabase
        .from('whatsapp_queues')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Fila excluída com sucesso!');
      loadQueues();
    } catch (err: any) {
      toast.error('Erro ao excluir fila: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <GitMerge size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Filas de Atendimento
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Organize os tickets de atendimento por departamento.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-700">
              Filas Cadastradas
            </h3>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2"
            >
              <Plus size={16} /> Nova Fila
            </button>
          </div>

          {isCreating && (
            <div className="mb-6 p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center gap-3">
              <input
                type="text"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                placeholder="Nome da fila (ex: Vendas - Lotes)"
                className="flex-1 h-10 px-3 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-sm"
              />
              <button
                onClick={handleCreate}
                className="h-10 px-4 rounded-lg bg-emerald-600 text-white font-bold text-sm"
              >
                Salvar
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="h-10 px-4 rounded-lg bg-slate-200 text-slate-600 font-bold text-sm"
              >
                Cancelar
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {queues.length === 0 && (
                <div className="text-center p-8 text-sm text-slate-500">
                  Nenhuma fila cadastrada. Crie a primeira fila clicando em
                  "Nova Fila".
                </div>
              )}
              {queues.map((queue) => (
                <div
                  key={queue.id}
                  className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-purple-200 transition bg-white"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-2 h-2 rounded-full ${queue.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {queue.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-1">
                        <Users size={12} />{' '}
                        {queue.whatsapp_queue_users?.[0]?.count || 0} agentes
                        alocados
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        toast.info('Edição de fila estará disponível em breve')
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(queue.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h4 className="text-sm font-bold text-blue-900 mb-1">
              Como funcionam as filas?
            </h4>
            <p className="text-xs font-medium text-blue-700 leading-relaxed">
              Quando a Inteligência Artificial não conseguir resolver uma
              solicitação ou o cliente pedir para falar com um humano, o
              atendimento será transferido para a fila apropriada. Os corretores
              disponíveis naquela fila poderão assumir o atendimento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
