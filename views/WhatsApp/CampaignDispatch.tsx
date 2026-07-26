import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Loader2, CheckCircle2, AlertCircle, Clock,
  Zap, RefreshCw, Shield, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/services/supabase';

interface CampaignDispatchProps {
  campaign: {
    id: string;
    status: string;
    sent_count: number;
    failed_count: number;
    contacts_summary: { pending: number; sent: number; failed: number; blacklisted: number };
    dispatcher: { running: boolean; sent?: number; failed?: number };
    instances: any[];
    daily_limit_per_instance?: number;
    min_delay_seconds?: number;
    max_delay_seconds?: number;
    working_hours_start?: number;
    working_hours_end?: number;
  };
  onRefresh: () => void;
}

export default function CampaignDispatch({ campaign, onRefresh }: CampaignDispatchProps) {
  const [progress, setProgress] = useState({
    running: campaign.dispatcher?.running || false,
    sent: campaign.dispatcher?.sent || campaign.sent_count || 0,
    failed: campaign.dispatcher?.failed || campaign.failed_count || 0,
  });
  const [loading, setLoading] = useState(false);

  const isRunning = progress.running;
  const total = campaign.contacts_summary.pending + campaign.contacts_summary.sent + campaign.contacts_summary.failed + campaign.contacts_summary.blacklisted;
  const completed = progress.sent + progress.failed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const pollProgress = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/campaigns/${campaign.id}/dispatch/progress`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProgress({
          running: data.running,
          sent: data.sent,
          failed: data.failed,
        });
        if (!data.running && isRunning) {
          onRefresh();
        }
      }
    } catch {}
  }, [campaign.id, isRunning, onRefresh]);

  // Poll every 5s when running
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(pollProgress, 5000);
    return () => clearInterval(interval);
  }, [isRunning, pollProgress]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/campaigns/${campaign.id}/dispatch/start`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Disparo iniciado com ${data.instances} instância(s)`);
      setProgress((prev) => ({ ...prev, running: true }));
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/campaigns/${campaign.id}/dispatch/pause`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Campanha pausada');
      setProgress((prev) => ({ ...prev, running: false }));
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isEditable = campaign.status === 'draft' || campaign.status === 'paused' || campaign.status === 'running';

  return (
    <div>
      <h2 className="font-semibold mb-4">Controle de Disparo</h2>

      {/* Status Card */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isRunning ? (
              <span className="flex items-center gap-2 text-green-400 text-sm">
                <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                Disparo em andamento
              </span>
            ) : campaign.status === 'completed' ? (
              <span className="flex items-center gap-2 text-blue-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Campanha concluída
              </span>
            ) : (
              <span className="flex items-center gap-2 text-gray-400 text-sm">
                <Clock className="w-4 h-4" />
                {campaign.status === 'paused' ? 'Pausada' : 'Aguardando início'}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {isEditable && !isRunning && (
              <button
                onClick={handleStart}
                disabled={loading || campaign.instances?.length === 0}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 px-4 py-2 rounded-lg transition text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Iniciar
              </button>
            )}
            {isRunning && (
              <button
                onClick={handlePause}
                disabled={loading}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-40 px-4 py-2 rounded-lg transition text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                Pausar
              </button>
            )}
            <button
              onClick={() => { pollProgress(); onRefresh(); }}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Progresso</span>
            <span>{percent}% ({completed}/{total})</span>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Enviados"
            value={progress.sent}
            icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
          />
          <StatCard
            label="Falhas"
            value={progress.failed}
            icon={<AlertCircle className="w-4 h-4 text-red-400" />}
          />
          <StatCard
            label="Pendentes"
            value={campaign.contacts_summary.pending}
            icon={<Clock className="w-4 h-4 text-yellow-400" />}
          />
          <StatCard
            label="Blacklist"
            value={campaign.contacts_summary.blacklisted}
            icon={<Shield className="w-4 h-4 text-gray-400" />}
          />
        </div>
      </div>

      {/* Anti-Ban Config Summary */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Regras Anti-Ban
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 text-xs">Delay</span>
            <p className="text-white">
              {campaign.min_delay_seconds || 45}s – {campaign.max_delay_seconds || 180}s
            </p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Limite/dia</span>
            <p className="text-white">{campaign.daily_limit_per_instance || 50} por instância</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Horário</span>
            <p className="text-white">
              {String(campaign.working_hours_start ?? 8).padStart(2, '0')}h – {String(campaign.working_hours_end ?? 20).padStart(2, '0')}h
            </p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Instâncias</span>
            <p className="text-white flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              {campaign.instances?.length || 0} ativas
            </p>
          </div>
        </div>
      </div>

      {campaign.instances?.length === 0 && (
        <div className="mt-4 flex items-center gap-2 text-yellow-400 text-sm bg-yellow-900/20 rounded-lg p-3 border border-yellow-800/50">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Atribua pelo menos uma instância WhatsApp na aba "Instâncias" antes de iniciar o disparo.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}
