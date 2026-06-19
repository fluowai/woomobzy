import React, { useEffect, useState } from 'react';
import { FileText, Eye, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import type { Lease, ContractTemplate } from '../../../types/lease';
import { listTemplates, validateTemplate } from '../../../services/lease/leaseService';

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

export const StepContractGeneration: React.FC<Props> = ({ lease }) => {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('default');
  const [previewContent, setPreviewContent] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    generatePreview();
  }, [lease, selectedTemplateId]);

  const loadTemplates = async () => {
    try {
      const { data } = await listTemplates();
      setTemplates(data || []);
    } catch {}
  };

  const generatePreview = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    let content = selectedTemplateId === 'default' ? CONTRACT_TEMPLATE : templates.find(t => t.id === selectedTemplateId)?.content || CONTRACT_TEMPLATE;

    const vars: Record<string, string> = {
      nome_locador: lease.owner_name || '[Nome do Locador]',
      cpf_locador: lease.owner_name || '[CPF do Locador]',
      nome_locatario: lease.tenant_name || '[Nome do Locatário]',
      cpf_locatario: lease.tenant_cpf || '[CPF do Locatário]',
      endereco_imovel: lease.property_title || '[Endereço do Imóvel]',
      valor_aluguel: (lease.monthly_rent || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      valor_caucao: (lease.guarantee_value || lease.caution_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      data_inicio: lease.start_date ? new Date(lease.start_date).toLocaleDateString('pt-BR') : '[Data de Início]',
      data_fim: lease.end_date ? new Date(lease.end_date).toLocaleDateString('pt-BR') : '[Data de Término]',
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

    // Validate
    validateTemplate(content).then(r => setValidationResult(r.data)).catch(() => {});
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><FileText size={20} /></div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Modelo de Contrato</h4>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setSelectedTemplateId('default')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              selectedTemplateId === 'default' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Modelo Padrão
          </button>
          {templates.filter(t => t.is_active).map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                selectedTemplateId === t.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Validação */}
        {validationResult && (
          <div className={`p-4 rounded-xl mb-4 flex items-center gap-3 ${
            validationResult.is_valid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {validationResult.is_valid ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="text-sm font-bold">
              {validationResult.is_valid
                ? 'Contrato válido - todas as variáveis preenchidas'
                : `${validationResult.missing_count} variáveis obrigatórias não preenchidas`}
            </span>
          </div>
        )}
      </section>

      {/* Preview */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-slate-500" />
            <h4 className="text-sm font-bold text-slate-700">Pré-visualização</h4>
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
        <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 shadow-lg transition-all">
          <Download size={16} /> Gerar PDF
        </button>
      </div>
    </div>
  );
};
