import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Download } from 'lucide-react';
import { fetchWooSnapshots } from '../../../services/wooControl';

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
};

export const Snapshots = () => {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchWooSnapshots()
      .then((s) => {
        if (active) {
          setSnapshots(s);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar snapshots');
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
          <h2 className="text-2xl font-bold text-white tracking-tight">Snapshots de Código</h2>
          <p className="text-sm text-[#9097A5] mt-1">Pacotes de código-fonte com marca d'água gerados para clientes.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-[#9097A5] rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>Carregando...</div>
      ) : snapshots.length === 0 ? (
        <div className="p-10 rounded-xl border text-center" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <Camera size={32} className="mx-auto mb-3 text-[#9097A5]" />
          <p className="text-white font-medium">Nenhum snapshot gerado</p>
          <p className="text-sm text-[#9097A5] mt-1">
            Os snapshots de código aparecerão aqui após a geração para os clientes.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {snapshots.map((s, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={s.id} 
              className="p-4 rounded-xl border flex items-center justify-between"
              style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
            >
              <div className="flex items-center gap-4">
                <Camera size={20} className="text-[#9097A5]" />
                <div>
                  <p className="text-sm font-medium text-white">{s.snapshot_id}</p>
                  <p className="text-xs text-[#9097A5]">
                    {s.woo_products?.name || 'Produto'} • v{s.version} • {fmtDate(s.generated_at)}
                  </p>
                  <p className="text-xs text-[#9097A5]">{s.organizations?.name || '—'}</p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#161A23] border border-[#252A35] text-xs text-[#9097A5] hover:text-white transition-colors">
                <Download size={14} /> Baixar
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
