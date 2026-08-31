import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Search, Edit2, Ban, CheckCircle, Plus, X, Save, Trash2, Key } from 'lucide-react';
import { fetchWooNetwork, WooOrg, WooNetwork as WooNetworkType, createWooReseller, updateWooReseller, deleteWooReseller } from '../../../services/wooControl';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

const typeLabel = (type?: string | null): string => {
  switch ((type || '').toUpperCase()) {
    case 'PLATFORM':
      return 'Plataforma';
    case 'MASTER_RESELLER':
      return 'Revenda Master';
    case 'RESELLER':
      return 'Revenda';
    case 'CUSTOMER':
      return 'Cliente';
    default:
      return type || 'Cliente';
  }
};

const typeBadgeClass = (type?: string | null): string => {
  switch ((type || '').toUpperCase()) {
    case 'MASTER_RESELLER':
      return 'bg-purple-500/10 text-purple-400';
    case 'RESELLER':
      return 'bg-[#d4af37]/10 text-[#d4af37]';
    case 'PLATFORM':
      return 'bg-emerald-500/10 text-emerald-500';
    default:
      return 'bg-blue-500/10 text-blue-400';
  }
};

export const Network = () => {
  const { impersonateOrganization } = useAuth();
  const [network, setNetwork] = useState<WooNetworkType>({
    resellers: [],
    customers: [],
    orphans: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Form & Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [setupInfo, setSetupInfo] = useState<{ email: string; password?: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    owner_name: '',
    owner_email: '',
    password: '',
    niche: 'both',
    document: '',
    phone: '',
    creci: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
  });

  const loadNetwork = () => {
    setLoading(true);
    fetchWooNetwork()
      .then((n) => {
        setNetwork(n);
        setError(null);
      })
      .catch((e: any) => {
        setError(e.message || 'Falha ao carregar a rede de revendas');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadNetwork();
  }, []);

  const handleOpenModal = (reseller?: WooOrg) => {
    setSetupInfo(null);
    if (reseller) {
      setEditingId(reseller.id);
      setFormData({
        name: reseller.name,
        slug: reseller.slug || '',
        owner_name: reseller.ownerName || '',
        owner_email: reseller.ownerEmail || '',
        password: '',
        niche: reseller.niche === 'rural' ? 'rural' : reseller.niche === 'both' ? 'both' : 'traditional',
        document: (reseller as any).document || '',
        phone: (reseller as any).phone || '',
        creci: (reseller as any).creci || '',
        address: (reseller as any).address || '',
        city: (reseller as any).city || '',
        state: (reseller as any).state || '',
        zip_code: (reseller as any).zip_code || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', slug: '', owner_name: '', owner_email: '', password: '',
        niche: 'both', document: '', phone: '', creci: '', address: '',
        city: '', state: '', zip_code: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        owner_name: formData.owner_name || null,
        owner_email: formData.owner_email || null,
        password: formData.password || undefined,
        niche: formData.niche,
        document: formData.document,
        phone: formData.phone,
        creci: formData.creci,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
      };

      if (editingId) {
        await updateWooReseller(editingId, payload);
        setIsModalOpen(false);
        toast.success('Revenda atualizada com sucesso');
      } else {
        const response: any = await createWooReseller(payload);
        setSetupInfo({
          email: formData.owner_email || '',
          password: response?.setup_password || formData.password,
        });
        toast.success('Revenda criada com sucesso');
      }

      loadNetwork();
    } catch (error: any) {
      toast.error(`Erro ao salvar revenda: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Deseja alterar o status para ${newStatus}?`)) return;

    try {
      await updateWooReseller(id, { status: newStatus });
      loadNetwork();
      toast.success('Status atualizado com sucesso');
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR a revenda "${name}"?\n\nIsso também excluirá todas as imobiliárias associadas a ela.`)) return;
    if (!confirm(`Última confirmação: Excluir "${name}" permanentemente?`)) return;

    try {
      await deleteWooReseller(id);
      loadNetwork();
      toast.success('Revenda excluída com sucesso');
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  };

  const allNodes: WooOrg[] = [...network.resellers, ...network.customers];
  const filtered = allNodes.filter((n) =>
    String(n.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Rede de Revendas</h2>
          <p className="text-sm text-[#9097A5] mt-1">
            Gerencie revendas master, revendas e clientes da distribuição hierárquica.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9097A5]" />
            <input
              type="text"
              placeholder="Buscar organização..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg bg-[#161A23] border border-[#252A35] text-white placeholder-[#9097A5] text-sm outline-none w-64"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition-colors"
          >
            <Plus size={16} /> Nova Revenda
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border text-center" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <p className="text-3xl font-bold text-white">{loading ? '...' : network.resellers.length}</p>
          <p className="text-sm text-[#9097A5] mt-1">Revendas</p>
        </div>
        <div className="p-5 rounded-xl border text-center" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <p className="text-3xl font-bold text-white">{loading ? '...' : network.customers.length}</p>
          <p className="text-sm text-[#9097A5] mt-1">Clientes</p>
        </div>
        <div className="p-5 rounded-xl border text-center" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <p className="text-3xl font-bold text-white">{loading ? '...' : network.orphans.length}</p>
          <p className="text-sm text-[#9097A5] mt-1">Clientes diretos (sem revenda)</p>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#252A35] bg-[#161A23]">
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Organização</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Tipo</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Licenças</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Implantações</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Responsável</th>
              <th className="p-4 text-right text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#9097A5]">Carregando...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#9097A5]">
                  Nenhuma organização encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={r.id} 
                  className="border-b border-[#252A35] hover:bg-[#161A23]/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#161A23] border border-[#252A35] flex items-center justify-center">
                        <Building2 size={14} className="text-[#d4af37]" />
                      </div>
                      <div>
                        <span className="font-medium text-white">{r.name}</span>
                        <div className="text-xs text-[#9097A5]">{r.slug || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${typeBadgeClass(r.type)}`}>
                      {typeLabel(r.type)}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-white">{r.licenses ?? 0}</td>
                  <td className="p-4 text-sm text-white">{r.deployments ?? 0}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      String(r.status || 'active').toLowerCase() === 'active'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {String(r.status || 'active').toLowerCase() === 'active' ? 'Ativa' : 'Suspensa'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-[#9097A5]">
                    <div className="flex flex-col">
                      <span className="text-white">{r.ownerName || (r.ownerEmail ? r.ownerEmail.split('@')[0] : '—')}</span>
                      {r.ownerName && (
                        <span className="text-[10px] text-[#9097A5] uppercase tracking-tight">{r.ownerEmail}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => toggleStatus(r.id, r.status || 'active')}
                        className={`p-1.5 rounded hover:bg-[#252A35] transition-colors ${
                          String(r.status || 'active').toLowerCase() === 'active' ? 'text-red-400' : 'text-emerald-400'
                        }`}
                        title={String(r.status || 'active').toLowerCase() === 'active' ? 'Suspender' : 'Ativar'}
                      >
                        {String(r.status || 'active').toLowerCase() === 'active' ? <Ban size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button
                        onClick={async () => {
                          const reason = prompt('Motivo do acesso (Opcional):');
                          if (reason !== null && impersonateOrganization) {
                            await impersonateOrganization(r.id, reason);
                          }
                        }}
                        className="p-1.5 text-blue-400 rounded hover:bg-[#252A35] transition-colors"
                        title="Acessar Painel (Suporte)"
                      >
                        <Key size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenModal(r)}
                        className="p-1.5 text-[#9097A5] rounded hover:bg-[#252A35] hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      {r.type !== 'CUSTOMER' && (
                        <button
                          onClick={() => handleDelete(r.id, r.name)}
                          className="p-1.5 text-red-400 rounded hover:bg-[#252A35] transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nova/Editar Revenda */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#161A23] border border-[#252A35] rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#252A35]">
              <h2 className="text-xl font-bold text-white">
                {setupInfo ? 'Revenda Criada com Sucesso!' : editingId ? 'Editar Revenda' : 'Nova Revenda'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-[#9097A5] hover:text-white hover:bg-[#252A35] rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {setupInfo ? (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Tudo pronto! Plataforma liberada.</h3>
                  <p className="text-sm text-[#9097A5] mt-2">
                    A revenda foi criada com todas as funções ativas.
                  </p>
                </div>
                <div className="bg-[#11141C] p-4 rounded-xl border border-[#252A35] text-left space-y-3">
                  <p className="text-xs font-bold text-[#9097A5] uppercase">Link de Setup Guiado</p>
                  <p className="text-sm text-white mb-2">
                    Envie este link para o dono da revenda configurar a senha e cores iniciais:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}/setup-whitelabel?email=${encodeURIComponent(setupInfo.email)}&t=${setupInfo.password}`}
                      className="flex-1 bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/setup-whitelabel?email=${encodeURIComponent(setupInfo.email)}&t=${setupInfo.password}`);
                        toast.info('Link copiado!');
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-bold shrink-0 transition-colors"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 bg-[#252A35] text-white hover:bg-[#323946] rounded-xl font-bold transition-colors"
                >
                  Fechar Janela
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#9097A5] mb-1">Nome da Empresa *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#11141C] border border-[#252A35] text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none placeholder-[#9097A5]"
                    placeholder="Ex: Imobiliária Central"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#9097A5] mb-1">CNPJ / CPF</label>
                    <input
                      type="text"
                      value={formData.document}
                      onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                      className="w-full px-3 py-2 bg-[#11141C] border border-[#252A35] text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#9097A5] mb-1">Registro (CRECI)</label>
                    <input
                      type="text"
                      value={formData.creci}
                      onChange={(e) => setFormData({ ...formData, creci: e.target.value })}
                      className="w-full px-3 py-2 bg-[#11141C] border border-[#252A35] text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#9097A5] mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-[#11141C] border border-[#252A35] text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none placeholder-[#9097A5]"
                    placeholder="ex: imob-central"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#9097A5] mb-1">Nome do Responsável</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#11141C] border border-[#252A35] text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#9097A5] mb-1">Email do Responsável *</label>
                  <input
                    type="email"
                    required
                    value={formData.owner_email}
                    onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#11141C] border border-[#252A35] text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#9097A5] mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#11141C] border border-[#252A35] text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-[#9097A5] mb-1">Senha Provisória (Opcional)</label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 bg-[#11141C] border border-[#252A35] text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none placeholder-[#9097A5]"
                      placeholder="Se vazio, será gerada automaticamente"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[#9097A5] mb-1">Nicho Padrão</label>
                  <select
                    value={formData.niche}
                    onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                    className="w-full px-3 py-2 bg-[#11141C] border border-[#252A35] text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="both">Ambos (Urbano e Rural)</option>
                    <option value="traditional">Apenas Urbano / Tradicional</option>
                    <option value="rural">Apenas Rural</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[#252A35]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-[#9097A5] hover:bg-[#252A35] hover:text-white rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-60 transition-colors"
                  >
                    <Save size={18} />
                    {formLoading ? 'Processando...' : editingId ? 'Salvar' : 'Criar Revenda'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
