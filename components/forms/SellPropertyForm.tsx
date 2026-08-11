import React, { useState } from 'react';
import { Building, Send, Loader2, DollarSign } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { leadService } from '../../services/leads';
import { logger } from '@/utils/logger';

const SellPropertyForm: React.FC = () => {
  const { settings } = useSettings();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    propertyType: 'FAZENDA',
    location: '',
    area: '',
    value: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const notes = [
        `Tipo de imóvel: ${formData.propertyType}`,
        formData.location ? `Localização: ${formData.location}` : null,
        formData.area ? `Área: ${formData.area} ha` : null,
        formData.value ? `Valor pretendido: R$ ${formData.value}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      await leadService.create({
        organization_id: profile?.organization_id,
        organization_slug: (settings as any)?.organization_slug,
        organization_domain:
          window.location.hostname.replace(/^www\./, '') || undefined,
        site_key: (settings as any)?.site_key,
        referrer_url: window.location.href,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        source: 'Site - Avaliação de Imóvel',
        classification: 'proprietario',
        notes,
      } as any);

      logger.info('Imóvel cadastrado pelo SellPropertyForm:', formData);
      setSuccess(true);
    } catch (err) {
      logger.error('Erro ao cadastrar imóvel no SellPropertyForm:', err);
      setError('Não foi possível enviar. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-slate-900 p-8 rounded-3xl text-center text-white">
        <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <Building size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">Imóvel cadastrado!</h3>
        <p className="text-slate-300">
          Um de nossos corretores especialistas entrará em contato para agendar
          uma avaliação técnica da sua propriedade.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-6 text-indigo-400 hover:text-white underline font-bold px-4 py-2"
        >
          Cadastrar outro imóvel
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 p-8 rounded-3xl shadow-2xl text-white border border-slate-700"
    >
      <div className="mb-8">
        <div className="inline-block px-3 py-1 bg-indigo-500 rounded-lg text-[10px] font-bold uppercase tracking-widest mb-3">
          Proprietários
        </div>
        <h2 className="text-2xl font-bold mb-2">Quer vender ou arrendar?</h2>
        <p className="text-slate-400 text-sm">
          Avaliamos sua propriedade com dados de mercado e conectamos com
          investidores qualificados.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <input
          required
          type="text"
          placeholder="Nome do Proprietário"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            required
            type="tel"
            placeholder="WhatsApp"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="h-px bg-slate-700 my-4" />

        <div className="grid grid-cols-2 gap-4">
          <select
            value={formData.propertyType}
            onChange={(e) =>
              setFormData({ ...formData, propertyType: e.target.value })
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-white"
          >
            <option value="FAZENDA">Fazenda</option>
            <option value="SITIO">Sítio</option>
            <option value="HARAS">Haras</option>
          </select>
          <input
            type="text"
            placeholder="Cidade/UF"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Área Total (ha)"
            value={formData.area}
            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
          />
          <div className="relative">
            <DollarSign
              className="absolute left-3 top-3 text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Valor Pretendido"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-slate-900 hover:bg-indigo-50 font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
        SOLICITAR AVALIAÇÃO
      </button>

      {error && (
        <p className="text-center text-xs font-semibold text-red-400 mt-3">
          {error}
        </p>
      )}
    </form>
  );
};

export default SellPropertyForm;
