import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Send,
  Loader2,
  LifeBuoy
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
}

const SupportPortal: React.FC = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // New Ticket State
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [profile]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    if (!profile?.organization_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      logger.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      logger.error('Error fetching messages:', error);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id || !profile?.id) return;
    
    try {
      setCreating(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          organization_id: profile.organization_id,
          user_id: profile.id,
          subject,
          description,
          status: 'open',
          priority: 'medium'
        })
        .select()
        .single();

      if (error) throw error;
      
      setTickets([data, ...tickets]);
      setShowCreateModal(false);
      setSubject('');
      setDescription('');
      setSelectedTicket(data);
    } catch (error) {
      logger.error('Error creating ticket:', error);
      alert('Erro ao criar chamado. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim() || !profile?.id) return;

    try {
      setSendingMessage(true);
      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: profile.id,
          message: newMessage.trim(),
          is_admin_reply: false
        })
        .select()
        .single();

      if (error) throw error;
      
      setMessages([...messages, data]);
      setNewMessage('');
    } catch (error) {
      logger.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-md">Aberto</span>;
      case 'in_progress':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-md">Em Atendimento</span>;
      case 'closed':
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded-md">Finalizado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <LifeBuoy size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Central de Ajuda & Suporte</h2>
            <p className="text-xs text-gray-500">Acompanhe seus chamados e tire dúvidas com nosso time.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-premium py-2 px-4 text-xs flex items-center gap-2"
        >
          <Plus size={16} /> Novo Chamado
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
        {/* Ticket List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Seus Chamados</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-xs">Carregando...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <MessageSquare className="mx-auto mb-2 opacity-20" size={32} />
                <p className="text-xs">Nenhum chamado aberto.</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full p-4 border-b border-gray-50 text-left transition-colors hover:bg-gray-50 ${selectedTicket?.id === ticket.id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-gray-900 line-clamp-1">{ticket.subject}</span>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock size={10} />
                    {format(new Date(ticket.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation Area */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {selectedTicket ? (
            <>
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-800">{selectedTicket.subject}</h3>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <p className="text-xs text-gray-500">ID: {selectedTicket.id}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                {/* Initial Description */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                    {profile?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 px-2">
                       {format(new Date(selectedTicket.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-4 ${msg.is_admin_reply ? 'flex-row' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.is_admin_reply ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'}`}>
                      {msg.is_admin_reply ? 'S' : (profile?.name?.charAt(0) || 'U')}
                    </div>
                    <div className="flex-1">
                      <div className={`rounded-2xl p-4 shadow-sm border ${msg.is_admin_reply ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100'}`}>
                        {msg.is_admin_reply && (
                          <span className="text-[10px] font-black uppercase text-amber-600 mb-1 block">Equipe de Suporte</span>
                        )}
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 px-2">
                        {format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTicket.status !== 'closed' && (
                <div className="p-4 border-t border-gray-100 bg-white">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escreva sua resposta..."
                      className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-12"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <button 
                      type="submit"
                      disabled={sendingMessage || !newMessage.trim()}
                      className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center"
                    >
                      {sendingMessage ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <MessageSquare size={40} className="text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-400">Nenhum chamado selecionado</h3>
              <p className="text-sm max-w-xs mt-2">Selecione um chamado ao lado para ver o histórico de conversas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
              <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-1">Novo Chamado</h3>
              <p className="text-indigo-100 text-sm opacity-80">Descreva sua dúvida ou problema detalhadamente.</p>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Assunto</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Dúvida sobre integração WhatsApp"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Descrição</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Conte-nos o que está acontecendo..."
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest hover:bg-gray-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-4 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="animate-spin" size={16} /> : 'Abrir Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportPortal;
