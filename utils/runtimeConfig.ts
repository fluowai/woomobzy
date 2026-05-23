type RuntimeConfig = {
  VITE_API_URL?: string;
  VITE_WHATSAPP_API_URL?: string;
  VITE_WHATSAPP_WS_URL?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_PANEL_URL?: string;
};

const getRuntimeConfig = (): RuntimeConfig => {
  if (typeof window === 'undefined') return {};
  return ((window as any).__IMOBZY_CONFIG__ || {}) as RuntimeConfig;
};

export const getRuntimeEnv = (key: keyof RuntimeConfig, fallback = ''): string => {
  const runtimeValue = getRuntimeConfig()[key];
  if (runtimeValue && !runtimeValue.includes('__') && !runtimeValue.includes('TROCAR_AQUI')) {
    return runtimeValue;
  }

  const buildValue = (import.meta.env as Record<string, string | undefined>)[key];
  return buildValue || fallback;
};
