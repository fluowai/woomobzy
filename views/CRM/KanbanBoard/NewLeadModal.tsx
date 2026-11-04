import React, { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { leadService } from '../../../services/leads';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgId?: string;
  matchProfile: 'urbano' | 'rural';
}

const NewLeadModal: React.FC<NewLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orgId,
  matchProfile,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'CRM',
    status: 'Novo',
    classification:
      matchProfile === 'rural' ? 'Interesse Rural' : 'Interesse Urbano',
    notes: '',
    budget: undefined as number | undefined,
    preferences: { type: undefined, neighborhood: '' },
  });

  useEffect(() => {
    if (isOpen)
      setFormData((prev) => ({
        ...prev,
        status: 'Novo',
        classification:
          matchProfile === 'rural' ? 'Interesse Rural' : 'Interesse Urbano',
      }));
  }, [isOpen, matchProfile]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setLoading(true);
    try {
      await leadService.create({ ...formData, organization_id: orgId } as any);
      toast.success('Lead criado com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Novo Lead</h3>
            <p className="text-xs font-semibold text-slate-400">
              Adicionar lead manualmente
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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Nome *
              </label>
              <input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="Nome do lead"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Telefone
              </label>
              <input
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Email
              </label>
              <input
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="lead@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Classificação
              </label>
              <select
                value={formData.classification}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    classification: e.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option>Interesse Rural</option>
                <option>Interesse Urbano</option>
                <option>Proprietário</option>
                <option>Corretor</option>
                <option>Investidor</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Origem
              </label>
              <select
                value={formData.source}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, source: e.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option>CRM</option>
                <option>WhatsApp</option>
                <option>Portal</option>
                <option>Indicação</option>
                <option>Landing Page</option>
                <option>Site</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="Anotações..."
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Criar Lead'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewLeadModal;
