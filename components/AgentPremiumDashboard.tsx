import React from 'react';
import { 
  Bot, 
  Power, 
  Settings, 
  BookOpen, 
  MessageSquare, 
  Mic, 
  GitMerge, 
  Globe,
  ArrowRight
} from 'lucide-react';
import { type AIAgent } from '../services/aiAgents';

interface AgentPremiumDashboardProps {
  agent: AIAgent;
  onEditKnowledge: () => void;
  onEditSettings: () => void;
  onToggleStatus: () => void;
  onOpenWebChat: () => void;
}

export const AgentPremiumDashboard: React.FC<AgentPremiumDashboardProps> = ({
  agent,
  onEditKnowledge,
  onEditSettings,
  onToggleStatus,
  onOpenWebChat
}) => {
  const isActive = agent.is_active;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
        {/* Decor */}
        <div className={`absolute top-0 right-0 w-64 h-64 blur-3xl opacity-20 pointer-events-none rounded-full -mr-10 -mt-10 ${isActive ? 'bg-emerald-500' : 'bg-slate-500'}`} />
        
        <div className="shrink-0 relative">
          <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center shadow-inner">
            <Bot size={48} className={isActive ? 'text-emerald-500' : 'text-slate-400'} />
          </div>
          <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-white ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        </div>

        <div className="flex-1 text-center md:text-left z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            {isActive ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Assistente Online</>
            ) : (
              <><span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Assistente Pausado</>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Olá! Meu nome é <span className="text-emerald-600">{agent.name || 'Bia'}</span>, assistente virtual da sua empresa!
          </h1>
          <p className="text-sm font-medium text-slate-500 max-w-2xl">
            {isActive 
              ? 'Estou pronta para atender seus clientes, qualificar leads e ajudar nas operações.' 
              : 'Estou pausada no momento. Para que eu volte a atender seus clientes, basta me ativar.'}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3 z-10 mt-4 md:mt-0">
          <button className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold text-slate-700 transition flex items-center gap-2 shadow-sm">
            Resetar assistente
          </button>
          <button 
            onClick={onToggleStatus}
            className={`h-11 px-5 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm ${
              isActive 
                ? 'border border-red-200 bg-white hover:bg-red-50 text-red-600'
                : 'border border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
            }`}
          >
            <Power size={18} />
            {isActive ? 'Pausar assistente' : 'Ativar assistente'}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Ações Principais */}
        <div className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Ações Principais</h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-emerald-500 hover:shadow-md transition">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <BookOpen size={16} className="text-emerald-600" />
                </div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Base de Conhecimento</h3>
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">Treinamentos avançados</h4>
              <p className="text-xs text-slate-500 font-medium mb-4">
                Configure informações, produtos, regras e ações do seu assistente.
              </p>
              <button 
                onClick={onEditKnowledge}
                className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Settings size={14} /> Configurar treinamentos
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-blue-500 hover:shadow-md transition">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Bot size={16} className="text-blue-600" />
                </div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-blue-600">Personalize seu assistente</h3>
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">Configurações e Perfil</h4>
              <p className="text-xs text-slate-500 font-medium mb-4">
                Ajuste comportamento, tom de voz e preferências gerais operacionais.
              </p>
              <button 
                onClick={onEditSettings}
                className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Settings size={14} /> Configurar perfil
              </button>
            </div>
          </div>
        </div>

        {/* Canais de Atendimento */}
        <div className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Canais de Atendimento</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WhatsApp */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <MessageSquare size={16} className="text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">Desconectado</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">WhatsApp</h4>
              <p className="text-xs text-slate-500 font-medium mb-4 flex-1">
                Conecte o WhatsApp da sua empresa.
              </p>
              <button className="w-full h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition">
                Conectar
              </button>
            </div>

            {/* Áudio */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition flex flex-col h-full opacity-70">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                  <Mic size={16} className="text-slate-600" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 uppercase tracking-widest">180min</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Áudio</h4>
              <p className="text-xs text-slate-500 font-medium mb-4 flex-1">
                Configure respostas em áudio.
              </p>
              <button className="w-full h-9 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold transition flex items-center justify-center gap-1">
                Configurar <ArrowRight size={12} />
              </button>
            </div>

            {/* Filas */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <GitMerge size={16} className="text-purple-600" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase tracking-widest border border-blue-100">3 ativas</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Filas de atendimento</h4>
              <p className="text-xs text-slate-500 font-medium mb-4 flex-1">
                Crie filas de atendimento para transferência.
              </p>
              <button className="w-full h-9 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold transition flex items-center justify-center gap-1 hover:bg-slate-200">
                Configurar <ArrowRight size={12} />
              </button>
            </div>

            {/* Web Chat */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 uppercase tracking-widest">BETA</div>
              <div className="flex items-center justify-between mb-3 mt-1">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Globe size={16} className="text-orange-600" />
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Web Chat</h4>
              <p className="text-xs text-slate-500 font-medium mb-4 flex-1">
                Crie um widget para seu site.
              </p>
              <button 
                onClick={onOpenWebChat}
                className="w-full h-9 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold transition flex items-center justify-center gap-1 hover:bg-slate-200"
              >
                Configurar <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
