
import React from 'react';
import { useLayoutEditor } from '../../context/LayoutEditorContext';
import { WidgetPanel } from './WidgetPanel';
import { EditorCanvas } from './EditorCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { EditorToolbar } from './EditorToolbar';

export const LayoutEditor: React.FC = () => {
  const { mode } = useLayoutEditor();

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-100">
      {/* Toolbar */}
      <EditorToolbar />

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Widgets */}
        {mode === 'edit' && <WidgetPanel />}

        {/* Center - Canvas */}
        <EditorCanvas />

        {/* Right Sidebar - Properties */}
        {mode === 'edit' && <PropertiesPanel />}
      </div>
    </div>
  );
};
