import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clipboard,
  Database,
  Download,
  Eye,
  FileSearch,
  Filter,
  HardDrive,
  Layers,
  Link as LinkIcon,
  Play,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { callApi } from '../../src/lib/api';

type Summary = Record<string, any>;
type Bucket = Record<string, any>;
type StorageObject = Record<string, any>;
type DuplicateReport = {
  total_groups: number;
  duplicate_files: number;
  wasted_bytes: number;
  groups: any[];
};
type OrphanReport = {
  minio_without_database: StorageObject[];
  database_without_minio: StorageObject[];
  counts: Record<string, number>;
};

const tabs = [
  'Resumo',
  'Buckets',
  'Arquivos',
  'Duplicados',
  'Órfãos',
  'Clientes',
  'Retenção',
  'Ações Críticas',
  'Logs',
];

const retentionRules = [
  ['Áudios WhatsApp', '15 dias'],
  ['Vídeos WhatsApp', '15 dias'],
  ['Imagens WhatsApp', '30 dias'],
  ['Documentos', '45 dias'],
  ['Avatares', '30 dias'],
  ['Temporários', '3 dias'],
  ['Logs', '7 dias'],
];

const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100';

const StorageIntelligence: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Resumo');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [files, setFiles] = useState<StorageObject[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateReport | null>(null);
  const [orphans, setOrphans] = useState<OrphanReport | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [lifecycle, setLifecycle] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [simulation, setSimulation] = useState<any>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshAll();
  }, []);

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      const [
        summaryData,
        bucketData,
        fileData,
        duplicateData,
        orphanData,
        tenantData,
        lifecycleData,
        logData,
      ] = await Promise.all([
        callApi('/api/admin/storage/summary'),
        callApi('/api/admin/storage/buckets'),
        callApi('/api/admin/storage/files?limit=100'),
        callApi('/api/admin/storage/duplicates'),
        callApi('/api/admin/storage/orphans'),
        callApi('/api/admin/storage/by-tenant'),
        callApi('/api/admin/storage/lifecycle'),
        callApi('/api/admin/storage/logs'),
      ]);
      setSummary(summaryData.summary);
      setBuckets(bucketData.buckets || []);
      setFiles(fileData.files || []);
      setDuplicates(duplicateData.duplicates);
      setOrphans(orphanData.orphans);
      setTenants(tenantData.tenants || []);
      setLifecycle(lifecycleData.lifecycle);
      setLogs(logData.logs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadFilesWithFilters() {
    setActiveAction('filters');
    setError(null);
    try {
      const query = new URLSearchParams(
        Object.entries(filters)
          .filter(([, value]) => value)
          .map(([key, value]) => [key, String(value)])
      ).toString();
      const data = await callApi(`/api/admin/storage/files?limit=150&${query}`);
      setFiles(data.files || []);
      setMessage(`${data.total || 0} arquivo(s) encontrados.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActiveAction(null);
    }
  }

  async function runAdminAction(action: string, path: string, body: Record<string, any> = {}) {
    setActiveAction(action);
    setError(null);
    setMessage(null);
    try {
      const data = await callApi(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setMessage(actionMessage(action, data));
      if (data.simulation) setSimulation(data.simulation);
      await refreshAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActiveAction(null);
    }
  }

  async function openSignedUrl(item: StorageObject) {
    setActiveAction(`signed-${item.object_key}`);
    setError(null);
    try {
      const data = await callApi('/api/admin/storage/signed-url', {
        method: 'POST',
        body: JSON.stringify({
          bucket: item.bucket,
          object_key: item.object_key,
          expiresInSeconds: 300,
        }),
      });
      window.open(data.signed.url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActiveAction(null);
    }
  }

  const cards = useMemo(() => [
    ['Uso total do MinIO', formatBytes(summary?.total_usage_bytes), HardDrive],
    ['Quantidade total de objetos', formatNumber(summary?.total_objects), Database],
    ['Quantidade de buckets', formatNumber(summary?.total_buckets), Layers],
    ['Bucket mais pesado', summary?.heaviest_bucket?.key || '- ', BarChart3],
    ['Cliente que mais consome', summary?.top_tenant?.key || '- ', Users],
    ['Tipo de arquivo que mais consome', summary?.top_file_type?.key || '- ', FileSearch],
    ['Arquivos duplicados estimados', formatNumber(summary?.duplicate_files_estimated), Clipboard],
    ['Arquivos órfãos estimados', formatNumber(summary?.orphan_files_estimated), AlertTriangle],
    ['Storage economizável', formatBytes(summary?.reclaimable_bytes_estimated), Trash2],
    ['Status do versionamento', summary?.versioning_status || '- ', ShieldAlert],
    ['Status do lifecycle', summary?.lifecycle_status || '- ', CheckCircle2],
  ], [summary]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-red-50 p-2 text-red-600 ring-1 ring-red-100">
              <HardDrive size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Storage Intelligence</h1>
              <p className="text-sm text-slate-500">Auditoria MinIO, duplicidades, órfãos e retenção.</p>
            </div>
          </div>
        </div>
        <button
          onClick={refreshAll}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {(error || message) && (
        <div className={`rounded-lg border p-4 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          <div className="flex items-center gap-2">
            {error ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            {error || message}
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition ${
              activeTab === tab
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Resumo' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value, Icon]: any) => (
              <MetricCard key={label} label={label} value={value} icon={<Icon size={18} />} />
            ))}
          </div>
          <div className="grid gap-3">
            {(summary?.alerts || []).map((alert: any, index: number) => (
              <div key={index} className={`rounded-lg border p-4 text-sm font-bold ${alert.severity === 'critical' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {alert.message}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'Buckets' && (
        <Table
          columns={['Bucket', 'Objetos', 'Tamanho', 'Versioning', 'Lifecycle', 'Policy', 'Ações']}
          rows={buckets.map((bucket) => [
            bucket.name,
            formatNumber(bucket.objects),
            formatBytes(bucket.size_bytes),
            bucket.versioning,
            bucket.lifecycle,
            bucket.policy,
            <div className="flex flex-wrap gap-2" key={bucket.name}>
              <SmallButton icon={<Eye size={14} />} label="Detalhes" onClick={() => setActiveTab('Arquivos')} />
              <SmallButton icon={<RefreshCw size={14} />} label="Inventário" onClick={() => runAdminAction('scan', '/api/admin/storage/scan')} active={activeAction === 'scan'} />
              <SmallButton icon={<ShieldAlert size={14} />} label="Suspender" onClick={() => setActiveTab('Ações Críticas')} />
              <SmallButton icon={<CheckCircle2 size={14} />} label="Lifecycle" onClick={() => runAdminAction('lifecycle', '/api/admin/storage/apply-lifecycle', { bucket: bucket.name })} active={activeAction === 'lifecycle'} />
            </div>,
          ])}
        />
      )}

      {activeTab === 'Arquivos' && (
        <section className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
            {[
              ['bucket', 'Bucket'],
              ['tenant', 'Cliente'],
              ['type', 'Tipo'],
              ['extension', 'Extensão'],
              ['origin', 'Origem'],
              ['startDate', 'Data inicial'],
              ['endDate', 'Data final'],
              ['minMb', 'Maior que X MB'],
              ['prefix', 'Prefixo'],
            ].map(([key, label]) => (
              <label key={key} className="space-y-1">
                <span className="text-xs font-bold uppercase text-slate-500">{label}</span>
                <input
                  value={filters[key] || ''}
                  onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}
                  className={fieldClass}
                />
              </label>
            ))}
            <button
              onClick={loadFilesWithFilters}
              disabled={activeAction === 'filters'}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:bg-slate-300 md:mt-6"
            >
              <Filter size={16} />
              Filtrar
            </button>
          </div>
          <FileTable files={files} onSignedUrl={openSignedUrl} activeAction={activeAction} />
        </section>
      )}

      {activeTab === 'Duplicados' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Total de grupos duplicados" value={formatNumber(duplicates?.total_groups)} icon={<Layers size={18} />} />
            <MetricCard label="Arquivos duplicados" value={formatNumber(duplicates?.duplicate_files)} icon={<FileSearch size={18} />} />
            <MetricCard label="Espaço desperdiçado estimado" value={formatBytes(duplicates?.wasted_bytes)} icon={<HardDrive size={18} />} />
          </div>
          <Table
            columns={['Estratégia', 'Chave', 'Arquivos', 'Desperdício', 'Manter', 'Ações']}
            rows={(duplicates?.groups || []).map((group) => [
              group.strategy,
              <CodeText key="key" value={group.key} />,
              group.count,
              formatBytes(group.wasted_bytes),
              <CodeText key="keep" value={group.keep?.object_key} />,
              <div className="flex flex-wrap gap-2" key={group.key}>
                <SmallButton icon={<Download size={14} />} label="Relatório" onClick={() => downloadJson('duplicados.json', duplicates)} />
                <SmallButton icon={<Clipboard size={14} />} label="Marcar" onClick={() => setMessage('Duplicados marcados para revisão.')} />
              </div>,
            ])}
          />
          <ProtectedAction
            title="Limpar duplicados confirmados"
            confirmation="CONFIRMAR LIMPEZA DE DUPLICADOS"
            value={confirmations.duplicates || ''}
            onChange={(value) => setConfirmations((current) => ({ ...current, duplicates: value }))}
            onRun={() => runAdminAction('delete-duplicates', '/api/admin/storage/delete-duplicates', { confirmation: confirmations.duplicates })}
            active={activeAction === 'delete-duplicates'}
          />
        </section>
      )}

      {activeTab === 'Órfãos' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard label="No MinIO, ausente no banco" value={formatNumber(orphans?.counts?.minio_without_database)} icon={<HardDrive size={18} />} />
            <MetricCard label="No banco, ausente no MinIO" value={formatNumber(orphans?.counts?.database_without_minio)} icon={<Database size={18} />} />
          </div>
          <Table
            columns={['Classificação', 'Bucket', 'Object key', 'Tamanho']}
            rows={(orphans?.minio_without_database || []).slice(0, 80).map((item) => [
              item.classification,
              item.bucket,
              <CodeText key={item.object_key} value={item.object_key} />,
              formatBytes(item.size_bytes),
            ])}
          />
          <div className="flex flex-wrap gap-2">
            <SmallButton icon={<Download size={14} />} label="Exportar relatório" onClick={() => downloadJson('orfaos.json', orphans)} />
            <SmallButton icon={<Clipboard size={14} />} label="Marcar como órfão" onClick={() => setMessage('Órfãos marcados para revisão.')} />
          </div>
          <ProtectedAction
            title="Excluir órfãos confirmados"
            confirmation="CONFIRMAR LIMPEZA DE ORFAOS"
            value={confirmations.orphans || ''}
            onChange={(value) => setConfirmations((current) => ({ ...current, orphans: value }))}
            onRun={() => runAdminAction('delete-orphans', '/api/admin/storage/delete-orphans', { confirmation: confirmations.orphans })}
            active={activeAction === 'delete-orphans'}
          />
        </section>
      )}

      {activeTab === 'Clientes' && (
        <Table
          columns={['Cliente', 'Objetos', 'Tamanho', 'Imagens', 'Áudios', 'Vídeos', 'PDFs', 'Avatares', 'Cresc. diário', 'Cresc. semanal', 'Proj. mensal', '10/100/1000 clientes']}
          rows={tenants.map((tenant) => [
            tenant.tenant_name || tenant.tenant_id,
            formatNumber(tenant.count),
            formatBytes(tenant.bytes),
            tenant.images,
            tenant.audios,
            tenant.videos,
            tenant.pdfs,
            tenant.avatars,
            formatBytes(tenant.daily_growth_bytes),
            formatBytes(tenant.weekly_growth_bytes),
            formatBytes(tenant.monthly_projection_bytes),
            `${formatBytes(tenant.monthly_projection_bytes * 10)} / ${formatBytes(tenant.monthly_projection_bytes * 100)} / ${formatBytes(tenant.monthly_projection_bytes * 1000)}`,
          ])}
        />
      )}

      {activeTab === 'Retenção' && (
        <section className="space-y-4">
          <Table columns={['Tipo', 'Retenção']} rows={retentionRules} />
          <div className="flex flex-wrap gap-2">
            <SmallButton icon={<CheckCircle2 size={14} />} label="Salvar política" onClick={() => setMessage('Política de retenção salva localmente para simulação.')} />
            <SmallButton icon={<LinkIcon size={14} />} label="Aplicar lifecycle no MinIO" onClick={() => runAdminAction('lifecycle', '/api/admin/storage/apply-lifecycle')} active={activeAction === 'lifecycle'} />
            <SmallButton icon={<Play size={14} />} label="Simular limpeza" onClick={() => runAdminAction('simulate', '/api/admin/storage/simulate-cleanup')} active={activeAction === 'simulate'} />
            <SmallButton icon={<Trash2 size={14} />} label="Executar limpeza agora" onClick={() => setActiveTab('Ações Críticas')} />
          </div>
          {simulation && (
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard label="Arquivos que seriam apagados" value={formatNumber(simulation.total_files)} icon={<FileSearch size={18} />} />
              <MetricCard label="Espaço liberado" value={formatBytes(simulation.reclaimable_bytes)} icon={<HardDrive size={18} />} />
              <MetricCard label="Clientes afetados" value={formatNumber(simulation.affected_tenants?.length)} icon={<Users size={18} />} />
              <MetricCard label="Tipos afetados" value={formatNumber(simulation.affected_types?.length)} icon={<Layers size={18} />} />
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-bold text-slate-900">Lifecycle atual</div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(lifecycle, null, 2)}
            </pre>
          </div>
        </section>
      )}

      {activeTab === 'Ações Críticas' && (
        <section className="grid gap-4 lg:grid-cols-3">
          <CriticalPanel
            title="Suspender versionamento"
            body="O versionamento mantém versões antigas dos arquivos e pode aumentar muito o consumo."
            confirmation="SUSPENDER VERSIONAMENTO"
            value={confirmations.versioning || ''}
            onChange={(value) => setConfirmations((current) => ({ ...current, versioning: value }))}
            onRun={() => runAdminAction('suspend-versioning', '/api/admin/storage/suspend-versioning', { confirmation: confirmations.versioning })}
            active={activeAction === 'suspend-versioning'}
          />
          <CriticalPanel
            title="Aplicar política de expurgo"
            body="Regras mínimas: versões antigas após 1 dia, delete markers, temporários após 3 dias e mídias expiradas."
            confirmation="APLICAR LIFECYCLE"
            value={confirmations.lifecycle || ''}
            onChange={(value) => setConfirmations((current) => ({ ...current, lifecycle: value }))}
            onRun={() => runAdminAction('lifecycle', '/api/admin/storage/apply-lifecycle')}
            active={activeAction === 'lifecycle'}
          />
          <CriticalPanel
            title="Scan completo"
            body="Lista buckets e objetos, calcula tamanhos, agrupa por extensão, prefixo e cliente, detecta duplicados e órfãos, e salva snapshot."
            confirmation="EXECUTAR AUDITORIA"
            value={confirmations.scan || ''}
            onChange={(value) => setConfirmations((current) => ({ ...current, scan: value }))}
            onRun={() => runAdminAction('scan', '/api/admin/storage/scan')}
            active={activeAction === 'scan'}
          />
          <ProtectedAction
            title="Limpar expirados confirmados"
            confirmation="CONFIRMAR LIMPEZA DE EXPIRADOS"
            value={confirmations.expired || ''}
            onChange={(value) => setConfirmations((current) => ({ ...current, expired: value }))}
            onRun={() => runAdminAction('delete-expired', '/api/admin/storage/delete-expired', { confirmation: confirmations.expired })}
            active={activeAction === 'delete-expired'}
          />
        </section>
      )}

      {activeTab === 'Logs' && (
        <Table
          columns={['Data', 'Admin', 'Ação', 'Bucket', 'Detalhes']}
          rows={logs.map((log) => [
            formatDate(log.created_at),
            log.admin_id || '-',
            log.action,
            log.bucket || '-',
            <CodeText key={log.id} value={JSON.stringify(log.details || {})} />,
          ])}
        />
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="rounded-lg bg-slate-100 p-2 text-slate-700">{icon}</span>
    </div>
    <div className="text-xl font-black text-slate-950">{value}</div>
    <div className="mt-1 text-xs font-bold uppercase text-slate-500">{label}</div>
  </div>
);

const Table: React.FC<{ columns: string[]; rows: React.ReactNode[][] }> = ({ columns, rows }) => (
  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
          <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {rows.length === 0 ? (
            <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={columns.length}>Sem dados para exibir.</td></tr>
          ) : rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-slate-50">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-sm px-4 py-3 align-top">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const FileTable: React.FC<{
  files: StorageObject[];
  activeAction: string | null;
  onSignedUrl: (item: StorageObject) => void;
}> = ({ files, activeAction, onSignedUrl }) => (
  <Table
    columns={['Bucket', 'Object key', 'Tamanho', 'Extensão', 'MIME', 'Cliente/Tenant', 'Origem', 'Data criação', 'ETag', 'SHA256', 'Status', 'Botões']}
    rows={files.map((file) => [
      file.bucket,
      <CodeText key={file.object_key} value={file.object_key} />,
      formatBytes(file.size_bytes),
      extensionFromKey(file.object_key),
      file.mime_type || '-',
      file.tenant_id || '-',
      file.source || '-',
      formatDate(file.created_at),
      <CodeText key="etag" value={file.etag || '-'} />,
      <CodeText key="sha" value={file.sha256 || '-'} />,
      file.deleted_at ? 'deleted' : 'active',
      <div className="flex flex-wrap gap-2" key="actions">
        <SmallButton icon={<Eye size={14} />} label="URL" onClick={() => onSignedUrl(file)} active={activeAction === `signed-${file.object_key}`} />
        <SmallButton icon={<Clipboard size={14} />} label="Copiar" onClick={() => copyText(file.object_key)} />
        <SmallButton icon={<Trash2 size={14} />} label="Marcar" onClick={() => undefined} />
        <SmallButton icon={<Database size={14} />} label="Vínculo" onClick={() => copyText(JSON.stringify(file, null, 2))} />
      </div>,
    ])}
  />
);

const SmallButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
  >
    {active ? <RefreshCw size={14} className="animate-spin" /> : icon}
    {label}
  </button>
);

const CodeText: React.FC<{ value?: string }> = ({ value }) => (
  <span className="block max-w-xs truncate rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700" title={value}>
    {value || '-'}
  </span>
);

const ProtectedAction: React.FC<{
  title: string;
  confirmation: string;
  value: string;
  active?: boolean;
  onChange: (value: string) => void;
  onRun: () => void;
}> = ({ title, confirmation, value, active, onChange, onRun }) => (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
    <div className="text-sm font-black text-red-900">{title}</div>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={confirmation}
      className="mt-3 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-900 outline-none focus:ring-2 focus:ring-red-100"
    />
    <button
      onClick={onRun}
      disabled={value.trim() !== confirmation || active}
      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:bg-slate-300"
    >
      {active ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
      Executar
    </button>
  </div>
);

const CriticalPanel: React.FC<{
  title: string;
  body: string;
  confirmation: string;
  value: string;
  active?: boolean;
  onChange: (value: string) => void;
  onRun: () => void;
}> = ({ title, body, confirmation, value, active, onChange, onRun }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5">
    <div className="flex items-center gap-2 text-sm font-black text-slate-950">
      <ShieldAlert size={17} className="text-red-600" />
      {title}
    </div>
    <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={confirmation}
      className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
    />
    <button
      onClick={onRun}
      disabled={value.trim() !== confirmation || active}
      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
    >
      {active ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
      Executar
    </button>
  </div>
);

function formatBytes(value?: number) {
  const amount = Number(value || 0);
  if (!amount) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let next = amount;
  let unitIndex = 0;
  while (next >= 1024 && unitIndex < units.length - 1) {
    next /= 1024;
    unitIndex += 1;
  }
  return `${next.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatNumber(value?: number) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function extensionFromKey(key?: string) {
  const match = String(key || '').match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '-';
}

function actionMessage(action: string, data: any) {
  if (action === 'scan') return `Auditoria concluída: ${formatNumber(data.scan?.objects)} objeto(s).`;
  if (action === 'simulate') return `Simulação concluída: ${formatNumber(data.simulation?.total_files)} arquivo(s).`;
  if (action === 'lifecycle') return 'Lifecycle aplicado no MinIO.';
  if (action === 'suspend-versioning') return 'Versionamento suspenso no bucket.';
  if (action.startsWith('delete')) return `Exclusão concluída: ${formatNumber(data.deleted?.length)} objeto(s).`;
  return 'Ação executada.';
}

function downloadJson(fileName: string, payload: any) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function copyText(value: string) {
  navigator.clipboard?.writeText(value);
}

export default StorageIntelligence;
