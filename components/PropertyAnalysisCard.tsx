// Componente para exibir análise de propriedade rural

import React from 'react';
import { PropertyAnalysis } from '../types';
import { Cloud, Droplets, ThermometerSun, Wind, TrendingUp, AlertTriangle, Lightbulb, Award } from 'lucide-react';

interface PropertyAnalysisCardProps {
  analysis: PropertyAnalysis;
}

export const PropertyAnalysisCard: React.FC<PropertyAnalysisCardProps> = ({ analysis }) => {
  const renderStars = (score: number) => {
    return (
      <div className="flex gap-1">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < score ? 'bg-yellow-400' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Cloud className="text-indigo-600" size={24} />
            Análise Climática e Aptidão
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Gerado em {new Date(analysis.analyzedAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-4xl font-black text-indigo-600">{analysis.overallScore}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Score Geral</div>
        </div>
      </div>

      {/* Dados Climáticos */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <ThermometerSun size={16} className="text-orange-500" />
          Clima - {analysis.climate.location}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Temperatura</div>
            <div className="font-bold text-slate-900">{analysis.climate.avgTemp}°C</div>
            <div className="text-[10px] text-slate-400">
              {analysis.climate.minTemp}° - {analysis.climate.maxTemp}°
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Chuva Anual</div>
            <div className="font-bold text-slate-900">{analysis.climate.totalRainfall}mm</div>
            <div className="text-[10px] text-slate-400">
              ~{analysis.climate.avgRainfall}mm/mês
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Umidade</div>
            <div className="font-bold text-slate-900">{analysis.climate.humidity}%</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Clima</div>
            <div className="font-bold text-slate-900 text-sm">{analysis.climate.season}</div>
          </div>
        </div>
      </div>

      {/* Aptidão */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Pecuária */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-700">🐄 Pecuária</h4>
            <div className="text-2xl font-black text-emerald-600">{analysis.aptitude.cattle.score}/10</div>
          </div>
          {renderStars(analysis.aptitude.cattle.score)}
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.aptitude.cattle.type.map((type, i) => (
              <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                {type}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3">{analysis.aptitude.cattle.notes}</p>
        </div>

        {/* Agricultura */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-700">🌾 Agricultura</h4>
            <div className="text-2xl font-black text-amber-600">{analysis.aptitude.agriculture.score}/10</div>
          </div>
          {renderStars(analysis.aptitude.agriculture.score)}
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.aptitude.agriculture.crops.map((crop, i) => (
              <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                {crop}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3">{analysis.aptitude.agriculture.notes}</p>
        </div>
      </div>

      {/* Riscos e Oportunidades */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <h4 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} />
            Riscos Climáticos
          </h4>
          <ul className="space-y-2">
            {analysis.risks.map((risk, i) => (
              <li key={i} className="text-xs text-red-600 flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <h4 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
            <Lightbulb size={16} />
            Oportunidades
          </h4>
          <ul className="space-y-2">
            {analysis.opportunities.map((opp, i) => (
              <li key={i} className="text-xs text-green-600 flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                {opp}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Insights da IA */}
      <div className="bg-white rounded-xl p-4">
        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Award size={16} className="text-indigo-600" />
          Análise Detalhada (IA)
        </h4>
        <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
          {analysis.aiInsights}
        </div>
      </div>
    </div>
  );
};
