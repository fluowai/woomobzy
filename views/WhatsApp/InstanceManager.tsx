import React, { useState, useEffect } from 'react';
import { instanceApi, type Instance } from './hooks/api';
import QRCodeModal from './QRCodeModal';
import { usePlans } from '../../context/PlansContext';
import {
  X, Plus, Smartphone, Trash2, Power, PowerOff, QrCode,
  Wifi, WifiOff, Loader2, RefreshCw, AlertCircle, ShieldAlert
} from 'lucide-react';

interface InstanceManagerProps {
  instances: Instance[];
  onClose: () => void;
  onInstanceCreated: () => void;
}

const InstanceManager: React.FC<InstanceManagerProps> = ({
  instances: initialInstances,
  onClose,
  onInstanceCreated,
}) => {
  const [instances, setInstances] = useState<Instance[]>(initialInstances);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrInstance, setQrInstance] = useState<Instance | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshInstances();
  }, []);

  const refreshInstances = async () => {
    setLoading(true);
    try {
      const data = await instanceApi.list();
      setInstances(data);
    } catch (err) {
      console.error('Failed to refresh instances:', err);
    } finally {
      setLoading(false);
    }
  };

  const { checkLimit, currentPlan } = usePlans();
  const maxInstances = currentPlan?.limits?.whatsapp_instances || 0;
  const isLimitReached = instances.length >= maxInstances;

  const handleCreate = async () => {
    if (isLimitReached) {
      setError(`Limite de instâncias atingido (${maxInstances}). Faça upgrade do seu plano.`);
      return;
    }

    if (!newName.trim()) {
      setError('Nome da instância é obrigatório');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const inst = await instanceApi.create(newName.trim());
      setInstances((prev) => [inst, ...prev]);
      setNewName('');
      onInstanceCreated();
      // Auto-open QR code
      setQrInstance(inst);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar instância');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta instância? Todos os dados serão perdidos.')) return;

    try {
      await instanceApi.delete(id);
      setInstances((prev) => prev.filter((i) => i.id !== id));
      onInstanceCreated();
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar');
    }
  };

  const handleConnect = async (inst: Instance) => {
    try {
      await instanceApi.connect(inst.id);
      setQrInstance(inst);
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar');
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

  const getStatusBadge = (status: Instance['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="wa-inst-badge connected">
            <Wifi size={12} /> Conectado
          </span>
        );
      case 'disconnected':
        return (
          <span className="wa-inst-badge disconnected">
            <WifiOff size={12} /> Desconectado
          </span>
        );
      case 'connecting':
        return (
          <span className="wa-inst-badge connecting">
            <Loader2 size={12} className="animate-spin" /> Conectando...
          </span>
        );
      case 'qr_pending':
        return (
          <span className="wa-inst-badge qr">
            <QrCode size={12} /> QR Code
          </span>
        );
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="wa-modal" onClick={(e) => e.stopPropagation()}>
          <div className="wa-modal-header">
            <div className="wa-modal-title">
              <Smartphone size={22} className="text-[#25D366]" />
              <h2>Gerenciar Instâncias</h2>
            </div>
            <button onClick={onClose} className="wa-icon-btn">
              <X size={20} />
            </button>
          </div>

          {/* Create New */}
          <div className="wa-create-instance">
            <input
              type="text"
              placeholder={isLimitReached ? "Limite do plano atingido" : "Nome da nova instância..."}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              disabled={isLimitReached}
              className="wa-create-input"
              id="new-instance-name"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || isLimitReached}
              className={`wa-create-btn ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? 'Criando...' : 'Criar'}
            </button>
          </div>

          {isLimitReached && (
            <div className="wa-limit-reached">
              <ShieldAlert size={14} className="text-orange-500" />
              <span>Você atingiu o limite de <strong>{maxInstances}</strong> instâncias do seu plano.</span>
            </div>
          )}

          {error && (
            <div className="wa-error">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Instance List */}
          <div className="wa-instance-list">
            {loading && instances.length === 0 ? (
              <div className="wa-inst-loading">
                <Loader2 size={20} className="animate-spin" />
                <span>Carregando instâncias...</span>
              </div>
            ) : instances.length === 0 ? (
              <div className="wa-inst-empty">
                <Smartphone size={32} strokeWidth={1} />
                <p>Nenhuma instância criada</p>
                <span>Crie uma instância para conectar ao WhatsApp</span>
              </div>
            ) : (
              instances.map((inst) => (
                <div key={inst.id} className="wa-inst-card" id={`instance-${inst.id}`}>
                  <div className="wa-inst-info">
                    <div className="wa-inst-top">
                      <span className="wa-inst-name">{inst.name}</span>
                      {getStatusBadge(inst.status)}
                    </div>
                    {inst.phone && (
                      <span className="wa-inst-phone">📱 +{inst.phone}</span>
                    )}
                    <span className="wa-inst-date">
                      Criado em {new Date(inst.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="wa-inst-actions">
                    {inst.status === 'connected' ? (
                      <button
                        onClick={() => handleLogout(inst.id)}
                        className="wa-inst-btn logout"
                        title="Desconectar"
                      >
                        <PowerOff size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(inst)}
                        className="wa-inst-btn connect"
                        title="Conectar"
                      >
                        <QrCode size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(inst.id)}
                      className="wa-inst-btn delete"
                      title="Deletar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Refresh */}
          <div className="wa-modal-footer">
            <button onClick={refreshInstances} className="wa-refresh-btn" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>
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
    </>
  );
};

export default InstanceManager;
