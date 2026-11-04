import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building, TrendingDown, Users, Wrench, Plus, X, MapPin, Phone, Mail, Hash, UserCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';


type Condominium = {
  id: string;
  name: string;
  residents_count?: number;
  delinquent_units?: number;
  units_count?: number;
  manager_name?: string;
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

const INITIAL_CONDO_FORM = {
  name: '',
  units_count: 0,
  cnpj: '',
  manager_name: '',
  contact_email: '',
  contact_phone: '',
  zip_code: '',
  neighborhood: '',
  address: '',
  city: '',
  state: ''
};

export default function AdmCondominios() {
  const { profile } = useAuth();
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCondoModal, setShowCondoModal] = useState(false);
  const [condoForm, setCondoForm] = useState(INITIAL_CONDO_FORM);

  const load = useCallback(async () => {
    if (!profile?.organization_id) return;

    setLoading(true);
    const organizationId = profile.organization_id;
    const [{ data: condoData }, { data: ticketData }] = await Promise.all([
      supabase
        .from('condominiums')
        .select('id,name,units_count,residents_count,delinquent_units,manager_name')
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
      toast.info('Cadastre um condominio antes de abrir um chamado.');
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
      toast.info('Condominio nao encontrado.');
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
    if (!condoForm.name.trim()) {
      toast.error('O nome do condomínio é obrigatório.');
      return;
    }

    const { error } = await supabase.from('condominiums').insert({
      organization_id: profile.organization_id,
      name: condoForm.name.trim(),
      units_count: condoForm.units_count || 0,
      cnpj: condoForm.cnpj.trim() || null,
      manager_name: condoForm.manager_name.trim() || null,
      contact_email: condoForm.contact_email.trim() || null,
      contact_phone: condoForm.contact_phone.trim() || null,
      zip_code: condoForm.zip_code.trim() || null,
      neighborhood: condoForm.neighborhood.trim() || null,
      address: condoForm.address.trim() || null,
      city: condoForm.city.trim() || null,
      state: condoForm.state.trim() || null,
      status: 'active',
    });

    if (error) {
      toast.error('Erro ao salvar condominio: ' + error.message);
      return;
    }

    toast.success('Condomínio cadastrado com sucesso!');
    setShowCondoModal(false);
    setCondoForm(INITIAL_CONDO_FORM);
    load();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCondoForm((prev) => ({
      ...prev,
      [name]: name === 'units_count' ? Number(value) : value,
    }));
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
            Administração de Condomínios
          </h1>
          <p className="body mt-1 text-slate-500">
            Gerencie condomínios, moradores, cobranças e chamados de manutenção.
          </p>
        </div>
        <button
          onClick={() => setShowCondoModal(true)}
          className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={20} /> Novo Condomínio
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
      
      {/* Condominios List (new visual addition to overview) */}
      {condominiums.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {condominiums.map((condo) => (
            <div key={condo.id} className="card-premium p-5 flex flex-col gap-4 relative overflow-hidden">
               <div className="flex justify-between items-start">
                 <div>
                   <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                     {condo.name}
                   </h3>
                   {condo.manager_name && (
                     <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                       <UserCircle size={14} /> Síndico(a): {condo.manager_name}
                     </p>
                   )}
                 </div>
                 <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">
                   {condo.units_count} unid.
                 </span>
               </div>
               <div className="flex gap-4 border-t border-slate-100 pt-3">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Moradores</span>
                   <span className="text-sm font-bold text-slate-700">{condo.residents_count || 0}</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Inadimplentes</span>
                   <span className="text-sm font-bold text-red-600">{condo.delinquent_units || 0}</span>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}

      <div className="card-premium overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Wrench size={20} className="text-primary" /> Chamados de Manutenção
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
                  Condomínio / Unidade
                </th>
                <th className="hidden p-4 text-xs font-bold uppercase tracking-widest text-slate-500 md:table-cell">
                  Descrição
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

      {/* Modal Novo Condomínio Aprimorado */}
      {showCondoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-white/20 bg-white shadow-2xl my-8">
            
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-6 md:p-8">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg">
                  <Building size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tighter text-slate-900 uppercase">
                    Novo Condomínio
                  </h3>
                  <p className="text-sm font-medium text-slate-500">Preencha os dados completos para melhor administração</p>
                </div>
              </div>
              <button
                onClick={() => setShowCondoModal(false)}
                className="rounded-full bg-slate-100 p-3 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              {/* Seção Principal */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Building size={16} className="text-blue-500" />
                  Dados Principais
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Nome do Condomínio *
                    </label>
                    <input
                      name="name"
                      value={condoForm.name}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Ex: Condomínio Residencial das Árvores"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      CNPJ
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Hash size={16} className="text-slate-400" />
                      </div>
                      <input
                        name="cnpj"
                        value={condoForm.cnpj}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Total de Unidades
                    </label>
                    <input
                      name="units_count"
                      type="number"
                      value={condoForm.units_count || ''}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Ex: 50"
                    />
                  </div>
                </div>
              </div>

              {/* Seção de Contato / Síndico */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <UserCircle size={16} className="text-blue-500" />
                  Administração e Contato
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Nome do Síndico(a) / Responsável
                    </label>
                    <input
                      name="manager_name"
                      value={condoForm.manager_name}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Nome completo do responsável"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Email de Contato
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail size={16} className="text-slate-400" />
                      </div>
                      <input
                        name="contact_email"
                        type="email"
                        value={condoForm.contact_email}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                        placeholder="sindico@condominio.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Telefone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone size={16} className="text-slate-400" />
                      </div>
                      <input
                        name="contact_phone"
                        value={condoForm.contact_phone}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção Endereço */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <MapPin size={16} className="text-blue-500" />
                  Localização
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      CEP
                    </label>
                    <input
                      name="zip_code"
                      value={condoForm.zip_code}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Endereço (Rua, Número)
                    </label>
                    <input
                      name="address"
                      value={condoForm.address}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Rua das Flores, 123"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Bairro
                    </label>
                    <input
                      name="neighborhood"
                      value={condoForm.neighborhood}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Centro"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Cidade
                    </label>
                    <input
                      name="city"
                      value={condoForm.city}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="São Paulo"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      UF
                    </label>
                    <input
                      name="state"
                      value={condoForm.state}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="SP"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="border-t border-slate-100 bg-slate-50/50 p-6 md:p-8 flex gap-4">
              <button
                onClick={() => setShowCondoModal(false)}
                className="flex-1 rounded-2xl bg-white border border-slate-200 py-4 font-bold uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCondo}
                className="flex-[2] rounded-2xl bg-blue-600 py-4 font-bold uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] hover:bg-blue-700 active:scale-95"
              >
                Salvar Condomínio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
