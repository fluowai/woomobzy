import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Search, MapPin, Building2, Phone, MoreVertical, FileText, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { captacaoService, CaptacaoLead, CaptacaoStatus, CaptacaoLeadInput } from '@/src/services/captacao';
import CaptacaoModal from './Captacao/CaptacaoModal';
import { generateCmaPdfMock } from '@/utils/cmaGenerator'; // We will create this mock generator

const INITIAL_STAGES: { id: CaptacaoStatus; label: string; color: string }[] = [
  { id: 'mapeado', label: 'Mapeado (Radar)', color: 'bg-slate-100 border-slate-200 text-slate-800' },
  { id: 'contato', label: 'Tentativa de Contato', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { id: 'avaliacao', label: 'Avaliação / Visita', color: 'bg-amber-50 border-amber-200 text-amber-800' },
  { id: 'aprovacao', label: 'Aprovação de Docs', color: 'bg-purple-50 border-purple-200 text-purple-800' },
  { id: 'captado', label: 'Captado (Sucesso)', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
];

const CaptacaoFunil: React.FC = () => {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  const [items, setItems] = useState<CaptacaoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CaptacaoLeadInput & { id?: string } | undefined>(undefined);

  const loadData = useCallback(async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const data = await captacaoService.list(organizationId);
      setItems(data);
    } catch (error) {
      toast.error('Erro ao carregar captações');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) {
      return; // Reordenação na mesma coluna não implementada na API para MVP
    }

    const newStatus = destination.droppableId as CaptacaoStatus;
    const oldItems = [...items];
    
    // Update local state immediately for fast UI
    setItems((prev) => 
      prev.map((item) => 
        item.id === draggableId ? { ...item, status: newStatus } : item
      )
    );

    try {
      await captacaoService.update(draggableId, { status: newStatus });
      toast.success(`Imóvel movido para: ${INITIAL_STAGES.find(s => s.id === newStatus)?.label}`);
    } catch (error) {
      // Revert if error
      setItems(oldItems);
      toast.error('Erro ao mover imóvel. Tente novamente.');
    }
  };

  const handleSaveModal = async (data: CaptacaoLeadInput) => {
    if (!organizationId) return;
    try {
      if (editingItem?.id) {
        // Edit
        await captacaoService.update(editingItem.id, data);
        toast.success('Captação atualizada com sucesso!');
      } else {
        // Create
        await captacaoService.create(organizationId, data);
        toast.success('Novo alvo de captação criado!');
      }
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar captação');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir esta captação?')) return;
    try {
      await captacaoService.delete(id);
      setItems((prev) => prev.filter(i => i.id !== id));
      toast.success('Captação excluída');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handleGenerateReport = (item: CaptacaoLead, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.promise(generateCmaPdfMock(item), {
      loading: 'Gerando relatório com IA...',
      success: 'Relatório de Avaliação gerado com sucesso!',
      error: 'Erro ao gerar relatório',
    });
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.owner_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b px-6 py-4 shadow-md gap-4 bg-white">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="text-emerald-600" />
            Funil de Captação
          </h1>
          <p className="text-sm text-slate-500">Gerencie a prospecção de novos imóveis para a imobiliária.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white transition-all"
              placeholder="Buscar imóvel, endereço ou prop..."
            />
          </div>
          <button
            onClick={() => {
              setEditingItem(undefined);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition-all shadow-lg shadow-emerald-500/30"
          >
            <Plus size={16} /> Novo Alvo
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-x-auto p-4 md:p-6 gap-4">
        {loading ? (
          <div className="flex w-full items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            {INITIAL_STAGES.map((stage) => {
              const columnItems = filteredItems.filter(item => item.status === stage.id);
              
              return (
                <div key={stage.id} className="flex h-full w-[340px] shrink-0 flex-col rounded-xl bg-slate-100/50 border border-slate-200/60 p-3">
                  <div className={`mb-3 flex items-center justify-between rounded-lg border px-3 py-2 font-bold text-sm ${stage.color}`}>
                    <span className="truncate">{stage.label}</span>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/50 px-2 text-xs">
                      {columnItems.length}
                    </span>
                  </div>

                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 overflow-y-auto rounded-lg transition-colors p-1 ${
                          snapshot.isDraggingOver ? 'bg-slate-200/50' : ''
                        }`}
                      >
                        {columnItems.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsModalOpen(true);
                                }}
                                className={`mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md cursor-pointer group ${
                                  snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl ring-2 ring-emerald-500 ring-offset-2' : ''
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                                    {item.property_type}
                                  </span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => handleDelete(item.id, e)}
                                      className="p-1 text-slate-400 hover:text-red-500 bg-slate-50 rounded"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                                
                                <h3 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h3>
                                
                                <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-3 line-clamp-2">
                                  <MapPin size={14} className="shrink-0 mt-0.5" />
                                  <span>{item.address || 'Sem endereço'}</span>
                                </div>
                                
                                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-xs space-y-1.5">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Proprietário:</span>
                                    <span className="font-semibold text-slate-700 truncate max-w-[120px]">{item.owner_name || '--'}</span>
                                  </div>
                                  {item.owner_phone && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500"><Phone size={12} className="inline mr-1"/>Contato:</span>
                                      <span className="font-semibold text-slate-700">{item.owner_phone}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Valor Estimado:</span>
                                    <span className="font-bold text-emerald-600 text-sm">
                                      {item.estimated_value ? 
                                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.estimated_value) 
                                        : 'A avaliar'}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => handleGenerateReport(item, e)}
                                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                                  >
                                    <FileText size={12} />
                                    Gerar Relatório CMA
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </DragDropContext>
        )}
      </div>

      <CaptacaoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        initialData={editingItem}
      />
    </div>
  );
};

export default CaptacaoFunil;
