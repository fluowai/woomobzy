import React, { useState } from 'react';
import { PenTool, Send, Mail, MessageSquare, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import type { Lease, Signature } from '../../../types/lease';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const SIGNERS = [
  { type: 'locador', label: 'Locador' },
  { type: 'locatario', label: 'Locatário' },
  { type: 'fiador', label: 'Fiador' },
  { type: 'testemunha_1', label: 'Testemunha 1' },
  { type: 'testemunha_2', label: 'Testemunha 2' },
] as const;

export const StepDigitalSignature: React.FC<Props> = ({ lease }) => {
  const [signers, setSigners] = useState<Partial<Signature>[]>([
    { signer_type: 'locador', signer_name: lease.owner_name || '', signer_email: '', signer_phone: '', status: 'pending' },
    { signer_type: 'locatario', signer_name: lease.tenant_name || '', signer_email: lease.tenant_email || '', signer_phone: lease.tenant_phone || '', status: 'pending' },
  ]);
  const [signatureMethod, setSignatureMethod] = useState('proprio');
  const [sendMethod, setSendMethod] = useState('ambos');

  const addFiador = () => {
    if (lease.guarantee_type === 'fiador' && lease.guarantor_name) {
      setSigners([...signers, {
        signer_type: 'fiador', signer_name: lease.guarantor_name,
        signer_email: lease.guarantor_email, signer_phone: lease.guarantor_phone, status: 'pending',
      }]);
    }
  };

  const addWitness = (type: 'testemunha_1' | 'testemunha_2') => {
    const name = type === 'testemunha_1' ? lease.witness_1_name : lease.witness_2_name;
    if (name) {
      setSigners([...signers, { signer_type: type, signer_name: name, status: 'pending' }]);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'signed': return <CheckCircle size={18} className="text-emerald-500" />;
      case 'sent': return <Clock size={18} className="text-amber-500" />;
      case 'refused': return <XCircle size={18} className="text-red-500" />;
      default: return <Clock size={18} className="text-slate-300" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Método */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><PenTool size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Método de Assinatura</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'proprio', label: 'Assinatura Própria', desc: 'Link seguro ImobFluow' },
            { id: 'clicksign', label: 'Clicksign', desc: 'Integração Clicksign' },
            { id: 'zapsign', label: 'ZapSign', desc: 'Integração ZapSign' },
            { id: 'docusign', label: 'DocuSign', desc: 'Integração DocuSign' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setSignatureMethod(m.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                signatureMethod === m.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <p className="text-sm font-bold text-slate-800">{m.label}</p>
              <p className="text-[10px] text-slate-400 mt-1">{m.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Signatários */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><User size={20} /></div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Signatários</h4>
          </div>
          <div className="flex gap-2">
            {lease.guarantee_type === 'fiador' && lease.guarantor_name && !signers.find(s => s.signer_type === 'fiador') && (
              <button onClick={addFiador} className="text-xs font-bold text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg">+ Fiador</button>
            )}
            {lease.witness_1_name && !signers.find(s => s.signer_type === 'testemunha_1') && (
              <button onClick={() => addWitness('testemunha_1')} className="text-xs font-bold text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg">+ Test. 1</button>
            )}
            {lease.witness_2_name && !signers.find(s => s.signer_type === 'testemunha_2') && (
              <button onClick={() => addWitness('testemunha_2')} className="text-xs font-bold text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg">+ Test. 2</button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {signers.map((signer, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="p-2 rounded-lg bg-white">
                {getStatusIcon(signer.status)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">{signer.signer_name || SIGNERS.find(s => s.type === signer.signer_type)?.label}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{signer.signer_type}</p>
              </div>
              <input
                placeholder="E-mail"
                value={signer.signer_email || ''}
                onChange={(e) => {
                  const updated = [...signers];
                  updated[idx].signer_email = e.target.value;
                  setSigners(updated);
                }}
                className="w-48 px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm outline-none"
              />
              <input
                placeholder="WhatsApp"
                value={signer.signer_phone || ''}
                onChange={(e) => {
                  const updated = [...signers];
                  updated[idx].signer_phone = e.target.value;
                  setSigners(updated);
                }}
                className="w-44 px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm outline-none"
              />
              <div className="flex gap-1">
                <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Enviar convite">
                  <Send size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Método de Envio */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Send size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Envio do Convite</h4>
        </div>
        <div className="flex gap-3">
          {[
            { id: 'email', icon: Mail, label: 'E-mail' },
            { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp' },
            { id: 'ambos', icon: Send, label: 'Ambos' },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setSendMethod(m.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                  sendMethod === m.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={18} /> {m.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Resumo da Assinatura */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><CheckCircle size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Status da Assinatura</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-slate-300">0</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Assinados</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-amber-500">{signers.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Pendentes</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-slate-300">0</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Recusados</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-blue-600">{signers.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
          </div>
        </div>
      </section>
    </div>
  );
};
