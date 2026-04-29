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
} from 'lucide-react';

const ConnectionSettings: React.FC = () => {
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
      console.error('Failed to refresh instances:', err);
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
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
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

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Nome da conexão..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input-premium py-2 px-4 w-full md:w-64"
              disabled={isLimitReached}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || isLimitReached}
              className="btn-primary whitespace-nowrap"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Criar Conexão
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

      {/* QR Code Modal Wrapper */}
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

export default ConnectionSettings;
