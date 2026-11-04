import React, { useState } from 'react';
import { toast } from 'sonner';
import { X, GitMerge, Plus, Trash2, Edit2, Users } from 'lucide-react';

interface QueuesManagerModalProps {
  onClose: () => void;
}

export const QueuesManagerModal: React.FC<QueuesManagerModalProps> = ({
  onClose,
}) => {
  const [queues] = useState([
    { id: 1, name: 'Vendas - Fazendas', agents: 3, active: true },
    { id: 2, name: 'Vendas - Lotes', agents: 2, active: true },
    { id: 3, name: 'Suporte Técnico', agents: 1, active: false },
  ]);

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
              onClick={() =>
                toast.info('Criação de novas filas estará disponível em breve')
              }
              className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2"
            >
              <Plus size={16} /> Nova Fila
            </button>
          </div>

          <div className="space-y-3">
            {queues.map((queue) => (
              <div
                key={queue.id}
                className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-purple-200 transition bg-white"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-2 h-2 rounded-full ${queue.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
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
                    onClick={() =>
                      toast.info('Edição de fila estará disponível em breve')
                    }
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() =>
                      toast.info('Exclusão de fila estará disponível em breve')
                    }
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
