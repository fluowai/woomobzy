import React, { useState } from 'react';
import { X, Wand2, Loader, Globe } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Block } from '../../types/landingPage';

interface AICloneModalProps {
  onClone: (layoutConfig: any) => void;
  onClose: () => void;
}

const AICloneModal: React.FC<AICloneModalProps> = ({ onClone, onClose }) => {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleClone = async () => {
    if (!url) return;

    try {
      setLoading(true);
      setError(null);
      setStatus('Acessando o site...');

      // Call Backend
      const response = await axios.post('/api/ai/clone-site', { 
        url,
        organizationId: user?.organizationId
      });
      
      const layoutData = response.data.layout;
      
      if (!layoutData || !layoutData.blocks) {
        throw new Error('Formato inválido recebido da IA');
      }

      setStatus('Clone realizado com sucesso! Atualizando editor...');
      
      // Pass data back to parent
      onClone(layoutData);
      
    } catch (err: any) {
      console.error('Erro ao clonar:', err);
      setError(err.response?.data?.error || err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Wand2 size={24} />
              AI Site Cloner
            </h2>
            <p className="text-purple-100 text-sm mt-1">
              Copie o layout de qualquer site em segundos
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL do Site para Clonar
          </label>
          <div className="relative mb-4">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="url"
              placeholder="https://exemplo.com.br"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {status && !error && (
             <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-2">
               {loading && <Loader size={14} className="animate-spin" />}
               {status}
             </div>
          )}
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleClone}
              disabled={loading || !url}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Clonando...
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Clonar Site
                </>
              )}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-4 text-center">
            Nota: A IA analisará a estrutura HTML e criará uma versão editável aproximada.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AICloneModal;
