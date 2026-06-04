import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Check,
  Inbox,
  Link as LinkIcon,
  Mail,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Settings,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { emailService, EmailAccount, EmailMessage, ConnectEmailPayload } from '@/services/email';
import { leadService } from '@/services/leads';
import { Lead } from '@/types';

type FolderKey = 'inbox' | 'sent' | 'archived';

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

const EmailCenter: React.FC = () => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [folder, setFolder] = useState<FolderKey>('inbox');
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [thread, setThread] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
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

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadEmails();
  }, [folder]);

  useEffect(() => {
    const timeout = window.setTimeout(loadEmails, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) || accounts[0],
    [accounts, selectedAccountId]
  );

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [accountData, leadData] = await Promise.all([
        emailService.listAccounts(),
        leadService.list().catch(() => []),
      ]);
      setAccounts(accountData);
      setSelectedAccountId(accountData[0]?.id || '');
      setLeads(leadData as Lead[]);
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
        selectEmail(data.emails[0]);
      }
      if (!data.emails.length) {
        setSelectedEmail(null);
        setThread([]);
      }
    } catch (error: any) {
      if (!loading) toast.error(error.message || 'Erro ao listar emails.');
    }
  };

  const selectEmail = async (email: EmailMessage) => {
    setSelectedEmail(email);
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
      const freshAccounts = await emailService.listAccounts();
      setAccounts(freshAccounts);
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
    <div className="h-[calc(100vh-8.5rem)] min-h-[680px] overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[240px_minmax(320px,420px)_1fr]">
        <aside className="hidden border-r border-slate-200 bg-slate-50/80 p-4 lg:flex lg:flex-col">
          <button
            onClick={() => setComposeOpen(true)}
            className="mb-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Novo email
          </button>

          <nav className="space-y-1">
            {folders.map((item) => {
              const Icon = item.icon;
              const active = folder === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setFolder(item.key)}
                  className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
                    active ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </nav>

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
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-700 hover:border-primary/40 hover:text-primary"
            >
              <Settings size={15} />
              Conectar conta
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col border-r border-slate-200">
          <div className="border-b border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Buscar emails"
                />
              </div>
              <button
                onClick={syncSelectedAccount}
                disabled={syncing}
                title="Sincronizar"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary disabled:opacity-50"
              >
                <RefreshCw size={17} className={syncing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setComposeOpen(true)}
                title="Novo email"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white lg:hidden"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {emails.map((email) => (
              <button
                key={email.id}
                onClick={() => selectEmail(email)}
                className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${
                  selectedEmail?.id === email.id ? 'bg-primary/5' : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={`truncate text-sm ${email.is_read ? 'font-semibold text-slate-700' : 'font-black text-slate-950'}`}>
                    {email.direction === 'outgoing' ? email.to_email?.[0] : email.from_name || email.from_email}
                  </p>
                  <span className="shrink-0 text-[11px] font-bold text-slate-400">
                    {email.date ? new Date(email.date).toLocaleDateString('pt-BR') : ''}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-bold text-slate-900">{email.subject || '(sem assunto)'}</p>
                <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">{email.preview || 'Sem preview'}</p>
                {email.leads ? (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-black text-primary">
                    <LinkIcon size={11} />
                    {email.leads.name}
                  </span>
                ) : null}
              </button>
            ))}
            {!emails.length ? (
              <div className="flex h-full min-h-80 flex-col items-center justify-center p-8 text-center text-slate-400">
                <Mail size={32} />
                <p className="mt-3 text-sm font-bold">Nenhum email nesta pasta.</p>
              </div>
            ) : null}
          </div>
        </section>

        <main className="hidden min-w-0 flex-col bg-white lg:flex">
          {selectedEmail ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div className="min-w-0">
                  <h1 className="mb-0 truncate text-xl font-black text-slate-950">{selectedEmail.subject || '(sem assunto)'}</h1>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Thread com {thread.length} mensagem{thread.length === 1 ? '' : 's'}
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
                  <button
                    onClick={archiveSelected}
                    title="Arquivar"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:text-primary"
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    onClick={() => setReplyOpen(true)}
                    title="Responder"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white"
                  >
                    <Reply size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-4">
                {thread.map((message) => (
                  <article key={message.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                          {message.direction === 'outgoing' ? message.from_email : message.from_name || message.from_email}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-500">
                          Para: {message.to_email?.join(', ') || '-'}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-slate-400">
                        {message.date ? new Date(message.date).toLocaleString('pt-BR') : ''}
                      </span>
                    </div>
                    {message.body_html ? (
                      <iframe
                        title={`email-${message.id}`}
                        sandbox=""
                        className="min-h-64 w-full rounded-md border border-slate-100 bg-white"
                        srcDoc={`<!doctype html><html><head><base target="_blank"><style>body{font-family:Arial,sans-serif;color:#0f172a;line-height:1.55;padding:16px;margin:0}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${message.body_html}</body></html>`}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm text-slate-700">{message.body_text || 'Sem conteudo.'}</p>
                    )}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <Mail size={38} />
              <p className="mt-3 text-sm font-bold">Selecione uma conversa</p>
            </div>
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
              <input className="input-field" type="number" placeholder="Porta IMAP" value={accountForm.imap_port} onChange={(e) => setAccountForm({ ...accountForm, imap_port: Number(e.target.value) })} />
              <input className="input-field" placeholder="Servidor SMTP" value={accountForm.smtp_host} onChange={(e) => setAccountForm({ ...accountForm, smtp_host: e.target.value })} />
              <input className="input-field" type="number" placeholder="Porta SMTP" value={accountForm.smtp_port} onChange={(e) => setAccountForm({ ...accountForm, smtp_port: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <input type="checkbox" checked={accountForm.imap_secure} onChange={(e) => setAccountForm({ ...accountForm, imap_secure: e.target.checked })} />
              IMAP SSL/TLS
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <input type="checkbox" checked={accountForm.smtp_secure} onChange={(e) => setAccountForm({ ...accountForm, smtp_secure: e.target.checked })} />
              SMTP SSL/TLS
            </label>
            <div className="rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-500">
              A senha sera validada antes de salvar e armazenada com AES-256-GCM. OAuth para Gmail/Outlook fica previsto pelos campos de autenticacao.
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
