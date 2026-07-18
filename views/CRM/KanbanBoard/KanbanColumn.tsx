import React, { useMemo, useRef } from 'react';
import { Droppable, Draggable, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Lead } from '../../../types';
import { PipelineStage } from '../kanban/constants';
import LeadCard from './LeadCard';

interface KanbanColumnProps {
  stage: PipelineStage;
  stages: PipelineStage[];
  leads: Lead[];
  total: number;
  selectedIds: Set<string>;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: (stageId: string) => void;
  onOpen: (lead: Lead) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onMove: (id: string, status: string) => void;
  navigate: (path: string) => void;
}

const KanbanColumn = React.memo(({
  stage, stages, leads, total, selectedIds, hasMore, loadingMore,
  onLoadMore, onOpen, onToggle, onDelete, onMove, navigate,
}: KanbanColumnProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const columnVgv = useMemo(() => {
    const t = leads.reduce((sum, lead) => {
      const price = Number((lead as any).budget || lead.property?.price || 0);
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);
    return t > 0 ? t.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }) : null;
  }, [leads]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: leads.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 112,
    overscan: 4,
    getItemKey: (index) => leads[index]?.id || index,
  });

  const renderDraggable = (lead: Lead, provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={snapshot.isDragging ? 'rotate-1 opacity-95 shadow-xl' : ''}>
      <LeadCard lead={lead} stages={stages} selected={selectedIds.has(lead.id)} onOpen={onOpen} onToggle={onToggle} onDelete={onDelete} onMove={onMove} navigate={navigate} />
    </div>
  );

  return (
    <Droppable droppableId={stage.id} mode="virtual" renderClone={(provided, snapshot, rubric) => renderDraggable(leads[rubric.source.index], provided, snapshot)}>
      {(provided, snapshot) => (
        <section id={`kanban-stage-${stage.id}`} className={`flex h-full min-w-[17rem] flex-col overflow-hidden rounded-xl border border-slate-200 ${snapshot.isDraggingOver ? 'bg-indigo-50/70 ring-2 ring-indigo-200' : 'bg-slate-50'}`}>
          <header className="border-b border-slate-200 bg-white px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold uppercase ${stage.color}`}><stage.icon size={11} /> {stage.label}</span>
              <span className="text-[11px] font-bold text-slate-500">{total}</span>
            </div>
            {columnVgv && <p className="mt-1.5 text-[10px] font-semibold text-slate-400">VGV <span className="font-bold text-slate-600">{columnVgv}</span></p>}
          </header>
          <div ref={(el) => { scrollRef.current = el; provided.innerRef(el); }} {...provided.droppableProps} className="h-[calc(100vh-18rem)] min-h-[28rem] overflow-y-auto p-2">
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const l = leads[virtualRow.index];
                return (
                  <div key={l.id} data-index={virtualRow.index} ref={virtualizer.measureElement} className="pb-3" style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}>
                    <Draggable draggableId={l.id} index={virtualRow.index}>{(dragProvided, dragSnapshot) => renderDraggable(l, dragProvided, dragSnapshot)}</Draggable>
                  </div>
                );
              })}
            </div>
            {hasMore && <button type="button" onClick={() => onLoadMore(stage.id)} disabled={loadingMore} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase text-slate-600 disabled:opacity-50">{loadingMore ? 'Carregando...' : 'Carregar mais'}</button>}
          </div>
        </section>
      )}
    </Droppable>
  );
});
KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;
