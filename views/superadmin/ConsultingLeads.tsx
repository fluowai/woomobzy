import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DemoBooking,
  DemoSlot,
  demoSchedulerService,
} from '../../services/demoScheduler';

const statusLabels: Record<DemoBooking['status'], string> = {
  scheduled: 'Agendada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  no_show: 'No-show',
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Sem horário';
  return new Date(value).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ConsultingLeads: React.FC = () => {
  const [slots, setSlots] = useState<DemoSlot[]>([]);
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [slotForm, setSlotForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    endTime: '12:00',
  });

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const data = await demoSchedulerService.getAdminOverview();
      setSlots(data.slots);
      setBookings(data.bookings);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar agenda de demonstrações');
    } finally {
      setLoading(false);
    }
  };

  const createSlots = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setCreating(true);
      const created = await demoSchedulerService.createSlots(slotForm);
      toast.success(`${created.length} horários criados.`);
      await fetchOverview();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar horários');
    } finally {
      setCreating(false);
    }
  };

  const blockSlot = async (slot: DemoSlot) => {
    try {
      await demoSchedulerService.blockSlot(slot.id);
      toast.success('Horário bloqueado.');
      await fetchOverview();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao bloquear horário');
    }
  };

  const updateBookingStatus = async (booking: DemoBooking, status: DemoBooking['status']) => {
    try {
      await demoSchedulerService.updateBookingStatus(booking.id, status);
      toast.success('Agendamento atualizado.');
      await fetchOverview();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar agendamento');
    }
  };

  const filteredBookings = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return bookings;
    return bookings.filter((booking) =>
      [booking.name, booking.email, booking.company, booking.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [bookings, searchTerm]);

  const openSlots = slots.filter((slot) => slot.status === 'open');
  const scheduledBookings = bookings.filter((booking) => booking.status === 'scheduled');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-600">Super admin</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Agenda de demonstrações
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Configure horários próprios, acompanhe leads qualificados e gerencie calls de 30 minutos.
          </p>
        </div>
        <button onClick={fetchOverview} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
          <RefreshCw size={17} />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Horários abertos" value={openSlots.length} icon={Calendar} tone="emerald" />
        <MetricCard label="Agendadas" value={scheduledBookings.length} icon={Clock} tone="blue" />
        <MetricCard label="Concluídas" value={bookings.filter((b) => b.status === 'completed').length} icon={CheckCircle2} tone="slate" />
        <MetricCard label="Leads totais" value={bookings.length} icon={Users} tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Plus size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Abrir agenda</h2>
              <p className="text-xs font-bold text-slate-500">Cria blocos automáticos de 30 minutos.</p>
            </div>
          </div>

          <form onSubmit={createSlots} className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Data
              <input type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Início
                <input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Fim
                <input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
              </label>
            </div>
            <button disabled={creating} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white shadow-lg shadow-red-900/15 hover:bg-red-700 disabled:opacity-60">
              {creating ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} /> Criar horários</>}
            </button>
          </form>

          <div className="mt-8">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Próximos horários</h3>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <LoadingRows />
              ) : openSlots.length === 0 ? (
                <EmptyState text="Nenhum horário aberto." />
              ) : (
                openSlots.slice(0, 18).map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{formatDateTime(slot.startsAt)}</p>
                      <p className="text-xs font-bold text-slate-500">30 minutos</p>
                    </div>
                    <button onClick={() => blockSlot(slot)} className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Agendamentos qualificados</h2>
                <p className="text-xs font-bold text-slate-500">Todos passaram pelo filtro antes de escolher horário.</p>
              </div>
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar lead..." className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Lead</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Horário</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Filtro</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8"><LoadingRows /></td></tr>
                ) : filteredBookings.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-14"><EmptyState text="Nenhum agendamento encontrado." /></td></tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-900">{booking.name}</p>
                        <p className="text-xs font-semibold text-slate-500">{booking.email}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{booking.company || 'Sem empresa'}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-900">{formatDateTime(booking.slot?.startsAt)}</p>
                        <p className="text-xs font-bold text-slate-500">Call própria de 30 minutos</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-emerald-700">Score {booking.score}</p>
                        <p className="text-xs font-semibold text-slate-500">{booking.teamSize || '-'} corretores | {booking.monthlyLeads || '-'} leads</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                          {statusLabels[booking.status]}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => updateBookingStatus(booking, 'completed')} className="rounded-xl p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700">
                            <CheckCircle2 size={18} />
                          </button>
                          <button onClick={() => updateBookingStatus(booking, 'no_show')} className="rounded-xl p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-700">
                            <ShieldCheck size={18} />
                          </button>
                          <button onClick={() => updateBookingStatus(booking, 'cancelled')} className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-700">
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: number | string; icon: React.ElementType; tone: string }> = ({ label, value, icon: Icon, tone }) => {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="flex items-center gap-4 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <Icon size={23} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      </div>
    </div>
  );
};

const LoadingRows = () => (
  <div className="grid gap-2">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
    ))}
  </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-3 text-center text-slate-400">
    <Calendar size={42} className="text-slate-200" />
    <p className="text-sm font-bold">{text}</p>
  </div>
);

export default ConsultingLeads;
