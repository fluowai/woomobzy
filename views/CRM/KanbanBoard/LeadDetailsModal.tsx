import React, { useEffect, useState } from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  Home,
  Trash2,
  Copy,
  Tag,
  CheckCircle2,
  XCircle,
  Sparkles,
  X,
  Calendar,
  Thermometer,
  BrainCircuit,
  Wallet,
  MapPin,
  Clock,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../services/supabase';
import { Lead } from '../../../types';
import { PipelineStage } from '../kanban/constants';
import {
  getLeadDisplayName,
  getLeadInitials,
  getSlaInfo,
  openLeadWhatsAppConversation,
  isWithinLeadBudget,
} from '../kanban/helpers';

interface LeadDetailsModalProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
  stages: PipelineStage[];
  navigate: (path: string) => void;
}

const buildMatchWhatsappMessage = (lead: Lead, matches: any[]) => {
  const firstName = lead.name?.split(' ')[0] || 'tudo bem';
  if (!matches.length) {
    return `Olá ${firstName}, estou analisando novas opções para o seu perfil e te aviso assim que encontrar imóveis realmente aderentes.`;
  }
  return [
    `Olá ${firstName}, encontrei alguns imóveis que combinam com o seu perfil.`,
    '',
    ...matches
      .slice(0, 3)
      .flatMap((match, index) =>
        [
          `${index + 1}. ${match.title}`,
          match.city || match.state
            ? `- ${[match.city, match.state].filter(Boolean).join(' / ')}`
            : null,
          match.price
            ? `- ${match.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
            : null,
          ...(match.reasons || [])
            .slice(0, 2)
            .map((reason: string) => `- ${reason}`),
          '',
        ].filter(Boolean)
      ),
    'Posso te enviar mais detalhes?',
  ].join('\n');
};

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  lead,
  onClose,
  onStatusChange,
  onDelete,
  stages,
  navigate,
}) => {
  const [matchingProperties, setMatchingProperties] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'historico' | 'matches' | 'detalhes'>('historico');

  useEffect(() => {
    if (!isOpen || !lead?.id) return;
    setMatchingProperties([]);
    setLoadingMatches(true);
    const fetchMatches = async () => {
      try {
        const { data } = await supabase.rpc('match_properties_to_lead', {
          lead_id: lead.id,
          max_results: 5,
        });
        setMatchingProperties(data || []);
      } catch {
        /* silencio */
      }
      setLoadingMatches(false);
    };
    fetchMatches();
  }, [isOpen, lead?.id]);

  const handleCopyMessage = async () => {
    const msg = `*Lead:* ${lead?.name}\n*Telefone:* ${lead?.phone}\n*Email:* ${lead?.email}\n*Classificação:* ${lead?.classification || '-'}\n*Origem:* ${lead?.source}\n*Observações:* ${lead?.notes || '-'}`;
    await navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !lead) return null;

  const sla = getSlaInfo(lead);

  const getTemperatureColor = (temp?: string) => {
    if (temp === 'quente') return 'text-red-500 bg-red-50 border-red-200';
    if (temp === 'morno') return 'text-orange-500 bg-orange-50 border-orange-200';
    if (temp === 'frio') return 'text-blue-500 bg-blue-50 border-blue-200';
    return 'text-slate-500 bg-slate-50 border-slate-200';
  };

  const getTemperatureLabel = (temp?: string) => {
    if (temp === 'quente') return 'Quente';
    if (temp === 'morno') return 'Morno';
    if (temp === 'frio') return 'Frio';
    return 'Não Avaliado';
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6 overflow-hidden">
      {/* Container Principal */}
      <div className="w-full max-w-6xl h-[90vh] bg-slate-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <header className="bg-white border-b border-slate-200 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-bold text-indigo-700 shadow-inner">
              {getLeadInitials(lead)}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {getLeadDisplayName(lead)}
                {lead.ai_profile?.temperature && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTemperatureColor(lead.ai_profile.temperature)}`}>
                    {getTemperatureLabel(lead.ai_profile.temperature)}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm font-semibold text-slate-500">
                <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                  <Briefcase size={14} className="text-slate-400" /> {lead.source || 'Origem não informada'}
                </span>
                {lead.classification && (
                  <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                    <Tag size={14} className="text-slate-400" /> {lead.classification}
                  </span>
                )}
                {lead.lead_score != null && (
                  <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-xs">
                    <Thermometer size={14} /> Score: {lead.lead_score}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openLeadWhatsAppConversation(lead, navigate)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all"
            >
              <MessageCircle size={16} /> WhatsApp
            </button>
            <button
              onClick={handleCopyMessage}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <Copy size={16} /> {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={onClose}
              className="ml-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Trilha do Pipeline */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-2 shrink-0">
            Funil de Vendas:
          </div>
          {stages.map((stage, index) => {
            const isCurrent = lead.status === stage.id;
            const currentIndex = stages.findIndex(s => s.id === lead.status);
            const isPast = index < currentIndex;
            
            let btnClass = "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ";
            if (isCurrent) {
              btnClass += "bg-indigo-600 text-white border-indigo-600 shadow-md";
            } else if (isPast) {
              btnClass += "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100";
            } else {
              btnClass += "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600";
            }

            return (
              <React.Fragment key={stage.id}>
                <button onClick={() => onStatusChange(lead.id, stage.id)} className={btnClass}>
                  {stage.label}
                </button>
                {index < stages.length - 1 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Layout Split */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          
          {/* Sidebar Esquerda (Informações do Lead) */}
          <div className="w-full md:w-80 bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar p-6 shrink-0 flex flex-col gap-6">
            
            {/* Contato */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contato</h4>
              <div className="flex flex-col gap-3">
                <a href={`tel:${lead.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 group transition-colors">
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:text-indigo-600 text-slate-500">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Telefone</p>
                    <p className="text-sm font-bold text-slate-800">{lead.phone || 'Não informado'}</p>
                  </div>
                </a>
                <a href={`mailto:${lead.email}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 group transition-colors">
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:text-indigo-600 text-slate-500">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">E-mail</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{lead.email || 'Não informado'}</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Perfil e Interesses */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Perfil de Interesse</h4>
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Wallet size={14} />
                    <span className="text-xs font-bold">Orçamento Estimado</span>
                  </div>
                  <p className="text-lg font-black text-emerald-700">
                    {lead.budget ? lead.budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não definido'}
                  </p>
                </div>
                
                {lead.preferences && (
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                    {lead.preferences.type && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Tipo</p>
                        <p className="text-xs font-bold text-slate-700">{lead.preferences.type}</p>
                      </div>
                    )}
                    {lead.preferences.neighborhood && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Bairro</p>
                        <p className="text-xs font-bold text-slate-700 truncate" title={lead.preferences.neighborhood}>{lead.preferences.neighborhood}</p>
                      </div>
                    )}
                  </div>
                )}

                {lead.aptitude_interest && lead.aptitude_interest.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Aptidões</p>
                    <div className="flex flex-wrap gap-1">
                      {lead.aptitude_interest.map(apt => (
                        <span key={apt} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                          {apt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SLA e Próximos Passos */}
            <div className="space-y-3">
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">SLA & IA</h4>
               <div className="grid grid-cols-2 gap-3">
                 <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                   <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1"><Clock size={12}/> SLA</p>
                   <p className={`text-xs font-bold ${sla.labelClass}`}>{sla.label || 'Em dia'}</p>
                 </div>
                 <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                   <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1"><BrainCircuit size={12}/> Intenção</p>
                   <p className="text-xs font-bold text-slate-700 truncate" title={lead.ai_profile?.intent || 'Desconhecida'}>{lead.ai_profile?.intent || 'N/A'}</p>
                 </div>
               </div>
            </div>

          </div>

          {/* Área Principal (Conteúdo das Abas) */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
            {/* Header Abas */}
            <div className="px-6 pt-2 bg-white border-b border-slate-200 flex gap-6 shrink-0">
              <button
                onClick={() => setActiveTab('historico')}
                className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'historico' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Histórico e Tarefas
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'matches' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Imóveis Recomendados
                {matchingProperties.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'matches' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                    {matchingProperties.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('detalhes')}
                className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'detalhes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Detalhes
              </button>
            </div>

            {/* Conteúdo Aba */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              
              {activeTab === 'historico' && (
                <div className="max-w-3xl space-y-6">
                  {/* Próxima Ação IA */}
                  {lead.ai_profile?.nextAction && (
                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex gap-4 items-start shadow-sm">
                      <div className="bg-indigo-600 text-white p-2 rounded-lg shrink-0 mt-0.5">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Próxima Ação Sugerida pela IA</p>
                        <p className="text-sm font-bold text-indigo-950 mt-1">{lead.ai_profile.nextAction.title}</p>
                        {lead.ai_profile.nextAction.reason && (
                          <p className="text-xs text-indigo-700/80 mt-1">{lead.ai_profile.nextAction.reason}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Observações Atuais */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <MessageCircle size={16} className="text-slate-400" /> Observações do Lead
                      </h3>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm min-h-[150px]">
                      {lead.notes ? (
                        <p className="whitespace-pre-wrap text-sm text-slate-700 font-medium leading-relaxed">
                          {lead.notes}
                        </p>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm font-medium text-slate-400 italic">
                          Nenhuma observação registrada para este lead.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'matches' && (
                <div className="max-w-3xl space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-500">
                      Encontramos opções na base de dados que combinam com o perfil deste cliente.
                    </p>
                    <button
                      onClick={async () => {
                        setLoadingMatches(true);
                        const { data } = await supabase.rpc(
                          'match_properties_to_lead',
                          { lead_id: lead.id, max_results: 5 }
                        );
                        setMatchingProperties(data || []);
                        setLoadingMatches(false);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-white border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors"
                      disabled={loadingMatches}
                    >
                      <Sparkles size={14} />{' '}
                      {loadingMatches ? 'Analisando...' : 'Atualizar matches'}
                    </button>
                  </div>

                  {loadingMatches ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-b-indigo-600 animate-spin"></div>
                      <p className="text-sm font-bold text-slate-500">Buscando as melhores opções...</p>
                    </div>
                  ) : matchingProperties.length > 0 ? (
                    <div className="space-y-3">
                      {matchingProperties.map((match, i) => {
                        const budgetCheck = isWithinLeadBudget(lead, match.price);
                        return (
                          <div
                            key={match.property_id || i}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${budgetCheck ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => navigate(`/properties/${match.property_id}`)}>
                                {match.title}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                  <MapPin size={12} className="text-slate-400" />
                                  {[match.city, match.state].filter(Boolean).join(' / ')}
                                </p>
                                {match.score != null && (
                                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                                    <Sparkles size={10} /> {Math.round(match.score)}% Match
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                              <span className="text-base font-black text-emerald-700">
                                {match.price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              {budgetCheck ? (
                                <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                  <CheckCircle2 size={12} /> Dentro do Orçamento
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                  <XCircle size={12} /> Acima do Orçamento
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      <div className="pt-4">
                        <button
                          onClick={async () => {
                            const msg = buildMatchWhatsappMessage(lead, matchingProperties);
                            await navigator.clipboard.writeText(msg);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                            toast.success('Mensagem copiada para enviar ao cliente!');
                          }}
                          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
                        >
                          <Copy size={16} />{' '}
                          {copied ? 'Mensagem Copiada!' : 'Copiar Apresentação para WhatsApp'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white py-16">
                      <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                        <Home size={32} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-600">Nenhum imóvel compatível encontrado.</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Cadastre novos imóveis ou amplie os critérios de busca deste cliente.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'detalhes' && (
                <div className="max-w-3xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Data de Criação</p>
                      <p className="text-sm font-bold text-slate-800">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleString('pt-BR') : 'Não informada'}
                      </p>
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Referência do Anúncio (UTM)</p>
                      <p className="text-sm font-bold text-slate-800">
                        {lead.ad_reference || 'Nenhuma'}
                      </p>
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Campanha</p>
                      <p className="text-sm font-bold text-slate-800">
                        {lead.campaign || 'Orgânico'}
                      </p>
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Canal Orgânico</p>
                      <p className="text-sm font-bold text-slate-800">
                        {lead.organic_channel || '-'}
                      </p>
                    </div>
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="sm:col-span-2 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {lead.tags.map(tag => (
                            <span key={tag} className="bg-indigo-50 border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-md text-xs font-bold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja excluir permanentemente o lead ${lead.name}?`)) {
                          onDelete(lead.id, lead.name);
                          onClose();
                        }
                      }}
                      className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} /> Excluir Lead
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailsModal;
