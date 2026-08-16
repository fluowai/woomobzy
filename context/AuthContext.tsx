import { logger } from '@/utils/logger';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  setActiveOrganizationId,
  clearStaleOrganizationData,
  getApiUrl,
} from '../src/lib/api';
import {
  clearImpersonationSession,
  getImpersonationHeaders,
  getStoredImpersonationSession,
  isImpersonationErrorCode,
  persistImpersonationSession,
  shouldRenewImpersonationSession,
  syncImpersonationSessionExpiry,
} from '../src/lib/impersonation';
import { supabase } from '../services/supabase';
import { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  name?: string;
  role: 'admin' | 'broker' | 'superadmin';
  avatar_url?: string;
  organization_id?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    niche: 'rural' | 'traditional';
    custom_domain?: string | null;
    plan_id?: string;
    trial_ends_at?: string;
    subscription_status?: 'trial' | 'active' | 'payment_required' | 'suspended';
    is_reseller?: boolean;
    parent_id?: string | null;
  };
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  impersonateOrganization: (orgId: string, reason: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  isImpersonating: boolean;
  enableDebugMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Track whether INITIAL_SESSION has been processed to debounce SIGNED_IN
  const initialSessionProcessed = React.useRef(false);
  const retryCount = React.useRef(0);
  // Ref to track current profile (avoids stale closure in useEffect)
  const profileRef = React.useRef<UserProfile | null>(null);

  // Keep profileRef in sync with profile state
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Ref to prevent multiple simultaneous profile fetches
  const fetchInProgress = React.useRef<string | null>(null);

  const loadProfile = useCallback(
    async (userId: string) => {
      if (fetchInProgress.current === userId) return;

      clearStaleOrganizationData(userId);

      try {
        fetchInProgress.current = userId;
        const isSilentRefresh = profileRef.current && profileRef.current.id === userId;
        if (!isSilentRefresh) {
          setLoading(true);
        }
        logger.info('📡 [AuthContext] Querying profile for:', userId);

        const queryPromise = supabase
          .from('profiles')
          .select(
            'id, email, name, role, avatar_url, organization_id, created_at'
          )
          .eq('id', userId)
          .limit(1)
          .maybeSingle();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile query timeout')), 30000)
        );

        const { data: profileData, error: profileError } = (await Promise.race([
          queryPromise,
          timeoutPromise,
        ])) as any;

        logger.info(
          '📡 [AuthContext] Profile query resolved. Data:',
          !!profileData,
          'Error:',
          profileError?.message
        );

        if (profileError) {
          if (profileError.code === '401' || profileError.status === 401) {
            logger.warn(
              '[AuthContext] 401 detected, retrying after token refresh...'
            );
            await new Promise((r) => setTimeout(r, 1000));
            fetchInProgress.current = null;
            return loadProfile(userId);
          }
          logger.error('❌ [AuthContext] Error loading profile:', profileError);
          syncActiveOrganization(null, userId);
          setProfile((prev) => (prev && prev.id === userId ? prev : null));
          if (!profileRef.current) setIsImpersonating(false);
        } else if (profileData) {
          logger.info(
            '✅ [AuthContext] Profile core data loaded:',
            profileData.role
          );
          let finalProfile = {
            ...profileData,
            full_name: profileData.full_name || profileData.name || '',
          };

          const impOrgId =
            getStoredImpersonationSession()?.organizationId || null;

          const orgPromise =
            profileData.role === 'superadmin' &&
            impOrgId &&
            impOrgId !== 'null' &&
            impOrgId !== 'undefined'
              ? supabase
                  .from('organizations')
                  .select(
                    'id, name, slug, niche, custom_domain, plan_id, trial_ends_at, subscription_status, is_reseller, parent_id'
                  )
                  .eq('id', impOrgId)
                  .maybeSingle()
              : profileData.organization_id
                ? supabase
                    .from('organizations')
                    .select(
                      'id, name, slug, niche, custom_domain, plan_id, trial_ends_at, subscription_status, is_reseller, parent_id'
                    )
                    .eq('id', profileData.organization_id)
                    .maybeSingle()
                : Promise.resolve({ data: null, error: null });

          const { data: orgData, error: orgError } = await orgPromise;

          if (
            profileData.role === 'superadmin' &&
            impOrgId &&
            impOrgId !== 'null' &&
            impOrgId !== 'undefined'
          ) {
            if (!orgError && orgData) {
              logger.info(
                '✅ [AuthContext] Impersonation active:',
                orgData.name
              );
              finalProfile = {
                ...finalProfile,
                organization_id: orgData.id,
                organization: orgData,
              };
              setIsImpersonating(true);
            } else {
              logger.warn(
                '⚠️ [AuthContext] Impersonation org lookup failed — keeping session for retry:',
                orgError
              );
              // NÃO limpa a sessão: a falha pode ser transitória (timeout,
              // renew da JWT). Mantém isImpersonating=true e guarda o orgId
              // para que NicheRedirect redirecione para o painel correto.
              setIsImpersonating(true);
            }
          } else {
            setIsImpersonating(false);

            if (finalProfile.organization_id) {
              if (!orgError && orgData) {
                finalProfile.organization = orgData;
              } else if (orgError) {
                logger.warn(
                  '[AuthContext] Organization lookup failed:',
                  orgError.message
                );
              }
            }
          }

          logger.info('✅ [AuthContext] Final profile set.');
          syncActiveOrganization(
            finalProfile.organization_id || null,
            finalProfile.id || userId
          );
          setProfile(finalProfile);
        } else {
          logger.warn('⚠️ [AuthContext] Profile query returned no data.');
          syncActiveOrganization(null, userId);
          setProfile((prev) => (prev && prev.id === userId ? prev : null));
        }
      } catch (err: any) {
        logger.error(
          '❌ [AuthContext] Critical exception in loadProfile:',
          err.message
        );

        if (retryCount.current < 2) {
          retryCount.current += 1;
          const delay = retryCount.current * 2000;
          logger.info(
            `🔄 [AuthContext] Retrying profile fetch in ${delay}ms (Attempt ${retryCount.current}/2)...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          fetchInProgress.current = null;
          return loadProfile(userId);
        }

        if (profileRef.current?.id === userId) {
          logger.warn(
            '[AuthContext] Mantendo perfil atual apos timeout/falha temporaria.'
          );
          return;
        }

        syncActiveOrganization(null, userId);
        setProfile((prev) => (prev && prev.id === userId ? prev : null));
      } finally {
        logger.info('🏁 [AuthContext] loadProfile finished.');
        fetchInProgress.current = null;
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // DEBOUNCE FIX: If SIGNED_IN fires before INITIAL_SESSION, skip it.
      if (_event === 'SIGNED_IN' && !initialSessionProcessed.current) {
        if (session?.user) setUser(session.user);
        return;
      }

      if (_event === 'INITIAL_SESSION') {
        initialSessionProcessed.current = true;
      }

      if (session?.user) {
        // Skip redundant events (SIGNED_IN or TOKEN_REFRESHED) if profile is already loaded for this user
        const isRedundant =
          (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') &&
          profileRef.current?.id === session.user.id;

        if (isRedundant) return;

        logger.info(
          '🔄 [AuthContext] Auth Event:',
          _event,
          'User:',
          session?.user?.id
        );

        setUser(session.user);

        // Only reset retryCount on INITIAL_SESSION (not every event)
        if (_event === 'INITIAL_SESSION') {
          retryCount.current = 0;
        }

        scheduleAuthProfileLoad(loadProfile, session.user.id);
      } else {
        logger.info('🔄 [AuthContext] Auth Event: User is null');
        clearImpersonationSession();
        setUser(null);
        setProfile(null);
        setIsImpersonating(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // Renovação proativa: ping leve ao backend para manter a sessão de
  // impersonificação viva. Roda a cada 5 min quando há impersonificação ativa.
  const renewalInterval = React.useRef<number | null>(null);
  useEffect(() => {
    if (!isImpersonating) {
      if (renewalInterval.current) {
        clearInterval(renewalInterval.current);
        renewalInterval.current = null;
      }
      return;
    }

    renewalInterval.current = window.setInterval(
      async () => {
        if (!shouldRenewImpersonationSession()) return;
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.access_token) return;
          const headers = getImpersonationHeaders();
          if (!headers['x-impersonation-session-id']) return;
          await fetch(getApiUrl('/api/admin/organizations'), {
            credentials: 'same-origin',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              ...headers,
            },
          });
        } catch {
          // Silencioso: falha de renovação não deve interromper o UX
        }
      },
      5 * 60 * 1000
    );

    return () => {
      if (renewalInterval.current) {
        clearInterval(renewalInterval.current);
      }
    };
  }, [isImpersonating]);

  const signIn = async (email: string, password: string) => {
    clearImpersonationSession();
    clearStaleOrganizationData();
    setIsImpersonating(false);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        role: 'broker',
      });
    }
  };

  const signOut = async () => {
    clearImpersonationSession();
    syncActiveOrganization(null);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err: any) {
      logger.warn('⚠️ [AuthContext] signOut error (ignored):', err.message);
    }
    // Always clear local state regardless of API result
    setUser(null);
    setProfile(null);
    setIsImpersonating(false);

    // Forcefully clear known Supabase auth keys from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      }
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
    await loadProfile(user.id);
  };

  const impersonateOrganization = async (orgId: string, reason: string) => {
    // Basic check for superadmin (will be enforced by RLS/Backend too)
    // We fetch current role again to be sure
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();

    if (currentProfile?.role !== 'superadmin') throw new Error('Unauthorized');

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new Error('Informe o motivo do acesso em modo suporte.');
    }

    logger.info('🚀 Starting impersonation of:', orgId);
    const response = await setUpImpersonationSession(orgId, trimmedReason);
    persistImpersonationSession(response);
    setIsImpersonating(true);
    await loadProfile(user!.id);
  };

  const stopImpersonation = async () => {
    logger.info('🛑 Stopping impersonation');
    try {
      if (getStoredImpersonationSession()) {
        await setDownImpersonationSession();
      }
    } catch (error: any) {
      if (isImpersonationErrorCode(error?.code)) {
        logger.info(
          '[AuthContext] Impersonação já encerrada no servidor:',
          error?.message || error
        );
      } else {
        logger.warn(
          '[AuthContext] Falha ao revogar impersonação no servidor:',
          error?.message || error
        );
      }
    } finally {
      clearImpersonationSession();
      setIsImpersonating(false);
      if (user) {
        try {
          await loadProfile(user.id);
        } catch {
          syncActiveOrganization(null, user.id);
        }
      } else {
        syncActiveOrganization(null);
      }
    }
  };

  const enableDebugMode = async () => {
    if (profile?.role !== 'superadmin') {
      throw new Error('Apenas SuperAdmins podem ativar o modo de debug.');
    }

    logger.info('🔐 Ativando Modo de Debug Seguro...');

    // In a real world, this would call a backend to get a signed short-lived token
    // For now, we simulate with a session flag that the logger checks
    // The logger.ts already checks for 'secure_support_debug_token'

    // Simulate a JWT-like token for the logger to parse
    const payload = {
      role: 'superadmin',
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      userId: user?.id,
    };
    const token = `debug.${btoa(JSON.stringify(payload))}.signature`;
    sessionStorage.setItem('secure_support_debug_token', token);

    // Audit log (would be sent to backend)
    logger.audit('Debug mode activated by SuperAdmin', { userId: user?.id });

    window.location.reload(); // Reload to apply logger settings
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        impersonateOrganization,
        stopImpersonation,
        isImpersonating,
        enableDebugMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function scheduleAuthProfileLoad(
  loadProfile: (userId: string) => Promise<void>,
  userId: string
): void {
  // Supabase holds its auth lock while notifying subscribers. Deferring the
  // profile query prevents PostgREST from waiting on the same auth callback.
  setTimeout(() => {
    void loadProfile(userId);
  }, 0);
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

function syncActiveOrganization(
  organizationId: string | null,
  userId?: string | null
) {
  setActiveOrganizationId(organizationId, userId);
  if (typeof window === 'undefined') return;
  if (
    organizationId &&
    organizationId !== 'null' &&
    organizationId !== 'undefined'
  ) {
    sessionStorage.setItem('active_organization_id', organizationId);
    if (userId) sessionStorage.setItem('active_organization_user_id', userId);
  } else {
    sessionStorage.removeItem('active_organization_id');
    sessionStorage.removeItem('active_organization_user_id');
  }
}

async function setUpImpersonationSession(orgId: string, reason: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Se já existe uma sessão de impersonificação ativa, inclua os headers
  // atuais para que o servidor saiba que há uma impersonificação em andamento.
  // Isso permite que o servidor revogue a sessão anterior antes de criar a nova,
  // evitando sessões órfãs (problema do acesso aninhado: revenda → imobiliária).
  const currentImpersonationHeaders = getImpersonationHeaders();

  let response = await fetch(getApiUrl('/api/admin/impersonations'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
      ...currentImpersonationHeaders,
    },
    body: JSON.stringify({
      organizationId: orgId,
      reason,
    }),
  });

  // Se o servidor rejeitar por sessão conflitante (já existe uma ativa),
  // tente revogar a sessão anterior e recriar.
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (
      payload?.code === 'IMPERSONATION_SESSION_FORBIDDEN' ||
      payload?.code === 'IMPERSONATION_CONFLICT'
    ) {
      logger.info(
        '🔄 Revogando sessão de impersonificação anterior antes de recriar...'
      );
      const existingSession = getStoredImpersonationSession();
      if (existingSession) {
        try {
          await fetch(getApiUrl('/api/admin/impersonations/current'), {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token
                ? {
                    Authorization: `Bearer ${session.access_token}`,
                  }
                : {}),
              ...getImpersonationHeaders(),
            },
          });
        } catch {
          // ignora erro de revogação — tenta criar mesmo assim
        }
      }
      clearImpersonationSession();

      // Retry: nova requisição sem headers da sessão anterior
      response = await fetch(getApiUrl('/api/admin/impersonations'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          organizationId: orgId,
          reason,
        }),
      });
    }
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.session) {
    throw new Error(payload?.error || 'Erro ao iniciar o modo suporte');
  }

  syncImpersonationSessionExpiry(payload?.session?.expiresAt);

  return payload.session as {
    id: string;
    secret: string;
    expiresAt: string;
    organizationId: string;
  };
}

async function setDownImpersonationSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const activeSession = getStoredImpersonationSession();

  const response = await fetch(getApiUrl('/api/admin/impersonations/current'), {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
      ...(activeSession
        ? {
            'x-impersonation-session-id': activeSession.id,
            'x-impersonation-session-secret': activeSession.secret,
          }
        : {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(
      payload?.error || 'Erro ao encerrar o modo suporte'
    );
    (error as any).code = payload?.code || null;
    throw error;
  }
}
