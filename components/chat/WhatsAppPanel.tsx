/**
 * WhatsApp Panel Premium - 3 Colunas
 * Estilo WhatsApp Web melhorado com UI SaaS Enterprise
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Mic,
  Send,
  Image,
  FileText,
  MapPin,
  Check,
  CheckCheck,
  Clock,
  Crown,
  Archive,
  Pin,
  Users,
  Sparkles,
  ArrowLeft,
  X,
  Tag,
  Calendar,
  TrendingUp,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  fromMe: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

interface Contact {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  timestamp?: Date;
  unread: number;
  online?: boolean;
  tag?: 'quente' | 'morno' | 'frio' | 'cliente';
}

interface WhatsAppPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const WhatsAppPanel: React.FC<WhatsAppPanelProps> = ({ isOpen, onClose }) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const contacts: Contact[] = [
    {
      id: '1',
      name: 'Maria Silva',
      lastMessage: 'Ótimo, gostaria de agendar uma visita',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      unread: 2,
      online: true,
      tag: 'quente',
    },
    {
      id: '2',
      name: 'João Santos',
      lastMessage: 'Qual o preço da fazenda?',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      unread: 0,
      tag: 'morno',
    },
    {
      id: '3',
      name: 'Ana Costa',
      lastMessage: 'Obrigada pelo retorno!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      unread: 1,
      online: true,
      tag: 'cliente',
    },
    {
      id: '4',
      name: 'Pedro Oliveira',
      lastMessage: 'Estou interessado no sítio',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      unread: 0,
      tag: 'frio',
    },
  ];

  const aiSuggestions = [
    'Olá! Gostaria de saber mais sobre o imóvel?',
    'Podemos agendar uma visita para este fim de semana?',
    'Qual é a melhor forma de contato?',
  ];

  useEffect(() => {
    if (selectedContact) {
      setMessages([
        {
          id: '1',
          content:
            'Olá! Vi o anúncio da fazenda no site. Tem interesse em vender?',
          timestamp: new Date(Date.now() - 1000 * 60 * 10),
          fromMe: false,
          status: 'read',
        },
        {
          id: '2',
          content: 'Olá Maria! Tenho sim. Qual é a área que você procura?',
          timestamp: new Date(Date.now() - 1000 * 60 * 8),
          fromMe: true,
          status: 'read',
        },
        {
          id: '3',
          content: 'Procuro algo entre 100 e 200 hectares, para pecuária.',
          timestamp: new Date(Date.now() - 1000 * 60 * 6),
          fromMe: false,
          status: 'read',
        },
        {
          id: '4',
          content:
            'Perfeito! Tenho uma fazenda de 150 ha próxima a Brasília, com pastagem reformada. Posso te enviar fotos?',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          fromMe: true,
          status: 'delivered',
        },
      ]);
    }
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      timestamp: new Date(),
      fromMe: true,
      status: 'sent',
    };

    setMessages([...messages, newMessage]);
    setMessage('');

    // Simula resposta da IA
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTagColor = (tag?: string) => {
    switch (tag) {
      case 'quente':
        return 'bg-red-500/20 text-red-400';
      case 'morno':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'frio':
        return 'bg-blue-500/20 text-blue-400';
      case 'cliente':
        return 'bg-emerald-500/20 text-emerald-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getTagLabel = (tag?: string) => {
    switch (tag) {
      case 'quente':
        return 'Quente';
      case 'morno':
        return 'Morno';
      case 'frio':
        return 'Frio';
      case 'cliente':
        return 'Cliente';
      default:
        return '';
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full bg-bg-primary">
      {/* COLUNA 1: CONTATOS */}
      <div className="w-80 flex flex-col border-r border-border-subtle bg-bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-text-primary">
              Mensagens
            </h2>
            <div className="flex gap-2">
              <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
                <Archive size={18} className="text-text-secondary" />
              </button>
              <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
                <MoreVertical size={18} className="text-text-secondary" />
              </button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-input border border-border-subtle rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Lista de Contatos */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`p-3 cursor-pointer transition-all hover:bg-bg-hover ${
                selectedContact?.id === contact.id ? 'bg-bg-hover' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                    {contact.name.charAt(0)}
                  </div>
                  {contact.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-bg-card" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text-primary truncate">
                      {contact.name}
                    </span>
                    {contact.timestamp && (
                      <span className="text-xs text-text-tertiary">
                        {formatTime(contact.timestamp)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getTagColor(
                        contact.tag
                      )}`}
                    >
                      {getTagLabel(contact.tag)}
                    </span>
                    <span className="text-sm text-text-secondary truncate">
                      {contact.lastMessage}
                    </span>
                  </div>
                </div>

                {/* Unread Badge */}
                {contact.unread > 0 && (
                  <div className="flex-shrink-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs text-white font-medium">
                    {contact.unread}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLUNA 2: CHAT */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border-subtle bg-bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="lg:hidden p-2 rounded-lg hover:bg-bg-hover"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                    {selectedContact.name.charAt(0)}
                  </div>
                  {selectedContact.online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-bg-card" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-text-primary">
                    {selectedContact.name}
                  </h3>
                  <span className="text-xs text-emerald-400">
                    {selectedContact.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
                  <Phone size={18} className="text-text-secondary" />
                </button>
                <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
                  <Video size={18} className="text-text-secondary" />
                </button>
                <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
                  <MoreVertical size={18} className="text-text-secondary" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-primary">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      msg.fromMe
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-bg-card text-text-primary rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 ${
                        msg.fromMe ? 'text-white/70' : 'text-text-tertiary'
                      }`}
                    >
                      <span className="text-xs">
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.fromMe && (
                        <span>
                          {msg.status === 'read' ? (
                            <CheckCheck size={14} />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck size={14} />
                          ) : (
                            <Check size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-bg-card px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* AI Suggestions */}
            <div className="px-4 py-2 border-t border-border-subtle bg-bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-accent" />
                <span className="text-xs text-text-tertiary">Sugestões IA</span>
              </div>
              <div className="flex gap-2 overflow-x-hidden pb-2">
                {aiSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setMessage(suggestion)}
                    className="flex-shrink-0 px-3 py-1.5 bg-bg-hover rounded-full text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {suggestion.length > 30
                      ? suggestion.slice(0, 30) + '...'
                      : suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border-subtle bg-bg-card">
              <div className="flex items-end gap-3">
                <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
                  <Paperclip size={20} className="text-text-secondary" />
                </button>
                <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
                  <Image size={20} className="text-text-secondary" />
                </button>
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite uma mensagem..."
                    className="w-full bg-bg-input border border-border-subtle rounded-2xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-colors"
                  />
                  <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors absolute right-1 top-1/2 -translate-y-1/2">
                    <Mic size={18} className="text-text-secondary" />
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="p-2.5 bg-primary rounded-full hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} className="text-white" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center bg-bg-primary">
            <div className="text-center p-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-bg-card flex items-center justify-center">
                <MessageCircle size={32} className="text-text-tertiary" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-text-secondary max-w-sm">
                Escolha um contato da lista para iniciar uma conversa ou ver o
                histórico de mensagens.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* COLUNA 3: CRM LATERAL (só mostra quando contato selecionado) */}
      {selectedContact && (
        <div className="w-72 border-l border-border-subtle bg-bg-card p-4 hidden xl:block overflow-y-auto">
          {/* Header Contact */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary flex items-center justify-center text-white text-xl font-medium mb-3">
              {selectedContact.name.charAt(0)}
            </div>
            <h3 className="font-semibold text-text-primary">
              {selectedContact.name}
            </h3>
            <p className="text-sm text-text-secondary">+55 11 99999-9999</p>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <h4 className="text-xs font-medium text-text-tertiary uppercase mb-2">
              Tag
            </h4>
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm ${getTagColor(
                  selectedContact.tag
                )}`}
              >
                {getTagLabel(selectedContact.tag)}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 mb-6">
            <button className="w-full flex items-center gap-3 p-3 bg-bg-hover rounded-lg hover:bg-border transition-colors text-left">
              <Tag size={18} className="text-text-secondary" />
              <span className="text-sm text-text-primary">Mudar etapa</span>
              <ChevronDown size={16} className="text-text-tertiary ml-auto" />
            </button>
            <button className="w-full flex items-center gap-3 p-3 bg-bg-hover rounded-lg hover:bg-border transition-colors text-left">
              <Calendar size={18} className="text-text-secondary" />
              <span className="text-sm text-text-primary">Agendar visita</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 bg-bg-hover rounded-lg hover:bg-border transition-colors text-left">
              <Users size={18} className="text-text-secondary" />
              <span className="text-sm text-text-primary">Criar tarefa</span>
            </button>
          </div>

          {/* Activity Summary */}
          <div className="mb-6">
            <h4 className="text-xs font-medium text-text-tertiary uppercase mb-2">
              Resumo
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-text-secondary" />
                  <span className="text-sm text-text-secondary">Interesse</span>
                </div>
                <span className="text-sm font-medium text-emerald-400">
                  Alto
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-text-secondary" />
                  <span className="text-sm text-text-secondary">
                    Último contato
                  </span>
                </div>
                <span className="text-sm text-text-primary">Há 5 min</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h4 className="text-xs font-medium text-text-tertiary uppercase mb-2">
              Anotações
            </h4>
            <textarea
              placeholder="Adicionar nota..."
              className="w-full bg-bg-input border border-border-subtle rounded-lg p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-colors resize-none h-24"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Helper icon
const MessageCircle = ({
  size,
  className,
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.9 3.8 8.38 8.38 0 0 1-3.8.9l-.2 2.2a8.5 8.5 0 0 1-6.8 1.5 8.38 8.38 0 0 1-3.8-.9 8.5 8.5 0 0 1-7.9-3.8A8.38 8.38 0 0 1 2.5 3a8.5 8.5 0 0 1 1.5-6.8 8.38 8.38 0 0 1 .9-3.8 8.5 8.5 0 0 1 7.9-3.8 8.38 8.38 0 0 1 3.8-.9l.2-2.2A8.5 8.5 0 0 1 20 2.5a8.38 8.38 0 0 1 3.8.9 8.5 8.5 0 0 1 7.9 3.8A8.38 8.38 0 0 1 21.5 11.5Z" />
  </svg>
);

export default WhatsAppPanel;
