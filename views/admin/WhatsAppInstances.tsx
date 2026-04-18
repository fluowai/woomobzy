import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import {
  Smartphone,
  Plus,
  Trash2,
  RefreshCw,
  QrCode,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../src/lib/api';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tipos
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type InstanceStatus =
  | 'pending'
  | 'disconnected'
  | 'connecting'
  | 'qr_pending'
  | 'reconnecting'
  | 'authenticated'
  | 'connected';

interface WhatsAppInstance {
  id: string;
  name: string;
  phone_number: string | null;
  status: InstanceStatus;
  socket_alive?: boolean;
  memory_state?: string;
  created_at: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers de UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const getStatusConfig = (instance: WhatsAppInstance) => {
  const alive = instance.socket_alive;

  // Estado conectado mas socket morto → alerta especial
  if (instance.status === 'connected' && alive === false) {
    return {
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      label: 'Reconectando...',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
    };
  }

  switch (instance.status) {
    case 'connected':
      return {
        icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
        label: 'Conectado',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50 border-emerald-200',
      };
    case 'connecting':
    case 'authenticated':
      return {
        icon: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
        label: 'Conectando...',
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
      };
    case 'qr_pending':
      return {
        icon: <QrCode className="w-5 h-5 text-violet-500" />,
        label: 'Aguardando QR',
        color: 'text-violet-700',
        bg: 'bg-violet-50 border-violet-200',
      };
    case 'reconnecting':
      return {
        icon: <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />,
        label: 'Reconectando...',
        color: 'text-amber-700',
        bg: 'bg-amber-50 border-amber-200',
      };
    case 'disconnected':
      return {
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        label: 'Desconectado',
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200',
      };
    default:
      return {
        icon: <div className="w-5 h-5 rounded-full bg-gray-300" />,
        label: 'Aguardando',
        color: 'text-gray-500',
        bg: 'bg-gray-50 border-gray-200',
      };
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Componente Principal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const WhatsAppInstances: React.FC = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ instance: WhatsAppInstance; qrCode: string | null } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const { profile } = useAuth();

  // Refs para subscriptions do Supabase Realtime
  const instancesChannelRef = useRef<any>(null);
  const qrChannelRef = useRef<any>(null);

  // ──────────────────────────────────────────────
  // Token de auth helper
  // ──────────────────────────────────────────────
  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  }, []);

  // ──────────────────────────────────────────────
  // Fetch Instâncias (via API — inclui socketAlive)
  // ──────────────────────────────────────────────
  const fetchInstances = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl('/api/whatsapp/instances'), { headers });
      const data = await response.json();
      if (data.success) {
        setInstances(data.instances || []);
      }
    } catch (error) {
      console.error('[WhatsAppInstances] Erro ao buscar instâncias:', error);

      // Fallback: busca direto no Supabase se API não responder
      if (profile?.organization_id) {
        const { data } = await supabase
          .from('whatsapp_instances')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false });
        setInstances(data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, getAuthHeaders]);

  // ──────────────────────────────────────────────
  // Realtime: ouvir mudanças de status nas instâncias
  // ──────────────────────────────────────────────
  const subscribeToInstances = useCallback(() => {
    if (!profile?.organization_id) return;

    // Cancela subscription anterior se existir
    if (instancesChannelRef.current) {
      supabase.removeChannel(instancesChannelRef.current);
    }

    instancesChannelRef.current = supabase
      .channel(`wa-instances-org-${profile.organization_id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_instances',
        filter: `organization_id=eq.${profile.organization_id}`,
      }, (payload) => {
        console.log('[WhatsAppInstances] 🔔 Realtime: mudança de instância', payload.eventType);

        if (payload.eventType === 'DELETE') {
          setInstances(prev => prev.filter(i => i.id !== (payload.old as any).id));
          return;
        }

        // Para INSERT/UPDATE: atualiza via API para pegar socketAlive também
        fetchInstances();
      })
      .subscribe((status) => {
        console.log('[WhatsAppInstances] 📡 Subscription status:', status);
      });
  }, [profile?.organization_id, fetchInstances]);

  // ──────────────────────────────────────────────
  // Realtime: ouvir chegada do QR Code
  // ──────────────────────────────────────────────
  const subscribeToQR = useCallback((instanceId: string) => {
    // Remove subscription de QR anterior
    if (qrChannelRef.current) {
      supabase.removeChannel(qrChannelRef.current);
    }

    qrChannelRef.current = supabase
      .channel(`wa-qr-${instanceId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_instances',
        filter: `id=eq.${instanceId}`,
      }, (payload) => {
        const updated = payload.new as any;
        console.log('[WhatsAppInstances] 🔔 Realtime QR update:', updated.status);

        if (updated.qr_code && updated.status === 'qr_pending') {
          setQrModal(prev => prev ? { ...prev, qrCode: updated.qr_code } : null);
          setQrLoading(false);
        }

        if (updated.status === 'connected') {
          // Conexão estabelecida! Fecha modal e atualiza
          setQrModal(null);
          setQrLoading(false);
          setConnectingId(null);
          fetchInstances();
          // Remove subscription de QR (não precisamos mais)
          if (qrChannelRef.current) {
            supabase.removeChannel(qrChannelRef.current);
            qrChannelRef.current = null;
          }
        }

        if (['disconnected', 'reconnecting'].includes(updated.status)) {
          fetchInstances();
        }
      })
      .subscribe();
  }, [fetchInstances]);

  // ──────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────
  useEffect(() => {
    fetchInstances();
    subscribeToInstances();

    return () => {
      if (instancesChannelRef.current) supabase.removeChannel(instancesChannelRef.current);
      if (qrChannelRef.current) supabase.removeChannel(qrChannelRef.current);
    };
  }, [profile?.organization_id]);

  // ──────────────────────────────────────────────
  // Criar Instância
  // ──────────────────────────────────────────────
  const createInstance = async () => {
    if (!newInstanceName.trim()) return;
    setCreating(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl('/api/whatsapp/instances'), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newInstanceName.trim() }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Erro ao criar instância');
      setShowNewModal(false);
      setNewInstanceName('');
      fetchInstances();
    } catch (error: any) {
      console.error('[WhatsAppInstances] Erro ao criar:', error);
      alert(error.message || 'Erro ao criar instância');
    } finally {
      setCreating(false);
    }
  };

  // ──────────────────────────────────────────────
  // Conectar Instância
  // ──────────────────────────────────────────────
  const connectInstance = async (instance: WhatsAppInstance) => {
    setConnectingId(instance.id);
    setQrLoading(true);
    setQrModal({ instance, qrCode: null });

    // Subscreve ao canal de QR ANTES de chamar connect
    // (garante que não perde o evento)
    subscribeToQR(instance.id);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/whatsapp/instances/${instance.id}/connect`), {
        method: 'POST',
        headers,
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Falha ao iniciar conexão');
      }

      // Se já está conectado (socket vivo), fecha modal imediatamente
      if (data.status === 'connected' && data.socketAlive) {
        setQrModal(null);
        setQrLoading(false);
        setConnectingId(null);
        fetchInstances();
        return;
      }

      // Se está reconectando, atualiza o estado local
      if (data.status === 'reconnecting') {
        setQrLoading(true); // Mantém loading, Realtime vai notificar
      }
    } catch (error: any) {
      console.error('[WhatsAppInstances] Erro ao conectar:', error);
      setQrModal(null);
      setQrLoading(false);
      setConnectingId(null);
      alert(error.message || 'Erro ao conectar. Tente novamente.');
    }
  };

  // ──────────────────────────────────────────────
  // Desconectar Instância
  // ──────────────────────────────────────────────
  const disconnectInstance = async (instanceId: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(getApiUrl(`/api/whatsapp/instances/${instanceId}/disconnect`), {
        method: 'POST',
        headers,
      });
      fetchInstances();
    } catch (error) {
      console.error('[WhatsAppInstances] Erro ao desconectar:', error);
    }
  };

  // ──────────────────────────────────────────────
  // Excluir Instância
  // ──────────────────────────────────────────────
  const deleteInstance = async (id: string) => {
    if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(getApiUrl(`/api/whatsapp/instances/${id}`), {
        method: 'DELETE',
        headers,
      });
      setInstances(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('[WhatsAppInstances] Erro ao excluir:', error);
      alert('Erro ao excluir instância');
    }
  };

  // ──────────────────────────────────────────────
  // Fechar Modal de QR
  // ──────────────────────────────────────────────
  const closeQrModal = () => {
    setQrModal(null);
    setQrLoading(false);
    setConnectingId(null);
    // IMPORTANTE: Não cancela a subscription de QR aqui!
    // A conexão continua em background no servidor.
    // O Realtime vai notificar quando conectar.
  };

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <Smartphone className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Instâncias WhatsApp</h1>
            <p className="text-sm text-gray-500">{instances.length} instância(s) configurada(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchInstances}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Instância
          </button>
        </div>
      </div>

      {/* Lista de Instâncias */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : instances.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-14 text-center">
          <Smartphone className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma instância criada</h3>
          <p className="text-gray-500 mb-6">Crie sua primeira instância para começar a usar o WhatsApp</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Criar Primeira Instância
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => {
            const statusConfig = getStatusConfig(instance);
            const isConnected = instance.status === 'connected' && instance.socket_alive !== false;
            const isConnecting = connectingId === instance.id;

            return (
              <div
                key={instance.id}
                className={`bg-white rounded-2xl border-2 p-5 transition-all ${statusConfig.bg}`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isConnected ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      {isConnected
                        ? <Wifi className="w-6 h-6 text-emerald-600" />
                        : <WifiOff className="w-6 h-6 text-gray-500" />
                      }
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg leading-tight">{instance.name}</h3>
                      <p className="text-sm text-gray-500">
                        {instance.phone_number ? `+${instance.phone_number}` : 'Sem número vinculado'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteInstance(instance.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir instância"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-4 px-3 py-1.5 bg-white/70 rounded-lg w-fit">
                  {statusConfig.icon}
                  <span className={`text-sm font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Aviso de socket morto */}
                {instance.status === 'connected' && instance.socket_alive === false && (
                  <div className="flex items-center gap-2 mb-4 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Conexão perdida. Reconexão automática em andamento.
                    </p>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => window.location.href = '/chat'}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Abrir Chat
                      </button>
                      <button
                        onClick={() => disconnectInstance(instance.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => connectInstance(instance)}
                      disabled={isConnecting || ['connecting', 'reconnecting', 'authenticated'].includes(instance.status)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {isConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <QrCode className="w-4 h-4" />
                      )}
                      {['connecting', 'reconnecting'].includes(instance.status) ? 'Aguardando...' : 'Conectar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Nova Instância */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Nova Instância WhatsApp</h2>
            <p className="text-sm text-gray-500 mb-5">Cada instância conecta um número de WhatsApp diferente.</p>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome da instância</label>
            <input
              type="text"
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createInstance()}
              placeholder="Ex: Principal, Suporte, Vendas..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl mb-5 focus:ring-2 focus:ring-green-500 outline-none text-gray-800"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowNewModal(false); setNewInstanceName(''); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createInstance}
                disabled={creating || !newInstanceName.trim()}
                className="px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: QR Code */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              Conectar: {qrModal.instance.name}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Escaneie o QR Code com o WhatsApp do seu celular
            </p>

            {/* QR ou Spinner */}
            <div className="flex items-center justify-center mb-6 min-h-[256px]">
              {qrLoading && !qrModal.qrCode ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 animate-spin text-green-600" />
                  <p className="text-sm text-gray-500">Gerando QR Code...</p>
                </div>
              ) : qrModal.qrCode ? (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <img src={qrModal.qrCode} alt="QR Code WhatsApp" className="w-56 h-56" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 animate-spin text-green-600" />
                  <p className="text-sm text-gray-500">Aguardando QR...</p>
                </div>
              )}
            </div>

            {/* Instruções */}
            <div className="bg-gray-50 rounded-xl p-4 text-left mb-5">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Como conectar</p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Abra o WhatsApp no seu celular</li>
                <li>Toque em <strong>Dispositivos conectados</strong></li>
                <li>Toque em <strong>Conectar um dispositivo</strong></li>
                <li>Aponte a câmera para o QR Code acima</li>
              </ol>
            </div>

            <button
              onClick={closeQrModal}
              className="w-full px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Fechar (conexão continua em background)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppInstances;
