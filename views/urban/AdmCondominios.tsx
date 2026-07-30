import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building, TrendingDown, Users, Wrench, Plus, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

type Condominium = {
  id: string;
  name: string;
  residents_count?: number;
  delinquent_units?: number;
};

type Ticket = {
  id: string;
  unit_label?: string;
  category?: string;
  description: string;
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  opened_at?: string;
  condominium?: { name?: string };
};

const statusLabels: Record<Ticket['status'], string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  done: 'Concluido',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  Aberto: 'bg-red-100 text-red-700',
  'Em atendimento': 'bg-amber-100 text-amber-700',
  Concluido: 'bg-green-100 text-green-700',
  Cancelado: 'bg-slate-100 text-slate-600',
};

const priorityLabels: Record<Ticket['priority'], string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baixa',
};

const priorityColors: Record<string, string> = {
  Alta: 'bg-red-500',
  Media: 'bg-amber-400',
  Baixa: 'bg-green-500',
};

export default function AdmCondominios() {
  const { profile } = useAuth();
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCondoModal, setShowCondoModal] = useState(false);
  const [condoForm, setCondoForm] = useState({ name: '', units_count: 0 });

  const load = useCallback(async () => {
    if (!profile?.organization_id) return;

    setLoading(true);
    const organizationId = profile.organization_id;
    const [{ data: condoData }, { data: ticketData }] = await Promise.all([
      supabase
        .from('condominiums')
        .select('id,name,residents_count,delinquent_units')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
      supabase
        .from('condominium_tickets')
        .select(
          'id,unit_label,category,description,status,priority,opened_at,condominium:condominium_id(name)'
        )
        .eq('organization_id', organizationId)
        .order('opened_at', { ascending: false })
        .limit(25),
    ]);

    setCondominiums(condoData || []);
    setTickets((ticketData || []) as Ticket[]);
    setLoading(false);
  }, [profile?.organization_id]);

  useEffect(() => {
    load();
  }, [load]);

  const createTicket = async () => {
    if (!profile?.organization_id) return;
    if (condominiums.length === 0) {
      window.alert('Cadastre um condominio antes de abrir um chamado.');
      return;
    }
    const selectedName = window
      .prompt(
        `Condominio (${condominiums.map((item) => item.name).join(', ')}):`,
        condominiums[0].name
      )
      ?.trim();
    const condominium = condominiums.find(
      (item) => item.name.toLowerCase() === selectedName?.toLowerCase()
    );
    if (!condominium) {
      window.alert('Condominio nao encontrado.');
      return;
    }
    const description = window.prompt('Descreva o chamado:')?.trim();
    if (!description) return;
    const unitLabel = window.prompt('Unidade:')?.trim();
    const category = window.prompt('Categoria:', 'Manutencao')?.trim();

    await supabase.from('condominium_tickets').insert({
      organization_id: profile.organization_id,
      condominium_id: condominium.id,
      unit_label: unitLabel || null,
      category: category || 'Geral',
      description,
      status: 'open',
      priority: 'medium',
    });
    load();
  };

  const handleSaveCondo = async () => {
    if (!profile?.organization_id) return;
    if (!condoForm.name.trim()) return;

    const { error } = await supabase.from('condominiums').insert({
      organization_id: profile.organization_id,
      name: condoForm.name.trim(),
      units_count: condoForm.units_count || 0,
    });

    if (error) {
      window.alert('Erro ao salvar condominio: ' + error.message);
      return;
    }

    setShowCondoModal(false);
    setCondoForm({ name: '', units_count: 0 });
    load();
  };

  const stats = useMemo(() => {
    const openTickets = tickets.filter(
      (ticket) => ticket.status === 'open' || ticket.status === 'in_progress'
    ).length;
    const residents = condominiums.reduce(
      (sum, condo) => sum + Number(condo.residents_count || 0),
      0
    );
    const delinquent = condominiums.reduce(
      (sum, condo) => sum + Number(condo.delinquent_units || 0),
      0
    );

    return [
      {
        label: 'Condominios gerenciados',
        value: String(condominiums.length),
        icon: Building,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      {
        label: 'Chamados abertos',
        value: String(openTickets),
        icon: Wrench,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
      },
      {
        label: 'Moradores cadastrados',
        value: String(residents),
        icon: Users,
        color: 'text-green-600',
        bg: 'bg-green-50',
      },
      {
        label: 'Unidades inadimplentes',
        value: String(delinquent),
        icon: TrendingDown,
        color: 'text-red-600',
        bg: 'bg-red-50',
      },
    ];
  }, [condominiums, tickets]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="h1 flex items-center gap-3 text-slate-900">
            <Building className="text-primary" size={32} />
            Administracao de Condominios
          </h1>
          <p className="body mt-1 text-slate-500">
            Gerencie condominios, moradores, cobrancas e chamados de manutencao.
          </p>
        </div>
        <button
          onClick={() => setShowCondoModal(true)}
          className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={20} /> Novo Condominio
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card-premium flex items-center gap-4 p-5"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${stat.bg}`}
            >
              <stat.icon size={24} className={stat.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Wrench size={20} className="text-primary" /> Chamados de Manutencao
          </h2>
          <button onClick={createTicket} className="btn btn-primary">
            + Novo Chamado
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Prioridade
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Condominio / Unidade
                </th>
                <th className="hidden p-4 text-xs font-bold uppercase tracking-widest text-slate-500 md:table-cell">
                  Descricao
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Status
                </th>
                <th className="hidden p-4 text-xs font-bold uppercase tracking-widest text-slate-500 lg:table-cell">
                  Data
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-sm text-slate-400"
                  >
                    Carregando chamados...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-sm text-slate-400"
                  >
                    Nenhum chamado cadastrado.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const status = statusLabels[ticket.status];
                  const priority = priorityLabels[ticket.priority];
                  return (
                    <tr
                      key={ticket.id}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${priorityColors[priority]}`}
                          />
                          <span className="text-xs font-bold text-slate-600">
                            {priority}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-900">
                          {ticket.condominium?.name || 'Condominio'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {ticket.unit_label || 'Unidade'} -{' '}
                          {ticket.category || 'Geral'}
                        </p>
                      </td>
                      <td className="hidden p-4 text-sm text-slate-600 md:table-cell">
                        {ticket.description}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusColors[status]}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="hidden p-4 text-sm text-slate-500 lg:table-cell">
                        {ticket.opened_at
                          ? new Date(ticket.opened_at).toLocaleDateString(
                              'pt-BR'
                            )
                          : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Condomínio */}
      {showCondoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/20 bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg">
                  <Building size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold italic tracking-tighter text-slate-900 uppercase">
                    Novo Condomínio
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowCondoModal(false)}
                className="rounded-full bg-slate-100 p-3 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Nome do Condomínio *
                </label>
                <input
                  value={condoForm.name}
                  onChange={(e) =>
                    setCondoForm({ ...condoForm, name: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Ex: Condomínio das Árvores"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Total de Unidades
                </label>
                <input
                  type="number"
                  value={condoForm.units_count || ''}
                  onChange={(e) =>
                    setCondoForm({
                      ...condoForm,
                      units_count: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Ex: 50"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setShowCondoModal(false)}
                className="flex-1 rounded-2xl bg-slate-100 py-4 font-bold uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCondo}
                className="flex-[2] rounded-2xl bg-blue-600 py-4 font-bold uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] hover:bg-blue-700 active:scale-95"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
