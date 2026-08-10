import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../src/lib/api';
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
  UserPlus,
  UserCheck,
  CreditCard,
  FileText,
  Wallet,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'broker';
  approved: boolean;
  created_at: string;
  phone?: string | null;
  creci?: string | null;
  commission_rate?: number | null;
  payment_info?: any | null;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  // Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteActiveTab, setInviteActiveTab] = useState<'basic' | 'finance'>('basic');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteCreci, setInviteCreci] = useState('');
  const [inviteCommission, setInviteCommission] = useState('');
  const [invitePixType, setInvitePixType] = useState('cpf_cnpj');
  const [invitePixKey, setInvitePixKey] = useState('');
  const [inviteBank, setInviteBank] = useState('');
  const [inviteAgency, setInviteAgency] = useState('');
  const [inviteAccount, setInviteAccount] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    setInviteSubmitting(true);
    try {
      const payload = {
        email: inviteEmail,
        name: inviteName,
        phone: invitePhone,
        creci: inviteCreci,
        commission_rate: inviteCommission ? parseFloat(inviteCommission) : 0,
        payment_info: {
          pix_type: invitePixType,
          pix_key: invitePixKey,
          bank: inviteBank,
          agency: inviteAgency,
          account: inviteAccount
        }
      };

      const res = await callApi('/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.success) {
        throw new Error(res.error || 'Erro ao convidar corretor.');
      }

      toast.success(
        `Convite enviado para ${inviteEmail}. Perfil criado com sucesso!`
      );
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInvitePhone('');
      setInviteCreci('');
      setInviteCommission('');
      setInvitePixKey('');
      setInviteBank('');
      setInviteAgency('');
      setInviteAccount('');
      
      // Refresh list
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar convite.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*, full_name:name')
        .order('created_at', { ascending: false });

      // Sempre ocultar superadmins (mega admin, super admin) e contas do sistema
      query = query.neq('role', 'superadmin');
      query = query.not(
        'email',
        'in',
        '("admin@imobzy.com","fluowai@gmail.com")'
      );

      // Isolamento total por organização: usuário só vê usuários da própria organização
      if (profile?.organization_id) {
        query = query.eq('organization_id', profile.organization_id);
      } else {
        // Segurança máxima: se não tem org_id, só vê a si mesmo
        query = query.eq('id', profile?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      logger.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (
    userId: string,
    updates: Partial<UserProfile>
  ) => {
    setProcessing(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // Optimistic update
      setUsers(users.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    } catch (error) {
      logger.error('Error updating user:', error);
      alert('Erro ao atualizar usuário.');
    } finally {
      setProcessing(null);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setProcessing(selectedUser.id);
    try {
      await callApi(`/api/admin/users/${selectedUser.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      });

      alert('Senha atualizada com sucesso!');
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error: any) {
      logger.error('Error changing password:', error);
      alert(error.message || 'Erro ao alterar senha.');
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
      alert('Usuário excluído com sucesso.');
    } catch (error: any) {
      logger.error('Error deleting user:', error);
      alert(error.message || 'Erro ao excluir usuário.');
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
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
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
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-4 md:mt-0">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-all shadow-sm text-sm w-full sm:w-auto justify-center"
          >
            <UserPlus size={16} /> Convidar Corretor
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64"
              />
            </div>
            <button
              onClick={fetchUsers}
              className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="text-indigo-600" size={24} />
                Ficha de Cadastro do Corretor
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex border-b border-gray-100 px-6 pt-2 shrink-0">
              <button
                onClick={() => setInviteActiveTab('basic')}
                className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
                  inviteActiveTab === 'basic'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText size={18} />
                Dados Básicos
              </button>
              <button
                onClick={() => setInviteActiveTab('finance')}
                className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
                  inviteActiveTab === 'finance'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Wallet size={18} />
                Financeiro
              </button>
            </div>

            <form onSubmit={handleInvite} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {inviteActiveTab === 'basic' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: João Silva"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          E-mail *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="corretor@imobzy.com"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Telefone / WhatsApp
                        </label>
                        <input
                          type="text"
                          placeholder="(00) 00000-0000"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={invitePhone}
                          onChange={(e) => setInvitePhone(e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          CRECI
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 12345-F"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={inviteCreci}
                          onChange={(e) => setInviteCreci(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <CreditCard size={16} className="text-indigo-500" />
                        Comissionamento Padrão
                      </h4>
                      <div className="w-1/2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Taxa de Comissão (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="Ex: 50"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={inviteCommission}
                          onChange={(e) => setInviteCommission(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <hr className="border-gray-100" />
                    
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Wallet size={16} className="text-indigo-500" />
                        Dados de Pagamento (PIX)
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Tipo de Chave
                          </label>
                          <select
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={invitePixType}
                            onChange={(e) => setInvitePixType(e.target.value)}
                          >
                            <option value="cpf_cnpj">CPF/CNPJ</option>
                            <option value="email">E-mail</option>
                            <option value="phone">Telefone</option>
                            <option value="random">Chave Aleatória</option>
                          </select>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Chave PIX
                          </label>
                          <input
                            type="text"
                            placeholder="Insira a chave"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={invitePixKey}
                            onChange={(e) => setInvitePixKey(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Wallet size={16} className="text-gray-400" />
                        Dados Bancários (Opcional)
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Banco
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Itaú"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={inviteBank}
                            onChange={(e) => setInviteBank(e.target.value)}
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Agência
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 0001"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={inviteAgency}
                            onChange={(e) => setInviteAgency(e.target.value)}
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Conta
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 12345-6"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={inviteAccount}
                            onChange={(e) => setInviteAccount(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-3 items-start mt-6">
                  <Info size={20} className="text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                    O corretor receberá um e-mail com um link para ativar a conta e configurar sua própria senha.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {inviteSubmitting ? (
                    <>Enviando...</>
                  ) : (
                    <><UserCheck size={20} /> Salvar e Convidar</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
