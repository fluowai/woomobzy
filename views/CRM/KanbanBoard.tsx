import { logger } from '@/utils/logger';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { leadService } from '../../services/leads';
import { Lead } from '../../types';
import { Search, Plus, Trash2, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  PIPELINE_STAGES,
  INTENT_FILTERS,
  IntentFilter,
  PipelineStage,
  StagePageState,
  createEmptyStageState,
} from './kanban/constants';
import { loadCustomStages, saveCustomStages } from './kanban/helpers';

import NewLeadModal from './KanbanBoard/NewLeadModal';
import EditLeadModal from './KanbanBoard/EditLeadModal';
import LeadDetailsModal from './KanbanBoard/LeadDetailsModal';
import NewStageModal from './KanbanBoard/NewStageModal';
import LeadCard from './KanbanBoard/LeadCard';
import KanbanColumn from './KanbanBoard/KanbanColumn';

const KanbanBoard: React.FC = () => {
  const matchProfile: 'urbano' | 'rural' = window.location.pathname.startsWith(
    '/rural'
  )
    ? 'rural'
    : 'urbano';
  const navigate = useNavigate();
  const [customStages, setCustomStages] = useState<PipelineStage[]>(() =>
    loadCustomStages(matchProfile)
  );
  const pipelineStages = useMemo(
    () => [...PIPELINE_STAGES, ...customStages],
    [customStages]
  );
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stageState, setStageState] = useState<StagePageState>(() =>
    createEmptyStageState(pipelineStages)
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [mobileStageId, setMobileStageId] = useState(pipelineStages[0].id);
  const [intentFilter, setIntentFilter] = useState<IntentFilter>('todos');

  const { profile, isImpersonating } = useAuth();
  const isSuperAdmin = profile?.role === 'superadmin';
  const targetOrgId =
    isSuperAdmin && !isImpersonating ? undefined : profile?.organization_id;

  useEffect(() => {
    setCustomStages(loadCustomStages(matchProfile));
    setMobileStageId(PIPELINE_STAGES[0].id);
  }, [matchProfile]);

  const handleCreateStage = useCallback(
    (stage: PipelineStage) => {
      setCustomStages((prev) => {
        const next = [...prev, stage];
        saveCustomStages(matchProfile, next);
        return next;
      });
      setStageState((prev) => ({
        ...prev,
        [stage.id]: {
          nextCursor: null,
          hasMore: false,
          total: 0,
          loadingMore: false,
        },
      }));
      setMobileStageId(stage.id);
      toast.success('Etapa criada no Kanban.');
    },
    [matchProfile]
  );

  const loadLeads = useCallback(async () => {
    if (!targetOrgId) return;
    try {
      setLoading(true);
      const intent = intentFilter === 'todos' ? null : intentFilter;
      const pages = await Promise.all(
        pipelineStages.map((stage) =>
          leadService.listPage({
            status: stage.id,
            intent,
            limit: 50,
            includeCount: true,
          })
        )
      );
      setLeads(pages.flatMap((page) => page.leads));
      setStageState(
        Object.fromEntries(
          pipelineStages.map((stage, index) => [
            stage.id,
            {
              nextCursor: pages[index].nextCursor,
              hasMore: pages[index].hasMore,
              total: pages[index].total,
              loadingMore: false,
            },
          ])
        )
      );
    } catch (error: any) {
      logger.error('Failed to load Kanban leads', error);
      toast.error('Erro ao carregar leads: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [targetOrgId, intentFilter, pipelineStages]);

  useEffect(() => {
    if (!targetOrgId) {
      setLeads([]);
      setStageState(createEmptyStageState(pipelineStages));
      setLoading(false);
      return;
    }
    loadLeads();
  }, [loadLeads, pipelineStages, targetOrgId]);

  const loadMoreStage = useCallback(
    async (stageId: string) => {
      const current = stageState[stageId];
      if (!current?.hasMore || !current.nextCursor || current.loadingMore)
        return;
      setStageState((prev) => ({
        ...prev,
        [stageId]: { ...prev[stageId], loadingMore: true },
      }));
      try {
        const page = await leadService.listPage({
          status: stageId,
          cursor: current.nextCursor,
          intent: intentFilter === 'todos' ? null : intentFilter,
          limit: 50,
          includeCount: false,
        });
        setLeads((prev) => [...prev, ...page.leads]);
        setStageState((prev) => ({
          ...prev,
          [stageId]: {
            ...prev[stageId],
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
            loadingMore: false,
          },
        }));
      } catch (error) {
        logger.error('Failed to load more leads', error);
        setStageState((prev) => ({
          ...prev,
          [stageId]: { ...prev[stageId], loadingMore: false },
        }));
      }
    },
    [stageState, intentFilter]
  );

  const handleDragEnd = useCallback((result: DropResult) => {
    if (
      !result.destination ||
      result.source.droppableId === result.destination.droppableId
    )
      return;
    const leadId = result.draggableId;
    const newStatus = result.destination.droppableId as Lead['status'];
    leadService.update(leadId, { status: newStatus } as any).catch((error) => {
      logger.error('Failed to move lead', error);
      toast.error('Erro ao mover lead');
    });
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
  }, []);

  const handleStatusChange = useCallback(
    (leadId: string, newStatus: string) => {
      const s = newStatus as Lead['status'];
      leadService
        .update(leadId, { status: s } as any)
        .catch((error) => logger.error('Failed to update lead status', error));
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: s as any } : l))
      );
    },
    []
  );

  const handleBulkDelete = useCallback(async () => {
    if (
      !selectedLeadIds.length ||
      !window.confirm(
        `Excluir ${selectedLeadIds.length} lead(s) permanentemente?`
      )
    )
      return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedLeadIds.map((id) => leadService.delete(id)));
      setLeads((prev) => prev.filter((l) => !selectedLeadIds.includes(l.id)));
      setSelectedLeadIds([]);
      toast.success(`${selectedLeadIds.length} lead(s) excluído(s).`);
    } catch (error) {
      logger.error('Bulk delete failed', error);
      toast.error('Erro ao excluir leads');
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedLeadIds]);

  const handleDelete = useCallback((id: string, name: string) => {
    if (!window.confirm(`Excluir lead "${name || id}" permanentemente?`))
      return;
    leadService
      .delete(id)
      .then(() => setLeads((prev) => prev.filter((l) => l.id !== id)))
      .catch((error) => {
        logger.error('Failed to delete lead', error);
        toast.error('Erro ao excluir lead');
      });
  }, []);

  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const term = searchTerm
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return leads.filter((l) =>
      [
        l.name,
        l.phone,
        l.email,
        l.classification,
        l.source,
        l.notes,
        ...(l.tags || []),
      ]
        .filter(Boolean)
        .some((field) =>
          String(field)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .includes(term)
        )
    );
  }, [leads, searchTerm]);

  const stageLeadMap = useMemo(() => {
    const map = new Map<string, Lead[]>();
    pipelineStages.forEach((s) => map.set(s.id, []));
    filteredLeads.forEach((l) => {
      const col = map.get(l.status);
      if (col) col.push(l);
    });
    return map;
  }, [filteredLeads, pipelineStages]);

  const selectedIdsSet = useMemo(
    () => new Set(selectedLeadIds),
    [selectedLeadIds]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-56 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
              placeholder="Buscar leads..."
            />
          </div>
          <div className="hidden items-center gap-1 rounded-xl bg-slate-100 p-1 md:flex">
            {INTENT_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setIntentFilter(f.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${intentFilter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <f.icon size={12} /> {f.shortLabel}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedLeadIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 size={13} /> Excluir {selectedLeadIds.length}
            </button>
          )}
          <button
            onClick={() => setIsStageModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
          >
            <LayoutGrid size={13} /> Etapas
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700"
          >
            <Plus size={14} /> Novo Lead
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-slate-600"></div>
            <p className="text-xs font-bold text-slate-400">
              Carregando leads...
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-x-auto p-4 md:p-6">
          {/* Mobile: select de coluna + leads filtrados */}
          <div className="flex w-full flex-col gap-3 md:hidden">
            <select
              value={mobileStageId}
              onChange={(e) => setMobileStageId(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800"
            >
              {pipelineStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({stageLeadMap.get(s.id)?.length || 0})
                </option>
              ))}
            </select>
            <div className="space-y-2">
              {(stageLeadMap.get(mobileStageId) || []).map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  stages={pipelineStages}
                  selected={selectedIdsSet.has(lead.id)}
                  onOpen={(l) => {
                    setSelectedLead(l);
                    setIsDetailsOpen(true);
                  }}
                  onToggle={(id) =>
                    setSelectedLeadIds((prev) =>
                      prev.includes(id)
                        ? prev.filter((x) => x !== id)
                        : [...prev, id]
                    )
                  }
                  onDelete={handleDelete}
                  onMove={handleStatusChange}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>

          {/* Desktop: Kanban columns */}
          <div className="hidden md:flex md:gap-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              {pipelineStages.map((stage) => {
                const columnLeads = stageLeadMap.get(stage.id) || [];
                const state = stageState[stage.id];
                return (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    stages={pipelineStages}
                    leads={columnLeads}
                    total={state?.total ?? columnLeads.length}
                    selectedIds={selectedIdsSet}
                    hasMore={state?.hasMore ?? false}
                    loadingMore={state?.loadingMore ?? false}
                    onLoadMore={loadMoreStage}
                    onOpen={(l) => {
                      setSelectedLead(l);
                      setIsDetailsOpen(true);
                    }}
                    onToggle={(id) =>
                      setSelectedLeadIds((prev) =>
                        prev.includes(id)
                          ? prev.filter((x) => x !== id)
                          : [...prev, id]
                      )
                    }
                    onDelete={handleDelete}
                    onMove={handleStatusChange}
                    navigate={navigate}
                  />
                );
              })}
            </DragDropContext>
          </div>
        </div>
      )}

      <NewLeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadLeads}
        orgId={targetOrgId}
        matchProfile={matchProfile}
      />
      <LeadDetailsModal
        isOpen={isDetailsOpen}
        lead={selectedLead}
        onClose={() => setIsDetailsOpen(false)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        stages={pipelineStages}
        navigate={navigate}
      />
      <EditLeadModal
        isOpen={isEditOpen}
        lead={selectedLead}
        onClose={() => setIsEditOpen(false)}
        onSaved={(updated) =>
          setLeads((prev) =>
            prev.map((l) => (l.id === updated.id ? updated : l))
          )
        }
      />
      <NewStageModal
        isOpen={isStageModalOpen}
        existingStages={pipelineStages}
        onClose={() => setIsStageModalOpen(false)}
        onCreate={handleCreateStage}
      />
    </div>
  );
};

export default KanbanBoard;
