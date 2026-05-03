import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { instanceApi, type Instance } from '../WhatsApp/hooks/api';
import QRCodeModal from '../WhatsApp/QRCodeModal';
import { usePlans } from '../../context/PlansContext';
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
  Instagram,
  MessageSquare,
} from 'lucide-react';

const ChannelsSettings: React.FC = () => {
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [instances, setInstances] = useState<Instance[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrInstance, setQrInstance] = useState<Instance | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { currentPlan } = usePlans();
  const maxInstances = currentPlan?.limits?.whatsapp_instances || 1;
  const isLimitReached = instances.length >= maxInstances;

  useEffect(() => {
    if (activeChannel === 'whatsapp') {
      refreshInstances();
    }
  }, [activeChannel]);

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
    if (activeChannel !== 'whatsapp') return;

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
    <div className="space-y-6 animate-fade-in">
      {/* Channel Selection Tabs */}
      <div className="flex gap-2 p-1 bg-bg-card/50 border border-border-subtle rounded-xl w-fit">
        <button
          onClick={() => setActiveChannel('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeChannel === 'whatsapp'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <MessageSquare size={16} />
          WhatsApp
        </button>
        <button
          onClick={() => setActiveChannel('instagram')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeChannel === 'instagram'
              ? 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white shadow-lg shadow-pink-500/20'
              : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <Instagram size={16} />
          Instagram
        </button>
      </div>

      {activeChannel === 'whatsapp' ? (
        <div className="space-y-6">
          {/* WhatsApp Header & Creation */}
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#25D366]/10 border border-[#25D366]/20 rounded-2xl">
                  <Smartphone size={24} className="text-[#25D366]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">
                    Conexões WhatsApp
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Gerencie suas instâncias do WhatsApp para atendimento e notificações.
                  </p>
                </div>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-xl">
                <div className="relative flex-1 w-full group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-primary transition-colors">
                    <Link size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder={isLimitReached ? "Limite do plano atingido" : "Nome da conexão (ex: Comercial)"}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input-premium py-3 pl-11 pr-4 w-full bg-bg-primary/50"
                    disabled={isLimitReached}
                  />
                </div>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim() || isLimitReached}
                  className="btn-primary py-3 px-6 h-[46px] shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[160px]"
                >
                  {creating ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Plus size={18} strokeWidth={3} />
                  )}
                  <span className="font-bold tracking-tight">Criar Conexão</span>
                </button>
              </div>
            </div>

            {isLimitReached && (
              <div className="mt-4 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl flex items-center gap-2 text-xs text-orange-400">
                <ShieldAlert size={14} />
                <span>Limite atingido ({instances.length}/{maxInstances}). Entre em contato para aumentar seu limite.</span>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>

          {/* Instance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading && instances.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <Loader2 size={32} className="animate-spin text-primary mx-auto mb-4" />
                <p className="text-text-secondary">Buscando conexões ativas...</p>
              </div>
            ) : instances.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-bg-card border border-dashed border-border rounded-3xl">
                <WifiOff size={48} className="text-text-tertiary mx-auto mb-4 opacity-20" />
                <h4 className="text-text-primary font-semibold">Nenhuma conexão ativa</h4>
                <p className="text-sm text-text-tertiary mt-1">
                  Crie sua primeira instância acima para começar a usar o WhatsApp.
                </p>
              </div>
            ) : (
              instances.map((inst) => (
                <div
                  key={inst.id}
                  className="bg-bg-card border border-border-subtle rounded-2xl p-5 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${inst.status === 'connected' ? 'bg-[#25D366] shadow-[0_0_10px_rgba(37,211,102,0.5)]' : 'bg-red-500'}`} />
                      <span className="font-semibold text-text-primary">{inst.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {inst.status === 'connected' ? (
                        <button
                          onClick={() => handleLogout(inst.id)}
                          className="p-2 hover:bg-red-500/10 text-text-tertiary hover:text-red-500 rounded-lg transition-colors"
                          title="Desconectar"
                        >
                          <PowerOff size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setQrInstance(inst)}
                          className="p-2 hover:bg-[#25D366]/10 text-text-tertiary hover:text-[#25D366] rounded-lg transition-colors"
                          title="Conectar (QR Code)"
                        >
                          <QrCode size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(inst.id)}
                        className="p-2 hover:bg-red-500/10 text-text-tertiary hover:text-red-500 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-tertiary">Status</span>
                      <span className={`font-medium ${inst.status === 'connected' ? 'text-[#25D366]' : 'text-text-secondary'}`}>
                        {inst.status === 'connected' ? 'Conectado' : inst.status === 'qr_pending' ? 'Aguardando QR Code' : 'Desconectado'}
                      </span>
                    </div>
                    {inst.phone && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-tertiary">Telefone</span>
                        <span className="text-text-primary font-mono">+{inst.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-tertiary">ID Técnico</span>
                      <span className="text-text-tertiary font-mono opacity-50">{inst.id.split('-')[0]}...</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Refresh */}
          <div className="flex justify-center pt-4">
            <button
              onClick={refreshInstances}
              className="flex items-center gap-2 text-xs font-semibold text-text-tertiary hover:text-primary transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar Lista de Conexões
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Instagram Section */}
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-pink-500/20 animate-pulse-slow">
              <Instagram size={40} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Conectar Instagram Business</h3>
            <p className="text-text-secondary max-w-md mx-auto mb-8">
              Responda DMs, gerencie comentários e automatize seu atendimento no Instagram diretamente pelo IMOBZY.
            </p>
            
            <div className="inline-flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl text-left max-w-lg mx-auto mb-8">
              <ShieldAlert size={20} className="text-primary shrink-0" />
              <p className="text-sm text-text-secondary leading-relaxed">
                <strong className="text-text-primary">Requisito:</strong> Sua conta do Instagram deve ser uma conta <strong>Comercial</strong> vinculada a uma <strong>Página do Facebook</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="btn-primary py-3 px-8 h-[48px] bg-gradient-to-r from-[#ee2a7b] to-[#6228d7] border-none shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 transition-all font-bold">
                Conectar via Facebook
              </button>
              <button className="px-6 py-3 text-sm font-semibold text-text-tertiary hover:text-text-primary transition-colors">
                Ver Documentação
              </button>
            </div>
          </div>

          {/* Connected Instagram Accounts */}
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
            <h4 className="text-sm font-semibold text-text-tertiary uppercase tracking-widest mb-6">Contas Conectadas</h4>
            
            {instagramAccounts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instagramAccounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-4 bg-bg-primary/50 border border-border-subtle rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center">
                        <Instagram size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">@{acc.username}</p>
                        <p className="text-xs text-[#25D366]">Ativo</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-red-500/10 text-text-tertiary hover:text-red-500 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-50 grayscale">
                <Instagram size={32} className="text-text-tertiary mb-3" />
                <p className="text-sm text-text-tertiary">Nenhuma conta conectada no momento</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Modal Wrapper */}
      {qrInstance && (activeChannel === 'whatsapp') && (
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

export default ChannelsSettings;
