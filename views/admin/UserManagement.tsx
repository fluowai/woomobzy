import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Check, X, Shield, ShieldAlert, User, Search, RefreshCw, Key, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  // Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, updates: Partial<UserProfile>) => {
    setProcessing(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      
      // Optimistic update
      setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
    } catch (error) {
      console.error('Error updating user:', error);
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session");

        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/admin/users/${selectedUser.id}/password`;

        const res = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ password: newPassword })
        });

        const text = await res.text();
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Servidor retornou erro inesperado (Status ${res.status})`);
        }

        if (data.error) throw new Error(data.error);

        alert('Senha atualizada com sucesso!');
        setShowPasswordModal(false);
        setNewPassword('');
        setSelectedUser(null);
    } catch (error: any) {
        console.error('Error changing password:', error);
        alert(error.message || 'Erro ao alterar senha.');
    } finally {
        setProcessing(null);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`TEM CERTEZA? Isso excluirá PERMANENTEMENTE o usuário ${user.full_name} e não pode ser desfeito.`)) return;
    
    setProcessing(user.id);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session");

        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/admin/users/${user.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Remove from list
        setUsers(users.filter(u => u.id !== user.id));
        alert('Usuário excluído com sucesso.');
    } catch (error: any) {
        console.error('Error deleting user:', error);
        alert(error.message || 'Erro ao excluir usuário.');
    } finally {
        setProcessing(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(filter.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(filter.toLowerCase())
  );

  const pendingUsers = filteredUsers.filter(u => !u.approved);
  const activeUsers = filteredUsers.filter(u => u.approved);

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
                    <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="mb-6">
                    <p className="text-sm text-slate-500 mb-4">
                        Definindo nova senha para <strong>{selectedUser.full_name}</strong> ({selectedUser.email}).
                    </p>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Nova senha (mín. 6 caracteres)"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
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
                        {processing === selectedUser.id ? 'Salvando...' : 'Salvar Nova Senha'}
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
                <p className="text-xs text-slate-500">Aprove cadastros, defina senhas e permissões.</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar por nome ou email..." 
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                />
            </div>
            <button onClick={fetchUsers} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">
                <RefreshCw size={18} />
            </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Pending Approvals Section */}
        {pendingUsers.length > 0 && (
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert size={16} /> Pendentes de Aprovação ({pendingUsers.length})
                </h3>
                <div className="space-y-3">
                    {pendingUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-amber-600 font-bold border border-amber-200 shadow-sm">
                                    {user.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{user.full_name}</p>
                                    <p className="text-xs text-slate-500">{user.email}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-white text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200">
                                        Solicitado em: {new Date(user.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => updateUserStatus(user.id, { approved: true })}
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
            
            <div className="bg-white border md:border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 hidden md:table-header-group">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Nível</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeUsers.map(user => (
                            <tr key={user.id} className="group hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">
                                            {user.full_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-700 text-sm">{user.full_name}</p>
                                            <p className="text-xs text-slate-400">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <select 
                                        value={user.role}
                                        onChange={(e) => updateUserStatus(user.id, { role: e.target.value as 'admin' | 'broker' })}
                                        disabled={!!processing || user.role === 'admin' && activeUsers.filter(u => u.role === 'admin').length === 1} // Prevent removing last admin
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
                                            onClick={() => updateUserStatus(user.id, { approved: false })}
                                            title="Desativar Acesso"
                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                        >
                                            <AlertTriangle size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(user)}
                                            title="Excluir Usuário"
                                            disabled={user.role === 'admin' && activeUsers.filter(u => u.role === 'admin').length === 1}
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
        </div>

      </div>
    </div>
  );
};

export default UserManagement;
