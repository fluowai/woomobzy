import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  Eye,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { Lease, ContractTemplate } from '../../../types/lease';
import {
  listTemplates,
  generateContractPdf,
  updateLease,
} from '../../../services/lease/leaseService';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const CONTRACT_TEMPLATE = `CONTRATO DE LOCAÇÃO DE IMÓVEL URBANO

Pelo presente instrumento particular, as partes:

**LOCADOR:** {{nome_locador}}, portador(a) do CPF nº {{cpf_locador}}.

**LOCATÁRIO:** {{nome_locatario}}, portador(a) do CPF nº {{cpf_locatario}}.

**CLÁUSULA PRIMEIRA – DO IMÓVEL E SUA DESTINAÇÃO**
O LOCADOR dá em locação ao LOCATÁRIO o imóvel situado na {{endereco_imovel}}, na cidade de {{cidade}}.

**CLÁUSULA SEGUNDA – DO PRAZO**
O prazo da locação é de {{prazo_meses}} meses, com início em {{data_inicio}} e término em {{data_fim}}.

**CLÁUSULA TERCEIRA – DO ALUGUEL E REAJUSTE**
O aluguel mensal é de R$ {{valor_aluguel}}, reajustável anualmente pelo índice {{indice_reajuste}}, vencendo todo dia {{dia_vencimento}} de cada mês.

**CLÁUSULA QUARTA – DOS ENCARGOS**
Além do aluguel, o LOCATÁRIO arcará com condomínio, IPTU, água, luz e gás.

**CLÁUSULA QUINTA – DA GARANTIA**
A locação é garantida por {{tipo_garantia}} no valor de R$ {{valor_caucao}}.

**CLÁUSULA SEXTA – DA VISTORIA**
O imóvel será vistoriado antes da entrega das chaves e no término da locação.

**CLÁUSULA SÉTIMA – DA CONSERVAÇÃO DO IMÓVEL**
O LOCATÁRIO obriga-se a conservar o imóvel e devolvê-lo no estado em que o recebeu.

**CLÁUSULA OITAVA – DA MULTA POR RESCISÃO**
Em caso de rescisão antecipada, o LOCATÁRIO pagará multa equivalente a 3 (três) aluguéis.

**CLÁUSULA NONA – DA INADIMPLÊNCIA**
O atraso no pagamento sujeitará o LOCATÁRIO à multa de {{multa_atraso}}% e juros de {{juros_atraso}}% ao dia.

**CLÁUSULA DÉCIMA – DA PROIBIÇÃO DE SUBLOCAÇÃO**
O LOCATÁRIO não poderá ceder, sublocar ou emprestar o imóvel.

**CLÁUSULA DÉCIMA PRIMEIRA – DO FORO**
Fica eleito o foro da {{cidade}} para dirimir dúvidas deste contrato.

{{data_geracao}}
`;

// Variáveis obrigatórias para um contrato de locação válido.
// O valor é uma função que verifica se o campo correspondente está preenchido
// nos dados reais da locação (não no texto renderizado).
const REQUIRED_VARS: Record<string, (l: Partial<Lease>) => boolean> = {
  nome_locador: (l) => !!(l.owner_name || '').trim(),
  cpf_locador: (l) => !!(l.owner_cpf_cnpj || '').trim(),
  nome_locatario: (l) => !!(l.tenant_name || '').trim(),
  cpf_locatario: (l) => !!(l.tenant_cpf || l.tenant_rg || '').trim(),
  endereco_imovel: (l) => !!(l.property_title || '').trim(),
  cidade: (l) => !!(l.tenant_city || '').trim(),
  valor_aluguel: (l) => l.monthly_rent != null && Number(l.monthly_rent) > 0,
  valor_caucao: (l) =>
    (l.caution_amount != null && Number(l.caution_amount) > 0) ||
    (l.guarantee_value != null && Number(l.guarantee_value) > 0),
  data_inicio: (l) => !!l.start_date,
  data_fim: (l) => !!l.end_date,
  prazo_meses: (l) =>
    l.contract_duration_months != null &&
    Number(l.contract_duration_months) > 0,
  dia_vencimento: (l) => l.due_day != null,
  indice_reajuste: (l) => !!(l.adjustment_index || '').trim(),
  tipo_garantia: (l) => !!(l.guarantee_type || '').trim(),
  multa_atraso: (l) => l.late_fee_percent != null,
  juros_atraso: (l) => l.late_interest_percent != null,
  data_geracao: () => true,
};

const REQUIRED_VAR_ORDER = Object.keys(REQUIRED_VARS);

export const StepContractGeneration: React.FC<Props> = ({
  lease,
  updateFields,
}) => {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('default');
  const [previewContent, setPreviewContent] = useState('');
  const [validationResult, setValidationResult] = useState<{
    is_valid: boolean;
    missing: string[];
    missing_count: number;
  }>({ is_valid: false, missing: [], missing_count: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    generatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lease, selectedTemplateId]);

  const loadTemplates = async () => {
    try {
      const { data } = await listTemplates();
      setTemplates(data || []);
    } catch {}
  };

  const getTemplateContent = () =>
    selectedTemplateId === 'default'
      ? CONTRACT_TEMPLATE
      : templates.find((t) => t.id === selectedTemplateId)?.content ||
        CONTRACT_TEMPLATE;

  const computeMissingVars = () => {
    const missing = REQUIRED_VAR_ORDER.filter(
      (name) => !REQUIRED_VARS[name](lease)
    );
    setValidationResult({
      is_valid: missing.length === 0,
      missing,
      missing_count: missing.length,
    });
    return missing;
  };

  const generatePreview = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    let content = getTemplateContent();

    const vars: Record<string, string> = {
      nome_locador: lease.owner_name || '[Nome do Locador]',
      cpf_locador: lease.owner_cpf_cnpj || '[CPF do Locador]',
      nome_locatario: lease.tenant_name || '[Nome do Locatário]',
      cpf_locatario:
        lease.tenant_cpf || lease.tenant_rg || '[CPF do Locatário]',
      endereco_imovel: lease.property_title
        ? `${lease.property_title} ${lease.property_address || ''}`
        : '[Endereço do Imóvel]',
      valor_aluguel: (lease.monthly_rent || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
      valor_caucao: (
        lease.guarantee_value ||
        lease.caution_amount ||
        0
      ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      data_inicio: lease.start_date
        ? new Date(lease.start_date).toLocaleDateString('pt-BR')
        : '[Data de Início]',
      data_fim: lease.end_date
        ? new Date(lease.end_date).toLocaleDateString('pt-BR')
        : '[Data de Término]',
      prazo_meses: String(lease.contract_duration_months || 12),
      dia_vencimento: String(lease.due_day || '[Dia]'),
      indice_reajuste: lease.adjustment_index || '[Índice]',
      tipo_garantia: lease.guarantee_type || '[Tipo de Garantia]',
      multa_atraso: String(lease.late_fee_percent ?? 2),
      juros_atraso: String(lease.late_interest_percent ?? 0.03333),
      cidade: lease.tenant_city || '[Cidade]',
      data_geracao: today,
    };

    Object.entries(vars).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    setPreviewContent(content);
    computeMissingVars();
  };

  const handleGeneratePdf = async () => {
    if (!lease.id) {
      toast.error('Salve o contrato antes de gerar o PDF');
      return;
    }

    setIsGenerating(true);
    try {
      // Persiste os dados atuais (e o template selecionado) antes de gerar,
      // para o backend usar os valores mais recentes.
      const payload: Partial<Lease> = {
        ...lease,
        ...(selectedTemplateId !== 'default'
          ? { current_template_id: selectedTemplateId }
          : {}),
      };
      const { data: saved } = await updateLease(lease.id, payload);
      if (saved) updateFields(saved);

      const res = await generateContractPdf(lease.id, getTemplateContent());
      if (res.success) {
        toast.success('PDF do contrato gerado com sucesso!');
      } else {
        toast.error('Falha ao gerar o PDF do contrato');
      }
    } catch (err) {
      toast.error('Erro de comunicação ao gerar o PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
            <FileText size={20} />
          </div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">
            Modelo de Contrato
          </h4>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setSelectedTemplateId('default')}
            className={`flex-1 min-w-[160px] py-3 rounded-xl text-sm font-bold transition-all ${
              selectedTemplateId === 'default'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Modelo Padrão
          </button>
          {templates
            .filter((t) => t.is_active)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={`flex-1 min-w-[160px] py-3 rounded-xl text-sm font-bold transition-all ${
                  selectedTemplateId === t.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.name}
              </button>
            ))}
        </div>

        {/* Validação */}
        <div
          className={`p-4 rounded-xl mb-4 flex items-start gap-3 ${
            validationResult.is_valid
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {validationResult.is_valid ? (
            <CheckCircle size={20} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-bold">
            {validationResult.is_valid
              ? 'Contrato válido - todas as variáveis preenchidas'
              : `${validationResult.missing_count} variáveis obrigatórias não preenchidas`}
            {!validationResult.is_valid &&
              validationResult.missing.length > 0 && (
                <p className="text-xs font-medium mt-1 text-amber-600">
                  Faltam: {validationResult.missing.join(', ')}
                </p>
              )}
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-slate-500" />
            <h4 className="text-sm font-bold text-slate-700">
              Pré-visualização
            </h4>
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            {showPreview ? 'Ocultar' : 'Visualizar'}
          </button>
        </div>

        {showPreview && (
          <div className="p-8 bg-white max-h-[500px] overflow-y-auto">
            <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-line font-mono">
              {previewContent}
            </div>
          </div>
        )}
      </section>

      {/* Ações */}
      <div className="flex gap-4">
        <button
          onClick={generatePreview}
          className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
        >
          <RefreshCw size={16} /> Atualizar Preview
        </button>
        <button
          onClick={handleGeneratePdf}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 shadow-lg transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Gerar PDF
        </button>
      </div>
    </div>
  );
};
