import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Edit,
  Copy,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  History,
} from 'lucide-react';
import type { ContractTemplate } from '../../../types/lease';
import {
  listTemplates,
  deleteTemplate,
} from '../../../services/lease/leaseService';

export const TemplateList: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await listTemplates();
      setTemplates(data || []);
    } catch (error) {
      logger.error('Load templates error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Desativar este template?')) return;
    try {
      await deleteTemplate(id);
      load();
    } catch (error) {
      logger.error('Delete template error:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black uppercase italic tracking-tighter flex items-center gap-3">
            <FileText className="text-blue-600" size={32} />
            Modelos de <span className="text-blue-600">Contrato</span>
          </h1>
          <p className="text-black/60 font-medium">
            Gerencie modelos de contrato com variáveis dinâmicas
          </p>
        </div>
        <button
          onClick={() => navigate('/urban/locacao/templates/novo')}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg"
        >
          <Plus size={18} /> Novo Modelo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <svg
            className="animate-spin h-8 w-8 text-blue-600 mx-auto"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.length === 0 && (
            <div className="md:col-span-3 text-center py-12 text-slate-400">
              <FileText className="mx-auto mb-3 text-slate-300" size={48} />
              <p className="font-medium">Nenhum modelo de contrato</p>
              <p className="text-sm">Crie seu primeiro modelo personalizado</p>
            </div>
          )}
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${template.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}
                  >
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {template.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      v{template.version}
                    </p>
                  </div>
                </div>
                {template.is_default && (
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase">
                    Padrão
                  </span>
                )}
              </div>

              {template.description && (
                <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full ${
                    template.is_active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  {template.is_active ? (
                    <CheckCircle size={10} />
                  ) : (
                    <XCircle size={10} />
                  )}
                  {template.is_active ? 'Ativo' : 'Inativo'}
                </span>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                  {template.variables?.length || 0} variáveis
                </span>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <button
                  onClick={() =>
                    navigate(`/urban/locacao/templates/${template.id}`)
                  }
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                >
                  <Edit size={12} /> Editar
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all">
                  <Copy size={12} /> Duplicar
                </button>
                {template.is_active && (
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all ml-auto"
                  >
                    <Trash2 size={12} /> Desativar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
