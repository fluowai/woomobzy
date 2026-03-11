
import React from 'react';
import { Palette, Type, Paintbrush, CheckCircle2, Layout } from 'lucide-react';
import { VisualIdentity } from '../../types/import';

interface VisualPreviewProps {
  identity: VisualIdentity;
  onAccept: () => void;
  onRetry: () => void;
}

const VisualPreview: React.FC<VisualPreviewProps> = ({ identity, onAccept, onRetry }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Identidade Visual Detectada</h2>
          <p className="text-slate-500">Extraímos o DNA visual do site original para sugerir um tema Imobzy.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onRetry}
            className="px-6 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Refazer Análise
          </button>
          <button 
            onClick={onAccept}
            className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            Aceitar & Continuar <CheckCircle2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Color Palette */}
        <div className="bg-white p-8 rounded-4xl border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-indigo-600">
            <Palette size={24} />
            <h3 className="text-xl font-bold">Paleta de Cores</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {identity.palette.map((color, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl group transition-all hover:bg-white hover:shadow-sm">
                <div 
                  className="w-12 h-12 rounded-xl border border-black/5 shadow-inner"
                  style={{ backgroundColor: color }}
                />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i === 0 ? 'Primária' : i === 1 ? 'Secundária' : 'Acento'}</p>
                  <p className="font-mono text-sm font-bold text-slate-800">{color.toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <p className="text-sm text-indigo-900 leading-relaxed font-medium">
              <strong>Sugestão da IA:</strong> Utilizar <span className="underline" style={{ color: identity.primaryColor }}>{identity.primaryColor}</span> para botões e links de destaque, mantendo o fundo limpo em contrastante.
            </p>
          </div>
        </div>

        {/* Typography & Layout */}
        <div className="bg-white p-8 rounded-4xl border border-slate-100 shadow-xl space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-indigo-600">
              <Type size={24} />
              <h3 className="text-xl font-bold">Tipografia & Estilo</h3>
            </div>
            
            <div className="space-y-4">
              {identity.fonts.map((font, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{i === 0 ? 'Títulos' : 'Interface'}</p>
                  <p className="text-2xl text-slate-900" style={{ fontFamily: font }}>{font}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <Layout size={24} />
              <h3 className="text-xl font-bold">Composição de Cards</h3>
            </div>
            <div className="flex gap-4">
               <div className="flex-1 aspect-video bg-slate-50 border-2 border-indigo-600 rounded-xl flex items-center justify-center flex-col gap-2">
                  <div className="h-4 w-2/3 bg-slate-200 rounded-full"></div>
                  <div className="h-3 w-1/2 bg-slate-100 rounded-full"></div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase">Tema Moderno</span>
               </div>
               <div className="flex-1 aspect-video bg-white border border-slate-200 rounded-xl flex items-center justify-center flex-col gap-2 grayscale opacity-50">
                  <div className="h-4 w-2/3 bg-slate-100 rounded-full"></div>
                  <div className="h-3 w-1/2 bg-slate-50 rounded-full"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Clássico</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Suggestions */}
      <div className="bg-slate-900 p-8 rounded-4xl text-white overflow-hidden relative">
         <div className="absolute top-0 right-0 p-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md">
               <Paintbrush size={48} className="text-indigo-400" />
            </div>
            <div className="flex-1">
               <h3 className="text-2xl font-black mb-2">Tema Sugerido: <span className="text-indigo-400 uppercase tracking-tighter italic">{identity.suggestedTheme}</span></h3>
               <p className="text-slate-400 leading-relaxed font-medium">Este tema foi selecionado por nossa IA por possuir a melhor compatibilidade estrutural com o site <span className="text-white">"{identity.suggestedTheme}"</span> original.</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default VisualPreview;
