
import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { Globe, Plus, Check, AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/supabase';

const DomainSettings: React.FC = () => {
    const { settings } = useSettings(); 
    
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentDomain, setCurrentDomain] = useState<{ name: string; verified: boolean; dns: any } | null>(null);
    const [error, setError] = useState('');
    const [organizationId, setOrganizationId] = useState<string | null>(null);

    useEffect(() => {
        fetchCurrentDomain();
    }, []);

    const fetchCurrentDomain = async () => {
        try {
            // 1. Get Org ID
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();
            
            if (profile?.organization_id) {
                setOrganizationId(profile.organization_id);
                
                // 2. Get Org Domain
                const { data: org } = await supabase
                    .from('organizations')
                    .select('custom_domain')
                    .eq('id', profile.organization_id)
                    .single();

                if (org?.custom_domain) {
                    // Check verification status via backend
                    checkVerification(org.custom_domain);
                }
            }
        } catch (e) {
            console.error('Error fetching domain:', e);
        }
    };

    const checkVerification = async (domainName: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/domains/verify/${domainName}`);
            const data = await res.json();
            
            setCurrentDomain({
                name: domainName,
                verified: data.verified,
                dns: data.details
            });
        } catch (e) {
            console.error('Error verifying:', e);
            // Fallback if API fails (maybe offline?)
            setCurrentDomain({ name: domainName, verified: false, dns: null });
        } finally {
            setLoading(false);
        }
    };

    const handleAddDomain = async () => {
        if (!domain) return;
        // Basic regex
        const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
        if (!domainRegex.test(domain)) {
            setError('Domínio inválido. Ex: www.meusite.com.br');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/domains/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain, organizationId })
            });
            
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Re-verify
            await checkVerification(domain);
            setDomain('');

        } catch (e: any) {
            setError(e.message || 'Erro ao adicionar domínio');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm('Tem certeza? Isso irá tirar o site do ar neste domínio.')) return;
        setLoading(true);
        try {
             const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/domains/remove`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: currentDomain?.name, organizationId })
            });
             const data = await res.json();
             if(data.error) throw new Error(data.error);
             
             setCurrentDomain(null);
        } catch(e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Globe size={20} />
                </div>
                <div>
                    <h2 className="font-semibold text-gray-800">Domínio Personalizado</h2>
                    <p className="text-xs text-gray-500">Conecte seu próprio domínio (ex: www.suaimobiliaria.com.br)</p>
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
                        <label className="block text-sm font-medium text-gray-700">Adicionar Domínio</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="ex: www.suaimobiliaria.com.br"
                                value={domain}
                                onChange={e => setDomain(e.target.value.toLowerCase())}
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button 
                                onClick={handleAddDomain}
                                disabled={loading || !domain}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? 'Adicionando...' : <><Plus size={18} /> Conectar</>}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Recomendamos usar <b>www</b>.meusite.com.br para melhor compatibilidade.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3">
                                <Globe className={currentDomain.verified ? "text-green-500" : "text-yellow-500"} />
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{currentDomain.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${currentDomain.verified ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                            {currentDomain.verified ? 'Verificado & Ativo' : 'Configuração Pendente'}
                                        </span>
                                        {!currentDomain.verified && (
                                            <button onClick={() => checkVerification(currentDomain.name)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                                <RefreshCw size={10} /> Atualizar status
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleRemove} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>

                        {!currentDomain.verified && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
                                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                    <Info size={16} /> Configuração DNS Necessária
                                </h4>
                                <p className="text-blue-700 mb-3">
                                    Acesse o painel do seu registro de domínio (Registro.br, GoDaddy, etc) e crie a seguinte entrada:
                                </p>
                                <div className="bg-white p-3 rounded border border-blue-200 font-mono text-xs overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-gray-500 border-b border-gray-100">
                                                <th className="pb-2">Tipo</th>
                                                <th className="pb-2">Nome</th>
                                                <th className="pb-2">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="pt-2 font-bold">CNAME</td>
                                                <td className="pt-2 text-gray-700">
                                                    {currentDomain.name.startsWith('www.') ? 'www' : '@'}
                                                </td>
                                                <td className="pt-2 text-indigo-600 select-all">cname.vercel-dns.com</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DomainSettings;
