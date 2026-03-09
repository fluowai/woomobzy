
import React from 'react';
import { useLayoutEditor } from '../../context/LayoutEditorContext';
import { Save, Undo, Redo, Eye, Edit, Smartphone, Tablet, Monitor } from 'lucide-react';

export const EditorToolbar: React.FC = () => {
  const { 
    mode, 
    setMode, 
    device, 
    setDevice, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    saveLayout,
    blocks
  } = useLayoutEditor();

  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveLayout();
      alert('Layout salvo com sucesso!');
    } catch (error) {
      alert('Erro ao salvar layout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      {/* Left - History Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo size={18} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Refazer (Ctrl+Shift+Z)"
        >
          <Redo size={18} />
        </button>
        
        <div className="w-px h-6 bg-slate-200 mx-2" />
        
        <span className="text-xs text-slate-500 font-medium">
          {blocks.length} {blocks.length === 1 ? 'bloco' : 'blocos'}
        </span>
      </div>

      {/* Center - Device Selector */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setDevice('mobile')}
          className={`p-2 rounded transition-colors ${
            device === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
          }`}
          title="Mobile (375px)"
        >
          <Smartphone size={16} />
        </button>
        <button
          onClick={() => setDevice('tablet')}
          className={`p-2 rounded transition-colors ${
            device === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
          }`}
          title="Tablet (768px)"
        >
          <Tablet size={16} />
        </button>
        <button
          onClick={() => setDevice('desktop')}
          className={`p-2 rounded transition-colors ${
            device === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
          }`}
          title="Desktop (1440px)"
        >
          <Monitor size={16} />
        </button>
      </div>

      {/* Right - Mode & Save */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
          className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
        >
          {mode === 'edit' ? (
            <>
              <Eye size={16} />
              Preview
            </>
          ) : (
            <>
              <Edit size={16} />
              Editar
            </>
          )}
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-bold disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar Layout'}
        </button>
      </div>
    </div>
  );
};
