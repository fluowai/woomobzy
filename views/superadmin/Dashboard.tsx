import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { Users, Building2, Activity, TreePine, Building, DollarSign } from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {
  logger.info('📊 [SuperAdminDashboard] Rendering...');
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    urbanTenants: 0,
    ruralTenants: 0,
    mrr: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isFresh, setIsFresh] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const isReseller = profile?.organization?.is_reseller;
      const orgId = profile?.organization_id;

      const baseFilter = (query: any) => {
        if (isReseller && orgId) {
          return query.eq('parent_id', orgId);
        }
        return query;
      };

      const [
        { count: total },
        { count: active },
        { count: urban },
        { count: rural },
      ] = await Promise.all([
        baseFilter(
          supabase.from('organizations').select('*', { count: 'exact', head: true })
        ),
        baseFilter(
          supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'active')
        ),
        baseFilter(
          supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('niche', 'traditional')
        ),
        baseFilter(
          supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('niche', 'rural')
        ),
      ]);

      let orgsQuery = supabase
        .from('organizations')
        .select('plan_id')
        .eq('status', 'active')
        .eq('is_reseller', false);
      if (isReseller && orgId) {
        orgsQuery = orgsQuery.eq('parent_id', orgId);
      }
      const { data: orgsData } = await orgsQuery;

      const { data: plansData } = await supabase
        .from('plans')
        .select('id, price_monthly');

      let mrr = 0;
      if (orgsData && plansData) {
        const prices: Record<string, number> = {};
        plansData.forEach(p => { prices[p.id] = p.price_monthly || 0; });
        orgsData.forEach(org => {
          if (org.plan_id && prices[org.plan_id]) {
            mrr += prices[org.plan_id];
          }
        });
      }

      setStats({
        totalTenants: total || 0,
        activeTenants: active || 0,
        urbanTenants: urban || 0,
        ruralTenants: rural || 0,
        mrr,
      });
      setIsFresh((total || 0) === 0);
    } catch (error) {
      logger.error('Error fetching admin stats:', error);
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
      title: 'Imobiliárias Urbanas',
      value: stats.urbanTenants,
      icon: Building,
      color: 'bg-indigo-500',
    },
    {
      title: 'Imobiliárias Rurais',
      value: stats.ruralTenants,
      icon: TreePine,
      color: 'bg-emerald-500',
    },
    {
      title: 'MRR Total',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.mrr),
      icon: DollarSign,
      color: 'bg-amber-500',
    }
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
            <h2 className="text-3xl font-bold mb-3 text-white">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
