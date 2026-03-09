
import React from 'react';
import { Block } from '../../types';
import { useLayoutEditor } from '../../context/LayoutEditorContext';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { BlockRenderer } from './BlockRenderer';
import { Trash2, Copy, Eye, EyeOff, GripVertical } from 'lucide-react';

export const EditorCanvas: React.FC = () => {
  const { blocks, moveBlock, selectBlock, selectedBlock, removeBlock, duplicateBlock, updateBlock } = useLayoutEditor();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex !== destIndex) {
      moveBlock(sourceIndex, destIndex);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData('blockType');
    if (blockType) {
      // Será tratado pelo WidgetPanel
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  if (blocks.length === 0) {
    return (
      <div 
        className="flex-1 flex items-center justify-center bg-slate-50"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GripVertical size={32} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Canvas Vazio</h3>
          <p className="text-slate-500 mb-6">
            Arraste widgets da barra lateral ou clique neles para começar a construir seu layout
          </p>
          <div className="flex gap-2 justify-center text-xs text-slate-400">
            <div className="px-3 py-1 bg-white rounded-full border border-slate-200">
              ⌘ + Z para desfazer
            </div>
            <div className="px-3 py-1 bg-white rounded-full border border-slate-200">
              ⌘ + S para salvar
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 overflow-y-auto bg-slate-50 p-8"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="max-w-7xl mx-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="canvas">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-4 ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
              >
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group relative ${snapshot.isDragging ? 'opacity-50' : ''}`}
                      >
                        {/* Block Wrapper com controles */}
                        <div
                          onClick={() => selectBlock(block.id)}
                          className={`relative rounded-xl overflow-hidden transition-all ${
                            selectedBlock?.id === block.id
                              ? 'ring-2 ring-indigo-500 shadow-lg'
                              : 'hover:ring-2 hover:ring-slate-300'
                          }`}
                        >
                          {/* Toolbar do Bloco */}
                          <div
                            className={`absolute top-0 left-0 right-0 z-10 bg-slate-900/90 backdrop-blur-sm text-white px-4 py-2 flex items-center justify-between transition-opacity ${
                              selectedBlock?.id === block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div {...provided.dragHandleProps} className="cursor-move p-1 hover:bg-white/10 rounded">
                                <GripVertical size={16} />
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {block.type.replace('_', ' ')}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateBlock(block.id, { visible: !block.visible });
                                }}
                                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                title={block.visible ? 'Ocultar' : 'Mostrar'}
                              >
                                {block.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateBlock(block.id);
                                }}
                                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                title="Duplicar"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Deseja remover este bloco?')) {
                                    removeBlock(block.id);
                                  }
                                }}
                                className="p-1.5 hover:bg-red-500 rounded transition-colors"
                                title="Remover"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Renderização do Bloco */}
                          <div className={block.visible ? '' : 'opacity-30'}>
                            <BlockRenderer block={block} />
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};
