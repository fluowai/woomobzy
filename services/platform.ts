import { callApi } from '../src/lib/api';

let cachedIp: string | null = null;
let cachedPromise: Promise<string | null> | null = null;

export async function fetchPlatformIp(): Promise<string | null> {
  if (cachedIp !== null) return cachedIp;
  if (!cachedPromise) {
    cachedPromise = (async () => {
      try {
        const data = await callApi('/api/platform/ip', { hideError: true });
        const ip = typeof data?.ip === 'string' ? data.ip.trim() : '';
        cachedIp = ip || null;
        return cachedIp;
      } catch {
        return null;
      }
    })();
  }
  return cachedPromise;
}