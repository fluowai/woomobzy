import React, { useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SiteMenuItem, SitePage } from '../../types/site';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface MenuEditorProps {
  menuConfig: SiteMenuItem[];
  pages: SitePage[];
  onChange: (menu: SiteMenuItem[]) => void;
}

const SortableMenuItem: React.FC<{
  item: SiteMenuItem;
  pages: SitePage[];
  onUpdate: (id: string, updates: Partial<SiteMenuItem>) => void;
  onDelete: (id: string) => void;
}> = ({ item, pages, onUpdate, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-gray-700 rounded-lg border border-gray-600">
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-white">
        <GripVertical size={16} />
      </button>

      <div className="flex-1 flex items-center gap-2">
        <input
          type="text"
          value={item.label}
          onChange={(e) => onUpdate(item.id, { label: e.target.value })}
          className="bg-gray-600 text-white px-2 py-1 rounded text-sm flex-1 border border-gray-500 focus:border-indigo-500 outline-none"
          placeholder="Nome do item"
        />

        <select
          value={item.type}
          onChange={(e) => onUpdate(item.id, { type: e.target.value as SiteMenuItem['type'] })}
          className="bg-gray-600 text-white px-2 py-1 rounded text-sm border border-gray-500 focus:border-indigo-500 outline-none"
        >
          <option value="page">Página</option>
          <option value="custom">Link externo</option>
        </select>

        {item.type === 'page' ? (
          <select
            value={item.pageId || ''}
            onChange={(e) => onUpdate(item.id, { pageId: e.target.value })}
            className="bg-gray-600 text-white px-2 py-1 rounded text-sm flex-1 border border-gray-500 focus:border-indigo-500 outline-none"
          >
            <option value="">Selecione uma página</option>
            {pages.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.title} {p.isHome ? '(Home)' : ''}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={item.url || ''}
            onChange={(e) => onUpdate(item.id, { url: e.target.value })}
            className="bg-gray-600 text-white px-2 py-1 rounded text-sm flex-1 border border-gray-500 focus:border-indigo-500 outline-none"
            placeholder="https://..."
          />
        )}
      </div>

      <button onClick={() => onDelete(item.id)} className="p-1 text-red-400 hover:text-red-300">
        <Trash2 size={16} />
      </button>
    </div>
  );
};

const MenuEditor: React.FC<MenuEditorProps> = ({ menuConfig, pages, onChange }) => {
  const [items, setItems] = useState<SiteMenuItem[]>(menuConfig);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex).map((item: SiteMenuItem, idx: number) => ({ ...item, order: idx }));
    setItems(newItems);
    onChange(newItems);
  };

  const handleUpdate = (id: string, updates: Partial<SiteMenuItem>) => {
    const newItems = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
    setItems(newItems);
    onChange(newItems);
  };

  const handleDelete = (id: string) => {
    const newItems = items.filter((item) => item.id !== id).map((item, idx) => ({ ...item, order: idx }));
    setItems(newItems);
    onChange(newItems);
  };

  const handleAdd = () => {
    const newItem: SiteMenuItem = {
      id: uuidv4(),
      label: 'Novo Item',
      type: 'page',
      pageId: pages[0]?.slug,
      order: items.length,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Menu de Navegação</h3>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus size={14} /> Adicionar Item
        </button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <SortableMenuItem key={item.id} item={item} pages={pages} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">Nenhum item no menu. Clique em "Adicionar Item" para começar.</p>
      )}
    </div>
  );
};

export default MenuEditor;
