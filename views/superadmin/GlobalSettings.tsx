
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { Key, Save, CheckCircle, AlertTriangle, Server, Wifi, Smartphone } from 'lucide-react';

const GlobalSettings: React.FC = () => {
    const [settings, setSettings] = useState({
        global_evolution_api_key: '',
        global_evolution_url: '',
        global_openai_key: '',
        global_gemini_key: '',
        maintenance_mode: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Evolution Test State
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
    const [instances, setInstances] = useState<any[]>([]);
    const [showInstances, setShowInstances] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('saas_settings')
                .select('*')
                .single();

            if (data) setSettings(data);
        } catch (error) {
            console.error('Error fetching global settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        console.log("💾 Tentando salvar settings:", settings);

        try {
            // Filter out system fields just in case
            const { id, created_at, ...updates } = settings as any;
            
            // Force ID 1
            const payload = { id: 1, ...updates };
            console.log("📤 Payload enviado:", payload);

            const { data, error } = await supabase
                .from('saas_settings')
                .upsert(payload)
                .select(); // Ask for return data to verify

            if (error) {
                console.error("❌ Erro Supabase:", error);
                throw error;
            }

            console.log("✅ Sucesso Supabase. Dados retornados:", data);
            
            if (!data || data.length === 0) {
                alert('⚠️ Salvo, mas nenhum dado retornado. Verifique RLS.');
            } else {
                alert('Configurações salvas e confirmadas no banco! ✅');
            }

        } catch (error: any) {
            console.error('Save Error:', error);
            alert(`Erro ao salvar: ${error.message || JSON.stringify(error)}`);
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!settings.global_evolution_url || !settings.global_evolution_api_key) {
            alert('Preencha a URL e a API Key antes de testar.');
            return;
        }

        setTesting(true);
        setTestResult(null);
        setInstances([]);

        try {


            // 5 second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            // Clean URL (remove trailing slash)
            const baseUrl = settings.global_evolution_url.replace(/\/$/, '');

            // Try fetching instances (most accurate test)
            const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'apikey': settings.global_evolution_api_key
                }
            });
            
            clearTimeout(timeoutId);

            if (!res.ok) {
                if (res.status === 403) throw new Error('Chave de API Inválida (403)');
                if (res.status === 404) throw new Error('Endpoint não encontrado (404). Verifique a URL.');
                throw new Error(`Erro na conexão: ${res.statusText}`);
            }

            const data = await res.json();
            console.log('Evolution Instances Data:', data);
            
            // Evolution v2 returns array directly or object? usually array.
            const list = Array.isArray(data) ? data : (data.instances || []); 
            
            setInstances(list);
            setTestResult({ success: true, msg: `Conexão OK! ${list.length} instâncias encontradas.` });
            setShowInstances(true);

        } catch (e: any) {
            console.error('Test Error:', e);
            const msg = e.name === 'AbortError' ? 'Tempo limite excedido (5s). Verifique a URL.' : e.message;
            setTestResult({ success: false, msg: `Falha: ${msg}` });
        } finally {
            setTesting(false);
        }
    };

    const handleCreateTestInstance = async () => {
        if (!settings.global_evolution_url || !settings.global_evolution_api_key) return;
        
        const testName = 'superadmin_test';
        if (!confirm(`Deseja criar uma instância de teste chamada "${testName}"?`)) return;

        setTesting(true);
        try {
            const baseUrl = settings.global_evolution_url.replace(/\/$/, '');
            
            const res = await fetch(`${baseUrl}/instance/create`, {
                method: 'POST',
                headers: {
                    'apikey': settings.global_evolution_api_key,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ instanceName: testName })
            });

            const data = await res.json();
            
            if (res.ok || (data.instance && data.instance.instanceName)) {
                alert(`Instância "${testName}" criada com sucesso!`);
                handleTestConnection(); // Refresh list
            } else {
                throw new Error(data.message || 'Erro desconhecido');
            }
        } catch (error: any) {
            alert(`Erro ao criar instância: ${error.message}`);
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Key className="text-red-600" />
                    Configurações Globais (Master API Keys)
                </h1>
                <button 
                    onClick={(e) => handleSave(e)}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 shadow-sm"
                >
                    {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save size={20} />}
                    Salvar Agora
                </button>
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
                <div className="flex">
                    <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
                    <div>
                        <p className="text-sm text-yellow-700">
                            Estas chaves servem como <strong>fallback</strong>. Se uma imobiliária não configurar suas próprias chaves, o sistema usará estas.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                
                {/* Evolution API */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                        <Smartphone size={20} /> Evolution API (WhatsApp)
                    </h3>
                    <div className="grid gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL da API (Master Instance)</label>
                                <input 
                                    type="url" 
                                    value={settings.global_evolution_url || ''}
                                    onChange={e => setSettings({...settings, global_evolution_url: e.target.value})}
                                    placeholder="https://api.evolution.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Global API Key</label>
                                <div className="relative">
                                    <input 
                                        type="password" 
                                        value={settings.global_evolution_api_key || ''}
                                        onChange={e => setSettings({...settings, global_evolution_api_key: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono pr-10"
                                        placeholder="Global Master Key (não a de uma instância)"
                                    />
                                    <Key size={16} className="absolute right-3 top-3 text-gray-400" />
                                </div>
                                <p className="text-xs text-red-500 mt-1">
                                    ⚠️ ATENÇÃO: Esta deve ser a <strong>Global API Key</strong> do Manager, não a apikey de uma instância específica. Sem ela, não é possível criar novas instâncias.
                                </p>
                            </div>
                        </div>


                        {/* Connection Test Section */}
                        <div className="flex flex-wrap items-center gap-4 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={testing}
                                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {testing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Wifi size={16} />}
                                {testing ? 'Processando...' : 'Testar Conexão e Listar'}
                            </button>

                            <button
                                type="button"
                                onClick={handleCreateTestInstance}
                                disabled={testing}
                                className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Smartphone size={16} />
                                Criar Instância Teste
                            </button>

                            {testResult && (
                                <div className={`flex items-center gap-2 text-sm font-medium ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                    {testResult.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                                    {testResult.msg}
                                </div>
                            )}
                        </div>

                        {/* Instances List (Conditional) */}
                        {showInstances && instances.length > 0 && (
                            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 font-semibold text-xs text-gray-500 uppercase">
                                    Instâncias Conectadas ({instances.length})
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white border-b border-gray-100">
                                            <tr>
                                                <th className="px-4 py-2 font-medium">Nome</th>
                                                <th className="px-4 py-2 font-medium">Status</th>
                                                <th className="px-4 py-2 font-medium">Número</th>
                                                <th className="px-4 py-2 font-medium">ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {instances.map((inst: any, idx) => {
                                                const core = inst.instance || inst;
                                                const name = core.instanceName || core.name || `Instância ${idx + 1}`;
                                                const status = core.status || core.connectionStatus || core.state || 'UNKNOWN';
                                                const id = core.instanceId || core.id || 'N/A';
                                                const number = core.owner || core.ownerJid || '-';

                                                const s = String(status).toLowerCase();
                                                const isActive = s === 'open' || s === 'connected';
                                                const isConnecting = s === 'connecting';

                                                let statusColor = 'bg-gray-100 text-gray-700 border-gray-200';
                                                if (isActive) statusColor = 'bg-green-100 text-green-700 border-green-200';
                                                else if (isConnecting) statusColor = 'bg-yellow-100 text-yellow-700 border-yellow-200';
                                                else if (s === 'close' || s === 'disconnected') statusColor = 'bg-red-100 text-red-700 border-red-200';

                                                return (
                                                    <tr key={id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                                        <td className="px-4 py-2 font-medium text-gray-800">{name}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColor}`}>
                                                                {status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-gray-500 text-xs">{number}</td>
                                                        <td className="px-4 py-2 text-gray-400 font-mono text-xs truncate max-w-[100px]" title={id}>{id}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Services */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100 mt-4 flex items-center gap-2">
                        <Server size={20} /> Inteligência Artificial
                    </h3>
                    <div className="grid gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key (GPT-4)</label>
                            <input 
                                type="password" 
                                value={settings.global_openai_key || ''}
                                onChange={e => setSettings({...settings, global_openai_key: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Google Gemini API Key</label>
                            <input 
                                type="password" 
                                value={settings.global_gemini_key || ''}
                                onChange={e => setSettings({...settings, global_gemini_key: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* Maintenance */}
                <div className="pt-4 border-t border-gray-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={settings.maintenance_mode}
                            onChange={e => setSettings({...settings, maintenance_mode: e.target.checked})}
                            className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                        />
                        <span className="text-gray-700 font-medium">Modo Manutenção (Bloqueia acesso de todos os tenants)</span>
                    </label>
                </div>

                <div className="pt-6 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                    >
                        {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save size={20} />}
                        Salvar Configurações Globais
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GlobalSettings;
