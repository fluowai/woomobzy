import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Plus, X, Search } from 'lucide-react';
import { fetchWooLicenses, fetchWooNetwork, createWooLicense } from '../../../services/wooControl';
import { toast } from 'sonner';

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [orgSearch, setOrgSearch] = useState('');
  
  // Form State
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Básico');
  const [isTrial, setIsTrial] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetchWooLicenses()
      .then((l) => {
        setLicenses(l);
        setError(null);
      })
      .catch((e: any) => {
        setError(e.message || 'Falha ao carregar licenças');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setSelectedOrg('');
    setOrgSearch('');
    setIsTrial(false);
    setSelectedPlan('Básico');
    try {
      const net = await fetchWooNetwork();
      const allOrgs = [...net.resellers, ...net.customers, ...net.orphans].filter(
        (obj, index, self) => index === self.findIndex((t) => t.id === obj.id)
      );
      setOrgs(allOrgs);
    } catch (err) {
      toast.error('Erro ao carregar organizações');
    }
  };

  const handleGenerateLicense = async () => {
    if (!selectedOrg) {
      toast.error('Selecione uma organização');
      return;
    }
    setIsSubmitting(true);
    try {
      await createWooLicense({
        organization_id: selectedOrg,
        plan: selectedPlan,
        is_trial: isTrial,
      });
      toast.success('Licença emitida com sucesso!');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao emitir licença');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrgs = orgs.filter((o) =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Motor de Licenciamento</h2>
          <p className="text-sm text-[#9097A5] mt-1">Leases criptográficos e autorizações por domínio.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-[#161A23] border border-[#252A35] text-xs text-[#9097A5]">
            {loading ? '...' : licenses.length} licenças
          </span>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition-colors"
          >
            <Plus size={16} /> Nova Licença
          </button>
        </div>
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

      {/* Modal Nova Licença */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#11141C] border border-[#252A35] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#252A35] bg-[#161A23]">
                <h3 className="text-lg font-semibold text-white">Emitir Nova Licença</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#9097A5] hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#9097A5] mb-1">
                    Cliente / Organização
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9097A5]" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar organização..."
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#161A23] border border-[#252A35] rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-[#252A35] rounded-lg bg-[#161A23]">
                    {filteredOrgs.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setSelectedOrg(o.id)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedOrg === o.id
                            ? 'bg-purple-600/20 text-purple-400'
                            : 'text-white hover:bg-[#252A35]'
                        }`}
                      >
                        {o.name} <span className="text-xs text-[#9097A5]">({o.type})</span>
                      </button>
                    ))}
                    {filteredOrgs.length === 0 && (
                      <div className="p-3 text-center text-sm text-[#9097A5]">Nenhuma organização encontrada.</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9097A5] mb-1">
                    Plano
                  </label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161A23] border border-[#252A35] rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Básico">Básico</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="checkbox"
                    id="isTrial"
                    checked={isTrial}
                    onChange={(e) => setIsTrial(e.target.checked)}
                    className="w-4 h-4 rounded border-[#252A35] bg-[#161A23] text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="isTrial" className="text-sm text-white cursor-pointer select-none">
                    Licença de Teste (Trial - 7 dias)
                  </label>
                </div>

              </div>
              <div className="flex items-center justify-end gap-3 p-5 border-t border-[#252A35] bg-[#161A23]">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#9097A5] hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerateLicense}
                  disabled={isSubmitting || !selectedOrg}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Emitindo...' : 'Emitir Licença'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
