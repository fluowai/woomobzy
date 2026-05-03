import { logger } from '@/utils/logger';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { supabase } from '../services/supabase';
import { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'broker' | 'superadmin';
  avatar_url?: string;
  organization_id?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    niche: 'rural' | 'traditional' | 'hybrid';
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
  impersonateOrganization: (orgId: string) => Promise<void>;
  stopImpersonation: () => void;
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

  useEffect(() => {
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      logger.info(
        '🔄 [AuthContext] Auth Event:',
        _event,
        'User:',
        session?.user?.id
      );

      // DEBOUNCE FIX: If SIGNED_IN fires before INITIAL_SESSION, skip it.
      // INITIAL_SESSION is the canonical first event and will follow immediately.
      if (_event === 'SIGNED_IN' && !initialSessionProcessed.current) {
        logger.info(
          '⏭️ [AuthContext] Skipping early SIGNED_IN, waiting for INITIAL_SESSION'
        );
        // Still set the user so we have it ready
        if (session?.user) setUser(session.user);
        return;
      }

      if (_event === 'INITIAL_SESSION') {
        initialSessionProcessed.current = true;
      }

      if (session?.user) {
        setUser(session.user);

        // Skip redundant events (SIGNED_IN or TOKEN_REFRESHED) if profile is already loaded for this user
        const isRedundant =
          (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') &&
          profileRef.current?.id === session.user.id;

        if (isRedundant) {
          logger.info(
            `[AuthContext] Skipping redundant ${_event}, profile already loaded.`
          );
          return;
        }

        // Only reset retryCount on INITIAL_SESSION (not every event)
        if (_event === 'INITIAL_SESSION') {
          retryCount.current = 0;
        }

        await loadProfile(session.user.id);
      } else {
        logger.info('🔄 [AuthContext] Auth Event: User is null');
        setUser(null);
        setProfile(null);
        setIsImpersonating(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Ref to prevent multiple simultaneous profile fetches
  const fetchInProgress = React.useRef<string | null>(null);

  const loadProfile = async (userId: string) => {
    // If already fetching THIS user, don't repeat
    if (fetchInProgress.current === userId) return;

    try {
      fetchInProgress.current = userId;
      // Define a flag to track if we're silently refreshing so we don't flicker the loading state
      const isSilentRefresh = profile && profile.id === userId;
      if (!isSilentRefresh) {
        setLoading(true);
      }
      logger.info('📡 [AuthContext] Querying profile for:', userId);

      // Add a timeout promise to detect if query is hanging
      const queryPromise = supabase
        .from('profiles')
        .select('*, full_name:name, organization:organizations(*)')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise(
        (_, reject) =>
          setTimeout(() => reject(new Error('Profile query timeout')), 30000) // 30s timeout
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
        // Auto-retry on 401 (token refresh race condition)
        if (profileError.code === '401' || profileError.status === 401) {
          logger.warn('[AuthContext] 401 detected, retrying after token refresh...');
          await new Promise(r => setTimeout(r, 1000));
          fetchInProgress.current = null;
          return loadProfile(userId);
        }
        logger.error('❌ [AuthContext] Error loading profile:', profileError);
        setProfile((prev) => (prev && prev.id === userId ? prev : null));
        if (!profile) setIsImpersonating(false);
      } else if (profileData) {
        logger.info(
          '✅ [AuthContext] Profile core data loaded:',
          profileData.role
        );
        let finalProfile = { ...profileData };

        // Handle impersonation
        const impOrgId = sessionStorage.getItem('impersonated_org_id');

        if (
          profileData.role === 'superadmin' &&
          impOrgId &&
          impOrgId !== 'null' &&
          impOrgId !== 'undefined'
        ) {
          logger.info('🚀 [AuthContext] Checking impersonated org:', impOrgId);
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', impOrgId)
            .single();

          if (!orgError && orgData) {
            logger.info('✅ [AuthContext] Impersonation active:', orgData.name);
            finalProfile = {
              ...profileData,
              organization_id: orgData.id,
              organization: orgData,
            };
            setIsImpersonating(true);
          } else {
            logger.warn(
              '⚠️ [AuthContext] Impersonation failed or org not found:',
              orgError
            );
            sessionStorage.removeItem('impersonated_org_id');
            setIsImpersonating(false);
          }
        } else {
          setIsImpersonating(false);
          if (impOrgId === 'null' || impOrgId === 'undefined') {
            sessionStorage.removeItem('impersonated_org_id');
          }
        }

        logger.info('✅ [AuthContext] Final profile set.');
        setProfile(finalProfile);
      } else {
        logger.warn('⚠️ [AuthContext] Profile query returned no data.');
        setProfile((prev) => (prev && prev.id === userId ? prev : null));
      }
    } catch (err: any) {
      logger.error(
        '❌ [AuthContext] Critical exception in loadProfile:',
        err.message
      );

      // AUTO-RETRY LOGIC: If it's a timeout or network error, and we haven't hit max retries
      if (retryCount.current < 2) {
        retryCount.current += 1;
        const delay = retryCount.current * 2000;
        logger.info(
          `🔄 [AuthContext] Retrying profile fetch in ${delay}ms (Attempt ${retryCount.current}/2)...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        fetchInProgress.current = null; // Reset to allow retry
        return loadProfile(userId);
      }

      setProfile((prev) => (prev && prev.id === userId ? prev : null));
    } finally {
      logger.info('🏁 [AuthContext] loadProfile finished.');
      fetchInProgress.current = null;
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    // Clear any existing impersonation data on new login
    sessionStorage.removeItem('impersonated_org_id');
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
    sessionStorage.removeItem('impersonated_org_id');
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err: any) {
      logger.warn('⚠️ [AuthContext] signOut error (ignored):', err.message);
    }
    // Always clear local state regardless of API result
    setUser(null);
    setProfile(null);
    setIsImpersonating(false);
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

  const impersonateOrganization = async (orgId: string) => {
    // Basic check for superadmin (will be enforced by RLS/Backend too)
    // We fetch current role again to be sure
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();

    if (currentProfile?.role !== 'superadmin') throw new Error('Unauthorized');

    logger.info('🚀 Starting impersonation of:', orgId);
    sessionStorage.setItem('impersonated_org_id', orgId);
    await loadProfile(user!.id);
  };

  const stopImpersonation = () => {
    logger.info('🛑 Stopping impersonation');
    sessionStorage.removeItem('impersonated_org_id');
    if (user) loadProfile(user.id);
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
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      userId: user?.id
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
