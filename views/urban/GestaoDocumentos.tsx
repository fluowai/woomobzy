import React from 'react';
import { FileText, Upload, FolderOpen, Search, Download, Eye, Trash2, Link } from 'lucide-react';

const docs = [
  { id: '1', nome: 'Contrato de Locação - João Silva', tipo: 'Contrato', imovel: 'Apt 301 - Ed. Aurora', data: '15/05/2026', tamanho: '320 KB', status: 'Assinado' },
  { id: '2', nome: 'RG Inquilino - Maria Costa', tipo: 'Documento Pessoal', imovel: 'Casa R. das Flores, 12', data: '10/05/2026', tamanho: '1.2 MB', status: 'Pendente' },
  { id: '3', nome: 'Vistoria Inicial - Sala 504', tipo: 'Vistoria', imovel: 'Sala 504 - Ed. Business', data: '20/04/2026', tamanho: '4.5 MB', status: 'Aprovado' },
  { id: '4', nome: 'Matrícula do Imóvel - Lote 7', tipo: 'Cartório', imovel: 'Galpão Industrial Lote 7', data: '02/04/2026', tamanho: '870 KB', status: 'Aprovado' },
];

const statusColors: Record<string, string> = {
  'Assinado': 'bg-green-100 text-green-700',
  'Pendente': 'bg-amber-100 text-amber-700',
  'Aprovado': 'bg-blue-100 text-blue-700',
};

export default function GestaoDocumentos() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="h1 flex items-center gap-3 text-slate-900">
            <FileText className="text-primary" size={32} />
            Gestão de Documentos
          </h1>
          <p className="body mt-1 text-slate-500">Armazene, organize e compartilhe documentos vinculados aos seus imóveis e clientes.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn bg-slate-100 text-slate-700 border border-slate-200">
            <Link size={18} /> Google Drive
          </button>
          <button className="btn btn-primary shadow-lg shadow-primary/25">
            <Upload size={18} /> Enviar Documento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Contratos', value: '18', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Vistorias', value: '24', icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Documentos Pessoais', value: '67', icon: FolderOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pendentes de Assinatura', value: '5', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="card-premium p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <h2 className="font-black text-slate-900">Documentos Recentes</h2>
          <div className="relative group max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary" size={16} />
            <input type="text" placeholder="Buscar documento..." className="input-field pl-9 bg-slate-50 h-9 text-sm" />
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Nome', 'Tipo', 'Imóvel', 'Data', 'Status', 'Ações'].map(h => (
                <th key={h} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {docs.map(d => (
              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">{d.nome}</p>
                      <p className="text-xs text-slate-400">{d.tamanho}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-600">{d.tipo}</td>
                <td className="p-4 text-sm text-slate-600">{d.imovel}</td>
                <td className="p-4 text-sm text-slate-500">{d.data}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusColors[d.status]}`}>{d.status}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Eye size={16} /></button>
                    <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Download size={16} /></button>
                    <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
