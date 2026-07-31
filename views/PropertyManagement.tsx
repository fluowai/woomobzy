import React, { useState } from 'react';
import {
  Plus,
  UploadCloud,
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus,
  List,
  Grid,
  Map,
  Clock,
  Tag,
  Camera,
  UserX,
  Building2,
  FileText,
  ChevronDown,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function PropertyManagement() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('Lista');

  const CircularProgress = ({ value, size = 40, strokeWidth = 3, color = '#10b981' }: { value: number, size?: number, strokeWidth?: number, color?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
        </svg>
        <span className="absolute text-xs font-bold text-slate-700">{value}%</span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-12 font-sans text-slate-800 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span className="font-medium text-slate-400">Imóveis</span>
            <span className="text-slate-300">/</span>
            <span className="text-emerald-600 font-semibold">Portfólio</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Central de portfólio</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie qualidade, publicação e desempenho comercial dos seus imóveis.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => toast.info('Função de importação em breve')} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2">
            <UploadCloud size={18} /> Importar imóveis
          </button>
          <button onClick={() => navigate('/imoveis/novo')} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2">
            <Plus size={18} /> Novo imóvel
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="flex flex-wrap lg:flex-nowrap gap-4 mb-6">
        <div className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">248</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ativos</p>
            </div>
          </div>
          <p className="text-xs font-medium text-emerald-600 flex items-center gap-1"><ArrowUp size={14} /> 6% <span className="text-slate-400 font-normal">vs. mês anterior</span></p>
        </div>

        <div className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
              <span className="font-bold text-xl line-through decoration-amber-500/50">O</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">36</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Não publicados</p>
            </div>
          </div>
          <p className="text-xs font-medium text-red-500 flex items-center gap-1"><ArrowDown size={14} /> 8% <span className="text-slate-400 font-normal">vs. mês anterior</span></p>
        </div>

        <div className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
              <FileText size={20} className="lucide lucide-file-text" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">18</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cadastros incompletos</p>
            </div>
          </div>
          <p className="text-xs font-medium text-red-500 flex items-center gap-1"><ArrowDown size={14} /> 5% <span className="text-slate-400 font-normal">vs. mês anterior</span></p>
        </div>

        <div className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
              <UserX size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">42</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Sem leads<br/>há 30 dias</p>
            </div>
          </div>
          <p className="text-xs font-medium text-emerald-600 flex items-center gap-1"><ArrowUp size={14} /> 12% <span className="text-slate-400 font-normal">vs. mês anterior</span></p>
        </div>

        <div className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">12</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Aguardando<br/>autorização</p>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1"><Minus size={14} /> 0% <span className="font-normal">vs. mês anterior</span></p>
        </div>

        <div className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
              <Tag size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">8</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Preço<br/>desatualizado</p>
            </div>
          </div>
          <p className="text-xs font-medium text-red-500 flex items-center gap-1"><ArrowDown size={14} /> 14% <span className="text-slate-400 font-normal">vs. mês anterior</span></p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Column (Main Table Area) */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          
          <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white z-10">
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200 w-fit">
              <button onClick={() => setViewMode('Lista')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${viewMode === 'Lista' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                <List size={16} /> Lista
              </button>
              <button onClick={() => setViewMode('Cards')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${viewMode === 'Cards' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                <Grid size={16} /> Cards
              </button>
              <button onClick={() => setViewMode('Mapa')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${viewMode === 'Mapa' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                <Map size={16} /> Mapa
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <button onClick={() => toast.info('Filtros limpos')} className="text-slate-400 hover:text-slate-600 font-medium flex items-center gap-2"><Filter size={16} /> Limpar filtros</button>
              <button onClick={() => toast.info('Filtro salvo com sucesso')} className="text-emerald-600 font-bold hover:text-emerald-700">Salvar filtro</button>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/50">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar por código, endereço, proprietário..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
            </div>
            
            <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 outline-none hover:bg-slate-50 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207l5%205%205-5%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] pr-8">
              <option value="">Finalidade</option>
            </select>
            
            <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 outline-none hover:bg-slate-50 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207l5%205%205-5%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] pr-8">
              <option value="">Status comercial</option>
            </select>
            
            <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 outline-none hover:bg-slate-50 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207l5%205%205-5%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] pr-8">
              <option value="">Portais</option>
            </select>
            
            <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 outline-none hover:bg-slate-50 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207l5%205%205-5%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] pr-8">
              <option value="">Qualidade</option>
            </select>

            <div className="flex-1 flex justify-end">
              <button onClick={() => toast.info('Filtro de prioridade removido')} className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-lg flex items-center gap-2 border border-emerald-100">
                <Filter size={16} /> Prioridade comercial <X size={14} className="ml-1 cursor-pointer" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-4 pl-6 pr-4 w-10"><input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Imóvel</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Finalidade</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Preço</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Qualidade</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Publicação</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Portais</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Performance</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Responsável</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Atualização</th>
                  <th className="py-4 pr-6 pl-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                
                <tr className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 pl-6 pr-4"><input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></td>
                  <td className="py-4 px-4 min-w-[280px]">
                    <div className="flex gap-4">
                      <div className="w-20 h-16 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Imóvel" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">IMB-0248</p>
                        <p className="text-sm font-bold text-slate-900 leading-tight">Apartamento com 3 suítes</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Map size={12} /> Centro, Florianópolis - SC</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4"><span className="text-sm font-medium text-slate-700">Venda</span></td>
                  <td className="py-4 px-4"><span className="text-sm font-bold text-slate-900">R$ 1.250.000</span></td>
                  <td className="py-4 px-4 text-center">
                    <CircularProgress value={96} color="#10b981" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-sm font-bold text-slate-900">Publicado</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-1.5">
                      <span className="px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold text-slate-500 bg-white">ZAP</span>
                      <span className="px-2 py-0.5 rounded border border-blue-200 text-[10px] font-bold text-blue-600 bg-blue-50">Viva Real</span>
                      <span className="px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold text-slate-500 bg-white">Site</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <p className="text-sm font-bold text-slate-900">18</p>
                    <p className="text-[10px] font-medium text-slate-500 uppercase">leads</p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <img src="https://i.pravatar.cc/150?u=a042581f4e29026704z" alt="Avatar" className="w-6 h-6 rounded-full" />
                      <span className="text-sm font-medium text-slate-700">Juliana Gomes</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium text-slate-700">24/05/2026</p>
                    <p className="text-xs text-slate-500">10:30</p>
                  </td>
                  <td className="py-4 pr-6 pl-4 text-center">
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors border border-slate-200 bg-white">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 pl-6 pr-4"><input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></td>
                  <td className="py-4 px-4 min-w-[280px]">
                    <div className="flex gap-4">
                      <div className="w-20 h-16 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Imóvel" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">IMB-0192</p>
                        <p className="text-sm font-bold text-slate-900 leading-tight">Casa no Jardim Europa</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Map size={12} /> São José - SC</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4"><span className="text-sm font-medium text-slate-700">Venda</span></td>
                  <td className="py-4 px-4"><span className="text-sm font-bold text-slate-900">R$ 890.000</span></td>
                  <td className="py-4 px-4 text-center">
                    <CircularProgress value={72} color="#f59e0b" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="text-sm font-bold text-slate-900">Pendente revisão</span>
                    </div>
                    <p className="text-[10px] text-amber-600 mt-1">Missing: matrícula e<br/>fotos profissionais</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-slate-300 font-bold">—</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <p className="text-sm font-bold text-slate-900">5</p>
                    <p className="text-[10px] font-medium text-slate-500 uppercase">leads</p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <img src="https://i.pravatar.cc/150?u=a042581f4e29026704x" alt="Avatar" className="w-6 h-6 rounded-full" />
                      <span className="text-sm font-medium text-slate-700">Rafael Lima</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium text-slate-700">23/05/2026</p>
                    <p className="text-xs text-slate-500">16:45</p>
                  </td>
                  <td className="py-4 pr-6 pl-4 text-center">
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors border border-slate-200 bg-white">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 pl-6 pr-4"><input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></td>
                  <td className="py-4 px-4 min-w-[280px]">
                    <div className="flex gap-4">
                      <div className="w-20 h-16 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Imóvel" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">IMB-0174</p>
                        <p className="text-sm font-bold text-slate-900 leading-tight">Sala comercial Manhattan</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Map size={12} /> Kobrasol, São José - SC</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4"><span className="text-sm font-medium text-slate-700">Locação</span></td>
                  <td className="py-4 px-4"><span className="text-sm font-bold text-slate-900">R$ 4.200/mês</span></td>
                  <td className="py-4 px-4 text-center">
                    <CircularProgress value={88} color="#10b981" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-sm font-bold text-slate-900">Publicado</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-1.5">
                      <span className="px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold text-slate-500 bg-white">Site</span>
                      <span className="px-2 py-0.5 rounded border border-purple-200 text-[10px] font-bold text-purple-600 bg-purple-50">OLX</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <p className="text-sm font-bold text-slate-900">12</p>
                    <p className="text-[10px] font-medium text-slate-500 uppercase">leads</p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <img src="https://i.pravatar.cc/150?u=a042581f4e29026704y" alt="Avatar" className="w-6 h-6 rounded-full" />
                      <span className="text-sm font-medium text-slate-700">Ana Torres</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium text-slate-700">24/05/2026</p>
                    <p className="text-xs text-slate-500">09:15</p>
                  </td>
                  <td className="py-4 pr-6 pl-4 text-center">
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors border border-slate-200 bg-white">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 pl-6 pr-4"><input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></td>
                  <td className="py-4 px-4 min-w-[280px]">
                    <div className="flex gap-4">
                      <div className="w-20 h-16 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Imóvel" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">IMB-0118</p>
                        <p className="text-sm font-bold text-slate-900 leading-tight">Residencial Aurora</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Map size={12} /> Agronômica, Florianópolis - SC</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4"><span className="text-sm font-medium text-slate-700">Locação</span></td>
                  <td className="py-4 px-4"><span className="text-sm font-bold text-slate-900">R$ 2.850/mês</span></td>
                  <td className="py-4 px-4 text-center">
                    <CircularProgress value={64} color="#f59e0b" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-sm font-bold text-slate-900">Não publicado</span>
                    </div>
                    <p className="text-[10px] text-red-600 mt-1">Aguardando<br/>autorização</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-slate-300 font-bold">—</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <p className="text-sm font-bold text-slate-900">0</p>
                    <p className="text-[10px] font-medium text-slate-500 uppercase">leads</p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <img src="https://i.pravatar.cc/150?u=a042581f4e29026704w" alt="Avatar" className="w-6 h-6 rounded-full" />
                      <span className="text-sm font-medium text-slate-700">Bruno Costa</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium text-slate-700">22/05/2026</p>
                    <p className="text-xs text-slate-500">11:20</p>
                  </td>
                  <td className="py-4 pr-6 pl-4 text-center">
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors border border-slate-200 bg-white">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="mt-auto border-t border-slate-100 p-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">Mostrando 1 a 4 de 248 imóveis</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">10 por página</span>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toast.info('Primeira página')} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">{'|<'}</button>
                <button onClick={() => toast.info('Página anterior')} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">{'<'}</button>
                <button onClick={() => toast.info('Página 1')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">1</button>
                <button onClick={() => toast.info('Página 2')} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">2</button>
                <button onClick={() => toast.info('Página 3')} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">3</button>
                <span className="text-slate-400 px-1">...</span>
                <button onClick={() => toast.info('Página 25')} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">25</button>
                <button onClick={() => toast.info('Próxima página')} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">{'>'}</button>
                <button onClick={() => toast.info('Última página')} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">{'>|'}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-72 shrink-0 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center">
            <h3 className="text-sm font-bold text-slate-900 mb-6 text-left">Saúde do portfólio</h3>
            
            <div className="flex justify-center mb-6">
              <CircularProgress value={82} size={140} strokeWidth={8} color="#10b981" />
            </div>

            <p className="text-sm font-bold text-slate-900 mb-1">Índice de saúde</p>
            <p className="text-xs font-medium text-emerald-600 flex items-center justify-center gap-1 mb-4"><ArrowUp size={14} /> 7 p.p. <span className="text-slate-400 font-normal">vs. mês anterior</span></p>

            <p className="text-xs text-slate-500 text-left">
              Seu portfólio está <span className="font-bold text-emerald-600">saudável</span>.<br/>Mantenha a qualidade dos cadastros para melhorar os resultados.
            </p>
          </div>

          <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-6">Pendências prioritárias</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Clock size={14} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">12</p>
                  <p className="text-xs text-slate-500">aguardando autorização</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 ml-auto" />
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Tag size={14} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">8</p>
                  <p className="text-xs text-slate-500">preços desatualizados</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 ml-auto" />
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Camera size={14} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">6</p>
                  <p className="text-xs text-slate-500">sem fotos profissionais</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 ml-auto" />
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <UserX size={14} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">4</p>
                  <p className="text-xs text-slate-500">sem proprietário vinculado</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 ml-auto" />
              </div>
            </div>

            <button onClick={() => toast.info('Redirecionando para pendências...')} className="w-full py-2.5 bg-white border border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-bold text-sm rounded-lg transition-colors">
              Ver pendências
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
