import React from 'react';
import { motion } from 'framer-motion';
import { Wand2, Download } from 'lucide-react';

export const StackGenerator = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Gerador de Stack</h2>
          <p className="text-sm text-[#9097A5] mt-1">Gere configurações docker-compose.yml dinâmicas com segurança.</p>
        </div>
      </div>
      
      <div className="p-6 rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">Produto</label>
              <select className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none">
                <option>IMOBZY Core</option>
                <option>AGROZY</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">Versão</label>
              <select className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none">
                <option>v4.8.0</option>
                <option>v4.7.5</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">Domínio de Destino</label>
              <input type="text" placeholder="crm.exemplo.com" className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">Chave de Licença</label>
              <input type="text" placeholder="LIC-XXXX-XXXX" className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none" />
            </div>
          </div>
          
          <div className="space-y-3 pt-4 border-t border-[#252A35]">
            <p className="text-sm font-medium text-[#9097A5]">Funcionalidades</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" defaultChecked className="accent-[#d4af37]" /> Cache Redis</label>
              <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" defaultChecked className="accent-[#d4af37]" /> Worker WhatsApp</label>
              <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" defaultChecked className="accent-[#d4af37]" /> Edge Traefik</label>
            </div>
          </div>

          <button type="button" className="w-full py-3 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors flex items-center justify-center gap-2">
            <Wand2 size={18} /> Gerar Stack
          </button>
        </form>
      </div>
    </div>
  );
};
