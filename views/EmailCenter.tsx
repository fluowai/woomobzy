import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CalendarCheck,
  Check,
  Clock3,
  Inbox,
  Link as LinkIcon,
  Mail,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Settings,
  Sparkles,
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

type FolderKey = 'inbox' | 'sent' | 'archived';
type ViewKey = 'mail' | 'agenda';

const folders: Array<{ key: FolderKey; label: string; icon: React.ElementType }> = [
  { key: 'inbox', label: 'Caixa de entrada', icon: Inbox },
  { key: 'sent', label: 'Enviados', icon: Send },
  { key: 'archived', label: 'Arquivados', icon: Archive },
];

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

const isImplicitTlsPort = (port: number, implicitTlsPort: number) => Number(port) === implicitTlsPort;

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

const cleanSnippet = (value = '') =>
  value
    .replace(/Em .* escreveu:/gi, '')
    .replace(/On .* wrote:/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const priorityClass = (priority = 'medium') => {
  if (priority === 'urgent') return 'border-red-200 bg-red-50 text-red-700';
  if (priority === 'high') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (priority === 'low') return 'border-slate-200 bg-slate-50 text-slate-500';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

const priorityLabel = (priority = 'medium') => {
  if (priority === 'urgent') return 'Urgente';
  if (priority === 'high') return 'Alta';
  if (priority === 'low') return 'Baixa';
  return 'Normal';
};

const EmailCenter: React.FC = () => {
  const [view, setView] = useState<ViewKey>('mail');
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [folder, setFolder] = useState<FolderKey>('inbox');
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [thread, setThread] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
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

  const sortedThread = useMemo(
    () =>
      [...thread].sort((a, b) => {
        const aDate = a.date ? new Date(a.date).getTime() : 0;
        const bDate = b.date ? new Date(b.date).getTime() : 0;
        return bDate - aDate;
      }),
    [thread]
  );

  const pendingAgenda = agenda.filter((item) => item.status !== 'done');
  const todayCount = pendingAgenda.filter((item) => {
    const date = new Date(item.created_at);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  }).length;

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
        emailService.listAccounts(),
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
      const data = await emailService.listEmails(folder, 1, search);
      setEmails(data.emails);
      if (!selectedEmail && data.emails[0]) {
        await selectEmail(data.emails[0]);
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

  const selectEmail = async (email: EmailMessage) => {
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
    return <div className="p-10 text-center text-slate-500 font-semibold">Carregando email profissional...</div>;
  }

  return (
    <div className="h-[calc(100vh-8.5rem)] min-h-[720px] overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[248px_minmax(330px,430px)_1fr]">
        <aside className="hidden border-r border-slate-200 bg-slate-50 p-4 lg:flex lg:flex-col">
          <button
            onClick={() => setComposeOpen(true)}
            className="mb-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            <Plus size={18} />
            Novo email
          </button>

          <div className="mb-4 grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={() => setView('mail')}
              className={`h-9 rounded-md text-xs font-black transition ${view === 'mail' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Email
            </button>
            <button
              onClick={() => {
                setView('agenda');
                loadAgenda();
              }}
              className={`relative h-9 rounded-md text-xs font-black transition ${view === 'agenda' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Diario
              {pendingAgenda.length ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] text-white">
                  {pendingAgenda.length}
                </span>
              ) : null}
            </button>
          </div>

          <nav className="space-y-1">
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
                  className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
                    active ? 'bg-emerald-100 text-slate-950' : 'text-slate-600 hover:bg-white hover:text-slate-950'
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700">
              <Sparkles size={14} />
              Agente de email
            </div>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">
              {todayCount || pendingAgenda.length
                ? `${todayCount || pendingAgenda.length} atividade${(todayCount || pendingAgenda.length) === 1 ? '' : 's'} para acompanhar.`
                : 'Sem pendencias detectadas nos emails sincronizados.'}
            </p>
          </div>

          <div className="mt-auto space-y-3 border-t border-slate-200 pt-4">
            <select
              value={selectedAccount?.id || ''}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.email}</option>
              ))}
              {!accounts.length ? <option>Nenhuma conta conectada</option> : null}
            </select>
            <button
              onClick={() => setConnectOpen(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            >
              <Settings size={15} />
              Conectar conta
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col border-r border-slate-200">
          <div className="border-b border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder={view === 'agenda' ? 'Buscar no diario' : 'Buscar emails'}
                />
              </div>
              <button
                onClick={view === 'agenda' ? loadAgenda : syncSelectedAccount}
                disabled={syncing}
                title={view === 'agenda' ? 'Atualizar diario' : 'Sincronizar'}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
              >
                <RefreshCw size={17} className={syncing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white">
            {view === 'agenda' ? (
              <AgendaList agenda={agenda} search={search} />
            ) : (
              <>
                {emails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => selectEmail(email)}
                    className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${
                      selectedEmail?.id === email.id ? 'bg-emerald-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`truncate text-sm ${email.is_read ? 'font-semibold text-slate-700' : 'font-black text-slate-950'}`}>
                        {email.direction === 'outgoing' ? email.to_email?.[0] : email.from_name || email.from_email}
                      </p>
                      <span className="shrink-0 text-[11px] font-bold text-slate-400">{formatDate(email.date)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900">{email.subject || '(sem assunto)'}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">
                      {cleanSnippet(email.preview || '') || 'Sem preview'}
                    </p>
                    {email.leads ? (
                      <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                        <LinkIcon size={11} />
                        {email.leads.name}
                      </span>
                    ) : null}
                  </button>
                ))}
                {!emails.length ? (
                  <EmptyState icon={Mail} text="Nenhum email nesta pasta." />
                ) : null}
              </>
            )}
          </div>
        </section>

        <main className="hidden min-w-0 flex-col bg-slate-50 lg:flex">
          {view === 'agenda' ? (
            <AgendaPanel agenda={agenda} />
          ) : selectedEmail ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <h1 className="mb-0 truncate text-xl font-black text-slate-950">{selectedEmail.subject || '(sem assunto)'}</h1>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {sortedThread.length} mensagem{sortedThread.length === 1 ? '' : 's'} - mais recente primeiro
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedEmail.lead_id || ''}
                    onChange={(event) => linkSelectedLead(event.target.value)}
                    className="h-9 max-w-56 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none"
                  >
                    <option value="">Sem lead vinculado</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>{lead.name}</option>
                    ))}
                  </select>
                  <button onClick={archiveSelected} title="Arquivar" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-emerald-700">
                    <Archive size={16} />
                  </button>
                  <button onClick={() => setReplyOpen(true)} title="Responder" className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                    <Reply size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {sortedThread.map((message) => (
                  <MessageCard key={message.id} message={message} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={Mail} text="Selecione uma conversa" />
          )}
        </main>
      </div>

      {composeOpen && (
        <Modal title="Novo email" onClose={() => setComposeOpen(false)}>
          <form onSubmit={sendNewEmail} className="space-y-3">
            <input className="input-field" placeholder="Para" value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} />
            <input className="input-field" placeholder="Assunto" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
            <select className="select-field" value={compose.lead_id} onChange={(e) => setCompose({ ...compose, lead_id: e.target.value })}>
              <option value="">Sem lead vinculado</option>
              {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
            </select>
            <textarea className="textarea-field min-h-48" placeholder="Mensagem" value={compose.body_html} onChange={(e) => setCompose({ ...compose, body_html: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setComposeOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary"><Send size={16} /> Enviar</button>
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

const AgendaList: React.FC<{ agenda: EmailAgendaActivity[]; search: string }> = ({ agenda, search }) => {
  const cleanSearch = search.trim().toLowerCase();
  const filtered = agenda.filter((item) =>
    !cleanSearch ||
    item.description.toLowerCase().includes(cleanSearch) ||
    item.leads?.name?.toLowerCase().includes(cleanSearch) ||
    item.subject?.toLowerCase().includes(cleanSearch)
  );

  if (!filtered.length) return <EmptyState icon={CalendarCheck} text="Nenhuma atividade de email." />;

  return (
    <div className="divide-y divide-slate-100">
      {filtered.map((item) => (
        <div key={item.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{item.title}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.leads?.name || item.from_email || 'Email sem lead'}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${priorityClass(item.priority)}`}>
              {priorityLabel(item.priority)}
            </span>
          </div>
          <p className="mt-3 line-clamp-2 text-xs font-medium leading-relaxed text-slate-600">{item.description}</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-400">
            <Clock3 size={12} />
            {formatDateTime(item.created_at)}
          </div>
        </div>
      ))}
    </div>
  );
};

const AgendaPanel: React.FC<{ agenda: EmailAgendaActivity[] }> = ({ agenda }) => {
  const urgent = agenda.filter((item) => item.priority === 'urgent' || item.priority === 'high');
  const normal = agenda.filter((item) => item.priority !== 'urgent' && item.priority !== 'high');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="mb-0 text-xl font-black text-slate-950">Diario de bordo</h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">Atividades criadas pelo agente a partir dos emails dos leads.</p>
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 xl:grid-cols-2">
        <ActivityColumn title="Prioridade" icon={AlertCircle} items={urgent} />
        <ActivityColumn title="Acompanhar" icon={CalendarCheck} items={normal} />
      </div>
    </div>
  );
};

const ActivityColumn: React.FC<{ title: string; icon: React.ElementType; items: EmailAgendaActivity[] }> = ({ title, icon: Icon, items }) => (
  <section className="min-h-0">
    <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
      <Icon size={18} />
      {title}
      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600">{items.length}</span>
    </div>
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950">{item.title}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{item.subject || item.type}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${priorityClass(item.priority)}`}>
              {priorityLabel(item.priority)}
            </span>
          </div>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700">{item.description}</p>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
            <span className="flex min-w-0 items-center gap-2">
              <UserRound size={14} />
              <span className="truncate">{item.leads?.name || item.from_email || 'Sem lead'}</span>
            </span>
            <span className="shrink-0">{formatDateTime(item.created_at)}</span>
          </div>
        </article>
      ))}
      {!items.length ? <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-400">Nada aqui por enquanto.</div> : null}
    </div>
  </section>
);

const MessageCard: React.FC<{ message: EmailMessage }> = ({ message }) => {
  const outgoing = message.direction === 'outgoing';
  const sender = outgoing ? 'Fluow Ai' : message.from_name || message.from_email;
  const senderEmail = outgoing ? message.from_email : message.from_email;
  const bodyText = cleanSnippet(message.body_text || message.preview || '');
  const html = message.body_html || '';

  return (
    <article className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700">
              {sender.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-black text-slate-950">{sender}</p>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500">
                  {outgoing ? 'Enviado' : 'Recebido'}
                </span>
              </div>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                {senderEmail} para {message.to_email?.join(', ') || '-'}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold text-slate-400">{formatDateTime(message.date)}</span>
        </div>
      </div>
      <div className="px-5 py-4">
        {html ? (
          <iframe
            title={`email-${message.id}`}
            sandbox=""
            className="min-h-36 w-full rounded-md border-0 bg-white"
            srcDoc={`<!doctype html><html><head><base target="_blank"><style>body{font-family:Arial,sans-serif;color:#0f172a;line-height:1.55;padding:0;margin:0;font-size:14px}img{max-width:100%;height:auto}table{max-width:100%}.gmail_quote,.gmail_attr,.yahoo_quoted,blockquote[type=cite]{display:none!important}blockquote{display:none!important}</style></head><body>${html}</body></html>`}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{bodyText || 'Sem conteudo.'}</p>
        )}
      </div>
    </article>
  );
};

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
        <h2 className="mb-0 text-lg font-black text-slate-950">{title}</h2>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900">
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default EmailCenter;
