import React, { useEffect, useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity,
  ShieldCheck,
  FileText,
  Map as MapIcon,
  Wheat,
  TreePine,
  Users,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { supabase } from '../services/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const COLORS = ['#059669', '#d97706', '#2563eb', '#7c3aed', '#dc2626'];

const RuralDashboard: React.FC = () => {
  const { settings } = useSettings();
  const [propertyCount, setPropertyCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: props, count: pCount } = await supabase
        .from('properties')
        .select('id, title, city, state, total_area_ha, price, status, centroid', { count: 'exact' });
      
      const { count: lCount } = await supabase
        .from('leads')
        .select('id', { count: 'exact' });

      setPropertyCount(pCount || 0);
      setLeadCount(lCount || 0);
      setProperties(props || []);
    };
    load();
  }, []);

  const stats = [
    { label: 'Propriedades Cadastradas', value: String(propertyCount), change: '+8%', trend: 'up', icon: Wheat, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Investidores Ativos', value: String(leadCount), change: '+5%', trend: 'up', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Acessos Data Room', value: '34', change: '+15%', trend: 'up', icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Dossiês Gerados', value: '12', change: '+24%', trend: 'up', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  const chartData = [
    { name: 'Jan', leads: 4, visitas: 2 },
    { name: 'Fev', leads: 6, visitas: 3 },
    { name: 'Mar', leads: 8, visitas: 5 },
    { name: 'Abr', leads: 12, visitas: 7 },
    { name: 'Mai', leads: 9, visitas: 6 },
    { name: 'Jun', leads: 15, visitas: 9 },
  ];

  const aptitudeData = [
    { name: 'Pecuária', value: 40 },
    { name: 'Agricultura', value: 30 },
    { name: 'Mista', value: 20 },
    { name: 'Lazer', value: 10 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
          <Wheat className="text-emerald-600" size={32} />
          Dashboard Rural
        </h1>
        <p className="text-black/60 font-medium">Visão geral da sua operação agro imobiliária.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {stat.change}
                {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </div>
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</h3>
            <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Interactive Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-black flex items-center gap-2">
              <MapIcon size={20} className="text-emerald-600" />
              Mapa de Propriedades
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {propertyCount} propriedades
            </span>
          </div>
          <div style={{ height: '400px' }}>
            <MapContainer
              center={[-14.235, -51.925]}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              />
              {properties.filter(p => p.centroid).map((prop) => {
                try {
                  const coords = typeof prop.centroid === 'string' 
                    ? JSON.parse(prop.centroid) 
                    : prop.centroid;
                  if (coords?.coordinates) {
                    return (
                      <Marker key={prop.id} position={[coords.coordinates[1], coords.coordinates[0]]}>
                        <Popup>
                          <strong>{prop.title}</strong><br/>
                          {prop.city}/{prop.state}<br/>
                          {prop.total_area_ha ? `${prop.total_area_ha} ha` : ''}
                        </Popup>
                      </Marker>
                    );
                  }
                } catch { /* skip invalid coords */ }
                return null;
              })}
            </MapContainer>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          {/* Score Cards */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-black mb-4">Score Fundiário Médio</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center">
                <span className="text-xl font-black text-emerald-600">85</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Regularidade documental</p>
                <p className="text-xs text-slate-400">Baseado em {propertyCount} propriedades</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-black mb-4">Score Ambiental Médio</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center">
                <span className="text-xl font-black text-blue-600">72</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Conformidade ambiental</p>
                <p className="text-xs text-slate-400">CAR, Reserva Legal, APP</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-black mb-4">Ações Rápidas</h3>
            <div className="space-y-2">
              <Link to="/rural/properties/new" className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all text-sm font-medium">
                <Wheat size={18} /> Nova Propriedade
              </Link>
              <Link to="/rural/cadastro-tecnico" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all text-sm font-medium">
                <MapIcon size={18} /> Cadastro Técnico
              </Link>
              <Link to="/rural/due-diligence" className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all text-sm font-medium">
                <ShieldCheck size={18} /> Due Diligence
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lead Performance */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-black">Investidores × Visitas Técnicas</h3>
            <select className="bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-600 px-3 py-1.5 outline-none">
              <option>Últimos 6 meses</option>
              <option>Este ano</option>
            </select>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="leads" name="Investidores" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="visitas" name="Visitas" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aptitude Pie */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-black mb-6">Aptidão por Tipo</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={aptitudeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {aptitudeData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {aptitudeData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-bold text-slate-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuralDashboard;
