import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Map as MapIcon, 
  Grid3X3, 
  Download, 
  Plus, 
  Search,
  Maximize2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  FileText,
  Layers,
  Settings2,
  Ruler,
  Hash,
  DollarSign,
  Loader2,
  Wand2,
  X,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Development, Lot, LotStatus } from '../../types';
import { toast } from 'sonner';

const LoteamentoDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [development, setDevelopment] = useState<Development | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [filterStatus, setFilterStatus] = useState<LotStatus | 'Todos'>('Todos');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateFormState = {
    quadraCount: 1,
    lotsPerQuadra: 10,
    area_m2: 250,
    price: 0,
    front_m: 10,
    back_m: 10,
    left_m: 25,
    right_m: 25,
  };
  const [genForm, setGenForm] = useState({ ...generateFormState });

  const dbStatusToUi = (status: string): LotStatus => {
    const map: Record<string, LotStatus> = {
      available: LotStatus.AVAILABLE,
      reserved: LotStatus.RESERVED,
      sold: LotStatus.SOLD,
      blocked: LotStatus.BLOCKED,
    };
    return map[status] || LotStatus.AVAILABLE;
  };

  const uiStatusToDb = (status: LotStatus): string => {
    const map: Record<string, string> = {
      [LotStatus.AVAILABLE]: 'available',
      [LotStatus.RESERVED]: 'reserved',
      [LotStatus.SOLD]: 'sold',
      [LotStatus.BLOCKED]: 'blocked',
    };
    return map[status] || 'available';
  };

  const quadraLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: dev } = await supabase
        .from('developments')
        .select('*')
        .eq('id', id)
        .single();
      
      setDevelopment(dev);

      const { data: lotData, error: lotError } = await supabase
        .from('urban_lots')
        .select('*')
        .eq('development_id', id)
        .order('block_name', { ascending: true })
        .order('lot_number', { ascending: true });

      if (lotError) throw lotError;

      setLots(
        (lotData || []).map((lot: any) => ({
          id: lot.id,
          development_id: lot.development_id,
          block_id: lot.block_name,
          number: lot.lot_number,
          area_m2: Number(lot.area_m2 || 0),
          price: Number(lot.price || 0),
          status: dbStatusToUi(lot.status),
          current_client_id: lot.buyer_id,
          coordinates: lot.metadata?.coordinates,
          front_m: lot.metadata?.front_m,
          back_m: lot.metadata?.back_m,
          left_m: lot.metadata?.left_m,
          right_m: lot.metadata?.right_m,
        }))
      );
    } catch (err) {
      console.error('Error loading lot data:', err);
      toast.error('Erro ao carregar dados do loteamento');
    } finally {
      setLoading(false);
    }
  };

  const lotsByBlock = useMemo(() => {
    const groups: Record<string, Lot[]> = {};
    const filtered = filterStatus === 'Todos'
      ? lots
      : lots.filter(l => l.status === filterStatus);

    for (const lot of filtered) {
      if (!groups[lot.block_id]) groups[lot.block_id] = [];
      groups[lot.block_id].push(lot);
    }
    return groups;
  }, [lots, filterStatus]);

  const getStatusColor = (status: LotStatus) => {
    switch (status) {
      case LotStatus.AVAILABLE: return 'bg-emerald-500 text-white';
      case LotStatus.SOLD: return 'bg-red-500 text-white';
      case LotStatus.RESERVED: return 'bg-amber-500 text-white';
      case LotStatus.BLOCKED: return 'bg-slate-400 text-white';
      default: return 'bg-slate-200 text-slate-500';
    }
  };

  const getStatusBorder = (status: LotStatus) => {
    switch (status) {
      case LotStatus.AVAILABLE: return 'border-emerald-400';
      case LotStatus.SOLD: return 'border-red-400';
      case LotStatus.RESERVED: return 'border-amber-400';
      case LotStatus.BLOCKED: return 'border-slate-300';
      default: return 'border-slate-200';
    }
  };

  const handleGenerateLots = async () => {
    if (!development?.organization_id || !id) return;
    if (genForm.quadraCount < 1 || genForm.lotsPerQuadra < 1) {
      toast.error('Defina ao menos 1 quadra e 1 lote por quadra');
      return;
    }

    setGenerating(true);
    try {
      const existingCount = lots.filter(l => l.block_id.startsWith('Quadra')).length;
      const inserts: any[] = [];

      for (let q = 0; q < genForm.quadraCount; q++) {
        const blockName = `Quadra ${quadraLabels[q]}`;
        for (let l = 1; l <= genForm.lotsPerQuadra; l++) {
          const lotNumber = String(existingCount + inserts.length + 1).padStart(2, '0');
          inserts.push({
            organization_id: development.organization_id,
            development_id: id,
            block_name: blockName,
            lot_number: lotNumber,
            area_m2: genForm.area_m2,
            price: genForm.price,
            status: uiStatusToDb(LotStatus.AVAILABLE),
            metadata: {
              front_m: genForm.front_m,
              back_m: genForm.back_m,
              left_m: genForm.left_m,
              right_m: genForm.right_m,
            },
          });
        }
      }

      const { data, error } = await supabase
        .from('urban_lots')
        .insert(inserts)
        .select();

      if (error) throw error;

      const newLots: Lot[] = (data || []).map((lot: any) => ({
        id: lot.id,
        development_id: lot.development_id,
        block_id: lot.block_name,
        number: lot.lot_number,
        area_m2: Number(lot.area_m2 || 0),
        price: Number(lot.price || 0),
        status: dbStatusToUi(lot.status),
        current_client_id: lot.buyer_id,
        coordinates: lot.metadata?.coordinates,
        front_m: lot.metadata?.front_m,
        back_m: lot.metadata?.back_m,
        left_m: lot.metadata?.left_m,
        right_m: lot.metadata?.right_m,
      }));

      setLots((prev) => {
        const existingIds = new Set(prev.map(p => p.id));
        return [...prev, ...newLots.filter(l => !existingIds.has(l.id))];
      });
      setShowGenerateModal(false);
      toast.success(`${inserts.length} lotes gerados com sucesso!`);
    } catch (err) {
      console.error('Error generating lots:', err);
      toast.error('Erro ao gerar lotes');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateLot = async () => {
    if (!development?.organization_id || !id) return;

    const nextNumber = String(lots.length + 1).padStart(2, '0');
    const { data, error } = await supabase
      .from('urban_lots')
      .insert({
        organization_id: development.organization_id,
        development_id: id,
        block_name: 'Quadra A',
        lot_number: nextNumber,
        area_m2: 250,
        price: 0,
        status: uiStatusToDb(LotStatus.AVAILABLE),
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar lote');
      return;
    }

    const lot: Lot = {
      id: data.id,
      development_id: data.development_id,
      block_id: data.block_name,
      number: data.lot_number,
      area_m2: Number(data.area_m2 || 0),
      price: Number(data.price || 0),
      status: dbStatusToUi(data.status),
    };

    setLots((prev) => [...prev, lot]);
    setSelectedLot(lot);
    toast.success('Lote criado');
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Carregando Espelho de Vendas...</div>;
  if (!development) return <div className="p-10 text-center">Loteamento não encontrado.</div>;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Interativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/urban/loteamentos')}
            className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight">
              {development.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
               <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Espelho de Vendas 360°
               </span>
               <span className="text-[10px] font-bold text-slate-400">
                  {development.city}, {development.state}
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lots.length === 0 && (
            <button onClick={() => setShowGenerateModal(true)} className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
              <Wand2 size={16} /> Gerar Lotes
            </button>
          )}
          {lots.length > 0 && (
            <button onClick={() => setShowGenerateModal(true)} className="flex items-center gap-2 px-5 py-3 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-900/10">
              <Layers size={16} /> + Gerar Quadras
            </button>
          )}
          <button onClick={handleCreateLot} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
            <Plus size={16} /> Novo Lote
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Lado Esquerdo: Filtros e Mapa */}
        <div className="flex-1 bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden flex flex-col relative">
          
          {/* Barra de Filtros */}
          <div className="p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between flex-wrap gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-2">
               {['Todos', LotStatus.AVAILABLE, LotStatus.RESERVED, LotStatus.SOLD].map(status => (
                 <button
                   key={status}
                   onClick={() => setFilterStatus(status as any)}
                   className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'}`}
                 >
                   {status}
                 </button>
               ))}
            </div>
            
            <div className="relative">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                 placeholder="Buscar Lote/Quadra..." 
                 className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all w-48"
               />
            </div>
          </div>

          {/* Mapa Visual de Lotes (agrupado por quadra) */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
            {Object.keys(lotsByBlock).length === 0 ? (
              <>
                <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white p-10 text-center">
                  <Grid3X3 size={40} className="mx-auto mb-4 text-slate-300" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
                    Nenhum lote cadastrado
                  </h3>
                  <p className="mt-2 text-xs text-slate-400">
                    Clique em "Gerar Lotes" para criar as quadras e lotes deste loteamento.
                  </p>
                </div>
                <div className="mt-8 p-8 border-2 border-dashed border-slate-200 rounded-[3rem] text-center bg-slate-100/50">
                   <MapIcon size={40} className="mx-auto text-slate-300 mb-4" />
                   <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Upload de Mapa SVG em breve</p>
                   <p className="text-xs text-slate-400 mt-1">Nesta área você poderá carregar o mapa real do loteamento.</p>
                </div>
              </>
            ) : (
              <div className="space-y-10">
                {(Object.entries(lotsByBlock) as [string, Lot[]][]).map(([blockName, blockLots]) => (
                  <div key={blockName}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">
                        {blockName}
                      </div>
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[10px] font-bold text-slate-400">
                        {blockLots.length} lotes
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-3 lg:gap-4">
                      {blockLots.map((lot) => (
                        <button
                          key={lot.id}
                          onClick={() => setSelectedLot(lot)}
                          className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all hover:scale-110 active:scale-95 shadow-sm border-2 ${selectedLot?.id === lot.id ? 'ring-4 ring-blue-600/30 border-blue-600 scale-105 z-10 shadow-xl' : `border-white/40 ${getStatusBorder(lot.status)}/30`} ${getStatusColor(lot.status)}`}
                        >
                          <span className="text-[10px] font-black opacity-60 leading-none uppercase">{lot.block_id.split(' ')[1]}</span>
                          <span className="text-xl font-black italic tracking-tighter leading-none">{lot.number}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Detalhes do Lote Selecionado */}
        <aside className="w-full lg:w-96 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 flex flex-col animate-in slide-in-from-right-8 duration-500 overflow-y-auto">
          {selectedLot ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">
                     {selectedLot.block_id.split(' ')[1]}-{selectedLot.number}
                   </h2>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Ficha Técnica do Lote</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getStatusColor(selectedLot.status)} shadow-lg`}>
                  {selectedLot.status === LotStatus.AVAILABLE ? <CheckCircle2 size={24} /> : selectedLot.status === LotStatus.SOLD ? <XCircle size={24} /> : <Clock size={24} />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Área Total</span>
                    <p className="text-lg font-black text-slate-900">{selectedLot.area_m2.toFixed(2)} m²</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor do Lote</span>
                    <p className="text-lg font-black text-emerald-600">
                      {selectedLot.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}
                    </p>
                 </div>
              </div>

              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Maximize2 size={14} className="text-blue-600" /> Dimensões
                </h3>
                <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-400 font-bold">Frente:</span>
                     <span className="text-slate-900 font-black">{selectedLot.front_m?.toFixed(2) || '—'} m</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-400 font-bold">Fundo:</span>
                     <span className="text-slate-900 font-black">{selectedLot.back_m?.toFixed(2) || '—'} m</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-400 font-bold">Laterais:</span>
                     <span className="text-slate-900 font-black">{selectedLot.left_m?.toFixed(2) || '—'} m</span>
                   </div>
                </div>
              </section>

              <section className="space-y-4 pt-4 border-t border-slate-100">
                 <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                   <FileText size={18} /> Gerar Reserva / Simulação
                 </button>
                 <button className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                   <Phone size={18} /> Enviar p/ Cliente (WhatsApp)
                 </button>
              </section>

              {selectedLot.status === LotStatus.SOLD && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 mt-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="min-w-0">
                     <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Proprietário / Comprador</p>
                     <p className="text-xs font-bold text-red-900 truncate">João da Silva Pereira</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
               <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mb-6">
                 <Grid3X3 size={40} />
               </div>
               <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Selecione um Lote</h3>
               <p className="text-xs text-slate-400 mt-2 max-w-[200px]">Clique em um lote no mapa ao lado para ver detalhes e realizar ações.</p>
            </div>
          )}
        </aside>
      </div>

      {/* Modal de Geração em Massa */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 w-full max-w-lg shadow-2xl border border-white/20 overflow-hidden relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg">
                  <Wand2 size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
                    Gerar Lotes
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">Crie quadras e lotes em massa.</p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-3 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    <Layers size={12} className="inline mr-1" /> Quantidade de Quadras
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={26}
                    value={genForm.quadraCount}
                    onChange={(e) => setGenForm({ ...genForm, quadraCount: Math.min(26, Math.max(1, Number(e.target.value))) })}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    <Hash size={12} className="inline mr-1" /> Lotes por Quadra
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={genForm.lotsPerQuadra}
                    onChange={(e) => setGenForm({ ...genForm, lotsPerQuadra: Math.max(1, Number(e.target.value)) })}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  <Ruler size={12} className="inline mr-1" /> Dimensões Padrão (metros)
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block mb-1">Frente</span>
                    <input
                      type="number"
                      step="0.5"
                      value={genForm.front_m}
                      onChange={(e) => setGenForm({ ...genForm, front_m: Number(e.target.value) })}
                      className="w-full px-3 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block mb-1">Fundo</span>
                    <input
                      type="number"
                      step="0.5"
                      value={genForm.back_m}
                      onChange={(e) => setGenForm({ ...genForm, back_m: Number(e.target.value) })}
                      className="w-full px-3 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block mb-1">Esq.</span>
                    <input
                      type="number"
                      step="0.5"
                      value={genForm.left_m}
                      onChange={(e) => setGenForm({ ...genForm, left_m: Number(e.target.value) })}
                      className="w-full px-3 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block mb-1">Dir.</span>
                    <input
                      type="number"
                      step="0.5"
                      value={genForm.right_m}
                      onChange={(e) => setGenForm({ ...genForm, right_m: Number(e.target.value) })}
                      className="w-full px-3 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    <Maximize2 size={12} className="inline mr-1" /> Área (m²)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={genForm.area_m2}
                    onChange={(e) => setGenForm({ ...genForm, area_m2: Number(e.target.value) })}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    <DollarSign size={12} className="inline mr-1" /> Preço Padrão (R$)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={genForm.price}
                    onChange={(e) => setGenForm({ ...genForm, price: Number(e.target.value) })}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <p className="text-xs font-bold text-emerald-800">
                  Serão gerados <strong className="text-emerald-900">{genForm.quadraCount * genForm.lotsPerQuadra}</strong> lotes em <strong className="text-emerald-900">{genForm.quadraCount}</strong> quadra(s): {Array.from({ length: genForm.quadraCount }, (_, i) => `"Quadra ${quadraLabels[i]}"`).join(', ')}.
                </p>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateLots}
                disabled={generating}
                className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                {generating ? 'Gerando...' : `Gerar ${genForm.quadraCount * genForm.lotsPerQuadra} Lotes`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoteamentoDetails;
