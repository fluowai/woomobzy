import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Command } from 'lucide-react';
import { fetchWooAudit } from '../../../services/wooControl';

const fmtAgo = (iso?: string | null) => {
  if (!iso) return '—';
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

export const Audit = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchWooAudit()
      .then((l) => {
        if (active) {
          setLogs(l);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar auditoria');
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
          <h2 className="text-2xl font-bold text-white tracking-tight">Logs de Auditoria</h2>
          <p className="text-sm text-[#9097A5] mt-1">Trilha imutável dos eventos de nível de plataforma.</p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-[#161A23] border border-[#252A35] text-xs text-[#9097A5]">
          {loading ? '...' : logs.length} eventos
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-[#9097A5] rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>Carregando...</div>
      ) : logs.length === 0 ? (
        <div className="p-10 rounded-xl border text-center" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <Command size={32} className="mx-auto mb-3 text-[#9097A5]" />
          <p className="text-white font-medium">Nenhum evento de auditoria</p>
          <p className="text-sm text-[#9097A5] mt-1">
            Os eventos da plataforma serão registrados aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#252A35] bg-[#161A23]">
                <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">ID</th>
                <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Ação</th>
                <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Alvo</th>
                <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Ator</th>
                <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Tempo</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  key={log.id} 
                  className="border-b border-[#252A35] hover:bg-[#161A23]/50 transition-colors"
                >
                  <td className="p-4 text-sm text-[#9097A5] font-mono">{String(log.id).slice(0, 8)}</td>
                  <td className="p-4 text-sm text-white font-medium">{log.action}</td>
                  <td className="p-4 text-sm text-[#d4af37]">{log.target || log.organizations?.name || '—'}</td>
                  <td className="p-4 text-sm text-[#9097A5]">{log.profiles?.email || 'sistema'}</td>
                  <td className="p-4 text-sm text-[#9097A5]">{fmtAgo(log.timestamp)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
