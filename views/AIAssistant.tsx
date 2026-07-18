import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  Search,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Zap,
  DollarSign,
} from 'lucide-react';
import {
  generateSmartDescription,
  matchLeadWithProperties,
  generateCollectionMessage,
} from '../services/geminiService';
import { propertyService } from '../services/properties';
import { leadService } from '../services/leads';
import type { Lead, Property } from '../types';

const AIAssistant: React.FC = () => {
  const [descriptionResult, setDescriptionResult] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [resourceError, setResourceError] = useState('');
  const [selectedPropId, setSelectedPropId] = useState('');

  const [matchResult, setMatchResult] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  const [collectionResult, setCollectionResult] = useState('');
  const [isGeneratingColl, setIsGeneratingColl] = useState(false);
  const [collectionData, setCollectionData] = useState({
    name: '',
    amount: 0,
    days: 0,
  });

  useEffect(() => {
    const loadResources = async () => {
      try {
        setLoadingResources(true);
        setResourceError('');
        const [loadedProperties, loadedLeads] = await Promise.all([
          propertyService.list(1, 200),
          leadService.list(1, 200),
        ]);
        setProperties(loadedProperties);
        setLeads(loadedLeads);
        setSelectedPropId(loadedProperties[0]?.id || '');
        setSelectedLeadId(loadedLeads[0]?.id || '');
      } catch (error) {
        logger.error('Erro ao carregar dados reais do AI Studio', error);
        setResourceError(
          'Não foi possível carregar imóveis e leads do sistema.'
        );
      } finally {
        setLoadingResources(false);
      }
    };

    void loadResources();
  }, []);

  const handleGenerateDescription = async () => {
    setIsGeneratingDesc(true);
    const prop = properties.find((p) => p.id === selectedPropId);
    if (prop) {
      const result = await generateSmartDescription(prop);
      setDescriptionResult(result || '');
    }
    setIsGeneratingDesc(false);
  };

  const handleMatchLeads = async () => {
    setIsMatching(true);
    const lead = leads.find((l) => l.id === selectedLeadId);
    if (lead) {
      const result = await matchLeadWithProperties(lead, properties);
      setMatchResult(result ? JSON.stringify(result, null, 2) : '');
    }
    setIsMatching(false);
  };

  const handleGenerateCollection = async () => {
    setIsGeneratingColl(true);
    const result = await generateCollectionMessage(
      collectionData.name,
      collectionData.amount,
      collectionData.days
    );
    setCollectionResult(result || '');
    setIsGeneratingColl(false);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
          <Sparkles size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">
            Imobi AI Studio 360°
          </h1>
          <p className="text-slate-500">
            Inteligência artificial para acelerar seu faturamento e regularizar
            sua carteira.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {resourceError && (
          <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {resourceError}
          </div>
        )}
        {/* Copywriting AI */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-50">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="text-yellow-500" size={24} />
              <h2 className="text-xl font-bold text-slate-900">
                Copywriter Inteligente
              </h2>
            </div>
            <p className="text-slate-500 mb-6 text-sm">
              Gere descrições persuasivas para seus anúncios.
            </p>
            <div className="space-y-4">
              <select
                value={selectedPropId}
                onChange={(e) => setSelectedPropId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              >
                <option value="">
                  {loadingResources
                    ? 'Carregando imóveis...'
                    : 'Selecione um imóvel'}
                </option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerateDescription}
                disabled={
                  isGeneratingDesc || loadingResources || !selectedPropId
                }
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
              >
                {isGeneratingDesc ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Zap size={18} />
                )}
                Gerar Descrição Pro
              </button>
            </div>
          </div>
          <div className="p-8 bg-slate-50 flex-1">
            {descriptionResult ? (
              <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
                {descriptionResult}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 py-10">
                <MessageSquare size={48} className="mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest text-center">
                  O resultado aparecerá aqui.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Matching AI */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-50">
            <div className="flex items-center gap-2 mb-4">
              <Search className="text-indigo-600" size={24} />
              <h2 className="text-xl font-bold text-slate-900">
                Lead Matchmaker
              </h2>
            </div>
            <p className="text-slate-500 mb-6 text-sm">
              Encontre os imóveis perfeitos para seus leads.
            </p>
            <div className="space-y-4">
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              >
                <option value="">
                  {loadingResources
                    ? 'Carregando leads...'
                    : 'Selecione um lead'}
                </option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleMatchLeads}
                disabled={
                  isMatching ||
                  loadingResources ||
                  !selectedLeadId ||
                  properties.length === 0
                }
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-black disabled:opacity-50"
              >
                {isMatching ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <ArrowRight size={18} />
                )}
                Analisar Oportunidades
              </button>
            </div>
          </div>
          <div className="p-8 bg-slate-50 flex-1">
            {matchResult ? (
              <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
                {matchResult}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 py-10">
                <CheckCircle size={48} className="mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest text-center">
                  As recomendações aparecerão aqui.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Collection AI Agent */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:col-span-2">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-8 lg:p-12 border-r border-slate-50">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="text-emerald-600" size={28} />
                <h2 className="text-2xl font-bold text-slate-900 italic tracking-tighter">
                  Agente de Cobrança & Negociação
                </h2>
              </div>
              <p className="text-slate-500 mb-8 text-sm">
                Gere abordagens humanizadas para clientes inadimplentes e
                acelere a recuperação de crédito.
              </p>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                      Nome do Cliente
                    </label>
                    <input
                      value={collectionData.name}
                      onChange={(e) =>
                        setCollectionData({
                          ...collectionData,
                          name: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                      Valor em Atraso
                    </label>
                    <input
                      type="number"
                      value={collectionData.amount}
                      onChange={(e) =>
                        setCollectionData({
                          ...collectionData,
                          amount: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                    />
                  </div>
                </div>
                <button
                  onClick={handleGenerateCollection}
                  disabled={
                    isGeneratingColl ||
                    !collectionData.name.trim() ||
                    collectionData.amount <= 0
                  }
                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isGeneratingColl ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  Criar Abordagem de Negociação
                </button>
              </div>
            </div>

            <div className="p-8 lg:p-12 bg-slate-50">
              {collectionResult ? (
                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2rem] border border-emerald-100 shadow-sm text-slate-700 whitespace-pre-wrap text-sm leading-relaxed italic relative">
                    <div className="absolute -top-3 -left-3 bg-emerald-600 text-white p-2 rounded-lg shadow-lg">
                      <MessageSquare size={16} />
                    </div>
                    "{collectionResult}"
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 py-4 bg-white border border-emerald-200 text-emerald-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm">
                    <ArrowRight size={14} /> Copiar e Abrir WhatsApp
                  </button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 py-10">
                  <MessageSquare size={64} className="mb-4" />
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-center">
                    Aguardando comando do agente...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
