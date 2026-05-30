import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  X, 
  Briefcase, 
  MapPin, 
  FileText,
  Mail,
  Phone
} from 'lucide-react';

const mockClients = [
  {
    id: '1',
    name: 'João Pedro Silva',
    document_number: '123.456.789-00',
    email: 'joao.silva@email.com',
    phone: '(11) 98765-4321',
    roles: ['Inquilino'],
    city: 'São Paulo',
    state: 'SP'
  },
  {
    id: '2',
    name: 'Maria Fernanda Costa',
    document_number: '987.654.321-11',
    email: 'm.costa@empresa.com.br',
    phone: '(21) 99999-8888',
    roles: ['Proprietário', 'Investidor'],
    city: 'Rio de Janeiro',
    state: 'RJ'
  },
  {
    id: '3',
    name: 'Carlos Andrade',
    document_number: '444.555.666-77',
    email: 'carlos@investimentos.com',
    phone: '(31) 97777-6666',
    roles: ['Comprador'],
    city: 'Belo Horizonte',
    state: 'MG'
  }
];

export default function ClientsManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="h1 flex items-center gap-3 text-slate-900">
            <Users className="text-primary" size={32} />
            Cadastro de Clientes
          </h1>
          <p className="body mt-1 max-w-2xl text-slate-500">
            Gerencie proprietários, inquilinos, compradores e fiadores em um único lugar.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary shadow-lg shadow-primary/25 whitespace-nowrap"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Filters & Actions */}
      <div className="card-premium p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-12 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {['Todos', 'Proprietário', 'Inquilino', 'Comprador', 'Fiador'].map(role => (
            <button key={role} className="px-4 py-2 rounded-full text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap">
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Contato</th>
                <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Papel</th>
                <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-widest hidden lg:table-cell">Localidade</th>
                <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 md:p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{client.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{client.document_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 md:p-5 hidden md:table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail size={14} className="text-slate-400" />
                        {client.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={14} className="text-slate-400" />
                        {client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 md:p-5">
                    <div className="flex flex-wrap gap-1.5">
                      {client.roles.map(role => (
                        <span key={role} className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 md:p-5 hidden lg:table-cell">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={14} className="text-slate-400" />
                      {client.city}, {client.state}
                    </div>
                  </td>
                  <td className="p-4 md:p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Edit size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Novo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Novo Cliente</h3>
                <p className="text-sm text-slate-500 mt-1">Cadastre as informações pessoais e defina o papel do cliente.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Col 1 - Pessoal */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center gap-3 text-primary font-bold border-b border-slate-100 pb-2">
                    <Briefcase size={20} />
                    Dados Pessoais
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-bold text-slate-700">Nome Completo</label>
                      <input type="text" className="input-field bg-slate-50 focus:bg-white" placeholder="Ex: João da Silva" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Tipo de Documento</label>
                      <select className="input-field bg-slate-50 focus:bg-white">
                        <option>CPF</option>
                        <option>CNPJ</option>
                        <option>Passaporte</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Número do Documento</label>
                      <input type="text" className="input-field bg-slate-50 focus:bg-white" placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">E-mail</label>
                      <input type="email" className="input-field bg-slate-50 focus:bg-white" placeholder="email@exemplo.com" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Telefone / WhatsApp</label>
                      <input type="text" className="input-field bg-slate-50 focus:bg-white" placeholder="(00) 90000-0000" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-primary font-bold border-b border-slate-100 pb-2 pt-4">
                    <MapPin size={20} />
                    Endereço
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="text-sm font-bold text-slate-700">CEP</label>
                      <div className="relative">
                        <input type="text" className="input-field bg-slate-50 focus:bg-white pr-10" placeholder="00000-000" />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-primary">
                          <Search size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-bold text-slate-700">Endereço</label>
                      <input type="text" className="input-field bg-slate-50 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Número</label>
                      <input type="text" className="input-field bg-slate-50 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-bold text-slate-700">Bairro</label>
                      <input type="text" className="input-field bg-slate-50 focus:bg-white" />
                    </div>
                  </div>
                </div>

                {/* Col 2 - Papéis */}
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="flex items-center gap-3 text-slate-900 font-bold mb-4">
                      <FileText size={20} className="text-primary" />
                      Papel do Cliente
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Selecione uma ou mais opções para definir como este cliente atua na imobiliária.</p>
                    
                    <div className="space-y-3">
                      {[
                        { id: 'proprietario', label: 'Proprietário', desc: 'Dono do imóvel' },
                        { id: 'inquilino', label: 'Inquilino', desc: 'Locatário' },
                        { id: 'comprador', label: 'Comprador', desc: 'Busca imóvel para compra' },
                        { id: 'fiador', label: 'Fiador', desc: 'Garantia de locação' },
                        { id: 'investidor', label: 'Investidor', desc: 'Busca rentabilidade' }
                      ].map(role => (
                        <label key={role.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors group">
                          <div className="mt-0.5">
                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">{role.label}</p>
                            <p className="text-xs text-slate-500">{role.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-3xl">
              <button onClick={() => setIsModalOpen(false)} className="btn bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button className="btn btn-primary shadow-lg shadow-primary/25">
                Salvar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
