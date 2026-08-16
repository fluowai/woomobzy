import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import {
  Save,
  ArrowLeft,
  Building,
  ShieldCheck,
  Upload,
  Brain,
  Loader2,
} from 'lucide-react';

const ContractEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    contract_type: 'agency',
    status: 'draft',
    contratada_details: {
      nome: 'Mega Admin Software Ltda',
      cnpj: '00.000.000/0001-00',
      endereco: 'Rua Exemplo, 123',
      representante: 'Admin da Silva',
      email: 'admin@imobzy.com',
    },
    contratante_details: {
      nome: '',
      cnpj: '',
      endereco: '',
      representante: '',
      email: '',
    },
    product_version: 'IMOBZY SaaS v1.0',
    use_sector: 'Gestão Imobiliária',
    ip_modality: 'saas',
    production_domain: '',
    staging_domains: '',
    usage_limits: '50 usuários, ilimitados imóveis',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    renewal_type: 'Renovação automática anual (aviso 30 dias)',
    setup_fee: 0,
    setup_milestones: 'Onboarding (10 dias úteis)',
    monthly_fee: 0,
    payment_periodicity: 'Mensal',
    cloud_fees: 'Incluso no pacote base',
    support_included: true,
    readjustment_index: 'IPCA Anual',
    early_termination_penalty: '20% do saldo restante',
    domain_validation: 'Checagem online semanal',
    special_assignment: '',
    official_contacts: {
      financeiro: '',
      suporte: '',
      juridico: '',
    },
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchContract();
    }
  }, [id]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_contracts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (data) setFormData(data);
    } catch (err) {
      console.error('Error fetching contract', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = { ...formData };
      if (id && id !== 'new') {
        const { error } = await supabase
          .from('system_contracts')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        navigate('/mega-admin/contracts');
      } else {
        const { error } = await supabase
          .from('system_contracts')
          .insert(payload);
        if (error) throw error;
        navigate('/mega-admin/contracts');
      }
    } catch (err) {
      console.error('Error saving contract', err);
      alert('Erro ao salvar o contrato');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (type: 'reseller' | 'agency') => {
    if (type === 'reseller') {
      setFormData((prev) => ({
        ...prev,
        contract_type: 'reseller',
        ip_modality: 'restricted_code',
        product_version: 'IMOBZY White-label',
        use_sector: 'Revenda SaaS e Gestão',
        usage_limits: 'Ilimitados usuários e inquilinos',
        setup_milestones:
          'Migração, Treinamento Técnico e Entrega de Código (30 dias úteis)',
        special_assignment:
          'Permissão para revenda como SaaS no território nacional. Vedada a redistribuição do código-fonte.',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        contract_type: 'agency',
        ip_modality: 'saas',
        product_version: 'IMOBZY SaaS',
        use_sector: 'Gestão Imobiliária Tradicional',
        usage_limits: '50 usuários',
        setup_milestones: 'Onboarding padrão',
        special_assignment: 'N/A',
      }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || id === 'new') return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      const response = await fetch('/api/mega/contracts/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setContractFile(file);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!id || id === 'new') return;

    setAnalyzing(true);
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      const response = await fetch(`/api/mega/contracts/${id}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setAnalysisResult(result.analysis);
    } catch (err) {
      console.error('Analysis error:', err);
      alert('Erro ao analisar contrato');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileAnalysis = async () => {
    if (!id || id === 'new' || !contractFile) return;

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', contractFile);

      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      const response = await fetch(`/api/mega/contracts/${id}/analyze-file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setAnalysisResult(result.analysis);
    } catch (err) {
      console.error('Analysis error:', err);
      alert('Erro ao analisar arquivo');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/mega-admin/contracts')}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {id === 'new' ? 'Novo Contrato' : 'Editar Contrato'}
            </h1>
            <p className="text-slate-500">
              Configure os parâmetros do Anexo I.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {id && id !== 'new' && (
            <>
              <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded hover:bg-slate-50 cursor-pointer">
                <Upload size={18} />
                <span>
                  {contractFile ? contractFile.name : 'Upload Contrato'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.png,.webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                onClick={contractFile ? handleFileAnalysis : handleAIAnalysis}
                disabled={
                  analyzing ||
                  (!contractFile && !formData.contratante_details.nome)
                }
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {analyzing ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Brain size={18} />
                )}
                {analyzing
                  ? 'Analisando...'
                  : contractFile
                    ? 'Analisar Arquivo'
                    : 'Analisar com IA'}
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Contrato'}
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => applyTemplate('agency')}
          className={`flex-1 flex items-center justify-center gap-2 p-4 border rounded-xl transition ${formData.contract_type === 'agency' ? 'border-slate-800 bg-slate-50' : 'hover:border-slate-300 bg-white'}`}
        >
          <Building
            className={
              formData.contract_type === 'agency'
                ? 'text-slate-800'
                : 'text-slate-400'
            }
          />
          <div className="text-left">
            <div className="font-semibold text-slate-800">
              Venda para Imobiliária
            </div>
            <div className="text-xs text-slate-500">
              SaaS tradicional, domínio único
            </div>
          </div>
        </button>
        <button
          onClick={() => applyTemplate('reseller')}
          className={`flex-1 flex items-center justify-center gap-2 p-4 border rounded-xl transition ${formData.contract_type === 'reseller' ? 'border-slate-800 bg-slate-50' : 'hover:border-slate-300 bg-white'}`}
        >
          <ShieldCheck
            className={
              formData.contract_type === 'reseller'
                ? 'text-slate-800'
                : 'text-slate-400'
            }
          />
          <div className="text-left">
            <div className="font-semibold text-slate-800">
              Venda como Revenda
            </div>
            <div className="text-xs text-slate-500">
              Código restrito, multi-inquilino
            </div>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8">
        {/* Seção 1: Contratante */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">
            1. Dados do Contratante
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Razão Social / Nome
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.contratante_details.nome}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contratante_details: {
                      ...formData.contratante_details,
                      nome: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                CNPJ / CPF
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.contratante_details.cnpj}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contratante_details: {
                      ...formData.contratante_details,
                      cnpj: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Endereço Completo
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.contratante_details.endereco}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contratante_details: {
                      ...formData.contratante_details,
                      endereco: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Representante Legal
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.contratante_details.representante}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contratante_details: {
                      ...formData.contratante_details,
                      representante: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                className="w-full p-2 border rounded"
                value={formData.contratante_details.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contratante_details: {
                      ...formData.contratante_details,
                      email: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
        </section>

        {/* Seção 2: Especificações Técnicas */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">
            2. Especificações Técnicas e Licença
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Produto / Versão
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded bg-slate-50"
                value={formData.product_version}
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Modalidade IP
              </label>
              <select
                className="w-full p-2 border rounded"
                value={formData.ip_modality}
                onChange={(e) =>
                  setFormData({ ...formData, ip_modality: e.target.value })
                }
              >
                <option value="saas">9A SaaS</option>
                <option value="lifetime">9B Prazo Indeterminado</option>
                <option value="restricted_code">
                  9C Código Restrito (Revenda)
                </option>
                <option value="assignment">9D Cessão Negociada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Domínio de Produção
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder="exemplo.com.br"
                value={formData.production_domain}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    production_domain: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Domínios de Homologação
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder="homolog.exemplo.com.br"
                value={formData.staging_domains}
                onChange={(e) =>
                  setFormData({ ...formData, staging_domains: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Limites e Volume (Usuários/Unidades)
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.usage_limits}
                onChange={(e) =>
                  setFormData({ ...formData, usage_limits: e.target.value })
                }
              />
            </div>
          </div>
        </section>

        {/* Seção 3: Financeiro e Prazos */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">
            3. Prazos e Financeiro
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Início da Vigência
              </label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fim da Vigência / Renovação
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.renewal_type}
                onChange={(e) =>
                  setFormData({ ...formData, renewal_type: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Setup (R$)
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={formData.setup_fee}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    setup_fee: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mensalidade (R$)
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={formData.monthly_fee}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    monthly_fee: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Marcos de Setup / Desenvolvimento
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.setup_milestones}
                onChange={(e) =>
                  setFormData({ ...formData, setup_milestones: e.target.value })
                }
              />
            </div>
          </div>
        </section>

        {/* Seção 4: Análise IA */}
        {id && id !== 'new' && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">
              4. Análise Inteligente
            </h2>
            <div className="bg-slate-50 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer">
                  <Upload size={18} />
                  <span>
                    {contractFile
                      ? contractFile.name
                      : 'Selecionar arquivo para análise'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
                <button
                  onClick={handleFileAnalysis}
                  disabled={analyzing || !contractFile}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {analyzing ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Brain size={18} />
                  )}
                  {analyzing ? 'Analisando...' : 'Analisar Arquivo'}
                </button>
                <button
                  onClick={handleAIAnalysis}
                  disabled={analyzing || !formData.contratante_details.nome}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                >
                  <Brain size={18} />
                  Analisar dados do formulário
                </button>
              </div>

              {analysisResult && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="text-indigo-600" size={20} />
                    <h3 className="font-semibold text-slate-800">
                      Resultado da Análise
                    </h3>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      Provedor: {analysisResult.provider || 'N/A'}
                    </span>
                  </div>
                  {analysisResult.error ? (
                    <div className="bg-red-50 text-red-800 p-4 rounded">
                      {analysisResult.error}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-slate-700 bg-slate-50 p-4 rounded text-sm">
                        {analysisResult.analysis}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ContractEditor;
