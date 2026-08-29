import React from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Users, 
  Server, 
  Key, 
  Activity, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { name: 'Jan', mrr: 4000, licenses: 240 },
  { name: 'Feb', mrr: 5000, licenses: 310 },
  { name: 'Mar', mrr: 4800, licenses: 330 },
  { name: 'Apr', mrr: 6200, licenses: 420 },
  { name: 'May', mrr: 7500, licenses: 490 },
  { name: 'Jun', mrr: 9800, licenses: 550 },
  { name: 'Jul', mrr: 12500, licenses: 720 },
];

const StatCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-5 rounded-xl border flex flex-col gap-2"
    style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
  >
    <div className="flex items-center justify-between text-[#9097A5]">
      <span className="text-sm font-medium">{title}</span>
      <Icon size={16} />
    </div>
    <div className="flex items-baseline gap-2">
      <h3 className="text-2xl font-bold text-white">{value}</h3>
      {trend && (
        <span className={`text-xs font-semibold ${trend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <span className="text-xs text-[#9097A5]">{subtext}</span>
  </motion.div>
);

export const Overview = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white tracking-tight">Global Overview</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-[#161A23] hover:bg-[#252A35] transition-colors border border-[#252A35] text-sm text-[#9097A5]">
            Last 30 Days
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total MRR" value="R$ 124,500" subtext="+R$ 12k since last month" icon={DollarSign} trend={12.5} />
        <StatCard title="Active Licenses" value="3,482" subtext="120 in grace period" icon={Key} trend={8.2} />
        <StatCard title="Deployments" value="2,190" subtext="45 offline" icon={Server} trend={4.1} />
        <StatCard title="Total Customers" value="8,901" subtext="Across 42 resellers" icon={Users} trend={2.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl border flex flex-col" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <h3 className="text-lg font-semibold text-white mb-6">MRR Growth</h3>
          <div className="flex-1 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#252A35" vertical={false} />
                <XAxis dataKey="name" stroke="#9097A5" tick={{ fill: '#9097A5' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#9097A5" tick={{ fill: '#9097A5' }} axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161A23', borderColor: '#252A35', color: '#F5F6F8' }}
                  itemStyle={{ color: '#d4af37' }}
                />
                <Area type="monotone" dataKey="mrr" stroke="#d4af37" strokeWidth={2} fillOpacity={1} fill="url(#colorMrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Health */}
        <div className="p-5 rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Platform Health</h3>
            <Activity size={18} className="text-emerald-500" />
          </div>
          
          <div className="space-y-4">
            {[
              { name: 'Licensing API', status: 'Operational', icon: ShieldCheck, color: 'text-emerald-500' },
              { name: 'Container Registry', status: 'Operational', icon: Server, color: 'text-emerald-500' },
              { name: 'Database Cluster', status: 'Operational', icon: Server, color: 'text-emerald-500' },
              { name: 'AI Workers', status: 'Degraded', icon: AlertTriangle, color: 'text-yellow-500' },
              { name: 'Heartbeat Relay', status: 'Operational', icon: Activity, color: 'text-emerald-500' }
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-[#161A23] border border-[#252A35]">
                <div className="flex items-center gap-3">
                  <service.icon size={16} className={service.color} />
                  <span className="text-sm font-medium text-white">{service.name}</span>
                </div>
                <span className={`text-xs ${service.color}`}>{service.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
};
