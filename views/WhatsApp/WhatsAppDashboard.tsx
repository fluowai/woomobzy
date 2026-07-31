import React, { useState } from 'react';
import { useWhatsAppInbox } from './hooks/useWhatsAppInbox';
import {
  getUnifiedChatName,
  getUnifiedChatSubtitle,
} from './hooks/unifiedInbox';

import {
  Search,
  Settings2,
  Phone,
  MessageCircle,
  Instagram,
  Globe,
  Bell,
  Plus,
  RefreshCw,
  MoreVertical,
  Star,
  Edit2,
  Paperclip,
  Image as ImageIcon,
  Mic,
  FileText,
  Type,
  Sparkles,
  Smile,
  Send,
  ChevronDown,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Flame,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppDashboard() {
  const {
    chats,
    filteredChats,
    selectedChat,
    handleSelectChat,
    messages,
    searchQuery,
    setSearchQuery,
    handleSendMessage,
    loading,
    isConnected,
    selectedInstance,
    loadingMessages,
  } = useWhatsAppInbox();

  const [inputText, setInputText] = useState('');

  const onSend = () => {
    if (!inputText.trim()) return;
    handleSendMessage(inputText.trim());
    setInputText('');
  };

  const [isLeadDetailsOpen, setIsLeadDetailsOpen] = useState(false);

  return (
    <div className="w-full h-[calc(100vh-2rem)] min-h-[800px] bg-slate-50 font-sans text-slate-800 flex flex-col animate-fade-in overflow-hidden -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Central de mensagens
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Atenda WhatsApp, Instagram e leads em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{' '}
            Realtime
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 shadow-sm">
            <MessageCircle size={14} className="text-emerald-500" /> WhatsApp
            conectado
          </div>
          <button
            onClick={() => toast.info('Importação de histórico em breve')}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} /> Importar histórico
          </button>
          <button
            onClick={() => toast.info('Nova conversa em breve')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={16} /> Nova conversa
          </button>
          <button
            onClick={() => toast.info('Notificações')}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 relative shadow-sm ml-2"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 border-2 border-white rounded-full text-[8px] font-bold text-white flex items-center justify-center">
              3
            </span>
          </button>
        </div>
      </div>

      {/* Main Content (3 Columns) */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Left Column: Chat List */}
        <div
          className={`w-full md:w-[340px] flex-col bg-white border border-slate-200 rounded-2xl shadow-sm shrink-0 overflow-hidden ${selectedChat ? 'hidden md:flex' : 'flex'}`}
        >
          <div className="p-4 border-b border-slate-100 space-y-4 shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar conversas, contatos ou imóveis..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
              <button
                onClick={() => toast.info('Configurações do chat em breve')}
                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 shrink-0"
              >
                <Settings2 size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => toast.info('Filtrar: Todos')}
                className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg whitespace-nowrap"
              >
                Todos
              </button>
              <button
                onClick={() => toast.info('Filtrar: WhatsApp')}
                className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <MessageCircle size={14} className="text-emerald-500" />{' '}
                WhatsApp
              </button>
              <button
                onClick={() => toast.info('Filtrar: Instagram')}
                className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <Instagram size={14} className="text-pink-500" /> Instagram
              </button>
              <button
                onClick={() => toast.info('Filtrar: Site')}
                className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <Globe size={14} /> Site
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.info('Minha fila - 18 conversas')}
                className="flex-1 py-1.5 px-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold rounded-lg flex items-center justify-between"
              >
                Minha fila{' '}
                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                  18
                </span>
              </button>
              <button
                onClick={() => toast.info('Sem responsável - 6 conversas')}
                className="flex-1 py-1.5 px-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold rounded-lg flex items-center justify-between"
              >
                Sem responsável{' '}
                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                  6
                </span>
              </button>
              <button
                onClick={() => toast.info('SLA vencido - 4 conversas')}
                className="flex-1 py-1.5 px-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold rounded-lg flex items-center justify-between"
              >
                SLA vencido{' '}
                <span className="bg-slate-700 text-white px-1.5 py-0.5 rounded-full">
                  4
                </span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                <p className="text-lg font-bold text-slate-900">128</p>
                <p className="text-[9px] text-slate-500 uppercase font-medium">
                  conversas
                </p>
              </div>
              <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                <p className="text-lg font-bold text-slate-900">24</p>
                <p className="text-[9px] text-slate-500 uppercase font-medium">
                  abertas
                </p>
              </div>
              <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                <p className="text-lg font-bold text-slate-900">7</p>
                <p className="text-[9px] text-slate-500 uppercase font-medium">
                  aguardando
                </p>
              </div>
              <div className="text-center bg-red-50 rounded-lg p-2 border border-red-100">
                <p className="text-lg font-bold text-red-600">4</p>
                <p className="text-[9px] text-red-600 uppercase font-bold">
                  SLA vencido
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 cursor-pointer hover:text-slate-700">
              Ordenar: Mais recentes <ChevronDown size={14} />
            </span>
            <Settings2
              size={14}
              className="text-slate-400 cursor-pointer hover:text-slate-600"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors relative ${selectedChat?.id === chat.id ? 'bg-emerald-50/50 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                onClick={() => handleSelectChat(chat)}
              >
                <div className="flex gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={
                        chat.avatar_url ||
                        'https://ui-avatars.com/api/?name=' +
                          encodeURIComponent(getUnifiedChatName(chat)) +
                          '&background=random'
                      }
                      alt="Avatar"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                      {chat.platform === 'whatsapp' ? (
                        <MessageCircle size={12} className="text-emerald-500" />
                      ) : (
                        <Instagram size={12} className="text-pink-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-bold text-slate-900 truncate">
                        {getUnifiedChatName(chat)}
                      </p>
                      <span className="text-xs font-bold text-slate-500">
                        {chat.last_message_at
                          ? new Date(chat.last_message_at).toLocaleTimeString(
                              [],
                              { hour: '2-digit', minute: '2-digit' }
                            )
                          : ''}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 truncate mb-2">
                      {chat.last_message || 'Nenhuma mensagem'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded">
                          {getUnifiedChatSubtitle(chat)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {chat.unread_count > 0 && (
                          <span className="w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column: Chat Window */}
        <div
          className={`flex-1 flex-col bg-white border border-slate-200 rounded-2xl shadow-sm min-w-0 relative ${!selectedChat ? 'hidden md:flex' : 'flex'}`}
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => handleSelectChat(null)}
                className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <img
                src={
                  selectedChat?.avatar_url ||
                  'https://ui-avatars.com/api/?name=' +
                    encodeURIComponent(
                      selectedChat ? getUnifiedChatName(selectedChat) : ''
                    ) +
                    '&background=random'
                }
                alt="Avatar"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedChat ? getUnifiedChatName(selectedChat) : ''}
                  </h2>
                  <Star size={16} className="text-amber-400 fill-amber-400" />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                  {selectedChat?.platform === 'whatsapp' ? (
                    <MessageCircle size={14} className="text-emerald-500" />
                  ) : (
                    <Instagram size={14} className="text-pink-500" />
                  )}
                  <span>
                    {selectedChat ? getUnifiedChatSubtitle(selectedChat) : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="hidden lg:block">
                <p className="text-xs font-medium text-slate-400 mb-1">Lead</p>
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 2C12 2 7 7.5 7 12C7 14.7614 9.23858 17 12 17C14.7614 17 17 14.7614 17 12C17 7.5 12 2 12 2Z" />
                    </svg>
                  </div>
                  Compradora quente
                </div>
              </div>
              <div className="hidden xl:block">
                <p className="text-xs font-medium text-slate-400 mb-1">
                  Responsável
                </p>
                <div className="flex items-center gap-2">
                  <img
                    src="https://i.pravatar.cc/150?u=a042581f4e29026704i"
                    alt="Juliana"
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                    Juliana Gomes{' '}
                    <ChevronDown size={14} className="text-slate-400" />
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsLeadDetailsOpen(!isLeadDetailsOpen)}
                className={`p-2 rounded-lg transition-colors ${isLeadDetailsOpen ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                title="Detalhes do Lead"
              >
                {isLeadDetailsOpen ? (
                  <PanelRightClose size={20} />
                ) : (
                  <PanelRightOpen size={20} />
                )}
              </button>
              <button
                onClick={() => toast.info('Opções do chat')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors hidden sm:block"
              >
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Interest Sub-header */}
          <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Interesse principal
                </p>
                <p className="text-sm font-bold text-slate-700">
                  Apto 3 dorm • Centro • até R$ 850 mil
                </p>
              </div>
            </div>
            <button
              onClick={() => toast.info('Editar interesse em breve')}
              className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded shadow-sm"
            >
              <Edit2 size={12} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#f8fafc] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
            {loadingMessages && (
              <div className="text-center text-slate-500 text-sm">
                Carregando mensagens...
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${msg.is_from_me ? 'items-end' : 'items-start'} mt-2`}
              >
                <div
                  className={`${msg.is_from_me ? 'bg-[#dcf8c6] border border-[#c5e6ad] rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm max-w-[80%] relative' : 'bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm max-w-[80%]'}`}
                >
                  {msg.media_url ? (
                    msg.type === 'image' ? (
                      <img
                        src={msg.media_url}
                        alt="Media"
                        className="max-w-full rounded-lg mb-2"
                      />
                    ) : msg.type === 'video' ? (
                      <video
                        src={msg.media_url}
                        controls
                        className="max-w-full rounded-lg mb-2"
                      />
                    ) : msg.type === 'audio' ? (
                      <audio
                        src={msg.media_url}
                        controls
                        className="max-w-full mb-2"
                      />
                    ) : (
                      <a
                        href={msg.media_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 underline flex items-center gap-1"
                      >
                        <FileText size={16} /> Documento
                      </a>
                    )
                  ) : null}
                  <p className="text-[15px] text-slate-800 whitespace-pre-line">
                    {msg.content}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold text-slate-400 flex items-center gap-1 ${msg.is_from_me ? 'mr-1' : 'ml-1'}`}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {msg.is_from_me && (
                    <CheckCircle2
                      size={12}
                      className={
                        msg.delivery_status === 'read'
                          ? 'text-blue-500'
                          : 'text-slate-400'
                      }
                    />
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Actions Suggestions */}
          <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 backdrop-blur-sm">
            <button
              onClick={() => toast.info('Enviar opções de imóveis')}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 text-[11px] font-bold rounded-full whitespace-nowrap shadow-sm transition-colors flex items-center gap-1.5"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>{' '}
              Enviar opções
            </button>
            <button
              onClick={() => toast.info('Simulador de financiamento em breve')}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 text-[11px] font-bold rounded-full whitespace-nowrap shadow-sm transition-colors flex items-center gap-1.5"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>{' '}
              Simular financiamento
            </button>
            <button
              onClick={() => toast.info('Agendamento de visita em breve')}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 text-[11px] font-bold rounded-full whitespace-nowrap shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Calendar size={12} /> Agendar visita
            </button>
            <button
              onClick={() => toast.info('Pedir documentos')}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 text-[11px] font-bold rounded-full whitespace-nowrap shadow-sm transition-colors flex items-center gap-1.5"
            >
              <FileText size={12} /> Pedir documentos
            </button>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <div className="border border-slate-300 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
              <textarea
                placeholder="Digite uma mensagem ou use / para templates..."
                className="w-full max-h-32 min-h-[48px] p-3 text-sm text-slate-700 outline-none resize-none bg-transparent"
                rows={1}
              />
              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toast.info('Anexar arquivo')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Paperclip size={18} />
                  </button>
                  <button
                    onClick={() => toast.info('Enviar imagem')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <ImageIcon size={18} />
                  </button>
                  <button
                    onClick={() => toast.info('Gravar áudio')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Mic size={18} />
                  </button>
                  <button
                    onClick={() => toast.info('Enviar arquivo')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <FileText size={18} />
                  </button>
                  <button
                    onClick={() => toast.info('Inserir template')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Type size={18} />
                  </button>
                  <div className="w-px h-5 bg-slate-200 mx-1" />
                  <button
                    onClick={() => toast.info('Assistente IA')}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors flex items-center gap-1"
                  >
                    <Sparkles size={16} />{' '}
                    <span className="text-xs font-bold">IA</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toast.info('Seletor de emojis em breve')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Smile size={20} />
                  </button>
                  <button
                    onClick={() => toast.info('Mensagem enviada')}
                    className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center transition-colors shadow-md shadow-emerald-600/20"
                  >
                    <Send size={18} className="ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Lead Details Sidebar */}
        {isLeadDetailsOpen && (
          <div className="absolute inset-0 z-20 md:relative md:inset-auto w-full md:w-[320px] xl:w-[360px] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm shrink-0 overflow-y-auto custom-scrollbar animate-in slide-in-from-right duration-300">
            {/* Section: Dados do lead */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4 cursor-pointer group">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300" />{' '}
                  Dados do lead
                </h3>
                <ChevronDown
                  size={16}
                  className="text-slate-400 group-hover:text-slate-600"
                />
              </div>

              <div className="flex flex-col items-center text-center mb-5">
                <img
                  src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
                  alt="Marina"
                  className="w-20 h-20 rounded-full object-cover mb-3 shadow-sm border-2 border-white"
                />
                <h2 className="text-lg font-bold text-slate-900 mb-1">
                  Marina Lopes
                </h2>

                <div className="space-y-1.5 mt-3 w-full text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MessageCircle size={14} className="text-emerald-500" /> +55
                    11 98765-4321
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={14} className="text-slate-400" />{' '}
                    marina.lopes@email.com
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={14} className="text-slate-400" /> São Paulo •
                    SP
                  </div>
                </div>
              </div>

              <button
                onClick={() => toast.info('Redirecionando para CRM...')}
                className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                Ver no CRM
              </button>
            </div>

            {/* Section: Funil & Score */}
            <div className="p-4 border-b border-slate-100 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Funil
                </p>
                <p className="text-sm font-bold text-emerald-600">Negociação</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Temperatura
                </p>
                <p className="text-sm font-bold text-orange-600 flex items-center gap-1">
                  <Flame size={14} /> Quente{' '}
                  <span className="text-slate-700 ml-0.5">78</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Score
                </p>
                <p className="text-xs font-bold text-emerald-700 bg-emerald-50 py-1 px-2 rounded w-max border border-emerald-100">
                  78 pontos
                </p>
              </div>
            </div>

            {/* Section: Tags */}
            <div className="p-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-400 mb-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">
                  Compra
                </span>
                <span className="px-2.5 py-1 bg-[#dcfce7] text-[#166534] text-xs font-bold rounded-md border border-[#bbf7d0]">
                  Centro
                </span>
                <span className="px-2.5 py-1 bg-[#fef9c3] text-[#854d0e] text-xs font-bold rounded-md border border-[#fef08a]">
                  3 quartos+
                </span>
                <button
                  onClick={() => toast.info('Adicionar tag')}
                  className="w-6 h-6 flex items-center justify-center bg-white border border-slate-300 text-slate-400 rounded-md hover:bg-slate-50"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Section: Próxima ação */}
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Calendar size={14} /> Próxima ação
              </h3>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Responder opções de imóveis
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hoje até 12:00
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded border border-emerald-100">
                  Em andamento
                </span>
              </div>
            </div>

            {/* Section: Imóvel de interesse */}
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Globe size={14} /> Imóvel de interesse
              </h3>
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
                  alt="Building"
                  className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">
                    Apto 3 dorm • Centro
                  </p>
                  <p className="text-xs text-slate-500">Até R$ 850 mil</p>
                </div>
                <button
                  onClick={() => toast.info('Ver imóveis do lead')}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-md hover:bg-slate-100"
                >
                  Ver imóveis
                </button>
              </div>
            </div>

            {/* Section: Tarefas */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Tarefas (1)
                </h3>
                <button
                  onClick={() => toast.info('Todas as tarefas em breve')}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700"
                >
                  Ver todas
                </button>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-4 h-4 rounded border border-slate-300 bg-white" />
                <div className="flex-1">
                  <p className="text-sm text-slate-700 font-medium">
                    Enviar proposta financeira
                  </p>
                </div>
                <span className="text-[10px] font-bold text-orange-600">
                  Hoje • 15:00
                </span>
              </div>
            </div>

            {/* Section: Ações rápidas */}
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Settings2 size={14} /> Ações rápidas
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => toast.info('Criar tarefa em breve')}
                  className="py-2 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 size={14} className="text-slate-400" /> Criar
                  tarefa
                </button>
                <button
                  onClick={() => toast.info('Agendar visita em breve')}
                  className="py-2 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Calendar size={14} className="text-slate-400" /> Agendar
                  visita
                </button>
                <button
                  onClick={() => toast.info('Enviar imóvel ao lead')}
                  className="py-2 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Mail size={14} className="text-slate-400" /> Enviar imóvel
                </button>
                <button
                  onClick={() => toast.info('Transferir atendimento em breve')}
                  className="py-2 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Globe size={14} className="text-slate-400" /> Transferir
                  atendimento
                </button>
              </div>
            </div>

            {/* Section: IA Insight */}
            <div className="p-4 m-4 mt-0 bg-emerald-50 border border-emerald-100 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Sparkles size={48} className="text-emerald-600" />
              </div>
              <h3 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-2 relative z-10">
                <Sparkles size={14} className="text-emerald-600" /> IA - Insight
              </h3>
              <p className="text-xs text-emerald-900 mb-3 relative z-10 leading-relaxed">
                Lead perguntou sobre financiamento. Sugira simulação e 3 imóveis
                compatíveis.
              </p>
              <button
                onClick={() => toast.info('Sugestão da IA aplicada')}
                className="w-full py-1.5 bg-white border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg shadow-sm hover:bg-emerald-100 relative z-10 transition-colors"
              >
                Aplicar sugestão
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
