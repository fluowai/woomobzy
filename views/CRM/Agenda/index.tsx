import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Home,
  Plus,
  Pencil,
  Trash2,
  User,
  Briefcase,
  X,
  CalendarPlus,
} from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { toast } from 'sonner';
import { useAuth } from '../../../context/AuthContext';
import { logger } from '@/utils/logger';

const AGENDA_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

const AGENDA_KINDS = [
  { value: 'visitas', label: 'Visitas a imóveis' },
  { value: 'reunioes', label: 'Reuniões' },
  { value: 'retornos', label: 'Retornos' },
  { value: 'outros', label: 'Outros' },
];

interface AgendaRow {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  broker_id?: string | null;
  color: string;
  kind: string;
  is_active: boolean;
  created_at: string;
}

interface Broker {
  id: string;
  full_name: string | null;
}

interface PropertyOption {
  id: string;
  title: string;
  city?: string | null;
  state?: string | null;
}

interface LeadOption {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  title: string;
  appointment_date: string;
  type: string;
  status: string;
  notes?: string | null;
  user_id?: string | null;
  agenda_id?: string | null;
  property_id?: string | null;
  lead_id?: string | null;
  lead?: { name?: string } | null;
  property?: { title?: string; city?: string | null; state?: string | null } | null;
}

const KIND_LABEL: Record<string, string> = {
  visitas: 'Visita',
  reunioes: 'Reunião',
  retornos: 'Retorno',
  outros: 'Outro',
};

const emptyAgendaForm = {
  name: '',
  description: '',
  broker_id: '',
  color: AGENDA_COLORS[0],
  kind: 'visitas',
};

const emptyAppointmentForm = {
  title: '',
  appointment_date: '',
  type: 'reuniao',
  agenda_id: 'none',
  property_id: '',
  lead_id: '',
  user_id: '',
  notes: '',
};

const Agenda = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [agendas, setAgendas] = useState<AgendaRow[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [selectedAgendaId, setSelectedAgendaId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [loadingAgendas, setLoadingAgendas] = useState(true);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<AgendaRow | null>(null);
  const [agendaForm, setAgendaForm] = useState(emptyAgendaForm);
  const [savingAgenda, setSavingAgenda] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    ...emptyAppointmentForm,
  });
  const [savingAppointment, setSavingAppointment] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const organizationId = profile?.organization_id;

  const visibleAgendas = useMemo(() => {
    if (isAdmin) return agendas;
    return agendas.filter((a) => a.broker_id === profile?.id);
  }, [agendas, isAdmin, profile?.id]);

  const brokerName = useCallback(
    (id?: string | null) => {
      if (!id) return null;
      return brokers.find((b) => b.id === id)?.full_name || 'Usuário Sem Nome';
    },
    [brokers]
  );

  const agendaById = useCallback(
    (id?: string | null) => agendas.find((a) => a.id === id),
    [agendas]
  );

  const fetchBrokers = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name:name')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      setBrokers(data || []);
    } catch (err) {
      logger.error('Erro ao carregar corretores', err);
    }
  }, [organizationId]);

  const fetchAgendas = useCallback(async () => {
    if (!organizationId) return;
    setLoadingAgendas(true);
    try {
      const { data, error } = await supabase
        .from('agendas')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      const items = (data || []) as AgendaRow[];
      setAgendas(items);
      const myAgendas = items.filter((a) => a.broker_id === profile?.id);
      const defaultId = isAdmin
        ? 'all'
        : myAgendas.length > 0
          ? myAgendas[0].id
          : 'mine';
      setSelectedAgendaId((prev) =>
        prev && prev !== 'all' && prev !== 'mine' && prev !== 'none'
          ? prev
          : defaultId
      );
    } catch (err) {
      logger.error('Erro ao carregar agendas', err);
      toast.error('Erro ao carregar agendas');
    } finally {
      setLoadingAgendas(false);
    }
  }, [organizationId, isAdmin, profile?.id]);

  useEffect(() => {
    if (organizationId) {
      fetchBrokers();
      fetchAgendas();
    }
  }, [organizationId, fetchBrokers, fetchAgendas]);

  const fetchAppointments = useCallback(async () => {
    if (!organizationId || !profile?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('lead_appointments')
        .select('*, lead:leads(name), property:properties(id, title, city, state)')
        .order('appointment_date', { ascending: true });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (!isAdmin) {
        if (selectedAgendaId === 'mine' || selectedAgendaId === '') {
          query = query.eq('user_id', profile.id);
        } else {
          query = query.eq('agenda_id', selectedAgendaId);
        }
      } else if (selectedAgendaId === 'all' || selectedAgendaId === '') {
        // todas as agendas
      } else if (selectedAgendaId === 'none') {
        query = query.is('agenda_id', null);
      } else if (selectedAgendaId === 'mine') {
        query = query.eq('user_id', profile.id);
      } else {
        query = query.eq('agenda_id', selectedAgendaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAppointments((data || []) as Appointment[]);
    } catch (err) {
      logger.error('Erro ao carregar agenda', err);
      toast.error('Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  }, [organizationId, profile?.id, filterStatus, selectedAgendaId, isAdmin]);

  useEffect(() => {
    if (organizationId && profile?.id) {
      fetchAppointments();
    }
  }, [
    organizationId,
    profile?.id,
    filterStatus,
    selectedAgendaId,
    fetchAppointments,
  ]);

  const openNewAgendaModal = () => {
    setEditingAgenda(null);
    setAgendaForm({
      ...emptyAgendaForm,
      broker_id: isAdmin ? '' : profile?.id || '',
    });
    setShowAgendaModal(true);
  };

  const openEditAgendaModal = (agenda: AgendaRow) => {
    setEditingAgenda(agenda);
    setAgendaForm({
      name: agenda.name,
      description: agenda.description || '',
      broker_id: agenda.broker_id || '',
      color: agenda.color || AGENDA_COLORS[0],
      kind: agenda.kind || 'visitas',
    });
    setShowAgendaModal(true);
  };

  const saveAgenda = async () => {
    if (!agendaForm.name.trim()) {
      toast.error('Informe um nome para a agenda');
      return;
    }
    if (!organizationId) return;
    setSavingAgenda(true);
    try {
      const payload = {
        organization_id: organizationId,
        name: agendaForm.name.trim(),
        description: agendaForm.description.trim() || null,
        broker_id: agendaForm.broker_id || null,
        color: agendaForm.color,
        kind: agendaForm.kind,
      };
      if (editingAgenda) {
        const { error } = await supabase
          .from('agendas')
          .update(payload)
          .eq('id', editingAgenda.id);
        if (error) throw error;
        toast.success('Agenda atualizada');
      } else {
        const { error } = await supabase.from('agendas').insert(payload);
        if (error) throw error;
        toast.success('Agenda criada');
      }
      setShowAgendaModal(false);
      fetchAgendas();
    } catch (err: any) {
      logger.error('Erro ao salvar agenda', err);
      toast.error(err?.message || 'Erro ao salvar agenda');
    } finally {
      setSavingAgenda(false);
    }
  };

  const deleteAgenda = async (agenda: AgendaRow) => {
    if (!isAdmin) return;
    if (
      !window.confirm(
        `Excluir a agenda "${agenda.name}"? Os compromissos dela ficarão sem agenda vinculada.`
      )
    ) {
      return;
    }
    try {
      const { error } = await supabase
        .from('agendas')
        .delete()
        .eq('id', agenda.id);
      if (error) throw error;
      toast.success('Agenda excluída');
      setSelectedAgendaId('all');
      fetchAgendas();
    } catch (err: any) {
      logger.error('Erro ao excluir agenda', err);
      toast.error(err?.message || 'Erro ao excluir agenda');
    }
  };

  const loadFormOptions = useCallback(async () => {
    if (!organizationId) return;
    try {
      const [propsRes, leadsRes] = await Promise.all([
        supabase
          .from('properties')
          .select('id, title, city, state')
          .eq('organization_id', organizationId)
          .order('title')
          .limit(500),
        supabase
          .from('leads')
          .select('id, name')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      if (propsRes.error) throw propsRes.error;
      if (leadsRes.error) throw leadsRes.error;
      setProperties((propsRes.data || []) as PropertyOption[]);
      setLeads((leadsRes.data || []) as LeadOption[]);
    } catch (err) {
      logger.error('Erro ao carregar imóveis/leads', err);
    }
  }, [organizationId]);

  const openNewAppointmentModal = () => {
    loadFormOptions();
    const currentAgendaId =
      selectedAgendaId &&
      selectedAgendaId !== 'all' &&
      selectedAgendaId !== 'mine' &&
      selectedAgendaId !== 'none'
        ? selectedAgendaId
        : 'none';
    const currentAgenda = agendaById(
      currentAgendaId !== 'none' ? currentAgendaId : undefined
    );
    setAppointmentForm({
      ...emptyAppointmentForm,
      agenda_id: currentAgendaId,
      user_id: currentAgenda?.broker_id || profile?.id || '',
      title: 'Visita ao imóvel',
    });
    setShowAppointmentModal(true);
  };

  const saveAppointment = async () => {
    if (!appointmentForm.title.trim() || !appointmentForm.appointment_date) {
      toast.error('Preencha os campos obrigatórios (Título e Data/Hora)');
      return;
    }
    if (!organizationId || !profile?.id) return;
    setSavingAppointment(true);
    try {
      const { error } = await supabase.from('lead_appointments').insert({
        organization_id: organizationId,
        agenda_id:
          appointmentForm.agenda_id && appointmentForm.agenda_id !== 'none'
            ? appointmentForm.agenda_id
            : null,
        property_id: appointmentForm.property_id || null,
        lead_id: appointmentForm.lead_id || null,
        user_id: appointmentForm.user_id || profile.id,
        title: appointmentForm.title.trim(),
        appointment_date: new Date(
          appointmentForm.appointment_date
        ).toISOString(),
        type: appointmentForm.type,
        notes: appointmentForm.notes || null,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Compromisso agendado');
      setShowAppointmentModal(false);
      if (appointmentForm.agenda_id && appointmentForm.agenda_id !== 'none') {
        setSelectedAgendaId(appointmentForm.agenda_id);
      }
      fetchAppointments();
    } catch (err: any) {
      logger.error('Erro ao agendar compromisso', err);
      toast.error(err?.message || 'Erro ao agendar compromisso');
    } finally {
      setSavingAppointment(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('lead_appointments')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      toast.success('Status atualizado');
      fetchAppointments();
    } catch (err: any) {
      logger.error('Erro ao atualizar status', err);
      toast.error(err?.message || 'Erro ao atualizar status');
    }
  };

  const selectedAgenda = agendaById(selectedAgendaId);

  const selectedTitle =
    selectedAgendaId === 'all'
      ? 'Todas as Agendas'
      : selectedAgendaId === 'none'
        ? 'Sem Agenda'
        : selectedAgendaId === 'mine'
          ? 'Meus Compromissos'
          : selectedAgenda
            ? selectedAgenda.name
            : 'Minha Agenda';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {selectedTitle}
          </h1>
          <p className="text-slate-500 mt-1">
            Agendas de visitas a imóveis, reuniões e retornos por corretor.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={openNewAgendaModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} /> Nova Agenda
          </button>
          <button
            onClick={openNewAppointmentModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <CalendarPlus size={16} /> Novo Compromisso
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <select
            value={selectedAgendaId}
            onChange={(e) => setSelectedAgendaId(e.target.value)}
            className="appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
          >
            {isAdmin && <option value="all">Todas as Agendas</option>}
            {visibleAgendas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.broker_id ? ` — ${brokerName(a.broker_id)}` : ''}
              </option>
            ))}
            {isAdmin && <option value="none">Sem Agenda (legado)</option>}
            {!isAdmin && <option value="mine">Meus Compromissos</option>}
          </select>
          <Calendar
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto">
          {['pending', 'completed', 'canceled', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors whitespace-nowrap ${filterStatus === status ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {status === 'pending'
                ? 'Pendentes'
                : status === 'completed'
                  ? 'Concluídos'
                  : status === 'canceled'
                    ? 'Cancelados'
                    : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {loadingAgendas ? (
        <div className="text-center py-10 text-slate-500">
          Carregando agendas...
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {visibleAgendas.map((a) => (
            <div
              key={a.id}
              className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${selectedAgendaId === a.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
              onClick={() => setSelectedAgendaId(a.id)}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: a.color }}
              />
              <span>{a.name}</span>
              <span className="text-xs font-semibold text-slate-400">
                {KIND_LABEL[a.kind] || a.kind}
              </span>
              {isAdmin && (
                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditAgendaModal(a);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                    title="Editar agenda"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAgenda(a);
                    }}
                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                    title="Excluir agenda"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {visibleAgendas.length === 0 && (
            <button
              onClick={openNewAgendaModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm font-bold hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <Plus size={16} /> Criar primeira agenda
            </button>
          )}
        </div>
      )}

      {selectedAgenda && selectedAgenda.description && (
        <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          {selectedAgenda.description}
        </p>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-500">
          Carregando compromissos...
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <Calendar size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Nenhum compromisso encontrado
          </h3>
          <p className="text-slate-500 mt-1">
            Sua agenda está livre para esta seleção.
          </p>
          <button
            onClick={openNewAppointmentModal}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            <CalendarPlus size={16} /> Agendar Visita
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((apt) => {
            const aptAgenda = agendaById(apt.agenda_id);
            return (
              <div
                key={apt.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-4 rounded-2xl shrink-0 ${apt.type === 'reuniao' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}
                  >
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {apt.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                        <Clock size={14} className="text-slate-400" />
                        {new Date(apt.appointment_date).toLocaleString('pt-BR')}
                      </span>
                      {apt.lead?.name && (
                        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                          <User size={14} className="text-slate-400" />
                          Lead: {apt.lead.name}
                        </span>
                      )}
                      {apt.user_id && isAdmin && (
                        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                          <Briefcase size={14} className="text-slate-400" />
                          {brokerName(apt.user_id)}
                        </span>
                      )}
                      {apt.property && (
                        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                          <Home size={14} className="text-emerald-500" />
                          {apt.property.title}
                          {apt.property.city
                            ? ` — ${apt.property.city}${apt.property.state ? `/${apt.property.state}` : ''}`
                            : ''}
                        </span>
                      )}
                      {aptAgenda && (
                        <span
                          className="flex items-center gap-1.5 text-xs font-bold text-white px-2.5 py-1 rounded-md"
                          style={{ backgroundColor: aptAgenda.color }}
                        >
                          <Calendar size={12} />
                          {aptAgenda.name}
                        </span>
                      )}
                    </div>
                    {apt.notes && (
                      <p className="text-sm text-slate-500 mt-3 border-l-2 border-slate-200 pl-3">
                        {apt.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-6">
                  {apt.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => updateStatus(apt.id, 'completed')}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-sm hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 size={16} /> Concluir
                      </button>
                      <button
                        onClick={() => updateStatus(apt.id, 'canceled')}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors"
                      >
                        <XCircle size={16} /> Cancelar
                      </button>
                    </>
                  ) : (
                    <span
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm ${apt.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                    >
                      {apt.status === 'completed' ? (
                        <>
                          <CheckCircle2 size={16} /> Concluído
                        </>
                      ) : (
                        <>
                          <XCircle size={16} /> Cancelado
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAgendaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingAgenda ? 'Editar Agenda' : 'Nova Agenda'}
              </h2>
              <button
                onClick={() => setShowAgendaModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Nome da agenda *
                </label>
                <input
                  type="text"
                  value={agendaForm.name}
                  onChange={(e) =>
                    setAgendaForm({ ...agendaForm, name: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  placeholder="Ex: Agenda de Visitas"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={agendaForm.description}
                  onChange={(e) =>
                    setAgendaForm({
                      ...agendaForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  placeholder="Ex: Visitas agendadas pelo WhatsApp"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Corretor responsável
                  </label>
                  <select
                    value={agendaForm.broker_id}
                    onChange={(e) =>
                      setAgendaForm({
                        ...agendaForm,
                        broker_id: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="">Selecionar corretor</option>
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.full_name || 'Usuário Sem Nome'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Tipo de agenda
                  </label>
                  <select
                    value={agendaForm.kind}
                    onChange={(e) =>
                      setAgendaForm({ ...agendaForm, kind: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  >
                    {AGENDA_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">
                  Cor
                </label>
                <div className="flex flex-wrap gap-2">
                  {AGENDA_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAgendaForm({ ...agendaForm, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${agendaForm.color === color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              {editingAgenda && isAdmin && (
                <button
                  onClick={() => deleteAgenda(editingAgenda)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} /> Excluir
                </button>
              )}
              <button
                onClick={() => setShowAgendaModal(false)}
                className="px-4 py-2 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveAgenda}
                disabled={savingAgenda}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {savingAgenda
                  ? 'Salvando...'
                  : editingAgenda
                    ? 'Salvar Alterações'
                    : 'Criar Agenda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                Novo Compromisso
              </h2>
              <button
                onClick={() => setShowAppointmentModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={appointmentForm.title}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        title: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    placeholder="Ex: Visita ao imóvel"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Data e Hora *
                  </label>
                  <input
                    type="datetime-local"
                    value={appointmentForm.appointment_date}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        appointment_date: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Agenda
                  </label>
                  <select
                    value={appointmentForm.agenda_id}
                    onChange={(e) => {
                      const agendaId = e.target.value;
                      const agenda = agendaById(agendaId);
                      setAppointmentForm({
                        ...appointmentForm,
                        agenda_id: agendaId,
                        user_id:
                          agenda?.broker_id ||
                          appointmentForm.user_id ||
                          profile?.id ||
                          '',
                      });
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="none">Sem agenda</option>
                    {visibleAgendas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.broker_id ? ` — ${brokerName(a.broker_id)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Tipo
                  </label>
                  <select
                    value={appointmentForm.type}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        type: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="reuniao">Reunião / Visita</option>
                    <option value="retorno">Retorno (Follow-up)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Imóvel (visita)
                  </label>
                  <select
                    value={appointmentForm.property_id}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        property_id: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="">Nenhum</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                        {p.city ? ` — ${p.city}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Lead / Cliente
                  </label>
                  <select
                    value={appointmentForm.lead_id}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        lead_id: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="">Nenhum</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Corretor responsável
                  </label>
                  <select
                    value={appointmentForm.user_id}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        user_id: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  >
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.full_name || 'Usuário Sem Nome'}
                      </option>
                    ))}
                    <option value={profile?.id || ''}>Eu mesmo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Observações
                  </label>
                  <input
                    type="text"
                    value={appointmentForm.notes}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        notes: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    placeholder="Ex: Cliente quer ver as chaves"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowAppointmentModal(false)}
                className="px-4 py-2 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveAppointment}
                disabled={savingAppointment}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                {savingAppointment ? 'Salvando...' : 'Salvar Compromisso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
