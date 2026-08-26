import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { instanceApi, cloudCredentialsApi, type Instance } from './hooks/api';
import QRCodeModal from './QRCodeModal';
import { usePlans } from '../../context/PlansContext';
import {
  X, Plus, Smartphone, Trash2, Power, PowerOff, QrCode,
  Wifi, WifiOff, Loader2, RefreshCw, AlertCircle, ShieldAlert,
  Cloud, Key, CheckCircle
} from 'lucide-react';

interface InstanceManagerProps {
  instances: Instance[];
  statusOverrides?: Record<string, Instance['status']>;
  onClose: () => void;
  onInstanceCreated: () => void;
}

const InstanceManager: React.FC<InstanceManagerProps> = ({
  instances: initialInstances,
  statusOverrides = {},
  onClose,
  onInstanceCreated,
}) => {
  const [instances, setInstances] = useState<Instance[]>(initialInstances);
  const [newName, setNewName] = useState('');
  const [newProvider, setNewProvider] = useState<'whatsmeow' | 'waha' | 'cloudapi'>('whatsmeow');
  const [creating, setCreating] = useState(false);
  const [qrInstance, setQrInstance] = useState<Instance | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Cloud API credential form
  const [cloudCredInstance, setCloudCredInstance] = useState<Instance | null>(null);
  const [cloudForm, setCloudForm] = useState({
    phoneNumberId: '',
    businessAccountId: '',
    appId: '',
    appSecret: '',
    accessToken: '',
  });
  const [savingCreds, setSavingCreds] = useState(false);
  const [credSuccess, setCredSuccess] = useState(false);

  useEffect(() => {
    refreshInstances();
  }, []);

  const refreshInstances = async () => {
    setLoading(true);
    try {
      const data = await instanceApi.list();
      setInstances(data);
    } catch (err) {
      logger.error('Failed to refresh instances:', err);
    } finally {
      setLoading(false);
    }
  };

  const { checkLimit, currentPlan } = usePlans();
  const maxInstances = currentPlan?.limits?.whatsapp_instances || 0;
  const isLimitReached = instances.length >= maxInstances;
  const displayInstances = instances.map((inst) => {
    const visualStatus = statusOverrides[inst.id];
    return visualStatus && visualStatus !== inst.status ? { ...inst, status: visualStatus } : inst;
  });

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
      const inst = await instanceApi.create(newName.trim(), newProvider);
      setInstances((prev) => [inst, ...prev]);
      setNewName('');

      if (newProvider === 'cloudapi') {
        setCloudCredInstance(inst);
        setCloudForm({ phoneNumberId: '', businessAccountId: '', appId: '', appSecret: '', accessToken: '' });
        setCredSuccess(false);
      } else {
        onInstanceCreated();
        setQrInstance(inst);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar instância');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!cloudCredInstance) return;
    if (!cloudForm.phoneNumberId || !cloudForm.businessAccountId || !cloudForm.appId || !cloudForm.appSecret || !cloudForm.accessToken) {
      setError('Preencha todos os campos de credenciais');
      return;
    }

    setSavingCreds(true);
    setError('');
    try {
      await cloudCredentialsApi.save({
        instanceId: cloudCredInstance.id,
        ...cloudForm,
      });
      setCredSuccess(true);
      setTimeout(() => {
        setCloudCredInstance(null);
        setCredSuccess(false);
        onInstanceCreated();
        refreshInstances();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar credenciais');
    } finally {
      setSavingCreds(false);
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
    if (inst.provider === 'cloudapi') {
      setCloudCredInstance(inst);
      setCredSuccess(false);
      try {
        const creds = await cloudCredentialsApi.get(inst.id);
        if (creds?.data) {
          setCloudForm({
            phoneNumberId: creds.data.phone_number_id || '',
            businessAccountId: creds.data.business_account_id || '',
            appId: creds.data.app_id || '',
            appSecret: '',
            accessToken: '',
          });
        }
      } catch {
        setCloudForm({ phoneNumberId: '', businessAccountId: '', appId: '', appSecret: '', accessToken: '' });
      }
      return;
    }

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

  const getProviderBadge = (provider?: string) => {
    if (provider === 'cloudapi') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
          <Cloud size={10} /> Cloud API
        </span>
      );
    }
    return null;
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

          {/* Header & Create */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Instâncias do WhatsApp</h2>
              <p className="text-sm text-gray-400">
                {instances.length} de {maxInstances} instâncias permitidas
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <select
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value as 'whatsmeow' | 'waha' | 'cloudapi')}
                className="w-full sm:w-auto bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
                disabled={creating || isLimitReached}
              >
                <option value="whatsmeow">WooTech 1 (Estável)</option>
                <option value="waha">WooTech 2 (BETA)</option>
                <option value="cloudapi">Meta Cloud API (Oficial)</option>
              </select>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome da nova instância..."
                  className="flex-1 sm:w-64 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
                  disabled={creating || isLimitReached}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                />
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim() || isLimitReached}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  <span className="hidden sm:inline">Nova Instância</span>
                </button>
              </div>
            </div>
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
            ) : displayInstances.length === 0 ? (
              <div className="wa-inst-empty">
                <Smartphone size={32} strokeWidth={1} />
                <p>Nenhuma instância criada</p>
                <span>Crie uma instância para conectar ao WhatsApp</span>
              </div>
            ) : (
              displayInstances.map((inst) => (
                <div key={inst.id} className="wa-inst-card" id={`instance-${inst.id}`}>
                  <div className="wa-inst-info">
                    <div className="wa-inst-top">
                      <span className="wa-inst-name">{inst.name}</span>
                      {getProviderBadge(inst.provider)}
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
                    {inst.provider === 'cloudapi' ? (
                      <button
                        onClick={() => handleConnect(inst)}
                        className="wa-inst-btn connect"
                        title="Configurar Credenciais"
                      >
                        <Key size={14} />
                      </button>
                    ) : inst.status === 'connected' ? (
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

      {/* Cloud API Credentials Modal */}
      {cloudCredInstance && (
        <div className="modal-overlay" onClick={() => setCloudCredInstance(null)}>
          <div className="wa-modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="wa-modal-header">
              <div className="wa-modal-title">
                <Cloud size={22} className="text-blue-500" />
                <h2>Credenciais Meta Cloud API</h2>
              </div>
              <button onClick={() => setCloudCredInstance(null)} className="wa-icon-btn">
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              Configure as credenciais da sua aplicação Meta para a instância <strong className="text-white">{cloudCredInstance.name}</strong>.
            </p>

            {credSuccess ? (
              <div className="flex items-center gap-2 text-green-400 bg-green-500/10 p-4 rounded-lg">
                <CheckCircle size={20} />
                <span>Credenciais salvas com sucesso!</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Phone Number ID</label>
                  <input
                    type="text"
                    value={cloudForm.phoneNumberId}
                    onChange={(e) => setCloudForm({ ...cloudForm, phoneNumberId: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm"
                    placeholder="Ex: 1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">WhatsApp Business Account ID</label>
                  <input
                    type="text"
                    value={cloudForm.businessAccountId}
                    onChange={(e) => setCloudForm({ ...cloudForm, businessAccountId: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm"
                    placeholder="Ex: 1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">App ID</label>
                  <input
                    type="text"
                    value={cloudForm.appId}
                    onChange={(e) => setCloudForm({ ...cloudForm, appId: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm"
                    placeholder="Ex: 1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">App Secret</label>
                  <input
                    type="password"
                    value={cloudForm.appSecret}
                    onChange={(e) => setCloudForm({ ...cloudForm, appSecret: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Access Token</label>
                  <input
                    type="password"
                    value={cloudForm.accessToken}
                    onChange={(e) => setCloudForm({ ...cloudForm, accessToken: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm"
                    placeholder="••••••••"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">
                  <p className="font-medium mb-1">Onde encontrar essas credenciais:</p>
                  <ul className="list-disc list-inside text-xs text-blue-400/80 space-y-0.5">
                    <li><strong>Phone Number ID</strong>: Meta Developer Dashboard → WhatsApp → API Setup</li>
                    <li><strong>WABA ID</strong>: Business Manager → WhatsApp Accounts</li>
                    <li><strong>App ID / Secret</strong>: Meta Developer Dashboard → App Settings</li>
                    <li><strong>Access Token</strong>: Business Settings → System Users → Generate Token</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCloudCredInstance(null)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveCredentials}
                    disabled={savingCreds}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {savingCreds ? <Loader2 className="animate-spin" size={16} /> : <Key size={16} />}
                    Salvar Credenciais
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default InstanceManager;
