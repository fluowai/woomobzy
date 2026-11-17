import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Briefcase, DollarSign, Upload, FileCheck, Loader2 } from 'lucide-react';
import type { Lease } from '../../../types/lease';
import { callApi } from '../../../lib/api';
import { supabase } from '../../../../services/supabase';
import { logger } from '@/utils/logger';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const inputClass = 'w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all';
const labelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

export const StepIncomeDocs: React.FC<Props> = ({ lease, updateField }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeDocKey, setActiveDocKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const attachedDocs =
    ((lease.guarantee_details as Record<string, any> | undefined)
      ?.documents as Record<string, { name: string; url?: string; uploaded_at: string }>) ||
    {};

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeDocKey) return;

    const docKey = activeDocKey;
    setUploadingKey(docKey);
    try {
      let uploadedUrl: string | undefined;
      if (lease.property_id) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await callApi(`/api/documents/upload/${lease.property_id}`, {
          method: 'POST',
          body: formData,
        });
        uploadedUrl = res?.document?.file_url || res?.document?.url;
      } else {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `leases/${lease.tenant_cpf?.replace(/\D/g, '') || 'draft'}/${docKey}-${Date.now()}-${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(path, file, { upsert: true });
        if (!uploadErr) {
          const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
          uploadedUrl = pub?.publicUrl;
        }
      }

      const nextDocs = {
        ...attachedDocs,
        [docKey]: {
          name: file.name,
          url: uploadedUrl,
          uploaded_at: new Date().toISOString(),
        },
      };
      updateField('guarantee_details', {
        ...(lease.guarantee_details || {}),
        documents: nextDocs,
      });
      toast.success(`Documento "${file.name}" anexado ao contrato.`);
    } catch (err: any) {
      logger.error('Erro ao anexar documento da locação:', err);
      toast.error(err?.message || 'Erro ao anexar documento.');
    } finally {
      setUploadingKey(null);
      setActiveDocKey(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        className="hidden"
        onChange={handleUploadFile}
      />
      {/* Dados Profissionais */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Briefcase size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Dados Profissionais</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Profissão</label>
            <input
              value={lease.tenant_profession || ''}
              onChange={(e) => updateField('tenant_profession', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Empresa / Empregador</label>
            <input
              value={lease.tenant_employer || ''}
              onChange={(e) => updateField('tenant_employer', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Telefone do Trabalho</label>
            <input
              value={lease.tenant_employer_phone || ''}
              onChange={(e) => updateField('tenant_employer_phone' as any, e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Renda */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><DollarSign size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Renda</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Renda Mensal (R$)</label>
            <input
              type="number"
              value={lease.tenant_monthly_income || ''}
              onChange={(e) => updateField('tenant_monthly_income', Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Status do Comprovante</label>
            <select
              value={lease.income_proof_status || 'pendente'}
              onChange={(e) => updateField('income_proof_status' as any, e.target.value)}
              className={inputClass}
            >
              <option value="pendente">Pendente</option>
              <option value="recebido">Recebido</option>
              <option value="validado">Validado</option>
              <option value="reprovado">Reprovado</option>
            </select>
          </div>
        </div>
      </section>

      {/* Documentos */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600"><Upload size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Documentos Anexados</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'doc_rg', label: 'RG / Identidade' },
            { key: 'doc_cpf', label: 'CPF' },
            { key: 'doc_cnh', label: 'CNH' },
            { key: 'doc_income_proof', label: 'Comprovante de Renda' },
            { key: 'doc_residence_proof', label: 'Comprovante de Residência' },
            { key: 'doc_irpf', label: 'Declaração IRPF' },
            { key: 'doc_marriage_cert', label: 'Certidão Casamento' },
            { key: 'doc_property_proof', label: 'Matrícula do Imóvel (se fiador)' },
          ].map((doc) => (
            <div
              key={doc.key}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileCheck
                  size={18}
                  className={
                    attachedDocs[doc.key] ? 'text-emerald-600' : 'text-slate-400'
                  }
                />
                <div className="min-w-0">
                  <span className="text-sm font-bold text-slate-700 block">
                    {doc.label}
                  </span>
                  {attachedDocs[doc.key] && (
                    <span className="text-[11px] text-emerald-700 truncate block max-w-[200px]">
                      {attachedDocs[doc.key].name}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={uploadingKey === doc.key}
                onClick={() => {
                  setActiveDocKey(doc.key);
                  fileInputRef.current?.click();
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all flex items-center gap-1"
              >
                {uploadingKey === doc.key && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                {attachedDocs[doc.key] ? 'Substituir' : 'Anexar'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
