import { logger } from '@/utils/logger';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  UploadCloud,
  Search,
  ChevronDown,
  Layers,
  Maximize,
  ZoomIn,
  ZoomOut,
  Target,
  Trees,
  ChevronRight,
  Settings2,
  Building2,
  Ruler,
  Hash,
  Calendar,
} from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

type Development = {
  id: string;
  name: string;
  status: string;
  vgv_total?: number;
  percent_sold?: number;
  total_area?: number;
  registration_number?: string;
  created_at?: string;
};

type UrbanLot = {
  id: string;
  block_name: string;
  lot_number: string;
  area_m2: number;
  price: number;
  status: 'available' | 'reserved' | 'sold' | 'blocked';
  created_at?: string;
  updated_at?: string;
};

type RecentLead = {
  id: string;
  name: string;
  funnel_stage?: string;
  created_at?: string;
};

const statusLabels: Record<string, string> = {
  projeto: 'Projeto',
  aprovacao: 'Aprovação',
  pre_venda: 'Pré-venda',
  em_obras: 'Em obras',
  lancamento: 'Lançamento',
  pronto: 'Pronto',
  esgotado: 'Esgotado',
  'Em comercialização': 'Em comercialização',
};

const lotStatusLabel: Record<UrbanLot['status'], string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  sold: 'Vendido',
  blocked: 'Bloqueado',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);

export default function Empreendimentos() {
  const { profile } = useAuth();
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [selectedDevId, setSelectedDevId] = useState<string | null>(null);
  const [lots, setLots] = useState<UrbanLot[]>([]);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const selectedDev = developments.find((d) => d.id === selectedDevId) || null;

  useEffect(() => {
    if (!profile?.organization_id) return;

    const loadDevelopments = async () => {
      try {
        const { data } = await supabase
          .from('developments')
          .select('id,name,status,vgv_total,percent_sold,total_area,registration_number,created_at')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false });

        const devs = (data || []) as Development[];
        setDevelopments(devs);
        setSelectedDevId((prev) => prev || devs[0]?.id || null);
      } catch (err) {
        logger.error('Error loading developments:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDevelopments();
  }, [profile?.organization_id]);

  useEffect(() => {
    if (!profile?.organization_id || !selectedDevId) return;

    const loadLotsAndLeads = async () => {
      try {
        const [{ data: lotData }, { data: leadData }] = await Promise.all([
          supabase
            .from('urban_lots')
            .select('id,block_name,lot_number,area_m2,price,status,created_at,updated_at')
            .eq('organization_id', profile.organization_id)
            .eq('development_id', selectedDevId)
            .order('block_name', { ascending: true })
            .order('lot_number', { ascending: true }),
          supabase
            .from('leads')
            .select('id,name,funnel_stage,created_at')
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        setLots((lotData || []) as UrbanLot[]);
        setRecentLeads((leadData || []) as RecentLead[]);
        setSelectedLotId(null);
      } catch (err) {
        logger.error('Error loading lots/leads:', err);
      }
    };

    loadLotsAndLeads();
  }, [profile?.organization_id, selectedDevId]);

  const filteredLots = useMemo(() => {
    let result = lots;
    if (filterStatus !== 'all') {
      result = result.filter((lot) => lot.status === filterStatus);
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (lot) =>
          lot.lot_number.toLowerCase().includes(term) ||
          lot.block_name.toLowerCase().includes(term)
      );
    }
    return result;
  }, [lots, filterStatus, search]);

  const statusCounts = useMemo(() => {
    const counts = { available: 0, reserved: 0, sold: 0, blocked: 0 };
    for (const lot of lots) {
      counts[lot.status] += 1;
    }
    return counts;
  }, [lots]);

  const totalLots = lots.length;
  const soldLots = statusCounts.sold;
  const percentSold =
    totalLots > 0 ? Math.round((soldLots / totalLots) * 100) : 0;
  const vgvStock = lots
    .filter((lot) => lot.status === 'available' || lot.status === 'reserved')
    .reduce((sum, lot) => sum + Number(lot.price || 0), 0);

  const blocks = useMemo(() => {
    const grouped = new Map<string, UrbanLot[]>();
    for (const lot of filteredLots) {
      const key = lot.block_name || 'Quadra';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(lot);
    }
    return Array.from(grouped.entries());
  }, [filteredLots]);

  const performanceData = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
    return Array.from({ length: 6 }, (_, offset) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - offset));
      const value = lots.filter((lot) => {
        if (lot.status !== 'sold') return false;
        const updatedAt = lot.updated_at ? new Date(lot.updated_at) : null;
        return (
          updatedAt &&
          updatedAt.getMonth() === date.getMonth() &&
          updatedAt.getFullYear() === date.getFullYear()
        );
      }).length;
      return {
        name: monthFormatter.format(date).replace('.', ''),
        value,
      };
    });
  }, [lots]);

  const getLotColor = (status: UrbanLot['status']) => {
    switch (status) {
      case 'available':
        return 'bg-[#c6f6d5] border-[#9ae6b4] text-[#22543d]';
      case 'reserved':
        return 'bg-[#fef08a] border-[#fde047] text-[#713f12]';
      case 'sold':
        return 'bg-[#34d399] border-[#10b981] text-[#064e3b]';
      default:
        return 'bg-slate-200 border-slate-300 text-slate-700';
    }
  };

  const renderLot = (lot: UrbanLot) => {
    const isSelected = selectedLotId === lot.id;
    return (
      <div
        key={lot.id}
        onClick={() => setSelectedLotId(isSelected ? null : lot.id)}
        className={`
          relative flex items-center justify-center font-bold text-[10px] sm:text-xs rounded border cursor-pointer transition-all
          ${getLotColor(lot.status)}
          hover:brightness-95 hover:scale-[1.02] shadow-sm
          ${isSelected ? 'ring-2 ring-emerald-600 ring-offset-2 z-10 scale-105' : ''}
        `}
        style={{ aspectRatio: '1/1.2', minWidth: '36px' }}
      >
        {lot.lot_number}
        {isSelected && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-fade-in pointer-events-auto cursor-default">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-slate-200 rotate-45" />
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLotId(null);
                }}
                className="absolute -top-2 -right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <p className="font-bold text-slate-900 text-sm mb-0.5">
                Lote {lot.lot_number}
              </p>
              <p className="text-xs text-slate-500 mb-1">
                {lot.area_m2 || 0} m²
              </p>
              <p className="text-sm font-bold text-slate-900 mb-2">
                {formatCurrency(Number(lot.price || 0))}
              </p>
              <div className="flex items-center gap-1.5 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-700">
                  {lotStatusLabel[lot.status]}
                </span>
              </div>
              <div className="space-y-2">
                <button className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm">
                  Criar proposta
                </button>
                <button className="w-full py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors">
                  Ver detalhes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="wootech-reference-screen w-full max-w-[1600px] mx-auto pb-12 font-sans text-slate-800 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span className="font-medium text-slate-400">Imóveis</span>
            <span className="text-slate-300">/</span>
            <span className="text-emerald-600 font-semibold">Loteamentos</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Central de loteamentos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mapa comercial, estoque e evolução dos seus empreendimentos.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2">
            <UploadCloud size={18} /> Importar planta
          </button>
          <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2">
            <Plus size={18} /> Novo loteamento
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column (Main Map Area) */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg shadow-sm cursor-pointer hover:bg-slate-50 transition-colors shrink-0">
              <Trees size={18} className="text-emerald-600" />
              <select
                value={selectedDevId || ''}
                onChange={(e) => setSelectedDevId(e.target.value || null)}
                className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
              >
                {developments.length === 0 && <option value="">Sem empreendimentos</option>}
                {developments.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="text-slate-400 ml-2" />
            </div>

            {selectedDev && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
                {statusLabels[selectedDev.status] || selectedDev.status || 'Em comercialização'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
            <div className="relative w-64 shrink-0">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar lote ou cliente..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-sm ${
                  filterStatus === 'all'
                    ? 'bg-emerald-700 text-white'
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('available')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 ${
                  filterStatus === 'available'
                    ? 'bg-emerald-700 text-white'
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="w-3 h-3 bg-[#c6f6d5] border border-[#9ae6b4] rounded-sm" />{' '}
                Disponíveis
              </button>
              <button
                onClick={() => setFilterStatus('reserved')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 ${
                  filterStatus === 'reserved'
                    ? 'bg-emerald-700 text-white'
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="w-3 h-3 bg-[#fef08a] border border-[#fde047] rounded-sm" />{' '}
                Reservados
              </button>
              <button
                onClick={() => setFilterStatus('sold')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 ${
                  filterStatus === 'sold'
                    ? 'bg-emerald-700 text-white'
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="w-3 h-3 bg-[#34d399] border border-[#10b981] rounded-sm" />{' '}
                Vendidos
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <button className="p-1.5 hover:bg-slate-50 text-slate-400 rounded-md">
                <Settings2 size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
              <button className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-md">
                <Layers size={18} />
              </button>
              <button className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-md">
                <Maximize size={18} />
              </button>
            </div>
          </div>

          {/* Interactive Map Area */}
          <div className="relative w-full h-[700px] bg-emerald-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center isolate">
            <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]" />

            {/* Map Contents */}
            <div className="relative w-full h-full p-8 overflow-auto flex items-start justify-center">
              {loading ? (
                <div className="text-sm text-slate-500 mt-10">
                  Carregando loteamento...
                </div>
              ) : blocks.length === 0 ? (
                <div className="text-sm text-slate-500 mt-10 text-center">
                  <Building2
                    size={40}
                    className="mx-auto mb-2 text-slate-300"
                  />
                  Nenhum lote cadastrado neste empreendimento.
                </div>
              ) : (
                <div className="flex flex-col gap-8 w-max h-max rotate-[-5deg] scale-95 p-12 bg-white/40 rounded-[3rem] backdrop-blur-sm border border-white/60 shadow-xl">
                  <div className="flex flex-wrap gap-8 items-start">
                    {blocks.map(([blockName, blockLots]) => (
                      <div
                        key={blockName}
                        className="bg-white/80 p-4 rounded-3xl border-2 border-slate-200 shadow-sm relative"
                      >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                          {blockName}
                        </div>
                        <div className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: `repeat(${Math.max(3, Math.ceil(Math.sqrt(blockLots.length)))}, 1fr)` }}>
                          {blockLots.map((lot) => renderLot(lot))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Floating Controls Right */}
            <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
              <div className="bg-white rounded-lg shadow-md border border-slate-200 flex flex-col overflow-hidden">
                <button className="p-2 text-slate-600 hover:bg-slate-50 border-b border-slate-100">
                  <ZoomIn size={20} />
                </button>
                <button className="p-2 text-slate-600 hover:bg-slate-50 border-b border-slate-100">
                  <ZoomOut size={20} />
                </button>
                <button className="p-2 text-slate-600 hover:bg-slate-50">
                  <Target size={20} />
                </button>
              </div>
            </div>

            {/* Legend Left */}
            <div className="absolute bottom-6 left-6 bg-white rounded-xl shadow-md border border-slate-200 p-4 z-20 min-w-[180px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-[#c6f6d5] border border-[#9ae6b4] rounded-sm" />
                    <span className="text-sm font-medium text-slate-600">
                      Disponível
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {statusCounts.available}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-[#fef08a] border border-[#fde047] rounded-sm" />
                    <span className="text-sm font-medium text-slate-600">
                      Reservado
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {statusCounts.reserved}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-[#34d399] border border-[#10b981] rounded-sm" />
                    <span className="text-sm font-medium text-slate-600">
                      Vendido
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {statusCounts.sold}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-slate-200 border border-slate-300 rounded-sm" />
                    <span className="text-sm font-medium text-slate-600">
                      Bloqueado
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {statusCounts.blocked}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="w-full xl:w-[380px] shrink-0 space-y-6">
          {/* Visão comercial */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-6">
              Visão comercial
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 leading-none mb-1">
                    {totalLots}
                  </p>
                  <p className="text-xs text-slate-500">lotes</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 leading-none mb-1">
                    {statusCounts.available}
                  </p>
                  <p className="text-xs text-slate-500">disponíveis</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 leading-none mb-1">
                    {percentSold}%
                  </p>
                  <p className="text-xs text-slate-500">vendido</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 leading-none mb-1">
                    {formatCurrency(vgvStock)}
                  </p>
                  <p className="text-xs text-slate-500">VGV em estoque</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-700">
                  {soldLots}{' '}
                  <span className="font-normal text-slate-500">
                    de {totalLots} vendidos
                  </span>
                </span>
                <span className="text-slate-700">{percentSold}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${percentSold}%` }}
                />
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Performance
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Vendas nos últimos 6 meses
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                {soldLots} vendas
              </span>
            </div>

            <div className="h-40 w-full mt-2 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    dy={10}
                  />
                  <Tooltip
                    cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                    }}
                    labelStyle={{
                      fontWeight: 'bold',
                      color: '#0f172a',
                      marginBottom: '4px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: '#10b981',
                      strokeWidth: 2,
                      stroke: '#fff',
                    }}
                    activeDot={{
                      r: 6,
                      fill: '#10b981',
                      stroke: '#fff',
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Oportunidades recentes */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-6">
              Oportunidades recentes
            </h3>

            {recentLeads.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum lead recente neste loteamento.
              </p>
            ) : (
              <div className="space-y-4">
                {recentLeads.map((lead) => {
                  const initials = (lead.name || 'L')
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w.charAt(0))
                    .join('')
                    .toUpperCase();
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {lead.name || 'Lead sem nome'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {lead.funnel_stage || 'Novo lead'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-slate-300 group-hover:text-emerald-600 transition-colors"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dados do empreendimento */}
          {selectedDev && (
            <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-900 mb-6">
                Dados do empreendimento
              </h3>

              <div className="space-y-5 mb-6">
                <div>
                  <div className="flex items-center justify-between text-sm font-bold mb-2 text-slate-700">
                    <span className="flex items-center gap-2">
                      <Ruler size={16} className="text-slate-500" /> Área total
                    </span>
                    <span>{selectedDev.total_area ? `${selectedDev.total_area} m²` : '—'}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${Math.min(100, percentSold)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm font-bold mb-2 text-slate-700">
                    <span className="flex items-center gap-2">
                      <Hash size={16} className="text-slate-500" /> Matrícula
                    </span>
                    <span>{selectedDev.registration_number || '—'}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm font-bold mb-2 text-slate-700">
                    <span className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-500" /> Criado em
                    </span>
                    <span>
                      {selectedDev.created_at
                        ? new Date(selectedDev.created_at).toLocaleDateString('pt-BR')
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-between w-full">
                Ver cronograma <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
