
import React, { useState, useEffect } from 'react';
import { Database, MonitorPlay, CheckCircle, AlertTriangle, Play, RefreshCw, BarChart3 } from 'lucide-react';
import { supabase } from '../services/supabase';

const Migration: React.FC = () => {
  const [url, setUrl] = useState('https://www.fazendasbrasil.com.br/imobiliaria/imoveis/0/1');
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [count, setCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Carrega contagem inicial
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase.from('properties').select('*', { count: 'exact', head: true });
      if (count !== null) setCount(count);
    };
    fetchCount();

    // Inscreve para atualizações em Tempo Real
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta Insert, Update, Delete
          schema: 'public',
          table: 'properties',
        },
        (payload) => {
          // Atualiza contador simples
          if (payload.eventType === 'INSERT') {
            setCount(prev => prev + 1);
            addLog(`Novo imóvel importado: ${payload.new.title}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const handleStartMigration = async () => {
    if (!url) return;
    setStatus('running');
    addLog(`Iniciando solicitação de migração para: ${url}`);

    try {
      const response = await fetch('http://localhost:3002/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUrl: url })
      });
      
      const text = await response.text();
      console.log('Server Response:', response.status, text);

      if (!response.ok) {
        setStatus('error');
        addLog(`Erro do servidor (${response.status}): ${text || response.statusText}`);
        return;
      }

      try {
        const data = JSON.parse(text);
        addLog(`Servidor aceitou o comando: ${data.message}`);
      } catch (e) {
        addLog(`Erro ao processar resposta JSON: ${text}`);
      }
    } catch (error: any) {
       console.error("Fetch error:", error);
       setStatus('error');
       addLog(`Falha de Conexão: ${error.message}. O servidor backend está rodando?`);
    } finally {
        // Como o processo é async no back, o status aqui volta pro idle ou mantem running simbolicamente por um tempo
        setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
           <Database className="text-white" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Migrador de Imóveis</h1>
          <p className="text-slate-500 font-medium">Importe dados de portais externos automaticamente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card de Controle */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              URL de Origem (Portal Externo)
            </label>
            <div className="flex gap-4">
              <input 
                type="text" 
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-mono text-sm text-slate-700 focus:border-indigo-500 outline-none transition-colors"
                placeholder="https://exemplo.com.br/imoveis..."
              />
              <button 
                onClick={handleStartMigration}
                disabled={status === 'running'}
                className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${
                  status === 'running' 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-indigo-200'
                }`}
              >
                {status === 'running' ? <RefreshCw className="animate-spin" /> : <Play size={20} />}
                {status === 'running' ? 'Rodando...' : 'Iniciar'}
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-400 flex items-center gap-2">
              <AlertTriangle size={12} className="text-amber-500" />
              Certifique-se que o "npm run server" está rodando no terminal para habilitar o robô.
            </p>
          </div>

          <div className="bg-slate-900 text-slate-300 p-8 rounded-3xl font-mono text-sm h-96 overflow-y-auto space-y-2 custom-scrollbar shadow-2xl">
            <div className="flex items-center gap-2 text-indigo-400 border-b border-white/10 pb-4 mb-4 font-bold uppercase tracking-widest">
              <MonitorPlay size={16} /> Logs de Execução
            </div>
            {logs.length === 0 && <span className="opacity-30 italic">Aguardando início...</span>}
            {logs.map((log, i) => (
              <div key={i} className="border-l-2 border-slate-700 pl-3 py-1 hover:bg-white/5 transition-colors">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Card de Estatísticas */}
        <div className="md:col-span-1 space-y-6">
           <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
             
             <div className="relative z-10">
               <div className="flex items-center gap-2 opacity-80 mb-2 text-xs font-bold uppercase tracking-widest">
                 <BarChart3 size={16} /> Total Importado
               </div>
               <div className="text-7xl font-black tracking-tighter mb-4">
                 {count}
               </div>
               <div className="flex items-center gap-2 text-indigo-100 bg-white/20 p-2 rounded-lg w-fit text-xs font-medium backdrop-blur-sm">
                 <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                 Sincronizado em Tempo Real
               </div>
             </div>
           </div>
           
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <CheckCircle size={18} className="text-green-500" /> Status do Sistema
             </h3>
             <div className="space-y-4">
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-500">Servidor Local</span>
                 <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold uppercase">Online</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-500">Banco de Dados</span>
                 <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold uppercase">Conectado</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-500">Última Importação</span>
                 <span className="text-slate-800 font-medium">Agora</span>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Migration;
