import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Briefcase, DollarSign, Upload, FileCheck, FileText, X, Loader2 } from 'lucide-react';
import type { Lease } from '../../../types/lease';
import { uploadFile } from '../../../../services/storage';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const inputClass = 'w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all';
const labelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

const DOC_TYPES = [
  { key: 'doc_rg', label: 'RG / Identidade' },
  { key: 'doc_cpf', label: 'CPF' },
  { key: 'doc_cnh', label: 'CNH' },
  { key: 'doc_income_proof', label: 'Comprovante de Renda' },
  { key: 'doc_residence_proof', label: 'Comprovante de Residência' },
  { key: 'doc_irpf', label: 'Declaração IRPF' },
  { key: 'doc_marriage_cert', label: 'Certidão Casamento' },
  { key: 'doc_property_proof', label: 'Matrícula do Imóvel (se fiador)' },
] as const;

export const StepIncomeDocs: React.FC<Props> = ({ lease, updateField }) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const docs = lease.documents || {};

  const handleFileSelect = async (docKey: string, file: File) => {
    if (!file) return;

    setUploading(docKey);
    try {
      const publicUrl = await uploadFile(file, 'documents', 'lease-docs');
      if (!publicUrl) {
        toast.error('Falha ao enviar o arquivo. Tente novamente.');
        return;
      }

      const current = lease.documents || {};
      const currentList = Array.isArray(current[docKey]) ? current[docKey] : [];
      updateField('documents', {
        ...current,
        [docKey]: [...currentList, publicUrl],
      });
      toast.success('Documento anexado com sucesso!');
    } catch {
      toast.error('Erro ao anexar o documento.');
    } finally {
      setUploading(null);
      if (fileInputs.current[docKey]) fileInputs.current[docKey]!.value = '';
    }
  };

  const removeDoc = (docKey: string, url: string) => {
    const current = lease.documents || {};
    const currentList = Array.isArray(current[docKey]) ? current[docKey] : [];
    updateField('documents', {
      ...current,
      [docKey]: currentList.filter((u) => u !== url),
    });
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
          {DOC_TYPES.map((doc) => {
            const files = docs[doc.key] || [];
            const isUploading = uploading === doc.key;

            return (
              <div
                key={doc.key}
                className="p-4 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileCheck size={18} className={files.length ? 'text-emerald-500' : 'text-slate-400'} />
                    <span className="text-sm font-bold text-slate-700 truncate">{doc.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      ref={(el) => { fileInputs.current[doc.key] = el; }}
                      type="file"
                      accept="image/*,application/pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(doc.key, file);
                      }}
                    />
                    <button
                      onClick={() => fileInputs.current[doc.key]?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {isUploading ? 'Enviando...' : files.length ? 'Adicionar' : 'Anexar'}
                    </button>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {files.map((url) => (
                      <div
                        key={url}
                        className="relative group flex items-center gap-2 p-1.5 pr-2 bg-white rounded-lg border border-slate-200"
                      >
                        {isImage(url) ? (
                          <a href={url} target="_blank" rel="noreferrer" className="block w-10 h-10 overflow-hidden rounded">
                            <img src={url} alt={doc.label} className="w-10 h-10 object-cover" />
                          </a>
                        ) : (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                          >
                            <FileText size={16} /> PDF
                          </a>
                        )}
                        <button
                          onClick={() => removeDoc(doc.key, url)}
                          className="p-0.5 rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                          title="Remover"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
