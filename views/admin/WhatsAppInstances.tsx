import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../src/lib/api';

interface WhatsAppInstance {
  id: string;
  name: string;
  phone_number: string | null;
  status: 'pending' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  created_at: string;
}

const WhatsAppInstances: React.FC = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const { profile } = useAuth();
  
  // Explicitly using React.useRef to avoid any resolution issues
  const subscriptionRef = React.useRef<any>(null);

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstances(data || []);
    } catch (error) {
      console.error('Error fetching instances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
    
    // Assinatura global para mudanças de status nas instâncias
    const channel = supabase
      .channel('instances-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_instances',
        filter: `organization_id=eq.${profile?.organization_id}`
      }, () => {
        fetchInstances();
      })
      .subscribe();

    // Auto-start Realtime for instances that are already connecting/reconnecting
    instances.forEach(inst => {
      if (inst.status === 'connecting' || inst.status === 'reconnecting') {
        startRealtimeQR(inst.id);
      }
    });

    return () => {
      supabase.removeChannel(channel);
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    };
  }, [profile?.organization_id]);

  const createInstance = async () => {
    if (!newInstanceName.trim()) return;
    
    setCreating(true);
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .insert({ 
          name: newInstanceName.trim(),
          organization_id: profile?.organization_id 
        });

      if (error) throw error;
      
      setShowNewModal(false);
      setNewInstanceName('');
      fetchInstances();
    } catch (error) {
      console.error('Error creating instance:', error);
      alert('Erro ao criar instância');
    } finally {
      setCreating(false);
    }
  };

  const deleteInstance = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta instância?')) return;

    try {
      await supabase.from('whatsapp_instances').delete().eq('id', id);
      fetchInstances();
    } catch (error) {
      console.error('Error deleting instance:', error);
      alert('Erro ao excluir instância');
    }
  };

  const connectInstance = async (instance: WhatsAppInstance) => {
    setSelectedInstance(instance);
    setQrCode(null);
    setQrLoading(true);

    try {
      const response = await fetch(getApiUrl(`/api/whatsapp/instances/${instance.id}/connect`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      });

      const data = await response.json();
      
      // Inicia o Realtime imediatamente, pois o QR Code será gravado no banco pelo backend
      startRealtimeQR(instance.id);
      
      if (data.status === 'connected') {
        setSelectedInstance({ ...instance, status: 'connected', phone_number: data.phoneNumber });
        fetchInstances();
      }
    } catch (error) {
      console.error('Error connecting:', error);
      alert('Erro ao conectar');
    } finally {
      // Mantemos o loading até o primeiro QR chegar via Realtime ou timeout
      // setQrLoading(false); 
    }
  };

  const startRealtimeQR = (instanceId: string) => {
    if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    
    subscriptionRef.current = supabase
      .channel(`instance-qr-${instanceId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_instances',
        filter: `id=eq.${instanceId}`
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.qr_code) {
          setQrCode(updated.qr_code);
          setQrLoading(false); // Para o spinner quando o QR chegar
        }
        if (updated.status === 'connected') {
          setQrCode(null);
          setSelectedInstance(null);
          setQrLoading(false);
          fetchInstances();
          if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
        }
      })
      .subscribe();
  };

  const disconnectInstance = async (id: string) => {
    try {
      await fetch(getApiUrl(`/api/whatsapp/instances/${id}/disconnect`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      });
      fetchInstances();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'connecting':
      case 'reconnecting':
        return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando...';
      case 'reconnecting': return 'Reconectando...';
      case 'disconnected': return 'Desconectado';
      case 'pending': return 'Aguardando';
      default: return status;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Smartphone className="w-8 h-8 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-800">Instâncias WhatsApp</h1>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-5 h-5" />
          Nova Instância
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : instances.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Smartphone className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhuma instância</h3>
          <p className="text-gray-500 mb-4">Crie sua primeira instância WhatsApp para começar</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Criar Instância
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => (
            <div key={instance.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${instance.status === 'connected' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Smartphone className={`w-6 h-6 ${instance.status === 'connected' ? 'text-green-600' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{instance.name}</h3>
                    <p className="text-sm text-gray-500">
                      {instance.phone_number || 'Não conectado'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteInstance(instance.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {getStatusIcon(instance.status)}
                <span className="text-sm font-medium">{getStatusText(instance.status)}</span>
              </div>

              <div className="flex gap-2">
                {instance.status === 'connected' ? (
                  <>
                    <button
                      onClick={() => window.location.href = '/chat'}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat
                    </button>
                    <button
                      onClick={() => disconnectInstance(instance.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                    >
                      <XCircle className="w-4 h-4" />
                      Desconectar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => connectInstance(instance)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <QrCode className="w-4 h-4" />
                    Conectar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Nova Instância WhatsApp</h2>
            <input
              type="text"
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              placeholder="Nome da instância (ex: principal, secundario)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-green-500 outline-none"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={createInstance}
                disabled={creating || !newInstanceName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInstance && (qrCode || qrLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
            <h2 className="text-xl font-bold mb-2">Conectar {selectedInstance.name}</h2>
            <p className="text-gray-600 mb-4">Escaneie o QR Code com seu WhatsApp</p>
            
            {qrLoading && !qrCode ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
              </div>
            ) : qrCode ? (
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              </div>
            ) : null}

            <p className="text-sm text-gray-500 mb-4">
              1. Abra o WhatsApp no seu celular<br />
              2. Toque em Menu ou Configurações<br />
              3. Toque em WhatsApp Web<br />
              4. Aponte a câmera para o QR Code
            </p>

            <button
              onClick={() => {
                setSelectedInstance(null);
                setQrCode(null);
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppInstances;
