import { logger } from './logger';

const APP_MANIFEST_ID = 'imobfluow-app-manifest';
const APP_MANIFEST_HREF = '/manifest.webmanifest';
const APP_ROUTE_PREFIXES = ['/admin', '/rural', '/urban', '/superadmin', '/onboarding'];
const APP_ROUTE_EXACT = ['/login', '/register', '/impersonate'];

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let reloadOnControllerChangeRegistered = false;

export function isAppPwaRoute(pathname: string) {
  if (APP_ROUTE_EXACT.includes(pathname)) return true;
  return APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function syncAppManifestLink(enabled: boolean) {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById(APP_MANIFEST_ID);

  if (!enabled) {
    existing?.remove();
    return;
  }

  if (existing) return;

  const link = document.createElement('link');
  link.id = APP_MANIFEST_ID;
  link.rel = 'manifest';
  link.href = APP_MANIFEST_HREF;
  document.head.appendChild(link);
}

export function registerAppServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) {
    return Promise.resolve(null);
  }

  if (!reloadOnControllerChangeRegistered) {
    reloadOnControllerChangeRegistered = true;
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update().catch((error) => {
          logger.warn('Falha ao atualizar PWA do aplicativo:', error);
        });

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        return registration;
      })
      .catch((error) => {
        logger.warn('Falha ao registrar PWA do aplicativo:', error);
        return null;
      });
  }

  return registrationPromise;
}
