import { logger } from '@/utils/logger';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
logger.info('Index.tsx: Finding root element...', rootElement);

if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

logger.info('Index.tsx: Creating root...');
const root = ReactDOM.createRoot(rootElement);

logger.info('Index.tsx: Rendering App...');
const publicSiteHosts = new Set(['okaimoveis.com.br', 'www.okaimoveis.com.br']);
const isPublicSiteHost = typeof window !== 'undefined' && publicSiteHosts.has(window.location.hostname);

if (isPublicSiteHost && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch((error) => logger.warn('Falha ao remover service worker do site público:', error));
} else {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onOfflineReady() {
      logger.info('PWA pronta para uso offline.');
    },
  });
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
