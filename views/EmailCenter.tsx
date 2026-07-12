import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  Grid3X3,
  HelpCircle,
  Inbox,
  Link as LinkIcon,
  Mail,
  Menu,
  MoreVertical,
  Paperclip,
  Plus,
  Printer,
  RefreshCw,
  Reply,
  ReplyAll,
  Search,
  Send,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  Tag,
  Trash2,
  Undo2,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  emailService,
  EmailAccount,
  EmailAgendaActivity,
  EmailMessage,
  ConnectEmailPayload,
} from '@/services/email';
import { leadService } from '@/services/leads';
import { Lead } from '@/types';
import { COMMERCIAL_PRODUCT_NAME } from '@/utils/branding';

type FolderKey = 'inbox' | 'sent' | 'drafts' | 'archived' | 'trash' | 'spam' | 'starred' | 'snoozed' | 'all';
type ViewKey = 'mail' | 'agenda';

type VisualEmail = EmailMessage & {
  timeLabel?: string;
  label?: string;
  labelColor?: string;
  is_starred?: boolean;
  has_attachments?: boolean;
};

const blankAccount: ConnectEmailPayload = {
  email: '',
  password: '',
  imap_host: '',
  imap_port: 993,
  imap_secure: true,
  smtp_host: '',
  smtp_port: 465,
  smtp_secure: true,
};

const folders: Array<{ key: FolderKey; label: string; icon: React.ElementType; count?: number }> = [
  { key: 'inbox', label: 'Caixa de entrada', icon: Inbox },
  { key: 'starred', label: 'Com estrela', icon: Star },
  { key: 'snoozed', label: 'Adiados', icon: Clock3 },
  { key: 'sent', label: 'Enviados', icon: Send },
  { key: 'drafts', label: 'Rascunhos', icon: FileText },
  { key: 'all', label: 'Todos os e-mails', icon: Mail },
  { key: 'spam', label: 'Spam', icon: ShieldAlert },
  { key: 'trash', label: 'Lixeira', icon: Trash2 },
  { key: 'archived', label: 'Arquivados', icon: ArchiveRestore },
];

const isImplicitTlsPort = (port: number, implicitTlsPort: number) => Number(port) === implicitTlsPort;

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

const cleanSnippet = (value = '') =>
  value
    .replace(/Em .* escreveu:/gi, '')
    .replace(/On .* wrote:/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const folderForApi = (folder: FolderKey) => {
  if (folder === 'starred' || folder === 'snoozed' || folder === 'all') return 'inbox';
  if (folder === 'drafts') return 'sent';
  if (folder === 'trash' || folder === 'spam') return 'archived';
  return folder;
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'J';

const EmailCenter: React.FC = () => {
  const [view, setView] = useState<ViewKey>('mail');
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [folder, setFolder] = useState<FolderKey>('inbox');
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [thread, setThread] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<VisualEmail | null>(null);
  const [agenda, setAgenda] = useState<EmailAgendaActivity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<ConnectEmailPayload>(blankAccount);
  const [compose, setCompose] = useState({ to: '', subject: '', body_html: '', lead_id: '' });
  const [replyBody, setReplyBody] = useState('');

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) || accounts[0],
    [accounts, selectedAccountId]
  );

  const displayEmails = useMemo<VisualEmail[]>(() => {
    const normalized = emails as VisualEmail[];
    if (!search.trim()) return normalized;
    const needle = search.trim().toLowerCase();
    return normalized.filter((email) =>
      [email.subject, email.from_name, email.from_email, email.preview, email.body_text]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [emails, search]);

  const sortedThread = useMemo<VisualEmail[]>(() => {
    return [...thread].sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return aDate - bDate;
    }) as VisualEmail[];
  }, [thread, selectedEmail]);

  const linkedLead = useMemo(() => {
    const found = selectedEmail?.lead_id ? leads.find((lead) => lead.id === selectedEmail.lead_id) : null;
    return found || selectedEmail?.leads || null;
  }, [leads, selectedEmail]);

  const relevantAgenda = useMemo(
    () =>
      agenda.filter(
        (item) =>
          (selectedEmail && item.email_id === selectedEmail.id) ||
          (linkedLead && item.leads?.id === linkedLead.id)
      ),
    [agenda, linkedLead, selectedEmail]
  );

  const pendingAgenda = agenda.filter((item) => item.status !== 'done');
  const todayCount = pendingAgenda.filter((item) => new Date(item.created_at).toDateString() === new Date().toDateString()).length;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (view === 'mail') loadEmails();
  }, [folder, view]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (view === 'mail') loadEmails();
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [search, view]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [accountData, leadData, agendaData] = await Promise.all([
        emailService.listAccounts().catch(() => []),
        leadService.list().catch(() => []),
        emailService.listAgenda().catch(() => []),
      ]);
      setAccounts(accountData);
      setSelectedAccountId(accountData[0]?.id || '');
      setLeads(leadData as Lead[]);
      setAgenda(agendaData);
      await loadEmails();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar emails.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    try {
      const data = await emailService.listEmails(folderForApi(folder), 1, search);
      setEmails(data.emails);
      if (data.emails[0] && !selectedEmail) {
        await selectEmail(data.emails[0] as VisualEmail);
      }
      if (!data.emails.length) {
        setSelectedEmail(null);
        setThread([]);
      }
    } catch (error: any) {
      if (!loading) toast.error(error.message || 'Erro ao listar emails.');
    }
  };

  const loadAgenda = async () => {
    try {
      setAgenda(await emailService.listAgenda());
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar diario.');
    }
  };

  const selectEmail = async (email: VisualEmail) => {
    setSelectedEmail(email);
    setView('mail');
    try {
      const messages = await emailService.getThread(email.id);
      setThread(messages);
      if (!email.is_read) {
        await emailService.updateEmail(email.id, { is_read: true });
        setEmails((current) => current.map((item) => (item.id === email.id ? { ...item, is_read: true } : item)));
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar conversa.');
    }
  };

  const syncSelectedAccount = async () => {
    if (!selectedAccount) {
      setConnectOpen(true);
      return;
    }

    try {
      setSyncing(true);
      const result = await emailService.sync(selectedAccount.id);
      toast.success(`${result.synced || 0} emails sincronizados.`);
      const [freshAccounts, freshAgenda] = await Promise.all([
        emailService.listAccounts(),
        emailService.listAgenda().catch(() => []),
      ]);
      setAccounts(freshAccounts);
      setAgenda(freshAgenda);
      await loadEmails();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar conta.');
    } finally {
      setSyncing(false);
    }
  };

  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await emailService.connectAccount(accountForm);
      toast.success('Conta conectada com seguranca.');
      setConnectOpen(false);
      setAccountForm(blankAccount);
      const fresh = await emailService.listAccounts();
      setAccounts(fresh);
      setSelectedAccountId(fresh[0]?.id || '');
    } catch (error: any) {
      toast.error(error.message || 'Falha ao conectar conta.');
    }
  };

  const sendNewEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await emailService.send({
        account_id: selectedAccount?.id,
        to: compose.to,
        subject: compose.subject,
        body_html: compose.body_html.replace(/\n/g, '<br />'),
        lead_id: compose.lead_id || null,
      });
      toast.success('Email enviado.');
      setComposeOpen(false);
      setCompose({ to: '', subject: '', body_html: '', lead_id: '' });
      if (folder === 'sent') await loadEmails();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar email.');
    }
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEmail) return;
    try {
      await emailService.reply(selectedEmail.id, replyBody.replace(/\n/g, '<br />'));
      toast.success('Resposta enviada.');
      setReplyOpen(false);
      setReplyBody('');
      await selectEmail(selectedEmail);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao responder.');
    }
  };

  const archiveSelected = async () => {
    if (!selectedEmail) return;
    await emailService.updateEmail(selectedEmail.id, { is_archived: true });
    toast.success('Email arquivado.');
    await loadEmails();
  };

  const linkSelectedLead = async (leadId: string) => {
    if (!selectedEmail) return;
    await emailService.updateEmail(selectedEmail.id, { lead_id: leadId || null });
    toast.success(leadId ? 'Email vinculado ao lead.' : 'Vinculo removido.');
    await selectEmail({ ...selectedEmail, lead_id: leadId || null });
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[720px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-500">
        Carregando email profissional...
      </div>
    );
  }

  return (
    <div className="h-full min-h-[720px] overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm">
      <header className="flex h-[72px] items-center gap-4 border-b border-slate-200 bg-white px-5">
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100" title="Menu">
          <Menu size={22} />
        </button>
        <div className="flex w-[190px] shrink-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-emerald-500 text-emerald-600">
            <Mail size={19} />
          </div>
          <span className="text-xl font-bold text-slate-950">{COMMERCIAL_PRODUCT_NAME}</span>
        </div>
        <div className="relative max-w-[760px] flex-1">
          <Search size={21} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-12 w-full rounded-lg border border-transparent bg-slate-100/80 pl-14 pr-14 text-[15px] font-medium text-slate-700 outline-none transition focus:bg-white focus:ring-2 focus:ring-emerald-100"
            placeholder="Pesquisar e-mails"
          />
          <SlidersHorizontal size={21} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600" />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button className="hidden h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 xl:flex">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            Disponivel
            <ChevronDown size={16} />
          </button>
          {[HelpCircle, Settings, Grid3X3].map((Icon, index) => (
            <button key={index} className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 lg:flex">
              <Icon size={21} />
            </button>
          ))}
          <button className="relative hidden h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 lg:flex">
            <Bell size={21} />
            <span className="absolute right-1 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">3</span>
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700">
            U
          </div>
        </div>
      </header>

      <div className="grid h-[calc(100%-72px)] grid-cols-1 lg:grid-cols-[276px_minmax(370px,500px)_minmax(520px,1fr)] 2xl:grid-cols-[276px_500px_minmax(640px,1fr)_320px]">
        <aside className="hidden min-w-0 border-r border-slate-200 bg-slate-50/70 px-3 py-3 lg:flex lg:flex-col">
          <button
            onClick={() => setComposeOpen(true)}
            className="mb-5 flex h-14 w-36 items-center justify-center gap-3 rounded-2xl bg-white px-4 text-sm font-bold text-slate-700 shadow-md shadow-slate-200/80 ring-1 ring-slate-100 transition hover:shadow-lg"
          >
            <Plus size={26} className="text-blue-500" />
            Escrever
          </button>

          <nav className="space-y-0.5">
            {folders.map((item) => {
              const Icon = item.icon;
              const active = view === 'mail' && folder === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setView('mail');
                    setFolder(item.key);
                  }}
                  className={`flex h-10 w-full items-center gap-4 rounded-r-full px-5 text-sm font-semibold transition ${
                    active ? 'bg-emerald-100 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-emerald-700' : 'text-slate-600'} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count ? <span className="text-xs font-bold text-slate-500">{item.count}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 px-4 pb-2">
            <button
              onClick={() => setConnectOpen(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            >
              <Settings size={15} />
              Conectar conta
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex h-[58px] items-center gap-4 border-b border-slate-200 px-5">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" aria-label="Selecionar e-mails" />
            <ChevronDown size={15} className="text-slate-500" />
            <button onClick={syncSelectedAccount} disabled={syncing} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100">
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            </button>
            <MoreVertical size={19} className="text-slate-600" />
            <div className="ml-auto flex items-center gap-4 text-xs font-medium text-slate-600">
              <span>{displayEmails.length ? `1-${displayEmails.length} de ${displayEmails.length}` : '0 de 0'}</span>
              <ChevronLeft size={18} />
              <ChevronRight size={18} />
            </div>
          </div>
          <div className="flex h-[42px] items-center border-b border-slate-200 px-6 text-sm font-medium text-slate-700">
            Principal
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {displayEmails.map((email) => (
              <EmailRow
                key={email.id}
                email={email}
                active={selectedEmail?.id === email.id}
                onSelect={() => selectEmail(email)}
              />
            ))}
            {!displayEmails.length ? <EmptyState icon={Mail} text="Nenhum email nesta pasta." /> : null}
          </div>
        </section>

        <main className="hidden min-w-0 flex-col bg-white lg:flex">
          {view === 'agenda' ? (
            <AgendaPanel agenda={agenda} />
          ) : selectedEmail ? (
            <>
              <div className="flex h-[58px] items-center gap-4 border-b border-slate-200 px-5 text-slate-700">
                <ChevronLeft size={21} />
                <Archive size={18} />
                <AlertCircle size={18} />
                <Trash2 size={18} />
                <span className="h-6 w-px bg-slate-200" />
                <Mail size={18} />
                <Tag size={18} />
                <MoreVertical size={19} />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="mb-0 text-xl font-medium text-slate-950">{selectedEmail.subject || '(sem assunto)'}</h1>
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                        Caixa de entrada
                        <X size={12} />
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-slate-600">
                    <Printer size={18} />
                    <ExternalLink size={18} />
                  </div>
                </div>

                <MessageBlock message={sortedThread[0] || selectedEmail} first onReply={() => setReplyOpen(true)} />

                <div className="mt-5 border-t border-slate-200 pt-5">
                  <div className="mb-7 flex flex-wrap gap-2">
                    <ActionButton icon={Reply} label="Responder" onClick={() => setReplyOpen(true)} />
                    <ActionButton icon={ReplyAll} label="Responder a todos" onClick={() => setReplyOpen(true)} />
                    <ActionButton icon={Undo2} label="Encaminhar" />
                  </div>
                </div>

                {sortedThread.slice(1).map((message) => (
                  <div key={message.id} className="border-t border-slate-200 py-6">
                    <MessageBlock message={message} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={Mail} text="Selecione uma conversa" />
          )}
        </main>

        <LeadPanel
          linkedLead={linkedLead}
          leads={leads}
          selectedEmail={selectedEmail}
          linkSelectedLead={linkSelectedLead}
          archiveSelected={archiveSelected}
          setView={setView}
          loadAgenda={loadAgenda}
          pendingCount={todayCount || pendingAgenda.length}
          agenda={relevantAgenda}
        />
      </div>

      {composeOpen && (
        <Modal title="Novo email" onClose={() => setComposeOpen(false)}>
          <form onSubmit={sendNewEmail} className="space-y-3">
            <input className="input-field" placeholder="Para" value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input-field" placeholder="CC" />
              <input className="input-field" placeholder="CCO" />
            </div>
            <input className="input-field" placeholder="Assunto" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
            <select className="select-field" value={compose.lead_id} onChange={(e) => setCompose({ ...compose, lead_id: e.target.value })}>
              <option value="">Sem lead vinculado</option>
              {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
            </select>
            <textarea className="textarea-field min-h-48" placeholder="Mensagem" value={compose.body_html} onChange={(e) => setCompose({ ...compose, body_html: e.target.value })} />
            <div className="flex justify-between gap-2">
              <button type="button" className="btn btn-secondary"><Paperclip size={16} /> Anexar</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setComposeOpen(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary"><Send size={16} /> Enviar</button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {replyOpen && (
        <Modal title="Responder" onClose={() => setReplyOpen(false)}>
          <form onSubmit={sendReply} className="space-y-3">
            <textarea className="textarea-field min-h-48" placeholder="Digite sua resposta" value={replyBody} onChange={(e) => setReplyBody(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReplyOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary"><Reply size={16} /> Responder</button>
            </div>
          </form>
        </Modal>
      )}

      {connectOpen && (
        <Modal title="Conectar conta de email" onClose={() => setConnectOpen(false)}>
          <form onSubmit={saveAccount} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input-field md:col-span-2" type="email" placeholder="email@dominio.com" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} />
              <input className="input-field md:col-span-2" type="password" placeholder="Senha do email" value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} />
              <input className="input-field" placeholder="Servidor IMAP" value={accountForm.imap_host} onChange={(e) => setAccountForm({ ...accountForm, imap_host: e.target.value })} />
              <input className="input-field" type="number" placeholder="Porta IMAP" value={accountForm.imap_port} onChange={(e) => {
                const port = Number(e.target.value);
                setAccountForm({ ...accountForm, imap_port: port, imap_secure: isImplicitTlsPort(port, 993) });
              }} />
              <input className="input-field" placeholder="Servidor SMTP" value={accountForm.smtp_host} onChange={(e) => setAccountForm({ ...accountForm, smtp_host: e.target.value })} />
              <input className="input-field" type="number" placeholder="Porta SMTP" value={accountForm.smtp_port} onChange={(e) => {
                const port = Number(e.target.value);
                setAccountForm({ ...accountForm, smtp_port: port, smtp_secure: isImplicitTlsPort(port, 465) });
              }} />
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <input type="checkbox" checked={accountForm.imap_secure} onChange={(e) => setAccountForm({ ...accountForm, imap_secure: e.target.checked })} />
              IMAP SSL/TLS direto
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <input type="checkbox" checked={accountForm.smtp_secure} onChange={(e) => setAccountForm({ ...accountForm, smtp_secure: e.target.checked })} />
              SMTP SSL/TLS direto
            </label>
            <div className="rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-500">
              Use 465 para SMTP SSL direto ou 587 para STARTTLS. Use 993 para IMAP SSL direto.
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConnectOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary"><Check size={16} /> Testar e salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

const EmailRow: React.FC<{ email: VisualEmail; active: boolean; onSelect: () => void }> = ({ email, active, onSelect }) => (
  <button
    onClick={onSelect}
    className={`grid w-full grid-cols-[24px_24px_minmax(0,1fr)_58px] items-start gap-3 border-b border-slate-100 px-5 py-3 text-left transition hover:shadow-sm ${
      active ? 'border-l-4 border-l-emerald-500 bg-slate-50' : 'bg-white'
    }`}
  >
    <input type="checkbox" onClick={(event) => event.stopPropagation()} className="mt-1 h-4 w-4 rounded border-slate-300" aria-label={`Selecionar ${email.subject}`} />
    <Star size={16} className={`mt-1 ${email.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <p className={`truncate text-sm ${email.is_read ? 'font-semibold text-slate-800' : 'font-bold text-slate-950'}`}>
          {email.direction === 'outgoing' ? email.to_email?.[0] : email.from_name || email.from_email}
        </p>
        {email.label ? <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${email.labelColor}`}>{email.label}</span> : null}
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{email.subject || '(sem assunto)'}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-500">{cleanSnippet(email.preview || email.body_text || '') || 'Sem preview'}</p>
    </div>
    <div className="flex flex-col items-end gap-2">
      <span className={`text-xs font-bold ${email.is_read ? 'text-slate-500' : 'text-emerald-600'}`}>{email.timeLabel || formatDateTime(email.date).slice(0, 5)}</span>
      {email.has_attachments ? <Paperclip size={14} className="text-slate-500" /> : null}
    </div>
  </button>
);

const MessageBlock: React.FC<{ message: VisualEmail; first?: boolean; onReply?: () => void }> = ({ message, first, onReply }) => {
  const outgoing = message.direction === 'outgoing';
  const sender = outgoing ? message.from_name || message.from_email : message.from_name || message.from_email;
  const senderEmail = outgoing ? message.from_email : message.from_email;
  const bodyText = cleanSnippet(message.body_text || message.preview || '');
  const html = message.body_html || '';

  return (
    <article>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
            {getInitials(sender)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="mb-0 truncate text-sm font-bold text-slate-950">{sender}</p>
              <span className="text-xs font-medium text-slate-500">&lt;{senderEmail}&gt;</span>
            </div>
            <p className="mb-0 mt-1 text-xs font-medium text-slate-500">
              para {message.to_email?.join(', ') || 'mim'} <ChevronDown size={13} className="inline" />
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-slate-600">
          <span className="text-xs font-medium text-slate-500">{message.timeLabel || formatDateTime(message.date)}</span>
          <Star size={17} />
          <Reply size={17} onClick={onReply} className="cursor-pointer" />
          <MoreVertical size={18} />
        </div>
      </div>
      <div className="ml-14 max-w-3xl text-sm font-medium leading-7 text-slate-800">
        {html ? (
          <iframe
            title={`email-${message.id}`}
            sandbox=""
            className="min-h-36 w-full rounded-md border-0 bg-white"
            srcDoc={`<!doctype html><html><head><base target="_blank"><style>body{font-family:Arial,sans-serif;color:#0f172a;line-height:1.55;padding:0;margin:0;font-size:14px}img{max-width:100%;height:auto}table{max-width:100%}.gmail_quote,.gmail_attr,.yahoo_quoted,blockquote[type=cite]{display:none!important}blockquote{display:none!important}</style></head><body>${html}</body></html>`}
          />
        ) : (
          <p className="mb-0 whitespace-pre-wrap">{bodyText || 'Sem conteudo.'}</p>
        )}
      </div>
    </article>
  );
};

const ActionButton: React.FC<{ icon: React.ElementType; label: string; onClick?: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button onClick={onClick} className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
    <Icon size={17} />
    {label}
  </button>
);

const LeadPanel: React.FC<{
  linkedLead: any;
  leads: Lead[];
  selectedEmail: VisualEmail | null;
  linkSelectedLead: (leadId: string) => void;
  archiveSelected: () => void;
  setView: (view: ViewKey) => void;
  loadAgenda: () => void;
  pendingCount: number;
  agenda: EmailAgendaActivity[];
}> = ({ linkedLead, leads, selectedEmail, linkSelectedLead, archiveSelected, setView, loadAgenda, pendingCount, agenda }) => (
  <aside className="hidden min-w-0 border-l border-slate-200 bg-white 2xl:flex 2xl:flex-col">
    <div className="flex h-[58px] items-center justify-between border-b border-slate-200 px-5">
      <h2 className="mb-0 text-sm font-bold text-slate-900">Lead vinculado</h2>
      <div className="flex items-center gap-3 text-slate-600">
        <ExternalLink size={18} />
        <MoreVertical size={18} />
      </div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
      {selectedEmail ? (
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl font-medium text-slate-700">
            {getInitials(linkedLead?.name || selectedEmail.from_name || selectedEmail.from_email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="mb-0 truncate text-sm font-bold text-slate-950">
                {linkedLead?.name || selectedEmail.from_name || selectedEmail.from_email}
              </p>
              {linkedLead ? (
                <span className="rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Lead</span>
              ) : null}
            </div>
            <p className="mb-0 mt-1 truncate text-xs font-medium text-slate-500">{linkedLead?.email || selectedEmail.from_email}</p>
            {linkedLead?.phone ? <p className="mb-0 mt-1 text-xs font-medium text-slate-600">{linkedLead.phone}</p> : null}
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-lg border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500">
          Selecione um e-mail para ver o lead vinculado.
        </div>
      )}

      <select
        value={selectedEmail?.lead_id || ''}
        onChange={(event) => linkSelectedLead(event.target.value)}
        disabled={!selectedEmail}
        className="mb-5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none"
      >
        <option value="">Sem lead vinculado</option>
        {leads.map((lead) => (
          <option key={lead.id} value={lead.id}>{lead.name}</option>
        ))}
      </select>

      {linkedLead ? (
        <div className="space-y-4 border-t border-slate-200 py-5">
          {linkedLead.source ? <InfoRow label="Origem" value={linkedLead.source} /> : null}
          {linkedLead.status ? <InfoRow label="Etapa do funil" value={linkedLead.status} badge /> : null}
          {linkedLead.email ? <InfoRow label="E-mail" value={linkedLead.email} /> : null}
          {linkedLead.phone ? <InfoRow label="Telefone" value={linkedLead.phone} /> : null}
          {linkedLead.notes ? <InfoRow label="Observacoes" value={linkedLead.notes} multiline /> : null}
        </div>
      ) : (
        <div className="border-t border-slate-200 py-5 text-xs font-semibold leading-relaxed text-slate-500">
          Nenhum lead real vinculado a este e-mail.
        </div>
      )}

      <div className="border-t border-slate-200 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="mb-0 text-sm font-bold text-slate-900">Ultimas interacoes</h3>
          {pendingCount ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{pendingCount}</span> : null}
        </div>
        {agenda.map((item) => (
          <Interaction
            key={item.id}
            icon={Mail}
            color="bg-blue-100 text-blue-600"
            title={item.title}
            subtitle={item.subject || item.description}
            date={formatDateTime(item.created_at)}
          />
        ))}
        {agenda.length ? (
          <button
            onClick={() => {
              setView('agenda');
              loadAgenda();
            }}
            className="mt-2 w-full text-right text-xs font-bold text-blue-600"
          >
            Ver todas
          </button>
        ) : (
          <p className="mb-0 text-xs font-semibold text-slate-500">Nenhuma interacao real registrada.</p>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-5">
        <SideAction icon={Calendar} label="Criar tarefa" />
        <SideAction icon={Calendar} label="Agendar follow-up" />
        <button
          onClick={archiveSelected}
          disabled={!selectedEmail}
          className="flex h-11 w-full items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-500 disabled:opacity-50"
        >
          <LinkIcon size={17} />
          Desvincular lead
        </button>
      </div>
    </div>
  </aside>
);

const InfoRow: React.FC<{ label: string; value: string; badge?: boolean; avatar?: boolean; multiline?: boolean }> = ({ label, value, badge, avatar, multiline }) => (
  <div className={`grid grid-cols-[92px_1fr] gap-3 text-xs ${multiline ? 'items-start' : 'items-center'}`}>
    <span className="font-semibold text-slate-500">{label}</span>
    <span className={`font-semibold text-slate-800 ${multiline ? 'leading-relaxed' : ''}`}>
      {badge ? (
        <span className="rounded-md bg-violet-100 px-2 py-1 text-violet-700">{value}</span>
      ) : (
        value
      )}
    </span>
  </div>
);

const Interaction: React.FC<{ icon: React.ElementType; color: string; title: string; subtitle: string; date: string }> = ({ icon: Icon, color, title, subtitle, date }) => (
  <div className="mb-4 flex items-start gap-3">
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${color}`}>
      <Icon size={14} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="mb-0 text-xs font-bold text-slate-800">{title}</p>
      {subtitle ? <p className="mb-0 mt-1 truncate text-[11px] font-medium text-slate-500">{subtitle}</p> : null}
    </div>
    <span className="w-24 shrink-0 text-right text-[11px] font-medium text-slate-500">{date}</span>
  </div>
);

const SideAction: React.FC<{ icon: React.ElementType; label: string }> = ({ icon: Icon, label }) => (
  <button className="flex h-11 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
    <Icon size={17} />
    {label}
  </button>
);

const AgendaPanel: React.FC<{ agenda: EmailAgendaActivity[] }> = ({ agenda }) => (
  <div className="flex h-full flex-col">
    <div className="border-b border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <Calendar size={22} />
        </div>
        <div>
          <h1 className="mb-0 text-xl font-bold text-slate-950">Diario de bordo</h1>
          <p className="mb-0 mt-1 text-xs font-semibold text-slate-500">Atividades criadas pelo agente a partir dos emails dos leads.</p>
        </div>
      </div>
    </div>
    <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 xl:grid-cols-2">
      {agenda.map((item) => (
        <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-bold text-slate-950">{item.title}</p>
          <p className="mb-3 text-xs font-bold text-slate-500">{item.subject || item.type}</p>
          <p className="mb-4 text-sm font-medium leading-relaxed text-slate-700">{item.description}</p>
          <span className="text-xs font-bold text-slate-500">{formatDateTime(item.created_at)}</span>
        </article>
      ))}
      {!agenda.length ? <EmptyState icon={Calendar} text="Nenhuma atividade de email." /> : null}
    </div>
  </div>
);

const EmptyState: React.FC<{ icon: React.ElementType; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex h-full min-h-80 flex-col items-center justify-center p-8 text-center text-slate-400">
    <Icon size={34} />
    <p className="mt-3 text-sm font-bold">{text}</p>
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="modal-overlay">
    <div className="modal-content max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="mb-0 text-lg font-bold text-slate-950">{title}</h2>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900">
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default EmailCenter;
