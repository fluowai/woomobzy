import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { callApi } from '../../src/lib/api';
import { Save, Check, Mail, Lock, Server } from 'lucide-react';
import { logger } from '@/utils/logger';

const SmtpSettings: React.FC = () => {
  const { settings, refreshSettings } = useSettings();
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpEmail, setSmtpEmail] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (settings?.smtp_config) {
      setSmtpHost(settings.smtp_config.host || '');
      setSmtpPort(settings.smtp_config.port || 465);
      setSmtpSecure(settings.smtp_config.secure ?? true);
      setSmtpEmail(settings.smtp_config.email || '');
      // Password is not loaded to the frontend for security reasons, it'll be updated only if provided
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setTestResult(null);

      const payload = {
        smtp_config: {
          host: smtpHost.trim(),
          port: Number(smtpPort),
          secure: smtpSecure,
          email: smtpEmail.trim(),
          ...(smtpPassword ? { password: smtpPassword } : {}),
        },
      };

      await callApi('/api/settings/smtp', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await refreshSettings();

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      logger.error('Error saving SMTP settings:', error);
      setTestResult({
        success: false,
        message: error.message || 'Erro ao salvar configurações de SMTP',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const payload = {
        host: smtpHost.trim(),
        port: Number(smtpPort),
        secure: smtpSecure,
        email: smtpEmail.trim(),
        password: smtpPassword,
      };

      const res = await callApi('/api/settings/smtp/test', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setTestResult({
        success: true,
        message: res.message || 'Conexão estabelecida com sucesso!',
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Falha ao testar conexão SMTP',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
            <Server size={24} className="text-indigo-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Servidor SMTP Personalizado
            </h3>
            <p className="text-sm text-text-secondary mt-0.5">
              Configure seu servidor de e-mail para que os e-mails transacionais
              (como convites e recuperação de senha) sejam enviados com sua
              própria marca.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
              Host SMTP
            </label>
            <input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.seudominio.com.br"
              className="input-premium font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
              Porta
            </label>
            <input
              type="number"
              value={smtpPort}
              onChange={(e) => setSmtpPort(Number(e.target.value))}
              placeholder="465"
              className="input-premium font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
              E-mail de Envio (Remetente)
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                type="email"
                value={smtpEmail}
                onChange={(e) => setSmtpEmail(e.target.value)}
                placeholder="contato@seudominio.com.br"
                className="input-premium pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
              Senha do E-mail
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={
                  settings?.smtp_config
                    ? 'Deixe em branco para não alterar'
                    : 'Sua senha segura'
                }
                className="input-premium pl-10"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <label className="inline-flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
              className="sr-only"
            />
            <span
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${smtpSecure ? 'bg-primary' : 'bg-slate-300'}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${smtpSecure ? 'translate-x-5' : 'translate-x-1'}`}
              />
            </span>
            <span className="text-xs font-semibold text-text-secondary">
              Usar conexão segura (SSL/TLS)
            </span>
          </label>
        </div>

        {testResult && (
          <div
            className={`mt-6 p-4 rounded-xl text-sm font-semibold border flex items-center gap-2 ${testResult.success ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${testResult.success ? 'bg-emerald-500' : 'bg-red-500'}`}
            />
            {testResult.message}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border-subtle flex items-center justify-between">
          <button
            onClick={handleTestConnection}
            disabled={testing || !smtpHost || !smtpEmail}
            className="btn-secondary"
          >
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !smtpHost || !smtpEmail}
            className="btn-primary"
          >
            {saving ? (
              'Salvando...'
            ) : saved ? (
              <>
                <Check size={16} /> Salvo!
              </>
            ) : (
              <>
                <Save size={16} /> Salvar SMTP
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmtpSettings;
