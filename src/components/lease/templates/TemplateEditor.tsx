import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  Save,
  Eye,
  Upload,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import type { ContractTemplate } from '../../../types/lease';
import {
  getTemplate,
  createTemplate,
  updateTemplate,
  validateTemplate,
} from '../../../services/lease/leaseService';

const REQUIRED_VARIABLES = [
  'nome_locador',
  'cpf_locador',
  'nome_locatario',
  'cpf_locatario',
  'endereco_imovel',
  'valor_aluguel',
  'valor_caucao',
  'data_inicio',
  'data_fim',
  'prazo_meses',
  'dia_vencimento',
  'indice_reajuste',
  'tipo_garantia',
  'multa_atraso',
  'juros_atraso',
  'cidade',
  'data_geracao',
];

const DEFAULT_CONTENT = `CONTRATO DE LOCAÇÃO DE IMÓVEL URBANO

**LOCADOR:** {{nome_locador}}, CPF {{cpf_locador}}.

**LOCATÁRIO:** {{nome_locatario}}, CPF {{cpf_locatario}}.

**CLÁUSULA PRIMEIRA – DO IMÓVEL**
O imóvel situado na {{endereco_imovel}}, {{cidade}}.

**CLÁUSULA SEGUNDA – DO PRAZO**
{{prazo_meses}} meses, de {{data_inicio}} a {{data_fim}}.

**CLÁUSULA TERCEIRA – DO ALUGUEL**
R$ {{valor_aluguel}}, vencimento dia {{dia_vencimento}}.

**CLÁUSULA QUARTA – DO REAJUSTE**
Índice: {{indice_reajuste}}.

**CLÁUSULA QUINTA – DA GARANTIA**
{{tipo_garantia}}: R$ {{valor_caucao}}.

**CLÁUSULA SEXTA – DA MULTA**
{{multa_atraso}}% + {{juros_atraso}}% ao dia.

Gerado em {{data_geracao}}.
`;

export const TemplateEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [foundVars, setFoundVars] = useState<string[]>([]);
  const [missingVars, setMissingVars] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditing = !!id;

  useEffect(() => {
    if (id) loadTemplate();
  }, [id]);

  useEffect(() => {
    validateContent();
  }, [content]);

  const loadTemplate = async () => {
    if (!id) return;
    try {
      const { data } = await getTemplate(id);
      setName(data.name);
      setDescription(data.description || '');
      setContent(data.content);
      setIsActive(data.is_active);
      setIsDefault(data.is_default);
    } catch (error) {
      logger.error('Load template error:', error);
    }
  };

  const validateContent = async () => {
    if (!content) return;
    const extracted = [...content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    const unique = [...new Set(extracted)];
    const missing = REQUIRED_VARIABLES.filter((v) => !unique.includes(v));

    setFoundVars(unique);
    setMissingVars(missing);
    setIsValid(missing.length === 0);
  };

  const extractVars = () => {
    const extracted = [...content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    return [...new Set(extracted)];
  };

  const handleSave = async () => {
    if (!name || !content) return;
    setSaving(true);
    try {
      const data = {
        name,
        description,
        content,
        variables: extractVars(),
        is_active: isActive,
        is_default: isDefault,
      };

      if (isEditing && id) {
        await updateTemplate(id, data);
      } else {
        await createTemplate(data);
      }
      navigate('/urban/locacao/templates');
    } catch (error) {
      logger.error('Save template error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setContent(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/urban/locacao/templates')}
            className="p-2.5 bg-white rounded-xl border border-slate-100 hover:bg-slate-50 transition-all mt-1"
          >
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-black uppercase italic tracking-tighter">
              {isEditing ? 'Editar' : 'Novo'}{' '}
              <span className="text-blue-600">Modelo</span>
            </h1>
            <p className="text-black/60 font-medium">
              {isEditing
                ? 'Editando modelo de contrato'
                : 'Crie um novo modelo de contrato com variáveis dinâmicas'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !name || !content}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Modelo'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 mb-4">
              Configuração
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Nome do Modelo
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Ex: Contrato de Locação Residencial"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Descrição
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none min-h-[60px]"
                  placeholder="Descrição opcional do modelo"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600">
                  Modelo Ativo
                </label>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`w-12 h-6 rounded-full transition-all ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all ${isActive ? 'translate-x-6' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600">
                  Modelo Padrão
                </label>
                <button
                  onClick={() => setIsDefault(!isDefault)}
                  className={`w-12 h-6 rounded-full transition-all ${isDefault ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all ${isDefault ? 'translate-x-6' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Upload DOCX */}
          <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 mb-4">
              Upload de Arquivo
            </h3>
            <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all">
              <Upload size={24} className="text-slate-300" />
              <span className="text-sm font-bold text-slate-500">
                Upload DOCX
              </span>
              <span className="text-[10px] text-slate-400">
                ou arraste o arquivo aqui
              </span>
              <input
                type="file"
                accept=".docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </section>

          {/* Variáveis */}
          <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 mb-4">
              Variáveis
            </h3>
            <div
              className={`p-3 rounded-xl text-xs font-bold mb-4 ${
                isValid
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {isValid ? (
                  <CheckCircle size={14} />
                ) : (
                  <AlertCircle size={14} />
                )}
                {isValid
                  ? 'Todas as variáveis obrigatórias presentes'
                  : `${missingVars.length} variáveis obrigatórias faltando`}
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {foundVars.map((v) => (
                <div
                  key={v}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono ${
                    REQUIRED_VARIABLES.includes(v)
                      ? 'bg-green-50 text-green-700'
                      : 'bg-slate-50 text-slate-500'
                  }`}
                >
                  {'{{'}
                  {v}
                  {'}}'}
                  {REQUIRED_VARIABLES.includes(v) && (
                    <CheckCircle
                      size={10}
                      className="inline ml-1 text-green-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">
                Conteúdo do Contrato
              </h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  showPreview
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                <Eye size={14} /> {showPreview ? 'Editar' : 'Preview'}
              </button>
            </div>

            {showPreview ? (
              <div className="p-8 max-h-[600px] overflow-y-auto bg-white">
                <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-line">
                  {content.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
                    return `<span class="bg-blue-100 text-blue-800 px-1 rounded">${varName}</span>`;
                  })}
                </div>
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[500px] p-6 font-mono text-sm leading-relaxed outline-none resize-y bg-white"
                placeholder="Digite o conteúdo do contrato usando {{variaveis}}..."
              />
            )}
          </section>

          {/* Atalhos de variáveis */}
          <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Inserir Variável
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REQUIRED_VARIABLES.map((v) => (
                <button
                  key={v}
                  onClick={() => setContent((prev) => prev + `{{${v}}}`)}
                  className="px-2.5 py-1 text-[11px] font-mono bg-slate-50 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-100 transition-all"
                >
                  {'{{'}
                  {v}
                  {'}}'}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
