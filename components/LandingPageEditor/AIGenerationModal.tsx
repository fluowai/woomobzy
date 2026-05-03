import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { X, Sparkles, Loader, Info } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { LandingPageTemplate } from '../../types/landingPage';

interface AIGenerationModalProps {
  onGenerate: (layout: any) => void;
  onClose: () => void;
}

const AIGenerationModal: React.FC<AIGenerationModalProps> = ({ onGenerate, onClose }) => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [niche, setNiche] = useState<'rural' | 'urban'>('rural');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.post('/api/ai/generate-page', {
        prompt,
        niche,
        organizationId: user?.organizationId,
      });

      if (response.data.layout) {
        onGenerate(response.data.layout);
      } else {
        throw new Error('Falha ao gerar layout');
      }
    } catch (err: any) {
      logger.error('Erro ao gerar com IA:', err);
      setError(err.response?.data?.error || 'Erro ao conectar com Namo Bana. Verifique sua chave nas configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white relative">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-md">
                <Sparkles size={14} />
                Namo Bana AI Engine
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Criar com IA</h2>
              <p className="text-indigo-100 max-w-md">
                Descreva o imóvel ou o objetivo da página e nossa IA criará um layout profissional pronto para publicar.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Niche Selector */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setNiche('rural')}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                niche === 'rural'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-100 hover:border-gray-200 text-gray-500'
              }`}
            >
              <span className="text-2xl">🚜</span>
              <span className="font-semibold">Rural</span>
            </button>
            <button
              onClick={() => setNiche('urban')}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                niche === 'urban'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-100 hover:border-gray-200 text-gray-500'
              }`}
            >
              <span className="text-2xl">🏢</span>
              <span className="font-semibold">Urbano</span>
            </button>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider ml-1">
              O que você quer vender?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Uma fazenda de 500 hectares em MT focada em pecuária de corte, com sede luxuosa e pastagens formadas..."
              rows={4}
              className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all resize-none outline-none"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">!</div>
              {error}
            </div>
          )}

          <div className="p-4 bg-blue-50/50 rounded-2xl flex items-start gap-3">
            <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Dica:</strong> Quanto mais detalhes você der sobre a infraestrutura, localização e diferenciais, melhor será o resultado da Namo Bana.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-4 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Gerando com Namo Bana...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Gerar Página Agora
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGenerationModal;
