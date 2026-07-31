import React, { useState } from 'react';
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
  Zap,
  Hammer,
  ChevronRight,
  Settings2,
} from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Empreendimentos() {
  const [selectedLot, setSelectedLot] = useState<string | null>('B-12');

  const performanceData = [
    { name: 'Dez', value: 5 },
    { name: 'Jan', value: 7 },
    { name: 'Fev', value: 10 },
    { name: 'Mar', value: 12 },
    { name: 'Abr', value: 15 },
    { name: 'Mai', value: 22 },
  ];

  const getLotColor = (status: string) => {
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

  const renderLot = (id: string, status: string, hoverable = true) => (
    <div
      key={id}
      onClick={() =>
        hoverable && setSelectedLot(id === selectedLot ? null : id)
      }
      className={`
        relative flex items-center justify-center font-bold text-[10px] sm:text-xs rounded border cursor-pointer transition-all
        ${getLotColor(status)}
        ${hoverable ? 'hover:brightness-95 hover:scale-[1.02] shadow-sm' : ''}
        ${selectedLot === id ? 'ring-2 ring-emerald-600 ring-offset-2 z-10 scale-105' : ''}
      `}
      style={{ aspectRatio: '1/1.2' }}
    >
      {id}
      {selectedLot === id && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-fade-in pointer-events-auto cursor-default">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-slate-200 rotate-45" />
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLot(null);
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
            <p className="font-bold text-slate-900 text-sm mb-0.5">Lote {id}</p>
            <p className="text-xs text-slate-500 mb-1">360 m²</p>
            <p className="text-sm font-bold text-slate-900 mb-2">R$ 248.000</p>
            <div className="flex items-center gap-1.5 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-700">
                Disponível
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

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-12 font-sans text-slate-800 animate-fade-in">
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
              <span className="text-sm font-bold text-slate-700">
                Parque das Araucárias • São José, SC
              </span>
              <ChevronDown size={16} className="text-slate-400 ml-2" />
            </div>

            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
              Em comercialização
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
            <div className="relative w-64 shrink-0">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Buscar lote ou cliente..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
              <button className="px-4 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-md shadow-sm">
                Todos
              </button>
              <button className="px-4 py-1.5 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-md flex items-center gap-2">
                <div className="w-3 h-3 bg-[#c6f6d5] border border-[#9ae6b4] rounded-sm" />{' '}
                Disponíveis
              </button>
              <button className="px-4 py-1.5 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-md flex items-center gap-2">
                <div className="w-3 h-3 bg-[#fef08a] border border-[#fde047] rounded-sm" />{' '}
                Reservados
              </button>
              <button className="px-4 py-1.5 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-md flex items-center gap-2">
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
            {/* Background Map Image Mock */}
            <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]" />

            {/* Map Contents */}
            <div className="relative w-full h-full p-8 overflow-auto flex items-center justify-center">
              {/* Loteamento Layout Grid (Fake) */}
              <div className="flex flex-col gap-8 w-max h-max rotate-[-5deg] scale-95 p-12 bg-white/40 rounded-[3rem] backdrop-blur-sm border border-white/60 shadow-xl">
                {/* Top blocks */}
                <div className="flex gap-8">
                  {/* Quadra A */}
                  <div className="bg-white/80 p-4 rounded-3xl border-2 border-slate-200 shadow-sm relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                      Quadra A
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 mb-1.5">
                      {['A-01', 'A-02', 'A-03', 'A-04', 'A-05'].map((id) =>
                        renderLot(id, id === 'A-03' ? 'reserved' : 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 mb-4">
                      {['A-06', 'A-07', 'A-08', 'A-09'].map((id) =>
                        renderLot(id, 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 mb-1.5">
                      {['A-10', 'A-11', 'A-12', 'A-13', 'A-14'].map((id) =>
                        renderLot(id, id === 'A-12' ? 'sold' : 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 mb-4">
                      {['A-15', 'A-16', 'A-17', 'A-18'].map((id) =>
                        renderLot(id, 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['A-19', 'A-20', 'A-21', 'A-22', 'A-23'].map((id) =>
                        renderLot(id, id === 'A-20' ? 'sold' : 'available')
                      )}
                      {['A-24', 'A-25', 'A-26', 'A-27'].map((id) =>
                        renderLot(id, id === 'A-25' ? 'sold' : 'available')
                      )}
                    </div>
                  </div>

                  {/* Quadra B */}
                  <div className="bg-white/80 p-4 rounded-3xl border-2 border-slate-200 shadow-sm relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                      Quadra B
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                      {['B-01', 'B-02', 'B-03', 'B-04'].map((id) =>
                        renderLot(id, 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mb-4">
                      {['B-05', 'B-06', 'B-07', 'B-08'].map((id) =>
                        renderLot(id, id === 'B-06' ? 'reserved' : 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                      {['B-09', 'B-10', 'B-11', 'B-12'].map((id) =>
                        renderLot(
                          id,
                          id === 'B-10'
                            ? 'reserved'
                            : id === 'B-12'
                              ? 'available'
                              : 'available'
                        )
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mb-4">
                      {['B-13', 'B-14', 'B-15', 'B-16'].map((id) =>
                        renderLot(id, 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['B-17', 'B-18', 'B-19', 'B-20'].map((id) =>
                        renderLot(id, id === 'B-20' ? 'sold' : 'available')
                      )}
                      {['B-21', 'B-22', 'B-23', 'B-24'].map((id) =>
                        renderLot(id, 'available')
                      )}
                    </div>
                  </div>

                  {/* Quadra D (Right small block) */}
                  <div className="bg-white/80 p-4 rounded-3xl border-2 border-slate-200 shadow-sm relative self-end mb-8">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                      Quadra D
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-4">
                      {['D-01', 'D-02', 'D-03'].map((id) =>
                        renderLot(id, 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-4">
                      {['D-09', 'D-10', 'D-11'].map((id) =>
                        renderLot(id, id === 'D-10' ? 'reserved' : 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['D-17', 'D-18', 'D-19'].map((id) =>
                        renderLot(id, id === 'D-18' ? 'sold' : 'available')
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom blocks */}
                <div className="flex gap-8 pl-12">
                  {/* Quadra C */}
                  <div className="bg-white/80 p-4 rounded-3xl border-2 border-slate-200 shadow-sm relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                      Quadra C
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mb-4">
                      {['C-01', 'C-02', 'C-03', 'C-04'].map((id) =>
                        renderLot(id, 'available')
                      )}
                      {['C-05', 'C-06', 'C-07', 'C-08'].map((id) =>
                        renderLot(id, id === 'C-07' ? 'reserved' : 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mb-4">
                      {['C-09', 'C-10', 'C-11', 'C-12'].map((id) =>
                        renderLot(id, id === 'C-12' ? 'sold' : 'available')
                      )}
                      {['C-13', 'C-14', 'C-15', 'C-16'].map((id) =>
                        renderLot(id, 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['C-17', 'C-18', 'C-19', 'C-20'].map((id) =>
                        renderLot(id, 'available')
                      )}
                      {['C-21', 'C-22', 'C-23', 'C-24'].map((id) =>
                        renderLot(id, id === 'C-22' ? 'sold' : 'available')
                      )}
                    </div>
                  </div>

                  {/* Quadra E (Wide bottom block) */}
                  <div className="bg-white/80 p-4 rounded-3xl border-2 border-slate-200 shadow-sm relative w-full">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                      Quadra E
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 mb-4">
                      {[
                        'E-01',
                        'E-02',
                        'E-03',
                        'E-04',
                        'E-05',
                        'E-06',
                        'E-07',
                      ].map((id) =>
                        renderLot(
                          id,
                          id === 'E-04'
                            ? 'reserved'
                            : id === 'E-07'
                              ? 'sold'
                              : 'available'
                        )
                      )}
                      {['E-08', 'E-09', 'E-10', 'E-11', 'E-12', 'E-13'].map(
                        (id) => renderLot(id, 'available')
                      )}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {[
                        'E-14',
                        'E-15',
                        'E-16',
                        'E-17',
                        'E-18',
                        'E-19',
                        'E-20',
                      ].map((id) =>
                        renderLot(id, id === 'E-18' ? 'reserved' : 'available')
                      )}
                      {['E-21', 'E-22', 'E-23', 'E-24', 'E-25', 'E-26'].map(
                        (id) =>
                          renderLot(
                            id,
                            id === 'E-22' || id === 'E-24'
                              ? 'sold'
                              : 'available'
                          )
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
                  <span className="text-sm font-bold text-slate-900">48</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-[#fef08a] border border-[#fde047] rounded-sm" />
                    <span className="text-sm font-medium text-slate-600">
                      Reservado
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-[#34d399] border border-[#10b981] rounded-sm" />
                    <span className="text-sm font-medium text-slate-600">
                      Vendido
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">76</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-slate-200 border border-slate-300 rounded-sm" />
                    <span className="text-sm font-medium text-slate-600">
                      Bloqueado
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">4</span>
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
                    140
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
                    48
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
                    54%
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
                    R$ 11,9 mi
                  </p>
                  <p className="text-xs text-slate-500">VGV em estoque</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-700">
                  76{' '}
                  <span className="font-normal text-slate-500">
                    de 140 vendidos
                  </span>
                </span>
                <span className="text-slate-700">54%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: '54%' }}
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
                12 vendas este mês
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

            <div className="space-y-4">
              <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    MC
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Mariana Costa
                    </p>
                    <p className="text-xs text-slate-500">Lote B-12</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{' '}
                    Proposta enviada
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-slate-300 group-hover:text-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                    RL
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Rafael Lima
                    </p>
                    <p className="text-xs text-slate-500">Lote C-07</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />{' '}
                    Visita agendada
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-slate-300 group-hover:text-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                    AM
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Ana Martins
                    </p>
                    <p className="text-xs text-slate-500">Lote A-03</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{' '}
                    Novo interesse
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-slate-300 group-hover:text-emerald-600 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Infraestrutura */}
          <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-6">
              Infraestrutura
            </h3>

            <div className="space-y-5 mb-6">
              <div>
                <div className="flex items-center justify-between text-sm font-bold mb-2 text-slate-700">
                  <span className="flex items-center gap-2">
                    <Trees size={16} className="text-slate-500" /> Terraplanagem
                  </span>
                  <span>100%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm font-bold mb-2 text-slate-700">
                  <span className="flex items-center gap-2">
                    <Zap size={16} className="text-slate-500" /> Rede elétrica
                  </span>
                  <span>82%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: '82%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm font-bold mb-2 text-slate-700">
                  <span className="flex items-center gap-2">
                    <Hammer size={16} className="text-slate-500" /> Pavimentação
                  </span>
                  <span>65%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: '65%' }}
                  />
                </div>
              </div>
            </div>

            <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-between w-full">
              Ver cronograma <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
