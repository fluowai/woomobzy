import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, FileText, DollarSign, PenTool, Clock, History,
  Download, Mail, MessageSquare, Edit, Trash2, AlertTriangle,
  Building2, User, Calendar, ShieldCheck, CheckCircle, X,
} from 'lucide-react';
import type { Lease, Invoice, Signature, Inspection, LeaseHistory as LeaseHistoryType } from '../../types/lease';
import {
  LEASE_STATUS_LABELS, LEASE_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, SIGNATURE_STATUS_LABELS,
} from '../../types/lease';
import {
  getLease, listInvoices, listSignatures, listInspections,
} from '../../services/lease/leaseService';

type TabType = 'documentos' | 'financeiro' | 'assinaturas' | 'historico';

export const LeaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lease, setLease] = useState<Lease | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('documentos');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [leaseRes, invoicesRes, signaturesRes, inspectionsRes] = await Promise.all([
        getLease(id),
        listInvoices(id),
        listSignatures(id),
        listInspections(id),
      ]);
      setLease(leaseRes.data);
      setInvoices(invoicesRes.data);
      setSignatures(signaturesRes.data);
      setInspections(inspectionsRes.data);
    } catch (error) {
      logger.error('Load lease error:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: 'documentos', label: 'Documentos', icon: FileText },
    { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { key: 'assinaturas', label: 'Assinaturas', icon: PenTool },
    { key: 'historico', label: 'Histórico', icon: History },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!lease) {
    return <div className="text-center py-12 text-slate-400">Contrato não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/urban/locacao')}
            className="p-2.5 bg-white rounded-xl border border-slate-100 hover:bg-slate-50 transition-all mt-1"
          >
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-black uppercase italic tracking-tighter">
                {lease.contract_number || 'Sem número'}
              </h1>
              <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                LEASE_STATUS_COLORS[lease.status] || 'bg-slate-50 text-slate-500'
              }`}>
                {LEASE_STATUS_LABELS[lease.status] || lease.status}
              </span>
            </div>
            <p className="text-black/60 font-medium mt-1">
              {lease.tenant_name} · {lease.property_title || 'Imóvel não vinculado'} · R$ {(lease.monthly_rent || 0).toLocaleString('pt-BR')}/mês
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all shadow-lg">
            <Download size={14} /> PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-400 transition-all">
            <MessageSquare size={14} /> WhatsApp
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">
            <Edit size={14} /> Editar
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-blue-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Locatário</span>
          </div>
          <p className="text-sm font-bold text-slate-800">{lease.tenant_name}</p>
          <p className="text-xs text-slate-400">{lease.tenant_cpf}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} className="text-blue-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Imóvel</span>
          </div>
          <p className="text-sm font-bold text-slate-800">{lease.property_title || 'Não vinculado'}</p>
          <p className="text-xs text-slate-400">{lease.property_city && `${lease.property_city}/${lease.property_state}`}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-blue-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Período</span>
          </div>
          <p className="text-sm font-bold text-slate-800">
            {lease.start_date ? new Date(lease.start_date).toLocaleDateString('pt-BR') : 'N/A'} → {lease.end_date ? new Date(lease.end_date).toLocaleDateString('pt-BR') : 'N/A'}
          </p>
          <p className="text-xs text-slate-400">{lease.contract_duration_months} meses</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={16} className="text-blue-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Garantia</span>
          </div>
          <p className="text-sm font-bold text-slate-800">{lease.guarantee_type || 'Não definida'}</p>
          <p className="text-xs text-slate-400">{lease.guarantor_name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Documentos Tab */}
          {activeTab === 'documentos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'Contrato de Locação.pdf', type: 'Contrato', date: lease.signed_at || lease.created_at, icon: FileText },
                { name: 'Termo de Vistoria.pdf', type: 'Vistoria', date: lease.activated_at, icon: FileText },
                { name: 'Comprovante de Renda', type: 'Documento', date: lease.created_at, icon: FileText },
              ].filter(d => d.date).map((doc, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                  <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                    <doc.icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700">{doc.name}</p>
                    <p className="text-[10px] text-slate-400">{doc.type} · {doc.date ? new Date(doc.date).toLocaleDateString('pt-BR') : 'N/A'}</p>
                  </div>
                  <Download size={16} className="text-slate-300 hover:text-blue-600 cursor-pointer" />
                </div>
              ))}
            </div>
          )}

          {/* Financeiro Tab */}
          {activeTab === 'financeiro' && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-emerald-700">{invoices.filter(i => i.status === 'pago').length}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">Pagos</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-amber-700">{invoices.filter(i => i.status === 'pendente').length}</p>
                  <p className="text-[10px] font-bold text-amber-600 uppercase">Pendentes</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-red-700">{invoices.filter(i => i.status === 'vencido').length}</p>
                  <p className="text-[10px] font-bold text-red-600 uppercase">Vencidos</p>
                </div>
              </div>

              {invoices.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p>Nenhum boleto gerado ainda</p>
                  <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
                    Gerar Boletos
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Assinaturas Tab */}
          {activeTab === 'assinaturas' && (
            <div className="space-y-3">
              {signatures.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <PenTool className="mx-auto mb-3 text-slate-300" size={40} />
                  <p>Nenhuma assinatura registrada</p>
                </div>
              )}
              {signatures.map((sig) => (
                <div key={sig.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      sig.status === 'signed' ? 'bg-emerald-50 text-emerald-600' :
                      sig.status === 'sent' ? 'bg-blue-50 text-blue-600' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {sig.status === 'signed' ? <CheckCircle size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{sig.signer_name}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{sig.signer_type} · {SIGNATURE_STATUS_LABELS[sig.status]}</p>
                    </div>
                  </div>
                  {sig.signed_at && (
                    <span className="text-[10px] text-slate-400">
                      {new Date(sig.signed_at).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Histórico Tab */}
          {activeTab === 'historico' && (
            <div className="space-y-4">
              <div className="relative pl-8 border-l-2 border-slate-100 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[25px] p-1 bg-blue-100 rounded-full">
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Contrato criado</p>
                  <p className="text-[10px] text-slate-400">{new Date(lease.created_at).toLocaleString('pt-BR')}</p>
                </div>
                {lease.activated_at && (
                  <div className="relative">
                    <div className="absolute -left-[25px] p-1 bg-emerald-100 rounded-full">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Contrato ativado</p>
                    <p className="text-[10px] text-slate-400">{new Date(lease.activated_at).toLocaleString('pt-BR')}</p>
                  </div>
                )}
                {lease.signed_at && (
                  <div className="relative">
                    <div className="absolute -left-[25px] p-1 bg-purple-100 rounded-full">
                      <div className="w-2 h-2 bg-purple-600 rounded-full" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Contrato assinado</p>
                    <p className="text-[10px] text-slate-400">{new Date(lease.signed_at).toLocaleString('pt-BR')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
