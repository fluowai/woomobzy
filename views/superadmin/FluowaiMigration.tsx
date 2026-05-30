import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  CloudCog,
  Download,
  FileJson,
  HardDrive,
  Image,
  LockKeyhole,
  Play,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { callApi } from '../../src/lib/api';

type Job = {
  id: string;
  status: string;
  progress: number;
  dry_run_approved: boolean;
  selected_buckets: string[];
  created_at: string;
};

type JobStep = {
  step: string;
  status: string;
  progress: number;
  metadata?: Record<string, any>;
  updated_at?: string;
};

type JobLog = {
  id: number | string;
  level: string;
  step?: string;
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
};

type JobError = {
  id: number | string;
  step?: string;
  entity_name?: string;
  error_message: string;
  created_at: string;
};

type JobDetails = {
  job?: Job;
  steps: JobStep[];
  logs: JobLog[];
  errors: JobError[];
};

type FormState = {
  source: Record<string, any>;
  minio: Record<string, any>;
  selectedBuckets: string;
  confirmation: string;
};

const initialForm: FormState = {
  source: {
    endpoint: '',
    region: 'sa-east-1',
    accessKey: '',
    secretKey: '',
    publicBaseUrl: '',
    supabaseUrl: '',
    useSsl: true,
  },
  minio: {
    endpoint: '',
    region: 'us-east-1',
    port: 443,
    accessKey: '',
    secretKey: '',
    bucket: '',
    layoutMode: 'preserve_buckets',
    prefixStrategy: 'bucket',
    publicBaseUrl: '',
    useSsl: true,
  },
  selectedBuckets: 'whatsapp-media, imobzyimg, imobzymsg, documents, exports',
  confirmation: '',
};

const steps = [
  'Conexões',
  'Diagnóstico',
  'Análise',
  'Simulação',
  'Migração Storage',
  'Validação',
  'URLs opcionais',
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
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [lastProgressSync, setLastProgressSync] = useState<string | null>(null);

  useEffect(() => {
    refreshJobs();
  }, []);

  useEffect(() => {
    if (!activeJob?.id) {
      setJobDetails(null);
      return;
    }

    loadJobDetails(activeJob.id);
  }, [activeJob?.id]);

  useEffect(() => {
    if (!activeJob?.id || !['running', 'testing'].includes(activeJob.status)) return;

    const interval = window.setInterval(() => {
      refreshJobs({ silent: true });
      loadJobDetails(activeJob.id, true);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [activeJob?.id, activeJob?.status]);

  const canRunActions = Boolean(activeJob?.id);
  const canMigrate = Boolean(activeJob?.id && activeJob.dry_run_approved && form.confirmation.trim() === 'MIGRAR MIDIAS');
  const migrateBlockedReason = getMigrateBlockedReason(activeJob, form.confirmation);
  const phaseLabel = useMemo(() => {
    if (!activeJob) return 'Nenhum job criado';
    if (activeJob.status === 'running') return `Migrando: ${activeJob.progress || 0}%`;
    if (activeJob.dry_run_approved) return 'Dry-run aprovado';
    return `Status: ${activeJob.status}`;
  }, [activeJob]);

  async function refreshJobs(options: { silent?: boolean } = {}) {
    try {
      const data = await callApi('/api/fluowai-migration/jobs');
      const nextJobs = data.jobs || [];
      setJobs(nextJobs);
      setActiveJob((current) => {
        if (!current) return nextJobs[0] || null;
        return nextJobs.find((job: Job) => job.id === current.id) || current;
      });
    } catch (err: any) {
      if (options.silent) return;
      setError(err.message);
    }
  }

  async function loadJobDetails(jobId: string, silent = false) {
    try {
      const data = await callApi(`/api/fluowai-migration/jobs/${jobId}`);
      setJobDetails({
        job: data.job,
        steps: data.steps || [],
        logs: data.logs || [],
        errors: data.errors || [],
      });
      setLastProgressSync(new Date().toLocaleTimeString('pt-BR'));
      if (data.job) {
        setActiveJob((current) => current?.id === data.job.id ? data.job : current);
      }
    } catch (err: any) {
      if (!silent) setError(err.message);
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
          minio: form.minio,
          selectedBuckets: splitList(form.selectedBuckets),
        }),
      });
      setActiveJob(data.job);
      setMessage('Job salvo com credenciais S3 criptografadas.');
      setResult(data);
      await refreshJobs();
      await loadJobDetails(data.job.id, true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }

  async function runAction(action: 'test-connections' | 'diagnose' | 'analyze-media-organization' | 'dry-run' | 'migrate-storage' | 'validate' | 'report') {
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
        body: action === 'migrate-storage'
          ? JSON.stringify({ confirmation: form.confirmation.trim() })
          : undefined,
      });
      setResult(data.report || data.diagnostic || data.analysis || data);
      setMessage(actionMessage(action, data));
      await refreshJobs();
      await loadJobDetails(activeJob.id, true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }

  function updateSection(section: 'source' | 'minio', key: string, value: any) {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
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
                Migração de Mídias para MinIO
              </h1>
              <p className="text-sm text-slate-500">
                Copie buckets do Supabase Storage via S3 para MinIO sem mover o banco de dados.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <Shield size={16} />
            Banco permanece no Supabase atual
          </div>
          <p className="mt-1 text-xs">
            A migração copia arquivos. Nada é apagado da origem e URLs no banco não são alteradas automaticamente.
          </p>
        </div>
      </div>

      <section className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-7">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              index < 5 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <div className="text-[10px] opacity-70">{index + 1}</div>
            {step}
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <SourceS3Panel values={form.source} onChange={updateSection} />
          <MinioPanel values={form.minio} onChange={updateSection} />

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Buckets de mídia
              </span>
              <input
                value={form.selectedBuckets}
                onChange={(event) => setForm((current) => ({ ...current, selectedBuckets: event.target.value }))}
                className={fieldClass}
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">
              Use vírgula para separar. A organização do destino é definida no bloco MinIO.
            </p>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <LockKeyhole size={17} className="text-red-600" />
              Controle
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Salve as credenciais S3. As chaves voltam mascaradas e ficam criptografadas no banco.
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
              {activeJob?.id && <div className="mt-1 truncate font-mono">{activeJob.id}</div>}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="text-sm font-bold text-slate-900">Ações</div>
            <div className="mt-3 space-y-2">
              <ActionButton disabled={!canRunActions || loading} active={activeAction === 'test-connections'} icon={<ClipboardCheck size={16} />} label="Testar conexões" onClick={() => runAction('test-connections')} />
              <ActionButton disabled={!canRunActions || loading} active={activeAction === 'diagnose'} icon={<Image size={16} />} label="Diagnosticar buckets" onClick={() => runAction('diagnose')} />
              <ActionButton disabled={!canRunActions || loading} active={activeAction === 'analyze-media-organization'} icon={<HardDrive size={16} />} label="Analisar banco e pastas" onClick={() => runAction('analyze-media-organization')} />
              <ActionButton disabled={!canRunActions || loading} active={activeAction === 'dry-run'} icon={<FileJson size={16} />} label="Simular migração" onClick={() => runAction('dry-run')} />
              <ActionButton disabled={!canRunActions || loading} active={activeAction === 'validate'} icon={<Shield size={16} />} label="Validar integridade" onClick={() => runAction('validate')} />
              <ActionButton disabled={!canRunActions || loading} active={activeAction === 'report'} icon={<Download size={16} />} label="Relatório JSON" onClick={() => runAction('report')} />
            </div>

            <div className="mt-4 space-y-2">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Confirmação
                </span>
                <input
                  value={form.confirmation}
                  onChange={(event) => setForm((current) => ({ ...current, confirmation: event.target.value }))}
                  placeholder="MIGRAR MIDIAS"
                  className={fieldClass}
                />
              </label>
              <button
                onClick={() => runAction('migrate-storage')}
                disabled={!canMigrate || loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {activeAction === 'migrate-storage' ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                Iniciar migração de mídias
              </button>
              {!canMigrate && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  {migrateBlockedReason}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="text-sm font-bold text-slate-900">Jobs recentes</div>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {jobs.length === 0 && <p className="text-xs text-slate-500">Nenhum job criado ainda.</p>}
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{job.status}</span>
                    <span>{job.progress || 0}%</span>
                  </div>
                  <div className="mt-1 truncate font-mono">{job.id}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {(message || error) && (
        <div className={`rounded-lg border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          <div className="flex items-center gap-2 font-semibold">
            {error ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            {error || message}
          </div>
        </div>
      )}

      {activeJob && (
        <MigrationProgressPanel
          job={activeJob}
          details={jobDetails}
          lastSync={lastProgressSync}
          onRefresh={() => loadJobDetails(activeJob.id)}
        />
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

const MigrationProgressPanel: React.FC<{
  job: Job;
  details: JobDetails | null;
  lastSync: string | null;
  onRefresh: () => void;
}> = ({ job, details, lastSync, onRefresh }) => {
  const storageStep = details?.steps?.find((step) => step.step === 'storage_migration');
  const validationStep = details?.steps?.find((step) => step.step === 'validation');
  const activeStep = validationStep || storageStep || [...(details?.steps || [])].reverse().find((step) => step.status === 'running') || details?.steps?.[details.steps.length - 1];
  const progress = Math.max(0, Math.min(100, Number(job.progress || activeStep?.progress || 0)));
  const metadata = activeStep?.metadata || {};
  const totalFiles = Number(metadata.totalFiles || 0);
  const processed = Number(metadata.processed || 0);
  const copied = Number(metadata.copied || 0);
  const skipped = Number(metadata.skipped || 0);
  const failed = Number(metadata.failed || 0);
  const bytesCopied = Number(metadata.bytesCopied || 0);
  
  const matched = Number(metadata.matched || 0);
  const missing = Number(metadata.missing || 0);
  const sizeMismatch = Number(metadata.sizeMismatch || 0);

  const recentLogs = (details?.logs || []).slice(0, 8);
  const recentErrors = (details?.errors || []).slice(0, 5);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            {job.status === 'running' ? <RefreshCw size={16} className="animate-spin text-red-600" /> : <CheckCircle2 size={16} className="text-emerald-600" />}
            Progresso da migração
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Job {job.id} {lastSync ? `- atualizado às ${lastSync}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={14} />
          Atualizar agora
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>{activeStep ? stepLabel(activeStep.step) : `Status: ${job.status}`}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${job.status === 'failed' ? 'bg-red-500' : 'bg-red-600'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <ProgressStat label="Processados" value={totalFiles ? `${processed}/${totalFiles}` : '-'} />
        {activeStep?.step === 'validation' ? (
          <>
            <ProgressStat label="Validados (OK)" value={String(matched || 0)} />
            <ProgressStat label="Ausentes" value={String(missing || 0)} tone={missing ? 'danger' : 'neutral'} />
            <ProgressStat label="Div. Tamanho" value={String(sizeMismatch || 0)} tone={sizeMismatch ? 'danger' : 'neutral'} />
          </>
        ) : (
          <>
            <ProgressStat label="Copiados" value={String(copied || 0)} />
            <ProgressStat label="Ignorados" value={String(skipped || 0)} />
            <ProgressStat label="Falhas" value={String(failed || 0)} tone={failed ? 'danger' : 'neutral'} />
            <ProgressStat label="Dados copiados" value={formatBytes(bytesCopied)} />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Logs recentes</div>
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
            {recentLogs.length === 0 && <p className="text-xs text-slate-500">Ainda sem logs para este job.</p>}
            {recentLogs.map((log) => (
              <div key={log.id} className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-bold ${log.level === 'error' ? 'text-red-700' : log.level === 'warn' ? 'text-amber-700' : 'text-slate-800'}`}>
                    {log.level} / {stepLabel(log.step || '')}
                  </span>
                  <span className="shrink-0 text-slate-400">{formatTime(log.created_at)}</span>
                </div>
                <div className="mt-1">{log.message}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Erros recentes</div>
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
            {recentErrors.length === 0 && <p className="text-xs text-slate-500">Nenhum erro registrado até agora.</p>}
            {recentErrors.map((item) => (
              <div key={item.id} className="rounded-lg bg-white px-3 py-2 text-xs text-red-800 ring-1 ring-red-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{stepLabel(item.step || '')}</span>
                  <span className="shrink-0 text-red-300">{formatTime(item.created_at)}</span>
                </div>
                {item.entity_name && <div className="mt-1 truncate font-mono text-[11px]">{item.entity_name}</div>}
                <div className="mt-1">{item.error_message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ProgressStat: React.FC<{
  label: string;
  value: string;
  tone?: 'neutral' | 'danger';
}> = ({ label, value, tone = 'neutral' }) => (
  <div className={`rounded-lg border px-3 py-3 ${tone === 'danger' ? 'border-red-100 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
    <div className={`mt-1 text-sm font-bold ${tone === 'danger' ? 'text-red-700' : 'text-slate-900'}`}>{value}</div>
  </div>
);

const SourceS3Panel: React.FC<{
  values: Record<string, any>;
  onChange: (section: 'source', key: string, value: any) => void;
}> = ({ values, onChange }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5">
    <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
      <Image size={18} />
      Origem Supabase Storage via S3
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Field
        label="Endpoint S3 Supabase"
        placeholder="https://projeto.storage.supabase.co/storage/v1/s3"
        value={values.endpoint}
        onChange={(value) => onChange('source', 'endpoint', value)}
      />
      <Field label="Região" value={values.region} onChange={(value) => onChange('source', 'region', value)} />
      <Field label="Access key" secret value={values.accessKey} onChange={(value) => onChange('source', 'accessKey', value)} />
      <Field label="Secret key" secret value={values.secretKey} onChange={(value) => onChange('source', 'secretKey', value)} />
      <Field label="Public base URL origem" value={values.publicBaseUrl} onChange={(value) => onChange('source', 'publicBaseUrl', value)} />
      <Field label="Supabase URL origem" value={values.supabaseUrl} onChange={(value) => onChange('source', 'supabaseUrl', value)} />
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
      Destino MinIO via S3
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="MinIO endpoint" placeholder="https://files.fluowai.com.br" value={values.endpoint} onChange={(value) => onChange('minio', 'endpoint', value)} />
      <Field label="MinIO port" value={values.port} onChange={(value) => onChange('minio', 'port', Number(value))} />
      <Field label="Região" value={values.region} onChange={(value) => onChange('minio', 'region', value)} />
      <Field label="Access key" secret value={values.accessKey} onChange={(value) => onChange('minio', 'accessKey', value)} />
      <Field label="Secret key" secret value={values.secretKey} onChange={(value) => onChange('minio', 'secretKey', value)} />
      <Field label="Bucket único MinIO" value={values.bucket} onChange={(value) => onChange('minio', 'bucket', value)} />
      <SelectField
        label="Organização no MinIO"
        value={values.layoutMode}
        onChange={(value) => onChange('minio', 'layoutMode', value)}
        options={[
          ['preserve_buckets', 'Manter buckets separados'],
          ['single_bucket', 'Bucket único com pastas'],
        ]}
      />
      <SelectField
        label="Pastas no bucket único"
        value={values.prefixStrategy}
        onChange={(value) => onChange('minio', 'prefixStrategy', value)}
        options={[
          ['bucket', 'Pasta por bucket'],
          ['bucket_and_type', 'Bucket e tipo de mídia'],
          ['type', 'Tipo de mídia e bucket'],
          ['none', 'Sem prefixo'],
        ]}
      />
      <Field label="Public base URL destino" value={values.publicBaseUrl} onChange={(value) => onChange('minio', 'publicBaseUrl', value)} />
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
  placeholder?: string;
  onChange: (value: string) => void;
}> = ({ label, value, secret, placeholder, onChange }) => (
  <label className="space-y-2">
    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
    </span>
    <input
      type={secret ? 'password' : 'text'}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={fieldClass}
      autoComplete="off"
    />
  </label>
);

const SelectField: React.FC<{
  label: string;
  value: any;
  options: [string, string][];
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <label className="space-y-2">
    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
    </span>
    <select
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      className={fieldClass}
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
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

function stepLabel(step: string) {
  const labels: Record<string, string> = {
    connections: 'Conexões',
    diagnostic: 'Diagnóstico',
    media_organization: 'Análise',
    dry_run: 'Simulação',
    storage_migration: 'Migração Storage',
    validation: 'Validação',
  };
  return labels[step] || step || 'Job';
}

function formatTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatBytes(value: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let next = value;
  let unitIndex = 0;
  while (next >= 1024 && unitIndex < units.length - 1) {
    next /= 1024;
    unitIndex++;
  }
  return `${next.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function actionMessage(action: string, data: any) {
  if (action === 'test-connections') {
    return data.ok ? 'Conexões S3 verificadas.' : 'Há conexões com falha. Veja o resultado técnico.';
  }
  if (action === 'diagnose') return 'Diagnóstico de buckets concluído.';
  if (action === 'analyze-media-organization') return 'Analise de banco e pastas concluida.';
  if (action === 'dry-run') {
    return data.report?.ready ? 'Pronto para migrar mídias.' : 'Correções necessárias antes da migração.';
  }
  if (action === 'migrate-storage') return data.message || 'Migração de mídias iniciada.';
  if (action === 'validate') return data.message || 'Validação iniciada.';
  return 'Relatório carregado.';
}

function getMigrateBlockedReason(job: Job | null, confirmation: string) {
  if (!job) return 'Salve as credenciais para criar um job.';
  if (!job.dry_run_approved) return 'Execute a simulação e aguarde o status Dry-run aprovado.';
  if (confirmation.trim() !== 'MIGRAR MIDIAS') return 'Digite MIGRAR MIDIAS para liberar a migração.';
  return 'Migração liberada.';
}

export default FluowaiMigration;
