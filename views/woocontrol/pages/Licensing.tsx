import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Key } from 'lucide-react';
import { fetchWooLicenses } from '../../../services/wooControl';

const statusMeta: Record<string, { label: string; cls: string }> = {
  TRIAL: { label: 'Teste', cls: 'bg-sky-500/10 text-sky-400' },
  ACTIVE: { label: 'Ativa', cls: 'bg-emerald-500/10 text-emerald-500' },
  EXPIRING: { label: 'Expirando', cls: 'bg-amber-500/10 text-amber-500' },
  GRACE: { label: 'Carência', cls: 'bg-orange-500/10 text-orange-400' },
  SUSPENDED: { label: 'Suspensa', cls: 'bg-red-500/10 text-red-500' },
  REVOKED: { label: 'Revogada', cls: 'bg-red-500/10 text-red-500' },
  TRANSFER_PENDING: { label: 'Transferência', cls: 'bg-purple-500/10 text-purple-400' },
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
};

export const Licensing = () => {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchWooLicenses()
      .then((l) => {
        if (active) {
          setLicenses(l);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar licenças');
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
          <h2 className="text-2xl font-bold text-white tracking-tight">Motor de Licenciamento</h2>
          <p className="text-sm text-[#9097A5] mt-1">Leases criptográficos e autorizações por domínio.</p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-[#161A23] border border-[#252A35] text-xs text-[#9097A5]">
          {loading ? '...' : licenses.length} licenças
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {!loading && licenses.length === 0 && !error && (
        <div className="p-10 rounded-xl border text-center" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <Key size={32} className="mx-auto mb-3 text-[#9097A5]" />
          <p className="text-white font-medium">Nenhuma licença emitida ainda</p>
          <p className="text-sm text-[#9097A5] mt-1">
            As licenças aparecerão aqui conforme forem emitidas para as organizações.
          </p>
        </div>
      )}

      {licenses.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#252A35] bg-[#161A23]">
                <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Licença</th>
                <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Organização</th>
                <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Produto</th>
                <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Plano</th>
                <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Expira</th>
                <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((l, i) => {
                const meta = statusMeta[l.status] || { label: l.status, cls: 'bg-[#161A23] text-[#9097A5]' };
                return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={l.id} 
                    className="border-b border-[#252A35] hover:bg-[#161A23]/50 transition-colors"
                  >
                    <td className="p-4 font-mono text-sm text-white">{l.license_id}</td>
                    <td className="p-4 text-sm text-[#9097A5]">{l.organizations?.name || '—'}</td>
                    <td className="p-4 text-sm text-white">{l.woo_products?.name || l.woo_products?.slug || '—'}</td>
                    <td className="p-4 text-sm text-white">{l.plan || '—'}</td>
                    <td className="p-4 text-sm text-[#9097A5]">{fmtDate(l.expires_at)}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
