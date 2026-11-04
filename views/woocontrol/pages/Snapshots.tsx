import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Download, Plus, Trash2, X, Edit, ExternalLink } from 'lucide-react';
import { fetchWooSnapshots, createWooSnapshot, updateWooSnapshot, deleteWooSnapshot, fetchWooProducts, fetchWooNetwork } from '../../../services/wooControl';

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
};

export const Snapshots = () => {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<any>(null);

  const [formData, setFormData] = useState({
    product_id: '',
    organization_id: '',
    version: '',
    url: '',
    notes: '',
    type: 'FULL'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadSnapshots = () => {
    setLoading(true);
    fetchWooSnapshots()
      .then((s) => {
        setSnapshots(s);
        setError(null);
      })
      .catch((e: any) => {
        setError(e.message || 'Falha ao carregar snapshots');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSnapshots();
    fetchWooProducts()
      .then((p) => setProducts(p))
      .catch(() => {});
    fetchWooNetwork()
      .then((n) => setOrganizations([...(n.resellers || []), ...(n.customers || [])]))
      .catch(() => {});
  }, []);

  const typeLabel = (type?: string) => {
    const map: Record<string, string> = {
      FULL: 'Completo',
      PARTIAL: 'Parcial',
      DIFF: 'Diff'
    };
    return map[String(type || 'FULL').toUpperCase()] || String(type || 'FULL');
  };

  const openModal = (snapshot?: any) => {
    setFormError(null);
    if (snapshot) {
      setEditingSnapshot(snapshot);
      setFormData({
        product_id: snapshot.product_id || snapshot.woo_products?.id || '',
        organization_id: snapshot.organization_id || snapshot.organizations?.id || '',
        version: snapshot.version || '',
        url: snapshot.url || '',
        notes: snapshot.notes || '',
        type: (snapshot.type || 'FULL').toUpperCase()
      });
    } else {
      setEditingSnapshot(null);
      setFormData({
        product_id: products[0]?.id || '',
        organization_id: '',
        version: '',
        url: '',
        notes: '',
        type: 'FULL'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSnapshot(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingSnapshot) {
        await updateWooSnapshot(editingSnapshot.id, formData);
      } else {
        await createWooSnapshot(formData);
      }
      closeModal();
      loadSnapshots();
    } catch (err: any) {
      setFormError(err.message || 'Ocorreu um erro ao salvar o snapshot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, snapshotId: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o snapshot "${snapshotId}"?`)) {
      try {
        await deleteWooSnapshot(id);
        loadSnapshots();
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir o snapshot');
      }
    }
  };

  const handleDownload = (s: any) => {
    if (s.url) {
      window.open(s.url, '_blank');
    } else {
      alert('URL não disponível');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Snapshots de Código</h2>
          <p className="text-sm text-[#9097A5] mt-1">Pacotes de código-fonte com marca d&apos;água gerados para clientes.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Novo Snapshot
        </button>
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
              className="p-4 rounded-xl border flex items-center justify-between group"
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
                  <span className="text-xs px-2 py-0.5 rounded bg-[#161A23] border border-[#252A35] text-[#9097A5] mt-1 inline-block">
                    {typeLabel(s.type)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownload(s)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#161A23] border border-[#252A35] text-xs text-[#d4af37] hover:text-white transition-colors"
                >
                  {s.url ? <ExternalLink size={14} /> : <Download size={14} />} Baixar
                </button>
                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openModal(s)}
                    className="text-sm text-[#d4af37] hover:text-white transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.snapshot_id)}
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
                  {editingSnapshot ? 'Editar Snapshot' : 'Novo Snapshot'}
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
                  <label className="text-sm font-medium text-[#9097A5]">Organização (Opcional)</label>
                  <select
                    value={formData.organization_id}
                    onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                  >
                    <option value="">Selecione a organização</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <label className="text-sm font-medium text-[#9097A5]">Tipo</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                    >
                      <option value="FULL">Completo</option>
                      <option value="PARTIAL">Parcial</option>
                      <option value="DIFF">Diff</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">URL do Download</label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Notas (Opcional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors resize-none h-20"
                    placeholder="Observações sobre o snapshot"
                  />
                </div>

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
                    {isSubmitting ? 'Salvando...' : 'Salvar Snapshot'}
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
