import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Home,
  Key,
  Plus,
  Search,
  User,
  X,
  FileText
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

type KeyRecord = {
  id: string;
  label: string;
  code: string;
  status: 'available' | 'checked_out' | 'overdue' | 'lost';
  location?: string;
  responsible_name?: string;
  notes?: string;
  checked_out_at?: string;
  expected_return_at?: string;
};

const statusConfig: Record<
  KeyRecord['status'],
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  available: {
    label: 'Disponível',
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: Home,
  },
  checked_out: {
    label: 'Retirada',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    icon: ArrowUpRight,
  },
  overdue: {
    label: 'Atrasada',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: Clock,
  },
  lost: {
    label: 'Perdida',
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    icon: Clock,
  },
};

const generateDocument = (title: string, content: string) => {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; color: #000; margin-bottom: 40px; text-transform: uppercase; font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .content { margin-top: 20px; text-align: justify; }
          .signature-area { margin-top: 80px; display: flex; justify-content: space-around; }
          .signature-box { text-align: center; width: 45%; }
          .line { border-top: 1px solid #000; margin: 0 auto 10px; }
          p { margin-bottom: 15px; }
          strong { color: #000; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="content">
          ${content}
        </div>
        <div class="signature-area">
          <div class="signature-box">
            <div class="line"></div>
            <p>Assinatura da Imobiliária</p>
          </div>
          <div class="signature-box">
            <div class="line"></div>
            <p>Assinatura do Responsável</p>
          </div>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          }
        </script>
      </body>
    </html>
  `);
  win.document.close();
};

export default function ControleChaves() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalState, setModalState] = useState<'register' | 'checkout' | 'return' | null>(null);
  const [selectedKey, setSelectedKey] = useState<KeyRecord | null>(null);

  const [registerForm, setRegisterForm] = useState({ label: '', code: '', location: '' });
  const [checkoutForm, setCheckoutForm] = useState({ responsible_name: '', document: '', returnHours: 8, notes: '' });
  const [returnForm, setReturnForm] = useState({ notes: '' });

  const loadKeys = async () => {
    if (!profile?.organization_id) return;

    setLoading(true);
    const { data } = await supabase
      .from('key_control')
      .select(
        'id,label,code,status,location,responsible_name,notes,checked_out_at,expected_return_at'
      )
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    setKeys((data || []) as KeyRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    loadKeys();
  }, [profile?.organization_id]);

  const filteredKeys = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return keys;
    return keys.filter((item) =>
      `${item.label} ${item.code} ${item.responsible_name || ''}`
        .toLowerCase()
        .includes(term)
    );
  }, [keys, search]);

  const stats = useMemo(
    () => [
      {
        label: 'Disponíveis',
        value: keys.filter((item) => item.status === 'available').length,
        color: 'text-green-600',
      },
      {
        label: 'Retiradas',
        value: keys.filter((item) => item.status === 'checked_out').length,
        color: 'text-blue-600',
      },
      {
        label: 'Atrasadas',
        value: keys.filter((item) => item.status === 'overdue').length,
        color: 'text-red-600',
      },
    ],
    [keys]
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id || !registerForm.label || !registerForm.code) return;

    await supabase.from('key_control').insert({
      organization_id: profile.organization_id,
      label: registerForm.label,
      code: registerForm.code,
      location: registerForm.location || null,
      status: 'available',
    });
    
    setModalState(null);
    setRegisterForm({ label: '', code: '', location: '' });
    loadKeys();
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id || !selectedKey || !checkoutForm.responsible_name) return;

    const checkedOutAt = new Date();
    const expectedReturnAt = new Date(Date.now() + Math.max(checkoutForm.returnHours, 1) * 60 * 60 * 1000);

    const notesValue = checkoutForm.document 
      ? `Doc: ${checkoutForm.document}${checkoutForm.notes ? ' | ' + checkoutForm.notes : ''}`
      : checkoutForm.notes;

    await supabase
      .from('key_control')
      .update({
        status: 'checked_out',
        responsible_name: checkoutForm.responsible_name,
        notes: notesValue || null,
        checked_out_at: checkedOutAt.toISOString(),
        expected_return_at: expectedReturnAt.toISOString(),
      })
      .eq('id', selectedKey.id)
      .eq('organization_id', profile.organization_id);

    generateDocument(
      'Termo de Retirada de Chave',
      `
        <p>Eu, <strong>${checkoutForm.responsible_name}</strong>${checkoutForm.document ? `, portador(a) do documento <strong>${checkoutForm.document}</strong>` : ''}, declaro que recebi nesta data a chave referente ao imóvel <strong>${selectedKey.label}</strong> (Código: <strong>${selectedKey.code}</strong>).</p>
        <p>Comprometo-me a zelar pela chave e devolvê-la no prazo acordado de <strong>${checkoutForm.returnHours} horas</strong>, ou seja, até <strong>${expectedReturnAt.toLocaleString('pt-BR')}</strong>.</p>
        <p>Estou ciente de que a não devolução no prazo pode acarretar medidas cabíveis.</p>
        ${checkoutForm.notes ? `<p><strong>Observações:</strong> ${checkoutForm.notes}</p>` : ''}
        <p style="margin-top: 40px; text-align: right;">Data da retirada: <strong>${checkedOutAt.toLocaleString('pt-BR')}</strong></p>
      `
    );

    setModalState(null);
    setSelectedKey(null);
    setCheckoutForm({ responsible_name: '', document: '', returnHours: 8, notes: '' });
    loadKeys();
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id || !selectedKey) return;

    const returnedAt = new Date();

    await supabase
      .from('key_control')
      .update({
        status: 'available',
        responsible_name: null,
        checked_out_at: null,
        expected_return_at: null,
        returned_at: returnedAt.toISOString(),
        notes: returnForm.notes ? `Devolução: ${returnForm.notes}` : null
      })
      .eq('id', selectedKey.id)
      .eq('organization_id', profile.organization_id);

    generateDocument(
      'Recibo de Devolução de Chave',
      `
        <p>Declaramos para os devidos fins que recebemos de <strong>${selectedKey.responsible_name || 'Responsável'}</strong> a chave referente ao imóvel <strong>${selectedKey.label}</strong> (Código: <strong>${selectedKey.code}</strong>), que havia sido retirada em <strong>${selectedKey.checked_out_at ? new Date(selectedKey.checked_out_at).toLocaleString('pt-BR') : 'data não registrada'}</strong>.</p>
        <p>A chave foi devolvida e encontra-se novamente disponível.</p>
        ${returnForm.notes ? `<p><strong>Observações na devolução:</strong> ${returnForm.notes}</p>` : ''}
        <p style="margin-top: 40px; text-align: right;">Data da devolução: <strong>${returnedAt.toLocaleString('pt-BR')}</strong></p>
      `
    );

    setModalState(null);
    setSelectedKey(null);
    setReturnForm({ notes: '' });
    loadKeys();
  };

  const openCheckout = (key: KeyRecord) => {
    setSelectedKey(key);
    setModalState('checkout');
  };

  const openReturn = (key: KeyRecord) => {
    setSelectedKey(key);
    setModalState('return');
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="h1 flex items-center gap-3 text-slate-900">
            <Key className="text-primary" size={32} />
            Controle de Chaves
          </h1>
          <p className="body mt-1 text-slate-500">
            Gerencie localização, retirada e devolução das chaves dos imóveis.
          </p>
        </div>
        <button
          onClick={() => setModalState('register')}
          className="btn btn-primary shadow-lg shadow-primary/25"
        >
          <Plus size={20} /> Registrar Chave
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-premium p-5 text-center">
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="group relative max-w-sm">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por imóvel ou código..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field bg-slate-50 pl-11"
            />
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Carregando chaves...
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Nenhuma chave cadastrada.
            </div>
          ) : (
            filteredKeys.map((item) => {
              const cfg = statusConfig[item.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 p-5 transition-colors hover:bg-slate-50/50 md:flex-row md:items-center"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${cfg.bg}`}
                    >
                      <Icon size={22} className={cfg.color} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.label}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">
                        {item.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 md:items-end">
                    <span
                      className={`self-start rounded-full px-3 py-1 text-[10px] font-bold uppercase md:self-auto ${cfg.bg} ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                    {item.responsible_name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User size={12} /> {item.responsible_name}
                      </div>
                    )}
                    {item.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Home size={12} /> {item.location}
                      </div>
                    )}
                    {item.expected_return_at && (
                      <div
                        className={`flex items-center gap-1.5 text-xs font-bold ${item.status === 'overdue' ? 'text-red-600' : 'text-slate-500'}`}
                      >
                        <Clock size={12} /> Dev. prevista:{' '}
                        {new Date(item.expected_return_at).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {item.status === 'available' ? (
                      <button
                        onClick={() => openCheckout(item)}
                        className="btn h-9 border border-blue-200 bg-blue-50 px-3 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        <ArrowUpRight size={14} /> Retirar
                      </button>
                    ) : (
                      <button
                        onClick={() => openReturn(item)}
                        className="btn h-9 border border-green-200 bg-green-50 px-3 text-xs text-green-700 hover:bg-green-100"
                      >
                        <ArrowDownLeft size={14} /> Devolver
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {modalState === 'register' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Registrar Nova Chave</h3>
              <button onClick={() => setModalState(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Identificação do Imóvel</label>
                <input
                  type="text"
                  required
                  value={registerForm.label}
                  onChange={(e) => setRegisterForm({ ...registerForm, label: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Apto 101 - Ed. Solar"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Código da Chave</label>
                <input
                  type="text"
                  required
                  value={registerForm.code}
                  onChange={(e) => setRegisterForm({ ...registerForm, code: e.target.value })}
                  className="input-field"
                  placeholder="Ex: CH-001"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Localização (Opcional)</label>
                <input
                  type="text"
                  value={registerForm.location}
                  onChange={(e) => setRegisterForm({ ...registerForm, location: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Quadro 2, Gancho 5"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setModalState(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalState === 'checkout' && selectedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Retirar Chave</h3>
              <button onClick={() => setModalState(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Imóvel: <strong>{selectedKey.label}</strong> (Código: {selectedKey.code})
            </p>
            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Nome do Responsável</label>
                <input
                  type="text"
                  required
                  value={checkoutForm.responsible_name}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, responsible_name: e.target.value })}
                  className="input-field"
                  placeholder="Quem está retirando a chave"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Documento (Opcional)</label>
                  <input
                    type="text"
                    value={checkoutForm.document}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, document: e.target.value })}
                    className="input-field"
                    placeholder="CPF, RG ou CRECI"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Prazo (Horas)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={checkoutForm.returnHours}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, returnHours: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Observações (Opcional)</label>
                <textarea
                  value={checkoutForm.notes}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="Detalhes adicionais..."
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setModalState(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary bg-blue-600 hover:bg-blue-700">
                  Confirmar e Gerar Termo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalState === 'return' && selectedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Devolver Chave</h3>
              <button onClick={() => setModalState(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                Imóvel: <strong>{selectedKey.label}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Responsável: <strong>{selectedKey.responsible_name}</strong>
              </p>
            </div>
            <form onSubmit={handleReturn} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Observações de Devolução (Opcional)</label>
                <textarea
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="Chave devolvida com defeito, cópia extra entregue, etc..."
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setModalState(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary bg-green-600 hover:bg-green-700">
                  Confirmar e Gerar Recibo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
