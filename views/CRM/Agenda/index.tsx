import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  User,
  Users,
} from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { toast } from 'sonner';
import { useAuth } from '../../../context/AuthContext';

const Agenda = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending'); // 'pending', 'completed', 'canceled', 'all'

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  useEffect(() => {
    if (isAdmin && profile?.organization_id) {
      fetchBrokers();
    }
  }, [isAdmin, profile?.organization_id]);

  const fetchBrokers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name:name')
        .eq('organization_id', profile?.organization_id)
        .order('name');
      if (error) throw error;
      setBrokers(data || []);
    } catch (err) {
      console.error('Error fetching brokers', err);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('lead_appointments')
        .select('*, lead:leads(name)')
        .order('appointment_date', { ascending: true });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (isAdmin && selectedBrokerId !== 'all') {
        query = query.eq('user_id', selectedBrokerId);
      } else if (!isAdmin && profile?.id) {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchAppointments();
    }
  }, [filterStatus, selectedBrokerId, profile?.id]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('lead_appointments')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      toast.success('Status atualizado');
      fetchAppointments();
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Minha Agenda
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie suas reuniões e retornos agendados.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {isAdmin && brokers.length > 0 && (
            <div className="relative">
              <select
                value={selectedBrokerId}
                onChange={(e) => setSelectedBrokerId(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
              >
                <option value="all">Todas as Agendas</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.full_name || 'Usuário Sem Nome'}
                  </option>
                ))}
              </select>
              <Users
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          )}

          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            {['pending', 'completed', 'canceled', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${filterStatus === status ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
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
      </div>

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
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((apt) => (
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
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                      <Clock size={14} className="text-slate-400" />
                      {new Date(apt.appointment_date).toLocaleString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                      <User size={14} className="text-slate-400" />
                      Lead: {apt.lead?.name || 'Desconhecido'}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 border border-slate-200 px-2 py-1 rounded">
                      {apt.type === 'reuniao' ? 'Reunião' : 'Retorno'}
                    </span>
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
          ))}
        </div>
      )}
    </div>
  );
};

export default Agenda;
