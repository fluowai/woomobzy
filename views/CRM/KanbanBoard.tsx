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
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <div
        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between border-b px-6 py-4 shadow-md gap-4 ${matchProfile === 'rural' ? 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 border-emerald-800' : 'bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 border-indigo-800'}`}
      >
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full sm:w-64 rounded-xl border border-white/20 bg-white/10 pl-10 pr-3 text-sm font-semibold text-white outline-none placeholder:text-white/50 focus:border-white/40 focus:bg-white/20 transition-all backdrop-blur-sm"
              placeholder="Buscar leads..."
            />
          </div>
          <div className="hidden items-center gap-1.5 rounded-xl bg-black/20 p-1.5 md:flex backdrop-blur-md border border-white/10">
            {INTENT_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setIntentFilter(f.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${intentFilter === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                <f.icon size={14} /> {f.shortLabel}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedLeadIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2 text-xs font-bold text-red-200 hover:bg-red-500/40 hover:text-white border border-red-500/30 transition-all disabled:opacity-50"
            >
              <Trash2 size={14} /> Excluir ({selectedLeadIds.length})
            </button>
          )}
          <button
            onClick={() => setIsStageModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 border border-white/20 transition-all backdrop-blur-sm"
          >
            <LayoutGrid size={14} /> Etapas
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all shadow-lg border border-transparent ${matchProfile === 'rural' ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'}`}
          >
            <Plus size={16} /> Novo Lead
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
