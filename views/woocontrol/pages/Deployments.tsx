import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Server } from 'lucide-react';
import { fetchWooDeployments } from '../../../services/wooControl';

const statusMeta: Record<string, { label: string; cls: string }> = {
  ONLINE: { label: 'Online', cls: 'text-emerald-500' },
  DEGRADED: { label: 'Degradada', cls: 'text-amber-500' },
  OFFLINE: { label: 'Offline', cls: 'text-red-500' },
  SUSPENDED: { label: 'Suspensa', cls: 'text-red-500' },
  UPDATE_REQUIRED: { label: 'Atualização necessária', cls: 'text-amber-500' },
  DEACTIVATED: { label: 'Desativada', cls: 'text-zinc-500' },
};

const fmtAgo = (iso?: string | null) => {
  if (!iso) return 'nunca';
  const d = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return 'agora';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h atrás`;
  const d2 = Math.floor(h / 24);
  return `${d2} d atrás`;
};

export const Deployments = () => {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchWooDeployments()
      .then((d) => {
        if (active) {
          setDeployments(d);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar implantações');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Implantações</h2>
          <p className="text-sm text-[#9097A5] mt-1">Monitore instâncias de software ativas na infraestrutura.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-[#9097A5] rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>Carregando...</div>
      ) : deployments.length === 0 ? (
        <div className="p-10 rounded-xl border text-center" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <Server size={32} className="mx-auto mb-3 text-[#9097A5]" />
          <p className="text-white font-medium">Nenhuma implantação registrada</p>
          <p className="text-sm text-[#9097A5] mt-1">
            As instâncias aparecerão aqui quando enviarem o primeiro heartbeat de licença.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {deployments.map((d, i) => {
            const meta = statusMeta[d.status] || { label: d.status, cls: 'text-[#9097A5]' };
            return (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={d.id} 
                className="p-4 rounded-xl border flex items-center justify-between"
                style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
              >
                <div className="flex items-center gap-4">
                  <Server size={20} className="text-[#9097A5]" />
                  <div>
                    <p className="text-sm font-medium text-white">{d.instance_id}</p>
                    <p className="text-xs text-[#9097A5]">
                      {d.domain || 'domínio não informado'} • {d.organizations?.name || '—'}
                    </p>
                    <p className="text-xs text-[#9097A5]">{d.woo_products?.name || '—'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-xs font-bold ${meta.cls}`}>{meta.label}</span>
                  <span className="text-xs text-[#9097A5]">Heartbeat: {fmtAgo(d.last_heartbeat)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
