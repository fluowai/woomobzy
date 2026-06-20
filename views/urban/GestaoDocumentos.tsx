import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, FolderOpen, Link, Search, Trash2, Upload } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { uploadFile } from '../../services/storage';

type UrbanDocument = {
  id: string;
  name: string;
  document_type: string;
  status: 'pending' | 'approved' | 'signed' | 'expired' | 'rejected';
  file_url?: string;
  file_size?: string;
  created_at?: string;
  property?: { title?: string };
};

const statusColors: Record<UrbanDocument['status'], string> = {
  signed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  expired: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
};

const statusLabels: Record<UrbanDocument['status'], string> = {
  signed: 'Assinado',
  pending: 'Pendente',
  approved: 'Aprovado',
  expired: 'Vencido',
  rejected: 'Rejeitado',
};

export default function GestaoDocumentos() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<UrbanDocument[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!profile?.organization_id) return;

    setLoading(true);
    const { data } = await supabase
      .from('urban_documents')
      .select('id,name,document_type,status,file_url,file_size,created_at,property:property_id(title)')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(50);

    setDocuments((data || []) as UrbanDocument[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile?.organization_id]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.organization_id) return;

    setUploading(true);
    const fileUrl = await uploadFile(
      file,
      'imobzyimg',
      `urban-documents/${profile.organization_id}`
    );
    if (fileUrl) {
      await supabase.from('urban_documents').insert({
        organization_id: profile.organization_id,
        name: file.name,
        document_type: 'general',
        status: 'pending',
        file_url: fileUrl,
        file_size: `${Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB`,
      });
      await load();
    }
    setUploading(false);
    event.target.value = '';
  };

  const deleteDocument = async (id: string) => {
    if (!profile?.organization_id || !window.confirm('Excluir este documento?')) return;
    await supabase
      .from('urban_documents')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id);
    load();
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return documents;
    return documents.filter((doc) =>
      `${doc.name} ${doc.document_type} ${doc.property?.title || ''}`.toLowerCase().includes(term)
    );
  }, [documents, search]);

  const counters = useMemo(
    () => [
      { label: 'Contratos', value: documents.filter((doc) => doc.document_type === 'contract').length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Vistorias', value: documents.filter((doc) => doc.document_type === 'inspection').length, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Documentos pessoais', value: documents.filter((doc) => doc.document_type === 'personal').length, icon: FolderOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'Pendentes', value: documents.filter((doc) => doc.status === 'pending').length, icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
    ],
    [documents]
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="h1 flex items-center gap-3 text-slate-900">
            <FileText className="text-primary" size={32} />
            Gestao de Documentos
          </h1>
          <p className="body mt-1 text-slate-500">
            Armazene, organize e compartilhe documentos vinculados aos seus imoveis e clientes.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="https://drive.google.com/" target="_blank" rel="noreferrer" className="btn border border-slate-200 bg-slate-100 text-slate-700">
            <Link size={18} /> Google Drive
          </a>
          <label className="btn btn-primary cursor-pointer shadow-lg shadow-primary/25">
            <Upload size={18} /> {uploading ? 'Enviando...' : 'Enviar Documento'}
            <input type="file" className="hidden" disabled={uploading} onChange={handleUpload} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {counters.map((item) => (
          <div key={item.label} className="card-premium flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.bg}`}>
              <item.icon size={22} className={item.color} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{item.value}</p>
              <p className="text-xs font-semibold text-slate-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
          <h2 className="font-black text-slate-900">Documentos recentes</h2>
          <div className="group relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary" size={16} />
            <input
              type="text"
              placeholder="Buscar documento..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field h-9 bg-slate-50 pl-9 text-sm"
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Nome', 'Tipo', 'Imovel', 'Data', 'Status', 'Acoes'].map((header) => (
                <th key={header} className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm text-slate-400">Carregando documentos...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm text-slate-400">Nenhum documento cadastrado.</td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id} className="group transition-colors hover:bg-slate-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <FileText size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 transition-colors group-hover:text-primary">{doc.name}</p>
                        <p className="text-xs text-slate-400">{doc.file_size || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{doc.document_type}</td>
                  <td className="p-4 text-sm text-slate-600">{doc.property?.title || '-'}</td>
                  <td className="p-4 text-sm text-slate-500">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusColors[doc.status]}`}>
                      {statusLabels[doc.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {doc.file_url && (
                        <>
                          <a href={doc.file_url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"><Eye size={16} /></a>
                          <a href={doc.file_url} download className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"><Download size={16} /></a>
                        </>
                      )}
                      <button onClick={() => deleteDocument(doc.id)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
