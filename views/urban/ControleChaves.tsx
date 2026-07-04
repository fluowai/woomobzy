import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock, Home, Key, Plus, Search, User } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

type KeyRecord = {
  id: string;
  label: string;
  code: string;
  status: 'available' | 'checked_out' | 'overdue' | 'lost';
  location?: string;
  responsible_name?: string;
  checked_out_at?: string;
  expected_return_at?: string;
};

const statusConfig: Record<KeyRecord['status'], { label: string; color: string; bg: string; icon: React.ElementType }> = {
  available: { label: 'Disponivel', color: 'text-green-700', bg: 'bg-green-100', icon: Home },
  checked_out: { label: 'Retirada', color: 'text-blue-700', bg: 'bg-blue-100', icon: ArrowUpRight },
  overdue: { label: 'Atrasada', color: 'text-red-700', bg: 'bg-red-100', icon: Clock },
  lost: { label: 'Perdida', color: 'text-slate-700', bg: 'bg-slate-100', icon: Clock },
};

export default function ControleChaves() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadKeys = async () => {
    if (!profile?.organization_id) return;

    setLoading(true);
    const { data } = await supabase
      .from('key_control')
      .select('id,label,code,status,location,responsible_name,checked_out_at,expected_return_at')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    setKeys((data || []) as KeyRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    loadKeys();
  }, [profile?.organization_id]);

  const filteredKeys = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return keys;
    return keys.filter((item) =>
      `${item.label} ${item.code} ${item.responsible_name || ''}`.toLowerCase().includes(term)
    );
  }, [keys, search]);

  const stats = useMemo(
    () => [
      { label: 'Disponiveis', value: keys.filter((item) => item.status === 'available').length, color: 'text-green-600' },
      { label: 'Retiradas', value: keys.filter((item) => item.status === 'checked_out').length, color: 'text-blue-600' },
      { label: 'Atrasadas', value: keys.filter((item) => item.status === 'overdue').length, color: 'text-red-600' },
    ],
    [keys]
  );

  const registerKey = async () => {
    if (!profile?.organization_id) return;
    const label = window.prompt('Identificacao do imovel ou chave:')?.trim();
    if (!label) return;
    const code = window.prompt('Codigo da chave:')?.trim();
    if (!code) return;
    const location = window.prompt('Local onde a chave fica guardada:')?.trim();

    await supabase.from('key_control').insert({
      organization_id: profile.organization_id,
      label,
      code,
      location: location || null,
      status: 'available',
    });
    loadKeys();
  };

  const checkoutKey = async (id: string) => {
    const responsibleName = window.prompt('Nome de quem esta retirando a chave:')?.trim();
    if (!responsibleName) return;
    const returnHours = Number(window.prompt('Prazo para devolucao em horas:', '8') || 8);
    await supabase
      .from('key_control')
      .update({
        status: 'checked_out',
        responsible_name: responsibleName,
        checked_out_at: new Date().toISOString(),
        expected_return_at: new Date(
          Date.now() + Math.max(returnHours, 1) * 60 * 60 * 1000
        ).toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', profile?.organization_id);
    loadKeys();
  };

  const returnKey = async (id: string) => {
    await supabase
      .from('key_control')
      .update({
        status: 'available',
        responsible_name: null,
        checked_out_at: null,
        expected_return_at: null,
        returned_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', profile?.organization_id);
    loadKeys();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="h1 flex items-center gap-3 text-slate-900">
            <Key className="text-primary" size={32} />
            Controle de Chaves
          </h1>
          <p className="body mt-1 text-slate-500">Gerencie localizacao, retirada e devolucao das chaves dos imoveis.</p>
        </div>
        <button onClick={registerKey} className="btn btn-primary shadow-lg shadow-primary/25">
          <Plus size={20} /> Registrar Chave
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-premium p-5 text-center">
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="group relative max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary" size={18} />
            <input
              type="text"
              placeholder="Buscar por imovel ou codigo..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field bg-slate-50 pl-11"
            />
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">Carregando chaves...</div>
          ) : filteredKeys.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">Nenhuma chave cadastrada.</div>
          ) : (
            filteredKeys.map((item) => {
              const cfg = statusConfig[item.status];
              const Icon = cfg.icon;
              return (
                <div key={item.id} className="flex flex-col justify-between gap-3 p-5 transition-colors hover:bg-slate-50/50 md:flex-row md:items-center">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${cfg.bg}`}>
                      <Icon size={22} className={cfg.color} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.label}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{item.code}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 md:items-end">
                    <span className={`self-start rounded-full px-3 py-1 text-[10px] font-bold uppercase md:self-auto ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {item.responsible_name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User size={12} /> {item.responsible_name}
                      </div>
                    )}
                    {item.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Home size={12} /> {item.location}
                      </div>
                    )}
                    {item.expected_return_at && (
                      <div className={`flex items-center gap-1.5 text-xs font-bold ${item.status === 'overdue' ? 'text-red-600' : 'text-slate-500'}`}>
                        <Clock size={12} /> Dev. prevista: {new Date(item.expected_return_at).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {item.status === 'available' ? (
                      <button onClick={() => checkoutKey(item.id)} className="btn h-9 border border-blue-200 bg-blue-50 px-3 text-xs text-blue-700 hover:bg-blue-100">
                        <ArrowUpRight size={14} /> Retirar
                      </button>
                    ) : (
                      <button onClick={() => returnKey(item.id)} className="btn h-9 border border-green-200 bg-green-50 px-3 text-xs text-green-700 hover:bg-green-100">
                        <ArrowDownLeft size={14} /> Devolver
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
