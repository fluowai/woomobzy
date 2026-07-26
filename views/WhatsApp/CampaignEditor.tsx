import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Save, Loader2, Users, Search, Settings, Smartphone,
  Plus, Trash2, UploadCloud, Download, Phone, Building2, Mail,
  MessageSquare, Zap, Clock, Shield, Play, Pause, CheckCircle2,
  AlertCircle, ExternalLink, Eye, X, FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import CampaignDispatch from './CampaignDispatch';

type Tab = 'contacts' | 'serper' | 'settings' | 'instances' | 'dispatch';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  message_template?: string;
  ai_prompt?: string;
  ai_provider?: string;
  dispatch_mode?: string;
  min_delay_seconds?: number;
  max_delay_seconds?: number;
  daily_limit_per_instance?: number;
  working_hours_start?: number;
  working_hours_end?: number;
  status: string;
  sent_count: number;
  failed_count: number;
  contacts_summary: { pending: number; sent: number; failed: number; blacklisted: number };
  instances: any[];
  dispatcher: { running: boolean; sent?: number; failed?: number };
}

interface Contact {
  id: string;
  phone: string;
  name?: string;
  company?: string;
  email?: string;
  status: string;
  ai_message?: string;
  error_message?: string;
  sent_at?: string;
  metadata?: any;
}

interface SerperResult {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category?: string;
}

interface BlacklistItem {
  id: string;
  phone: string;
  reason?: string;
  added_at?: string;
}

const authHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
};

export default function CampaignEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tab, setTab] = useState<Tab>('contacts');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactSearch, setContactSearch] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addName, setAddName] = useState('');
  const [addCompany, setAddCompany] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);

  // Serper state
  const [serperQuery, setSerperQuery] = useState('');
  const [serperResults, setSerperResults] = useState<SerperResult[]>([]);
  const [serperLoading, setSerperLoading] = useState(false);
  const [selectedSerper, setSelectedSerper] = useState<Set<string>>(new Set());

  // Settings state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    message_template: '',
    ai_prompt: '',
    ai_provider: 'gemini',
    dispatch_mode: 'round_robin',
    min_delay_seconds: 45,
    max_delay_seconds: 180,
    daily_limit_per_instance: 50,
    working_hours_start: 8,
    working_hours_end: 20,
  });

  // Instances state
  const [availableInstances, setAvailableInstances] = useState<any[]>([]);
  const [assignedInstances, setAssignedInstances] = useState<any[]>([]);

  const fetchCampaign = useCallback(async () => {
    if (!id) return;
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/campaigns/${id}`, { headers });
      if (!res.ok) throw new Error('Campanha não encontrada');
      const data = await res.json();
      setCampaign(data);
      setEditForm({
        name: data.name || '',
        description: data.description || '',
        message_template: data.message_template || '',
        ai_prompt: data.ai_prompt || '',
        ai_provider: data.ai_provider || 'gemini',
        dispatch_mode: data.dispatch_mode || 'round_robin',
        min_delay_seconds: data.min_delay_seconds || 45,
        max_delay_seconds: data.max_delay_seconds || 180,
        daily_limit_per_instance: data.daily_limit_per_instance || 50,
        working_hours_start: data.working_hours_start ?? 8,
        working_hours_end: data.working_hours_end ?? 20,
      });
      setAssignedInstances(data.instances || []);
    } catch (err: any) {
      toast.error(err.message);
      navigate('/whatsapp/campaigns');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchContacts = useCallback(async () => {
    if (!id) return;
    const headers = await authHeaders();
    const params = new URLSearchParams({ limit: '200' });
    if (contactSearch) params.set('search', contactSearch);
    const res = await fetch(`/api/campaigns/${id}/contacts?${params}`, { headers });
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts || []);
      setContactsTotal(data.total || 0);
    }
  }, [id, contactSearch]);

  const fetchInstances = useCallback(async () => {
    const headers = await authHeaders();
    const res = await fetch('/api/whatsapp/instances', { headers });
    if (res.ok) {
      const data = await res.json();
      setAvailableInstances(Array.isArray(data) ? data : data.instances || []);
    }
  }, []);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);
  useEffect(() => { if (tab === 'contacts') fetchContacts(); }, [tab, fetchContacts]);
  useEffect(() => { if (tab === 'instances') fetchInstances(); }, [tab, fetchInstances]);

  // ─── Contact Actions ───
  const handleAddContact = async () => {
    if (!addPhone.trim()) return toast.error('Telefone obrigatório');
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/campaigns/${id}/contacts`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: addPhone, name: addName || undefined, company: addCompany || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Contato adicionado');
      setAddPhone(''); setAddName(''); setAddCompany('');
      setShowAddContact(false);
      fetchContacts();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const headers = await authHeaders();
      await fetch(`/api/campaigns/${id}/contacts/${contactId}`, {
        method: 'DELETE', headers,
      });
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      setContactsTotal((prev) => prev - 1);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      const contactsPayload = lines.slice(1).map((line) => {
        const [phone, name, company] = line.split(',').map((s) => s.trim());
        return { phone, name: name || undefined, company: company || undefined };
      }).filter((c) => c.phone);

      if (contactsPayload.length === 0) return toast.error('Nenhum contato válido no CSV');

      const headers = await authHeaders();
      const res = await fetch(`/api/campaigns/${id}/contacts`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: contactsPayload }),
      });
      const data = await res.json();
      toast.success(`${data.added} contatos importados`);
      fetchContacts();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar CSV');
    } finally {
      setImportingCsv(false);
      e.target.value = '';
    }
  };

  // ─── Serper Actions ───
  const handleSerperSearch = async () => {
    if (!serperQuery.trim()) return;
    setSerperLoading(true);
    setSelectedSerper(new Set());
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/campaigns/serper/search', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: serperQuery, type: 'places', cache_results: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      setSerperResults(data.results || []);
      toast.success(`${data.results.length} resultados encontrados`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSerperLoading(false);
    }
  };

  const handleImportSerper = async () => {
    if (selectedSerper.size === 0) return;
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/campaigns/${id}/contacts/import-serper`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cache_ids: Array.from(selectedSerper) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      toast.success(`${data.added} contatos importados do Serper`);
      setSelectedSerper(new Set());
      setTab('contacts');
      fetchContacts();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleSerperSelect = (cid: string) => {
    setSelectedSerper((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  // ─── Settings Actions ───
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      toast.success('Configurações salvas');
      fetchCampaign();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Instance Actions ───
  const handleAssignInstance = async (instanceId: string) => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/campaigns/${id}/instances`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_id: instanceId }),
      });
      if (!res.ok) throw new Error('Erro ao atribuir');
      toast.success('Instância atribuída');
      fetchCampaign();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveInstance = async (instanceId: string) => {
    try {
      const headers = await authHeaders();
      await fetch(`/api/campaigns/${id}/instances/${instanceId}`, {
        method: 'DELETE', headers,
      });
      toast.success('Instância removida');
      fetchCampaign();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-400" />
      </div>
    );
  }

  const isEditable = campaign?.status === 'draft' || campaign?.status === 'paused';
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'contacts', label: 'Contatos', icon: <Users className="w-4 h-4" /> },
    { key: 'serper', label: 'Buscar Leads', icon: <Search className="w-4 h-4" /> },
    { key: 'instances', label: 'Instâncias', icon: <Smartphone className="w-4 h-4" /> },
    { key: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
    { key: 'dispatch', label: 'Disparo', icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/whatsapp/campaigns')} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{campaign?.name}</h1>
            <p className="text-sm text-gray-400">
              {campaign?.contacts_summary?.pending || 0} pendentes ·{' '}
              {campaign?.contacts_summary?.sent || 0} enviados ·{' '}
              {campaign?.contacts_summary?.failed || 0} falhas
            </p>
          </div>
          {campaign?.dispatcher?.running && (
            <span className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Disparo ativo
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto border-b border-gray-800 pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition whitespace-nowrap ${
                tab === t.key
                  ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">

          {/* ═══ CONTACTS TAB ═══ */}
          {tab === 'contacts' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Contatos ({contactsTotal})</h2>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg cursor-pointer transition text-sm">
                    <UploadCloud className="w-4 h-4" />
                    {importingCsv ? 'Importando...' : 'CSV'}
                    <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={importingCsv} />
                  </label>
                  {isEditable && (
                    <button
                      onClick={() => setShowAddContact(true)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg transition text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  )}
                </div>
              </div>

              {/* Add Contact Form */}
              {showAddContact && (
                <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <input
                      type="text"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      placeholder="Telefone (11999999999)"
                      className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                    />
                    <input
                      type="text"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="Nome"
                      className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                    />
                    <input
                      type="text"
                      value={addCompany}
                      onChange={(e) => setAddCompany(e.target.value)}
                      placeholder="Empresa"
                      className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddContact} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm transition">
                      Salvar
                    </button>
                    <button onClick={() => setShowAddContact(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* CSV Format Hint */}
              <p className="text-xs text-gray-500 mb-3">
                Formato CSV: <code className="text-gray-400">telefone,nome,empresa</code> (cabeçalho na primeira linha)
              </p>

              {/* Contact List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {contacts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhum contato adicionado</p>
                ) : contacts.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 border border-gray-700">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {c.name?.[0] || c.phone?.slice(-2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{c.name || 'Sem nome'}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                        {c.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{c.company}</span>}
                      </div>
                    </div>
                    {isEditable && (
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="p-1.5 rounded-lg hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ SERPER TAB ═══ */}
          {tab === 'serper' && (
            <div>
              <h2 className="font-semibold mb-4">Buscar Leads no Google</h2>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={serperQuery}
                  onChange={(e) => setSerperQuery(e.target.value)}
                  placeholder='Ex: imobiliárias em Curitiba, construtoras no Paraná'
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSerperSearch()}
                />
                <button
                  onClick={handleSerperSearch}
                  disabled={serperLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg transition text-sm shrink-0"
                >
                  {serperLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar
                </button>
              </div>

              {serperResults.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-400">
                      {serperResults.length} resultados · {selectedSerper.size} selecionados
                    </p>
                    <button
                      onClick={handleImportSerper}
                      disabled={selectedSerper.size === 0}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 px-4 py-2 rounded-lg text-sm transition"
                    >
                      <Download className="w-4 h-4" />
                      Importar selecionados
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {serperResults.map((r, i) => (
                      <div
                        key={i}
                        onClick={() => r.phone && toggleSerperSelect(r.id)}
                        className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition ${
                          r.phone
                            ? selectedSerper.has(r.id)
                              ? 'bg-green-900/20 border-green-600/50 cursor-pointer'
                              : 'bg-gray-800 border-gray-700 cursor-pointer hover:border-gray-600'
                            : 'bg-gray-800/50 border-gray-800 opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSerper.has(r.id)}
                          disabled={!r.phone}
                          className="accent-green-500 shrink-0"
                          readOnly
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{r.name}</div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                            {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span>}
                            {r.address && <span className="truncate">{r.address}</span>}
                            {r.rating ? <span>⭐ {r.rating}</span> : null}
                          </div>
                        </div>
                        {!r.phone && (
                          <span className="text-xs text-gray-500 shrink-0">Sem telefone</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ INSTANCES TAB ═══ */}
          {tab === 'instances' && (
            <div>
              <h2 className="font-semibold mb-4">Instâncias WhatsApp Atribuídas</h2>
              <p className="text-sm text-gray-400 mb-4">
                Selecione as instâncias que participarão do disparo. O sistema fará rotação entre elas automaticamente.
              </p>

              {/* Assigned */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Atribuídas ({assignedInstances.length})</h3>
                {assignedInstances.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhuma instância atribuída</p>
                ) : (
                  <div className="space-y-2">
                    {assignedInstances.map((inst: any) => {
                      const wi = inst.whatsapp_instances;
                      return (
                        <div key={inst.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 border border-gray-700">
                          <Smartphone className="w-5 h-5 text-gray-400" />
                          <div className="flex-1">
                            <span className="font-medium text-sm">{wi?.name || inst.instance_id}</span>
                            <span className="text-xs text-gray-400 ml-2">{wi?.phone}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            wi?.status === 'connected' ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'
                          }`}>
                            {wi?.status || 'desconhecido'}
                          </span>
                          {isEditable && (
                            <button
                              onClick={() => handleRemoveInstance(inst.instance_id)}
                              className="p-1.5 rounded-lg hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Available */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Disponíveis</h3>
                <div className="space-y-2">
                  {availableInstances
                    .filter((wi) => !assignedInstances.some((a) => a.instance_id === wi.id))
                    .map((wi) => (
                      <div key={wi.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-800">
                        <Smartphone className="w-5 h-5 text-gray-500" />
                        <div className="flex-1">
                          <span className="font-medium text-sm">{wi.name}</span>
                          <span className="text-xs text-gray-400 ml-2">{wi.phone}</span>
                        </div>
                        {isEditable && (
                          <button
                            onClick={() => handleAssignInstance(wi.id)}
                            className="flex items-center gap-1 bg-green-800/50 hover:bg-green-700/50 text-green-400 px-3 py-1.5 rounded-lg text-sm transition"
                          >
                            <Plus className="w-3 h-3" />
                            Atribuir
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ SETTINGS TAB ═══ */}
          {tab === 'settings' && (
            <div>
              <h2 className="font-semibold mb-4">Configurações da Campanha</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-300">Básico</h3>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nome</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Mensagem (template)</label>
                    <textarea
                      value={editForm.message_template}
                      onChange={(e) => setEditForm({ ...editForm, message_template: e.target.value })}
                      rows={4}
                      placeholder="Olá {{nome}}, tudo bem? ..."
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use {'{{nome}}'}, {'{{empresa}}'} para variáveis</p>
                  </div>
                </div>

                {/* AI */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-300">IA (geração de mensagens)</h3>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Prompt da IA</label>
                    <textarea
                      value={editForm.ai_prompt}
                      onChange={(e) => setEditForm({ ...editForm, ai_prompt: e.target.value })}
                      rows={4}
                      placeholder="Gere uma mensagem personalizada para um lead de imobiliária..."
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Provider IA</label>
                    <select
                      value={editForm.ai_provider}
                      onChange={(e) => setEditForm({ ...editForm, ai_provider: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="gemini">Gemini</option>
                      <option value="groq">Groq</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </div>
                </div>

                {/* Anti-ban */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Anti-Ban
                  </h3>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Modo de distribuição</label>
                    <select
                      value={editForm.dispatch_mode}
                      onChange={(e) => setEditForm({ ...editForm, dispatch_mode: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="round_robin">Round Robin (alternado)</option>
                      <option value="random">Aleatório</option>
                      <option value="sequential">Sequencial</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Delay mínimo (s)</label>
                      <input
                        type="number"
                        value={editForm.min_delay_seconds}
                        onChange={(e) => setEditForm({ ...editForm, min_delay_seconds: Number(e.target.value) })}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Delay máximo (s)</label>
                      <input
                        type="number"
                        value={editForm.max_delay_seconds}
                        onChange={(e) => setEditForm({ ...editForm, max_delay_seconds: Number(e.target.value) })}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Limite diário por instância</label>
                    <input
                      type="number"
                      value={editForm.daily_limit_per_instance}
                      onChange={(e) => setEditForm({ ...editForm, daily_limit_per_instance: Number(e.target.value) })}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Working Hours */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Horário de envio
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Início (hora)</label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={editForm.working_hours_start}
                        onChange={(e) => setEditForm({ ...editForm, working_hours_start: Number(e.target.value) })}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Fim (hora)</label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={editForm.working_hours_end}
                        onChange={(e) => setEditForm({ ...editForm, working_hours_end: Number(e.target.value) })}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Envios só acontecem neste intervalo. Fora dele, o disparo entra em pausa automática.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving || !isEditable}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 px-5 py-2.5 rounded-lg transition text-sm"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar configurações
                </button>
              </div>
            </div>
          )}

          {/* ═══ DISPATCH TAB ═══ */}
          {tab === 'dispatch' && campaign && (
            <CampaignDispatch campaign={campaign} onRefresh={fetchCampaign} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pendente', cls: 'bg-gray-700 text-gray-300' },
    sent: { label: 'Enviado', cls: 'bg-green-900/40 text-green-400' },
    failed: { label: 'Falhou', cls: 'bg-red-900/40 text-red-400' },
    blacklisted: { label: 'Blacklist', cls: 'bg-yellow-900/40 text-yellow-400' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.cls}`}>
      {c.label}
    </span>
  );
}
