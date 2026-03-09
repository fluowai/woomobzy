import React, { useState } from 'react';
import { useTexts } from '../context/TextsContext';
import { ImageIcon, Check, X, Loader2, Link as LinkIcon, Upload } from 'lucide-react';
import { uploadFile } from '../services/storage';

interface ImageEditableProps {
  textKey: string;
  children: React.ReactElement;
  className?: string;
}

const ImageEditable: React.FC<ImageEditableProps> = ({ 
  textKey, 
  children, 
  className = '' 
}) => {
  const { isVisualMode, texts, updateText } = useTexts();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isVisualMode) {
    return children;
  }

  const currentUrl = texts[textKey] || children.props.src || '';

  const handleStartEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageUrl(currentUrl);
    setIsEditing(true);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!imageUrl.trim()) {
      alert('Por favor, insira uma URL válida');
      return;
    }

    setIsSaving(true);
    try {
      await updateText(textKey, imageUrl);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update image:', error);
      alert('Erro ao salvar imagem');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const publicUrl = await uploadFile(file, 'agency-assets', 'visual-editor');
      if (publicUrl) {
        setImageUrl(publicUrl);
        // Automatically save after upload for better UX
        await updateText(textKey, publicUrl);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Falha ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileUpload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Clone item to inject the new src if edited
  const content = React.cloneElement(children, {
    src: texts[textKey] || children.props.src
  });

  return (
    <div 
      className={`relative group transition-all duration-200 ${className} ${
        isHovered && !isEditing ? 'outline outline-4 outline-indigo-500 outline-offset-2 rounded-xl cursor-cell' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={!isEditing ? handleStartEdit : undefined}
    >
      {content}

      {isEditing ? (
        <div className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4 text-slate-900 font-black uppercase tracking-widest text-xs">
              <ImageIcon size={16} className="text-indigo-600" />
              <span>Trocar Imagem</span>
            </div>
            
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">URL ou Upload</label>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={triggerFileUpload}
                    disabled={isUploading || isSaving}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest border-2 border-dashed border-slate-300"
                  >
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {isUploading ? 'Subindo...' : 'Fazer Upload'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <LinkIcon size={14} />
                  </div>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Ou cole a URL aqui..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:outline-none text-sm text-slate-900"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-indigo-600 text-white h-12 rounded-xl shadow-lg hover:bg-indigo-700 transition-all font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Salvar</>}
                </button>
                <button 
                  onClick={handleCancel}
                  className="px-4 bg-slate-100 text-slate-600 h-12 rounded-xl hover:bg-slate-200 transition-all font-black uppercase text-[10px] tracking-widest"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
      ) : (
        isHovered && (
          <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest flex items-center gap-2 shadow-xl animate-in fade-in zoom-in duration-200 pointer-events-none">
            <ImageIcon size={14} />
            <span>Trocar Imagem</span>
          </div>
        )
      )}
    </div>
  );
};

export default ImageEditable;
