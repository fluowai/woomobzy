import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Copy, Globe, RefreshCw, Settings, Upload, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

type Portal = {
  id: string;
  key: string;
  name: string;
  badge: string;
  connected: boolean;
  lastSync: string;
  properties: number;
  errors: number;
  feedUrl: string;
};

const DEFAULT_PORTALS: Portal[] = [
  { id: 'zap', key: 'zap', name: 'ZAP Imoveis', badge: 'ZAP', connected: false, lastSync: '-', properties: 0, errors: 0, feedUrl: '' },
  { id: 'vivareal', key: 'vivareal', name: 'Viva Real', badge: 'VR', connected: false, lastSync: '-', properties: 0, errors: 0, feedUrl: '' },
  { id: 'olx', key: 'olx', name: 'OLX', badge: 'OLX', connected: false, lastSync: '-', properties: 0, errors: 0, feedUrl: '' },
  { id: 'imovelweb', key: 'imovelweb', name: 'Imovelweb', badge: 'IW', connected: false, lastSync: '-', properties: 0, errors: 0, feedUrl: '' },
  { id: 'chaves-na-mao', key: 'chaves-na-mao', name: 'Chaves na Mao', badge: 'CM', connected: false, lastSync: '-', properties: 0, errors: 0, feedUrl: '' },
];

const ExportadorPortais: React.FC = () => {
  const { profile } = useAuth();
  const [portals, setPortals] = useState<Portal[]>(DEFAULT_PORTALS);
  const [showConfig, setShowConfig] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    if (!profile?.organization_id) return;

    const [{ data: integrations }, { data: syncLogs }] = await Promise.all([
      supabase
        .from('urban_portal_integrations')
        .select('*')
        .eq('organization_id', profile.organization_id),
      supabase
        .from('urban_portal_sync_logs')
        .select('id,status,message,created_at,integration:integration_id(portal_name)')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const byKey = new Map((integrations || []).map((item: any) => [item.portal_key, item]));
    setPortals(
      DEFAULT_PORTALS.map((portal) => {
        const saved: any = byKey.get(portal.key);
        return saved
          ? {
              ...portal,
              id: saved.id,
              connected: !!saved.enabled,
              lastSync: saved.last_sync_at ? new Date(saved.last_sync_at).toLocaleString('pt-BR') : '-',
              properties: saved.exported_count || 0,
              errors: saved.error_count || 0,
              feedUrl: saved.feed_url || '',
            }
          : portal;
      })
    );
    setLogs(syncLogs || []);
  };

  useEffect(() => {
    load();
  }, [profile?.organization_id]);

  const toggleConnection = async (portal: Portal) => {
    if (!profile?.organization_id) return;

    const enabled = !portal.connected;
    const feedUrl = enabled ? `${window.location.origin}/api/portals/${portal.key}/feed.xml` : '';
    await supabase
      .from('urban_portal_integrations')
      .upsert(
        {
          organization_id: profile.organization_id,
          portal_key: portal.key,
          portal_name: portal.name,
          enabled,
          configured: enabled,
          feed_url: feedUrl,
          last_sync_at: enabled ? new Date().toISOString() : null,
        },
        { onConflict: 'organization_id,portal_key' }
      );
    await load();
  };

  const registerSync = async (portal: Portal) => {
    if (!profile?.organization_id || !portal.connected) return;
    const { data: integration } = await supabase
      .from('urban_portal_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', portal.id)
      .select()
      .single();

    await supabase.from('urban_portal_sync_logs').insert({
      organization_id: profile.organization_id,
      integration_id: integration?.id || portal.id,
      status: 'success',
      message: `${portal.name} sincronizado manualmente.`,
    });
    await load();
  };

  const connected = portals.filter((portal) => portal.connected);
  const totalExported = connected.reduce((sum, portal) => sum + portal.properties, 0);
  const successRate = connected.length > 0 ? `${Math.round(((connected.length - connected.reduce((sum, p) => sum + p.errors, 0)) / connected.length) * 100)}%` : '-';

  const stats = useMemo(
    () => [
      { icon: Globe, label: 'Portais conectados', value: String(connected.length), color: 'text-blue-600', bg: 'bg-blue-50' },
      { icon: Upload, label: 'Imoveis exportados', value: String(totalExported), color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { icon: RefreshCw, label: 'Ultima sincronizacao', value: connected[0]?.lastSync || '-', color: 'text-amber-600', bg: 'bg-amber-50' },
      { icon: CheckCircle, label: 'Taxa de sucesso', value: successRate, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ],
    [connected.length, totalExported, successRate]
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-black uppercase italic tracking-tighter text-black">
          <Upload className="text-blue-600" size={32} />
          Exportador para Portais
        </h1>
        <p className="font-medium text-black/60">Feed XML automatico para portais imobiliarios urbanos.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className={`mb-4 w-fit rounded-2xl p-3 ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <h3 className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</h3>
            <p className="text-2xl font-black italic tracking-tighter text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {portals.map((portal) => (
          <div key={portal.key} className={`rounded-2xl border-2 bg-white transition-all ${portal.connected ? 'border-blue-200 shadow-lg' : 'border-slate-100'}`}>
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">{portal.badge}</span>
                  <div>
                    <h3 className="font-bold text-black">{portal.name}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${portal.connected ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {portal.connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleConnection(portal)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                    portal.connected ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-600 text-white shadow-lg hover:bg-blue-500'
                  }`}
                >
                  {portal.connected ? 'Desconectar' : 'Conectar'}
                </button>
              </div>

              {portal.connected && (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Ultima sync:</span>
                    <span className="font-medium text-black">{portal.lastSync}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Feed XML:</span>
                    <div className="flex items-center gap-1">
                      <code className="max-w-[150px] truncate rounded bg-slate-50 px-2 py-1 text-xs text-blue-600">{portal.feedUrl}</code>
                      <button onClick={() => navigator.clipboard?.writeText(portal.feedUrl)} className="rounded bg-slate-100 p-1 text-slate-500 hover:bg-slate-200">
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => registerSync(portal)} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-50 p-2 text-xs font-medium text-blue-600 transition-all hover:bg-blue-100">
                      <RefreshCw size={14} /> Sincronizar
                    </button>
                    <button onClick={() => setShowConfig(portal.id)} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-50 p-2 text-xs font-medium text-slate-600 transition-all hover:bg-slate-100">
                      <Settings size={14} /> Configurar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <h3 className="mb-4 text-lg font-bold text-black">Log de sincronizacao</h3>
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-slate-400">Nenhum log de sincronizacao encontrado.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-medium text-black">{log.integration?.portal_name || 'Portal'}</p>
                  <p className="text-xs text-slate-400">{log.message}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  {log.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-black">Configuracoes do Portal</h3>
              <button onClick={() => setShowConfig(null)} className="rounded-xl bg-slate-100 p-2 hover:bg-slate-200">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500">As credenciais especificas de cada portal podem ser ligadas aqui na proxima etapa de integracao oficial.</p>
            <button onClick={() => setShowConfig(null)} className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-500">
              Salvar Configuracoes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportadorPortais;
