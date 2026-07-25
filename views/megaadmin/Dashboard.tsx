import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import {
  Users,
  Building2,
  Activity,
  TreePine,
  Building,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

const MegaAdminDashboard: React.FC = () => {
  logger.info('📊 [MegaAdminDashboard] Rendering...');
  const [stats, setStats] = useState({
    totalResellers: 0,
    activeResellers: 0,
    totalTenants: 0,
    activeTenants: 0,
    urbanTenants: 0,
    ruralTenants: 0,
    mrr: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        { count: totalResellers },
        { count: activeResellers },
        { count: totalTenants },
        { count: activeTenants },
        { count: urban },
        { count: rural },
      ] = await Promise.all([
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('is_reseller', true),
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('is_reseller', true)
          .eq('status', 'active'),
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('is_reseller', false),
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('is_reseller', false)
          .eq('status', 'active'),
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('is_reseller', false)
          .eq('niche', 'traditional'),
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('is_reseller', false)
          .eq('niche', 'rural'),
      ]);

      const { data: orgsData } = await supabase
        .from('organizations')
        .select('plan_id')
        .eq('status', 'active')
        .eq('is_reseller', false);

      const { data: plansData } = await supabase
        .from('plans')
        .select('id, price_monthly');

      let mrr = 0;
      if (orgsData && plansData) {
        const prices: Record<string, number> = {};
        plansData.forEach((p) => {
          prices[p.id] = p.price_monthly || 0;
        });
        orgsData.forEach((org) => {
          if (org.plan_id && prices[org.plan_id]) {
            mrr += prices[org.plan_id];
          }
        });
      }

      setStats({
        totalResellers: totalResellers || 0,
        activeResellers: activeResellers || 0,
        totalTenants: totalTenants || 0,
        activeTenants: activeTenants || 0,
        urbanTenants: urban || 0,
        ruralTenants: rural || 0,
        mrr,
      });
    } catch (error) {
      logger.error('Error fetching mega admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Total Resellers',
      value: stats.totalResellers,
      icon: Building2,
      color: 'bg-purple-500',
    },
    {
      title: 'Resellers Ativos',
      value: stats.activeResellers,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Total Imobiliárias',
      value: stats.totalTenants,
      icon: Building,
      color: 'bg-blue-500',
    },
    {
      title: 'Imobiliárias Ativas',
      value: stats.activeTenants,
      icon: Users,
      color: 'bg-emerald-500',
    },
    {
      title: 'Urbanas',
      value: stats.urbanTenants,
      icon: Building,
      color: 'bg-indigo-500',
    },
    {
      title: 'Rurais',
      value: stats.ruralTenants,
      icon: TreePine,
      color: 'bg-amber-600',
    },
    {
      title: 'MRR Total',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(stats.mrr),
      icon: DollarSign,
      color: 'bg-amber-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Visão Geral da Plataforma
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div
                className={`p-3 rounded-lg ${card.color} text-white shadow-lg shadow-gray-200`}
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

export default MegaAdminDashboard;
