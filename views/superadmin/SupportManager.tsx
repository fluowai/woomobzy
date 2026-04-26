import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  User,
  Building2,
  Send,
} from 'lucide-react';

interface Ticket {
  id: string;
  organization_id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  organization?: { name: string };
  user_profile?: { full_name: string };
}

interface Message {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  user_profile?: { full_name: string };
}

const SupportManager: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress'>('open');

  // Detail sidebar
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      let query = supabase.from('support_tickets').select('*');

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });
      if (error) throw error;
      setTickets((data as any) || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMessages((data as any) || []);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('support_messages').insert([
        {
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: newMessage,
          is_admin_reply: true,
        },
      ]);

      if (error) throw error;

      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);

        setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
        fetchTickets();
      }

      setNewMessage('');
      fetchMessages(selectedTicket.id);
    } catch (err) {
      alert('Erro ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  };

  const updateTicketStatus = async (status: Ticket['status']) => {
    if (!selectedTicket) return;
    const { error } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', selectedTicket.id);

    if (!error) {
      setSelectedTicket({ ...selectedTicket, status });
      fetchTickets();
    }
  };

  const filteredTickets = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.organization?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6">
      {/* List Sidebar */}
      <div
        className={`flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar chamados..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos</option>
            <option value="open">Abertos</option>
            <option value="in_progress">Em Andamento</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Carregando...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhum chamado encontrado.
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full p-4 flex flex-col gap-2 text-left transition-colors hover:bg-gray-50 ${selectedTicket?.id === ticket.id ? 'bg-indigo-50/50 ring-1 ring-inset ring-indigo-500/10' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ticket.status === 'open'
                        ? 'bg-red-100 text-red-700'
                        : ticket.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {ticket.status}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-bold text-gray-800 text-sm truncate">
                  {ticket.subject}
                </h4>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Building2 size={12} />
                  <span>{ticket.organization_id?.slice(0, 8) || 'N/A'}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Ticket Detail */}
      {selectedTicket ? (
        <div className="flex-[2] flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedTicket.subject}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedTicket.priority === 'urgent'
                      ? 'bg-red-600 text-white'
                      : selectedTicket.priority === 'high'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {selectedTicket.priority}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Aberto por{' '}
                <span className="font-medium text-gray-700">
                  {selectedTicket.user_id?.slice(0, 8) || 'Usuário'}
                </span>{' '}
                em{' '}
                <span className="font-medium text-gray-700">
                  {new Date(selectedTicket.created_at).toLocaleDateString('pt-BR')}
                </span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => updateTicketStatus('resolved')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-all flex items-center gap-2"
              >
                <CheckCircle2 size={18} /> Resolvido
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
              >
                Voltar
              </button>
            </div>
          </div>

          {/* Conversation */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
            {/* Original Description */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <AlertCircle size={14} /> Problema Inicial
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {selectedTicket.description}
              </p>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-gray-200"></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Conversa
              </span>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.is_admin_reply ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.is_admin_reply
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold mb-1 opacity-70 ${msg.is_admin_reply ? 'text-white' : 'text-gray-400'}`}
                  >
                    {msg.is_admin_reply
                      ? 'Você (Suporte)'
                      : 'Cliente'}{' '}
                    •{' '}
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSendMessage} className="relative">
              <textarea
                rows={3}
                placeholder="Escreva sua resposta para o cliente..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all font-bold text-xs flex items-center gap-1"
              >
                {sending ? (
                  '...'
                ) : (
                  <>
                    <Send size={16} /> Enviar
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-[2] bg-white rounded-xl shadow-sm border border-gray-100 items-center justify-center flex-col text-center p-8">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
            <MessageSquare size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Selecione um Chamado
          </h3>
          <p className="text-gray-500 max-w-sm">
            Resolva as dúvidas e problemas técnicos das imobiliárias para
            garantir o melhor uso da plataforma.
          </p>
        </div>
      )}
    </div>
  );
};

export default SupportManager;
