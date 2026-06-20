import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Home,
  MapPin,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { isUrbanProperty } from '../../utils/propertyNiche';

type OwnerProperty = {
  id: string;
  title: string;
  property_type?: string;
  status?: string;
  price?: number;
  city?: string;
  state?: string;
  niche?: string;
  leadCount?: number;
};

type OwnerDocument = {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'signed' | 'expired' | 'rejected';
  created_at?: string;
  property?: { title?: string };
};

type OwnerBilling = {
  id: string;
  amount?: number;
  status?: string;
  due_date?: string;
  payment_date?: string;
};

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export default function PortalProprietarioUrbano() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'financeiro'>('overview');
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [documents, setDocuments] = useState<OwnerDocument[]>([]);
  const [billings, setBillings] = useState<OwnerBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerLinked, setOwnerLinked] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!profile?.organization_id || !profile.email) return;
      setLoading(true);

      const { data: owner } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .ilike('email', profile.email)
        .contains('roles', ['Proprietario'])
        .maybeSingle();

      if (!owner?.id) {
        setOwnerLinked(false);
        setProperties([]);
        setDocuments([]);
        setBillings([]);
        setLoading(false);
        return;
      }

      setOwnerLinked(true);
      const { data: propertyRows } = await supabase
        .from('properties')
        .select('id,title,property_type,status,price,city,state,niche')
        .eq('organization_id', profile.organization_id)
        .eq('owner_id', owner.id)
        .order('created_at', { ascending: false });

      const urbanProperties = ((propertyRows || []) as OwnerProperty[]).filter(isUrbanProperty);
      const propertyIds = urbanProperties.map((property) => property.id);

      if (propertyIds.length === 0) {
        setProperties([]);
        setDocuments([]);
        setBillings([]);
        setLoading(false);
        return;
      }

      const [{ data: leadRows }, { data: documentRows }, { data: contractRows }] =
        await Promise.all([
          supabase
            .from('leads')
            .select('property_id')
            .eq('organization_id', profile.organization_id)
            .in('property_id', propertyIds),
          supabase
            .from('urban_documents')
            .select('id,name,status,created_at,property:property_id(title)')
            .eq('organization_id', profile.organization_id)
            .in('property_id', propertyIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('rental_contracts')
            .select('id')
            .eq('organization_id', profile.organization_id)
            .in('property_id', propertyIds),
        ]);

      const leadCounts = (leadRows || []).reduce<Record<string, number>>((counts, lead) => {
        if (lead.property_id) counts[lead.property_id] = (counts[lead.property_id] || 0) + 1;
        return counts;
      }, {});
      setProperties(
        urbanProperties.map((property) => ({
          ...property,
          leadCount: leadCounts[property.id] || 0,
        }))
      );
      setDocuments((documentRows || []) as OwnerDocument[]);

      const contractIds = (contractRows || []).map((contract) => contract.id);
      if (contractIds.length > 0) {
        const { data: billingRows } = await supabase
          .from('billing')
          .select('id,amount,status,due_date,payment_date')
          .eq('organization_id', profile.organization_id)
          .in('contract_id', contractIds)
          .order('due_date', { ascending: false });
        setBillings((billingRows || []) as OwnerBilling[]);
      } else {
        setBillings([]);
      }
      setLoading(false);
    };

    load();
  }, [profile?.email, profile?.organization_id]);

  const financial = useMemo(() => {
    const gross = billings
      .filter((billing) => billing.status === 'pago')
      .reduce((total, billing) => total + Number(billing.amount || 0), 0);
    const pending = billings
      .filter((billing) => ['aberto', 'vencido', 'protesto'].includes(billing.status || ''))
      .reduce((total, billing) => total + Number(billing.amount || 0), 0);
    return { gross, pending };
  }, [billings]);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-black uppercase italic tracking-tighter text-slate-900">
          <Home className="text-blue-600" size={32} />
          Portal do Proprietario
        </h1>
        <p className="font-medium text-slate-500">Acompanhe imoveis, documentos, leads e repasses vinculados ao seu cadastro.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['overview', 'Visao geral'],
          ['docs', 'Documentacao'],
          ['financeiro', 'Financeiro'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key as typeof activeTab)} className={`rounded-xl px-5 py-3 text-sm font-bold ${activeTab === key ? 'bg-blue-600 text-white' : 'border bg-white text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Carregando dados do proprietario...</div>
      ) : !ownerLinked ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Home className="mx-auto text-slate-300" size={42} />
          <h2 className="mt-4 font-black text-slate-800">Cadastro ainda nao vinculado</h2>
          <p className="mt-1 text-sm text-slate-500">O e-mail deste usuario precisa estar cadastrado como Proprietario no CRM.</p>
        </div>
      ) : activeTab === 'overview' ? (
        properties.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white py-14 text-center text-slate-400">Nenhum imovel urbano vinculado.</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <article key={property.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-blue-700">{property.property_type}</span>
                  <span className="text-xs font-bold uppercase text-slate-400">{property.status}</span>
                </div>
                <h2 className="mt-4 font-black text-slate-900">{property.title}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {[property.city, property.state].filter(Boolean).join(', ')}</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{property.leadCount}</p><p className="text-xs text-slate-500">Leads vinculados</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-black text-blue-600">{money(property.price || 0)}</p><p className="text-xs text-slate-500">Valor anunciado</p></div>
                </div>
              </article>
            ))}
          </div>
        )
      ) : activeTab === 'docs' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {documents.length === 0 ? <p className="p-12 text-center text-slate-400">Nenhum documento vinculado.</p> : documents.map((document) => (
            <div key={document.id} className="flex items-center justify-between border-b border-slate-100 p-5 last:border-0">
              <div className="flex items-center gap-3">
                {['approved', 'signed'].includes(document.status) ? <CheckCircle className="text-emerald-500" size={20} /> : <Clock className="text-amber-500" size={20} />}
                <div><p className="font-bold text-slate-800">{document.name}</p><p className="text-xs text-slate-500">{document.property?.title || 'Documento geral'}</p></div>
              </div>
              <span className="text-xs font-bold uppercase text-slate-500">{document.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6"><DollarSign className="text-emerald-600" /><p className="mt-3 text-sm text-slate-500">Total recebido</p><p className="text-2xl font-black text-emerald-600">{money(financial.gross)}</p></div>
            <div className="rounded-2xl border bg-white p-6"><Clock className="text-amber-600" /><p className="mt-3 text-sm text-slate-500">Pendente de recebimento</p><p className="text-2xl font-black text-amber-600">{money(financial.pending)}</p></div>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-white">
            {billings.length === 0 ? <p className="p-12 text-center text-slate-400">Nenhuma cobranca vinculada.</p> : billings.map((billing) => (
              <div key={billing.id} className="flex items-center justify-between border-b p-5 last:border-0">
                <div className="flex items-center gap-3"><FileText className="text-blue-600" size={18} /><div><p className="font-bold">{money(billing.amount || 0)}</p><p className="text-xs text-slate-500">{billing.due_date ? new Date(billing.due_date).toLocaleDateString('pt-BR') : '-'}</p></div></div>
                <span className="text-xs font-bold uppercase text-slate-500">{billing.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
