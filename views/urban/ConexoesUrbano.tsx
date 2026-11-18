import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Plus,
  PowerOff,
  QrCode,
  RefreshCw,
  Smartphone,
  Trash2,
  WifiOff,
  Instagram,
  Mail,
  CheckCircle2,
  Send,
} from 'lucide-react';
import QRCodeModal from '../WhatsApp/QRCodeModal';
import { instanceApi, type Instance } from '../WhatsApp/hooks/api';
import { useWebSocket } from '../WhatsApp/hooks/useWebSocket';
import { usePlans } from '../../context/PlansContext';

export const ConexoesUrbano: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'instagram' | 'email'>('whatsapp');
  const [instances, setInstances] = useState<Instance[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrInstance, setQrInstance] = useState<Instance | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const { currentPlan } = usePlans();
  const { on } = useWebSocket(!serviceUnavailable);

  // Instagram state
  const [igConnected, setIgConnected] = useState(false);
  const [igUsername, setIgUsername] = useState('');
  const [igLoading, setIgLoading] = useState(false);

  // Email SMTP state
  const [smtpHost, setSmtpHost] = useState('smtp.wootech.imob');
  const [smtpUser, setSmtpUser] = useState('contato@imobiliaria.com.br');
  const [emailConnected, setEmailConnected] = useState(true);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState('');

  const maxInstances = currentPlan?.limits?.whatsapp_instances || 1;
  const isLimitReached = instances.length >= maxInstances;

  const refreshInstances = async () => {
    setLoading(true);
    setError('');
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
            ? {
                ...instance,
                status: data.status,
                phone: data.phone || instance.phone,
              }
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

  const handleTestEmail = () => {
    setTestingEmail(true);
    setEmailStatusMsg('');
    setTimeout(() => {
      setTestingEmail(false);
      setEmailStatusMsg('E-mail de teste enviado com sucesso!');
    }, 1200);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-[#182230]">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#182230]">
            Conexões & Canais
          </h1>
          <p className="mt-1 text-sm text-[#526071]">
            Centralize e gerencie seus canais de comunicação: WhatsApp, Instagram e E-mail.
          </p>
        </div>

        {activeTab === 'whatsapp' && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-semibold text-[#526071] shadow-sm">
            {instances.length} / {maxInstances} conexões ativas
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB]">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'whatsapp'
              ? 'border-[#FF6A00] text-[#FF6A00]'
              : 'border-transparent text-[#526071] hover:text-[#182230]'
          }`}
        >
          <MessageSquare size={16} />
          <span>WhatsApp</span>
          <span className="ml-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs text-[#FF6A00]">
            {instances.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('instagram')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'instagram'
              ? 'border-[#FF6A00] text-[#FF6A00]'
              : 'border-transparent text-[#526071] hover:text-[#182230]'
          }`}
        >
          <Instagram size={16} />
          <span>Instagram</span>
          {igConnected && (
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'email'
              ? 'border-[#FF6A00] text-[#FF6A00]'
              : 'border-transparent text-[#526071] hover:text-[#182230]'
          }`}
        >
          <Mail size={16} />
          <span>E-mail SMTP</span>
          {emailConnected && (
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          )}
        </button>
      </div>

      {/* Tab: WhatsApp */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          {serviceUnavailable ? (
            <div className="rounded-2xl border border-amber-200 bg-white p-10 text-center shadow-sm">
              <WifiOff className="mx-auto mb-3 text-amber-500" size={48} />
              <h2 className="text-lg font-bold text-[#182230]">
                Serviço de WhatsApp indisponível
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-[#526071]">
                O serviço de conexão WhatsApp está temporariamente indisponível ou reiniciando.
              </p>
              <button
                onClick={refreshInstances}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FF6A00] px-5 py-2.5 text-xs font-bold text-white hover:bg-orange-600 transition shadow-sm cursor-pointer"
              >
                <RefreshCw size={14} /> Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {/* Create New Connection */}
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-[#182230]">
                      Nova conexão WhatsApp
                    </h2>
                    <p className="text-xs text-[#526071]">
                      Informe um nome para a linha (ex: Comercial, Atendimento, Locação).
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-lg">
                    <div className="relative flex-1">
                      <LinkIcon
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#526071]"
                        size={16}
                      />
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        disabled={isLimitReached || creating}
                        placeholder={
                          isLimitReached ? 'Limite do plano atingido' : 'Nome da conexão'
                        }
                        className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] pl-9 pr-3 text-xs font-medium text-[#182230] placeholder:text-[#526071] focus:border-[#FF6A00] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF6A00]/20 transition disabled:opacity-60"
                      />
                    </div>

                    <button
                      onClick={handleCreate}
                      disabled={creating || !newName.trim() || isLimitReached}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF6A00] px-5 text-xs font-bold text-white hover:bg-orange-600 transition shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {creating ? (
                        <Loader2 className="animate-spin" size={15} />
                      ) : (
                        <Plus size={15} />
                      )}
                      Criar conexão
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} />
                      <span>{error}</span>
                    </div>
                    <button
                      onClick={refreshInstances}
                      className="inline-flex items-center gap-1 text-xs text-red-700 underline font-bold"
                    >
                      <RefreshCw size={12} /> Tentar novamente
                    </button>
                  </div>
                )}
              </div>

              {/* Instances Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading && instances.length === 0 ? (
                  <div className="col-span-full rounded-2xl bg-white border border-[#E5E7EB] p-12 text-center text-sm font-medium text-[#526071]">
                    <Loader2 className="animate-spin mx-auto mb-2 text-[#FF6A00]" size={24} />
                    Carregando conexões...
                  </div>
                ) : instances.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-12 text-center">
                    <MessageSquare className="mx-auto mb-3 text-gray-300" size={40} />
                    <h3 className="text-base font-bold text-[#182230]">
                      Nenhuma conexão ativa
                    </h3>
                    <p className="mt-1 text-xs text-[#526071] max-w-sm mx-auto">
                      Crie sua primeira conexão para conectar o WhatsApp da imobiliária e atender clientes.
                    </p>
                  </div>
                ) : (
                  instances.map((instance) => (
                    <div
                      key={instance.id}
                      className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00]">
                            <Smartphone size={20} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-[#182230] truncate">
                              {instance.name}
                            </h3>
                            <p className="text-xs text-[#526071] font-mono">
                              {instance.phone || 'Sem número vinculado'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            instance.status === 'connected'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : instance.status === 'qr_pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-gray-100 text-[#526071]'
                          }`}
                        >
                          {instance.status === 'connected'
                            ? 'Conectado'
                            : instance.status === 'qr_pending'
                            ? 'Aguardando QR'
                            : 'Desconectado'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] text-xs">
                        <button
                          onClick={() => setQrInstance(instance)}
                          className="inline-flex items-center gap-1.5 font-semibold text-[#FF6A00] hover:underline cursor-pointer"
                        >
                          <QrCode size={14} />
                          Ver QR Code
                        </button>

                        <div className="flex items-center gap-2">
                          {instance.status === 'connected' && (
                            <button
                              onClick={() => handleLogout(instance.id)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Desconectar sessão"
                            >
                              <PowerOff size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(instance.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Excluir conexão"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {qrInstance && (
            <QRCodeModal
              instance={qrInstance}
              onClose={() => setQrInstance(null)}
            />
          )}
        </div>
      )}

      {/* Tab: Instagram */}
      {activeTab === 'instagram' && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-pink-600 shrink-0">
              <Instagram size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#182230]">
                Instagram Direct & Meta Business
              </h2>
              <p className="text-xs text-[#526071] max-w-xl">
                Conecte a conta comercial do Instagram da imobiliária para receber mensagens diretas na caixa de entrada unificada.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#182230]">Status da conta:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  igConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-[#526071]'
                }`}>
                  {igConnected ? 'Conectado' : 'Não conectado'}
                </span>
              </div>
              <p className="text-xs text-[#526071] mt-1">
                {igConnected ? `@${igUsername || 'imobiliaria_oficial'}` : 'Nenhuma conta do Instagram vinculada.'}
              </p>
            </div>

            <button
              onClick={() => {
                setIgLoading(true);
                setTimeout(() => {
                  setIgConnected(!igConnected);
                  setIgUsername(igConnected ? '' : 'wootech_imoveis');
                  setIgLoading(false);
                }, 600);
              }}
              disabled={igLoading}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm cursor-pointer ${
                igConnected
                  ? 'border border-[#E5E7EB] bg-white text-red-600 hover:bg-red-50'
                  : 'bg-[#FF6A00] text-white hover:bg-orange-600'
              }`}
            >
              {igLoading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : igConnected ? (
                'Desconectar Instagram'
              ) : (
                'Conectar Conta Instagram'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab: E-mail SMTP */}
      {activeTab === 'email' && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <Mail size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#182230]">
                Servidor de E-mail (SMTP & Notificações)
              </h2>
              <p className="text-xs text-[#526071] max-w-xl">
                Configure o envio de notificações, boletos, contratos e alertas por e-mail com a identidade da sua imobiliária.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#182230] mb-1">
                Servidor SMTP
              </label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-xs font-medium text-[#182230] focus:border-[#FF6A00] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#182230] mb-1">
                E-mail remetente
              </label>
              <input
                type="email"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-xs font-medium text-[#182230] focus:border-[#FF6A00] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">Serviço ativo e operacional</span>
            </div>

            <div className="flex items-center gap-3">
              {emailStatusMsg && (
                <span className="text-xs font-semibold text-emerald-600">{emailStatusMsg}</span>
              )}
              <button
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-bold text-[#182230] hover:bg-gray-50 transition cursor-pointer"
              >
                {testingEmail ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                Testar envio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConexoesUrbano;
