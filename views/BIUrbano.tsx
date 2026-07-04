import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  DollarSign,
  Download,
  Home,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const URBAN_TYPES = [
  'Apartamento',
  'Casa',
  'Sobrado',
  'Terreno Urbano',
  'Sala Comercial',
  'Galpao Industrial',
  'Galpão Industrial',
  'Loft',
  'Studio',
  'Cobertura',
];

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#7c3aed', '#0891b2'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);

const BIUrbano: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.organization_id) return;

    const load = async () => {
      setLoading(true);
      const organizationId = profile.organization_id;

      const [{ data: propertyData }, { data: leadData }] = await Promise.all([
        supabase
          .from('properties')
          .select('id,title,price,status,property_type,city,state,neighborhood,niche,created_at,features')
          .eq('organization_id', organizationId)
          .or(`niche.eq.urbano,property_type.in.(${URBAN_TYPES.map((type) => `"${type}"`).join(',')})`)
          .order('created_at', { ascending: false }),
        supabase
          .from('leads')
          .select('id,source,status,created_at,match_profile,property_id')
          .eq('organization_id', organizationId)
          .or('match_profile.eq.urbano,match_profile.is.null')
          .order('created_at', { ascending: false }),
      ]);

      setProperties(propertyData || []);
      setLeads(leadData || []);
      setLoading(false);
    };

    load();
  }, [profile?.organization_id]);

  const stats = useMemo(() => {
    const available = properties.filter((property) => property.status === 'Disponível' || property.status === 'Disponivel');
    const rented = properties.filter((property) => property.status === 'Alugado');
    const sold = properties.filter((property) => property.status === 'Vendido');
    const vgv = available.reduce((sum, property) => sum + Number(property.price || 0), 0);
    const avgTicket = available.length ? vgv / available.length : 0;

    return {
      vgv,
      avgTicket,
      propertyCount: properties.length,
      activeLeads: leads.length,
      rented: rented.length,
      sold: sold.length,
      available: available.length,
    };
  }, [properties, leads]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach((property) => {
      const type = property.property_type || 'Sem tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [properties]);

  const cityData = useMemo(() => {
    const totals: Record<string, number> = {};
    properties.forEach((property) => {
      const city = property.city || property.features?.location?.city || 'Sem cidade';
      totals[city] = (totals[city] || 0) + Number(property.price || 0);
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [properties]);

  const leadSourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((lead) => {
      const source = lead.source || 'Não informado';
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const monthlyData = useMemo(() => {
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return labels.map((month, index) => ({
      month,
      imoveis: properties.filter((property) => new Date(property.created_at).getMonth() === index).length,
      leads: leads.filter((lead) => new Date(lead.created_at).getMonth() === index).length,
    }));
  }, [properties, leads]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-16 text-center text-sm font-bold text-slate-400">
        Carregando BI urbano...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase italic tracking-tighter text-slate-950">
            BI Urbano
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Indicadores de carteira, leads, vendas, locação e performance comercial urbana.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-600 shadow-sm ring-1 ring-slate-200">
          <Download size={16} /> Exportar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'VGV Disponível', value: formatCurrency(stats.vgv), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Imóveis Urbanos', value: String(stats.propertyCount), icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Leads Urbanos', value: String(stats.activeLeads), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Ticket Médio', value: formatCurrency(stats.avgTicket), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg}`}>
              <item.icon className={item.color} size={22} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-900">
            <Activity size={18} className="text-blue-600" /> Evolução mensal
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#2563eb" fill="#dbeafe" strokeWidth={3} />
                <Area type="monotone" dataKey="imoveis" name="Imóveis" stroke="#10b981" fill="#dcfce7" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-900">
            <Home size={18} className="text-blue-600" /> Mix de estoque
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4}>
                  {typeData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-900">
            <MapPin size={18} className="text-blue-600" /> VGV por cidade
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={110} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-900">
            <Users size={18} className="text-blue-600" /> Leads por origem
          </h2>
          <div className="space-y-4">
            {leadSourceData.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-medium text-slate-400">
                Nenhum lead urbano encontrado.
              </p>
            ) : (
              leadSourceData.map((item, index) => (
                <div key={item.name}>
                  <div className="mb-1 flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                    <span>{item.name}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(8, (item.value / Math.max(1, leads.length)) * 100)}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BIUrbano;
