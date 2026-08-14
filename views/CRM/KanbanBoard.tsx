import { logger } from '@/utils/logger';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { leadService } from '../../services/leads';
import { Lead } from '../../types';
import {
  Search,
  Plus,
  Trash2,
  LayoutGrid,
  Users,
  BriefcaseBusiness,
  Flame,
  Clock3,
  UploadCloud,
  BarChart2,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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
import LeadDetailsModal from './KanbanBoard/LeadDetailsModal';
import NewStageModal from './KanbanBoard/NewStageModal';
import LeadCard from './KanbanBoard/LeadCard';
import KanbanColumn from './KanbanBoard/KanbanColumn';

function PipelineMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string | number;
  label: string;
}) {
  return (
    <div className="wootech-status-card">
      <div>
        <span className="wootech-status-icon">
          <Icon size={19} />
        </span>
        <div>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

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
  const [showAnalytics, setShowAnalytics] = useState(false);
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

  const handleRenameStage = useCallback(
    (stageId: string, newLabel: string) => {
      const normalized = newLabel.trim().replace(/\s+/g, ' ').slice(0, 32);
      if (!normalized) {
        toast.error('Informe o nome da etapa.');
        return;
      }
      const alreadyExists = pipelineStages.some(
        (s) =>
          s.id !== stageId &&
          s.label.toLocaleLowerCase('pt-BR') ===
            normalized.toLocaleLowerCase('pt-BR')
      );
      if (alreadyExists) {
        toast.error('Essa etapa ja existe no Kanban.');
        return;
      }
      setCustomStages((prev) => {
        const next = prev.map((s) =>
          s.id === stageId ? { ...s, label: normalized } : s
        );
        saveCustomStages(matchProfile, next);
        return next;
      });
      toast.success('Etapa renomeada.');
    },
    [matchProfile, pipelineStages]
  );

  const handleDeleteStage = useCallback(
    (stageId: string) => {
      const stage = pipelineStages.find((s) => s.id === stageId);
      const stageLabel = stage?.label || stageId;
      if (
        !window.confirm(
          `Excluir a etapa "${stageLabel}"? Os leads desta etapa serao movidos para a primeira etapa do funil.`
        )
      )
        return;
      const firstStageId = pipelineStages[0].id;
      const affectedIds = leads
        .filter((l) => l.status === stageId)
        .map((l) => l.id);

      Promise.all(
        affectedIds.map((leadId) =>
          leadService.update(leadId, { status: firstStageId } as any)
        )
      )
        .then(() => {
          setLeads((prev) =>
            prev.map((l) =>
              l.status === stageId
                ? { ...l, status: firstStageId as Lead['status'] }
                : l
            )
          );
          setCustomStages((prev) => {
            const next = prev.filter((s) => s.id !== stageId);
            saveCustomStages(matchProfile, next);
            return next;
          });
          setStageState((prev) => {
            const { [stageId]: _removed, ...rest } = prev;
            return rest;
          });
          toast.success('Etapa excluida do Kanban.');
        })
        .catch((error) => {
          logger.error('Failed to delete stage', error);
          toast.error('Erro ao excluir a etapa.');
        });
    },
    [leads, matchProfile, pipelineStages]
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
    <div className="wootech-reference-screen flex h-screen flex-col overflow-hidden bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-5 md:px-6">
        <div className="wootech-page-heading mb-5">
          <div>
            <div className="wootech-breadcrumb">
              <strong>CRM</strong>
              <span>/</span>
              <span>Funil comercial</span>
            </div>
            <h1>Pipeline comercial</h1>
            <p>
              Priorize leads, acompanhe SLA e avance oportunidades com
              inteligência.
            </p>
          </div>
          <div className="wootech-action-row">
            <button
              className={`wootech-secondary-action ${showAnalytics ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}`}
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              <BarChart2 size={16} /> Analytics
            </button>
            <button
              className="wootech-secondary-action"
              onClick={() => toast.info('Importação de leads em breve.')}
            >
              <UploadCloud size={16} /> Importar leads
            </button>
            <button
              className="wootech-primary-action"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={17} /> Novo lead
            </button>
          </div>
        </div>
        <div className="wootech-status-grid mb-0">
          <PipelineMetric
            icon={Users}
            value={leads.length}
            label="Leads ativos"
          />
          <PipelineMetric
            icon={BriefcaseBusiness}
            value={new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              notation: 'compact',
            }).format(
              leads.reduce((total, lead) => total + Number(lead.budget || 0), 0)
            )}
            label="VGV potencial"
          />
          <PipelineMetric
            icon={Flame}
            value={
              leads.filter((lead) =>
                ['quente', 'hot'].includes(
                  String(lead.classification || '').toLowerCase()
                )
              ).length
            }
            label="Leads quentes"
          />
          <PipelineMetric
            icon={Clock3}
            value={leads.filter((lead) => !lead.notes).length}
            label="Sem próximo passo"
          />
          <PipelineMetric
            icon={LayoutGrid}
            value={pipelineStages.length}
            label="Etapas do funil"
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 bg-white px-4 py-3 gap-3 md:px-6">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full sm:w-72 rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 transition-all"
              placeholder="Buscar lead, telefone, imóvel ou origem..."
            />
          </div>
          <div className="hidden items-center gap-1 rounded-lg bg-slate-100 p-1 md:flex border border-slate-200">
            {INTENT_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setIntentFilter(f.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${intentFilter === f.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
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
            className="wootech-secondary-action"
          >
            <LayoutGrid size={14} /> Etapas
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="wootech-primary-action"
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
        <div className="flex flex-1 flex-col overflow-hidden px-4 pb-4 pt-5 md:px-6">
          {showAnalytics && (
            <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Métricas do Funil
                </h3>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineStages.map(s => ({
                  name: s.label,
                  Leads: leads.filter(l => l.status === s.id).length,
                    }))}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="flex flex-1 overflow-x-auto">
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
        onUpdateLead={(updated) => {
          setLeads((prev) =>
            prev.map((l) => (l.id === updated.id ? updated : l))
          );
          setSelectedLead(updated);
        }}
      />
      <NewStageModal
        isOpen={isStageModalOpen}
        existingStages={pipelineStages}
        onClose={() => setIsStageModalOpen(false)}
        onCreate={handleCreateStage}
        onRename={handleRenameStage}
        onDelete={handleDeleteStage}
      />
    </div>
  );
};

export default KanbanBoard;
