import React from 'react';
import { useTexts } from '../context/TextsContext';
import { Save, X, Eye, EyeOff, Layout, MousePointer2 } from 'lucide-react';

const VisualEditorToolbar: React.FC = () => {
  const { isVisualMode, setVisualMode, refresh } = useTexts();

  if (!isVisualMode) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={() => setVisualMode(true)}
          className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all group flex items-center gap-3"
        >
          <MousePointer2 size={24} />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold whitespace-nowrap">
            Modo de Edição
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-slate-900/90 backdrop-blur-md border-b border-indigo-500/30 p-4 animate-in slide-in-from-top duration-500">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Layout size={20} />
          </div>
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-widest">Editor Visual</h4>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Clique em qualquer texto para editar</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refresh()}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all text-xs font-black uppercase tracking-widest"
          >
            <Save size={16} />
            Sincronizar
          </button>
          
          <button
            onClick={() => setVisualMode(false)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30"
          >
            <EyeOff size={16} />
            Sair do Editor
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisualEditorToolbar;
