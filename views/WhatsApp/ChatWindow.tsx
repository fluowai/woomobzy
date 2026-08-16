import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRightLeft,
  Bot,
  Building2,
  CalendarDays,
  Check,
  CheckSquare2,
  ChevronDown,
  ClipboardList,
  FileText,
  House,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  PanelRight,
  Paperclip,
  Plus,
  Save,
  Send,
  Smile,
  Sparkles,
  Tag,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';

import MessageBubble from './MessageBubble';
import {
  chatApi,
  crmContactApi,
  formatPhoneVisual,
  getChatDisplayName,
  type CrmAssignee,
  type CrmLead,
  type CrmProperty,
  type CrmTask,
} from './hooks/api';
import type { UnifiedChat, UnifiedMessage } from './hooks/unifiedInbox';

interface ChatWindowProps {
  chat: UnifiedChat;
  messages: UnifiedMessage[];
  onSendMessage: (content: string, file?: File) => Promise<void> | void;
  loading: boolean;
  instanceName: string;
  instanceId: string;
  onChatUpdated: (chat: UnifiedChat) => void;
  onBack?: () => void;
}

const QUICK_MESSAGES = [
  {
    icon: House,
    label: 'Enviar opções',
    text: 'Separei algumas opções que combinam com o que você procura. Posso enviar os detalhes?',
  },
  { icon: Building2, label: 'Simular financiamento', action: 'simulator' },
  { icon: CalendarDays, label: 'Agendar visita', action: 'visit' },
  {
    icon: FileText,
    label: 'Pedir documentos',
    text: 'Para avançarmos, pode me enviar seus documentos básicos, por favor?',
  },
] as const;

const EMOJIS = ['😊', '👍', '🏡', '✅', '📍', '💚', '📅', '✨'];

function isWhatsAppCdnUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('pps.whatsapp.net') || url.includes('mmg.whatsapp.net');
}

function getPhoneFromJid(jid: string) {
  return jid.split('@')[0]?.replace(/\D/g, '') || '';
}

function getInitial(value: string) {
  return (value.match(/[A-Za-zÀ-ÿ0-9]/)?.[0] || '?').toUpperCase();
}

function formatMoney(value?: number | null) {
  if (!value) return 'Valor sob consulta';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDueDate(value?: string) {
  if (!value) return 'Sem prazo';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem prazo';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function leadTemperature(classification?: string | null) {
  const normalized = (classification || '').toLowerCase();
  if (normalized.includes('hot') || normalized.includes('quente'))
    return 'Quente';
  if (normalized.includes('cold') || normalized.includes('frio')) return 'Frio';
  return 'Morno';
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
  const navigate = useNavigate();
  const location = useLocation();
  const isRural = location.pathname.startsWith('/rural');
  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isLeadPanelOpen, setIsLeadPanelOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [contactNameDraft, setContactNameDraft] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [crmLead, setCrmLead] = useState<CrmLead | null>(null);
  const [crmTags, setCrmTags] = useState<string[]>([]);
  const [crmTasks, setCrmTasks] = useState<CrmTask[]>([]);
  const [crmProperty, setCrmProperty] = useState<CrmProperty | null>(null);
  const [assignees, setAssignees] = useState<CrmAssignee[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [crmActionLoading, setCrmActionLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawPhone = chat.phone || getPhoneFromJid(chat.chat_jid);
  const chatPhone = chat.phone_display || formatPhoneVisual(chat.chat_jid);
  const chatName = chat.is_group
    ? chat.name || 'Grupo sem nome'
    : getChatDisplayName(chat);
  const currentAssignee = assignees.find(
    (item) => item.id === selectedAssignee
  );
  const pendingTasks = crmTasks.filter((task) => task.status !== 'completed');

  useEffect(() => {
    setContactNameDraft(chatName);
    setEditingName(false);
    setAvatarError(false);
  }, [chat.id, chatName]);

  useEffect(() => {
    if (chat.is_group || !rawPhone) {
      setCrmLead(null);
      setCrmTags([]);
      setCrmTasks([]);
      setCrmProperty(null);
      return;
    }
    let active = true;
    Promise.all([
      crmContactApi.get(rawPhone),
      crmContactApi.assignees(),
      supabase.from('whatsapp_queues').select('id, name').order('name'),
    ])
      .then(([result, assigneeResult, queueResult]) => {
        if (!active) return;
        setCrmLead(result.lead);
        setCrmTags(result.tags || []);
        setCrmTasks(result.tasks || []);
        setCrmProperty(result.property || null);
        setAssignees(assigneeResult.users || []);
        setQueues((queueResult as any)?.data || []);
        setSelectedAssignee(
          result.lead?.assigned_to || result.assignee?.id || ''
        );
      })
      .catch(() => {
        if (!active) return;
        setCrmLead(null);
        setCrmTags([]);
        setCrmTasks([]);
        setCrmProperty(null);
      });
    return () => {
      active = false;
    };
  }, [chat.id, chat.is_group, chat.platform, rawPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const groupedMessages = useMemo(() => {
    return messages
      .filter(isRenderableMessage)
      .reduce(
        (groups: { date: string; messages: UnifiedMessage[] }[], message) => {
          const date = new Date(message.timestamp).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          });
          const previous = groups.at(-1);
          if (previous?.date === date) previous.messages.push(message);
          else groups.push({ date, messages: [message] });
          return groups;
        },
        []
      );
  }, [messages]);

  const crmPayload = () => ({
    phone: rawPhone,
    name: contactNameDraft.trim() || chatName,
    chat_jid: chat.chat_jid,
    source: 'WhatsApp',
  });

  const submitMessage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const content = inputText.trim();
    if ((!content && !pendingFile) || sendingMessage) return;
    setSendingMessage(true);
    try {
      await onSendMessage(content, pendingFile || undefined);
      setInputText('');
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      // Mensagem nao foi enviada; mantem o texto digitado no campo para o
      // usuario tentar novamente. O toast de erro ja foi exibido pelo envio.
      logger.error(
        'Falha ao enviar mensagem (conteudo mantido no campo):',
        error
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const runCrmAction = async <T,>(
    action: () => Promise<T>,
    success: string,
    onDone: (result: T) => void
  ) => {
    setCrmActionLoading(true);
    try {
      const result = await action();
      onDone(result);
      toast.success(success);
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível concluir a ação.');
    } finally {
      setCrmActionLoading(false);
    }
  };

  const syncCrmResult = (result: { lead: CrmLead | null; tags?: string[] }) => {
    setCrmLead(result.lead);
    setCrmTags(result.tags || []);
  };

  const ensureLead = () =>
    runCrmAction(
      () => crmContactApi.link(crmPayload()),
      'Contato vinculado ao CRM.',
      syncCrmResult
    );

  const addTag = () => {
    const tag = tagDraft.trim();
    if (!tag) return;
    return runCrmAction(
      () => crmContactApi.addTags({ ...crmPayload(), tags: [tag] }),
      'Tag adicionada.',
      (result) => {
        syncCrmResult(result);
        setTagDraft('');
      }
    );
  };

  const transfer = () => {
    if (!selectedAssignee) return;
    return runCrmAction(
      () =>
        crmContactApi.transfer({
          ...crmPayload(),
          assigned_to: selectedAssignee.startsWith('q_')
            ? undefined
            : selectedAssignee,
          queue_id: selectedAssignee.startsWith('q_')
            ? selectedAssignee.replace('q_', '')
            : undefined,
        }),
      'Atendimento transferido.',
      syncCrmResult
    );
  };

  const createTask = (title = `Retornar contato: ${chatName}`) => {
    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return runCrmAction(
      () => crmContactApi.createTask({ ...crmPayload(), title, due_at: dueAt }),
      'Tarefa criada.',
      (result) => {
        syncCrmResult(result);
        if (result.task) setCrmTasks((current) => [result.task!, ...current]);
      }
    );
  };

  const toggleTask = (task: CrmTask) =>
    runCrmAction(
      () =>
        crmContactApi.updateTask(
          task.id,
          task.status === 'completed' ? 'pending' : 'completed'
        ),
      task.status === 'completed' ? 'Tarefa reaberta.' : 'Tarefa concluída.',
      (result) =>
        setCrmTasks((current) =>
          current.map((item) => (item.id === task.id ? result.task : item))
        )
    );

  const saveContactName = async () => {
    const nextName = contactNameDraft.trim();
    if (!nextName) return;
    setSavingContact(true);
    try {
      if (chat.platform === 'whatsapp' && instanceId) {
        const updated = await chatApi.updateContactName(
          chat.id,
          instanceId,
          nextName
        );
        onChatUpdated({ ...updated, platform: 'whatsapp' });
      } else onChatUpdated({ ...chat, name: nextName, display_name: nextName });
      setEditingName(false);
    } finally {
      setSavingContact(false);
    }
  };

  const handleQuickAction = (item: (typeof QUICK_MESSAGES)[number]) => {
    if ('text' in item) setInputText(item.text);
    if ('action' in item && item.action === 'simulator')
      navigate(isRural ? '/rural/financial' : '/urban/simulador');
    if ('action' in item && item.action === 'visit')
      void createTask(`Agendar visita com ${chatName}`);
  };

  const openFilePicker = (accept: string) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const propertyImage = crmProperty?.images?.[0];
  const preferenceLocation =
    typeof crmLead?.preferences?.location === 'string'
      ? crmLead.preferences.location
      : '';

  return (
    <main
      className={`wa-chat-window ${isLeadPanelOpen ? 'details-open' : ''}`}
      id="chat-window"
    >
      <section className="wa-conversation-column">
        <header className="wa-chat-header wa-center-chat-header">
          <button
            type="button"
            className="wa-mobile-back"
            onClick={onBack}
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="wa-chat-header-profile">
            <Avatar
              chat={chat}
              name={chatName}
              avatarError={avatarError}
              onAvatarError={() => setAvatarError(true)}
              size="small"
            />
            <div>
              <strong>{chatName}</strong>
              <span>WhatsApp · {chatPhone}</span>
            </div>
          </div>
          <div className="wa-lead-header-meta">
            <div>
              <span>Lead</span>
              <strong>🔥 {leadTemperature(crmLead?.classification)}</strong>
            </div>
            <label>
              <span>Responsável</span>
              <select
                value={selectedAssignee}
                onChange={(event) => setSelectedAssignee(event.target.value)}
                onBlur={() => selectedAssignee && void transfer()}
                disabled={!rawPhone || crmActionLoading}
              >
                <option value="">Sem responsável</option>
                {queues.length > 0 && (
                  <optgroup label="Filas">
                    {queues.map((q) => (
                      <option key={`q_${q.id}`} value={`q_${q.id}`}>
                        Fila: {q.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {assignees.length > 0 && (
                  <optgroup label="Corretores">
                    {assignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            <button
              type="button"
              className="wa-header-panel-toggle"
              onClick={() => setIsLeadPanelOpen((prev) => !prev)}
              title="Detalhes do lead"
            >
              <PanelRight size={20} />
            </button>
          </div>
        </header>

        <div className="wa-interest-strip">
          <House size={20} />
          <div>
            <span>Interesse principal</span>
            <strong>
              {crmProperty?.title ||
                crmLead?.ai_last_intent ||
                'Imóvel ainda não definido'}
            </strong>
          </div>
          {crmLead?.budget ? <b>até {formatMoney(crmLead.budget)}</b> : null}
        </div>

        <div
          className="wa-messages"
          ref={messagesContainerRef}
          onScroll={() => {
            const node = messagesContainerRef.current;
            if (node)
              setShowScrollDown(
                node.scrollHeight - node.scrollTop - node.clientHeight > 200
              );
          }}
        >
          {loading ? (
            <div className="wa-messages-loading">
              <Loader2 size={24} className="animate-spin" /> Carregando
              mensagens...
            </div>
          ) : null}
          {!loading && groupedMessages.length === 0 ? (
            <div className="wa-messages-empty">
              <p>Nenhuma mensagem nesta conversa.</p>
              <span>Envie a primeira mensagem para iniciar o atendimento.</span>
            </div>
          ) : null}
          {groupedMessages.map((group) => (
            <React.Fragment key={group.date}>
              <div className="wa-date-divider">
                <span>{group.date}</span>
              </div>
              {group.messages.map((message) => (
                <MessageBubble
                  key={`${message.platform}-${message.id}`}
                  message={message}
                  isGroup={chat.is_group}
                  chatDisplayName={chatName}
                />
              ))}
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
          {showScrollDown ? (
            <button
              className="wa-scroll-down"
              onClick={() =>
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              <ArrowDown size={18} />
            </button>
          ) : null}
        </div>

        <div className="wa-quick-message-row">
          {QUICK_MESSAGES.map((item) => (
            <button
              type="button"
              key={item.label}
              onClick={() => handleQuickAction(item)}
            >
              <item.icon size={15} />
              {item.label}
            </button>
          ))}
        </div>

        <form
          className="wa-composer wa-composer-whatsapp"
          onSubmit={submitMessage}
        >
          {pendingFile ? (
            <div className="wa-file-chip">
              <Paperclip size={14} />
              <span>{pendingFile.name}</span>
              <button type="button" onClick={() => setPendingFile(null)}>
                <X size={14} />
              </button>
            </div>
          ) : null}

          <div className="wa-composer-inner">
            <div className="wa-composer-left">
              <div className="wa-emoji-wrap">
                <button
                  type="button"
                  onClick={() => setShowEmojis((value) => !value)}
                  title="Emoji"
                  className="wa-icon-btn"
                >
                  <Smile size={24} />
                </button>
                {showEmojis ? (
                  <div className="wa-emoji-menu">
                    {EMOJIS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => {
                          setInputText((value) => `${value}${emoji}`);
                          setShowEmojis(false);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => openFilePicker('*/*')}
                title="Anexar arquivo"
                className="wa-icon-btn"
              >
                <Plus size={24} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(event) =>
                  setPendingFile(event.target.files?.[0] || null)
                }
              />
            </div>

            <div className="wa-composer-input-wrap">
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage();
                  }
                }}
                placeholder="Mensagem"
                rows={1}
              />
              <button
                type="button"
                className="wa-ai-button-inline"
                onClick={() =>
                  setInputText(
                    crmLead?.ai_next_action ||
                      'Olá! Separei uma sugestão personalizada para você. Posso enviar os detalhes?'
                  )
                }
                title="Sugerir mensagem com IA"
              >
                <Sparkles size={18} />
              </button>
            </div>

            <div className="wa-composer-right">
              <button
                type="submit"
                className="wa-send-btn active"
                disabled={sendingMessage || (!inputText.trim() && !pendingFile)}
              >
                {sendingMessage ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <Send size={24} />
                )}
              </button>
            </div>
          </div>
        </form>
      </section>

      <aside className="wa-contact-panel wa-lead-panel">
        <div className="wa-contact-panel-head flex items-center justify-between">
          <span>Dados do lead</span>
          <button
            type="button"
            onClick={() => setIsLeadPanelOpen(false)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <details className="wa-lead-card wa-accordion">
          <summary>
            <span>Resumo do lead</span>
            <ChevronDown size={16} className="wa-accordion-icon" />
          </summary>
          <div className="wa-accordion-content wa-lead-identity">
            <div className="wa-lead-profile-row">
              <Avatar
                chat={chat}
                name={chatName}
                avatarError={avatarError}
                onAvatarError={() => setAvatarError(true)}
                size="large"
              />
              <div>
                {editingName ? (
                  <div className="wa-inline-edit">
                    <input
                      value={contactNameDraft}
                      onChange={(event) =>
                        setContactNameDraft(event.target.value)
                      }
                      autoFocus
                    />
                    <button type="button" onClick={saveContactName}>
                      {savingContact ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="wa-lead-name"
                    onClick={() => setEditingName(true)}
                  >
                    {crmLead?.name || chatName}
                  </button>
                )}
                <span>💬 {chatPhone}</span>
                {crmLead?.email ? (
                  <span>
                    <Mail size={13} /> {crmLead.email}
                  </span>
                ) : null}
                {preferenceLocation ? (
                  <span>
                    <MapPin size={13} /> {preferenceLocation}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="wa-outline-button"
              onClick={() =>
                crmLead
                  ? navigate(
                      `${isRural ? '/rural/crm' : '/urban/crm'}?leadId=${crmLead.id}`
                    )
                  : void ensureLead()
              }
            >
              {crmLead ? 'Ver no CRM' : 'Vincular ao CRM'}
            </button>
            <div className="wa-lead-metrics">
              <div>
                <span>Funil</span>
                <strong>{crmLead?.status || 'Novo lead'}</strong>
              </div>
              <div>
                <span>Temperatura</span>
                <strong className="hot">
                  🔥 {leadTemperature(crmLead?.classification)}
                </strong>
              </div>
              <div>
                <span>Score</span>
                <strong className="score">
                  {crmLead?.lead_score ?? crmLead?.qualification_score ?? 0}{' '}
                  pontos
                </strong>
              </div>
            </div>
            <div className="wa-panel-tags">
              <span>Tags</span>
              <div>
                {crmTags.map((tag) => (
                  <b key={tag}>{tag}</b>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('wa-tag-input')?.focus()
                  }
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="wa-tag-entry">
                <input
                  id="wa-tag-input"
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void addTag();
                    }
                  }}
                  placeholder="Adicionar tag"
                />
                <button
                  type="button"
                  onClick={() => void addTag()}
                  disabled={!tagDraft.trim() || crmActionLoading}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </details>

        <details className="wa-lead-card wa-accordion">
          <summary>
            <span>
              <CalendarDays size={16} /> Próxima ação
            </span>
            <ChevronDown size={16} className="wa-accordion-icon" />
          </summary>
          <div className="wa-accordion-content wa-next-action">
            <strong>
              {crmLead?.ai_next_action ||
                pendingTasks[0]?.title ||
                'Responder e qualificar o atendimento'}
            </strong>
            <span>
              {pendingTasks[0]
                ? formatDueDate(pendingTasks[0].due_at)
                : 'Sem prazo definido'}
            </span>
            <b>Em andamento</b>
          </div>
        </details>

        <details className="wa-lead-card wa-accordion">
          <summary>
            <span>
              <House size={16} /> Imóvel de interesse
            </span>
            <ChevronDown size={16} className="wa-accordion-icon" />
          </summary>
          <div className="wa-accordion-content">
            {crmProperty ? (
              <div className="wa-property-summary">
                {propertyImage ? (
                  <img src={propertyImage} alt="" />
                ) : (
                  <div className="wa-property-placeholder">
                    <Building2 size={22} />
                  </div>
                )}
                <div>
                  <strong>{crmProperty.title}</strong>
                  <span>
                    {[crmProperty.neighborhood, crmProperty.city]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <b>
                    {formatMoney(crmProperty.price || crmProperty.rental_value)}
                  </b>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      isRural ? '/rural/properties' : '/urban/properties'
                    )
                  }
                >
                  Ver imóvel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="wa-empty-property"
                onClick={() =>
                  navigate(isRural ? '/rural/properties' : '/urban/properties')
                }
              >
                <Plus size={15} /> Selecionar imóvel
              </button>
            )}
          </div>
        </details>

        <details className="wa-lead-card wa-accordion">
          <summary>
            <span>
              <CheckSquare2 size={16} /> Tarefas ({crmTasks.length})
            </span>
            <ChevronDown size={16} className="wa-accordion-icon" />
          </summary>
          <div className="wa-accordion-content wa-task-list">
            {crmTasks.length ? (
              crmTasks.slice(0, 3).map((task) => (
                <label
                  key={task.id}
                  className={task.status === 'completed' ? 'completed' : ''}
                >
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => void toggleTask(task)}
                  />
                  <span>
                    {task.title}
                    <small>{formatDueDate(task.due_at)}</small>
                  </span>
                </label>
              ))
            ) : (
              <span className="wa-panel-empty">Nenhuma tarefa cadastrada.</span>
            )}
          </div>
        </details>

        <details className="wa-lead-card wa-accordion">
          <summary>
            <span>Ações rápidas</span>
            <ChevronDown size={16} className="wa-accordion-icon" />
          </summary>
          <div className="wa-accordion-content wa-panel-action-grid">
            <button type="button" onClick={() => void createTask()}>
              <ClipboardList size={15} /> Criar tarefa
            </button>
            <button
              type="button"
              onClick={() => void createTask(`Agendar visita com ${chatName}`)}
            >
              <CalendarDays size={15} /> Agendar visita
            </button>
            <button
              type="button"
              onClick={() =>
                setInputText(
                  'Separei um imóvel que pode combinar com você. Posso enviar os detalhes?'
                )
              }
            >
              <House size={15} /> Enviar imóvel
            </button>
            <button
              type="button"
              onClick={() =>
                document
                  .querySelector<HTMLSelectElement>(
                    '.wa-lead-header-meta select'
                  )
                  ?.focus()
              }
            >
              <ArrowRightLeft size={15} /> Transferir atendimento
            </button>
          </div>
        </details>

        <section className="wa-insight-card">
          <header>
            <Bot size={17} /> IA · Insight
          </header>
          <p>
            {crmLead?.ai_last_intent ||
              'Use o histórico para qualificar orçamento, localização e prazo do lead.'}
          </p>
          <button
            type="button"
            onClick={() =>
              setInputText(
                crmLead?.ai_next_action ||
                  'Posso preparar algumas opções compatíveis com o que você procura?'
              )
            }
          >
            Aplicar sugestão
          </button>
        </section>
        {instanceName ? (
          <span className="wa-instance-footnote">
            Atendimento via {instanceName}
          </span>
        ) : null}
      </aside>
    </main>
  );
};

function Avatar({
  chat,
  name,
  avatarError,
  onAvatarError,
  size,
}: {
  chat: UnifiedChat;
  name: string;
  avatarError: boolean;
  onAvatarError: () => void;
  size: 'small' | 'large';
}) {
  const canShowImage = chat.avatar_url && !avatarError;
  return (
    <div className={`wa-smart-avatar ${size}`}>
      {canShowImage ? (
        <img
          src={chat.avatar_url}
          alt=""
          referrerPolicy="no-referrer"
          onError={onAvatarError}
        />
      ) : chat.is_group ? (
        <Users size={size === 'large' ? 28 : 20} />
      ) : (
        <span>{getInitial(name)}</span>
      )}
      <i />
    </div>
  );
}

function isRenderableMessage(message: UnifiedMessage) {
  if (message.type !== 'text') return true;
  return Boolean(
    (message.content || '').trim() ||
    message.media_url ||
    message.media_id ||
    message.media_filename ||
    message.media_status === 'pending'
  );
}

export default ChatWindow;
