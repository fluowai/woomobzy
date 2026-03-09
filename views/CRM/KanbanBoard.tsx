
import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { leadService } from '../../services/leads';
import { Lead } from '../../types';
import { MessageCircle, Phone, Clock, FileCheck, CheckCircle2, XCircle, Search, Calendar, User, Home, Send } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

const PIPELINE_STAGES = [
  { id: 'Novo', label: 'Novos', icon: MessageCircle, color: 'bg-blue-100 text-blue-700' },
  { id: 'Em Atendimento', label: 'Em Atendimento', icon: Phone, color: 'bg-amber-100 text-amber-700' },
  { id: 'Visita', label: 'Visita', icon: Calendar, color: 'bg-purple-100 text-purple-700' },
  { id: 'Proposta', label: 'Proposta', icon: FileCheck, color: 'bg-indigo-100 text-indigo-700' },
  { id: 'Fechado', label: 'Vendido', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
  { id: 'Perdido', label: 'Perdido', icon: XCircle, color: 'bg-red-100 text-red-700' },
];

const KanbanBoard: React.FC = () => {
    const { settings } = useSettings();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const { profile } = useAuth();
    const isImpersonating = !!localStorage.getItem('impersonatedOrgId');
    const isSuperAdmin = profile?.role === 'superadmin';

    const targetOrgId = (isSuperAdmin && !isImpersonating) ? undefined : profile?.organization_id;

    useEffect(() => {
        if (targetOrgId || (isSuperAdmin && !isImpersonating)) {
            loadLeads();
        }
    }, [targetOrgId, isSuperAdmin, isImpersonating]);

    const loadLeads = async () => {
        try {
            const data = await leadService.list(targetOrgId);
            setLeads(data);
        } catch (error) {
            console.error('Failed to load leads', error);
        } finally {
            setLoading(false);
        }
    };

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;

        if (source.droppableId === destination.droppableId) return;

        // Optimistic UI Update
        const updatedLeads = leads.map(lead => 
            lead.id === draggableId ? { ...lead, status: destination.droppableId as any } : lead
        );
        setLeads(updatedLeads);

        try {
            await leadService.updateStatus(draggableId, destination.droppableId);
        } catch (error) {
            console.error('Failed to update status', error);
            // Revert on failure
            loadLeads(); 
        }
    };

    const getLeadsByStage = (stageId: string) => {
        return leads.filter(lead => 
            lead.status === stageId && 
            (lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             lead.property?.title?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    if (loading) return <div className="p-10 text-center">Carregando CRM...</div>;

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                   <h1 className="text-3xl font-black text-slate-900">Pipeline de Vendas</h1>
                   <p className="text-slate-500">Gerencie seus leads e oportunidades</p>
                </div>
                
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type="text" 
                     placeholder="Buscar lead ou imóvel..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none w-64"
                   />
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4">
               <DragDropContext onDragEnd={onDragEnd}>
                 <div className="flex gap-4 h-full min-w-max">
                    {PIPELINE_STAGES.map(stage => {
                        const stageLeads = getLeadsByStage(stage.id);
                        return (
                           <Droppable key={stage.id} droppableId={stage.id}>
                             {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`w-80 flex-shrink-0 flex flex-col rounded-2xl ${snapshot.isDraggingOver ? 'bg-slate-100' : 'bg-slate-50'} border border-slate-100 max-h-full`}
                                >
                                   {/* Header */}
                                   <div className="p-4 border-b border-slate-100 bg-white/50 backdrop-blur rounded-t-2xl sticky top-0 z-10">
                                      <div className="flex items-center justify-between mb-2">
                                         <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${stage.color}`}>
                                           <stage.icon size={12} />
                                           {stage.label}
                                         </span>
                                         <span className="text-xs font-bold text-slate-400">{stageLeads.length}</span>
                                      </div>
                                      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                         <div className="h-full bg-slate-300 rounded-full" style={{ width: `${(stageLeads.length / (leads.length || 1)) * 100}%` }}></div>
                                      </div>
                                   </div>

                                   {/* Cards */}
                                   <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                      {stageLeads.map((lead, index) => (
                                         <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                            {(provided, snapshot) => (
                                               <div
                                                 ref={provided.innerRef}
                                                 {...provided.draggableProps}
                                                 {...provided.dragHandleProps}
                                                 className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group ${snapshot.isDragging ? 'rotate-2 shadow-xl ring-2 ring-indigo-500/20' : ''}`}
                                               >
                                                  <div className="flex items-start justify-between mb-3">
                                                      <div className="flex items-center gap-2">
                                                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                            {lead.name.slice(0, 2)}
                                                         </div>
                                                         <div>
                                                             <h4 className="font-bold text-slate-800 text-sm leading-tight">{lead.name}</h4>
                                                             <span className="text-[10px] text-slate-400 font-medium">Via {lead.source}</span>
                                                         </div>
                                                      </div>
                                                      <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Evita abrir o card (se houvesse clique no card)
                                                            window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank');
                                                        }}
                                                        className="text-emerald-500 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors"
                                                        title="Chamar no WhatsApp"
                                                      >
                                                         <MessageCircle size={16} />
                                                      </button>
                                                      <button 
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (!confirm(`Enviar mensagem de boas-vindas para ${lead.name}?`)) return;
                                                            try {
                                                                // Buscar configurações da Evolution API
                                                                const { data: settingsData } = await supabase
                                                                  .from('site_settings')
                                                                  .select('integrations')
                                                                  .single();

                                                                if (!settingsData?.integrations?.evolutionApi?.enabled) {
                                                                  alert('⚠️ Evolution API não está configurada ou está desativada');
                                                                  return;
                                                                }

                                                                const config = settingsData.integrations.evolutionApi;
                                                                
                                                                // Formatar telefone
                                                                const cleanPhone = lead.phone.replace(/\D/g, '');
                                                                const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

                                                                // Mensagem
                                                                const propertyTitle = lead.property?.title || 'um de nossos imóveis';
                                                                const message = `Olá, ${lead.name}! 👋\n\nRecebemos seu interesse em *${propertyTitle}*.\n\nNosso especialista já foi notificado e entrará em contato em breve para tirar suas dúvidas.\n\nEnquanto isso, salve nosso contato!`;

                                                                // Enviar via Evolution API
                                                                const apiUrl = `${config.baseUrl}/message/sendText/${config.instanceName}`;
                                                                
                                                                const res = await fetch(apiUrl, {
                                                                  method: 'POST',
                                                                  headers: {
                                                                    'apikey': config.token,
                                                                    'Content-Type': 'application/json'
                                                                  },
                                                                  body: JSON.stringify({
                                                                    number: formattedPhone,
                                                                    text: message
                                                                  })
                                                                });

                                                                if (res.ok) {
                                                                    alert('✅ Mensagem enviada com sucesso! Movendo para "Em Atendimento"...');
                                                                    
                                                                    // Atualiza no Banco
                                                                    await leadService.updateStatus(lead.id, 'Em Atendimento');
                                                                    
                                                                    // Atualiza na UI (Move o card)
                                                                    setLeads(prev => prev.map(l => 
                                                                        l.id === lead.id ? { ...l, status: 'Em Atendimento' } : l
                                                                    ));
                                                                } else {
                                                                    const errorData = await res.json().catch(() => ({}));
                                                                    alert('❌ Erro ao enviar: ' + (errorData.message || res.statusText));
                                                                }
                                                            } catch (err: any) {
                                                                console.error(err);
                                                                alert('❌ Erro: ' + err.message);
                                                            }
                                                        }}
                                                        className="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
                                                        title="Testar Envio Automático"
                                                      >
                                                         <Send size={16} />
                                                      </button>
                                                  </div>
                                                  
                                                  {lead.property && (
                                                     <div className="bg-slate-50 rounded-lg p-2 flex items-center gap-3 mb-3 hover:bg-slate-100 transition-colors cursor-pointer group/prop">
                                                        <img 
                                                           src={lead.property.image || 'https://via.placeholder.com/40'} 
                                                           className="w-10 h-10 rounded-md object-cover" 
                                                        />
                                                        <div className="flex-1 overflow-hidden">
                                                           <p className="text-xs font-bold text-slate-700 truncate">{lead.property.title}</p>
                                                           <p className="text-[10px] text-slate-500 truncate">{lead.property.price?.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}</p>
                                                        </div>
                                                     </div>
                                                  )}

                                                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                     <span className="flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {new Date(lead.createdAt).toLocaleDateString()}
                                                     </span>
                                                  </div>
                                               </div>
                                            )}
                                         </Draggable>
                                      ))}
                                      {provided.placeholder}
                                   </div>
                                </div>
                             )}
                           </Droppable>
                        );
                    })}
                 </div>
               </DragDropContext>
            </div>
        </div>
    );
};

export default KanbanBoard;
