import React, { useState, useEffect } from 'react';
import { X, Save, Building2 } from 'lucide-react';
import { CaptacaoLeadInput } from '@/src/services/captacao';

interface CaptacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CaptacaoLeadInput) => void;
  initialData?: CaptacaoLeadInput;
}

const CaptacaoModal: React.FC<CaptacaoModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<CaptacaoLeadInput>({
    title: '',
    address: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    estimated_value: null,
    property_type: 'Venda',
    status: 'mapeado',
    notes: '',
    assigned_to: null,
    created_by: null,
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(initialData);
    } else if (isOpen && !initialData) {
      setFormData({
        title: '',
        address: '',
        owner_name: '',
        owner_phone: '',
        owner_email: '',
        estimated_value: null,
        property_type: 'Venda',
        status: 'mapeado',
        notes: '',
        assigned_to: null,
        created_by: null,
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Building2 className="text-emerald-600" />
            {initialData ? 'Editar Captação' : 'Novo Alvo de Captação'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Título Breve *</label>
            <input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
              placeholder="Ex: Apartamento 3Q na Av. Paulista"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Tipo *</label>
              <select
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none bg-white transition-all"
              >
                <option value="Venda">Venda</option>
                <option value="Locação">Locação</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Valor Estimado</label>
              <input
                type="number"
                value={formData.estimated_value || ''}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value ? Number(e.target.value) : null })}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                placeholder="R$"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Endereço Aproximado</label>
            <input
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
              placeholder="Ex: Rua das Flores, Centro"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Nome do Proprietário</label>
              <input
                value={formData.owner_name || ''}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Telefone / WhatsApp</label>
              <input
                value={formData.owner_phone || ''}
                onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Notas Adicionais</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all min-h-[80px]"
              placeholder="Informações sobre o anúncio original, link, etc..."
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all"
            >
              <Save size={16} />
              {initialData ? 'Atualizar' : 'Salvar Novo Alvo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaptacaoModal;
