import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Upload,
  ChevronDown,
  ChevronUp,
  Home,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

type DocStatus = 'ok' | 'pendente' | 'vencido' | 'ausente';

interface DocItem {
  id: string;
  name: string;
  category: 'imovel' | 'proprietario';
  status: DocStatus;
}

const DEFAULT_DOCS: DocItem[] = [
  {
    id: '1',
    name: 'Matrícula Atualizada (< 30 dias)',
    category: 'imovel',
    status: 'ausente',
  },
  { id: '2', name: 'IPTU em dia', category: 'imovel', status: 'ausente' },
  { id: '3', name: 'Habite-se', category: 'imovel', status: 'ausente' },
  {
    id: '4',
    name: 'Certidão de Ônus Reais',
    category: 'imovel',
    status: 'ausente',
  },
  {
    id: '5',
    name: 'Zoneamento Verificado',
    category: 'imovel',
    status: 'ausente',
  },
  {
    id: '6',
    name: 'Licenças e Alvarás',
    category: 'imovel',
    status: 'ausente',
  },
  { id: '7', name: 'Laudo de Vistoria', category: 'imovel', status: 'ausente' },
  {
    id: '8',
    name: 'Averbação de Construção',
    category: 'imovel',
    status: 'ausente',
  },
  {
    id: '9',
    name: 'RG / CPF do Proprietário',
    category: 'proprietario',
    status: 'ausente',
  },
  {
    id: '10',
    name: 'Comprovante de Estado Civil',
    category: 'proprietario',
    status: 'ausente',
  },
  {
    id: '11',
    name: 'Comprovante de Residência',
    category: 'proprietario',
    status: 'ausente',
  },
  {
    id: '12',
    name: 'Certidão Negativa Federal',
    category: 'proprietario',
    status: 'ausente',
  },
  {
    id: '13',
    name: 'Certidão Negativa Estadual',
    category: 'proprietario',
    status: 'ausente',
  },
  {
    id: '14',
    name: 'Certidão Negativa Municipal',
    category: 'proprietario',
    status: 'ausente',
  },
];

const statusConfig: Record<
  DocStatus,
  { label: string; color: string; bg: string; icon: any }
> = {
  ok: {
    label: 'OK',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    icon: CheckCircle,
  },
  pendente: {
    label: 'Pendente',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    icon: Clock,
  },
  vencido: {
    label: 'Vencido',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: XCircle,
  },
  ausente: {
    label: 'Ausente',
    color: 'text-slate-500',
    bg: 'bg-slate-100',
    icon: AlertTriangle,
  },
};

const ComplianceUrbano: React.FC = () => {
  const [docs, setDocs] = useState<DocItem[]>(DEFAULT_DOCS);
  const [expandedCat, setExpandedCat] = useState<string>('imovel');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, title')
        .not('property_type', 'in', '("Rural","Fazenda")')
        .order('title');
      setProperties(data || []);
    };
    load();
  }, []);

  const cycleStatus = (id: string) => {
    const order: DocStatus[] = ['ausente', 'pendente', 'ok', 'vencido'];
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: order[(order.indexOf(d.status) + 1) % order.length],
            }
          : d
      )
    );
  };

  const imovelDocs = docs.filter((d) => d.category === 'imovel');
  const propDocs = docs.filter((d) => d.category === 'proprietario');

  const renderSection = (items: DocItem[], title: string, catKey: string) => {
    const isOpen = expandedCat === catKey;
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setExpandedCat(isOpen ? '' : catKey)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <ClipboardCheck size={20} className="text-blue-600" />
            <h3 className="text-lg font-bold text-black">{title}</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
              {items.filter((d) => d.status === 'ok').length}/{items.length}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </button>
        {isOpen && (
          <div className="px-6 pb-6 space-y-2">
            {items.map((item) => {
              const cfg = statusConfig[item.status];
              const Ic = cfg.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:shadow-sm transition-all"
                >
                  <button
                    onClick={() => cycleStatus(item.id)}
                    className={`p-1.5 rounded-lg ${cfg.bg} ${cfg.color} hover:scale-110 transition-all`}
                  >
                    <Ic size={16} />
                  </button>
                  <span className="text-sm font-medium text-slate-700 flex-1">
                    {item.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${cfg.bg} ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                  <button className="invisible group-hover:visible p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                    <Upload size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
          <ClipboardCheck className="text-blue-600" size={32} />
          Compliance Urbano
        </h1>
        <p className="text-black/60 font-medium">
          Gestão documental: Matrícula, IPTU, Habite-se, Zoneamento e Licenças.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Imóvel
          </label>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="w-full mt-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="">Selecione</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const count = docs.filter((d) => d.status === key).length;
          const Ic = cfg.icon;
          return (
            <div key={key} className={`p-4 rounded-2xl ${cfg.bg} text-center`}>
              <Ic size={24} className={`mx-auto mb-2 ${cfg.color}`} />
              <p className={`text-2xl font-black ${cfg.color}`}>{count}</p>
              <p
                className={`text-[10px] font-bold uppercase tracking-widest ${cfg.color}`}
              >
                {cfg.label}
              </p>
            </div>
          );
        })}
      </div>

      {renderSection(imovelDocs, 'Documentação do Imóvel', 'imovel')}
      {renderSection(propDocs, 'Documentação do Proprietário', 'proprietario')}
    </div>
  );
};

export default ComplianceUrbano;
