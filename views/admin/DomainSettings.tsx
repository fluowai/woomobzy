import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../../context/SettingsContext';
import {
  Globe,
  Plus,
  Check,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Info,
  Copy,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { getApiUrl } from '../../src/lib/api';

interface DomainData {
  name: string;
  status: 'pending' | 'verifying' | 'verified' | 'active';
  verified: boolean;
  dnsRecords?: {
    type: string;
    name: string;
    value: string;
    ttl: number;
    instructions?: {
      pt?: string[];
    };
  };
  provisioned?: boolean;
}

const DomainSettings: React.FC = () => {
  const { settings } = useSettings();

  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<DomainData | null>(null);
  const [error, setError] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showDnsModal, setShowDnsModal] = useState(false);
  const verifyIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchCurrentDomain();
    return () => {
      if (verifyIntervalRef.current) clearInterval(verifyIntervalRef.current);
    };
  }, []);

  // Auto-verify domain every 10 seconds if pending
  useEffect(() => {
    if (currentDomain && !currentDomain.verified && !verifyingDomain) {
      verifyIntervalRef.current = setInterval(() => {
        checkVerification(currentDomain.name, retryCount + 1);
      }, 10000); // 10 seconds

      return () => {
        if (verifyIntervalRef.current) clearInterval(verifyIntervalRef.current);
      };
    }
  }, [currentDomain, verifyingDomain, retryCount]);

  const fetchCurrentDomain = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);

        const { data: org } = await supabase
          .from('organizations')
          .select('custom_domain')
          .eq('id', profile.organization_id)
          .single();

        if (org?.custom_domain) {
          checkVerification(org.custom_domain);
        }
      }
    } catch (e) {
      console.error('Error fetching domain:', e);
    }
  };

  const checkVerification = async (domainName: string, retries = 0) => {
    setVerifyingDomain(true);
    try {
      const res = await fetch(
        getApiUrl(`/api/domains/verify/${domainName}?retries=${retries}`)
      );
      const data = await res.json();

      if (!data.success && res.status === 404) {
        setCurrentDomain(null);
        return;
      }

      setCurrentDomain({
        name: domainName,
        status: data.status || (data.verified ? 'verified' : 'pending'),
        verified: data.verified || false,
        dnsRecords: data.dnsRecords,
        provisioned: true,
      });

      setRetryCount(retries);

      // If verified, stop polling
      if (data.verified) {
        if (verifyIntervalRef.current) clearInterval(verifyIntervalRef.current);
      }
    } catch (e) {
      console.error('Error verifying:', e);
      setCurrentDomain((prev) =>
        prev ? { ...prev, status: 'pending' } : null
      );
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleAddDomain = async () => {
    if (!domain) return;
    const domainRegex =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
    if (!domainRegex.test(domain)) {
      setError('Domínio inválido. Ex: www.meusite.com.br');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(getApiUrl('/api/domains'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, organizationId }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCurrentDomain({
        name: data.domain.name || domain,
        status: 'pending',
        verified: false,
        dnsRecords: data.domain.dnsRecords,
        provisioned: true,
      });

      setDomain('');
      setShowDnsModal(true);
      setRetryCount(0);

      // Start polling
      setTimeout(() => {
        checkVerification(data.domain.name || domain);
      }, 2000);
    } catch (e: any) {
      setError(e.message || 'Erro ao adicionar domínio');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Tem certeza? Isso irá tirar o site do ar neste domínio.'))
      return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/domains'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: currentDomain?.name, organizationId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCurrentDomain(null);
      if (verifyIntervalRef.current) clearInterval(verifyIntervalRef.current);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">
              Domínio Personalizado
            </h2>
            <p className="text-xs text-gray-500">
              Conecte seu próprio domínio (ex: www.suaimobiliaria.com.br)
            </p>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {!currentDomain ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Adicionar Domínio
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ex: www.suaimobiliaria.com.br"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value.toLowerCase())}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={handleAddDomain}
                  disabled={loading || !domain}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    'Provisioning...'
                  ) : (
                    <>
                      <Plus size={18} /> Provisionar
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Recomendamos usar <b>www</b>.meusite.com.br para melhor
                compatibilidade.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                <div className="flex items-center gap-3">
                  {currentDomain.verified ? (
                    <CheckCircle className="text-green-500" size={24} />
                  ) : (
                    <Clock className="text-yellow-500 animate-spin" size={24} />
                  )}
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                      {currentDomain.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          currentDomain.verified
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                        }`}
                      >
                        {currentDomain.verified ? (
                          <>
                            <Check size={12} className="inline mr-1" />
                            Ativo & Verificado
                          </>
                        ) : (
                          <>
                            <Clock size={12} className="inline mr-1" />
                            Aguardando Verificação...
                          </>
                        )}
                      </span>
                      {!currentDomain.verified && (
                        <button
                          onClick={() => checkVerification(currentDomain.name)}
                          disabled={verifyingDomain}
                          className="text-xs text-indigo-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                        >
                          <RefreshCw
                            size={10}
                            className={verifyingDomain ? 'animate-spin' : ''}
                          />
                          {verifyingDomain
                            ? 'Verificando...'
                            : 'Verificar Agora'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleRemove}
                  className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {!currentDomain.verified && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
                  <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <Info size={16} /> Verificação DNS Pendente
                  </h4>
                  <p className="text-blue-700 mb-4">
                    Configure o DNS do seu domínio para que possamos verificar a
                    propriedade:
                  </p>

                  {currentDomain.dnsRecords && (
                    <div className="bg-white p-4 rounded border border-blue-200">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase">
                            Tipo de Registro
                          </label>
                          <div className="flex items-center justify-between mt-1 p-2 bg-gray-50 rounded">
                            <code className="font-mono text-sm font-bold">
                              {currentDomain.dnsRecords.type}
                            </code>
                            <button
                              onClick={() =>
                                copyToClipboard(currentDomain.dnsRecords!.type)
                              }
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase">
                            Nome do Registro
                          </label>
                          <div className="flex items-center justify-between mt-1 p-2 bg-gray-50 rounded">
                            <code className="font-mono text-sm">
                              {currentDomain.dnsRecords.name}
                            </code>
                            <button
                              onClick={() =>
                                copyToClipboard(currentDomain.dnsRecords!.name)
                              }
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase">
                            Valor / Alvo
                          </label>
                          <div className="flex items-center justify-between mt-1 p-2 bg-gray-50 rounded">
                            <code className="font-mono text-sm break-all">
                              {currentDomain.dnsRecords.value}
                            </code>
                            <button
                              onClick={() =>
                                copyToClipboard(currentDomain.dnsRecords!.value)
                              }
                              className="text-indigo-600 hover:text-indigo-700 flex-shrink-0 ml-2"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowDnsModal(true)}
                    className="mt-4 w-full px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200 transition-colors"
                  >
                    📋 Ver Instruções Completas
                  </button>

                  {retryCount > 0 && (
                    <p className="text-xs text-gray-500 mt-3">
                      ✓ Tentativa {retryCount} de verificação em andamento...
                    </p>
                  )}
                </div>
              )}

              {currentDomain.verified && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-sm flex items-center gap-3">
                  <CheckCircle className="text-green-600" size={20} />
                  <div>
                    <h4 className="font-bold text-green-800">
                      Domínio Verificado!
                    </h4>
                    <p className="text-green-700 text-xs">
                      Seu domínio está ativo e funcionando. SSL será ativado em
                      breve.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DNS Instructions Modal */}
      {showDnsModal && currentDomain?.dnsRecords && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                📋 Instruções para Configurar DNS
              </h3>
              <button
                onClick={() => setShowDnsModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-bold text-gray-800 mb-3">Seu Domínio:</h4>
                <code className="text-lg font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded block">
                  {currentDomain.name}
                </code>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h5 className="font-bold text-blue-800 mb-2">
                  📌 Passo a Passo:
                </h5>
                <ol className="space-y-2 text-blue-700 text-sm">
                  {currentDomain.dnsRecords.instructions?.pt?.map(
                    (instruction, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="font-bold flex-shrink-0">
                          {idx + 1}.
                        </span>
                        <span>{instruction}</span>
                      </li>
                    )
                  ) || [
                    <li key="1" className="flex gap-3">
                      <span className="font-bold">1.</span>
                      <span>
                        Abra o painel de configurações da sua empresa de
                        domínios
                      </span>
                    </li>,
                    <li key="2" className="flex gap-3">
                      <span className="font-bold">2.</span>
                      <span>
                        Procure pela seção "DNS Records" ou "Registros de DNS"
                      </span>
                    </li>,
                    <li key="3" className="flex gap-3">
                      <span className="font-bold">3.</span>
                      <span>
                        Clique em "Adicionar Registro" ou "Add Record"
                      </span>
                    </li>,
                    <li key="4" className="flex gap-3">
                      <span className="font-bold">4.</span>
                      <span>Preencha os campos abaixo e salve</span>
                    </li>,
                  ]}
                </ol>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h5 className="font-bold text-gray-800 mb-3">
                  Registro DNS a Criar:
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-mono font-bold">
                      {currentDomain.dnsRecords.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                    <span className="text-gray-600">Nome:</span>
                    <span className="font-mono font-bold">
                      {currentDomain.dnsRecords.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                    <span className="text-gray-600">Valor:</span>
                    <span className="font-mono font-bold text-indigo-600">
                      {currentDomain.dnsRecords.value}
                    </span>
                  </div>
                  {currentDomain.dnsRecords.ttl && (
                    <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                      <span className="text-gray-600">TTL:</span>
                      <span className="font-mono">
                        {currentDomain.dnsRecords.ttl}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm">
                <h5 className="font-bold text-yellow-800 mb-2">
                  ⏳ Tempo de Propagação
                </h5>
                <p className="text-yellow-700">
                  As alterações de DNS podem levar{' '}
                  <strong>5 a 15 minutos</strong> para se propagarem. Não se
                  preocupe se a verificação não funcionar imediatamente. Clique
                  no botão "Verificar Agora" após alguns minutos.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDnsModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    checkVerification(currentDomain.name);
                    setShowDnsModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  Verificar Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DomainSettings;
