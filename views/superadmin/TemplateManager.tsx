import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Plus,
  Copy,
  Eye,
  Trash2,
  Palette,
  Code,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { callApi } from '../../src/lib/api';

interface Template {
  id: string;
  name: string;
  type: 'landing_page' | 'email' | 'contract' | 'report';
  category: string;
  description: string;
  preview: string;
  is_default: boolean;
}

const typeLabels: Record<string, { label: string; color: string; bg: string }> =
  {
    landing_page: {
      label: 'Landing Page',
      color: 'text-blue-700',
      bg: 'bg-blue-100',
    },
    email: { label: 'Email', color: 'text-purple-700', bg: 'bg-purple-100' },
    contract: {
      label: 'Contrato',
      color: 'text-emerald-700',
      bg: 'bg-emerald-100',
    },
    report: { label: 'Relatório', color: 'text-amber-700', bg: 'bg-amber-100' },
  };

const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const result = await callApi('/api/admin/templates');
      setTemplates(result.data || []);
    } catch (error: any) {
      logger.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filtered = templates.filter((t) => {
    const typeMatch = activeType === 'all' || t.type === activeType;
    const catMatch = activeCategory === 'all' || t.category === activeCategory;
    return typeMatch && catMatch;
  });

  const handleDuplicate = async (t: Template) => {
    try {
      await callApi(`/api/admin/templates/duplicate/${t.id}`, {
        method: 'POST',
      });
      await loadTemplates();
    } catch (error: any) {
      logger.error('Error duplicating template:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este template?')) return;
    try {
      await callApi(`/api/admin/templates/${id}`, { method: 'DELETE' });
      await loadTemplates();
    } catch (error: any) {
      logger.error('Error deleting template:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Layout className="text-purple-600" size={28} />
            Template Manager
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie templates globais de landing pages, emails, contratos e
            relatórios.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadTemplates}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-3 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={async () => {
              const name = prompt('Nome do novo template:');
              if (!name) return;
              const type = prompt('Tipo (landing_page, email, contract, report):') as Template['type'] || 'landing_page';
              try {
                await callApi('/api/admin/templates', {
                  method: 'POST',
                  body: JSON.stringify({
                    name,
                    type,
                    category: 'Geral',
                    description: '',
                  }),
                });
                await loadTemplates();
              } catch (error: any) {
                logger.error('Error creating template:', error);
              }
            }}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-purple-500 transition-all shadow-lg"
          >
            <Plus size={18} /> Novo Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-purple-600" size={32} />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Object.entries(typeLabels).map(([key, config]) => {
              const count = templates.filter((t) => t.type === key).length;
              return (
                <div
                  key={key}
                  className={`rounded-xl p-5 ${config.bg} cursor-pointer transition-all hover:shadow-lg ${activeType === key ? 'ring-2 ring-offset-2 ring-purple-500' : ''}`}
                  onClick={() => setActiveType(activeType === key ? 'all' : key)}
                >
                  <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${config.color}`}
                  >
                    {config.label}s
                  </p>
                </div>
              );
            })}
          </div>

          {/* Category Filters */}
          <div className="flex gap-2">
            {['all', 'Geral', 'Rural', 'Urbano'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeCategory === cat
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((template) => {
              const typeConf = typeLabels[template.type];
              return (
                <div
                  key={template.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{template.preview}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${typeConf.bg} ${typeConf.color}`}
                      >
                        {typeConf.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-1">
                      {template.name}
                    </h3>
                    <p className="text-xs text-gray-400 mb-3">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-500 uppercase">
                        {template.category}
                      </span>
                      {template.is_default && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-purple-100 text-purple-600 uppercase">
                          Padrão
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 p-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button className="flex-1 flex items-center justify-center gap-1 p-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100">
                      <Eye size={14} /> Ver
                    </button>
                    <button
                      onClick={() => handleDuplicate(template)}
                      className="flex-1 flex items-center justify-center gap-1 p-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100"
                    >
                      <Copy size={14} /> Duplicar
                    </button>
                    {!template.is_default && (
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="flex-1 flex items-center justify-center gap-1 p-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default TemplateManager;
