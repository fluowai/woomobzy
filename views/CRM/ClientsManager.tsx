import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users, Search, Plus, MoreVertical, Edit, Trash2, X,
  Briefcase, MapPin, FileText, Mail, Phone, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { clientService, Client } from '../../services/clients';
import { logger } from '../../utils/logger';

const ROLE_OPTIONS = [
  { id: 'proprietario', label: 'Proprietário', desc: 'Dono do imóvel' },
  { id: 'inquilino', label: 'Inquilino', desc: 'Locatário' },
  { id: 'comprador', label: 'Comprador', desc: 'Busca imóvel para compra' },
  { id: 'fiador', label: 'Fiador', desc: 'Garantia de locação' },
  { id: 'investidor', label: 'Investidor', desc: 'Busca rentabilidade' },
];

const initialForm = {
  name: '', email: '', phone: '', document_number: '', document_type: 'CPF',
  roles: [] as string[], city: '', state: '', address: '',
  neighborhood: '', zip_code: '', notes: '',
};

export default function ClientsManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await clientService.list();
      setClients(data);
    } catch (err: any) {
      logger.error('Erro ao carregar clientes', err);
      toast.error('Erro ao carregar clientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return clients.filter((c) => {
      if (roleFilter !== 'Todos' && !c.roles?.some(r => r.toLowerCase() === roleFilter.toLowerCase())) return false;
      if (!term) return true;
      return [c.name, c.email, c.phone, c.document_number, c.city]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(term));
    });
  }, [clients, searchTerm, roleFilter]);

  const openNew = () => { setForm(initialForm); setEditingId(null); setIsModalOpen(true); };

  const openEdit = (client: Client) => {
    setForm({
      name: client.name || '', email: client.email || '', phone: client.phone || '',
      document_number: client.document_number || '', document_type: client.document_type || 'CPF',
      roles: client.roles || [], city: client.city || '', state: client.state || '',
      address: client.address || '', neighborhood: client.neighborhood || '',
      zip_code: client.zip_code || '', notes: client.notes || '',
    });
    setEditingId(client.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await clientService.update(editingId, form);
        toast.success('Cliente atualizado!');
      } else {
        await clientService.create(form);
        toast.success('Cliente cadastrado!');
      }
      setIsModalOpen(false);
      loadClients();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await clientService.delete(id);
      toast.success('Cliente excluído');
      loadClients();
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message);
    }
  };

  const toggleRole = (roleId: string) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(roleId)
        ? f.roles.filter((r) => r !== roleId)
        : [...f.roles, roleId],
    }));
  };

  return (
    <div className="workspace-page animate-fade-in space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="workspace-title flex items-center gap-3">
            <Users className="text-primary" size={32} />
            Cadastro de Clientes
          </h1>
          <p className="workspace-subtitle mt-1 max-w-2xl">
            Gerencie proprietários, inquilinos, compradores e fiadores.
            {loading && <span className="ml-2 inline-block"><Loader2 size={14} className="animate-spin" /></span>}
          </p>
        </div>
        <button onClick={openNew} className="workspace-primary-action bg-primary text-white border-primary whitespace-nowrap">
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      <div className="workspace-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
          <input
            type="text" placeholder="Buscar por nome, CPF ou e-mail..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="workspace-input h-11 pl-12 pr-4"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {['Todos', 'Proprietário', 'Inquilino', 'Comprador', 'Fiador'].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                roleFilter === role ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {role} {role === 'Todos' ? `(${clients.length})` : `(${clients.filter(c => c.roles?.includes(role)).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="workspace-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
            <span className="ml-3 text-slate-500 font-semibold">Carregando clientes...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="workspace-table-head border-b border-slate-200">
                  <th className="p-4 md:p-5">Cliente</th>
                  <th className="p-4 md:p-5 hidden md:table-cell">Contato</th>
                  <th className="p-4 md:p-5">Papel</th>
                  <th className="p-4 md:p-5 hidden lg:table-cell">Localidade</th>
                  <th className="p-4 md:p-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 md:p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{client.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{client.document_number || 'Sem documento'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 md:p-5 hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail size={14} className="text-slate-400" /> {client.email || '-'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone size={14} className="text-slate-400" /> {client.phone || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 md:p-5">
                      <div className="flex flex-wrap gap-1.5">
                        {(client.roles || ['Cliente']).map(role => (
                          <span key={role} className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 md:p-5 hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin size={14} className="text-slate-400" />
                        {[client.city, client.state].filter(Boolean).join(', ') || '-'}
                      </div>
                    </td>
                    <td className="p-4 md:p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(client)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(client.id, client.name)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-semibold">
                      {searchTerm || roleFilter !== 'Todos' ? 'Nenhum cliente encontrado com esses filtros.' : 'Nenhum cliente cadastrado. Clique em "Novo Cliente" para adicionar.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <p className="text-sm text-slate-500 mt-1">Informações do cliente e definição de papéis.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center gap-3 text-primary font-bold border-b border-slate-100 pb-2">
                    <Briefcase size={20} /> Dados Pessoais
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-bold text-slate-700">Nome Completo *</label>
                      <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="input-field bg-slate-50 focus:bg-white" placeholder="Ex: João da Silva" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Tipo de Documento</label>
                      <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="input-field bg-slate-50 focus:bg-white">
                        <option>CPF</option><option>CNPJ</option><option>Passaporte</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Número do Documento</label>
                      <input type="text" value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })}
                        className="input-field bg-slate-50 focus:bg-white" placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">E-mail</label>
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="input-field bg-slate-50 focus:bg-white" placeholder="email@exemplo.com" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Telefone / WhatsApp</label>
                      <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="input-field bg-slate-50 focus:bg-white" placeholder="(00) 90000-0000" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-primary font-bold border-b border-slate-100 pb-2 pt-4">
                    <MapPin size={20} /> Endereço
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">CEP</label>
                      <input type="text" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                        className="input-field bg-slate-50 focus:bg-white" placeholder="00000-000" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-bold text-slate-700">Endereço</label>
                      <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="input-field bg-slate-50 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Número</label>
                      <input type="text" className="input-field bg-slate-50 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Bairro</label>
                      <input type="text" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                        className="input-field bg-slate-50 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Cidade</label>
                      <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="input-field bg-slate-50 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Estado</label>
                      <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className="input-field bg-slate-50 focus:bg-white" placeholder="SP" maxLength={2} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Observações</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="input-field bg-slate-50 focus:bg-white min-h-[80px]" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="flex items-center gap-3 text-slate-900 font-bold mb-4">
                      <FileText size={20} className="text-primary" /> Papel do Cliente
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Selecione uma ou mais opções.</p>
                    <div className="space-y-3">
                      {ROLE_OPTIONS.map(role => (
                        <label key={role.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors group">
                          <div className="mt-0.5">
                            <input type="checkbox" checked={form.roles.includes(role.id)} onChange={() => toggleRole(role.id)}
                              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
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
              <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary shadow-lg shadow-primary/25">
                  {saving ? 'Salvando...' : editingId ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
