import React, { useEffect, useState } from 'react';
import { X, Plus, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { PipelineStage } from '../kanban/constants';
import { normalizeStageId } from '../kanban/helpers';

interface NewStageModalProps {
  isOpen: boolean;
  existingStages: PipelineStage[];
  onClose: () => void;
  onCreate: (stage: PipelineStage) => void;
}

const NewStageModal: React.FC<NewStageModalProps> = ({
  isOpen,
  existingStages,
  onClose,
  onCreate,
}) => {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (isOpen) setLabel('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextLabel = normalizeStageId(label);
    if (!nextLabel) {
      toast.error('Informe o nome da etapa.');
      return;
    }
    const alreadyExists = existingStages.some(
      (s) =>
        s.id.toLocaleLowerCase('pt-BR') === nextLabel.toLocaleLowerCase('pt-BR')
    );
    if (alreadyExists) {
      toast.error('Essa etapa ja existe no Kanban.');
      return;
    }
    onCreate({
      id: nextLabel,
      label: nextLabel,
      icon: LayoutGrid,
      color: 'bg-slate-100 text-slate-700',
      custom: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Nova etapa</h3>
            <p className="text-xs font-semibold text-slate-400">
              Adicione outra coluna ao funil.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Nome da etapa
            </label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
              placeholder="Ex: Negociacao"
              maxLength={32}
            />
          </div>
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-indigo-700"
          >
            <Plus size={16} /> Criar etapa
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewStageModal;
