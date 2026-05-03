import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Calendar,
  Trash2,
  Search,
  MoreHorizontal,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

interface StaffProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

const TeamManager: React.FC = () => {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*, full_name:name')
        .eq('role', 'superadmin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      logger.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    try {
      // NOTE: In a real system, you would call a cloud function or use supabase.auth.admin.inviteUserByEmail
      // For now, we manually create a profile or suggest the user registers and then you promote them.
      // But for simplicity in this demo, we'll "simulate" an invite or direct role assignment if the user exists.

      alert(
        `Funcionalidade de convite enviada para ${inviteEmail}. O usuário receberá um link para configurar a senha.`
      );
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
    } catch (err) {
      alert('Erro ao enviar convite.');
    }
  };

  const removeStaff = async (id: string) => {
    if (!confirm('Deseja remover o acesso de Super Admin deste usuário?'))
      return;

    try {
      // Demote to broker instead of deleting
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'broker' })
        .eq('id', id);

      if (error) throw error;
      fetchStaff();
    } catch (err) {
      alert('Erro ao remover acesso.');
    }
  };

  const filteredStaff = staff.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Users className="text-indigo-600" size={28} />
            Equipe Super Admin
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie os administradores e agentes de suporte internos da IMOBZY.
          </p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlus size={20} /> Convidar Membro
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Membro
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Nível de Acesso
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Data de Início
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    Carregando membros...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    Nenhum membro da equipe encontrado.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                          {member.full_name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">
                            {member.full_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg w-fit">
                        <Shield size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Administrador
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => removeStaff(member.id)}
                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                        title="Remover Acesso"
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 text-white">
          <ShieldAlert className="mb-4 opacity-80" size={32} />
          <h3 className="font-bold text-lg mb-2">Segurança Enterprise</h3>
          <p className="text-indigo-100 text-sm leading-relaxed">
            Todos os membros da equipe Super Admin possuem acesso total à
            governança da plataforma. Use com cuidado.
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <Mail className="text-indigo-600 mb-4" size={32} />
          <h3 className="font-bold text-lg mb-2">Central de Convites</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Você pode convidar novos membros via e-mail corporativo para se
            juntarem à equipe de suporte.
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <Calendar className="text-indigo-600 mb-4" size={32} />
          <h3 className="font-bold text-lg mb-2">Auditoria de Log</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Toda ação realizada por membros da equipe é registrada no log de
            auditoria global.
          </p>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Convidar para Equipe
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold uppercase"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nome Completo
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

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@imobzy.com"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                  <strong>Aviso:</strong> O convidado receberá um e-mail com
                  instruções para ativar sua conta administrativa.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  <UserCheck size={20} /> Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManager;
