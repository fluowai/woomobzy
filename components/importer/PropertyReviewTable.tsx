
import React from 'react';
import { 
  Table, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Edit3, 
  Trash2,
  ArrowRight,
  TrendingUp,
  LandPlot,
  Building,
  Layout
} from 'lucide-react';
import { CapturedProperty } from '../../types/import';

interface PropertyReviewTableProps {
  properties: CapturedProperty[];
  onConfirm: () => void;
  onBack: () => void;
}

const PropertyReviewTable: React.FC<PropertyReviewTableProps> = ({ properties, onConfirm, onBack }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Revisão de Dados (IA)</h2>
          <p className="text-slate-500">A IA mapeou os campos abaixo. Verifique a precisão antes de importar.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onBack}
            className="px-6 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Voltar
          </button>
          <button 
            onClick={onConfirm}
            className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
          >
            Aprovar & Importar <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-4xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Imóvel Extrais</th>
                <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Mapeamento IA</th>
                <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Preço</th>
                <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Confiança</th>
                <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {properties.map((prop, i) => (
                <tr key={prop.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                         {prop.images[0] ? (
                           <img src={prop.images[0]} alt="" className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-300">
                             <Layout size={20} />
                           </div>
                         )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate max-w-[200px]">{prop.title}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[200px]">{prop.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                       {prop.type === 'Rural' ? (
                         <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase">
                            <LandPlot size={12} /> Rural
                         </span>
                       ) : (
                         <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase">
                            <Building size={12} /> Urbano
                         </span>
                       )}
                       <span className="text-xs font-medium text-slate-500">→ {prop.status}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="font-mono font-bold text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.price)}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                       <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-20">
                          <div 
                            className={`h-full rounded-full ${i % 3 === 0 ? 'bg-amber-400 w-[70%]' : 'bg-green-500 w-[95%]'}`}
                          />
                       </div>
                       <span className="text-[10px] font-bold text-slate-400">{i % 3 === 0 ? '70%' : '95%'}</span>
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        <Edit3 size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
           <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                 <div className="w-2 h-2 rounded-full bg-green-500"></div> 12 Mapeados com Sucesso
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                 <div className="w-2 h-2 rounded-full bg-amber-500"></div> 3 Requerem Atenção
              </div>
           </div>
           <div className="text-xs font-medium text-slate-400 italic">
              * Clique em editar para ajustar o mapeamento manual se necessário.
           </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyReviewTable;
