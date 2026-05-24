import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Map as MapIcon, 
  Grid3X3, 
  Filter, 
  Download, 
  Plus, 
  Search,
  DollarSign,
  Maximize2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  FileText
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useEnvironment } from '../../context/EnvironmentContext';
import { Development, Lot, LotStatus } from '../../types';
import { toast } from 'sonner';

const LoteamentoDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activeEnvironmentId } = useEnvironment();
  const [development, setDevelopment] = useState<Development | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [filterStatus, setFilterStatus] = useState<LotStatus | 'Todos'>('Todos');

  useEffect(() => {
    if (id && profile?.organization_id && activeEnvironmentId) {
      loadData();
    }
  }, [id, profile?.organization_id, activeEnvironmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Development Info
      const { data: dev } = await supabase
        .from('developments')
        .select('*')
        .eq('id', id)
        .eq('organization_id', profile?.organization_id)
        .eq('environment_id', activeEnvironmentId)
        .single();
      
      setDevelopment(dev);

      // Mocking Lots for demonstration if none exist
      // In a real scenario, this would come from a 'lots' table
      const mockLots: Lot[] = Array.from({ length: 48 }).map((_, i) => ({
        id: `lot-${i}`,
        development_id: id!,
        block_id: i < 12 ? 'Quadra A' : i < 24 ? 'Quadra B' : i < 36 ? 'Quadra C' : 'Quadra D',
        number: String((i % 12) + 1).padStart(2, '0'),
        area_m2: 250 + (Math.random() * 100),
        price: 150000 + (Math.random() * 50000),
        status: i % 7 === 0 ? LotStatus.SOLD : i % 11 === 0 ? LotStatus.RESERVED : LotStatus.AVAILABLE,
      }));

      setLots(mockLots);
    } catch (err) {
      console.error('Error loading lot data:', err);
      toast.error('Erro ao carregar dados do loteamento');
    } finally {
      setLoading(false);
    }
  };

  const filteredLots = filterStatus === 'Todos' 
    ? lots 
    : lots.filter(l => l.status === filterStatus);

  const getStatusColor = (status: LotStatus) => {
    switch (status) {
      case LotStatus.AVAILABLE: return 'bg-emerald-500 text-white';
      case LotStatus.SOLD: return 'bg-red-500 text-white';
      case LotStatus.RESERVED: return 'bg-amber-500 text-white';
      case LotStatus.BLOCKED: return 'bg-slate-400 text-white';
      default: return 'bg-slate-200 text-slate-500';
    }
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
          <button className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10">
            <Download size={16} /> Exportar Mapa
          </button>
          <button className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
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

          {/* Grid de Lotes (Espelho Visual) */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-3 lg:gap-4">
               {filteredLots.map((lot) => (
                 <button
                   key={lot.id}
                   onClick={() => setSelectedLot(lot)}
                   className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all hover:scale-110 active:scale-95 shadow-sm border-2 ${selectedLot?.id === lot.id ? 'ring-4 ring-blue-600/30 border-blue-600 scale-105 z-10 shadow-xl' : 'border-transparent'} ${getStatusColor(lot.status)}`}
                 >
                   <span className="text-[10px] font-black opacity-60 leading-none uppercase">{lot.block_id.split(' ')[1]}</span>
                   <span className="text-xl font-black italic tracking-tighter leading-none">{lot.number}</span>
                 </button>
               ))}
            </div>
            
            <div className="mt-20 p-8 border-2 border-dashed border-slate-200 rounded-[3rem] text-center bg-slate-100/50">
               <MapIcon size={40} className="mx-auto text-slate-300 mb-4" />
               <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Upload de Mapa SVG em breve</p>
               <p className="text-xs text-slate-400 mt-1">Nesta área você poderá carregar o mapa real do loteamento.</p>
            </div>
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
                      <span className="text-slate-900 font-black">10,00 m</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-bold">Fundo:</span>
                      <span className="text-slate-900 font-black">10,00 m</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-bold">Laterais:</span>
                      <span className="text-slate-900 font-black">25,00 m</span>
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
    </div>
  );
};

export default LoteamentoDetails;
