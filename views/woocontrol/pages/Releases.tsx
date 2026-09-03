import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Plus, Trash2, X, Edit } from 'lucide-react';
import { fetchWooReleases, createWooRelease, updateWooRelease, deleteWooRelease, fetchWooProducts } from '../../../services/wooControl';

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
};

export const Releases = () => {
  const [releases, setReleases] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<any>(null);

  const [formData, setFormData] = useState({
    product_id: '',
    version: '',
    status: 'STABLE',
    release_notes: '',
    is_stable: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadReleases = () => {
    setLoading(true);
    fetchWooReleases()
      .then((r) => {
        setReleases(r);
        setError(null);
      })
      .catch((e: any) => {
        setError(e.message || 'Falha ao carregar releases');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReleases();
    fetchWooProducts()
      .then((p) => setProducts(p))
      .catch(() => {});
  }, []);

  const channelColor = (channel?: string) => {
    const map: Record<string, string> = {
      STABLE: 'text-emerald-500',
      BETA: 'text-amber-500',
      EARLY_ACCESS: 'text-sky-400',
      INTERNAL: 'text-purple-400',
      DRAFT: 'text-[#9097A5]'
    };
    return map[String(channel || 'STABLE').toUpperCase()] || 'text-[#9097A5]';
  };

  const statusLabel = (channel?: string) => {
    const map: Record<string, string> = {
      STABLE: 'Estável',
      BETA: 'Beta',
      EARLY_ACCESS: 'Acesso Antecipado',
      INTERNAL: 'Interno',
      DRAFT: 'Rascunho'
    };
    return map[String(channel || 'STABLE').toUpperCase()] || String(channel || 'STABLE');
  };

  const openModal = (release?: any) => {
    setFormError(null);
    if (release) {
      setEditingRelease(release);
      setFormData({
        product_id: release.product_id || release.woo_products?.id || '',
        version: release.version || '',
        status: (release.status || release.channel || 'STABLE').toUpperCase(),
        release_notes: release.release_notes || '',
        is_stable: !!release.is_stable
      });
    } else {
      setEditingRelease(null);
      setFormData({
        product_id: products[0]?.id || '',
        version: '',
        status: 'STABLE',
        release_notes: '',
        is_stable: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRelease(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingRelease) {
        await updateWooRelease(editingRelease.id, formData);
      } else {
        await createWooRelease(formData);
      }
      closeModal();
      loadReleases();
    } catch (err: any) {
      setFormError(err.message || 'Ocorreu um erro ao salvar o release');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, version: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o release "${version}"?`)) {
      try {
        await deleteWooRelease(id);
        loadReleases();
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir o release');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Releases & Patches</h2>
          <p className="text-sm text-[#9097A5] mt-1">Gerencie a disponibilidade de versões na rede.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Publicar Release
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
              className="p-4 rounded-xl border flex items-center justify-between group"
              style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
            >
              <div className="flex items-center gap-4">
                <Rocket size={20} className={channelColor(r.channel || r.status)} />
                <div>
                  <p className="text-sm font-medium text-white">{r.version}</p>
                  <p className="text-xs text-[#9097A5]">
                    Liberado em {fmtDate(r.created_at)} • {r.woo_products?.name || 'Produto'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs rounded bg-[#161A23] border border-[#252A35] ${channelColor(r.channel || r.status)}`}>
                  {statusLabel(r.channel || r.status)}
                </span>
                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openModal(r)}
                    className="text-sm text-[#d4af37] hover:text-white transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id, r.version)}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal CRUD */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#11141C] border border-[#252A35] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#252A35]">
                <h3 className="text-lg font-bold text-white">
                  {editingRelease ? 'Editar Release' : 'Novo Release'}
                </h3>
                <button onClick={closeModal} className="text-[#9097A5] hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Produto</label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                  >
                    <option value="" disabled>Selecione o produto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Versão</label>
                  <input
                    type="text"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                    placeholder="1.0.0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                  >
                    <option value="DRAFT">Rascunho</option>
                    <option value="STABLE">Estável</option>
                    <option value="BETA">Beta</option>
                    <option value="EARLY_ACCESS">Acesso Antecipado</option>
                    <option value="INTERNAL">Interno</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Notas de Release</label>
                  <textarea
                    value={formData.release_notes}
                    onChange={(e) => setFormData({ ...formData, release_notes: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors resize-none h-24"
                    placeholder="Descreva as mudanças desta versão"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#9097A5]">
                  <input
                    type="checkbox"
                    checked={formData.is_stable}
                    onChange={(e) => setFormData({ ...formData, is_stable: e.target.checked })}
                    className="accent-[#d4af37]"
                  />
                  Marcar como versão estável
                </label>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg font-medium text-[#9097A5] hover:text-white transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Release'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
