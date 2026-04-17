import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { Users, Building2, Server, DollarSign, Activity } from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {
  console.log('📊 [SuperAdminDashboard] Rendering...');
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalRevenue: 0,
    serverStatus: 'Online',
  });
  const [loading, setLoading] = useState(true);
  const [isFresh, setIsFresh] = useState(false);

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
        serverStatus: 'Online',
      });
      setIsFresh((total || 0) === 0);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      title: 'Total de Imobiliárias',
      value: stats.totalTenants,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      title: 'Assinaturas Ativas',
      value: stats.activeTenants,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Receita Mensal (Est.)',
      value: `R$ ${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-indigo-500',
    },
    {
      title: 'Status do Servidor',
      value: stats.serverStatus,
      icon: Server,
      color: 'bg-purple-500',
    },
  ];

  if (loading) return <div>Carregando dashboard...</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Visão Geral</h1>
        {isFresh && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg animate-pulse">
            <Activity size={18} />
            <span className="text-sm font-bold">Início Rápido Ativo</span>
          </div>
        )}
      </div>

      {isFresh && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white mb-8 shadow-xl">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black mb-3 text-white">
              Bem-vindo ao seu novo painel, Proprietário!
            </h2>
            <p className="text-blue-100 mb-6 text-lg">
              O sistema está pronto. O primeiro passo é criar os planos de
              assinatura e depois cadastrar sua primeira imobiliária.
            </p>
            <div className="flex gap-4">
              <a
                href="/superadmin/plans"
                className="px-6 py-3 bg-white text-blue-700 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg"
              >
                Configurar Planos
              </a>
              <a
                href="/superadmin/tenants"
                className="px-6 py-3 bg-blue-500 text-white border border-blue-400 rounded-xl font-bold hover:bg-blue-400 transition-all"
              >
                Cadastrar Imobiliária
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {modules.map((mod, index) => {
          const Icon = mod.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  {mod.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">{mod.value}</p>
              </div>
              <div
                className={`p-3 rounded-lg ${mod.color} text-white shadow-lg shadow-gray-200`}
              >
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
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Alertas do Sistema
          </h2>
          <div className="text-center py-8 text-gray-500">
            Sistema operando normalmente.
          </div>
        </div>
      </div>
    </>
  );
};

export default SuperAdminDashboard;
