import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Clock,
  Home,
  Key,
  Plus,
  Search,
  User,
  CheckCircle2,
  Filter,
  List,
  LayoutGrid,
  QrCode,
  AlertCircle,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
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

const statusConfig: Record<
  KeyRecord['status'],
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  available: {
    label: 'Disponivel',
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: Home,
  },
  checked_out: {
    label: 'Retirada',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    icon: ArrowUpRight,
  },
  overdue: {
    label: 'Atrasada',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: Clock,
  },
  lost: {
    label: 'Perdida',
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    icon: Clock,
  },
};

export default function ControleChaves() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todas');
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [, setLoading] = useState(true);

  const loadKeys = useCallback(async () => {
    if (!profile?.organization_id) return;

    setLoading(true);
    const { data } = await supabase
      .from('key_control')
      .select(
        'id,label,code,status,location,responsible_name,checked_out_at,expected_return_at'
      )
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    setKeys((data || []) as KeyRecord[]);
    setLoading(false);
  }, [profile?.organization_id]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const filteredKeys = useMemo(() => {
    let result = keys;

    if (filterStatus !== 'Todas') {
      const statusMap: Record<string, string> = {
        'Em uso': 'checked_out',
        Disponíveis: 'available',
        Atrasadas: 'overdue',
      };
      result = result.filter((item) => item.status === statusMap[filterStatus]);
    }

    const term = search.toLowerCase().trim();
    if (!term) return result;
    return result.filter((item) =>
      `${item.label} ${item.code} ${item.responsible_name || ''}`
        .toLowerCase()
        .includes(term)
    );
  }, [keys, search, filterStatus]);

  const stats = useMemo(
    () => [
      {
        label: 'Disponiveis',
        value: keys.filter((item) => item.status === 'available').length,
        color: 'text-green-600',
      },
      {
        label: 'Retiradas',
        value: keys.filter((item) => item.status === 'checked_out').length,
        color: 'text-blue-600',
      },
      {
        label: 'Atrasadas',
        value: keys.filter((item) => item.status === 'overdue').length,
        color: 'text-red-600',
      },
    ],
    [keys]
  );

  const overdueKeys = useMemo(
    () => keys.filter((item) => item.status === 'overdue'),
    [keys]
  );

  const upcomingReturns = useMemo(
    () =>
      keys
        .filter(
          (item) => item.status === 'checked_out' && item.expected_return_at
        )
        .sort(
          (a, b) =>
            new Date(a.expected_return_at!).getTime() -
            new Date(b.expected_return_at!).getTime()
        )
        .slice(0, 3),
    [keys]
  );

  const formatReturnDate = (iso?: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const time = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (isToday) return `Hoje, ${time}`;
    if (isTomorrow) return `Amanhã, ${time}`;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
    const responsibleName = window
      .prompt('Nome de quem esta retirando a chave:')
      ?.trim();
    if (!responsibleName) return;
    const returnHours = Number(
      window.prompt('Prazo para devolucao em horas:', '8') || 8
    );
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
    <div className="wootech-reference-screen w-full max-w-[1600px] mx-auto pb-12 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span className="font-medium text-slate-400">Operações</span>
            <span className="text-slate-300">/</span>
            <span className="text-emerald-600 font-semibold">
              Controle de chaves
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Controle de chaves
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe retiradas, devoluções e responsáveis em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              window.alert('Fluxo de registrar movimentação em breve')
            }
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-all shadow-sm"
          >
            <Plus size={18} /> Registrar movimentação
          </button>
          <button
            onClick={registerKey}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm rounded-lg transition-all shadow-sm"
          >
            <Key size={18} className="text-slate-500" /> Cadastrar chave
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
              <Key size={28} />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{keys.length}</p>
              <p className="text-sm font-semibold text-slate-500">
                Chaves cadastradas
              </p>
            </div>
          </div>
          <div className="h-12 w-px bg-slate-100 hidden sm:block"></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">
                {stats.find((s) => s.label === 'Disponiveis')?.value || 0}
              </p>
              <p className="text-sm font-semibold text-slate-500">
                Disponíveis
              </p>
            </div>
          </div>
          <div className="h-12 w-px bg-slate-100 hidden sm:block"></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
            <User size={28} />
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">
              {stats.find((s) => s.label === 'Retiradas')?.value || 0}
            </p>
            <p className="text-sm font-semibold text-slate-500">Em uso</p>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-6">
              Movimentações de hoje
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto bg-slate-50 p-1 rounded-lg">
                {['Todas', 'Em uso', 'Disponíveis', 'Atrasadas'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterStatus(tab)}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${filterStatus === tab ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Buscar chave ou imóvel..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                  <Filter size={18} />
                </button>
                <div className="flex p-1 border border-slate-200 rounded-lg bg-slate-50">
                  <button className="p-1.5 rounded bg-emerald-700 text-white shadow-sm">
                    <List size={16} />
                  </button>
                  <button className="p-1.5 rounded text-slate-500 hover:text-slate-700">
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">
                    Código
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">
                    Imóvel
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">
                    Situação
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">
                    Retirada por
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">
                    Responsável
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">
                    Previsão
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKeys.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-sm text-slate-500"
                    >
                      Nenhuma chave encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredKeys.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                          {item.code || 'CH-000'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {item.label}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            item.status === 'available'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.status === 'checked_out'
                                ? 'bg-slate-700 text-white'
                                : item.status === 'overdue'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {statusConfig[item.status]?.label || item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.status !== 'available' &&
                        item.responsible_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                              {item.responsible_name
                                .substring(0, 2)
                                .toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              {item.responsible_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                            {item.responsible_name
                              ? item.responsible_name
                                  .substring(0, 2)
                                  .toUpperCase()
                              : 'JG'}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {item.responsible_name || 'Não definido'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.expected_return_at ? (
                          <span
                            className={`text-sm font-medium ${item.status === 'overdue' ? 'text-orange-500' : 'text-slate-700'}`}
                          >
                            {new Date(
                              item.expected_return_at
                            ).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                            ,{' '}
                            {new Date(
                              item.expected_return_at
                            ).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          onClick={() => {
                            if (item.status === 'available') {
                              checkoutKey(item.id);
                            } else {
                              returnKey(item.id);
                            }
                          }}
                          title={
                            item.status === 'available'
                              ? 'Retirar chave'
                              : 'Devolver chave'
                          }
                        >
                          <MoreHorizontal size={20} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-96 space-y-6 shrink-0">
          {/* Attention needed */}
          <div className="bg-white border-2 border-orange-100 rounded-2xl shadow-sm p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-500" />
                Atenção necessária
              </h3>
              <MoreHorizontal size={18} className="text-slate-400" />
            </div>

            {overdueKeys.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma chave atrasada no momento.
              </p>
            ) : (
              <div className="space-y-4">
                {overdueKeys.slice(0, 3).map((item) => (
                  <div key={item.id}>
                    <p className="text-orange-500 font-bold text-sm">
                      {item.code}
                    </p>
                    <p className="text-slate-700 font-medium text-sm">
                      {item.label}
                    </p>

                    <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-slate-500">Retirada por</p>
                        <p className="font-bold text-slate-700 mt-0.5">
                          {item.responsible_name || '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500">Atrasada desde</p>
                        <p className="font-bold text-orange-500 mt-0.5">
                          {formatReturnDate(item.expected_return_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next returns */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Clock size={18} className="text-slate-500" />
              Próximas devoluções
            </h3>

            {upcomingReturns.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma devolução programada.
              </p>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
                {upcomingReturns.map((item) => (
                  <div key={item.id} className="relative pl-6">
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white"></div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-slate-900">
                        {formatReturnDate(item.expected_return_at)}
                      </p>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {item.code}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.responsible_name || '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QR Code Card */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm p-6 flex items-center gap-4 cursor-pointer hover:bg-emerald-100 transition-colors group">
            <div className="p-3 bg-white text-emerald-600 rounded-xl shadow-sm">
              <QrCode size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">Ler QR Code</h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Escaneie o QR Code da chave para registrar uma movimentação.
              </p>
            </div>
            <ChevronRight
              size={20}
              className="text-slate-400 group-hover:text-emerald-600 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
