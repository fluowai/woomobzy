import React, { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { callApi } from '../lib/api';

interface DocumentUploadProps {
  propertyId: string;
  onUploadComplete?: () => void;
}

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
const MAX_SIZE_MB = 20;

const DocumentUpload: React.FC<DocumentUploadProps> = ({ propertyId, onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string | null => {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Arquivo muito grande. Maximo ${MAX_SIZE_MB}MB.`;
    }
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      return 'Tipo de arquivo nao permitido. Use PDF, JPEG, PNG ou DOC.';
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setFile(f);
    setError(null);
    setUploaded(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await callApi(`/api/documents/upload/${propertyId}`, {
        method: 'POST',
        body: formData,
      });
      if (!data.success) throw new Error(data.error || 'Erro no upload');
      setUploaded(true);
      setFile(null);
      onUploadComplete?.();
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
          }}
        />
        <Upload size={24} className="mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-500">
          Arraste um documento ou clique para selecionar
        </p>
        <p className="text-xs text-slate-400 mt-1">
          PDF, JPEG, PNG ou DOC (max. {MAX_SIZE_MB}MB)
        </p>
      </div>

      {file && (
        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="flex items-center gap-2 truncate">
            <File size={16} className="text-indigo-500 shrink-0" />
            <span className="text-sm text-slate-700 truncate">{file.name}</span>
            <span className="text-xs text-slate-400">({formatSize(file.size)})</span>
          </div>
          <button
            onClick={() => { setFile(null); setError(null); }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 rounded-lg p-3 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {uploaded && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-lg p-3 text-sm">
          <CheckCircle size={16} />
          Documento enviado com sucesso! A analise pode levar alguns segundos.
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full py-2 px-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Upload size={16} />
            Enviar Documento
          </>
        )}
      </button>
    </div>
  );
};

export default DocumentUpload;
