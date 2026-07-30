import React, { useState } from 'react';
import {
  Search,
  ChevronDown,
  LayoutGrid,
  List,
  Calendar,
  Phone,
  MessageSquare,
  AlertTriangle,
  Clock,
  CalendarX,
  Sparkles,
  Users,
  Briefcase,
  Flame,
  Star,
  MoreVertical,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CRMLeads() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'Kanban' | 'Lista' | 'Agenda'>('Kanban');

  // MOCK DATA for Kanban columns
  const columns = [
    {
      id: 'novo_contato',
      title: '1. Novo contato',
      count: 8,
      cards: [
        {
          id: 'l1',
          avatar: 'PT',
          name: 'Paulo Teste',
          source: 'CRM',
          temperature: 'Quente',
          property: 'Apto 3 dorm • Centro\naté R$ 850 mil',
          actionIcon: <Phone size={14} className="text-emerald-600" />,
          actionText: 'Ligar hoje 15:30',
          actionColor: 'text-emerald-600',
          slaText: 'SLA 2h',
          slaColor: 'text-red-500',
          whatsapp: true,
          starred: true,
        },
        {
          id: 'l2',
          avatar: 'ML',
          name: 'Marina Lopes',
          source: 'WhatsApp',
          temperature: 'Morno',
          property: 'Casa condomínio • São José\nR$ 1,2 mi',
          actionIcon: <Calendar size={14} className="text-emerald-600" />,
          actionText: 'Enviar opções',
          actionColor: 'text-emerald-600',
          slaText: 'SLA 6h',
          slaColor: 'text-amber-500',
          whatsapp: true,
          starred: false,
        }
      ]
    },
    {
      id: 'qualificacao',
      title: '2. Qualificação',
      count: 6,
      cards: [
        {
          id: 'l3',
          avatar: 'AS',
          name: 'André Santos',
          source: 'Portal',
          temperature: 'Quente',
          property: 'Quer visitar IMB-0248',
          actionIcon: <Calendar size={14} className="text-emerald-600" />,
          actionText: 'Confirmar visita amanhã',
          actionColor: 'text-emerald-600',
          slaText: 'SLA 3h',
          slaColor: 'text-red-500',
          whatsapp: true,
          starred: true,
        },
        {
          id: 'l4',
          avatar: 'GL',
          name: 'Gustavo Lima',
          source: 'Indicação',
          temperature: 'Morno',
          property: 'Apto 3 dorm • Centro\naté R$ 1,1 mi',
          actionIcon: <Calendar size={14} className="text-emerald-600" />,
          actionText: 'Apresentar imóveis',
          actionColor: 'text-emerald-600',
          slaText: 'SLA 6h',
          slaColor: 'text-amber-500',
          whatsapp: false,
          starred: false,
        }
      ]
    },
    {
      id: 'visita',
      title: '3. Visita agendada',
      count: 4,
      cards: [
        {
          id: 'l5',
          avatar: 'CV',
          name: 'Camila Vieira',
          source: 'WhatsApp',
          temperature: 'Quente',
          property: 'Visita 18/05 • 10:00\nApto 3 dorm • Agronômica\naté R$ 1,0 mi',
          actionIcon: <Calendar size={14} className="text-emerald-600" />,
          actionText: 'Confirmar presença',
          actionColor: 'text-emerald-600',
          slaText: 'SLA 1h',
          slaColor: 'text-red-500',
          whatsapp: true,
          starred: true,
        },
        {
          id: 'l6',
          avatar: 'BF',
          name: 'Bruno Farias',
          source: 'Portal',
          temperature: 'Morno',
          property: 'Visita 18/05 • 14:00\nCasa condomínio • Jurerê\nR$ 1,5 mi',
          actionIcon: <MessageSquare size={14} className="text-emerald-600" />,
          actionText: 'Enviar detalhes',
          actionColor: 'text-emerald-600',
          slaText: 'SLA 2h',
          slaColor: 'text-amber-500',
          whatsapp: true,
          starred: false,
        }
      ]
    },
    {
      id: 'proposta',
      title: '4. Proposta',
      count: 2,
      cards: [
        {
          id: 'l7',
          avatar: 'LG',
          name: 'Larissa Gomes',
          source: 'CRM',
          temperature: 'Quente',
          property: 'Simulação enviada\nApto 2 dorm • Centro\nR$ 960 mil',
          actionIcon: <Calendar size={14} className="text-emerald-600" />,
          actionText: 'Aguardar retorno',
          actionColor: 'text-emerald-600',
          slaText: 'SLA 1h',
          slaColor: 'text-red-500',
          whatsapp: true,
          starred: true,
        },
        {
          id: 'l8',
          avatar: 'FA',
          name: 'Felipe Andrade',
          source: 'CRM',
          temperature: 'Quente',
          property: 'Documentos enviados\nApto 3 dorm • Centro\nR$ 950 mil',
          actionIcon: <Calendar size={14} className="text-emerald-600" />,
          actionText: 'Acompanhar docs',
          actionColor: 'text-emerald-600',
          slaText: 'SLA 1h',
          slaColor: 'text-red-500',
          whatsapp: true,
          starred: true,
        }
      ]
    }
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-12 font-sans text-slate-800 animate-fade-in flex flex-col h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span className="font-medium text-slate-400">CRM</span>
            <span className="text-slate-300">/</span>
            <span className="text-emerald-600 font-semibold">Funil comercial</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pipeline comercial</h1>
          <p className="text-sm text-slate-500 mt-1">Priorize leads, acompanhe SLA e avance oportunidades com inteligência.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar no sistema..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm" />
          </div>
        </div>
      </div>

      {/* Radar Comercial Bar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-6 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-6 min-w-max">
          <div className="flex items-center gap-2 pr-6 border-r border-slate-200">
            <Target size={18} className="text-slate-700" />
            <span className="font-bold text-slate-900 text-sm">Radar comercial</span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-red-700">
            <AlertTriangle size={14} />
            <span className="text-xs font-bold"><span className="text-sm">4</span> SLA vencido</span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-700">
            <Clock size={14} />
            <span className="text-xs font-bold"><span className="text-sm">6</span> sem próximo passo</span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-700">
            <CalendarX size={14} />
            <span className="text-xs font-bold"><span className="text-sm">3</span> visitas sem confirmação</span>
          </div>
          
          <div className="flex items-center gap-2 ml-auto text-emerald-600 px-4">
            <Sparkles size={16} />
            <span className="text-sm font-bold">IA: priorize Paulo e André até 17h</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 leading-none mb-1">32</p>
                <p className="text-xs text-slate-500 font-medium">Leads ativos</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">↗ 14%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">vs. semana<br/>passada</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Briefcase size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 leading-none mb-1">R$ 4,8 mi</p>
                <p className="text-xs text-slate-500 font-medium">VGV potencial</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">↗ 9%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">vs. semana<br/>passada</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <Flame size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 leading-none mb-1">9</p>
                <p className="text-xs text-slate-500 font-medium">Leads quentes</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">↗ 12%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">vs. semana<br/>passada</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 leading-none mb-1">4</p>
                <p className="text-xs text-slate-500 font-medium">SLA vencido</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">↗ 33%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">vs. semana<br/>passada</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar lead, telefone, imóvel ou origem..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm" />
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 mb-0.5 ml-1">Corretor</label>
            <div className="relative">
              <select className="w-32 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none hover:bg-slate-50 cursor-pointer appearance-none pr-8">
                <option>Todos</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 mb-0.5 ml-1">Origem</label>
            <div className="relative">
              <select className="w-32 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none hover:bg-slate-50 cursor-pointer appearance-none pr-8">
                <option>Todas</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 mb-0.5 ml-1">Temperatura</label>
            <div className="relative">
              <select className="w-32 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none hover:bg-slate-50 cursor-pointer appearance-none pr-8">
                <option>Todas</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 mb-0.5 ml-1">SLA</label>
            <div className="relative">
              <select className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none hover:bg-slate-50 cursor-pointer appearance-none pr-8">
                <option>Todos</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-auto">
          <button onClick={() => setViewMode('Kanban')} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors border ${viewMode === 'Kanban' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            <LayoutGrid size={16} /> Kanban
          </button>
          <button onClick={() => setViewMode('Lista')} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors border ${viewMode === 'Lista' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            <List size={16} /> Lista
          </button>
          <button onClick={() => setViewMode('Agenda')} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors border ${viewMode === 'Agenda' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            <Calendar size={16} /> Agenda
          </button>
        </div>
      </div>

      {/* Kanban Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex h-full gap-4 min-w-max px-1">
          
          {columns.map(col => (
            <div key={col.id} className="w-[320px] flex flex-col h-full">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-bold text-slate-900">{col.title}</h3>
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">{col.count}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {col.cards.map(card => (
                  <div key={card.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow hover:border-slate-300 cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${card.avatar === 'PT' || card.avatar === 'FA' ? 'bg-slate-400' : card.avatar === 'AS' ? 'bg-slate-800' : card.avatar === 'LG' ? 'bg-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                          {card.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-tight">{card.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${card.source === 'WhatsApp' ? 'bg-emerald-500' : card.source === 'Portal' ? 'bg-blue-500' : 'bg-indigo-500'}`} />
                            <p className="text-[10px] text-slate-500">{card.source}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Star size={14} className={card.starred ? "text-amber-400 fill-amber-400" : "text-slate-300"} />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${card.temperature === 'Quente' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'}`}>
                          {card.temperature}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2 mb-4">
                      <div className="mt-0.5"><Briefcase size={12} className="text-slate-400" /></div>
                      <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{card.property}</p>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className={`flex items-center gap-1.5 text-xs font-bold ${card.actionColor}`}>
                        {card.actionIcon} {card.actionText}
                      </div>
                      {card.whatsapp && <MessageSquare size={14} className="text-emerald-500" />}
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className={`text-[10px] font-bold ${card.slaColor}`}>{card.slaText}</span>
                    </div>
                  </div>
                ))}

                <button className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100">
                  <Plus size={14} /> {col.count} leads
                </button>
              </div>
            </div>
          ))}

          {/* New Column Add Placeholder */}
          <div className="w-[320px] flex flex-col h-full bg-slate-50/50 border border-dashed border-slate-200 rounded-xl items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 cursor-pointer transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center mb-2 shadow-sm group-hover:border-emerald-200 group-hover:text-emerald-600 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            </div>
            <p className="text-sm font-bold">5. Documentação</p>
            <p className="text-xs mt-1">Arraste para avançar ➔</p>
          </div>

        </div>
      </div>

    </div>
  );
}

// Temporary icon definition since Target wasn't fully imported if missing
const Target = ({size, className}: {size:number, className:string}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
)
