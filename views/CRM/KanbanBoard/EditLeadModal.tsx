import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { leadService } from '../../../services/leads';
import { Lead } from '../../../types';

interface EditLeadModalProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
}

const EditLeadModal: React.FC<EditLeadModalProps> = ({
  isOpen,
  lead,
  onClose,
  onSaved,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    classification: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead)
      setFormData({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        notes: lead.notes || '',
        classification: lead.classification || '',
        tags: (lead.tags || []).join(', '),
      });
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleSave = async () => {
    setSaving(true);
    const tags = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await leadService.update(lead.id, { ...formData, tags } as any);
    onSaved({ ...lead, ...formData, tags } as Lead);
    setSaving(false);
    onClose();
    toast.success('Lead atualizado');
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">Editar Lead</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={formData.name}
            onChange={(e) =>
              setFormData((p) => ({ ...p, name: e.target.value }))
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400"
            placeholder="Nome"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={formData.phone}
              onChange={(e) =>
                setFormData((p) => ({ ...p, phone: e.target.value }))
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400"
              placeholder="Telefone"
            />
            <input
              value={formData.email}
              onChange={(e) =>
                setFormData((p) => ({ ...p, email: e.target.value }))
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400"
              placeholder="Email"
            />
          </div>
          <input
            value={formData.classification}
            onChange={(e) =>
              setFormData((p) => ({ ...p, classification: e.target.value }))
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400"
            placeholder="Classificação"
          />
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData((p) => ({ ...p, notes: e.target.value }))
            }
            className="h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-indigo-400"
            placeholder="Observações"
          />
          <input
            value={formData.tags}
            onChange={(e) =>
              setFormData((p) => ({ ...p, tags: e.target.value }))
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400"
            placeholder="Tags (separadas por vírgula)"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-5 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditLeadModal;
