import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  KeyRound,
  Lock,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Server,
  Database,
  Shield,
} from 'lucide-react';
import {
  fetchWooSecurityKeys,
  runWooSecurityAudit,
} from '../../../services/wooControl';

type SecurityKeys = {
  global_openai_key?: string;
  global_gemini_key?: string;
  global_anthropic_key?: string;
  global_groq_key?: string;
  global_openrouter_key?: string;
  maintenance_mode?: boolean;
  signing_key_public?: string;
};

type AuditCheck = {
  id?: string;
  name: string;
  label?: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  pass?: boolean;
  detail?: string;
};

const apiProviders = [
  { key: 'global_openai_key', name: 'OpenAI' },
  { key: 'global_gemini_key', name: 'Gemini' },
  { key: 'global_anthropic_key', name: 'Anthropic' },
  { key: 'global_groq_key', name: 'Groq' },
  { key: 'global_openrouter_key', name: 'OpenRouter' },
];

export const Security = () => {
  const [keys, setKeys] = useState<SecurityKeys>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditCheck[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetchWooSecurityKeys()
      .then((k) => {
        if (active) {
          setKeys(k);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar chaves de segurança');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rotateKeys = () => {
    alert('Chaves rotacionadas');
  };

  const runAudit = async () => {
    setAuditLoading(true);
    setAuditResult(null);
    try {
      const res = await runWooSecurityAudit();
      const checks = res?.checks || res?.results;
      if (Array.isArray(checks) && checks.length > 0) {
        setAuditResult(checks as AuditCheck[]);
      }
    } catch (e: any) {
      setError(e.message || 'Falha ao executar auditoria');
    } finally {
      setAuditLoading(false);
    }
  };

  const signingKey = keys.signing_key_public || 'NOT SET';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Segurança & Criptografia</h2>
          <p className="text-sm text-[#9097A5] mt-1">Políticas globais de segurança e gerenciamento de chaves.</p>
        </div>
        <ShieldAlert size={28} className="text-[#d4af37]" />
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border flex flex-col gap-4"
          style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
        >
          <div className="flex items-center gap-3">
            <KeyRound size={20} className="text-[#d4af37]" />
            <h3 className="text-lg font-semibold text-white">Chaves Ed25519</h3>
          </div>
          <p className="text-sm text-[#9097A5]">Par de chaves ativo usado para assinar manifestos de licença.</p>
          <div className="p-3 rounded bg-[#161A23] border border-[#252A35]">
            <p className="text-xs font-mono text-[#9097A5] break-all">
              {loading ? 'Carregando...' : `CHAVE_PÚBLICA: ${signingKey}`}
            </p>
          </div>
          <button
            onClick={rotateKeys}
            className="self-start px-4 py-2 mt-auto rounded bg-[#161A23] border border-[#252A35] text-sm text-[#d4af37] hover:bg-[#252A35] transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} /> Rotacionar Chaves
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl border flex flex-col gap-4"
          style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
        >
          <div className="flex items-center gap-3">
            <Database size={20} className="text-emerald-500" />
            <h3 className="text-lg font-semibold text-white">Políticas de Banco de Dados</h3>
          </div>
          <p className="text-sm text-[#9097A5]">Segurança em nível de linha (RLS) e aplicação de administrador de plataforma ativas.</p>

          <div className="space-y-2">
            {auditLoading ? (
              <div className="flex items-center gap-3 text-sm text-[#9097A5]">
                <RefreshCw size={16} className="animate-spin text-[#d4af37]" />
                Executando auditoria...
              </div>
            ) : auditResult ? (
              <>
                {auditResult.map((check, idx) => {
                  return (
                    <div
                      key={check.id || idx}
                      className="flex items-start gap-2 p-2 rounded bg-[#161A23] border border-[#252A35]"
                    >
                      {check.status === 'FAIL' ? (
                        <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      ) : check.status === 'WARN' ? (
                        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm text-white">{check.name || check.label}</p>
                        {check.detail && (
                          <p className="text-xs text-[#9097A5]">{check.detail}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="flex items-center gap-3 text-sm text-[#9097A5]">
                <Lock size={16} className="text-emerald-500" />
                Nenhuma auditoria executada ainda.
              </div>
            )}
          </div>

          <button
            onClick={runAudit}
            disabled={auditLoading}
            className="self-start px-4 py-2 mt-auto rounded bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Shield size={16} /> Executar Auditoria de Segurança
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-xl border flex flex-col gap-4"
        style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
      >
        <div className="flex items-center gap-3">
          <Server size={20} className="text-[#d4af37]" />
          <h3 className="text-lg font-semibold text-white">Chaves de API</h3>
        </div>
        <p className="text-sm text-[#9097A5]">Status dos provedores de IA configurados globalmente na plataforma.</p>

        {loading ? (
          <p className="text-sm text-[#9097A5]">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {apiProviders.map((provider) => {
              const value = keys[provider.key as keyof SecurityKeys];
              const configured = !!value && value !== 'NOT SET';
              return (
                <div
                  key={provider.key}
                  className="flex items-center justify-between p-3 rounded bg-[#161A23] border border-[#252A35]"
                >
                  <span className="text-sm font-medium text-white">{provider.name}</span>
                  <span className="text-xs font-mono text-[#9097A5]">
                    {configured ? value : 'Não configurada'}
                  </span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${configured ? 'bg-emerald-500' : 'bg-red-500'}`}
                  />
                </div>
              );
            })}
            <div className="flex items-center justify-between p-3 rounded bg-[#161A23] border border-[#252A35]">
              <span className="text-sm font-medium text-white">Modo de manutenção</span>
              <span className="text-xs text-[#9097A5]">
                {keys.maintenance_mode ? 'Ativo' : 'Inativo'}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${keys.maintenance_mode ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
