
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext'; // Assuming this provides organization_id via user logic or we fetch from profile
import { Plus, Trash2, RefreshCw, Smartphone, Globe, CheckCircle, SmartphoneNfc } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface Instance {
    id: string;
    name: string;
    status: string;
    server_url: string;
    created_at: string;
}

const WhatsAppSetup: React.FC = () => {
    const { user, profile } = useAuth();
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newInstanceName, setNewInstanceName] = useState('');
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [serviceStatus, setServiceStatus] = useState<{status: string, instances?: number} | null>(null);

    // Check Evolution Service Status
    const checkServiceStatus = async () => {
        try {
            const { data } = await axios.get('/api/evolution/webhook');
            if (data.status === 'online') {
                setServiceStatus({ 
                    status: data.evolution === 'connected' ? 'online' : 'partial',
                    instances: data.instancesCount 
                });
            }
        } catch (error) {
            setServiceStatus({ status: 'offline' });
        }
    };

    useEffect(() => {
        checkServiceStatus();
        const interval = setInterval(checkServiceStatus, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Fetch Organization ID and Slug
    useEffect(() => {
        const fetchOrg = async () => {
            if (!user || !profile) return;
            
            let orgId = profile.organization_id;
            let slug = 'instance';

            // If we have an override (impersonation), AuthContext already put it in profile.organization_id
            // But if it's still null (Super Admin default view), try to find a fallback
            if (!orgId && profile.role === 'superadmin') {
                 const { data: firstOrg } = await supabase.from('organizations').select('id, slug').limit(1).single();
                 if (firstOrg) {
                     orgId = firstOrg.id;
                     slug = firstOrg.slug;
                 }
            } else if (orgId) {
                 const { data: orgData } = await supabase.from('organizations').select('slug').eq('id', orgId).single();
                 if (orgData) slug = orgData.slug;
            }

            if (orgId) {
                setOrganizationId(orgId);
                setBaseSlug(slug); 
                setNewInstanceName(slug); // Default name
            } else {
                setLoading(false);
            }
        };
        fetchOrg();
    }, [user, profile]);

    // Trigger fetch when organizationId is set
    useEffect(() => {
        if (organizationId) {
            fetchInstances();
        }
    }, [organizationId]);

    const fetchInstances = async () => {
        if (!organizationId) return;
        try {
            setLoading(true);
            const { data } = await axios.get('/api/evolution/instances?organizationId=' + organizationId);
            if (data.success) {
                setInstances(data.instances);
            }
        } catch (error) {
            console.error('Erro ao buscar instâncias:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper state
    const [baseSlug, setBaseSlug] = useState('');
    const [qrCodeData, setQrCodeData] = useState<any>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [connectingInstance, setConnectingInstance] = useState<string | null>(null);

    const handleConnect = async (instanceName: string) => {
        if (!organizationId) return;
        
        try {
            setConnectingInstance(instanceName);
            const res = await axios.get(`/api/evolution/instances/${instanceName}/connect?organizationId=${organizationId}`);
            
            if (res.data.success) {
                const evoData = res.data.data;
                const evoInstance = evoData.instance || evoData;
                const state = evoInstance.state;
                
                if (state === 'open') {
                    alert('Instância já conectada!');
                    fetchInstances();
                } else if (evoData.qrcode) {
                    setQrCodeData({
                        base64: evoData.qrcode.base64,
                        pairingCode: evoData.qrcode.pairingCode,
                        instanceName: instanceName
                    });
                    setShowQrModal(true);
                } else if (evoData.base64) {
                     setQrCodeData({
                        base64: evoData.base64,
                        code: evoData.code,
                        instanceName: instanceName
                    });
                    setShowQrModal(true);
                } else {
                    alert('Nenhum QRCode retornado. Tente novamente em instantes.');
                }
            }
        } catch (error: any) {
            console.error('Erro ao conectar:', error);
            alert(`Erro ao tentar conectar: ${error.response?.data?.error || error.message}`);
        } finally {
            setConnectingInstance(null);
        }
    };

    const handleCreate = async () => {
        if (!organizationId) return;
        if (!newInstanceName.trim()) {
            alert('Por favor, informe um nome para a instância.');
            return;
        }

        try {
            setCreating(true);
            
            const nameToCreate = newInstanceName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
            
            const response = await axios.post('/api/evolution/instances', {
                instanceName: nameToCreate,
                organizationId: organizationId
            });

            if (response.data.success) {
                alert(`Instância "${nameToCreate}" criada com sucesso!`);
                await fetchInstances();
                handleConnect(nameToCreate);
            }
        } catch (error: any) {
            console.error('Erro ao criar:', error);
            alert(`Erro: ${error.response?.data?.error || error.message}`);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja apagar a instância "${name}"? Isso irá desconectar o WhatsApp.`)) return;

        try {
            await axios.delete(`/api/evolution/instances/${id}`);
            setInstances(prev => prev.filter(i => i.id !== id));
        } catch (error) {
            console.error('Erro ao deletar:', error);
            alert('Erro ao deletar instância');
        }
    };

    const handleLogout = async (instanceName: string) => {
        if (!confirm(`Tem certeza que deseja desconectar "${instanceName}"?`)) return;
        try {
            await axios.post(`/api/evolution/instances/${instanceName}/logout`, { organizationId });
            alert('Desconectado com sucesso!');
            fetchInstances();
        } catch (error) {
            console.error('Erro ao desconectar:', error);
            alert('Erro ao desconectar');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <SmartphoneNfc className="text-indigo-600" size={32} />
                        <h1 className="text-3xl font-bold text-gray-900">Conexões WhatsApp</h1>
                    </div>
                    <p className="text-gray-600">Gerencie suas conexões com a Evolution API. Configure seu WhatsApp para automações.</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm self-start md:self-auto">
                    <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                        serviceStatus?.status === 'online' ? 'bg-green-500' : 
                        serviceStatus?.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Servidor: {
                            serviceStatus?.status === 'online' ? 'Conectado' : 
                            serviceStatus?.status === 'partial' ? 'Falha na API' : 
                            serviceStatus?.status === 'offline' ? 'Offline' : 'Verificando...'
                        }
                    </span>
                </div>
            </div>

            {/* Create New */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Instância</label>
                        <input 
                            type="text" 
                            value={newInstanceName}
                            onChange={(e) => setNewInstanceName(e.target.value)}
                            placeholder="Ex: atendimento-comercial"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <button 
                        onClick={handleCreate}
                        disabled={creating || !organizationId || !newInstanceName}
                        className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-[42px] min-w-[180px]"
                    >
                        {creating ? <RefreshCw className="animate-spin" size={20} /> : <Plus size={20} />}
                        {creating ? 'Criando...' : 'Criar Instância'}
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold">Use letras, números e hífens apenas.</p>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    <div className="col-span-2 text-center py-8 text-gray-500">Carregando...</div>
                ) : instances.length === 0 ? (
                    <div className="col-span-2 text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <Smartphone className="mx-auto text-gray-400 mb-3" size={48} />
                        <p className="text-gray-500">Nenhuma conexão ativa.</p>
                    </div>
                ) : (
                    instances
                        .filter(instance => ['fazendasbrasil', 'fazendas'].includes(instance.name.toLowerCase()))
                        .map(instance => (
                        <div key={instance.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 relative group">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{instance.name}</h3>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                        instance.status === 'open' ? 'bg-green-100 text-green-800' : 
                                        instance.status === 'connecting' ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {instance.status.toUpperCase()}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => handleDelete(instance.id, instance.name)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Deletar Conexão"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Globe size={14} className="text-gray-400" />
                                    <span className="truncate max-w-[250px]">{instance.server_url}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={14} className="text-green-500" />
                                    <span>Webhook Configurado</span>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                                {instance.status === 'open' ? (
                                     <button 
                                        onClick={() => handleLogout(instance.name)}
                                        className="flex-1 py-1.5 text-xs font-medium text-center bg-red-50 hover:bg-red-100 rounded text-red-700 border border-red-200"
                                     >
                                        Desconectar
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => handleConnect(instance.name)}
                                            disabled={connectingInstance === instance.name}
                                            className="flex-1 py-1.5 text-xs font-medium text-center bg-blue-50 hover:bg-blue-100 rounded text-blue-700 border border-blue-200 flex justify-center items-center gap-2"
                                        >
                                            {connectingInstance === instance.name ? <RefreshCw className="animate-spin" size={14}/> : null}
                                            Ver QR Code
                                        </button>
                                        <button 
                                            onClick={() => handleConnect(instance.name)} // Same functionality for now, retry connection
                                            className="flex-1 py-1.5 text-xs font-medium text-center bg-gray-50 hover:bg-gray-100 rounded text-gray-700 border border-gray-200"
                                        >
                                            Reconectar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* QR Code Modal */}
            {showQrModal && qrCodeData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in duration-200">
                         <h3 className="text-xl font-bold text-gray-900 mb-2">Escaneie o QR Code</h3>
                         <p className="text-sm text-gray-500 mb-4">Abra o WhatsApp no seu celular &gt; Configurações &gt; Aparelhos conectados &gt; Conectar aparelho</p>
                         
                         <div className="bg-white p-2 border border-gray-200 rounded-lg inline-block mb-4">
                            {qrCodeData.base64 ? (
                                <img src={qrCodeData.base64} alt="QR Code WhatsApp" className="w-64 h-64 object-contain" />
                            ) : (
                                <div className="w-64 h-64 flex items-center justify-center bg-gray-100 text-gray-500">
                                    Sem Imagem
                                </div>
                            )}
                         </div>

                         {qrCodeData.pairingCode && (
                             <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                                 <p className="text-xs text-gray-500 mb-1">Código de Pareamento (Alternativo)</p>
                                 <p className="text-lg font-mono font-bold tracking-widest">{qrCodeData.pairingCode}</p>
                             </div>
                         )}

                         <div className="flex gap-2 justify-center">
                             <button
                                onClick={() => {
                                    setShowQrModal(false);
                                    setQrCodeData(null);
                                    fetchInstances(); // Refresh status check
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                             >
                                Fechar
                             </button>
                             <button
                                onClick={() => {
                                    handleConnect(qrCodeData.instanceName); // Refresh QR Code
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                             >
                                Atualizar QR
                             </button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppSetup;
