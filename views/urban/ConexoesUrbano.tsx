import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Link,
  Loader2,
  MessageSquare,
  Plus,
  PowerOff,
  QrCode,
  RefreshCw,
  Smartphone,
  Trash2,
  WifiOff,
} from 'lucide-react';
import QRCodeModal from '../WhatsApp/QRCodeModal';
import { instanceApi, type Instance } from '../WhatsApp/hooks/api';
import { useWebSocket } from '../WhatsApp/hooks/useWebSocket';
import { usePlans } from '../../context/PlansContext';

const ConexoesUrbano: React.FC = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrInstance, setQrInstance] = useState<Instance | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const { currentPlan } = usePlans();
  const { on } = useWebSocket(!serviceUnavailable);

  const maxInstances = currentPlan?.limits?.whatsapp_instances || 1;
  const isLimitReached = instances.length >= maxInstances;

  const refreshInstances = async () => {
    setLoading(true);
    try {
      const data = await instanceApi.list();
      setInstances(data || []);
      setServiceUnavailable(false);
    } catch (err: any) {
      if (err?.message?.includes('WHATSAPP_UNAVAILABLE')) {
        setServiceUnavailable(true);
      } else {
        setError(err.message || 'Erro ao carregar conexões.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshInstances();
  }, []);

  useEffect(() => {
    const unsubStatus = on('instance_status', (data: any) => {
      setInstances((prev) =>
        prev.map((instance) =>
          instance.id === data.instance_id
            ? { ...instance, status: data.status, phone: data.phone || instance.phone }
            : instance
        )
      );
      if (data.status === 'connected') refreshInstances();
    });

    const unsubQr = on('qr_code', (data: any) => {
      setInstances((prev) =>
        prev.map((instance) =>
          instance.id === data.instance_id
            ? { ...instance, status: 'qr_pending', qr_code: data.qr_code }
            : instance
        )
      );
    });

    return () => {
      unsubStatus();
      unsubQr();
    };
  }, [on]);

  const handleCreate = async () => {
    if (isLimitReached) {
      setError(`Limite de conexões atingido (${maxInstances}).`);
      return;
    }
    if (!newName.trim()) {
      setError('Informe um nome para a conexão.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const instance = await instanceApi.create(newName.trim());
      setInstances((prev) => [instance, ...prev]);
      setNewName('');
      setQrInstance(instance);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conexão.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta conexão?')) return;
    await instanceApi.delete(id);
    setInstances((prev) => prev.filter((instance) => instance.id !== id));
  };

  const handleLogout = async (id: string) => {
    await instanceApi.logout(id);
    refreshInstances();
  };

  if (serviceUnavailable) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold uppercase italic tracking-tighter text-slate-950">Conexões Urbanas</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">WhatsApp, atendimento e automação comercial.</p>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-white p-12 text-center shadow-sm">
          <WifiOff className="mx-auto mb-4 text-amber-500" size={54} />
          <h2 className="text-xl font-bold text-slate-950">Serviço de WhatsApp indisponível</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            O painel urbano está pronto para gerenciar conexões, mas o serviço WhatsApp precisa estar online.
          </p>
          <button onClick={refreshInstances} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white">
            <RefreshCw size={16} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase italic tracking-tighter text-slate-950">Conexões Urbanas</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Gerencie WhatsApp, atendimento, QR Code e automações da imobiliária urbana.
          </p>
        </div>
        <div className="rounded-2xl bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 shadow-sm ring-1 ring-slate-200">
          {instances.length} / {maxInstances} conexões
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr_auto] lg:items-center">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-950">Nova conexão</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">Use nomes como Atendimento, Vendas ou Locação.</p>
          </div>
          <div className="relative">
            <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleCreate()}
              disabled={isLimitReached}
              placeholder={isLimitReached ? 'Limite do plano atingido' : 'Nome da conexão'}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-300"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim() || isLimitReached}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50"
          >
            {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Criar
          </button>
        </div>
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading && instances.length === 0 ? (
          <div className="col-span-full rounded-3xl bg-white p-12 text-center text-sm font-bold text-slate-400">
            Carregando conexões...
          </div>
        ) : instances.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <MessageSquare className="mx-auto mb-3 text-slate-300" size={46} />
            <h3 className="text-lg font-bold text-slate-950">Nenhuma conexão ativa</h3>
            <p className="mt-1 text-sm text-slate-500">Crie sua primeira conexão para atender leads urbanos pelo WhatsApp.</p>
          </div>
        ) : (
          instances.map((instance) => (
            <div key={instance.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Smartphone size={22} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-950">{instance.name}</p>
                    <p className="text-xs font-bold text-slate-400">{instance.phone ? `+${instance.phone}` : 'Sem telefone conectado'}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${instance.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {instance.status === 'connected' ? 'Ativo' : 'Pendente'}
                </span>
              </div>

              <div className="flex gap-2">
                {instance.status === 'connected' ? (
                  <button onClick={() => handleLogout(instance.id)} className="flex-1 rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-600">
                    <PowerOff className="inline" size={15} /> Desconectar
                  </button>
                ) : (
                  <button onClick={() => setQrInstance(instance)} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white">
                    <QrCode className="inline" size={15} /> QR Code
                  </button>
                )}
                <button onClick={() => handleDelete(instance.id)} className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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

export default ConexoesUrbano;
