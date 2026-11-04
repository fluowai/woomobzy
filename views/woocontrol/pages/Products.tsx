import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, X, Trash2 } from 'lucide-react';
import { fetchWooProducts, createWooProduct, updateWooProduct, deleteWooProduct } from '../../../services/wooControl';

export const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    status: 'ACTIVE',
    current_version: '',
    stable_version: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadProducts = () => {
    setLoading(true);
    fetchWooProducts()
      .then((p) => {
        setProducts(p);
        setError(null);
      })
      .catch((e: any) => {
        setError(e.message || 'Falha ao carregar produtos');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openModal = (product?: any) => {
    setFormError(null);
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        status: product.status || 'ACTIVE',
        current_version: product.current_version || '',
        stable_version: product.stable_version || '',
        description: product.description || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        slug: '',
        status: 'ACTIVE',
        current_version: '1.0.0',
        stable_version: '1.0.0',
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingProduct) {
        await updateWooProduct(editingProduct.id, formData);
      } else {
        await createWooProduct(formData);
      }
      closeModal();
      loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'Ocorreu um erro ao salvar o produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) {
      try {
        await deleteWooProduct(id);
        loadProducts();
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir o produto');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Catálogo de Produtos</h2>
          <p className="text-sm text-[#9097A5] mt-1">Gerencie módulos de software e microsserviços implantáveis.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors flex items-center gap-2"
        >
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
              className="p-6 rounded-xl border flex flex-col gap-4 relative group"
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
                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => handleDelete(p.id, p.name)}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={() => openModal(p)}
                    className="text-sm text-[#d4af37] hover:underline"
                  >
                    Gerenciar
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
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
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
                  <label className="text-sm font-medium text-[#9097A5]">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                    placeholder="Ex.: IMOBZY Core"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Slug (Opcional)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                    placeholder="imobzy-core"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[#9097A5]">Versão Atual</label>
                    <input
                      type="text"
                      value={formData.current_version}
                      onChange={(e) => setFormData({ ...formData, current_version: e.target.value })}
                      className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                      placeholder="1.0.0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[#9097A5]">Versão Estável</label>
                    <input
                      type="text"
                      value={formData.stable_version}
                      onChange={(e) => setFormData({ ...formData, stable_version: e.target.value })}
                      className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                      placeholder="1.0.0"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="DEPRECATED">Descontinuado</option>
                    <option value="BETA">Beta</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Descrição (Opcional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors resize-none h-20"
                    placeholder="Breve descrição do produto"
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
                    {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
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
