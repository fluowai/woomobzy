import React, { useState, useRef, useEffect } from 'react';
import { useTexts } from '../context/TextsContext';
import { Edit2, Check, X, Loader2 } from 'lucide-react';

interface InlineEditableProps {
  textKey: string;
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'a';
  onClick?: (e: React.MouseEvent) => void;
}

const InlineEditable: React.FC<InlineEditableProps> = ({ 
  textKey, 
  children, 
  className = '', 
  as: Component = 'span',
  onClick
}) => {
  const { isVisualMode, texts, updateText, activeKey, setActiveKey } = useTexts();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Auto resize height
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  if (!isVisualMode) {
    return <Component className={className}>{children}</Component>;
  }

  const isActive = activeKey === textKey;

  // Extract text content from children if it's a string, or fallback to key
  const getInitialValue = () => {
    if (texts[textKey]) return texts[textKey];
    if (typeof children === 'string') return children;
    return '';
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    // If not in visual mode, or if user clicked but we have an onClick, 
    // we need to be careful. But here isVisualMode is already true (checked by caller or logic).
    e.preventDefault();
    e.stopPropagation();
    setEditValue(getInitialValue());
    setIsEditing(true);
    setActiveKey(textKey);
  };

  const handleSave = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsSaving(true);
    try {
      await updateText(textKey, editValue);
      setIsEditing(false);
      setActiveKey(null);
    } catch (error) {
      console.error('Failed to update text:', error);
      alert('Erro ao salvar texto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(false);
    setActiveKey(null);
  };

  return (
    <Component 
      className={`relative group transition-all duration-200 ${className} ${
        isVisualMode && !isEditing ? 'outline-1 outline-dashed outline-indigo-400/50 outline-offset-2' : ''
      } ${
        isHovered && !isEditing ? 'outline outline-2 outline-indigo-500 outline-offset-4 rounded cursor-cell bg-indigo-50/10 shadow-sm' : ''
      } ${isEditing ? 'z-[100]' : ''} ${Component === 'span' ? 'inline-block' : 'block'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        if (!isVisualMode) {
          onClick?.(e);
          return;
        }
        if (!isEditing) {
          handleStartEdit(e);
        }
      }}
    >
      {isEditing ? (
        <div className="relative w-full">
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            className="w-full p-2 text-inherit bg-white border-2 border-indigo-500 rounded shadow-2xl focus:outline-none text-slate-900 font-sans"
            rows={1}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute -bottom-10 right-0 flex gap-1 z-[100]">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="p-2 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
            <button 
              onClick={handleCancel}
              className="p-2 bg-slate-600 text-white rounded-full shadow-lg hover:bg-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <>
          {children}
          {isHovered && !isEditing && (
            <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-t font-black uppercase tracking-widest flex items-center gap-1 shadow-lg pointer-events-none whitespace-nowrap">
              <Edit2 size={10} />
              {textKey}
            </div>
          )}
        </>
      )}
    </Component>
  );
};

export default InlineEditable;
