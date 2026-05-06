import React, { useState } from 'react';
import {
  Search,
  Heart,
  MapPin,
  Building2,
  Eye,
  Calendar,
  DollarSign,
  ArrowRight,
  Filter,
  Home,
  Key,
  Bed,
  Bath,
  Car,
  Maximize,
} from 'lucide-react';

const PortalCompradorUrbano: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'buscar' | 'favoritos' | 'visitas' | 'contratos' | 'financeiro' | 'obra'
  >('contratos');
  const [tipo, setTipo] = useState('');

  const properties = [
    {
      id: 1,
      name: 'Apt 3Q - Ed. Primavera',
      type: 'Apartamento',
      city: 'São Paulo/SP',
      bairro: 'Vila Mariana',
      bedrooms: 3,
      baths: 2,
      parking: 2,
      area: '98m²',
      price: 'R$ 890.000',
      priceM2: 'R$ 9.082/m²',
      saved: true,
    },
    {
      id: 2,
      name: 'Cobertura Duplex',
      type: 'Cobertura',
      city: 'São Paulo/SP',
      bairro: 'Moema',
      bedrooms: 4,
      baths: 3,
      parking: 3,
      area: '250m²',
      price: 'R$ 3.200.000',
      priceM2: 'R$ 12.800/m²',
      saved: false,
    },
    {
      id: 3,
      name: 'Casa - Condomínio Verde',
      type: 'Casa',
      city: 'Campinas/SP',
      bairro: 'Barão Geraldo',
      bedrooms: 4,
      baths: 3,
      parking: 4,
      area: '320m²',
      price: 'R$ 1.850.000',
      priceM2: 'R$ 5.781/m²',
      saved: true,
    },
    {
      id: 4,
      name: 'Studio Premium',
      type: 'Studio',
      city: 'São Paulo/SP',
      bairro: 'Pinheiros',
      bedrooms: 1,
      baths: 1,
      parking: 1,
      area: '35m²',
      price: 'R$ 420.000',
      priceM2: 'R$ 12.000/m²',
      saved: false,
    },
    {
      id: 5,
      name: 'Sala Comercial',
      type: 'Comercial',
      city: 'São Paulo/SP',
      bairro: 'Faria Lima',
      bedrooms: 0,
      baths: 1,
      parking: 2,
      area: '85m²',
      price: 'R$ 1.100.000',
      priceM2: 'R$ 12.941/m²',
      saved: false,
    },
    {
      id: 6,
      name: 'Apt 2Q - Lançamento',
      type: 'Lançamento',
      city: 'Guarulhos/SP',
      bairro: 'Centro',
      bedrooms: 2,
      baths: 1,
      parking: 1,
      area: '56m²',
      price: 'R$ 380.000',
      priceM2: 'R$ 6.786/m²',
      saved: false,
    },
  ];

    },
  ];

  const myContracts = [
    {
      id: 'cont_1',
      property: 'Residencial Aurora - Quadra A, Lote 12',
      type: 'Loteamento',
      status: 'Ativo',
      progress: 75,
      installments: { total: 120, paid: 14, pending: 1, next_due: '10/06/2026' }
    }
  ];

  const myPayments = [
    { id: 'p_14', description: 'Parcela 014/120', amount: 1250.00, due: '10/05/2026', status: 'pago' },
    { id: 'p_15', description: 'Parcela 015/120', amount: 1250.00, due: '10/06/2026', status: 'aberto', invoice_url: '#' },
    { id: 'p_16', description: 'Parcela 016/120', amount: 1250.00, due: '10/07/2026', status: 'aberto' },
  ];

  const filtered = properties.filter((p) => !tipo || p.type === tipo);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
          <Building2 className="text-blue-600" size={32} />
          Portal do Comprador
        </h1>
        <p className="text-black/60 font-medium">
          Encontre o imóvel ideal. Venda, locação e lançamentos.
        </p>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'contratos', label: 'Meus Contratos' },
          { key: 'financeiro', label: 'Financeiro' },
          { key: 'obra', label: 'Evolução da Obra' },
          { key: 'buscar', label: 'Buscar Imóveis' },
          { key: 'favoritos', label: 'Favoritos' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.key ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'contratos' && (
        <div className="grid grid-cols-1 gap-6">
           {myContracts.map(c => (
             <div key={c.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                   <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                         <Home size={32} />
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-black italic tracking-tighter uppercase">{c.property}</h3>
                         <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{c.type} • Contrato {c.id}</p>
                      </div>
                   </div>
                   <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {c.status}
                   </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Parcelas</p>
                      <p className="text-2xl font-black text-black italic">{c.installments.total}</p>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pagas</p>
                      <p className="text-2xl font-black text-emerald-600 italic">{c.installments.paid}</p>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendentes</p>
                      <p className="text-2xl font-black text-amber-600 italic">{c.installments.pending}</p>
                   </div>
                   <div className="p-6 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                      <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Próximo Vencimento</p>
                      <p className="text-2xl font-black text-white italic">{c.installments.next_due}</p>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'financeiro' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
           <div className="p-8 border-b border-slate-50 bg-slate-50/50">
              <h3 className="text-sm font-black text-black uppercase tracking-widest flex items-center gap-2">
                 <DollarSign size={18} className="text-blue-600" /> Extrato Financeiro
              </h3>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full">
                 <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                       <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase">Descrição</th>
                       <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase">Vencimento</th>
                       <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase">Valor</th>
                       <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase">Status</th>
                       <th className="text-right px-8 py-4 text-[10px] font-black text-slate-400 uppercase">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {myPayments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                         <td className="px-8 py-5 font-bold text-sm">{p.description}</td>
                         <td className="px-8 py-5 text-sm text-slate-500">{p.due}</td>
                         <td className="px-8 py-5 font-black text-blue-600">{p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                         <td className="px-8 py-5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                               {p.status}
                            </span>
                         </td>
                         <td className="px-8 py-5 text-right">
                            {p.status === 'aberto' && (
                               <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                                  Boleto / PIX
                               </button>
                            )}
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'obra' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl">
              <h3 className="text-xl font-black text-black italic tracking-tighter uppercase mb-6">Status da Infraestrutura</h3>
              <div className="space-y-6">
                 {[
                   { label: 'Terraplanagem', progress: 100 },
                   { label: 'Drenagem', progress: 85 },
                   { label: 'Pavimentação', progress: 40 },
                   { label: 'Iluminação', progress: 10 },
                 ].map(item => (
                   <div key={item.label} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                         <span>{item.label}</span>
                         <span className="text-blue-600">{item.progress}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${item.progress}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
           
           <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col justify-center items-center text-center">
              <div className="w-32 h-32 rounded-full border-8 border-blue-600 flex items-center justify-center mb-6">
                 <span className="text-3xl font-black italic">65%</span>
              </div>
              <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Obra em Ritmo Acelerado!</h3>
              <p className="text-white/40 text-sm font-medium">Previsão de entrega: <strong>Dezembro de 2026</strong></p>
           </div>
        </div>
      )}

      {activeTab === 'buscar' && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Search size={20} className="text-slate-400" />
              <input
                placeholder="Buscar por bairro, cidade ou nome..."
                className="flex-1 outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none"
              >
                <option value="">Tipo</option>
                <option>Apartamento</option>
                <option>Casa</option>
                <option>Cobertura</option>
                <option>Comercial</option>
                <option>Studio</option>
                <option>Lançamento</option>
              </select>
              <select className="px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                <option>Quartos</option>
                <option>1+</option>
                <option>2+</option>
                <option>3+</option>
                <option>4+</option>
              </select>
              <select className="px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                <option>Preço</option>
                <option>Até R$ 500k</option>
                <option>R$ 500k - 1M</option>
                <option>R$ 1M - 3M</option>
                <option>R$ 3M+</option>
              </select>
              <select className="px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                <option>Finalidade</option>
                <option>Venda</option>
                <option>Locação</option>
              </select>
              <button className="bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                <Filter size={16} /> Filtrar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((prop) => (
              <div
                key={prop.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group"
              >
                <div className="h-36 bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center relative">
                  <Building2 size={40} className="text-blue-300" />
                  <button
                    className={`absolute top-3 right-3 p-2 rounded-full ${prop.saved ? 'bg-red-500 text-white' : 'bg-white/80 text-slate-400'} transition-all hover:scale-110`}
                  >
                    <Heart size={16} fill={prop.saved ? 'white' : 'none'} />
                  </button>
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full bg-white/90 text-blue-700 uppercase">
                    {prop.type}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-black mb-1">{prop.name}</h3>
                  <p className="text-sm text-slate-400 flex items-center gap-1 mb-3">
                    <MapPin size={14} />
                    {prop.bairro}, {prop.city}
                  </p>
                  <div className="flex items-center gap-4 mb-4 text-slate-500 text-sm">
                    {prop.bedrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bed size={14} />
                        {prop.bedrooms}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Bath size={14} />
                      {prop.baths}
                    </span>
                    <span className="flex items-center gap-1">
                      <Car size={14} />
                      {prop.parking}
                    </span>
                    <span className="flex items-center gap-1">
                      <Maximize size={14} />
                      {prop.area}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-black text-blue-600">
                        {prop.price}
                      </p>
                      <p className="text-xs text-slate-400">{prop.priceM2}</p>
                    </div>
                    <button className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-100 transition-all">
                      Ver <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'favoritos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {properties
            .filter((p) => p.saved)
            .map((prop) => (
              <div
                key={prop.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Building2 size={28} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-black">{prop.name}</h3>
                  <p className="text-sm text-slate-400">
                    {prop.bairro}, {prop.city} · {prop.area}
                  </p>
                </div>
                <p className="text-lg font-black text-blue-600">{prop.price}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default PortalCompradorUrbano;
