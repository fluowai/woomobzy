import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, GitMerge, Plus, Trash2, Edit2, Users, Check } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface QueueItem {
  id: string;
  name: string;
  agents: number;
  active: boolean;
}

const DEFAULT_QUEUES: QueueItem[] = [
  { id: '1', name: 'Vendas - Fazendas', agents: 3, active: true },
  { id: '2', name: 'Vendas - Lotes', agents: 2, active: true },
  { id: '3', name: 'Suporte Técnico', agents: 1, active: false },
];

interface QueuesManagerModalProps {
  onClose: () => void;
}

export const QueuesManagerModal: React.FC<QueuesManagerModalProps> = ({
  onClose,
}) => {
  const { profile } = useAuth();
  const [queues, setQueues] = useState<QueueItem[]>(DEFAULT_QUEUES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftAgents, setDraftAgents] = useState(1);

  useEffect(() => {
    const loadQueues = async () => {
      if (!profile?.organization_id) return;
      const { data } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', profile.organization_id)
        .single();
      const saved = (data?.settings as Record<string, any> | undefined)
        ?.whatsapp_queues;
      if (Array.isArray(saved) && saved.length > 0) {
        setQueues(saved);
      }
    };
    loadQueues();
  }, [profile?.organization_id]);

  const persistQueues = async (next: QueueItem[]) => {
    setQueues(next);
    if (!profile?.organization_id) return;
    const { data: orgData } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', profile.organization_id)
      .single();
    const { error } = await supabase
      .from('organizations')
      .update({
        settings: {
          ...((orgData?.settings as Record<string, any>) || {}),
          whatsapp_queues: next,
        },
      })
      .eq('id', profile.organization_id);
    if (error) {
      toast.error('Erro ao salvar filas na organização.');
    }
  };

  const handleSaveQueue = async () => {
    if (!draftName.trim()) {
      toast.error('Informe o nome da fila.');
      return;
    }
    if (editingId) {
      const next = queues.map((q) =>
        q.id === editingId
          ? { ...q, name: draftName.trim(), agents: Number(draftAgents || 1) }
          : q
      );
      await persistQueues(next);
      toast.success('Fila atualizada!');
    } else {
      const next = [
        ...queues,
        {
          id: String(Date.now()),
          name: draftName.trim(),
          agents: Number(draftAgents || 1),
          active: true,
        },
      ];
      await persistQueues(next);
      toast.success('Fila criada com sucesso!');
    }
    setEditingId(null);
    setShowNewForm(false);
    setDraftName('');
    setDraftAgents(1);
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
              onClick={() => {
                setEditingId(null);
                setDraftName('');
                setDraftAgents(1);
                setShowNewForm((prev) => !prev);
              }}
              className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2"
            >
              <Plus size={16} /> Nova Fila
            </button>
          </div>

          {showNewForm && (
            <div className="mb-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Nome da Fila
                </label>
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Ex: Lançamentos Urbanos"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                />
              </div>
              <div className="w-28">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Agentes
                </label>
                <input
                  type="number"
                  min={1}
                  value={draftAgents}
                  onChange={(e) => setDraftAgents(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                />
              </div>
              <button
                onClick={handleSaveQueue}
                className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <Check size={14} /> Salvar
              </button>
            </div>
          )}

          <div className="space-y-3">
            {queues.map((queue) => (
              <div
                key={queue.id}
                className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-purple-200 transition bg-white"
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() =>
                      persistQueues(
                        queues.map((q) =>
                          q.id === queue.id ? { ...q, active: !q.active } : q
                        )
                      )
                    }
                    title={queue.active ? 'Desativar fila' : 'Ativar fila'}
                    className={`w-3 h-3 rounded-full ${queue.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {queue.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-1">
                      <Users size={12} /> {queue.agents} agentes alocados
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(queue.id);
                      setDraftName(queue.name);
                      setDraftAgents(queue.agents);
                      setShowNewForm(true);
                    }}
                    title="Editar fila"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={async () => {
                      await persistQueues(queues.filter((q) => q.id !== queue.id));
                      toast.success('Fila removida.');
                    }}
                    title="Excluir fila"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

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
