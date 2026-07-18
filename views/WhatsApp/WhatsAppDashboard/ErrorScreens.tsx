import React from 'react';
import { WifiOff } from 'lucide-react';

interface ServiceUnavailableProps {
  serviceError: string;
  onRetry: () => void;
}

export const ServiceUnavailableScreen: React.FC<ServiceUnavailableProps> = ({ serviceError, onRetry }) => (
  <div className="flex items-center justify-center h-full min-h-[600px]">
    <div className="text-center max-w-md px-6">
      <div className="inline-flex p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-6">
        <WifiOff size={48} className="text-amber-500" />
      </div>
      <h2 className="text-2xl font-bold text-text-primary mb-3">WhatsApp Indisponível</h2>
      <p className="text-text-secondary mb-6 leading-relaxed">
        O painel não conseguiu consultar a API do WhatsApp. Verifique se o backend Node.js está online e se o proxy /api/whatsapp está chegando no servidor.
      </p>
      <div className="bg-bg-hover rounded-xl p-4 text-left text-sm text-text-secondary border border-border mb-6">
        <p className="font-semibold text-text-primary mb-2">Checklist da conexão:</p>
        <ul className="space-y-1.5">
          <li>✅ Frontend chamando /api/whatsapp pelo mesmo domínio</li>
          <li>✅ Backend Node.js online no servidor</li>
          <li>✅ WhatsMeow (Go) rodando internamente em 127.0.0.1:3100</li>
        </ul>
        {serviceError && (
          <p className="mt-3 rounded-lg bg-white/70 border border-border px-3 py-2 text-xs break-words">
            {serviceError}
          </p>
        )}
      </div>
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
      >
        Tentar Novamente
      </button>
    </div>
  </div>
);

interface TenantContextErrorProps {
  tenantContextError: string;
  recovering: boolean;
  onRetry: () => void;
  onRecover: () => void;
}

export const TenantContextErrorScreen: React.FC<TenantContextErrorProps> = ({
  tenantContextError, recovering, onRetry, onRecover,
}) => (
  <div className="flex items-center justify-center h-full min-h-[600px]">
    <div className="text-center max-w-md px-6">
      <div className="inline-flex p-5 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6">
        <WifiOff size={48} className="text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-text-primary mb-3">Organizacao Necessaria</h2>
      <p className="text-text-secondary mb-6 leading-relaxed">
        {tenantContextError}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
        >
          Tentar Novamente
        </button>
        <button
          onClick={onRecover}
          disabled={recovering}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
        >
          {recovering ? 'Recuperando...' : 'Recuperar vinculacao'}
        </button>
        <button
          onClick={() => { window.location.href = '/onboarding'; }}
          className="px-6 py-3 bg-bg-hover text-text-primary border border-border rounded-xl hover:bg-bg-card transition-colors font-medium"
        >
          Ir para onboarding
        </button>
      </div>
    </div>
  </div>
);
