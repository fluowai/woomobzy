import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWooSettings, updateWooSettings } from '../../../services/wooControl';

export const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    platform_name: '',
    support_email: '',
    maintenance_mode: false,
    global_openai_key: '',
    global_gemini_key: '',
    global_groq_key: '',
    global_anthropic_key: '',
    global_openrouter_key: '',
  });

  useEffect(() => {
    let active = true;
    fetchWooSettings()
      .then((s) => {
        if (!active) return;
        setForm({
          platform_name: s.platform_name || '',
          support_email: s.support_email || '',
          maintenance_mode: Boolean(s.maintenance_mode),
          global_openai_key: s.global_openai_key || '',
          global_gemini_key: s.global_gemini_key || '',
          global_groq_key: s.global_groq_key || '',
          global_anthropic_key: s.global_anthropic_key || '',
          global_openrouter_key: s.global_openrouter_key || '',
        });
      })
      .catch((err: any) => {
        toast.error(err.message || 'Erro ao carregar configurações globais');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateWooSettings(form);
      toast.success('Configurações globais salvas com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <SettingsIcon size={24} className="text-[#d4af37]" />
            Configurações da Plataforma
          </h2>
          <p className="text-sm text-[#9097A5] mt-1">
            Modo de manutenção e chaves globais de IA (SaaS Settings).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-10 rounded-xl border text-center text-[#9097A5]" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <Loader2 className="animate-spin mx-auto mb-2" size={24} />
          Carregando configurações...
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="p-6 rounded-xl border space-y-6"
          style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
        >
          <div className="flex items-center justify-between p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-amber-400" size={20} />
              <div>
                <p className="text-sm font-semibold text-white">Modo de Manutenção</p>
                <p className="text-xs text-[#9097A5]">
                  Sinaliza manutenção global para monitoramento e clientes.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.maintenance_mode}
              onChange={(e) => setForm((f) => ({ ...f, maintenance_mode: e.target.checked }))}
              className="h-5 w-5 accent-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9097A5] mb-1">Nome Comercial</label>
              <input
                type="text"
                value={form.platform_name}
                onChange={(e) => setForm((f) => ({ ...f, platform_name: e.target.value }))}
                placeholder="WooTech Imob"
                className="w-full px-3 py-2 rounded-lg bg-[#080A0F] border border-[#252A35] text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9097A5] mb-1">E-mail de Suporte</label>
              <input
                type="email"
                value={form.support_email}
                onChange={(e) => setForm((f) => ({ ...f, support_email: e.target.value }))}
                placeholder="suporte@wootech.com.br"
                className="w-full px-3 py-2 rounded-lg bg-[#080A0F] border border-[#252A35] text-white text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#252A35]">
            <h3 className="text-sm font-semibold text-white">Chaves Globais de Fallback LLM</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'global_gemini_key', label: 'Google Gemini API Key' },
                { key: 'global_openai_key', label: 'OpenAI API Key' },
                { key: 'global_groq_key', label: 'Groq API Key' },
                { key: 'global_anthropic_key', label: 'Anthropic API Key' },
                { key: 'global_openrouter_key', label: 'OpenRouter API Key' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-[#9097A5] mb-1">{field.label}</label>
                  <input
                    type="password"
                    value={(form as any)[field.key]}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 rounded-lg bg-[#080A0F] border border-[#252A35] text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#d4af37] text-black text-sm font-bold hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar Configurações
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
