import { logger } from '@/utils/logger';
import React from 'react';
import ReactDOM from 'react-dom/client';
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
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(async (registrations) => {
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    })
    .catch((error) => logger.warn('Falha ao remover cache antigo do painel:', error));
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
