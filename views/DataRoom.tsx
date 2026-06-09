import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Lock,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  Loader2,
  RefreshCw,
  Upload,
  Brain,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import DocumentUpload from '../components/DocumentUpload';

interface ApiDocument {
  id: string;
  document_type: string;
  original_name: string;
  status: string;
  validation_status: string;
  validation_score: number;
  classification_confidence: number;
  ocr_confidence: number;
  extracted_data: Record<string, any>;
  created_at: string;
}

const DOC_TYPE_LABELS: Record<string, { name: string; icon: string }> = {
  CAR: { name: 'Cadastro Ambiental Rural', icon: '🌳' },
  ESCRITURA: { name: 'Escritura do Imóvel', icon: '📜' },
  MATRICULA: { name: 'Matrícula Atualizada', icon: '📋' },
  CCIR: { name: 'Certificado de Cadastro de Imóvel Rural', icon: '📄' },
  ITR: { name: 'Imposto Territorial Rural', icon: '💰' },
  IPTU: { name: 'IPTU', icon: '🏠' },
  CONTRATO: { name: 'Contrato', icon: '📝' },
  CND: { name: 'Certidão Negativa de Débitos', icon: '✅' },
  SIGEF: { name: 'Georreferenciamento de Imóvel Rural', icon: '🗺️' },
  PROCURACAO: { name: 'Procuração', icon: '📃' },
  RG: { name: 'Documento de Identidade', icon: '🪪' },
  CPF: { name: 'Cadastro de Pessoa Física', icon: '🆔' },
  CNPJ: { name: 'Cadastro de Pessoa Jurídica', icon: '🏢' },
  COMPROVANTE_ENDERECO: { name: 'Comprovante de Endereço', icon: '📍' },
  COMPROVANTE_RENDA: { name: 'Comprovante de Renda', icon: '💵' },
  OUTRO: { name: 'Outro Documento', icon: '📎' },
};

const DataRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const loadDocuments = async () => {
      try {
        const res = await fetch(`/api/documents/${id}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setDocuments(data.documents || []);
        }
      } catch {
        // Silently fail, show empty
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [id, refreshKey]);

  const getStatusConfig = (doc: ApiDocument) => {
    if (doc.validation_status === 'valid' && doc.validation_score >= 70) {
      return { status: 'valid' as const, label: 'Documento Válido', color: 'text-emerald-500 bg-emerald-50 border-emerald-100' };
    }
    if (doc.validation_status === 'inconsistent' || (doc.validation_score > 0 && doc.validation_score < 70)) {
      return { status: 'warning' as const, label: 'Atenção Necessária', color: 'text-amber-500 bg-amber-50 border-amber-100' };
    }
    if (doc.status === 'failed') {
      return { status: 'expired' as const, label: 'Falha na Análise', color: 'text-rose-500 bg-rose-50 border-rose-100' };
    }
    if (doc.status === 'processing') {
      return { status: 'pending' as const, label: 'Em Análise...', color: 'text-blue-500 bg-blue-50 border-blue-100' };
    }
    if (doc.status === 'analyzed' && !doc.validation_status) {
      return { status: 'pending' as const, label: 'Aguardando Validação', color: 'text-slate-400 bg-slate-50 border-slate-100' };
    }
    return { status: 'pending' as const, label: 'Pendente', color: 'text-slate-400 bg-slate-50 border-slate-100' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      case 'expired': return <AlertTriangle size={18} />;
      default: return <Clock size={18} />;
    }
  };

  const overallScore = documents.length > 0
    ? Math.round(documents.reduce((sum, d) => sum + (d.validation_score || 0), 0) / documents.length)
    : 0;

  const getOverallStatus = () => {
    if (overallScore >= 80) return { label: 'APROVADO', color: 'text-emerald-400' };
    if (overallScore >= 50) return { label: 'EM ANÁLISE', color: 'text-amber-400' };
    return { label: 'PENDENTE', color: 'text-rose-400' };
  };

  const validatedCount = documents.filter(d => d.validation_status === 'valid').length;
  const pendingCount = documents.filter(d => d.status === 'pending' || d.status === 'processing').length;
  const warningCount = documents.filter(d => d.validation_status === 'inconsistent').length;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Lock size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Acesso Restrito - VIP Data Room
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
            Due Diligence <br />{' '}
            <span style={{ color: settings.primaryColor }}>
              Técnica & Jurídica
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-3 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 transition-all"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-5 py-3 bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-600 transition-all shadow-lg flex items-center gap-2"
          >
            <Upload size={16} />
            {showUpload ? 'Fechar' : 'Upload Documento'}
          </button>
        </div>
      </div>

      {showUpload && id && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
          <DocumentUpload
            propertyId={id}
            onUploadComplete={() => {
              setShowUpload(false);
              setRefreshKey(k => k + 1);
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900">
                Documentação {documents.length > 0 && `(${documents.length})`}
              </h3>
              {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 size={24} className="animate-spin mr-2" />
                Carregando documentos...
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum documento enviado</p>
                <p className="text-sm mt-1">Clique em "Upload Documento" para adicionar</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {documents.map((doc) => {
                  const cfg = getStatusConfig(doc);
                  const label = DOC_TYPE_LABELS[doc.document_type] || { name: doc.document_type || 'Não classificado', icon: '📎' };
                  return (
                    <div key={doc.id} className="py-6 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl border transition-all ${cfg.color}`}>
                          <FileText size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 text-sm uppercase">
                              {label.name}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-300">
                              [{doc.document_type || '?'}]
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${cfg.color.split(' ')[0]}`}>
                              {getStatusIcon(cfg.status)}
                              {cfg.label}
                            </div>
                            {doc.validation_score > 0 && (
                              <span className="text-[10px] font-medium text-slate-400">
                                Score: {doc.validation_score}%
                              </span>
                            )}
                          </div>
                          {doc.extracted_data && Object.keys(doc.extracted_data).length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {Object.entries(doc.extracted_data).slice(0, 3).map(([key, value]) => (
                                <span key={key} className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">
                                  {key}: {String(value).slice(0, 30)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => window.open(`/api/documents/${doc.id}/analysis`, '_blank')}
                          className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                        >
                          <Brain size={18} />
                        </button>
                        <button className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldCheck size={120} />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-black uppercase italic tracking-tighter mb-4">
                Status da Auditoria
              </h3>
              <div className="space-y-6 mt-8">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      Conformidade Geral
                    </span>
                    <span className="text-xl font-black italic">{overallScore}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        overallScore >= 80 ? 'bg-emerald-400' : overallScore >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${Math.max(overallScore, 5)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                      Documentos OK
                    </p>
                    <p className="text-sm font-black text-emerald-400">{validatedCount}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                      Pendentes
                    </p>
                    <p className="text-sm font-black text-amber-400">{pendingCount}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                      Inconsistentes
                    </p>
                    <p className="text-sm font-black text-rose-400">{warningCount}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                      Status Geral
                    </p>
                    <p className={`text-sm font-black ${getOverallStatus().color}`}>
                      {getOverallStatus().label}
                    </p>
                  </div>
                </div>
              </div>

              <button className="w-full mt-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg">
                Gerar Dossiê Completo (PDF)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
              <ExternalLink size={14} className="text-indigo-600" /> Canais Oficiais
            </h4>
            <div className="space-y-4">
              {[
                { name: 'Portal SICAR', url: 'https://www.car.gov.br' },
                { name: 'Incra / SIGEF', url: 'https://sigef.incra.gov.br' },
                { name: 'Portal SNCR', url: 'https://sncr.incra.gov.br' },
              ].map((portal) => (
                <a
                  key={portal.name}
                  href={portal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                >
                  <span className="text-xs font-bold text-slate-600">
                    {portal.name}
                  </span>
                  <ChevronRight size={14} className="text-slate-300" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataRoom;
