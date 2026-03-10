import React, { useState } from 'react';
import { Upload, RefreshCw, CheckCircle, Globe, Plus, Settings, AlertTriangle, Clock, X, Copy, ExternalLink } from 'lucide-react';

interface Portal {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  lastSync: string;
  properties: number;
  errors: number;
  feedUrl: string;
}

const AVAILABLE_PORTALS: Portal[] = [
  { id: '1', name: 'ZAP Imóveis', logo: '🏠', connected: false, lastSync: '—', properties: 0, errors: 0, feedUrl: '' },
  { id: '2', name: 'Viva Real', logo: '🏘', connected: false, lastSync: '—', properties: 0, errors: 0, feedUrl: '' },
  { id: '3', name: 'OLX', logo: '📦', connected: false, lastSync: '—', properties: 0, errors: 0, feedUrl: '' },
  { id: '4', name: 'Imovelweb', logo: '🌐', connected: false, lastSync: '—', properties: 0, errors: 0, feedUrl: '' },
  { id: '5', name: 'Chaves na Mão', logo: '🔑', connected: false, lastSync: '—', properties: 0, errors: 0, feedUrl: '' },
];

const ExportadorPortais: React.FC = () => {
  const [portals, setPortals] = useState<Portal[]>(AVAILABLE_PORTALS);
  const [showConfig, setShowConfig] = useState<string | null>(null);

  const toggleConnection = (id: string) => {
    setPortals(prev => prev.map(p => p.id === id ? { 
      ...p, 
      connected: !p.connected, 
      feedUrl: !p.connected ? `https://imobzy.com.br/api/feed/${p.name.toLowerCase().replace(/\s+/g, '-')}.xml` : '',
      lastSync: !p.connected ? new Date().toLocaleString('pt-BR') : '—'
    } : p));
  };

  const connected = portals.filter(p => p.connected);
  const totalExported = connected.reduce((a, p) => a + p.properties, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
          <Upload className="text-blue-600" size={32} />
          Exportador para Portais
        </h1>
        <p className="text-black/60 font-medium">Feed XML automático para ZAP, Viva Real, OLX e outros portais imobiliários.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Globe, label: 'Portais Conectados', value: String(connected.length), color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Upload, label: 'Imóveis Exportados', value: String(totalExported), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: RefreshCw, label: 'Última Sincronização', value: connected.length > 0 ? connected[0].lastSync : '—', color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: CheckCircle, label: 'Taxa de Sucesso', value: connected.length > 0 ? '100%' : '—', color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}><stat.icon size={24} /></div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</h3>
            <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Portal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portals.map(portal => (
          <div key={portal.id} className={`bg-white rounded-2xl border-2 transition-all ${portal.connected ? 'border-blue-200 shadow-lg' : 'border-slate-100'}`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{portal.logo}</span>
                  <div>
                    <h3 className="font-bold text-black">{portal.name}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${portal.connected ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {portal.connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleConnection(portal.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    portal.connected 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                      : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg'
                  }`}
                >
                  {portal.connected ? 'Desconectar' : 'Conectar'}
                </button>
              </div>

              {portal.connected && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Última sync:</span>
                    <span className="font-medium text-black">{portal.lastSync}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Feed XML:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-slate-50 px-2 py-1 rounded text-blue-600 max-w-[150px] truncate">{portal.feedUrl}</code>
                      <button className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500"><Copy size={12} /></button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 flex items-center justify-center gap-1 p-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-medium hover:bg-blue-100 transition-all">
                      <RefreshCw size={14} /> Sincronizar
                    </button>
                    <button onClick={() => setShowConfig(portal.id)} className="flex-1 flex items-center justify-center gap-1 p-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-100 transition-all">
                      <Settings size={14} /> Configurar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sync Log */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h3 className="text-lg font-bold text-black mb-4">Log de Sincronização</h3>
        <div className="space-y-2">
          {connected.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Conecte um portal para ver os logs de sincronização</p>
          ) : connected.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-xl">{p.logo}</span>
                <div>
                  <p className="text-sm font-medium text-black">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.lastSync}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-700">
                <CheckCircle size={12} className="inline mr-1" />Sucesso
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-black">Configurações do Portal</h3>
              <button onClick={() => setShowConfig(null)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Chave de API (se necessário)</label>
                <input className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" placeholder="Insira sua chave API" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Intervalo de Sincronização</label>
                <select className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                  <option>A cada 1 hora</option>
                  <option>A cada 6 horas</option>
                  <option>A cada 12 horas</option>
                  <option>A cada 24 horas</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filtrar Imóveis</label>
                <select className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                  <option>Todos os imóveis ativos</option>
                  <option>Apenas vendas</option>
                  <option>Apenas locação</option>
                </select>
              </div>
            </div>
            <button onClick={() => setShowConfig(null)} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg">
              Salvar Configurações
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportadorPortais;
