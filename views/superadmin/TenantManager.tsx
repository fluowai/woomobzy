import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import {
  Building2,
  Search,
  Edit2,
  Ban,
  CheckCircle,
  Plus,
  X,
  Save,
  Key,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Organization {
  id: string;
  name: string;
  slug?: string;
  status: string;
  owner_email?: string;
  plan_id?: string;
  created_at: string;
  custom_domain?: string;
  niche?: string;
  plans?: {
    name: string;
  };
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
}

const TenantManager: React.FC = () => {
  const { impersonateOrganization } = useAuth();
  const [tenants, setTenants] = useState<Organization[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    owner_email: '',
    plan_id: '',
    status: 'active',
    custom_domain: '',
    password: '',
    niche: 'traditional',
  });

  useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('plans')
      .select('id, name, price_monthly')
      .eq('is_active', true);
    if (data) setPlans(data);
  };

  // Helper para pegar o token JWT do Supabase
  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    };
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/organizations', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar');
      setTenants(data.organizations || []);
    } catch (error: any) {
      logger.error('Error fetching tenants:', error);
      setErrorMsg(error.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tenant?: Organization) => {
    if (tenant) {
      setEditingId(tenant.id);
      setFormData({
        name: tenant.name,
        slug: tenant.slug || '',
        owner_email: tenant.owner_email || '',
        plan_id: tenant.plan_id || '',
        status: tenant.status,
        custom_domain: tenant.custom_domain || '',
        password: '',
        niche: tenant.niche || 'traditional',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        slug: '',
        owner_email: '',
        plan_id: plans.length > 0 ? plans[0].id : '',
        status: 'active',
        custom_domain: '',
        password: '',
        niche: 'traditional',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const headers = await getAuthHeaders();
      const payload = {
        name: formData.name,
        slug: formData.slug,
        status: formData.status,
        plan_id: formData.plan_id || undefined,
        custom_domain: formData.custom_domain || null,
        owner_email: formData.owner_email || null,
        password: formData.password || undefined,
        niche: formData.niche,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/admin/organizations/${editingId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/organizations', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

      setIsModalOpen(false);
      fetchTenants();
    } catch (error: any) {
      logger.error('Error saving:', error);
      alert(
        `Erro ao salvar imobiliária: ${error.message || 'Erro desconhecido'}`
      );
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Deseja alterar o status para ${newStatus}?`)) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchTenants();
    } catch (error: any) {
      alert(`Erro ao atualizar status: ${error.message}`);
    }
  };

  const deleteTenant = async (id: string, name: string) => {
    if (
      !confirm(
        `⚠️ Tem certeza que deseja EXCLUIR a imobiliária "${name}"?\n\nEssa ação é IRREVERSÍVEL e vai remover todos os dados associados.`
      )
    )
      return;
    if (!confirm(`Última confirmação: Excluir "${name}" permanentemente?`))
      return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchTenants();
    } catch (error: any) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 border border-red-200">
          <strong>Erro ao carregar:</strong> {errorMsg}
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Gerenciar Imobiliárias
          </h1>
          <p className="text-gray-500">Crie e edite empresas manualmente.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus size={20} /> Nova Imobiliária
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                URL (Slug)
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Plano
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Responsável
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nicho
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma empresa encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {tenant.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {tenant.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs text-blue-600">
                      {tenant.slug || '-'}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold uppercase">
                      {tenant.plans?.name || 'Sem plano'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {tenant.owner_email || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      tenant.niche === 'rural' ? 'bg-green-100 text-green-700' :
                      tenant.niche === 'traditional' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {tenant.niche || 'hybrid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tenant.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {tenant.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => toggleStatus(tenant.id, tenant.status)}
                      className={`p-1.5 rounded hover:bg-gray-100 mr-2 ${tenant.status === 'active' ? 'text-red-500' : 'text-green-500'}`}
                      title={
                        tenant.status === 'active' ? 'Suspender' : 'Ativar'
                      }
                    >
                      {tenant.status === 'active' ? (
                        <Ban size={18} />
                      ) : (
                        <CheckCircle size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenModal(tenant)}
                      className="p-1.5 text-blue-500 rounded hover:bg-gray-100"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={async () => {
                        const reason = prompt(
                          `Motivo do acesso à conta de "${tenant.name}"?`,
                          'Suporte Técnico'
                        );
                        if (!reason) return;

                        try {
                          // Start impersonation in AuthContext
                          await impersonateOrganization(tenant.id);

                          // Redirect to the appropriate dashboard
                          // We need to know the niche. Let's fetch it if not present,
                          // or assume the component will handle it after refresh.
                          // Since AuthContext loadProfile fetches the niche, we can just redirect to /admin
                          // and NicheRedirect will handle it.
                          window.location.href = '/admin';
                        } catch (err: any) {
                          logger.error(err);
                          alert(`Erro: ${err.message}`);
                        }
                      }}
                      className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded mr-2"
                      title="Acessar Como (Modo Suporte)"
                    >
                      <Key size={18} />
                    </button>
                    <button
                      onClick={() => deleteTenant(tenant.id, tenant.name)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Excluir Imobiliária"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">
                {editingId ? 'Editar Imobiliária' : 'Nova Imobiliária'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Personalizada (Slug)
                </label>
                <div className="flex items-center">
                  <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-gray-500 text-sm">
                    /
                  </span>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 outline-none lowercase"
                    placeholder="ex: fazendas-brasil"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                      })
                    }
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Endereço de acesso: seussistema.com/{formData.slug || '...'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domínio Customizado (Opcional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="ex: imobiliaria.com.br"
                  value={formData.custom_domain}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      custom_domain: e.target.value.toLowerCase().trim(),
                    })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Aponte o DNS do domínio para o IP da plataforma.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail do Responsável
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="dono@imobiliaria.com"
                  value={formData.owner_email}
                  onChange={(e) =>
                    setFormData({ ...formData, owner_email: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usado para identificar o dono ao logar.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha (deixe em branco para não alterar)
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Min. 6 caracteres"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plano de Assinatura
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.plan_id}
                  onChange={(e) =>
                    setFormData({ ...formData, plan_id: e.target.value })
                  }
                >
                  <option value="">Selecione um plano...</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - R$ {plan.price_monthly}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="active">Ativo</option>
                  <option value="suspended">Suspenso</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nicho de Atuação
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.niche}
                  onChange={(e) =>
                    setFormData({ ...formData, niche: e.target.value })
                  }
                >
                  <option value="rural">Rural (Fazendas, SIGEF, CAR)</option>
                  <option value="traditional">Urbano (Casas, Apartamentos, Locação)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Define o dashboard padrão e os campos do formulário.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  {formLoading ? (
                    'Salvando...'
                  ) : (
                    <>
                      <Save size={18} /> Salvar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManager;
