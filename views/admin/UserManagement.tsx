import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { callApi } from '../../src/lib/api';
import { toast } from 'sonner';

import {
  Check,
  X,
  Shield,
  ShieldAlert,
  User,
  Search,
  RefreshCw,
  Key,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'broker';
  approved: boolean;
  created_at: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filter, setFilter] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  // Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'broker' as 'admin' | 'broker',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await callApi('/api/admin/users');
      setUsers(data.users || []);
    } catch (error) {
      logger.error('Error fetching users:', error);
    }
  };

  const updateUserStatus = async (
    userId: string,
    updates: Partial<UserProfile>
  ) => {
    setProcessing(userId);
    try {
      const data = await callApi(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      // Optimistic update
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
      );
    } catch (error) {
      logger.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário.');
    } finally {
      setProcessing(null);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 6) {
      toast.info('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setProcessing(selectedUser.id);
    try {
      await callApi(`/api/admin/users/${selectedUser.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      });

      toast.success('Senha atualizada com sucesso!');
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error: any) {
      logger.error('Error changing password:', error);
      toast.error(error.message || 'Erro ao alterar senha.');
    } finally {
      setProcessing(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.full_name || !newUserForm.email || !newUserForm.password) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    if (newUserForm.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setProcessing('new');
    try {
      await callApi('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUserForm),
      });

      toast.success('Usuário criado com sucesso!');
      setShowNewUserModal(false);
      setNewUserForm({
        full_name: '',
        email: '',
        password: '',
        role: 'broker',
      });
      fetchUsers();
    } catch (error: any) {
      logger.error('Error creating user:', error);
      toast.error(error.message || 'Erro ao criar usuário.');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (
      !confirm(
        `TEM CERTEZA? Isso excluirá PERMANENTEMENTE o usuário ${user.full_name} e não pode ser desfeito.`
      )
    )
      return;

    setProcessing(user.id);
    try {
      await callApi(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      // Remove from list
      setUsers(users.filter((u) => u.id !== user.id));
      toast.success('Usuário excluído com sucesso.');
    } catch (error: any) {
      logger.error('Error deleting user:', error);
      toast.error(error.message || 'Erro ao excluir usuário.');
    } finally {
      setProcessing(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(filter.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(filter.toLowerCase())
  );

  const pendingUsers = filteredUsers.filter((u) => !u.approved);
  const activeUsers = filteredUsers.filter((u) => u.approved);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
      {/* Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Key className="text-indigo-600" size={20} />
                Alterar Senha
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-4">
                Definindo nova senha para{' '}
                <strong>{selectedUser.full_name}</strong> ({selectedUser.email}
                ).
              </p>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={!!processing || newPassword.length < 6}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
              >
                {processing === selectedUser.id
                  ? 'Salvando...'
                  : 'Salvar Nova Senha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User className="text-indigo-600" size={20} />
                Novo Usuário
              </h3>
              <button
                onClick={() => setShowNewUserModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  value={newUserForm.full_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="joao@imobiliaria.com.br"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nível de Acesso</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as 'admin' | 'broker' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                  <option value="broker">Corretor (Acesso restrito)</option>
                  <option value="admin">Administrador (Acesso total)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Senha Temporária</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing === 'new'}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
                >
                  {processing === 'new' ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <User size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Gestão de Usuários</h2>
            <p className="text-xs text-slate-500">
              Aprove cadastros, defina senhas e permissões.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
          </div>
          <button
            onClick={fetchUsers}
            title="Atualizar"
            className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowNewUserModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            Novo Usuário
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Pending Approvals Section */}
        {pendingUsers.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={16} /> Pendentes de Aprovação (
              {pendingUsers.length})
            </h3>
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-amber-600 font-bold border border-amber-200 shadow-sm">
                      {user.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-white text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200">
                        Solicitado em:{' '}
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateUserStatus(user.id, { approved: true })
                      }
                      disabled={!!processing}
                      className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-600 shadow-sm flex items-center gap-2"
                    >
                      <Check size={14} /> Aprovar
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="px-4 py-2 bg-white text-slate-500 border border-slate-200 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-slate-50 flex items-center gap-2"
                    >
                      <X size={14} /> Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Users List */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Shield size={16} /> Usuários Ativos ({activeUsers.length})
          </h3>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Nível
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">
                            {user.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-700 text-sm">
                              {user.full_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            updateUserStatus(user.id, {
                              role: e.target.value as 'admin' | 'broker',
                            })
                          }
                          disabled={
                            !!processing ||
                            (user.role === 'admin' &&
                              activeUsers.filter((u) => u.role === 'admin')
                                .length === 1)
                          }
                          className="text-xs font-bold uppercase tracking-wider bg-transparent border-none focus:ring-0 cursor-pointer text-slate-600"
                        >
                          <option value="admin">Administrador</option>
                          <option value="broker">Corretor</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600">
                          Ativo
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowPasswordModal(true);
                              setNewPassword('');
                            }}
                            title="Alterar Senha"
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Key size={16} />
                          </button>
                          <button
                            onClick={() =>
                              updateUserStatus(user.id, { approved: false })
                            }
                            title="Desativar Acesso"
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <AlertTriangle size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            title="Excluir Usuário"
                            disabled={
                              user.role === 'admin' &&
                              activeUsers.filter((u) => u.role === 'admin')
                                .length === 1
                            }
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col p-4 bg-slate-50 space-y-4">
              {activeUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      {user.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">
                        {user.full_name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/50 flex flex-col gap-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Nível de Acesso
                      </span>
                      <select
                        value={user.role}
                        onChange={(e) =>
                          updateUserStatus(user.id, {
                            role: e.target.value as 'admin' | 'broker',
                          })
                        }
                        disabled={
                          !!processing ||
                          (user.role === 'admin' &&
                            activeUsers.filter((u) => u.role === 'admin')
                              .length === 1)
                        }
                        className="text-xs font-bold uppercase tracking-wider bg-white border border-slate-200 rounded-lg focus:ring-0 cursor-pointer text-slate-600 py-1 pl-2 pr-6"
                      >
                        <option value="admin">Administrador</option>
                        <option value="broker">Corretor</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Status
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600">
                        Ativo
                      </span>
                    </div>
                  </div>

                  <div className="p-3 border-t border-slate-100 bg-white grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowPasswordModal(true);
                        setNewPassword('');
                      }}
                      className="flex justify-center items-center py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <Key size={18} />
                    </button>
                    <button
                      onClick={() =>
                        updateUserStatus(user.id, { approved: false })
                      }
                      className="flex justify-center items-center py-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                    >
                      <AlertTriangle size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      disabled={
                        user.role === 'admin' &&
                        activeUsers.filter((u) => u.role === 'admin').length ===
                          1
                      }
                      className="flex justify-center items-center py-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
