
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { CreditCard, Plus, X, Save, Edit2, Trash2, Check } from 'lucide-react';

interface Plan {
    id: string;
    name: string;
    price: number;
    currency: string;
    limits: {
        users: number;
        properties: number;
        whatsapp_instances: number;
    };
    features: string[];
    is_active: boolean;
}

const AVAILABLE_FEATURES = [
    { id: 'crm', label: 'CRM Imobiliário' },
    { id: 'site', label: 'Site / Landing Pages' },
    { id: 'ia_chat', label: 'IA Chatbot (Evolution)' },
    { id: 'api', label: 'API Access' },
    { id: 'whatsapp', label: 'WhatsApp Integration' }
];

const PlanManager: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState<Partial<Plan>>({
        name: '',
        price: 0,
        limits: { users: 1, properties: 50, whatsapp_instances: 1 },
        features: [],
        is_active: true
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .order('price', { ascending: true });
        
        if (error) console.error('Error fetching plans:', error);
        else setPlans(data || []);
        setLoading(false);
    };

    const handleOpenModal = (plan?: Plan) => {
        if (plan) {
            setEditingId(plan.id);
            setFormData({ ...plan });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                price: 0,
                limits: { users: 1, properties: 50, whatsapp_instances: 1 },
                features: [],
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            if (editingId) {
                await supabase.from('plans').update(formData).eq('id', editingId);
            } else {
                await supabase.from('plans').insert([formData]);
            }
            fetchPlans();
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar plano');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza? Isso pode afetar tenants usando este plano.')) return;
        const { error } = await supabase.from('plans').delete().eq('id', id);
        if (error) alert('Erro ao deletar (o plano pode estar em uso)');
        else fetchPlans();
    };

    const toggleFeature = (featureId: string) => {
        const current = formData.features || [];
        if (current.includes(featureId)) {
            setFormData({ ...formData, features: current.filter(f => f !== featureId) });
        } else {
            setFormData({ ...formData, features: [...current, featureId] });
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Gerenciar Planos</h1>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus size={20} /> Novo Plano
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className={`bg-white rounded-xl shadow border p-6 ${!plan.is_active ? 'opacity-60 grayscale' : 'border-blue-100'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                                <p className="text-2xl font-bold text-blue-600">R$ {plan.price}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleOpenModal(plan)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(plan.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex justify-between border-b pb-1">
                                <span>Imóveis:</span> <strong>{plan.limits?.properties || 0}</strong>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span>Usuários:</span> <strong>{plan.limits?.users || 0}</strong>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span>WhatsApp:</span> <strong>{plan.limits?.whatsapp_instances || 0}</strong>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {plan.features?.map(f => (
                                <span key={f} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editingId ? 'Editar Plano' : 'Novo Plano'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                    <input type="text" required className="w-full px-3 py-2 border rounded-lg"
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                                    <input type="number" required className="w-full px-3 py-2 border rounded-lg"
                                        value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium text-gray-800 mb-2">Limites</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Imóveis</label>
                                        <input type="number" className="w-full px-3 py-2 border rounded-lg"
                                            value={formData.limits?.properties} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                limits: { ...formData.limits!, properties: Number(e.target.value) }
                                            })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Usuários</label>
                                        <input type="number" className="w-full px-3 py-2 border rounded-lg"
                                            value={formData.limits?.users} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                limits: { ...formData.limits!, users: Number(e.target.value) }
                                            })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">WhatsApp Inst.</label>
                                        <input type="number" className="w-full px-3 py-2 border rounded-lg"
                                            value={formData.limits?.whatsapp_instances} 
                                            onChange={e => setFormData({
                                                ...formData, 
                                                limits: { ...formData.limits!, whatsapp_instances: Number(e.target.value) }
                                            })} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium text-gray-800 mb-2">Funcionalidades</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {AVAILABLE_FEATURES.map(feat => (
                                        <label key={feat.id} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={(formData.features || []).includes(feat.id)}
                                                onChange={() => toggleFeature(feat.id)}
                                                className="rounded text-blue-600"
                                            />
                                            <span className="text-sm">{feat.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.is_active}
                                        onChange={e => setFormData({...formData, is_active: e.target.checked})}
                                        className="toggle"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Plano Ativo?</span>
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" disabled={formLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
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

export default PlanManager;
