import React, { useState, useRef, useEffect } from 'react';
import {
  chatApi,
  crmContactApi,
  formatPhone,
  formatPhoneDisplay,
  getChatDisplayName,
  isValidBrazilianPhone,
  type Chat,
  type CrmAssignee,
  type Message,
} from './hooks/api';
import MessageBubble from './MessageBubble';
import {
  Send,
  Paperclip,
  Smile,
  ArrowDown,
  Users,
  Phone,
  Video,
  MoreVertical,
  Loader2,
  X,
  UserRound,
  Save,
  ArrowLeft,
  ArrowRightLeft,
  Tag,
  Clock3,
  ShieldCheck,
  Image as ImageIcon,
  FileAudio,
  FileText,
  FileVideo,
} from 'lucide-react';
import { toast } from 'sonner';

/** WhatsApp CDN profile-pic URLs expire and require WA session — never load in browser. */
function isWhatsAppCdnUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('pps.whatsapp.net') || url.includes('mmg.whatsapp.net');
}

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  onSendMessage: (content: string, file?: File) => Promise<void> | void;
  loading: boolean;
  instanceName: string;
  instanceId: string;
  onChatUpdated: (chat: Chat) => void;
  onBack?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  onSendMessage,
  loading,
  instanceName,
  instanceId,
  onChatUpdated,
  onBack,
}) => {
  const [inputText, setInputText] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [editingName, setEditingName] = useState(false);
  const [contactNameDraft, setContactNameDraft] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [crmLead, setCrmLead] = useState<any | null>(null);
  const [crmTags, setCrmTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [assignees, setAssignees] = useState<CrmAssignee[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [crmActionLoading, setCrmActionLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const chatPhone = chat.phone_display || formatPhoneDisplay(chat.chat_jid);
  const rawPhone = chat.phone || getPhoneFromJid(chat.chat_jid);
  const chatName = chat.is_group ? chat.name || 'Grupo sem nome' : getChatDisplayName(chat);

  useEffect(() => {
    setContactNameDraft(chatName);
    setEditingName(false);
    setAvatarError(false);
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setShowContactPanel(true);
    }
  }, [chat.id, chatName]);

  useEffect(() => {
    if (!showContactPanel || chat.is_group || !rawPhone) return;
    let active = true;
    Promise.all([crmContactApi.get(rawPhone), crmContactApi.assignees()])
      .then(([result, assigneeResult]) => {
        if (!active) return;
        setCrmLead(result.lead || null);
        setCrmTags(result.tags || []);
        setAssignees(assigneeResult.users || []);
        setSelectedAssignee(result.lead?.assigned_to || '');
      })
      .catch(() => {
        if (!active) return;
        setCrmLead(null);
        setCrmTags([]);
        setAssignees([]);
        setSelectedAssignee('');
      });
    return () => {
      active = false;
    };
  }, [showContactPanel, chat.id, chat.is_group, rawPhone]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if ((!text && !pendingFile) || sendingMessage) return;
    setSendingMessage(true);
    try {
      await onSendMessage(text, pendingFile || undefined);
      setInputText('');
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getInitial = (value: string) => {
    const match = value.match(/[A-Za-z0-9]/);
    return (match?.[0] || '?').toUpperCase();
  };

  const saveContactName = async () => {
    const nextName = contactNameDraft.trim();
    if (!nextName) return;

    setSavingContact(true);
    try {
      const updated = await chatApi.updateContactName(chat.id, instanceId, nextName);
      if (!chat.is_group && rawPhone) {
        const result = await crmContactApi.update({ ...crmPayload(), name: nextName });
        setCrmLead(result.lead || null);
        setCrmTags(result.tags || []);
      }
      onChatUpdated(updated);
      setEditingName(false);
    } finally {
      setSavingContact(false);
    }
  };

  const crmPayload = () => ({
    phone: rawPhone,
    name: contactNameDraft.trim() || chatName,
    chat_jid: chat.chat_jid,
    source: 'WhatsApp',
  });

  const linkContactToCrm = async () => {
    if (!rawPhone || chat.is_group) return;
    setCrmActionLoading(true);
    try {
      const result = await crmContactApi.link(crmPayload());
      setCrmLead(result.lead || null);
      setCrmTags(result.tags || []);
      toast.success('Contato vinculado ao CRM.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao vincular contato ao CRM.');
    } finally {
      setCrmActionLoading(false);
    }
  };

  const addCrmTag = async () => {
    if (!rawPhone || chat.is_group) return;
    const tag = tagDraft.trim();
    if (!tag) return;

    setCrmActionLoading(true);
    try {
      const result = await crmContactApi.addTags({ ...crmPayload(), tags: [tag] });
      setCrmLead(result.lead || null);
      setCrmTags(result.tags || []);
      setTagDraft('');
      toast.success('Tag adicionada ao CRM.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao adicionar tag.');
    } finally {
      setCrmActionLoading(false);
    }
  };

  const transferAttendance = async () => {
    if (!rawPhone || chat.is_group || !selectedAssignee) return;
    setCrmActionLoading(true);
    try {
      const result = await crmContactApi.transfer({ ...crmPayload(), assigned_to: selectedAssignee });
      setCrmLead(result.lead || null);
      setCrmTags(result.tags || []);
      toast.success(result.assignee?.name ? `Atendimento transferido para ${result.assignee.name}.` : 'Atendimento transferido.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao transferir atendimento.');
    } finally {
      setCrmActionLoading(false);
    }
  };

  const handleFileSelect = (file?: File | null) => {
    if (!file) {
      setPendingFile(null);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Envie midias de ate 25 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setPendingFile(file);
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const markCrmPriority = async () => {
    if (!rawPhone || chat.is_group) return;
    setCrmActionLoading(true);
    try {
      const result = await crmContactApi.markPriority(crmPayload());
      setCrmLead(result.lead || null);
      setCrmTags(result.tags || []);
      toast.success('Contato marcado como prioridade.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao marcar prioridade.');
    } finally {
      setCrmActionLoading(false);
    }
  };

  const createCrmTask = async () => {
    if (!rawPhone || chat.is_group) return;
    setCrmActionLoading(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = await crmContactApi.createTask({
        ...crmPayload(),
        title: `Retornar contato: ${chatName}`,
        due_at: tomorrow.toISOString(),
      });
      setCrmLead(result.lead || null);
      setCrmTags(result.tags || []);
      toast.success('Tarefa criada para o atendimento.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar tarefa.');
    } finally {
      setCrmActionLoading(false);
    }
  };

  // Group messages by date
  const visibleMessages = messages.filter(isRenderableMessage);
  const groupedMessages = visibleMessages.reduce((acc: { date: string; msgs: Message[] }[], msg) => {
    const date = new Date(msg.timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const lastGroup = acc[acc.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.msgs.push(msg);
    } else {
      acc.push({ date, msgs: [msg] });
    }
    return acc;
  }, []);

  return (
    <main className={`wa-chat-window ${showContactPanel ? 'details-open' : ''}`} id="chat-window">
      {/* Chat Header */}
      <header className="wa-chat-header">
        <button type="button" className="wa-mobile-back" onClick={onBack} title="Voltar">
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          className="wa-chat-header-info wa-chat-header-profile"
          onClick={() => setShowContactPanel(true)}
        >
          <div className="wa-chat-header-avatar">
            {chat.avatar_url && !isWhatsAppCdnUrl(chat.avatar_url) && !avatarError ? (
              <img src={chat.avatar_url} alt="" className="wa-avatar-img" onError={() => setAvatarError(true)} />
            ) : chat.is_group ? (
              <Users size={20} />
            ) : (
              <span>{getInitial(chatName)}</span>
            )}
          </div>
          <div>
            <h2 className="wa-chat-header-name">{chatName}</h2>
            <span className="wa-chat-header-sub">
              {chat.is_group ? 'Grupo' : chatPhone || 'Telefone nao identificado'}
            </span>
          </div>
        </button>
        <div className="wa-chat-header-actions">
          <button className="wa-icon-btn" title="Ligar">
            <Phone size={18} />
          </button>
          <button className="wa-icon-btn" title="Videochamada">
            <Video size={18} />
          </button>
          <button className="wa-icon-btn" title="Mais opções">
            <MoreVertical size={18} onClick={() => setShowContactPanel(true)} />
          </button>
        </div>
      </header>

      {showContactPanel && (
        <aside className="wa-contact-panel">
          <div className="wa-contact-panel-head">
            <span>Dados do contato</span>
            <button type="button" className="wa-icon-btn" onClick={() => setShowContactPanel(false)} title="Fechar">
              <X size={18} />
            </button>
          </div>

          <div className="wa-contact-profile">
            <div className="wa-contact-avatar">
              {chat.avatar_url && !isWhatsAppCdnUrl(chat.avatar_url) && !avatarError ? (
                <img src={chat.avatar_url} alt="" className="wa-avatar-img" onError={() => setAvatarError(true)} />
              ) : chat.is_group ? (
                <Users size={30} />
              ) : (
                <span>{getInitial(chatName)}</span>
              )}
            </div>
            {editingName ? (
              <div className="wa-contact-edit">
                <input
                  value={contactNameDraft}
                  onChange={(e) => setContactNameDraft(e.target.value)}
                  className="wa-contact-input"
                  autoFocus
                />
                <button type="button" className="wa-contact-save" onClick={saveContactName} disabled={savingContact}>
                  {savingContact ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salvar
                </button>
              </div>
            ) : (
              <>
                <h3>{chatName}</h3>
                <button type="button" className="wa-contact-edit-btn" onClick={() => setEditingName(true)}>
                  Editar nome do lead
                </button>
              </>
            )}
          </div>

          <div className="wa-contact-fields">
            <div>
              <span>CRM</span>
              <strong>{crmLead ? `Vinculado: ${crmLead.name || crmLead.phone}` : 'Nao vinculado'}</strong>
            </div>
            {crmTags.length > 0 && (
              <div>
                <span>Tags</span>
                <div className="wa-contact-tags">
                  {crmTags.map((tag) => (
                    <b key={tag}>{tag}</b>
                  ))}
                </div>
              </div>
            )}
            <div>
              <span>WhatsApp</span>
              <strong>{chatPhone || 'Telefone nao identificado'}</strong>
            </div>
            <div>
              <span>Origem</span>
              <strong>{chat.is_group ? 'Grupo' : 'Conversa individual'}</strong>
            </div>
            {instanceName && (
              <div>
                <span>Instancia</span>
                <strong>{instanceName}</strong>
              </div>
            )}
          </div>

          <div className="wa-contact-section">
            <span className="wa-contact-section-title">Atendimento</span>
            <label className="wa-contact-select-label">
              Responsavel
              <select
                className="wa-contact-select"
                value={selectedAssignee}
                onChange={(event) => setSelectedAssignee(event.target.value)}
                disabled={crmActionLoading || chat.is_group || !rawPhone}
              >
                <option value="">Selecionar responsavel</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="wa-contact-action primary"
              onClick={transferAttendance}
              disabled={crmActionLoading || chat.is_group || !rawPhone || !selectedAssignee}
            >
              <ArrowRightLeft size={16} />
              Transferir atendimento
            </button>
          </div>

          {!chat.is_group && rawPhone && (
            <div className="wa-contact-tag-editor">
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCrmTag();
                  }
                }}
                placeholder="Nova tag"
                disabled={crmActionLoading}
              />
              <button type="button" className="wa-icon-btn" onClick={addCrmTag} disabled={crmActionLoading || !tagDraft.trim()} title="Adicionar tag">
                <Tag size={16} />
              </button>
            </div>
          )}

          <div className="wa-contact-actions-grid">
            <button
              type="button"
              className="wa-contact-action"
              onClick={linkContactToCrm}
              disabled={crmActionLoading || chat.is_group || !rawPhone}
            >
              <UserRound size={16} />
              {crmLead ? 'Atualizar CRM' : 'Vincular ao CRM'}
            </button>
            <button
              type="button"
              className="wa-contact-action"
              onClick={addCrmTag}
              disabled={crmActionLoading || chat.is_group || !rawPhone || !tagDraft.trim()}
            >
              <Tag size={16} />
              Adicionar tag
            </button>
            <button
              type="button"
              className="wa-contact-action"
              onClick={createCrmTask}
              disabled={crmActionLoading || chat.is_group || !rawPhone}
            >
              <Clock3 size={16} />
              Criar tarefa
            </button>
            <button
              type="button"
              className="wa-contact-action"
              onClick={markCrmPriority}
              disabled={crmActionLoading || chat.is_group || !rawPhone}
            >
              <ShieldCheck size={16} />
              Marcar prioridade
            </button>
          </div>
        </aside>
      )}

      {/* Messages Area */}
      <div
        className="wa-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        id="messages-container"
      >
        {loading ? (
          <div className="wa-messages-loading">
            <Loader2 size={24} className="animate-spin" />
            <span>Carregando mensagens...</span>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="wa-messages-empty">
            <p>Nenhuma mensagem nesta conversa</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="wa-date-divider">
                <span>{group.date}</span>
              </div>
              {group.msgs.map((msg) => {
                const key = msg.id || msg.message_id;
                return (
                  <MessageBubble
                    key={key}
                    message={msg}
                    isGroup={chat.is_group}
                    chatDisplayName={chatName}
                    onOpenDetails={() => setShowContactPanel(true)}
                  />
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll Down Button */}
      {showScrollDown && (
        <button className="wa-scroll-down" onClick={scrollToBottom}>
          <ArrowDown size={18} />
        </button>
      )}

      {/* Input Area */}
      <form className="wa-input-area" onSubmit={handleSubmit} id="message-input-form">
        <button type="button" className="wa-icon-btn" title="Emoji">
          <Smile size={22} />
        </button>
        <button type="button" className="wa-icon-btn" title="Anexar" onClick={() => fileInputRef.current?.click()}>
          <Paperclip size={22} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,audio/*,video/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={(event) => handleFileSelect(event.target.files?.[0])}
        />
        <div className="wa-input-wrapper">
          {pendingFile && (
            <div className="wa-file-chip">
              {fileIconFor(pendingFile)}
              <span>
                <strong>{pendingFile.name}</strong>
                <small>{formatFileSize(pendingFile.size)}</small>
              </span>
              <button type="button" onClick={clearPendingFile} title="Remover arquivo" disabled={sendingMessage}>
                <X size={14} />
              </button>
            </div>
          )}
          <textarea
            className="wa-message-input"
            placeholder={pendingFile ? 'Legenda opcional...' : 'Digite uma mensagem...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sendingMessage}
            rows={1}
            id="message-input"
          />
        </div>
        <button
          type="submit"
          className={`wa-send-btn ${inputText.trim() || pendingFile ? 'active' : ''}`}
          disabled={sendingMessage || (!inputText.trim() && !pendingFile)}
          title="Enviar"
        >
          {sendingMessage ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </form>
    </main>
  );
};

export default ChatWindow;

function isRenderableMessage(message: Message) {
  const content = (message.content || '').trim();
  const hasMedia = Boolean(message.media_url || message.media_id || message.media_filename || message.media_status === 'pending');
  return message.type !== 'text' || content || hasMedia;
}

function fileIconFor(file: File) {
  if (file.type.startsWith('image/')) return <ImageIcon size={18} />;
  if (file.type.startsWith('audio/')) return <FileAudio size={18} />;
  if (file.type.startsWith('video/')) return <FileVideo size={18} />;
  return <FileText size={18} />;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getPhoneFromJid(jid: string) {
  if (String(jid || '').includes('@g.us') || String(jid || '').includes('@lid')) return '';
  const raw = String(jid || '').split('@')[0].replace(/\D/g, '');
  return isValidBrazilianPhone(raw) ? formatPhone(raw) : '';
}
