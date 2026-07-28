import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  MoreVertical,
  Users,
  Zap,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  sent_count: number;
  failed_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: { label: 'Rascunho', color: 'text-gray-400', bg: 'bg-gray-800/50' },
  running: {
    label: 'Em execução',
    color: 'text-green-400',
    bg: 'bg-green-900/30',
  },
  paused: {
    label: 'Pausada',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/30',
  },
  completed: {
    label: 'Concluída',
    color: 'text-blue-400',
    bg: 'bg-blue-900/30',
  },
  cancelled: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-900/30' },
};

export default function CampaignManager() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      params.set('limit', '100');

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`/api/campaigns?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) throw new Error('Erro ao carregar campanhas');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Nome é obrigatório');
    setCreating(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) throw new Error('Erro ao criar campanha');
      const campaign = await res.json();
      toast.success('Campanha criada');
      setNewName('');
      setShowCreate(false);
      navigate(`/whatsapp/campaigns/${campaign.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta campanha?')) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Erro ao excluir');
      toast.success('Campanha excluída');
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStartDispatch = async (id: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`/api/campaigns/${id}/dispatch/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Disparo iniciado');
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePauseDispatch = async (id: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`/api/campaigns/${id}/dispatch/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Erro ao pausar');
      toast.success('Campanha pausada');
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Megaphone className="w-7 h-7 text-green-400" />
            <h1 className="text-2xl font-bold">Campanhas WhatsApp</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Nova Campanha
          </button>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">
              <h2 className="text-lg font-semibold mb-4">Nova Campanha</h2>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da campanha"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white mb-4 focus:outline-none focus:border-green-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setNewName('');
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar campanha..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-green-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none"
          >
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="running">Em execução</option>
            <option value="paused">Pausada</option>
            <option value="completed">Concluída</option>
          </select>
        </div>

        {/* Campaign List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma campanha encontrada</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((campaign) => {
              const st = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
              return (
                <div
                  key={campaign.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-gray-700 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold truncate">
                        {campaign.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-gray-400 truncate">
                        {campaign.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {campaign.sent_count} enviados
                      </span>
                      {campaign.failed_count > 0 && (
                        <span className="flex items-center gap-1 text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          {campaign.failed_count} falhas
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(campaign.created_at).toLocaleDateString(
                          'pt-BR'
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        navigate(`/whatsapp/campaigns/${campaign.id}`)
                      }
                      className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
                      title="Editar"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {campaign.status === 'draft' ||
                    campaign.status === 'paused' ? (
                      <button
                        onClick={() => handleStartDispatch(campaign.id)}
                        className="p-2 rounded-lg bg-green-800/50 hover:bg-green-700/50 text-green-400 transition"
                        title="Iniciar disparo"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    ) : campaign.status === 'running' ? (
                      <button
                        onClick={() => handlePauseDispatch(campaign.id)}
                        className="p-2 rounded-lg bg-yellow-800/50 hover:bg-yellow-700/50 text-yellow-400 transition"
                        title="Pausar"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : null}

                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="p-2 rounded-lg bg-red-900/30 hover:bg-red-800/50 text-red-400 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
