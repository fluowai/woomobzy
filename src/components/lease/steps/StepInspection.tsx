import React, { useState } from 'react';
import { ClipboardCheck, Camera, Plus, Trash2, FileText } from 'lucide-react';
import type { Lease } from '../../../types/lease';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const inputClass = 'w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all';
const labelClass = 'text-[10px] font-black text-slate-500 uppercase tracking-widest';

export const StepInspection: React.FC<Props> = ({ lease, updateField }) => {
  const [items, setItems] = useState<Array<{ room: string; item: string; condition: string; observation: string }>>([
    { room: 'Sala', item: 'Piso', condition: 'bom', observation: '' },
    { room: 'Sala', item: 'Paredes', condition: 'bom', observation: '' },
    { room: 'Cozinha', item: 'Piso', condition: 'bom', observation: '' },
    { room: 'Cozinha', item: 'Armários', condition: 'bom', observation: '' },
    { room: 'Banheiro', item: 'Piso', condition: 'bom', observation: '' },
    { room: 'Banheiro', item: 'Louças', condition: 'bom', observation: '' },
    { room: 'Quarto', item: 'Piso', condition: 'bom', observation: '' },
    { room: 'Quarto', item: 'Paredes', condition: 'bom', observation: '' },
  ]);

  const addItem = () => {
    setItems([...items, { room: '', item: '', condition: 'bom', observation: '' }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: string) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><ClipboardCheck size={20} /></div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Vistoria de Entrada</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className={labelClass}>Data da Vistoria</label>
            <input type="date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Vistoriador</label>
            <input className={inputClass} placeholder="Nome do responsável" />
          </div>
        </div>
      </section>

      {/* Itens da Vistoria */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Camera size={20} /></div>
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Itens Vistoriados</h4>
          </div>
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
          >
            <Plus size={14} /> Adicionar Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cômodo</th>
                <th className="text-left py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                <th className="text-left py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Condição</th>
                <th className="text-left py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Obs</th>
                <th className="py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-2">
                    <input
                      value={item.room}
                      onChange={(e) => updateItem(idx, 'room', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm outline-none"
                      list="rooms"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={item.item}
                      onChange={(e) => updateItem(idx, 'item', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm outline-none"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={item.condition}
                      onChange={(e) => updateItem(idx, 'condition', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm outline-none"
                    >
                      <option value="otimo">Ótimo</option>
                      <option value="bom">Bom</option>
                      <option value="regular">Regular</option>
                      <option value="ruim">Ruim</option>
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={item.observation}
                      onChange={(e) => updateItem(idx, 'observation', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm outline-none"
                      placeholder="Obs..."
                    />
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Leituras de Medidores */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><FileText size={20} /></div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Leitura de Medidores</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Hidrômetro (água)</label>
            <input className={inputClass} placeholder="Leitura atual" />
          </div>
          <div>
            <label className={labelClass}>Relógio (luz)</label>
            <input className={inputClass} placeholder="Leitura atual" />
          </div>
          <div>
            <label className={labelClass}>Gás</label>
            <input className={inputClass} placeholder="Leitura atual" />
          </div>
        </div>
      </section>

      {/* Observações */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <label className={labelClass}>Observações da Vistoria</label>
        <textarea
          className="w-full min-h-[100px] mt-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none"
          placeholder="Anotações relevantes sobre o estado do imóvel..."
        />
      </section>

      <datalist id="rooms">
        <option value="Sala" />
        <option value="Sala de Estar" />
        <option value="Sala de Jantar" />
        <option value="Cozinha" />
        <option value="Área de Serviço" />
        <option value="Banheiro Social" />
        <option value="Banheiro Suíte" />
        <option value="Quarto 1" />
        <option value="Quarto 2" />
        <option value="Suíte" />
        <option value="Corredor" />
        <option value="Garagem" />
        <option value="Quintal" />
        <option value="Sacada" />
        <option value="Varanda" />
      </datalist>
    </div>
  );
};
