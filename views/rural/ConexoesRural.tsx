import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { instanceApi, type Instance } from '../WhatsApp/hooks/api';
import QRCodeModal from '../WhatsApp/QRCodeModal';
import { usePlans } from '../../context/PlansContext';
import { useSettings } from '../../context/SettingsContext';
import {
  Plus,
  Smartphone,
  Trash2,
  PowerOff,
  QrCode,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Link,
  MessageSquare,
  Zap,
} from 'lucide-react';

const ConexoesRural: React.FC = () => {
  const { settings } = useSettings();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrInstance, setQrInstance] = useState<Instance | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { currentPlan } = usePlans();
  const maxInstances = currentPlan?.limits?.whatsapp_instances || 1;
  const isLimitReached = instances.length >= maxInstances;

  useEffect(() => {
    refreshInstances();
  }, []);

  const refreshInstances = async () => {
    setLoading(true);
    try {
      const data = await instanceApi.list();
      setInstances(data || []);
    } catch (err) {
      logger.error('Failed to refresh instances:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (isLimitReached) {
      setError(`Limite de instâncias atingido (${maxInstances}).`);
      return;
    }

    if (!newName.trim()) {
      setError('Dê um nome para a conexão (ex: Atendimento Principal)');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const inst = await instanceApi.create(newName.trim());
      setInstances((prev) => [inst, ...prev]);
      setNewName('');
      setQrInstance(inst);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar instância');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta conexão?')) return;
    try {
      await instanceApi.delete(id);
      setInstances((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar');
    }
  };

  const handleLogout = async (id: string) => {
    try {
      await instanceApi.logout(id);
      refreshInstances();
    } catch (err: any) {
      setError(err.message || 'Erro ao desconectar');
    }
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-black uppercase italic tracking-tighter leading-none mb-3">
            Conexões <br />{' '}
            <span style={{ color: settings.primaryColor }}>WhatsApp & API</span>
          </h1>
          <p className="text-black/60 font-medium italic">
            Gerencie suas instâncias de comunicação e automação.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-2xl p-4 shadow-sm border border-slate-100 items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Status do Plano</span>
              <span className="text-sm font-black text-black">
                {instances.length} / {maxInstances} Conexões
              </span>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-slate-100 flex items-center justify-center relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-slate-100"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke={settings.primaryColor}
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={`${(instances.length / maxInstances) * 125.6} 125.6`}
                  className="transition-all duration-1000"
                />
              </svg>
              <Zap size={14} className="absolute text-black" style={{ color: settings.primaryColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-black">
              Nova Conexão
            </h3>
            <p className="text-sm font-medium text-black/40">
              Crie uma nova instância para unificar seu atendimento rural.
            </p>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full">
            <div className="relative flex-1 w-full group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-black/20 group-focus-within:text-black transition-colors">
                <Link size={18} />
              </div>
              <input
                type="text"
                placeholder={isLimitReached ? "Limite do plano atingido" : "Nome da conexão (ex: Vendas Sul)"}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="w-full h-16 pl-16 pr-6 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-black transition-all"
                disabled={isLimitReached}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || isLimitReached}
              style={{ backgroundColor: isLimitReached ? '#cbd5e1' : settings.primaryColor }}
              className="h-16 px-10 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-black/5 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 min-w-[200px]"
            >
              {creating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} strokeWidth={3} />
              )}
              {creating ? 'Criando...' : 'Criar Instância'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in zoom-in-95 duration-300">
            <AlertCircle size={18} />
            <span className="text-xs font-black uppercase tracking-widest">{error}</span>
          </div>
        )}
      </div>

      {/* Grid de Instâncias */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading && instances.length === 0 ? (
          <div className="col-span-full py-32 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-6"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/40">Sincronizando conexões...</p>
          </div>
        ) : instances.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
            <WifiOff size={64} className="text-black/10 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-black uppercase italic tracking-tighter">Nenhuma Conexão Ativa</h3>
            <p className="text-black/40 font-medium italic mt-2">Crie sua primeira instância acima para começar.</p>
          </div>
        ) : (
          instances.map((inst) => (
            <div
              key={inst.id}
              className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.02] translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-700">
                <Smartphone size={120} />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-3 h-3 rounded-full animate-pulse"
                      style={{ backgroundColor: inst.status === 'connected' ? '#10b981' : '#ef4444' }}
                    />
                    <span className="text-sm font-black text-black uppercase tracking-tight">{inst.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {inst.status === 'connected' ? (
                      <button
                        onClick={() => handleLogout(inst.id)}
                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                        title="Desconectar"
                      >
                        <PowerOff size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setQrInstance(inst)}
                        className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                        title="Gerar QR Code"
                      >
                        <QrCode size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(inst.id)}
                      className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-50">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Status</span>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${inst.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {inst.status === 'connected' ? 'Ativo' : 'Desconectado'}
                    </span>
                  </div>
                  
                  {inst.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Telefone</span>
                      <span className="text-xs font-bold text-black font-mono">+{inst.phone}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Integração</span>
                    <span className="text-[10px] font-black text-black/60 italic">WOOMOBZY API v1</span>
                  </div>
                </div>

                {inst.status !== 'connected' && (
                  <button
                    onClick={() => setQrInstance(inst)}
                    style={{ backgroundColor: settings.primaryColor }}
                    className="w-full mt-8 h-12 rounded-xl text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-black/5 hover:brightness-110 transition-all"
                  >
                    Conectar Agora
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Tools */}
      <div className="flex justify-center">
        <button
          onClick={refreshInstances}
          className="flex items-center gap-3 px-8 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-black/40 hover:text-black transition-all group"
        >
          <RefreshCw size={16} className={`group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-black uppercase tracking-widest">Sincronizar Instâncias</span>
        </button>
      </div>

      {/* QR Code Modal */}
      {qrInstance && (
        <QRCodeModal
          instance={qrInstance}
          onClose={() => {
            setQrInstance(null);
            refreshInstances();
          }}
        />
      )}
    </div>
  );
};

export default ConexoesRural;
