import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
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
import { callApi, downloadApiFile } from '../../src/lib/api';

const currency = (value?: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const number = (value?: number | null, suffix = '') =>
  Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + suffix;

const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR') : 'Pendente';

const confidenceLabel = (score?: number) => {
  if (score === undefined || score === null) return 'Pendente';
  if (score >= 80) return 'Alta';
  if (score >= 50) return 'Media';
  return 'Baixa';
};

const sourceLabel = (status?: string) => {
  if (status === 'available') return 'Disponivel';
  if (status === 'checked') return 'Consultado';
  if (status === 'unavailable') return 'Indisponivel';
  if (status === 'planned') return 'Planejado';
  return 'Pendente';
};

const sourceTone = (status?: string) => {
  if (status === 'available') return 'text-emerald-700 bg-emerald-50';
  if (status === 'checked') return 'text-blue-700 bg-blue-50';
  if (status === 'unavailable') return 'text-amber-700 bg-amber-50';
  return 'text-slate-600 bg-slate-50';
};

const firstText = (...values: any[]) => values.find((value) => value !== undefined && value !== null && value !== '') || '';

const ValuationRural: React.FC = () => {
  const [selected, setSelected] = useState<any>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [runningByCar, setRunningByCar] = useState(false);
  const [carNumber, setCarNumber] = useState('');

  const features = selected?.features || {};
  const legal = features.legal || {};
  const enrichment = features.rural_enrichment || {};
  const valuation = features.rural_valuation || {};
  const fullCar = enrichment.car || {};
  const regional = enrichment.regional_analysis || {};
  const terrain = enrichment.terreno_logistica || {};
  const ambiental = enrichment.ambiental || {};
  const economico = enrichment.economico || {};

  const runValuationByCar = async (overrideCar?: string) => {
    const normalizedCar = (overrideCar || carNumber).trim().toUpperCase();
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
      setSelected(result.property);
      setLastResult(result);
      setCarNumber('');
      toast.success(result.mode === 'created' ? 'Imovel criado e relatorio salvo.' : 'Relatorio CAR atualizado.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao puxar valuation pelo CAR.');
    } finally {
      setRunningByCar(false);
    }
  };

  const refreshCurrent = async () => {
    const currentCar = firstText(enrichment.car_number, fullCar.codigo, legal.carNumber);
    if (!currentCar) {
      toast.error('Nenhum CAR carregado para atualizar.');
      return;
    }
    await runValuationByCar(currentCar);
  };

  const downloadDossier = async () => {
    if (!selected) return;
    try {
      await downloadApiFile(`/api/rural/dossier/${selected.id}/pdf`, `valuation-rural-${selected.id}.pdf`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao baixar dossie.');
    }
  };

  const areaHa = Number(firstText(enrichment.measured_area_ha, fullCar.area_ha, selected?.total_area_ha, features.areaHectares, 0));
  const carCode = firstText(enrichment.car_number, fullCar.codigo, legal.carNumber, 'Pendente');
  const municipality = firstText(enrichment.municipality, fullCar.municipio, selected?.city);
  const uf = firstText(enrichment.state, fullCar.uf, selected?.state);

  const summaryCards = [
    {
      label: 'Valor medio',
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
      label: 'Area CAR',
      value: areaHa ? number(areaHa, ' ha') : 'Pendente',
      icon: Map,
      tone: 'text-amber-700',
      bg: 'bg-amber-50',
    },
    {
      label: 'Confianca',
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
            ['Numero do CAR', carCode],
            ['Status SICAR', firstText(enrichment.car_status, fullCar.status, legal.carStatus, 'Pendente')],
            ['Municipio/UF', [municipality, uf].filter(Boolean).join(' / ') || 'Pendente'],
            ['Origem da consulta', enrichment.source_car || 'SICAR/CAR'],
          ],
        },
        {
          title: 'Area e Geometria',
          icon: MapPinned,
          rows: [
            ['Area declarada', enrichment.declared_area_ha ? number(enrichment.declared_area_ha, ' ha') : number(areaHa, ' ha')],
            ['Area medida', enrichment.measured_area_ha ? number(enrichment.measured_area_ha, ' ha') : number(areaHa, ' ha')],
            ['Centroide', enrichment.centroid ? `${Number(enrichment.centroid.lat).toFixed(6)}, ${Number(enrichment.centroid.lng).toFixed(6)}` : 'Pendente'],
            ['Geometria', enrichment.geometry ? 'Poligono disponivel' : 'Pendente'],
          ],
        },
        {
          title: 'Metodo do Valuation',
          icon: FileText,
          rows: [
            ['Metodo', valuation.method || 'MVP_POS_CAR_COMPLETO'],
            ['Data-base', dateTime(valuation.valuation_date || enrichment.data_geracao)],
            ['Status', valuation.status || 'Pendente'],
            ['Confianca', valuation.confidence_score !== undefined ? `${valuation.confidence_score}/100 (${confidenceLabel(valuation.confidence_score)})` : 'Pendente'],
          ],
        },
        {
          title: 'Intervalo Referencial',
          icon: Layers,
          rows: [
            ['Valor minimo', valuation.total_value_min ? currency(valuation.total_value_min) : 'Pendente'],
            ['Valor medio', valuation.total_value_avg ? currency(valuation.total_value_avg) : 'Pendente'],
            ['Valor maximo', valuation.total_value_max ? currency(valuation.total_value_max) : 'Pendente'],
            ['Comparaveis usados', valuation.comparable_count !== undefined ? `${valuation.comparable_count} registros internos, sem exibir fazendas` : 'Pendente'],
          ],
        },
      ]
    : [];

  const sources = [
    ['CAR/SICAR', enrichment.sources?.car],
    ['SIGEF/INCRA', enrichment.sources?.sigef],
    ['Documentos internos', enrichment.sources?.documents],
    ['MapBiomas', enrichment.sources?.mapbiomas],
    ['PRODES/DETER', enrichment.sources?.prodes],
    ['Solo', enrichment.sources?.soil],
    ['Declividade', enrichment.sources?.slope],
    ['Hidrografia/APP', enrichment.sources?.hydrography],
    ['Logistica e acesso', enrichment.sources?.logistics],
    ['Groq regional', enrichment.sources?.groq],
  ];

  const regionalCards = [
    ['Solo', enrichment.soil || terrain.soil],
    ['Declividade', enrichment.slope || terrain.slope],
    ['Hidrografia/APP', enrichment.hydrography || terrain.hydrography],
    ['Logistica e acesso', enrichment.logistics || terrain.logistics],
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="text-small font-bold text-primary uppercase tracking-widest">Consulta Pos-CAR</p>
          <h2 className="text-3xl font-bold text-slate-950 tracking-tight">Valuation CAR Rural</h2>
          <p className="text-sm text-slate-500 max-w-3xl mt-2">
            Informe um CAR e gere uma tela unica com fontes territoriais, ambientais, economicas e pesquisa regional via Groq.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={refreshCurrent}
            disabled={!selected || runningByCar}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-emerald-700 disabled:opacity-40"
          >
            {runningByCar ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
            Atualizar
          </button>
          <button
            type="button"
            onClick={downloadDossier}
            disabled={!selected}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <Download size={16} />
            Baixar Dossie
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:items-end">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
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
                placeholder="Ex: PR-4127809-51080C05C8C74535..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold uppercase text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => runValuationByCar()}
            disabled={runningByCar || !carNumber.trim()}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {runningByCar ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
            {runningByCar ? 'Consultando' : 'Gerar valuation'}
          </button>
        </div>
      </section>

      {!selected ? (
        <section className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center">
          <Search size={46} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-bold text-slate-500">Digite o CAR para gerar o relatorio completo do imovel.</p>
        </section>
      ) : (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  {selected.property_type || 'Fazenda'}
                </p>
                <h3 className="mt-1 text-2xl font-bold text-slate-950">{selected.title || `CAR ${carCode}`}</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {[municipality, uf].filter(Boolean).join(' / ') || 'Localizacao nao informada'}
                </p>
              </div>
              <div className="rounded-lg bg-slate-950 px-4 py-3 text-right text-white">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">CAR</p>
                <p className="max-w-[360px] break-all text-xs font-bold">{carCode}</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${card.bg} ${card.tone}`}>
                  <card.icon size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{card.label}</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{card.value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-emerald-100 bg-white p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Relatorio completo</p>
                <h4 className="text-lg font-bold text-slate-950">Laudo preliminar de valuation por CAR</h4>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-emerald-700">
                <CalendarClock size={15} />
                {dateTime(valuation.updated_at || valuation.valuation_date || enrichment.data_geracao)}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {reportSections.map((section) => (
                <div key={section.title} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-700">
                      <section.icon size={18} />
                    </div>
                    <h5 className="text-sm font-bold uppercase tracking-widest text-slate-900">{section.title}</h5>
                  </div>
                  <div className="space-y-2">
                    {section.rows.map(([label, value]) => (
                      <div key={label as string} className="flex items-start justify-between gap-4 border-t border-slate-200 pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
                        <span className="max-w-[62%] text-right text-xs font-bold text-slate-800">{String(value || 'Pendente')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-950">Fontes do Relatorio CAR</h4>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sources.map(([label, source]: any) => {
                const status = source?.status || 'missing';
                const done = status === 'available' || status === 'checked';
                return (
                  <div key={label} className={`rounded-lg px-3 py-3 ${sourceTone(status)}`}>
                    <div className="flex items-center gap-3">
                      {done ? <CheckCircle2 size={16} /> : status === 'unavailable' ? <AlertTriangle size={16} /> : <Activity size={16} />}
                      <div>
                        <p className="text-xs font-bold text-slate-900">{label}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide">{sourceLabel(status)}</p>
                      </div>
                    </div>
                    {source?.detail && <p className="mt-2 text-[11px] font-semibold text-slate-600">{source.detail}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Groq pesquisa regional</p>
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-950">Leitura da regiao</h4>
              </div>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-700">
              {valuation.regional_summary || regional.market_summary || 'Analise regional ainda nao gerada.'}
            </p>
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {regionalCards.map(([label, item]: any) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{item?.summary || 'Sem detalhe disponivel.'}</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Confianca {item?.confidence || 'baixa'} | {item?.source || 'Fonte regional'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-6">
              <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-900">Pontos Que Ajudam</h4>
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
              <h4 className="text-sm font-bold uppercase tracking-widest text-amber-900">Pendencias Para Melhorar</h4>
              <div className="mt-4 space-y-2">
                {(valuation.risks || ['Rode a consulta para gerar as pendencias.']).map((item: string) => (
                  <div key={item} className="flex items-start gap-2 text-sm font-semibold text-amber-900">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {(ambiental.prodes || ambiental.deter || ambiental.mapbiomas || economico.producao_agricola) && (
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-950">Dados complementares consultados</h4>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PRODES/DETER</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {ambiental.prodes?.possui_desmatamento === false ? 'Sem desmatamento detectado' : ambiental.prodes?.erro || 'Consulta executada'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MapBiomas</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {ambiental.mapbiomas?.total_alertas !== undefined ? `${ambiental.mapbiomas.total_alertas} alerta(s)` : ambiental.mapbiomas?.mensagem || 'Consulta executada'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">IBGE Agro</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {economico.producao_agricola?.produtos_principais?.[0]?.produto || 'Dados municipais consultados'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {lastResult?.car?.number && (
            <p className="text-xs font-semibold text-slate-400">
              Ultima consulta: {lastResult.car.number} | {lastResult.mode === 'created' ? 'imovel criado' : 'imovel atualizado'}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ValuationRural;
