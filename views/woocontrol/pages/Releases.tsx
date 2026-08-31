import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { fetchWooReleases } from '../../../services/wooControl';

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
};

export const Releases = () => {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchWooReleases()
      .then((r) => {
        if (active) {
          setReleases(r);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar releases');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const channels: Record<string, string> = {
    STABLE: 'text-emerald-500',
    BETA: 'text-amber-500',
    EARLY_ACCESS: 'text-sky-400',
    INTERNAL: 'text-purple-400',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Releases & Patches</h2>
          <p className="text-sm text-[#9097A5] mt-1">Gerencie a disponibilidade de versões na rede.</p>
        </div>
        <button className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors">
          Publicar Release
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-[#9097A5] rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>Carregando...</div>
      ) : releases.length === 0 ? (
        <div className="p-10 rounded-xl border text-center" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <Rocket size={32} className="mx-auto mb-3 text-[#9097A5]" />
          <p className="text-white font-medium">Nenhum release publicado</p>
          <p className="text-sm text-[#9097A5] mt-1">Publique a primeira versão para começar.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {releases.map((r, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={r.id} 
              className="p-4 rounded-xl border flex items-center justify-between"
              style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
            >
              <div className="flex items-center gap-4">
                <Rocket size={20} className={channels[r.channel] || 'text-[#9097A5]'} />
                <div>
                  <p className="text-sm font-medium text-white">{r.version}</p>
                  <p className="text-xs text-[#9097A5]">
                    Liberado em {fmtDate(r.created_at)} • {r.woo_products?.name || 'Produto'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs rounded bg-[#161A23] border border-[#252A35] ${channels[r.channel] || 'text-[#9097A5]'}`}>
                  {r.channel || 'STABLE'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
