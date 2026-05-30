import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  CloudCog,
  Database,
  Download,
  FileJson,
  HardDrive,
  LockKeyhole,
  RefreshCw,
  Server,
  Shield,
} from 'lucide-react';
import { callApi } from '../../src/lib/api';

type Job = {
  id: string;
  status: string;
  progress: number;
  dry_run_approved: boolean;
  selected_schemas: string[];
  selected_buckets: string[];
  created_at: string;
};

type FormState = {
  source: Record<string, any>;
  target: Record<string, any>;
  minio: Record<string, any>;
  selectedSchemas: string;
  selectedBuckets: string;
};

const initialForm: FormState = {
  source: {
    supabaseUrl: '',
    anonKey: '',
    serviceRoleKey: '',
    dbHost: '',
    dbPort: 5432,
    dbName: 'postgres',
    dbUser: 'postgres',
    dbPassword: '',
    sslMode: 'require',
  },
  target: {
    supabaseUrl: '',
    anonKey: '',
    serviceRoleKey: '',
    dbHost: '',
    dbPort: 5432,
    dbName: 'postgres',
    dbUser: 'postgres',
    dbPassword: '',
    sslMode: 'require',
  },
  minio: {
    endpoint: '',
    port: 443,
    accessKey: '',
    secretKey: '',
    bucket: '',
    publicBaseUrl: '',
    useSsl: true,
  },
  selectedSchemas: 'public, auth',
  selectedBuckets: 'whatsapp-media, imobzyimg, imobzymsg, documents, exports',
};

const steps = [
  'Conexões',
  'Diagnóstico',
  'Simulação',
  'Migração Banco',
  'Migração Storage',
  'Atualização URLs',
  'Sincronização final',
  'Validação',
  'Ativação',
];

const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100';

const FluowaiMigration: React.FC = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    refreshJobs();
  }, []);

  const canRunActions = Boolean(activeJob?.id);
  const phaseLabel = useMemo(() => {
    if (!activeJob) return 'Nenhum job criado';
    if (activeJob.dry_run_approved) return 'Dry-run aprovado';
    return `Status: ${activeJob.status}`;
  }, [activeJob]);

  async function refreshJobs() {
    try {
      const data = await callApi('/api/fluowai-migration/jobs');
      setJobs(data.jobs || []);
      if (!activeJob && data.jobs?.[0]) setActiveJob(data.jobs[0]);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function createJob() {
    setLoading(true);
    setActiveAction('create');
    setError(null);
    setMessage(null);
    try {
      const data = await callApi('/api/fluowai-migration/jobs', {
        method: 'POST',
        body: JSON.stringify({
          source: {
            ...form.source,
            buckets: splitList(form.selectedBuckets),
          },
          target: form.target,
          minio: form.minio,
          selectedSchemas: splitList(form.selectedSchemas),
          selectedBuckets: splitList(form.selectedBuckets),
        }),
      });
      setActiveJob(data.job);
      setMessage('Job salvo com credenciais criptografadas.');
      setResult(data);
      await refreshJobs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }

  async function runAction(action: 'test-connections' | 'diagnose' | 'dry-run' | 'report') {
    if (!activeJob) return;
    setLoading(true);
    setActiveAction(action);
    setError(null);
    setMessage(null);

    try {
      const path =
        action === 'report'
          ? `/api/fluowai-migration/jobs/${activeJob.id}/report`
          : `/api/fluowai-migration/jobs/${activeJob.id}/${action}`;
      const data = await callApi(path, {
        method: action === 'report' ? 'GET' : 'POST',
      });
      setResult(data.report || data.diagnostic || data);
      setMessage(actionMessage(action, data));
      await refreshJobs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }

  function updateSection(section: 'source' | 'target' | 'minio', key: string, value: any) {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  }

  function updateRoot(key: 'selectedSchemas' | 'selectedBuckets', value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-red-50 p-2 text-red-600 ring-1 ring-red-100">
              <CloudCog size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">
                Migração FluowAI Cloud
              </h1>
              <p className="text-sm text-slate-500">
                Prepare a troca de Supabase Cloud para Supabase Self-hosted e MinIO.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <Shield size={16} />
            Modo seguro: diagnóstico e dry-run apenas
          </div>
          <p className="mt-1 text-xs">
            Esta fase não copia banco, não migra arquivos e não altera a configuração ativa.
          </p>
        </div>
      </div>

      <section className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-9">
        {steps.map((step, index) => {
          const unlocked = index < 3;
          return (
            <div
              key={step}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                unlocked
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <div className="text-[10px] opacity-70">{index + 1}</div>
              {step}
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <CredentialPanel
            title="Origem Supabase Cloud"
            icon={<Database size={18} />}
            section="source"
            values={form.source}
            onChange={updateSection}
          />

          <CredentialPanel
            title="Destino Supabase Self-hosted"
            icon={<Server size={18} />}
            section="target"
            values={form.target}
            onChange={updateSection}
          />

          <MinioPanel values={form.minio} onChange={updateSection} />

          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Schemas selecionados
              </span>
              <input
                value={form.selectedSchemas}
                onChange={(event) => updateRoot('selectedSchemas', event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Buckets selecionados
              </span>
              <input
                value={form.selectedBuckets}
                onChange={(event) => updateRoot('selectedBuckets', event.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <LockKeyhole size={17} className="text-red-600" />
              Controle
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Salve as credenciais para criar um job. As chaves voltam mascaradas e ficam
              criptografadas no banco.
            </p>

            <button
              onClick={createJob}
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {activeAction === 'create' ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Salvar credenciais
            </button>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <div className="font-bold text-slate-800">{phaseLabel}</div>
              {activeJob?.id && <div className="mt-1 font-mono">{activeJob.id}</div>}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="text-sm font-bold text-slate-900">Ações seguras</div>
            <div className="mt-3 space-y-2">
              <ActionButton
                disabled={!canRunActions || loading}
                active={activeAction === 'test-connections'}
                icon={<ClipboardCheck size={16} />}
                label="Testar conexões"
                onClick={() => runAction('test-connections')}
              />
              <ActionButton
                disabled={!canRunActions || loading}
                active={activeAction === 'diagnose'}
                icon={<Database size={16} />}
                label="Executar diagnóstico"
                onClick={() => runAction('diagnose')}
              />
              <ActionButton
                disabled={!canRunActions || loading}
                active={activeAction === 'dry-run'}
                icon={<FileJson size={16} />}
                label="Simular migração"
                onClick={() => runAction('dry-run')}
              />
              <ActionButton
                disabled={!canRunActions || loading}
                active={activeAction === 'report'}
                icon={<Download size={16} />}
                label="Baixar relatório JSON"
                onClick={() => runAction('report')}
              />
            </div>

            <button
              disabled
              className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-400"
            >
              Iniciar migração bloqueado
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="text-sm font-bold text-slate-900">Jobs recentes</div>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {jobs.length === 0 && (
                <p className="text-xs text-slate-500">Nenhum job criado ainda.</p>
              )}
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setActiveJob(job)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                    activeJob?.id === job.id
                      ? 'border-red-300 bg-red-50 text-red-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">{job.status}</div>
                  <div className="mt-1 truncate font-mono">{job.id}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {(message || error) && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {error ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            {error || message}
          </div>
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-slate-950 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <FileJson size={16} />
          Resultado técnico
        </div>
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
          {result ? JSON.stringify(result, null, 2) : 'Aguardando execução segura.'}
        </pre>
      </section>
    </div>
  );
};

const CredentialPanel: React.FC<{
  title: string;
  icon: React.ReactNode;
  section: 'source' | 'target';
  values: Record<string, any>;
  onChange: (section: 'source' | 'target', key: string, value: any) => void;
}> = ({ title, icon, section, values, onChange }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5">
    <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
      {icon}
      {title}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Supabase URL" value={values.supabaseUrl} onChange={(value) => onChange(section, 'supabaseUrl', value)} />
      <Field label="Supabase anon key" secret value={values.anonKey} onChange={(value) => onChange(section, 'anonKey', value)} />
      <Field label="Service role key" secret value={values.serviceRoleKey} onChange={(value) => onChange(section, 'serviceRoleKey', value)} />
      <Field label="Database host" value={values.dbHost} onChange={(value) => onChange(section, 'dbHost', value)} />
      <Field label="Database port" value={values.dbPort} onChange={(value) => onChange(section, 'dbPort', Number(value))} />
      <Field label="Database name" value={values.dbName} onChange={(value) => onChange(section, 'dbName', value)} />
      <Field label="Database user" value={values.dbUser} onChange={(value) => onChange(section, 'dbUser', value)} />
      <Field label="Database password" secret value={values.dbPassword} onChange={(value) => onChange(section, 'dbPassword', value)} />
      <Field label="SSL mode" value={values.sslMode} onChange={(value) => onChange(section, 'sslMode', value)} />
    </div>
  </div>
);

const MinioPanel: React.FC<{
  values: Record<string, any>;
  onChange: (section: 'minio', key: string, value: any) => void;
}> = ({ values, onChange }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5">
    <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
      <HardDrive size={18} />
      Destino MinIO
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="MinIO endpoint" value={values.endpoint} onChange={(value) => onChange('minio', 'endpoint', value)} />
      <Field label="MinIO port" value={values.port} onChange={(value) => onChange('minio', 'port', Number(value))} />
      <Field label="Access key" secret value={values.accessKey} onChange={(value) => onChange('minio', 'accessKey', value)} />
      <Field label="Secret key" secret value={values.secretKey} onChange={(value) => onChange('minio', 'secretKey', value)} />
      <Field label="Bucket destino" value={values.bucket} onChange={(value) => onChange('minio', 'bucket', value)} />
      <Field label="Public base URL" value={values.publicBaseUrl} onChange={(value) => onChange('minio', 'publicBaseUrl', value)} />
      <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={values.useSsl}
          onChange={(event) => onChange('minio', 'useSsl', event.target.checked)}
        />
        Usar SSL
      </label>
    </div>
  </div>
);

const Field: React.FC<{
  label: string;
  value: any;
  secret?: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, secret, onChange }) => (
  <label className="space-y-2">
    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
    </span>
    <input
      type={secret ? 'password' : 'text'}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      className={fieldClass}
      autoComplete="off"
    />
  </label>
);

const ActionButton: React.FC<{
  disabled: boolean;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ disabled, active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
  >
    {active ? <RefreshCw size={16} className="animate-spin" /> : icon}
    {label}
  </button>
);

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function actionMessage(action: string, data: any) {
  if (action === 'test-connections') {
    return data.ok ? 'Todas as conexões passaram.' : 'Há conexões com falha. Veja o resultado técnico.';
  }
  if (action === 'diagnose') return 'Diagnóstico concluído.';
  if (action === 'dry-run') {
    return data.report?.ready ? 'Pronto para migrar.' : 'Correções necessárias antes da migração real.';
  }
  return 'Relatório carregado.';
}

export default FluowaiMigration;

