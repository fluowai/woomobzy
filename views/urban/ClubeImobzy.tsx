import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Star,
  Zap,
  Gift,
  Users,
  Award,
  Crown,
  CheckCircle,
  Lock,
  Loader2,
  RefreshCw,
  Medal,
  Flame,
  BarChart2,
  ArrowUp,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { logger } from '@/utils/logger';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────
interface GamificationProfile {
  id: string;
  user_id: string;
  organization_id: string;
  points: number;
  level: string;
  streak_days: number;
  total_sales: number;
  total_rentals: number;
  total_leads_converted: number;
  rank_position?: number;
  full_name?: string;
  avatar_letter?: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  category: 'training' | 'visibility' | 'financial' | 'trophy';
  is_active: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

// ──────────────────────────────────────────────────────────────
// LEVEL SYSTEM
// ──────────────────────────────────────────────────────────────
const LEVELS = [
  {
    name: 'Bronze',
    min: 0,
    max: 499,
    color: 'from-amber-700 to-amber-600',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: '🥉',
  },
  {
    name: 'Prata',
    min: 500,
    max: 1499,
    color: 'from-slate-500 to-slate-400',
    textColor: 'text-slate-500',
    bgColor: 'bg-slate-100',
    icon: '🥈',
  },
  {
    name: 'Ouro',
    min: 1500,
    max: 3999,
    color: 'from-yellow-500 to-yellow-400',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: '🥇',
  },
  {
    name: 'Diamante',
    min: 4000,
    max: 9999,
    color: 'from-blue-500 to-cyan-400',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: '💎',
  },
  {
    name: 'Titânio',
    min: 10000,
    max: Infinity,
    color: 'from-purple-600 to-purple-400',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: '👑',
  },
];

const getLevel = (points: number) =>
  LEVELS.find((l) => points >= l.min && points <= l.max) || LEVELS[0];

const getNextLevel = (points: number) => {
  const idx = LEVELS.findIndex((l) => points >= l.min && points <= l.max);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
};

const getLevelProgress = (points: number) => {
  const current = getLevel(points);
  if (current.max === Infinity) return 100;
  return Math.min(
    100,
    ((points - current.min) / (current.max - current.min)) * 100
  );
};

// ──────────────────────────────────────────────────────────────
// MOCK ACHIEVEMENTS (will be dynamic later)
// ──────────────────────────────────────────────────────────────
const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_sale',
    name: 'Primeira Venda',
    description: 'Feche seu primeiro negócio na plataforma',
    icon: '🎯',
    unlocked: true,
  },
  {
    id: 'streak_7',
    name: 'Semana Perfeita',
    description: 'Acesse o sistema por 7 dias consecutivos',
    icon: '🔥',
    unlocked: true,
    progress: 7,
    target: 7,
  },
  {
    id: 'leads_10',
    name: 'Caçador de Leads',
    description: 'Converta 10 leads em clientes',
    icon: '⚡',
    unlocked: false,
    progress: 4,
    target: 10,
  },
  {
    id: 'rentals_5',
    name: 'Rei do Aluguel',
    description: 'Feche 5 contratos de locação',
    icon: '🏠',
    unlocked: false,
    progress: 2,
    target: 5,
  },
  {
    id: 'site_visits',
    name: 'Digital First',
    description: 'Seu site recebeu 100 visitas',
    icon: '🌐',
    unlocked: false,
    progress: 68,
    target: 100,
  },
  {
    id: 'top3_rank',
    name: 'Pódio',
    description: 'Seja top 3 no ranking mensal',
    icon: '🏆',
    unlocked: false,
  },
];

// ──────────────────────────────────────────────────────────────
// MOCK REWARDS (will be configurable by admin later)
// ──────────────────────────────────────────────────────────────
const DEFAULT_REWARDS: Reward[] = [
  {
    id: 'r1',
    name: 'Destaque no Portal',
    description: 'Seus imóveis ficam em destaque por 7 dias',
    points_required: 200,
    category: 'visibility',
    is_active: true,
  },
  {
    id: 'r2',
    name: 'Curso Online',
    description: 'Acesso a um curso de técnicas de venda',
    points_required: 500,
    category: 'training',
    is_active: true,
  },
  {
    id: 'r3',
    name: 'Voucher R$100',
    description: 'Vale-presente para uso em serviços parceiros',
    points_required: 1000,
    category: 'financial',
    is_active: true,
  },
  {
    id: 'r4',
    name: 'Troféu Anual',
    description: 'Corretor do Ano — troféu físico + certificado',
    points_required: 5000,
    category: 'trophy',
    is_active: true,
  },
];

const categoryIcon: Record<string, string> = {
  training: '📚',
  visibility: '👁️',
  financial: '💰',
  trophy: '🏆',
};

// ──────────────────────────────────────────────────────────────
// POINT ACTIONS INFO
// ──────────────────────────────────────────────────────────────
const POINT_ACTIONS = [
  {
    action: 'Converter lead em cliente',
    points: '+20 pts',
    icon: Users,
    color: 'text-blue-500',
  },
  {
    action: 'Fechar venda',
    points: '+100 pts',
    icon: Trophy,
    color: 'text-yellow-500',
  },
  {
    action: 'Fechar locação',
    points: '+50 pts',
    icon: Award,
    color: 'text-emerald-500',
  },
  {
    action: 'Cadastrar imóvel completo',
    points: '+10 pts',
    icon: CheckCircle,
    color: 'text-primary',
  },
  {
    action: 'Acesso diário ao sistema',
    points: '+5 pts',
    icon: Flame,
    color: 'text-orange-500',
  },
  {
    action: 'Publicar em portais',
    points: '+15 pts',
    icon: Zap,
    color: 'text-purple-500',
  },
];

// ──────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────
const ClubeImobzy: React.FC = () => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<
    'meu-perfil' | 'ranking' | 'resgatar' | 'conquistas'
  >('meu-perfil');
  const [myProfile, setMyProfile] = useState<GamificationProfile | null>(null);
  const [ranking, setRanking] = useState<GamificationProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const orgId = profile?.organization_id || '';
  const userId = profile?.id || '';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load my gamification profile
      const { data: gp } = await (supabase as any)
        .from('gamification_profiles')
        .select('*, profiles(name)')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (gp) {
        const gpAny = gp as any;
        setMyProfile({
          ...gpAny,
          full_name:
            gpAny.profiles?.name || profile?.full_name || 'Corretor',
          avatar_letter: (
            gpAny.profiles?.name ||
            profile?.full_name ||
            'C'
          ).charAt(0),
        });
      } else {
        // Create profile if it doesn't exist
        const newProfile: Partial<GamificationProfile> = {
          user_id: userId,
          organization_id: orgId,
          points: 0,
          level: 'Bronze',
          streak_days: 0,
          total_sales: 0,
          total_rentals: 0,
          total_leads_converted: 0,
        };
        const { data: created } = await (supabase as any)
          .from('gamification_profiles')
          .insert(newProfile)
          .select()
          .single();
        if (created) {
          const c = created as any;
          setMyProfile({
            ...c,
            full_name: profile?.full_name || 'Corretor',
            avatar_letter: (profile?.full_name || 'C').charAt(0),
          });
        }
      }

      // Load ranking
      const { data: rankData } = await (supabase as any)
        .from('gamification_profiles')
        .select('*, profiles(name)')
        .eq('organization_id', orgId)
        .order('points', { ascending: false })
        .limit(10);

      if (rankData) {
        setRanking(
          (rankData as any[]).map((r, idx) => ({
            ...r,
            rank_position: idx + 1,
            full_name: r.profiles?.name || 'Corretor',
            avatar_letter: (r.profiles?.name || 'C').charAt(0),
          }))
        );
      }
    } catch (err) {
      logger.error('Erro ao carregar dados de gamificação:', err);
    }
    setLoading(false);
  }, [userId, orgId, profile]);

  useEffect(() => {
    if (userId && orgId) loadData();
  }, [userId, orgId, loadData]);

  const handleRedeem = async (reward: Reward) => {
    if (!myProfile || myProfile.points < reward.points_required) return;
    setRedeeming(reward.id);
    try {
      // Deduct points and log redemption
      await Promise.all([
        (supabase as any)
          .from('gamification_profiles')
          .update({ points: myProfile.points - reward.points_required })
          .eq('id', myProfile.id),
        (supabase as any).from('gamification_redemptions').insert({
          user_id: userId,
          organization_id: orgId,
          reward_id: reward.id,
          reward_name: reward.name,
          points_spent: reward.points_required,
        }),
      ]);
      setMyProfile((prev) =>
        prev ? { ...prev, points: prev.points - reward.points_required } : prev
      );
    } catch (err) {
      logger.error('Erro ao resgatar recompensa:', err);
    }
    setRedeeming(null);
  };

  const currentLevel = myProfile ? getLevel(myProfile.points) : LEVELS[0];
  const nextLevel = myProfile ? getNextLevel(myProfile.points) : LEVELS[1];
  const progress = myProfile ? getLevelProgress(myProfile.points) : 0;

  const tabs = [
    { id: 'meu-perfil' as const, label: 'Meu Perfil', icon: Star },
    { id: 'ranking' as const, label: 'Ranking', icon: Trophy },
    { id: 'resgatar' as const, label: 'Resgatar', icon: Gift },
    { id: 'conquistas' as const, label: 'Conquistas', icon: Medal },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="h1 flex items-center gap-3 text-slate-900">
            <Trophy className="text-yellow-500" size={30} />
            Clube Imobzy
          </h1>
          <p className="body mt-1 text-slate-500">
            Ganhe pontos, suba de nível e resgate recompensas exclusivas.
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Hero Card */}
      {loading ? (
        <div className="card-premium p-16 text-center">
          <Loader2 size={32} className="animate-spin text-primary mx-auto" />
        </div>
      ) : (
        <div
          className={`rounded-3xl bg-gradient-to-br ${currentLevel.color} p-6 md:p-8 text-white shadow-xl`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur border-4 border-white/30 flex items-center justify-center text-3xl font-bold shadow-lg shrink-0">
              {myProfile?.avatar_letter || '?'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{currentLevel.icon}</span>
                <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest">
                  {currentLevel.name}
                </span>
              </div>
              <h2 className="text-2xl font-bold truncate">
                {myProfile?.full_name || 'Corretor'}
              </h2>
              <p className="text-white/70 text-sm mt-0.5">
                {myProfile?.points?.toLocaleString('pt-BR') || 0} pontos
                acumulados
              </p>

              {/* Progress bar */}
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs text-white/60">
                  <span>{currentLevel.name}</span>
                  {nextLevel && (
                    <span>
                      {nextLevel.name} — faltam{' '}
                      {Math.max(0, nextLevel.min - (myProfile?.points || 0))}{' '}
                      pts
                    </span>
                  )}
                </div>
                <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 shrink-0">
              {[
                {
                  label: 'Vendas',
                  value: myProfile?.total_sales || 0,
                  icon: '🏠',
                },
                {
                  label: 'Locações',
                  value: myProfile?.total_rentals || 0,
                  icon: '🔑',
                },
                {
                  label: 'Sequência',
                  value: `${myProfile?.streak_days || 0}d`,
                  icon: '🔥',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/10 backdrop-blur rounded-2xl p-3 text-center border border-white/20"
                >
                  <div className="text-xl">{s.icon}</div>
                  <div className="text-lg font-bold mt-1">{s.value}</div>
                  <div className="text-[10px] text-white/60 uppercase tracking-wide">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: MEU PERFIL ── */}
      {tab === 'meu-perfil' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Como ganhar pontos */}
          <div className="card-premium p-6 space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Zap size={16} className="text-yellow-500" />
              Como Ganhar Pontos
            </h3>
            <div className="space-y-3">
              {POINT_ACTIONS.map((a) => (
                <div
                  key={a.action}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <a.icon size={16} className={a.color} />
                    <span className="text-sm font-medium text-slate-700">
                      {a.action}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    {a.points}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Níveis */}
          <div className="card-premium p-6 space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Crown size={16} className="text-purple-500" />
              Hierarquia de Níveis
            </h3>
            <div className="space-y-3">
              {LEVELS.map((level) => {
                const isCurrent = currentLevel.name === level.name;
                const isPast = (myProfile?.points || 0) >= level.min;
                return (
                  <div
                    key={level.name}
                    className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'border-primary/30 bg-primary/5 shadow-sm'
                        : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <span className="text-2xl">{level.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">
                        {level.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {level.max === Infinity
                          ? `${level.min.toLocaleString()}+ pts`
                          : `${level.min.toLocaleString()} – ${level.max.toLocaleString()} pts`}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase">
                        Seu nível
                      </span>
                    )}
                    {!isCurrent && isPast && (
                      <CheckCircle size={16} className="text-emerald-500" />
                    )}
                    {!isCurrent && !isPast && (
                      <Lock size={14} className="text-slate-300" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: RANKING ── */}
      {tab === 'ranking' && (
        <div className="card-premium overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 size={16} className="text-primary" />
              Ranking do Mês
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {new Date().toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          {loading ? (
            <div className="p-16 text-center">
              <Loader2
                size={24}
                className="animate-spin text-primary mx-auto"
              />
            </div>
          ) : ranking.length === 0 ? (
            <div className="p-16 text-center">
              <Trophy size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">
                Nenhum corretor com pontos ainda.
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Seja o primeiro do ranking!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {ranking.map((r) => {
                const lv = getLevel(r.points);
                const isMe = r.user_id === userId;
                const medalEmoji =
                  r.rank_position === 1
                    ? '🥇'
                    : r.rank_position === 2
                      ? '🥈'
                      : r.rank_position === 3
                        ? '🥉'
                        : null;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-4 px-5 py-4 transition-colors ${isMe ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-8 text-center">
                      {medalEmoji ? (
                        <span className="text-xl">{medalEmoji}</span>
                      ) : (
                        <span className="text-sm font-bold text-slate-400">
                          #{r.rank_position}
                        </span>
                      )}
                    </div>
                    <div
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${lv.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                    >
                      {r.avatar_letter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-bold truncate ${isMe ? 'text-primary' : 'text-slate-900'}`}
                      >
                        {r.full_name}{' '}
                        {isMe && (
                          <span className="text-[10px] font-bold text-primary/70">
                            (você)
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {lv.icon} {lv.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">
                        {r.points.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-[10px] text-slate-400">pontos</p>
                    </div>
                    {isMe && r.rank_position && r.rank_position <= 3 && (
                      <ArrowUp size={14} className="text-emerald-500" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: RESGATAR ── */}
      {tab === 'resgatar' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
            <Star size={18} className="text-yellow-500 shrink-0" />
            <p className="text-sm text-yellow-800 font-semibold">
              Você tem{' '}
              <strong>
                {myProfile?.points?.toLocaleString('pt-BR') || 0} pontos
              </strong>{' '}
              disponíveis para resgatar.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEFAULT_REWARDS.map((reward) => {
              const canRedeem =
                (myProfile?.points || 0) >= reward.points_required;
              const isRedeeming = redeeming === reward.id;
              return (
                <div
                  key={reward.id}
                  className={`card-premium p-5 flex flex-col gap-4 transition-all ${canRedeem ? 'hover:shadow-lg hover:border-primary/20' : 'opacity-70'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-3xl">
                      {categoryIcon[reward.category]}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${canRedeem ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {canRedeem ? 'Disponível' : 'Bloqueado'}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">
                      {reward.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {reward.description}
                    </p>
                  </div>
                  <div className="mt-auto space-y-2">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Star size={12} className="text-yellow-500" />
                      {reward.points_required.toLocaleString()} pontos
                    </p>
                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canRedeem || isRedeeming}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        canRedeem
                          ? 'bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      } disabled:opacity-60`}
                    >
                      {isRedeeming ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : canRedeem ? (
                        <Gift size={13} />
                      ) : (
                        <Lock size={13} />
                      )}
                      {isRedeeming
                        ? 'Resgatando...'
                        : canRedeem
                          ? 'Resgatar'
                          : `Faltam ${(reward.points_required - (myProfile?.points || 0)).toLocaleString()} pts`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: CONQUISTAS ── */}
      {tab === 'conquistas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENTS.map((a) => (
            <div
              key={a.id}
              className={`card-premium p-5 flex gap-4 transition-all ${a.unlocked ? 'hover:shadow-md hover:border-primary/20' : 'opacity-60 grayscale'}`}
            >
              <div
                className={`text-4xl w-14 h-14 flex items-center justify-center rounded-2xl shrink-0 ${a.unlocked ? 'bg-yellow-50' : 'bg-slate-100'}`}
              >
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <p className="font-bold text-sm text-slate-900 flex-1">
                    {a.name}
                  </p>
                  {a.unlocked && (
                    <CheckCircle
                      size={16}
                      className="text-emerald-500 shrink-0"
                    />
                  )}
                  {!a.unlocked && (
                    <Lock size={14} className="text-slate-300 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">{a.description}</p>
                {!a.unlocked &&
                  a.progress !== undefined &&
                  a.target !== undefined && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Progresso</span>
                        <span>
                          {a.progress}/{a.target}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(a.progress / a.target) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClubeImobzy;
