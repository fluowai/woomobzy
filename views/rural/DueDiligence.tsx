import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle,
  Upload,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { legalValidationService } from '../../services/legalValidationService';

type DocStatus = 'approved' | 'pending' | 'rejected' | 'missing';

interface ChecklistItem {
  id: string;
  name: string;
  category: 'fundiario' | 'ambiental';
  status: DocStatus;
  file?: string;
  notes?: string;
  validated?: boolean;
  validationSource?: 'SNCR' | 'SIGEF' | 'CAR' | 'ITR' | 'MANUAL';
}

interface PropertyValidation {
  propertyId: string;
  carStatus?: string;
  ccirStatus?: string;
  geoStatus?: string;
  itrStatus?: string;
  riskScore: number;
  riskLevel: 'BAIXO' | 'MEDIO' | 'ALTO';
  lastValidation?: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: '1',
    name: 'Matrícula Atualizada (< 30 dias)',
    category: 'fundiario',
    status: 'missing',
    validationSource: 'MANUAL',
  },
  {
    id: '2',
    name: 'Certidão de Ônus Reais',
    category: 'fundiario',
    status: 'missing',
    validationSource: 'MANUAL',
  },
  {
    id: '3',
    name: 'CCIR (Certificado de Cadastro do Imóvel Rural)',
    category: 'fundiario',
    status: 'missing',
    validationSource: 'SNCR',
  },
  {
    id: '4',
    name: 'ITR (Imposto Territorial Rural) em dia',
    category: 'fundiario',
    status: 'missing',
    validationSource: 'ITR',
  },
  {
    id: '5',
    name: 'Georreferenciamento / GEO INCRA',
    category: 'fundiario',
    status: 'missing',
    validationSource: 'SIGEF',
  },
  {
    id: '6',
    name: 'Certidão Negativa de Débitos Federais',
    category: 'fundiario',
    status: 'missing',
    validationSource: 'ITR',
  },
  {
    id: '7',
    name: 'Certidão de Ações Reipersecutórias',
    category: 'fundiario',
    status: 'missing',
    validationSource: 'MANUAL',
  },
  {
    id: '8',
    name: 'Contrato / Escritura Original',
    category: 'fundiario',
    status: 'missing',
    validationSource: 'MANUAL',
  },
  {
    id: '9',
    name: 'CAR (Cadastro Ambiental Rural)',
    category: 'ambiental',
    status: 'missing',
    validationSource: 'CAR',
  },
  {
    id: '10',
    name: 'Reserva Legal Averbada',
    category: 'ambiental',
    status: 'missing',
    validationSource: 'CAR',
  },
  {
    id: '11',
    name: 'Licença Ambiental (se aplicável)',
    category: 'ambiental',
    status: 'missing',
    validationSource: 'MANUAL',
  },
  {
    id: '12',
    name: 'Outorga de Uso de Água',
    category: 'ambiental',
    status: 'missing',
    validationSource: 'MANUAL',
  },
  {
    id: '13',
    name: 'Relatório de APP (Área de Preservação)',
    category: 'ambiental',
    status: 'missing',
    validationSource: 'CAR',
  },
  {
    id: '14',
    name: 'Laudo de Flora e Fauna',
    category: 'ambiental',
    status: 'missing',
    validationSource: 'MANUAL',
  },
];

const statusConfig: Record<
  DocStatus,
  { label: string; color: string; bg: string; icon: any }
> = {
  approved: {
    label: 'Aprovado',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    icon: CheckCircle,
  },
  pending: {
    label: 'Pendente',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    icon: Clock,
  },
  rejected: {
    label: 'Rejeitado',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: XCircle,
  },
  missing: {
    label: 'Faltando',
    color: 'text-slate-500',
    bg: 'bg-slate-100',
    icon: AlertTriangle,
  },
};

const DueDiligence: React.FC = () => {
  const { profile } = useAuth();
  const [checklist, setChecklist] =
    useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [expandedCategory, setExpandedCategory] = useState<string>('fundiario');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [properties, setProperties] = useState<any[]>([]);
  const [propertyValidations, setPropertyValidations] = useState<
    Record<string, PropertyValidation>
  >({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const loadProps = useCallback(async () => {
    if (!profile?.organization_id) return;

    const { data } = await supabase
      .from('properties')
      .select('id, title, features')
      .eq('organization_id', profile.organization_id)
      .in('property_type', ['Rural', 'Fazenda'])
      .order('title');
    setProperties(data || []);
  }, [profile?.organization_id]);

  useEffect(() => {
    loadProps();
  }, [loadProps]);

  useEffect(() => {
    if (!selectedProperty) {
      setChecklist(DEFAULT_CHECKLIST);
      return;
    }

    const saved = propertyValidations[selectedProperty];
    if (saved) {
      setChecklist((prev) =>
        prev.map((item) => {
          let newStatus = item.status;
          let validated = false;

          if (item.validationSource === 'CAR' && saved.carStatus) {
            newStatus = saved.carStatus === 'ATIVO' ? 'approved' : 'rejected';
            validated = true;
          } else if (item.validationSource === 'SNCR' && saved.ccirStatus) {
            newStatus = saved.ccirStatus === 'ATIVO' ? 'approved' : 'pending';
            validated = true;
          } else if (item.validationSource === 'SIGEF' && saved.geoStatus) {
            newStatus =
              saved.geoStatus === 'CERTIFICADO' ? 'approved' : 'rejected';
            validated = true;
          } else if (item.validationSource === 'ITR' && saved.itrStatus) {
            newStatus = saved.itrStatus === 'REGULAR' ? 'approved' : 'rejected';
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
        await legalValidationService.validateProperty(selectedProperty);

      const newValidation: PropertyValidation = {
        propertyId: selectedProperty,
        carStatus: result.validations.find((v: any) => v.source === 'CAR')?.data
          ?.status,
        ccirStatus: result.validations.find((v: any) => v.source === 'SNCR')
          ?.data?.situacao,
        geoStatus: result.validations.find((v: any) => v.source === 'SIGEF')
          ?.data?.situacao,
        itrStatus: result.validations.find((v: any) => v.source === 'ITR')?.data
          ?.situacao,
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
    const order: DocStatus[] = ['missing', 'pending', 'approved', 'rejected'];
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const currentIdx = order.indexOf(item.status);
        const nextIdx = (currentIdx + 1) % order.length;
        return { ...item, status: order[nextIdx], validated: false };
      })
    );
  };

  const fundiarioItems = checklist.filter((i) => i.category === 'fundiario');
  const ambientalItems = checklist.filter((i) => i.category === 'ambiental');

  const calculateScore = (items: ChecklistItem[]) => {
    if (items.length === 0) return 0;
    const weights: Record<DocStatus, number> = {
      approved: 100,
      pending: 50,
      rejected: 10,
      missing: 0,
    };
    const total = items.reduce((acc, item) => acc + weights[item.status], 0);
    return Math.round(total / items.length);
  };

  const fundiarioScore = calculateScore(fundiarioItems);
  const ambientalScore = calculateScore(ambientalItems);
  const overallScore = calculateScore(checklist);

  const currentValidation = propertyValidations[selectedProperty];

  const getScoreColor = (score: number) => {
    if (score >= 80)
      return { ring: 'border-emerald-500', text: 'text-emerald-600' };
    if (score >= 50)
      return { ring: 'border-amber-500', text: 'text-amber-600' };
    return { ring: 'border-red-500', text: 'text-red-600' };
  };

  const renderChecklist = (
    items: ChecklistItem[],
    title: string,
    icon: any,
    categoryKey: string
  ) => {
    const Icon = icon;
    const isExpanded = expandedCategory === categoryKey;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setExpandedCategory(isExpanded ? '' : categoryKey)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <Icon size={22} className="text-emerald-600" />
            <h3 className="text-lg font-bold text-black">{title}</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
              {items.filter((i) => i.status === 'approved').length}/
              {items.length} aprovados
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="px-6 pb-6 space-y-2">
            {items.map((item) => {
              const cfg = statusConfig[item.status];
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:shadow-sm transition-all"
                >
                  <button
                    onClick={() => cycleStatus(item.id)}
                    className={`p-1.5 rounded-lg ${cfg.bg} ${cfg.color} transition-all hover:scale-110`}
                  >
                    <StatusIcon size={16} />
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
                  <button className="invisible group-hover:visible p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
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
          <ShieldCheck className="text-emerald-600" size={32} />
          Due Diligence Rural
        </h1>
        <p className="text-black/60 font-medium">
          Checklists fundiários e ambientais, validação automática gov.br e
          score de risco.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Propriedade
          </label>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="w-full mt-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="">Selecione uma propriedade</option>
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
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl font-medium transition-all"
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
          { label: 'Score Fundiário', score: fundiarioScore },
          { label: 'Score Ambiental', score: ambientalScore },
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
                href={`/rural/properties/${selectedProperty}`}
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
                source: 'CAR',
                status: currentValidation.carStatus,
                label: 'Cadastro Ambiental',
              },
              {
                source: 'SNCR',
                status: currentValidation.ccirStatus,
                label: 'CCIR/INCRA',
              },
              {
                source: 'SIGEF',
                status: currentValidation.geoStatus,
                label: 'Georreferenciamento',
              },
              {
                source: 'ITR',
                status: currentValidation.itrStatus,
                label: 'ITR/Receita',
              },
            ].map((item) => (
              <div
                key={item.source}
                className={`p-3 rounded-xl border ${
                  item.status === 'ATIVO' ||
                  item.status === 'CERTIFICADO' ||
                  item.status === 'REGULAR'
                    ? 'bg-emerald-50 border-emerald-200'
                    : item.status
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                }`}
              >
                <p className="text-xs font-bold text-slate-500 uppercase">
                  {item.source}
                </p>
                <p
                  className={`text-lg font-black ${
                    item.status === 'ATIVO' ||
                    item.status === 'CERTIFICADO' ||
                    item.status === 'REGULAR'
                      ? 'text-emerald-700'
                      : item.status
                        ? 'text-amber-700'
                        : 'text-slate-400'
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
          {[
            {
              status: 'approved' as DocStatus,
              count: checklist.filter((i) => i.status === 'approved').length,
            },
            {
              status: 'pending' as DocStatus,
              count: checklist.filter((i) => i.status === 'pending').length,
            },
            {
              status: 'rejected' as DocStatus,
              count: checklist.filter((i) => i.status === 'rejected').length,
            },
            {
              status: 'missing' as DocStatus,
              count: checklist.filter((i) => i.status === 'missing').length,
            },
          ].map((item, idx) => {
            const cfg = statusConfig[item.status];
            const Ic = cfg.icon;
            return (
              <div key={idx} className={`p-4 rounded-xl ${cfg.bg} text-center`}>
                <Ic size={24} className={`mx-auto mb-2 ${cfg.color}`} />
                <p className={`text-2xl font-black ${cfg.color}`}>
                  {item.count}
                </p>
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

      {renderChecklist(
        fundiarioItems,
        'Checklist Fundiário',
        FileText,
        'fundiario'
      )}
      {renderChecklist(
        ambientalItems,
        'Checklist Ambiental',
        ShieldCheck,
        'ambiental'
      )}
    </div>
  );
};

export default DueDiligence;
