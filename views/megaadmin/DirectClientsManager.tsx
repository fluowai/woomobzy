import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { callApi } from '@/src/lib/api';
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
  Trash2,
  Key,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface DirectClient {
  id: string;
  name: string;
  slug?: string;
  status: string;
  owner_name?: string;
  owner_email?: string;
  created_at: string;
  niche?: string;
  tenant_count?: number;
}

const DirectClientsManager: React.FC = () => {
  const { impersonateOrganization } = useAuth();
  const [directClients, setdirectClients] = useState<DirectClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [setupInfo, setSetupInfo] = useState<{
    email: string;
    password?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    owner_name: '',
    owner_email: '',
    password: '',
    niche: 'both',
  });

  useEffect(() => {
    fetchdirectClients();
  }, []);

  const fetchdirectClients = async () => {
    try {
      setLoading(true);
      const data = await callApi('/api/mega/direct-clients');
      setdirectClients(data.clients || []);
      setErrorMsg(null);
    } catch (error: any) {
      logger.error('Error fetching directClients:', error);
      setErrorMsg(error.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (DirectClient?: DirectClient) => {
    setSetupInfo(null);
    if (DirectClient) {
      setEditingId(DirectClient.id);
      setFormData({
        name: DirectClient.name,
        slug: DirectClient.slug || '',
        owner_name: DirectClient.owner_name || '',
        owner_email: DirectClient.owner_email || '',
        password: '',
        niche:
          DirectClient.niche === 'rural'
            ? 'rural'
            : DirectClient.niche === 'both'
              ? 'both'
              : 'traditional',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        slug: '',
        owner_name: '',
        owner_email: '',
        password: '',
        niche: 'both',
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
      };

      if (editingId) {
        await callApi(`/api/mega/direct-clients/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setIsModalOpen(false);
      } else {
        const response = await callApi('/api/mega/direct-clients', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSetupInfo({
          email: formData.owner_email || '',
          password: response.setup_password || formData.password,
        });
      }

      await fetchdirectClients();
    } catch (error: any) {
      logger.error('Error saving DirectClient:', error);
      alert(
        `Erro ao salvar DirectClient: ${error.message || 'Erro desconhecido'}`
      );
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Deseja alterar o status para ${newStatus}?`)) return;

    try {
      await callApi(`/api/mega/direct-clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchdirectClients();
    } catch (error: any) {
      alert(`Erro ao atualizar status: ${error.message}`);
    }
  };

  const deleteDirectClient = async (id: string, name: string) => {
    if (
      !confirm(
        `Tem certeza que deseja EXCLUIR o DirectClient "${name}"?\n\nIsso tambem excluirá todas as imobiliárias associadas.`
      )
    )
      return;
    if (!confirm(`Ultima confirmacao: Excluir "${name}" permanentemente?`))
      return;

    try {
      await callApi(`/api/mega/direct-clients/${id}`, { method: 'DELETE' });
      fetchdirectClients();
    } catch (error: any) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  const filtered = directClients.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
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
            Gerenciar directClients
          </h1>
          <p className="text-gray-500">
            Super Admins / Whitelabels que gerenciam imobiliárias.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar DirectClient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none w-64"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            <Plus size={20} /> Novo DirectClient
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                DirectClient
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Responsável
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nicho
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Imobiliárias
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
                  Nenhum DirectClient encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((DirectClient) => (
                <tr
                  key={DirectClient.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {DirectClient.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {DirectClient.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs text-purple-600">
                      {DirectClient.slug || '-'}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">
                        {DirectClient.owner_name ||
                          (DirectClient.owner_email
                            ? DirectClient.owner_email.split('@')[0]
                            : '-')}
                      </span>
                      {DirectClient.owner_name && (
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                          {DirectClient.owner_email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        DirectClient.niche === 'rural'
                          ? 'bg-green-100 text-green-700'
                          : DirectClient.niche === 'both'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {DirectClient.niche === 'both'
                        ? 'Ambos (Híbrido)'
                        : DirectClient.niche || 'traditional'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className="font-bold text-gray-900">
                      {DirectClient.tenant_count ?? '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        DirectClient.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {DirectClient.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() =>
                        toggleStatus(DirectClient.id, DirectClient.status)
                      }
                      className={`p-1.5 rounded hover:bg-gray-100 mr-2 ${
                        DirectClient.status === 'active'
                          ? 'text-red-500'
                          : 'text-green-500'
                      }`}
                      title={
                        DirectClient.status === 'active'
                          ? 'Suspender'
                          : 'Ativar'
                      }
                    >
                      {DirectClient.status === 'active' ? (
                        <Ban size={18} />
                      ) : (
                        <CheckCircle size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenModal(DirectClient)}
                      className="p-1.5 text-blue-500 rounded hover:bg-gray-100"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={async () => {
                        const reason = prompt(
                          `Motivo do acesso à conta de "${DirectClient.name}"?`,
                          'Suporte Técnico'
                        );
                        if (!reason) return;

                        try {
                          await impersonateOrganization(DirectClient.id);
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
                      onClick={() =>
                        deleteDirectClient(DirectClient.id, DirectClient.name)
                      }
                      className="p-1.5 text-red-500 rounded hover:bg-gray-100"
                      title="Excluir"
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                {setupInfo
                  ? 'Whitelabel Criado com Sucesso!'
                  : editingId
                    ? 'Editar DirectClient'
                    : 'Novo Whitelabel'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {setupInfo ? (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Tudo pronto! Plataforma liberada.
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    O Whitelabel foi criado no plano{' '}
                    <strong className="text-purple-600">Enterprise</strong> com
                    todas as funções ativas.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    Link de Setup Guiado
                  </p>
                  <p className="text-sm text-slate-600 mb-2">
                    Envie este link para o dono do Whitelabel. Ele mesmo
                    configurará a senha, logo e cores:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}/setup-whitelabel?email=${encodeURIComponent(setupInfo.email)}&t=${setupInfo.password}`}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/setup-whitelabel?email=${encodeURIComponent(setupInfo.email)}&t=${setupInfo.password}`
                        );
                        alert('Link copiado!');
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-bold shrink-0"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  Fechar Janela
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Ex: Imobiliária Central"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug (URL)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="ex: imob-central"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) =>
                      setFormData({ ...formData, owner_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email do Responsável *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.owner_email}
                    onChange={(e) =>
                      setFormData({ ...formData, owner_email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha Provisória (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      placeholder="Se vazio, será gerada automaticamente"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Essa senha não precisa ser enviada. Usaremos um Link de
                      Ativação Guiado.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nicho Padrão
                  </label>
                  <select
                    value={formData.niche}
                    onChange={(e) =>
                      setFormData({ ...formData, niche: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="both">
                      Ambos (Urbano e Rural) - Completo
                    </option>
                    <option value="traditional">
                      Apenas Urbano / Tradicional
                    </option>
                    <option value="rural">Apenas Rural</option>
                  </select>
                </div>

                {!editingId && (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex gap-3 items-start">
                    <CheckCircle
                      size={20}
                      className="text-purple-600 shrink-0 mt-0.5"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-purple-900">
                        Plano Enterprise Ativo
                      </h4>
                      <p className="text-xs text-purple-700 mt-1">
                        Ao criar, esta plataforma já nascerá com todas as
                        funcionalidades liberadas e sem restrições.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-60"
                  >
                    <Save size={18} />
                    {formLoading
                      ? 'Processando...'
                      : editingId
                        ? 'Salvar'
                        : 'Criar & Gerar Link'}
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

export default DirectClientsManager;
