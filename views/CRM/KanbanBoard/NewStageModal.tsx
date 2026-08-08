import React, { useEffect, useState } from 'react';
import { X, Plus, LayoutGrid, Pencil, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PipelineStage } from '../kanban/constants';
import { normalizeStageId } from '../kanban/helpers';

interface NewStageModalProps {
  isOpen: boolean;
  existingStages: PipelineStage[];
  onClose: () => void;
  onCreate: (stage: PipelineStage) => void;
  onRename: (stageId: string, newLabel: string) => void;
  onDelete: (stageId: string) => void;
}

const NewStageModal: React.FC<NewStageModalProps> = ({
  isOpen,
  existingStages,
  onClose,
  onCreate,
  onRename,
  onDelete,
}) => {
  const [label, setLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const customStages = existingStages.filter((s) => s.custom);

  useEffect(() => {
    if (isOpen) {
      setLabel('');
      setEditingId(null);
      setEditingLabel('');
    }
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

  const startEditing = (stage: PipelineStage) => {
    setEditingId(stage.id);
    setEditingLabel(stage.label);
  };

  const commitRename = (stageId: string) => {
    const nextLabel = normalizeStageId(editingLabel);
    if (!nextLabel) {
      toast.error('Informe o nome da etapa.');
      return;
    }
    onRename(stageId, nextLabel);
    setEditingId(null);
    setEditingLabel('');
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              Etapas do Kanban
            </h3>
            <p className="text-xs font-semibold text-slate-400">
              Gerencie as colunas do funil: criar, renomear e excluir.
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

        {customStages.length > 0 && (
          <div className="max-h-56 space-y-2 overflow-y-auto border-b border-slate-100 p-5">
            {customStages.map((stage) => (
              <div
                key={stage.id}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {editingId === stage.id ? (
                  <>
                    <input
                      autoFocus
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(stage.id);
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditingLabel('');
                        }
                      }}
                      className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400"
                      maxLength={32}
                    />
                    <button
                      type="button"
                      onClick={() => commitRename(stage.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                      title="Salvar nome"
                    >
                      <Check size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex flex-1 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold uppercase text-slate-700">
                      <LayoutGrid size={12} className="text-slate-400" />{' '}
                      {stage.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEditing(stage)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-indigo-50 hover:text-indigo-600"
                      title="Renomear etapa"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(stage.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-red-50 hover:text-red-600"
                      title="Excluir etapa"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Nova etapa
            </label>
            <input
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
