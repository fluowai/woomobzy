import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { legalUrbanValidationService } from '../../services/legalUrbanValidationService';

type DocStatus = 'ok' | 'pendente' | 'vencido' | 'ausente';

interface DocItem {
  id: string;
  name: string;
  category: 'imovel' | 'proprietario';
  status: DocStatus;
  validated?: boolean;
  validationSource?:
    | 'IPTU'
    | 'ZONEAMENTO'
    | 'ENDERECO'
    | 'CND'
    | 'SINTER'
    | 'MANUAL';
}

interface PropertyValidation {
  propertyId: string;
  iptuStatus?: string;
  zoneamento?: string;
  endereco?: string;
  cndStatus?: string;
  riskScore: number;
  riskLevel: 'BAIXO' | 'MEDIO' | 'ALTO';
  lastValidation?: string;
}

const DEFAULT_DOCS: DocItem[] = [
  {
    id: '1',
    name: 'Matrícula Atualizada (< 30 dias)',
    category: 'imovel',
    status: 'ausente',
    validationSource: 'MANUAL',
  },
  {
    id: '2',
    name: 'IPTU em dia',
    category: 'imovel',
    status: 'ausente',
    validationSource: 'IPTU',
  },
  {
    id: '3',
    name: 'Habite-se',
    category: 'imovel',
    status: 'ausente',
    validationSource: 'MANUAL',
  },
  {
    id: '4',
    name: 'Certidão de Ônus Reais',
    category: 'imovel',
    status: 'ausente',
    validationSource: 'MANUAL',
  },
  {
    id: '5',
    name: 'Zoneamento Verificado',
    category: 'imovel',
    status: 'ausente',
    validationSource: 'ZONEAMENTO',
  },
  {
    id: '6',
    name: 'Licenças e Alvarás',
    category: 'imovel',
    status: 'ausente',
    validationSource: 'MANUAL',
  },
  {
    id: '7',
    name: 'Laudo de Vistoria',
    category: 'imovel',
    status: 'ausente',
    validationSource: 'MANUAL',
  },
  {
    id: '8',
    name: 'Averbação de Construção',
    category: 'imovel',
    status: 'ausente',
    validationSource: 'MANUAL',
  },
  {
    id: '9',
    name: 'RG / CPF do Proprietário',
    category: 'proprietario',
    status: 'ausente',
    validationSource: 'MANUAL',
  },
  {
    id: '10',
    name: 'Comprovante de Estado Civil',
    category: 'proprietario',
    status: 'ausente',
    validationSource: 'MANUAL',
  },
  {
    id: '11',
    name: 'Comprovante de Residência',
    category: 'proprietario',
    status: 'ausente',
    validationSource: 'MANUAL',
  },
  {
    id: '12',
    name: 'Certidão Negativa Federal',
    category: 'proprietario',
    status: 'ausente',
    validationSource: 'CND',
  },
  {
    id: '13',
    name: 'Certidão Negativa Estadual',
    category: 'proprietario',
    status: 'ausente',
    validationSource: 'CND',
  },
  {
    id: '14',
    name: 'Certidão Negativa Municipal',
    category: 'proprietario',
    status: 'ausente',
    validationSource: 'CND',
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
  const [propertyValidations, setPropertyValidations] = useState<
    Record<string, PropertyValidation>
  >({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('properties')
      .select('id, title, features')
      .not('property_type', 'in', '("Rural","Fazenda")')
      .order('title');
    setProperties(data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedProperty) {
      setDocs(DEFAULT_DOCS);
      return;
    }

    const saved = propertyValidations[selectedProperty];
    if (saved) {
      setDocs((prev) =>
        prev.map((item) => {
          let newStatus = item.status;
          let validated = false;

          if (item.validationSource === 'IPTU' && saved.iptuStatus) {
            newStatus = saved.iptuStatus === 'REGULAR' ? 'ok' : 'vencido';
            validated = true;
          } else if (
            item.validationSource === 'ZONEAMENTO' &&
            saved.zoneamento
          ) {
            newStatus = saved.zoneamento ? 'ok' : 'ausente';
            validated = true;
          } else if (item.validationSource === 'CND' && saved.cndStatus) {
            newStatus = saved.cndStatus === 'NEGATIVA' ? 'ok' : 'pendente';
            validated = true;
          }

          return { ...item, status: newStatus, validated };
        })
      );
    }
  }, [selectedProperty, propertyValidations]);

  const runValidation = async () => {
    if (!selectedProperty) return;

    setIsValidating(true);
    setValidationError(null);

    try {
      const result =
        await legalUrbanValidationService.validateProperty(selectedProperty);

      const newValidation: PropertyValidation = {
        propertyId: selectedProperty,
        iptuStatus: result.validations.find((v: any) => v.source === 'IPTU')
          ?.data?.status,
        zoneamento: result.validations.find(
          (v: any) => v.source === 'ZONEAMENTO'
        )?.data?.zona,
        endereco: result.validations.find((v: any) => v.source === 'ENDERECO')
          ?.data?.endereco,
        cndStatus: result.validations.find((v: any) => v.source === 'CND')?.data
          ?.certidaoNegativa
          ? 'NEGATIVA'
          : undefined,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        lastValidation: new Date().toISOString(),
      };

      setPropertyValidations((prev) => ({
        ...prev,
        [selectedProperty]: newValidation,
      }));
    } catch (error: any) {
      setValidationError(error.message || 'Erro ao validar');
    } finally {
      setIsValidating(false);
    }
  };

  const cycleStatus = (id: string) => {
    const order: DocStatus[] = ['ausente', 'pendente', 'ok', 'vencido'];
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: order[(order.indexOf(d.status) + 1) % order.length],
              validated: false,
            }
          : d
      )
    );
  };

  const imovelDocs = docs.filter((d) => d.category === 'imovel');
  const propDocs = docs.filter((d) => d.category === 'proprietario');

  const calculateScore = (items: DocItem[]) => {
    if (items.length === 0) return 0;
    const weights: Record<DocStatus, number> = {
      ok: 100,
      pendente: 50,
      vencido: 10,
      ausente: 0,
    };
    const total = items.reduce((acc, item) => acc + weights[item.status], 0);
    return Math.round(total / items.length);
  };

  const imovelScore = calculateScore(imovelDocs);
  const propScore = calculateScore(propDocs);
  const overallScore = Math.round((imovelScore + propScore) / 2);

  const currentValidation = propertyValidations[selectedProperty];

  const getScoreColor = (score: number) => {
    if (score >= 80)
      return { ring: 'border-emerald-500', text: 'text-emerald-600' };
    if (score >= 50)
      return { ring: 'border-amber-500', text: 'text-amber-600' };
    return { ring: 'border-red-500', text: 'text-red-600' };
  };

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
                  {item.validated && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider">
                      Validado
                    </span>
                  )}
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
          Gestão documental: Matrícula, IPTU, Zoneamento, Habitese-se e
          Certidões com validação automática.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Imóvel
          </label>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="w-full mt-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="">Selecione</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          {selectedProperty && (
            <button
              onClick={runValidation}
              disabled={isValidating}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl font-medium transition-all"
            >
              <RefreshCw
                size={16}
                className={isValidating ? 'animate-spin' : ''}
              />
              {isValidating ? 'Validando...' : 'Validar Automático'}
            </button>
          )}

          {validationError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} />
              {validationError}
            </div>
          )}
        </div>

        {[
          { label: 'Score Geral', score: overallScore },
          { label: 'Score Imóvel', score: imovelScore },
          { label: 'Score Proprietário', score: propScore },
        ].map((item, idx) => {
          const colors = getScoreColor(item.score);
          return (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4"
            >
              <div
                className={`w-16 h-16 rounded-full border-4 ${colors.ring} flex items-center justify-center`}
              >
                <span className={`text-xl font-black ${colors.text}`}>
                  {item.score}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-black">{item.label}</p>
                <p className="text-xs text-slate-400">
                  {item.score >= 80
                    ? 'Excelente'
                    : item.score >= 50
                      ? 'Atenção'
                      : 'Crítico'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {currentValidation && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-black">Validações Automáticas</h3>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  currentValidation.riskLevel === 'BAIXO'
                    ? 'bg-emerald-100 text-emerald-700'
                    : currentValidation.riskLevel === 'MEDIO'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                Risco: {currentValidation.riskLevel}
              </span>
              <a
                href={`/urban/properties/${selectedProperty}`}
                target="_blank"
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                rel="noreferrer"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                source: 'IPTU',
                status: currentValidation.iptuStatus,
                label: 'IPTU',
              },
              {
                source: 'ZONEAMENTO',
                status: currentValidation.zoneamento,
                label: 'Zoneamento',
              },
              {
                source: 'ENDERECO',
                status: currentValidation.endereco ? 'OK' : null,
                label: 'Endereço',
              },
              {
                source: 'CND',
                status: currentValidation.cndStatus,
                label: 'CND',
              },
            ].map((item) => (
              <div
                key={item.source}
                className={`p-3 rounded-xl border ${
                  item.status === 'OK' ||
                  item.status === 'REGULAR' ||
                  item.status === 'NEGATIVA' ||
                  item.status
                    ? 'bg-emerald-50 border-emerald-200'
                    : item.status === null
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-amber-50 border-amber-200'
                }`}
              >
                <p className="text-xs font-bold text-slate-500 uppercase">
                  {item.source}
                </p>
                <p
                  className={`text-lg font-black ${
                    item.status === 'OK' ||
                    item.status === 'REGULAR' ||
                    item.status === 'NEGATIVA'
                      ? 'text-emerald-700'
                      : item.status === null
                        ? 'text-slate-400'
                        : 'text-amber-700'
                  }`}
                >
                  {item.status || 'Não verificado'}
                </p>
                <p className="text-xs text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-black mb-4">Semáforo Documental</h3>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const count = docs.filter((d) => d.status === key).length;
            const Ic = cfg.icon;
            return (
              <div key={key} className={`p-4 rounded-xl ${cfg.bg} text-center`}>
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
      </div>

      {renderSection(imovelDocs, 'Documentação do Imóvel', 'imovel')}
      {renderSection(propDocs, 'Documentação do Proprietário', 'proprietario')}
    </div>
  );
};

export default ComplianceUrbano;
