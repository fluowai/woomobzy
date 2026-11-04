import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headset, Eye, Clock, User, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { fetchWooSupportTickets, fetchWooSupportSessions } from '../../../services/wooControl';

const statusStyles: Record<string, string> = {
  open: 'bg-emerald-500/10 text-emerald-500',
  in_progress: 'bg-amber-500/10 text-amber-500',
  closed: 'bg-zinc-500/10 text-zinc-500',
};

const priorityStyles: Record<string, string> = {
  high: 'bg-red-500/10 text-red-500',
  medium: 'bg-amber-500/10 text-amber-500',
  low: 'bg-sky-500/10 text-sky-400',
};

const statusLabel: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em Andamento',
  closed: 'Fechado',
};

const priorityLabel: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const sessionStatusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-500',
  ENDED: 'bg-zinc-500/10 text-zinc-500',
  EXPIRED: 'bg-red-500/10 text-red-500',
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const Support = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'tickets' | 'sessions'>('tickets');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([fetchWooSupportTickets(), fetchWooSupportSessions()])
      .then(([ticketData, sessionData]) => {
        if (!active) return;
        setTickets(ticketData || []);
        setSessions(sessionData || []);
        setError(null);
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar dados de suporte');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredTickets = tickets.filter((t) => {
    const q = search.toLowerCase();
    const subject = (t.subject || '').toLowerCase();
    const orgName = t.organizations?.name || '';
    return subject.includes(q) || orgName.toLowerCase().includes(q);
  });

  const tabs = [
    { key: 'tickets' as const, label: 'Tickets', icon: Headset },
    { key: 'sessions' as const, label: 'Sessões de Suporte', icon: Clock },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Suporte Global</h2>
          <p className="text-sm text-[#9097A5] mt-1">Gerencie tickets globais e realize impersonação de conta com segurança.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#252A35] pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'text-white border-[#d4af37]'
                : 'text-[#9097A5] border-transparent hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#9097A5] text-sm">
          Carregando...
        </div>
      ) : activeTab === 'tickets' ? (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9097A5]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por assunto ou organização..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-[#161A23] text-sm text-white placeholder-[#9097A5] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              style={{ borderColor: '#252A35' }}
            />
          </div>

          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Headset size={32} className="text-[#9097A5] mb-3" />
              <p className="text-[#9097A5] text-sm">Nenhum ticket encontrado.</p>
              {search && <p className="text-[#9097A5] text-xs mt-1">Tente ajustar o filtro de busca.</p>}
            </div>
          ) : (
            filteredTickets.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl border flex items-center justify-between"
                style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
              >
                <div className="flex items-center gap-4">
                  <Headset size={20} className="text-[#9097A5]" />
                  <div>
                    <p className="text-sm font-medium text-white">{t.subject}</p>
                    <p className="text-xs text-[#9097A5] mt-0.5">
                      #{String(t.id).slice(0, 8)} • {t.organizations?.name || 'Sem organização'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded border border-[#252A35] ${statusStyles[t.status] || 'bg-zinc-500/10 text-zinc-500'}`}>
                    {statusLabel[t.status] || t.status}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded border border-[#252A35] ${priorityStyles[t.priority] || 'bg-zinc-500/10 text-zinc-500'}`}>
                    {priorityLabel[t.priority] || t.priority}
                  </span>
                  <button
                    onClick={() => setSelectedTicket(selectedTicket?.id === t.id ? null : t)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#161A23] border border-[#252A35] text-xs text-[#9097A5] hover:text-white transition-colors"
                  >
                    <Eye size={14} /> Ver
                  </button>
                </div>
              </motion.div>
            ))
          )}

          {/* Detail Panel */}
          <AnimatePresence>
            {selectedTicket && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-5 rounded-xl border" style={{ backgroundColor: '#161A23', borderColor: '#252A35' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">{selectedTicket.subject}</h4>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="text-xs text-[#9097A5] hover:text-white transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <span className="text-xs text-[#9097A5] flex items-center gap-1">
                      <User size={13} /> {selectedTicket.profiles?.name || 'Usuário desconhecido'}
                    </span>
                    <span className="text-xs text-[#9097A5] flex items-center gap-1">
                      <Clock size={13} /> Criado em {formatDateTime(selectedTicket.created_at)}
                    </span>
                    <span className="text-xs text-[#9097A5]">{selectedTicket.organizations?.name}</span>
                  </div>
                  <p className="text-sm text-[#9097A5] leading-relaxed">{selectedTicket.description || 'Sem descrição.'}</p>
                  <div className="mt-4 flex gap-4">
                    <span className={`px-2 py-1 text-xs rounded border border-[#252A35] ${statusStyles[selectedTicket.status] || 'bg-zinc-500/10 text-zinc-500'}`}>
                      {statusLabel[selectedTicket.status] || selectedTicket.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded border border-[#252A35] ${priorityStyles[selectedTicket.priority] || 'bg-zinc-500/10 text-zinc-500'}`}>
                      {priorityLabel[selectedTicket.priority] || selectedTicket.priority}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Clock size={32} className="text-[#9097A5] mb-3" />
              <p className="text-[#9097A5] text-sm">Nenhuma sessão de suporte encontrada.</p>
            </div>
          ) : (
            sessions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl border flex items-center justify-between"
                style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
              >
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} className={s.status === 'ACTIVE' ? 'text-emerald-500' : 'text-[#9097A5]'} />
                  <div>
                    <p className="text-sm font-medium text-white">{s.profiles?.name || 'Suporte'}</p>
                    <p className="text-xs text-[#9097A5] mt-0.5">
                      {s.organizations?.name || 'Organização'} • {s.target_role || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-[#9097A5]">Início: {formatDateTime(s.started_at)}</p>
                    <p className="text-xs text-[#9097A5] mt-0.5">Expira: {formatDateTime(s.expires_at)}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded border border-[#252A35] ${sessionStatusStyles[s.status] || 'bg-zinc-500/10 text-zinc-500'}`}>
                    {s.status || '—'}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
