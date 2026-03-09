
import React, { useState } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Search, 
  CheckCircle, 
  ArrowRight,
  RefreshCw,
  Zap
} from 'lucide-react';
import { generateSmartDescription, matchLeadWithProperties } from '../services/geminiService';
import { MOCK_PROPERTIES, MOCK_LEADS } from '../constants';

const AIAssistant: React.FC = () => {
  const [descriptionResult, setDescriptionResult] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [selectedPropId, setSelectedPropId] = useState(MOCK_PROPERTIES[0].id);

  const [matchResult, setMatchResult] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(MOCK_LEADS[0].id);

  const handleGenerateDescription = async () => {
    setIsGeneratingDesc(true);
    const prop = MOCK_PROPERTIES.find(p => p.id === selectedPropId);
    if (prop) {
      const result = await generateSmartDescription(prop);
      setDescriptionResult(result || '');
    }
    setIsGeneratingDesc(false);
  };

  const handleMatchLeads = async () => {
    setIsMatching(true);
    const lead = MOCK_LEADS.find(l => l.id === selectedLeadId);
    if (lead) {
      const result = await matchLeadWithProperties(lead, MOCK_PROPERTIES);
      setMatchResult(result || '');
    }
    setIsMatching(false);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
          <Sparkles size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Imobi AI Studio</h1>
          <p className="text-slate-500 text-lg">Aumente sua produtividade com inteligência artificial avançada.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Copywriting AI */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-50">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="text-yellow-500" size={24} />
              <h2 className="text-xl font-bold text-slate-900">Copywriter Inteligente</h2>
            </div>
            <p className="text-slate-500 mb-6 text-sm">
              Gere descrições persuasivas e otimizadas para seus anúncios automaticamente.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Selecione o Imóvel</label>
                <select 
                  value={selectedPropId}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {MOCK_PROPERTIES.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <button 
                onClick={handleGenerateDescription}
                disabled={isGeneratingDesc}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isGeneratingDesc ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                Gerar Descrição Pro
              </button>
            </div>
          </div>
          <div className="p-8 bg-slate-50 flex-1">
            {descriptionResult ? (
              <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-inner">
                <div className="prose prose-sm text-slate-700 whitespace-pre-wrap">
                  {descriptionResult}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <MessageSquare size={48} className="opacity-20" />
                <p className="text-sm">O resultado aparecerá aqui.</p>
              </div>
            )}
          </div>
        </div>

        {/* Matching AI */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-50">
            <div className="flex items-center gap-2 mb-4">
              <Search className="text-indigo-600" size={24} />
              <h2 className="text-xl font-bold text-slate-900">Lead Matchmaker</h2>
            </div>
            <p className="text-slate-500 mb-6 text-sm">
              Deixe a IA analisar seus leads e encontrar os imóveis perfeitos para fechar negócio.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Selecione o Lead</label>
                <select 
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {MOCK_LEADS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <button 
                onClick={handleMatchLeads}
                disabled={isMatching}
                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isMatching ? <RefreshCw className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                Analisar Oportunidades
              </button>
            </div>
          </div>
          <div className="p-8 bg-slate-50 flex-1">
            {matchResult ? (
              <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-inner">
                <div className="prose prose-sm text-slate-700 whitespace-pre-wrap">
                  {matchResult}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <CheckCircle size={48} className="opacity-20" />
                <p className="text-sm">As recomendações aparecerão aqui.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
