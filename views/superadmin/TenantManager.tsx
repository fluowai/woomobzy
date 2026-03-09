
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { Building2, Search, Edit2, Ban, CheckCircle, Plus, X, Save, Key } from 'lucide-react';

interface Organization {
    id: string;
    name: string;
    slug?: string;
    status: string;
    owner_email?: string;
    plan_id?: string;
    created_at: string;
    plans?: {
        name: string;
    };
}

interface Plan {
    id: string;
    name: string;
    price: number;
}



const TenantManager: React.FC = () => {
    const [tenants, setTenants] = useState<Organization[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '', 
        owner_email: '',
        plan_id: '',
        status: 'active'
    });

    useEffect(() => {
        fetchTenants();
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        const { data } = await supabase.from('plans').select('id, name, price').eq('is_active', true);
        if (data) setPlans(data);
    };

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('organizations')
                .select(`
                    *,
                    plans ( name )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            // @ts-ignore
            setTenants(data || []);
        } catch (error: any) {
            console.error('Error fetching tenants:', error);
            setErrorMsg(error.message || 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (tenant?: Organization) => {
        if (tenant) {
            setEditingId(tenant.id);
            setFormData({
                name: tenant.name,
                slug: tenant.slug || '',
                owner_email: tenant.owner_email || '',
                plan_id: tenant.plan_id || '',
                status: tenant.status
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                slug: '',
                owner_email: '',
                plan_id: plans.length > 0 ? plans[0].id : '', // Default to first plan
                status: 'active'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);

        try {
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('organizations')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('organizations')
                    .insert([formData]);
                if (error) throw error;
            }
            
            setIsModalOpen(false);
            fetchTenants();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Erro ao salvar imobiliária.');
        } finally {
            setFormLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        if (!confirm(`Deseja alterar o status para ${newStatus}?`)) return;

        try {
            const { error } = await supabase
                .from('organizations')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            fetchTenants();
        } catch (error) {
            alert('Erro ao atualizar status');
        }
    };

    const filtered = tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            {errorMsg && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 border border-red-200">
                    <strong>Erro ao carregar:</strong> {errorMsg}
                </div>
            )}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gerenciar Imobiliárias</h1>
                    <p className="text-gray-500">Crie e edite empresas manualmente.</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text"
                            placeholder="Buscar empresa..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
                        />
                    </div>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        <Plus size={20} /> Nova Imobiliária
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">URL (Slug)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plano</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Responsável</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma empresa encontrada.</td></tr>
                        ) : (
                            filtered.map(tenant => (
                                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{tenant.name}</div>
                                                <div className="text-xs text-gray-400">ID: {tenant.id.slice(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <code className="bg-gray-100 px-2 py-1 rounded text-xs text-blue-600">
                                            {tenant.slug || '-'}
                                        </code>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold uppercase">
                                            {tenant.plans?.name || 'Sem plano'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {tenant.owner_email || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {tenant.status === 'active' ? 'Ativo' : 'Suspenso'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button 
                                            onClick={() => toggleStatus(tenant.id, tenant.status)}
                                            className={`p-1.5 rounded hover:bg-gray-100 mr-2 ${tenant.status === 'active' ? 'text-red-500' : 'text-green-500'}`}
                                            title={tenant.status === 'active' ? 'Suspender' : 'Ativar'}
                                        >
                                            {tenant.status === 'active' ? <Ban size={18} /> : <CheckCircle size={18} />}
                                        </button>
                                        <button 
                                            onClick={() => handleOpenModal(tenant)}
                                            className="p-1.5 text-blue-500 rounded hover:bg-gray-100" 
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                const reason = prompt(`Motivo do acesso à conta de "${tenant.name}"?`, "Suporte Técnico");
                                                if (!reason) return;

                                                try {
                                                    // USER REQUEST: Call Secure Backend API
                                                    
                                                    // Visual Feedback
                                                    const feedback = document.createElement('div');
                                                    feedback.className = 'fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center text-white flex-col gap-4 animate-in fade-in duration-300';
                                                    feedback.innerHTML = `
                                                        <div class="h-12 w-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        <div class="text-xl font-bold">Solicitando Acesso Seguro...</div>
                                                        <div class="text-sm opacity-80">Validando permissões e auditando...</div>
                                                    `;
                                                    document.body.appendChild(feedback);

                                                    const { data: { user } } = await supabase.auth.getUser();
                                                    if (!user) throw new Error("Usuário não autenticado");

                                                    // Use VITE_API_URL or default to local/configured
                                                    const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3002';
                                                    
                                                    // Get the tenant owner ID or just pass tenantId and let backend find a user
                                                    // Ideally we passed the specific user_id to impersonate.
                                                    // For now, let's assume we want to impersonate the owner or just find ANY admin of that tenant.
                                                    // But we didn't fetch users here, only tenants. 
                                                    // Let's first fetch the owner of the tenant.
                                                    
                                                    const { data: ownerData, error: ownerError } = await supabase
                                                        .from('profiles')
                                                        .select('id')
                                                        .eq('organization_id', tenant.id)
                                                        .in('role', ['admin', 'broker', 'superadmin']) 
                                                        .limit(1)
                                                        .single();

                                                    if (ownerError || !ownerData) {
                                                        document.body.removeChild(feedback);
                                                        alert("Não foi possível encontrar um usuário ADMIN para esta organização.");
                                                        return;
                                                    }

                                                    const response = await fetch(`${apiUrl}/api/support/impersonate`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            actorId: user.id,
                                                            targetUserId: ownerData.id,
                                                            tenantId: tenant.id,
                                                            reason: reason
                                                        })
                                                    });

                                                    const result = await response.json();

                                                    if (!response.ok || !result.success) {
                                                        throw new Error(result.error || 'Falha ao iniciar impersonation');
                                                    }

                                                    // Redirect using the provided secure One-Time URL
                                                    // result.redirectUrl should be like /impersonate?code=...
                                                    window.location.href = result.redirectUrl;

                                                } catch (err: any) {
                                                    console.error(err);
                                                    document.querySelector('.fixed.inset-0')?.remove(); // remove feedback
                                                    alert(`Erro: ${err.message}`);
                                                }
                                            }}
                                            className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded mr-2" 
                                            title="Acessar Como (Secure Log In)"
                                        >
                                            <Key size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editingId ? 'Editar Imobiliária' : 'Nova Imobiliária'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL Personalizada (Slug)</label>
                                <div className="flex items-center">
                                    <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-gray-500 text-sm">
                                        /
                                    </span>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 outline-none lowercase"
                                        placeholder="ex: fazendas-brasil"
                                        value={formData.slug}
                                        onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Endereço de acesso: seussistema.com/{formData.slug || '...'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do Responsável</label>
                                <input 
                                    type="email" 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="dono@imobiliaria.com"
                                    value={formData.owner_email}
                                    onChange={e => setFormData({...formData, owner_email: e.target.value})}
                                />
                                <p className="text-xs text-gray-500 mt-1">Usado para identificar o dono ao logar.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plano de Assinatura</label>
                                <select 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={formData.plan_id}
                                    onChange={e => setFormData({...formData, plan_id: e.target.value})}
                                >
                                    <option value="">Selecione um plano...</option>
                                    {plans.map(plan => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.name} - R$ {plan.price}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={formData.status}
                                    onChange={e => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="active">Ativo</option>
                                    <option value="suspended">Suspenso</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={formLoading}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    {formLoading ? 'Salvando...' : <><Save size={18} /> Salvar</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantManager;
