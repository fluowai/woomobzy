import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Instagram,
  Download,
  Loader2,
  Image as ImageIcon,
  Crown,
  TreePine,
  Sparkles,
  LayoutGrid,
  RectangleVertical,
  Save,
  Trash2,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  generateInstagramPost,
  saveInstagramPost,
  listMediaPosts,
  deleteMediaPost,
  getPreviewUrl,
  TEMPLATE_LABELS,
  FORMAT_LABELS,
  type InstagramTemplate,
  type InstagramFormat,
  type MediaPost,
} from '../../services/propertyInstagram';
import type { Property } from '../../types';

interface InstagramPostGeneratorProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

const TEMPLATE_CONFIG: Record<
  InstagramTemplate,
  { icon: React.ReactNode; color: string; description: string }
> = {
  padrao: {
    icon: <LayoutGrid size={20} />,
    color: '#2563eb',
    description: 'Foto full, gradiente, preço grande, badges',
  },
  luxo: {
    icon: <Crown size={20} />,
    color: '#c9a84c',
    description: 'Moldura dourada, serif, exclusivo',
  },
  rural: {
    icon: <TreePine size={20} />,
    color: '#059669',
    description: 'Verde escuro, área em destaque',
  },
  moderno: {
    icon: <Sparkles size={20} />,
    color: '#7c3aed',
    description: 'Split layout, cores vivas, CTA',
  },
};

const InstagramPostGenerator: React.FC<InstagramPostGeneratorProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const [template, setTemplate] = useState<InstagramTemplate>('padrao');
  const [format, setFormat] = useState<InstagramFormat>('1080x1080');
  const [imageIndex, setImageIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const previewImgRef = useRef<HTMLImageElement>(null);

  const [savedPosts, setSavedPosts] = useState<MediaPost[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const images = property?.images || [];

  const loadSavedPosts = useCallback(async () => {
    if (!property?.id) return;
    setLoadingSaved(true);
    try {
      const { posts } = await listMediaPosts(property.id);
      setSavedPosts(posts);
    } catch {
      // silent
    } finally {
      setLoadingSaved(false);
    }
  }, [property?.id]);

  useEffect(() => {
    if (isOpen && showSaved) {
      loadSavedPosts();
    }
  }, [isOpen, showSaved, loadSavedPosts]);

  const refreshPreview = useCallback(() => {
    if (!property?.id) return;
    const url = getPreviewUrl(property.id, template, format, imageIndex);
    setPreviewUrl(`${url}&t=${Date.now()}`);
  }, [property?.id, template, format, imageIndex]);

  useEffect(() => {
    if (isOpen) {
      refreshPreview();
    }
  }, [isOpen, refreshPreview]);

  const handleDownload = async () => {
    if (!property?.id) return;
    setGenerating(true);
    try {
      const blob = await generateInstagramPost(
        property.id,
        template,
        format,
        imageIndex
      );
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${property?.title?.replace(/\s+/g, '-').toLowerCase() || 'post'}-${template}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar arte');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!property?.id) return;
    setSaving(true);
    try {
      await saveInstagramPost(property.id, template, format, imageIndex);
      loadSavedPosts();
      setShowSaved(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar arte');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!property?.id || !window.confirm('Excluir este post salvo?')) return;
    try {
      await deleteMediaPost(property.id, postId);
      setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  if (!isOpen || !property) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Instagram size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Gerar Arte Instagram
              </h2>
              <p className="text-sm text-slate-500 truncate max-w-xs">
                {property.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Controls */}
          <div className="w-80 border-r border-slate-100 p-5 overflow-y-auto space-y-6">
            {/* Template Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  Object.entries(TEMPLATE_CONFIG) as [
                    InstagramTemplate,
                    (typeof TEMPLATE_CONFIG)[InstagramTemplate],
                  ][]
                ).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setTemplate(key)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      template === key
                        ? 'border-current shadow-md'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                    style={
                      template === key
                        ? {
                            borderColor: config.color,
                            background: `${config.color}08`,
                          }
                        : undefined
                    }
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                      style={{
                        background: template === key ? config.color : '#e2e8f0',
                        color: template === key ? 'white' : '#64748b',
                      }}
                    >
                      {config.icon}
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      {TEMPLATE_LABELS[key]}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                      {config.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                Formato
              </label>
              <div className="flex gap-2">
                {(
                  Object.entries(FORMAT_LABELS) as [InstagramFormat, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFormat(key)}
                    className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      format === key
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {key === '1080x1080' ? (
                        <ImageIcon size={14} />
                      ) : (
                        <RectangleVertical size={14} />
                      )}
                      {label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Selector */}
            {images.length > 1 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                  Foto ({imageIndex + 1}/{images.length})
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.slice(0, 8).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setImageIndex(idx)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                        imageIndex === idx
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={generating}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
              >
                {generating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Baixar
                  </>
                )}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="py-3 px-4 rounded-xl border-2 border-emerald-500 text-emerald-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
              </button>
            </div>

            {/* Saved posts toggle */}
            <button
              onClick={() => {
                setShowSaved(!showSaved);
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
            >
              <Clock size={15} />
              {showSaved
                ? 'Voltar ao Editor'
                : `Posts Salvos (${savedPosts.length})`}
            </button>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Imagem gerada em 1080px. Pronta para Instagram, Facebook e
              LinkedIn.
            </p>
          </div>

          {/* Right: Preview or Saved Gallery */}
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
            {showSaved ? (
              <div className="w-full h-full overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Posts Salvos
                  </h3>
                  {loadingSaved && (
                    <Loader2
                      size={16}
                      className="animate-spin text-slate-400"
                    />
                  )}
                </div>
                {savedPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <ImageIcon size={40} className="mb-3 opacity-40" />
                    <p className="text-sm">Nenhum post salvo ainda</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {savedPosts.map((post) => (
                      <div
                        key={post.id}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white"
                      >
                        <img
                          src={post.public_url}
                          alt={`Post ${post.template}`}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                          <div className="flex gap-1.5">
                            <a
                              href={post.public_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
                              download
                            >
                              <Download size={14} />
                            </a>
                          </div>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="w-8 h-8 rounded-lg bg-red-500/90 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="p-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-slate-500 uppercase">
                              {TEMPLATE_LABELS[post.template]}
                            </span>
                            <span className="text-[10px] text-slate-300">
                              •
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {post.format === '1080x1080' ? '1:1' : '4:5'}
                            </span>
                            {post.status === 'posted' && (
                              <CheckCircle2
                                size={12}
                                className="text-emerald-500 ml-auto"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative max-h-full">
                {previewUrl ? (
                  <img
                    ref={previewImgRef}
                    src={previewUrl}
                    alt="Preview da arte"
                    className="max-h-[65vh] max-w-full rounded-lg shadow-xl object-contain"
                    key={previewUrl}
                  />
                ) : (
                  <div className="w-80 h-80 rounded-lg bg-slate-200 flex items-center justify-center">
                    <Loader2
                      size={32}
                      className="animate-spin text-slate-400"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramPostGenerator;
