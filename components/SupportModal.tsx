import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Send,
  X,
  CheckCircle,
  AlertTriangle,
  LifeBuoy,
  Plus,
  ArrowLeft,
  Clock,
  MessageCircle,
  ChevronRight,
  Inbox,
} from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
}

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'tickets' | 'new' | 'detail';

const priorityLabel: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Média', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'Alta', color: 'bg-amber-100 text-amber-600' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-600' },
};

const statusLabel: Record<string, { label: string; color: string; icon: string }> = {
  open: { label: 'Aberto', color: 'bg-orange-100 text-orange-700', icon: '🟠' },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: '🔵' },
  resolved: { label: 'Resolvido', color: 'bg-green-100 text-green-700', icon: '🟢' },
  closed: { label: 'Fechado', color: 'bg-gray-100 text-gray-500', icon: '⚪' },
};

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('tickets');

  // New Ticket form
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Tickets list
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Detail view
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && profile) {
      fetchTickets();
    }
  }, [isOpen, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const fetchTickets = async () => {
    if (!profile) return;
    setTicketsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const openTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
    setTab('detail');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('support_tickets').insert([
        {
          organization_id: profile.organization_id,
          user_id: profile.id,
          subject,
          description,
          priority,
          status: 'open',
        },
      ]);

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSubject('');
        setDescription('');
        setPriority('medium');
        setTab('tickets');
        fetchTickets();
      }, 2000);
    } catch (err) {
      alert('Erro ao enviar chamado. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket || !profile) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase.from('support_messages').insert([
        {
          ticket_id: selectedTicket.id,
          user_id: profile.id,
          message: newMessage,
          is_admin_reply: false,
        },
      ]);
      if (error) throw error;
      setNewMessage('');
      fetchMessages(selectedTicket.id);
    } catch (err) {
      alert('Erro ao enviar mensagem.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* ═══════ HEADER ═══════ */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' }}>
          <div className="flex items-center gap-3 text-white">
            {tab === 'detail' ? (
              <button
                onClick={() => { setTab('tickets'); setSelectedTicket(null); }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <LifeBuoy size={24} />
            )}
            <div>
              <h3 className="text-lg font-bold">
                {tab === 'detail' ? 'Detalhes do Chamado' : 'Central de Suporte'}
              </h3>
              <p className="text-xs opacity-80">
                {tab === 'detail' 
                  ? selectedTicket?.subject 
                  : 'Abra chamados e acompanhe suas solicitações'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* ═══════ TAB BAR (only on tickets/new) ═══════ */}
        {tab !== 'detail' && (
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setTab('tickets')}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
                tab === 'tickets'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Inbox size={16} />
              Meus Chamados
              {tickets.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {tickets.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('new')}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
                tab === 'new'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Plus size={16} />
              Novo Chamado
            </button>
          </div>
        )}

        {/* ═══════ CONTENT ═══════ */}
        <div className="flex-1 overflow-y-auto">

          {/* ────── TICKETS LIST ────── */}
          {tab === 'tickets' && (
            <div>
              {ticketsLoading ? (
                <div className="p-12 text-center text-gray-400">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div>
                  <p className="text-sm font-medium">Carregando chamados...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-12 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-700 mb-2">Nenhum chamado</h4>
                  <p className="text-sm text-gray-400 mb-6 max-w-xs">
                    Você ainda não abriu nenhum chamado de suporte. Precisa de ajuda? Clique abaixo.
                  </p>
                  <button
                    onClick={() => setTab('new')}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    <Plus size={16} /> Abrir Chamado
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {tickets.map((ticket) => {
                    const st = statusLabel[ticket.status] || statusLabel.open;
                    const pr = priorityLabel[ticket.priority] || priorityLabel.medium;
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => openTicketDetail(ticket)}
                        className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors group"
                      >
                        {/* Status dot */}
                        <div className="text-xl flex-shrink-0">{st.icon}</div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-800 text-sm truncate">
                              {ticket.subject}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pr.color}`}>
                              {pr.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.color}`}>
                              {st.label}
                            </span>
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Clock size={10} />
                              {formatDate(ticket.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ────── NEW TICKET FORM ────── */}
          {tab === 'new' && (
            <>
              {success ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Chamado Aberto!
                  </h3>
                  <p className="text-gray-500">
                    Nossa equipe de suporte analisará seu pedido e responderá em
                    breve.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Assunto / Tópico
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dúvida sobre exportação XLM"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente (Bloqueante)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Descrição Detalhada
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Descreva o que está acontecendo ou sua dúvida..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0" size={18} />
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      <strong>Dica:</strong> Detalhe o máximo possível para que
                      possamos resolver seu problema no primeiro contato.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : (
                      <>
                        <Send size={18} /> Enviar Chamado
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ────── TICKET DETAIL / CONVERSATION ────── */}
          {tab === 'detail' && selectedTicket && (
            <div className="flex flex-col" style={{ height: 'calc(85vh - 140px)' }}>
              {/* Ticket Info Header */}
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      (statusLabel[selectedTicket.status] || statusLabel.open).color
                    }`}>
                      {(statusLabel[selectedTicket.status] || statusLabel.open).icon}{' '}
                      {(statusLabel[selectedTicket.status] || statusLabel.open).label}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      (priorityLabel[selectedTicket.priority] || priorityLabel.medium).color
                    }`}>
                      {(priorityLabel[selectedTicket.priority] || priorityLabel.medium).label}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {formatDate(selectedTicket.created_at)}
                  </span>
                </div>
                {/* Original description */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 mt-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Descrição Original
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description}
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle size={32} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400 font-medium">
                      Aguardando resposta da equipe de suporte...
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      Você será notificado quando houver uma atualização.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_admin_reply ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3.5 ${
                          msg.is_admin_reply
                            ? 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
                            : 'bg-indigo-600 text-white rounded-tr-sm'
                        }`}
                      >
                        <div
                          className={`text-[10px] font-bold mb-1 ${
                            msg.is_admin_reply ? 'text-indigo-500' : 'text-white/70'
                          }`}
                        >
                          {msg.is_admin_reply ? '🛡️ Equipe Suporte' : 'Você'}{' '}
                          • {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    placeholder="Escreva uma mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1.5 font-bold text-sm"
                  >
                    <Send size={14} />
                  </button>
                </form>
              )}

              {/* Resolved/Closed banner */}
              {(selectedTicket.status === 'closed' || selectedTicket.status === 'resolved') && (
                <div className="p-3 bg-green-50 border-t border-green-100 text-center">
                  <p className="text-sm text-green-700 font-bold flex items-center justify-center gap-2">
                    <CheckCircle size={16} />
                    Este chamado foi {selectedTicket.status === 'resolved' ? 'resolvido' : 'encerrado'}.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportModal;
