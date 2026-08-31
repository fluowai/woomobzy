import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus } from 'lucide-react';
import { fetchWooProducts } from '../../../services/wooControl';

export const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchWooProducts()
      .then((p) => {
        if (active) {
          setProducts(p);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar produtos');
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
          <h2 className="text-2xl font-bold text-white tracking-tight">Catálogo de Produtos</h2>
          <p className="text-sm text-[#9097A5] mt-1">Gerencie módulos de software e microsserviços implantáveis.</p>
        </div>
        <button className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors flex items-center gap-2">
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-[#9097A5] rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>Carregando...</div>
      ) : products.length === 0 ? (
        <div className="p-10 rounded-xl border text-center" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <Package size={32} className="mx-auto mb-3 text-[#9097A5]" />
          <p className="text-white font-medium">Nenhum produto cadastrado</p>
          <p className="text-sm text-[#9097A5] mt-1">
            Cadastre os produtos da plataforma (Ex.: IMOBZY Core, AGROZY) para começar a controlá-los.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p, i) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              key={p.id} 
              className="p-6 rounded-xl border flex flex-col gap-4"
              style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#161A23] to-[#252A35] border border-[#252A35] flex items-center justify-center shadow-lg">
                  <Package size={24} className="text-[#d4af37]" />
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-[#161A23] border border-[#252A35] text-[#9097A5]">
                  {p.status || 'ATIVO'}
                </span>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-white">{p.name}</h3>
                <p className="text-sm text-[#9097A5] mt-1 font-mono">{p.slug}</p>
                <p className="text-sm text-[#9097A5] mt-1">
                  Versão atual: <span className="text-white font-mono">{p.current_version || '—'}</span>
                </p>
                <p className="text-sm text-[#9097A5] mt-1">
                  Versão estável: <span className="text-white font-mono">{p.stable_version || '—'}</span>
                </p>
                <p className="text-sm text-[#9097A5] mt-1">
                  Release: <span className="text-white font-mono">{p.woo_releases?.length ?? 0}</span>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-[#252A35] flex items-center justify-between">
                <span className={`text-xs font-semibold ${
                  String(p.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'text-emerald-500' : 'text-amber-500'
                }`}>
                  ● {String(p.status || 'ATIVO').replace('_', ' ')}
                </span>
                <button className="text-sm text-[#d4af37] hover:underline">Gerenciar</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
