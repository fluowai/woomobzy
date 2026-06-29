import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSearch,
  FileText,
  Layers,
  Map,
  MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { isRuralProperty } from '../../utils/propertyNiche';
import { callApi, downloadApiFile } from '../../src/lib/api';
import { Property } from '../../types';

const currency = (value?: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const number = (value?: number | null, suffix = '') =>
  Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + suffix;

const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR') : 'Pendente';

const sourceLabel = (status?: string) => {
  if (status === 'available') return 'Disponivel';
  if (status === 'planned') return 'Planejado';
  return 'Pendente';
};

const confidenceLabel = (score?: number) => {
  if (score === undefined || score === null) return 'Pendente';
  if (score >= 80) return 'Alta';
  if (score >= 50) return 'Media';
  return 'Baixa';
};

const ValuationRural: React.FC = () => {
  const { profile } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runningByCar, setRunningByCar] = useState(false);
  const [carNumber, setCarNumber] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadProperties();
  }, [profile?.organization_id]);

  const loadProperties = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('updated_at', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar imóveis rurais.');
      setLoading(false);
      return;
    }
    const rural = (data || []).filter(isRuralProperty) as any;
    setProperties(rural);
    if (!selectedId && rural[0]?.id) setSelectedId(rural[0].id);
    setLoading(false);
  };

  const selected = properties.find((property) => property.id === selectedId) as any;
  const features = selected?.features || {};
  const legal = features.legal || {};
  const enrichment = features.rural_enrichment || {};
  const valuation = features.rural_valuation || {};

  const filteredProperties = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return properties;
    return properties.filter((property: any) => {
      const haystack = [
        property.title,
        property.city,
        property.state,
        property.property_type,
        property.features?.legal?.carNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [properties, query]);

  const runValuation = async () => {
    if (!selected) {
      toast.error('Selecione um imóvel rural.');
      return;
    }
    setRunning(true);
    try {
      await callApi(`/api/rural/enrich/${selected.id}`, { method: 'POST' });
      const result = await callApi(`/api/rural/valuation/${selected.id}`, { method: 'POST' });
      const updated = result.property;
      setProperties((prev) => prev.map((item) => (item.id === updated.id ? updated : item)) as any);
      setSelectedId(updated.id);
      toast.success('Valuation rural consultado e salvo.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao consultar valuation rural.');
    } finally {
      setRunning(false);
    }
  };

  const runValuationByCar = async () => {
    const normalizedCar = carNumber.trim().toUpperCase();
    if (!normalizedCar) {
      toast.error('Informe o numero do CAR.');
      return;
    }

    setRunningByCar(true);
    try {
      const result = await callApi('/api/rural/valuation/by-car', {
        method: 'POST',
        body: JSON.stringify({ carNumber: normalizedCar }),
      });
      const updated = result.property;
      setProperties((prev) => {
        const exists = prev.some((item) => item.id === updated.id);
        return exists
          ? prev.map((item) => (item.id === updated.id ? updated : item)) as any
          : [updated, ...prev] as any;
      });
      setSelectedId(updated.id);
      setCarNumber('');
      toast.success(result.mode === 'created' ? 'Imovel criado e valuation salvo.' : 'Valuation atualizado pelo CAR.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao puxar valuation pelo CAR.');
    } finally {
      setRunningByCar(false);
    }
  };

  const downloadDossier = async () => {
    if (!selected) return;
    try {
      await downloadApiFile(`/api/rural/dossier/${selected.id}/pdf`, `valuation-rural-${selected.id}.pdf`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao baixar dossiê.');
    }
  };

  const summaryCards = [
    {
      label: 'Valor médio',
      value: valuation.total_value_avg ? currency(valuation.total_value_avg) : 'Pendente',
      icon: TrendingUp,
      tone: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Valor por hectare',
      value: valuation.price_per_ha_avg ? currency(valuation.price_per_ha_avg) : 'Pendente',
      icon: BarChart3,
      tone: 'text-blue-700',
      bg: 'bg-blue-50',
    },
    {
      label: 'Área medida',
      value: enrichment.measured_area_ha ? number(enrichment.measured_area_ha, ' ha') : number(selected?.total_area_ha || features.areaHectares, ' ha'),
      icon: Map,
      tone: 'text-amber-700',
      bg: 'bg-amber-50',
    },
    {
      label: 'Confiança',
      value: valuation.confidence_score !== undefined ? `${valuation.confidence_score}/100` : 'Pendente',
      icon: ShieldCheck,
      tone: 'text-slate-700',
      bg: 'bg-slate-50',
    },
  ];

  const reportSections = selected
    ? [
        {
          title: 'Identificacao CAR',
          icon: ClipboardCheck,
          rows: [
            ['Numero do CAR', enrichment.car_number || legal.carNumber || 'Pendente'],
            ['Status SICAR', enrichment.car_status || legal.carStatus || 'Pendente'],
            ['Municipio/UF', [enrichment.municipality || selected.city, enrichment.state || selected.state].filter(Boolean).join(' / ') || 'Pendente'],
            ['Origem da consulta', enrichment.source_car || (legal.carNumber ? 'SICAR/CAR' : 'Pendente')],
          ],
        },
        {
          title: 'Area e Geometria',
          icon: MapPinned,
          rows: [
            ['Area declarada', enrichment.declared_area_ha ? number(enrichment.declared_area_ha, ' ha') : number(selected.total_area_ha || features.areaHectares, ' ha')],
            ['Area medida', enrichment.measured_area_ha ? number(enrichment.measured_area_ha, ' ha') : 'Pendente'],
            ['Centroide', enrichment.centroid ? `${Number(enrichment.centroid.lat).toFixed(6)}, ${Number(enrichment.centroid.lng).toFixed(6)}` : 'Pendente'],
            ['Geometria', enrichment.geometry ? 'Poligono disponivel' : 'Pendente'],
          ],
        },
        {
          title: 'Metodo do Valuation',
          icon: FileText,
          rows: [
            ['Metodo', valuation.method || 'MVP_POS_CAR_COMPARAVEIS_INTERNOS'],
            ['Data-base', dateTime(valuation.valuation_date)],
            ['Status', valuation.status || 'Pendente'],
            ['Confianca', valuation.confidence_score !== undefined ? `${valuation.confidence_score}/100 (${confidenceLabel(valuation.confidence_score)})` : 'Pendente'],
          ],
        },
        {
          title: 'Comparaveis',
          icon: Layers,
          rows: [
            ['Escopo', valuation.comparable_scope || 'Pendente'],
            ['Quantidade usada', valuation.comparable_count !== undefined ? valuation.comparable_count : 'Pendente'],
            ['Valor/ha minimo', valuation.price_per_ha_min ? currency(valuation.price_per_ha_min) : 'Pendente'],
            ['Valor/ha maximo', valuation.price_per_ha_max ? currency(valuation.price_per_ha_max) : 'Pendente'],
          ],
        },
      ]
    : [];

  const sourceRows = [
    ['CAR/SICAR', enrichment.sources?.car?.status || (legal.carNumber ? 'available' : 'missing')],
    ['SIGEF/INCRA', enrichment.sources?.sigef?.status || 'missing'],
    ['Documentos internos', enrichment.sources?.documents?.status || 'missing'],
    ['MapBiomas', enrichment.sources?.mapbiomas?.status || 'planned'],
    ['PRODES/DETER', enrichment.sources?.prodes?.status || 'planned'],
    ['Solo', enrichment.sources?.soil?.status || 'planned'],
    ['Declividade', enrichment.sources?.slope?.status || 'planned'],
    ['Hidrografia/APP', enrichment.sources?.hydrography?.status || 'planned'],
    ['Logistica e acesso', enrichment.sources?.logistics?.status || 'planned'],
  ];

  const comparableSamples = valuation.comparable_samples || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="text-small font-bold text-primary uppercase tracking-widest">Consulta Pós-CAR</p>
          <h2 className="text-3xl font-black text-slate-950 tracking-tight">Valuation CAR Rural</h2>
          <p className="text-sm text-slate-500 max-w-3xl mt-2">
            Consulte o CAR, geometria, dados técnicos, comparáveis internos e gere um valuation referencial para o imóvel rural selecionado.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runValuation}
            disabled={!selected || running}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-emerald-700 disabled:opacity-40"
          >
            {running ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
            {running ? 'Consultando' : 'Atualizar Relatorio'}
          </button>
          <button
            type="button"
            onClick={downloadDossier}
            disabled={!selected}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <Download size={16} />
            Baixar Dossiê
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:items-end">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
              Numero do CAR
            </label>
            <div className="relative mt-2">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={carNumber}
                onChange={(event) => setCarNumber(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runValuationByCar();
                }}
                placeholder="Ex: PA-1500347-..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold uppercase text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={runValuationByCar}
            disabled={runningByCar || !carNumber.trim()}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {runningByCar ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
            {runningByCar ? 'Puxando CAR' : 'Puxar Valuation pelo CAR'}
          </button>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Consulta o SICAR pelo codigo, cria ou atualiza o imovel rural, salva geometria/area/localizacao e gera o valuation referencial.
        </p>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <aside className="xl:col-span-4 space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por imóvel, cidade ou CAR"
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {loading ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-bold text-slate-400">Carregando imóveis rurais...</div>
            ) : filteredProperties.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-sm font-bold text-slate-400">Nenhum imóvel rural encontrado.</div>
            ) : (
              filteredProperties.map((property: any) => {
                const active = property.id === selectedId;
                const hasValuation = Boolean(property.features?.rural_valuation?.total_value_avg);
                return (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => setSelectedId(property.id)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{property.title || 'Imóvel rural'}</p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          {[property.city, property.state].filter(Boolean).join(' / ') || 'Sem localização'}
                        </p>
                      </div>
                      {hasValuation ? (
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                      ) : (
                        <AlertTriangle size={18} className="shrink-0 text-amber-500" />
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase">
                      <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                        {property.total_area_ha || property.features?.areaHectares || 0} ha
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                        CAR {property.features?.legal?.carNumber ? 'OK' : 'pendente'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="xl:col-span-8 space-y-6">
          {!selected ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center">
              <FileSearch size={48} className="mx-auto text-slate-300" />
              <p className="mt-4 text-sm font-bold text-slate-500">Selecione um imóvel rural para consultar.</p>
            </div>
          ) : (
            <>
              <section className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                      {selected.property_type || selected.type || 'Rural'}
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-slate-950">{selected.title}</h3>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      {[selected.city, selected.state].filter(Boolean).join(' / ') || 'Localização não informada'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-950 px-4 py-3 text-right text-white">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">CAR</p>
                    <p className="text-xs font-black">{enrichment.car_number || legal.carNumber || 'Pendente'}</p>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {summaryCards.map((card) => (
                  <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5">
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${card.bg} ${card.tone}`}>
                      <card.icon size={20} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{card.value}</p>
                  </div>
                ))}
              </section>

              <section className="rounded-lg border border-emerald-100 bg-white p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Relatorio completo</p>
                    <h4 className="text-lg font-black text-slate-950">Laudo preliminar de valuation por CAR</h4>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-emerald-700">
                    <CalendarClock size={15} />
                    {dateTime(valuation.updated_at || valuation.valuation_date)}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {reportSections.map((section) => (
                    <div key={section.title} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-700">
                          <section.icon size={18} />
                        </div>
                        <h5 className="text-sm font-black uppercase tracking-widest text-slate-900">{section.title}</h5>
                      </div>
                      <div className="space-y-2">
                        {section.rows.map(([label, value]) => (
                          <div key={label as string} className="flex items-start justify-between gap-4 border-t border-slate-200 pt-2">
                            <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
                            <span className="max-w-[62%] text-right text-xs font-black text-slate-800">{String(value || 'Pendente')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-950">Fontes do Relatorio CAR</h4>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sourceRows.map(([label, status]) => {
                    const done = status === 'available';
                    const planned = status === 'planned';
                    return (
                      <div key={label} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
                        {done ? <CheckCircle2 size={16} className="text-emerald-600" /> : planned ? <Activity size={16} className="text-blue-500" /> : <AlertTriangle size={16} className="text-amber-500" />}
                        <div>
                          <p className="text-xs font-black text-slate-800">{label}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{sourceLabel(status as string)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {comparableSamples.length > 0 && (
                <section className="rounded-lg border border-slate-200 bg-white p-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-950">Amostras Comparaveis Internas</h4>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <th className="py-3 pr-4">Imovel</th>
                          <th className="py-3 pr-4">Regiao</th>
                          <th className="py-3 pr-4">Area</th>
                          <th className="py-3 pr-4">Preco</th>
                          <th className="py-3">Preco/ha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparableSamples.map((item: any) => (
                          <tr key={item.id || item.title} className="border-b border-slate-100 font-semibold text-slate-700">
                            <td className="py-3 pr-4 font-black text-slate-900">{item.title || 'Imovel rural'}</td>
                            <td className="py-3 pr-4">{[item.city, item.state].filter(Boolean).join(' / ') || '-'}</td>
                            <td className="py-3 pr-4">{number(item.areaHa, ' ha')}</td>
                            <td className="py-3 pr-4">{currency(item.price)}</td>
                            <td className="py-3">{currency(item.pricePerHa)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-950">Intervalo Referencial</h4>
                  <div className="mt-5 space-y-3">
                    {[
                      ['Mínimo', valuation.total_value_min],
                      ['Médio', valuation.total_value_avg],
                      ['Máximo', valuation.total_value_max],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
                        <span className="text-sm font-black text-slate-950">{value ? currency(value as number) : 'Pendente'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-950">O Que Foi Consultado</h4>
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ['CAR/SICAR', enrichment.sources?.car?.status || (legal.carNumber ? 'available' : 'missing')],
                      ['SIGEF/INCRA', enrichment.sources?.sigef?.status || 'missing'],
                      ['Documentos', enrichment.sources?.documents?.status || 'missing'],
                      ['MapBiomas', enrichment.sources?.mapbiomas?.status || 'planned'],
                      ['PRODES/DETER', enrichment.sources?.prodes?.status || 'planned'],
                      ['Solo/Relevo/Água/Logística', 'planned'],
                    ].map(([label, status]) => {
                      const done = status === 'available';
                      const planned = status === 'planned';
                      return (
                        <div key={label} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
                          {done ? <CheckCircle2 size={16} className="text-emerald-600" /> : planned ? <Activity size={16} className="text-blue-500" /> : <AlertTriangle size={16} className="text-amber-500" />}
                          <div>
                            <p className="text-xs font-black text-slate-800">{label}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              {done ? 'Disponível' : planned ? 'Planejado' : 'Pendente'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-emerald-900">Pontos Que Ajudam</h4>
                  <div className="mt-4 space-y-2">
                    {(valuation.drivers || ['Rode a consulta para gerar os pontos positivos.']).map((item: string) => (
                      <div key={item} className="flex items-start gap-2 text-sm font-semibold text-emerald-900">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-amber-100 bg-amber-50 p-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-amber-900">Pendências Para Melhorar</h4>
                  <div className="mt-4 space-y-2">
                    {(valuation.risks || ['Rode a consulta para gerar as pendências.']).map((item: string) => (
                      <div key={item} className="flex items-start gap-2 text-sm font-semibold text-amber-900">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ValuationRural;
