
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { Users, Building2, Server, DollarSign, Activity } from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalTenants: 0,
        activeTenants: 0,
        totalRevenue: 0,
        serverStatus: 'Online'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // 1. Count Tenants
            const { count: total, error: err1 } = await supabase
                .from('organizations')
                .select('*', { count: 'exact', head: true });

            // 2. Count Active
            const { count: active, error: err2 } = await supabase
                .from('organizations')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');
                
            // 3. Calc Revenue (Mock for now, would sum plans value)
            const revenue = active ? active * 97 : 0; // Assuming basic plan price avg

            setStats({
                totalTenants: total || 0,
                activeTenants: active || 0,
                totalRevenue: revenue,
                serverStatus: 'Online' // Placeholder
            });
        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const modules = [
        { title: 'Total de Imobiliárias', value: stats.totalTenants, icon: Building2, color: 'bg-blue-500' },
        { title: 'Assinaturas Ativas', value: stats.activeTenants, icon: Users, color: 'bg-green-500' },
        { title: 'Receita Mensal (Est.)', value: `R$ ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-indigo-500' },
        { title: 'Status do Servidor', value: stats.serverStatus, icon: Server, color: 'bg-purple-500' },
    ];

    if (loading) return <div>Carregando dashboard...</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Visão Geral</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {modules.map((mod, index) => {
                    const Icon = mod.icon;
                    return (
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">{mod.title}</p>
                                <p className="text-2xl font-bold text-gray-900">{mod.value}</p>
                            </div>
                            <div className={`p-3 rounded-lg ${mod.color} text-white shadow-lg shadow-gray-200`}>
                                <Icon size={24} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Activity size={20} className="text-gray-400" />
                        Atividade Recente
                    </h2>
                    <div className="text-center py-8 text-gray-500">
                        Nenhuma atividade recente registrada.
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Alertas do Sistema</h2>
                     <div className="text-center py-8 text-gray-500">
                        Sistema operando normalmente.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
