import React, { useState, useRef, useEffect } from 'react';
import {
  FileUp,
  Image as ImageIcon,
  Sparkles,
  FileText,
  CheckCircle2,
  Check,
  ShieldCheck,
  Search,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  Maximize,
  Edit2,
  ChevronDown,
  User,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Send,
  X,
  FileCheck,
  Edit3,
} from 'lucide-react';
import { toast } from 'sonner';
import { callApi } from '@/src/lib/api';
import { supabase } from '@/services/supabase';
import {
  useDocumentTemplates,
  DocumentTemplate,
} from './hooks/useDocumentTemplates';

interface Props {
  leaseId?: string;
  onClose?: () => void;
}

export default function RentalsContractEditor({ leaseId, onClose }: Props) {
  const [activeImport, setActiveImport] = useState('pdf');
  const [expandedSection, setExpandedSection] = useState<string | null>(
    'locador'
  );
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getRenderedContent = () => {
    if (selectedTemplateId === 'default') return null;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return null;

    let content = tpl.content;
    content = content.replace(/\n/g, '<br/>');

    const varMap: Record<string, { value: string; color: string }> = {
      '{{locador_nome}}': {
        value: contractData.locador_nome,
        color: 'emerald',
      },
      '{{locador_cpf}}': { value: contractData.locador_cpf, color: 'emerald' },
      '{{locador_telefone}}': {
        value: contractData.locador_telefone,
        color: 'emerald',
      },
      '{{locador_email}}': {
        value: contractData.locador_email,
        color: 'emerald',
      },
      '{{locatario_nome}}': {
        value: contractData.locatario_nome,
        color: 'blue',
      },
      '{{locatario_cpf}}': { value: contractData.locatario_cpf, color: 'blue' },
      '{{imovel_endereco}}': {
        value: contractData.imovel_endereco,
        color: 'amber',
      },
      '{{imovel_cidade}}': {
        value: contractData.imovel_cidade,
        color: 'amber',
      },
      '{{imovel_cep}}': { value: contractData.imovel_cep, color: 'amber' },
      '{{aluguel_valor}}': {
        value: contractData.aluguel_valor,
        color: 'purple',
      },
      '{{aluguel_vencimento}}': {
        value: contractData.aluguel_vencimento,
        color: 'pink',
      },
    };

    Object.keys(varMap).forEach((key) => {
      const v = varMap[key];
      const htmlSpan = `<span class="bg-${v.color}-100/80 text-${v.color}-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">${v.value || key}</span>`;
      // We use split.join for replace all in old JS, or global regex
      content = content.split(key).join(htmlSpan);
    });
    return content;
  };

  // Template Management
  const {
    templates,
    loading: templatesLoading,
    saveTemplate,
    deleteTemplate,
  } = useDocumentTemplates('lease_contract');
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>('default');
  const [editTemplateMode, setEditTemplateMode] = useState(false);
  const [editingTemplateContent, setEditingTemplateContent] = useState('');
  const [editingTemplateName, setEditingTemplateName] = useState('');

  const [contractData, setContractData] = useState({
    locador_nome: 'João da Silva',
    locador_cpf: '123.456.789-00',
    locador_telefone: '(11) 99999-9999',
    locador_email: 'joao.silva@email.com',
    locatario_nome: 'Maria Oliveira Santos',
    locatario_cpf: '987.654.321-00',
    imovel_endereco: 'Rua das Acácias, 500',
    imovel_cidade: 'São Paulo/SP',
    imovel_cep: '01000-000',
    aluguel_valor: '2.500,00',
    aluguel_vencimento: '05',
  });

  const [chatMessages, setChatMessages] = useState<
    {
      role: 'ai' | 'user';
      text: string;
      isAction?: boolean;
      isHighlight?: boolean;
    }[]
  >([
    {
      role: 'ai',
      text: 'Olá! Sou seu assistente jurídico alimentado pelas maiores IAs do mercado (OpenAI, Gemini e Groq). Como posso ajudar no seu contrato?',
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleInputChange = (
    field: keyof typeof contractData,
    value: string
  ) => {
    setContractData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAiRequest = async () => {
    if (!chatInput.trim() || isAiLoading) return;

    const userText = chatInput;
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsAiLoading(true);

    try {
      const systemPrompt = `
Você é um assistente de IA focado em contratos imobiliários. 
O usuário deseja alterar os dados de um contrato. Você deve retornar SOMENTE um JSON válido com TODOS os campos atualizados com base no pedido do usuário. 
NÃO retorne formatação Markdown (\`\`\`json etc). NENHUM TEXTO ALÉM DO JSON.
Se o usuário pedir algo genérico como "atualize o aluguel para X", você deve atualizar o campo correto.
Dados atuais do contrato:
${JSON.stringify(contractData)}

As chaves permitidas no JSON são estritamente estas:
locador_nome, locador_cpf, locador_telefone, locador_email, locatario_nome, locatario_cpf, imovel_endereco, imovel_cidade, imovel_cep, aluguel_valor, aluguel_vencimento.

Pedido do usuário: "${userText}"
`;

      const response = await callApi('api/wootech-ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          model: 'auto/wootech',
          messages: [{ role: 'user', content: systemPrompt }],
          stream: false,
        }),
      });

      let responseText = '';
      if (
        response &&
        response.choices &&
        response.choices[0] &&
        response.choices[0].message
      ) {
        responseText = response.choices[0].message.content;
      } else {
        responseText = response.message || '';
      }

      // Tenta parsear o JSON retornado
      try {
        const cleanJson = responseText
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        const updatedData = JSON.parse(cleanJson);

        // Verifica o que mudou para mostrar no chat
        const changedFields = [];
        for (const key in updatedData) {
          if (
            updatedData[key as keyof typeof contractData] !==
            contractData[key as keyof typeof contractData]
          ) {
            changedFields.push(key);
          }
        }

        if (changedFields.length > 0) {
          setContractData(updatedData);
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'ai',
              text: `Atualizei os seguintes dados: ${changedFields.join(', ')}`,
              isAction: true,
              isHighlight: true,
            },
          ]);
        } else {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'ai',
              text: 'Entendi, mas não encontrei campos exatos para atualizar com essa instrução ou os valores já estão iguais.',
            },
          ]);
        }
      } catch (e) {
        // Se a IA não retornou um JSON válido, mostra como texto normal
        setChatMessages((prev) => [
          ...prev,
          { role: 'ai', text: responseText },
        ]);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao conectar com a IA');
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Ocorreu um erro ao processar sua solicitação.' },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAiRequest();
    }
  };

  const handleSaveContract = async () => {
    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const leasePayload = {
        tenant_name: contractData.locatario_nome,
        tenant_cpf: contractData.locatario_cpf,
        monthly_rent: parseFloat(
          contractData.aluguel_valor.replace(/\./g, '').replace(',', '.')
        ),
        due_day: parseInt(contractData.aluguel_vencimento, 10) || undefined,
        observation: `Endereço: ${contractData.imovel_endereco} - ${contractData.imovel_cidade}`,
      };

      let saved;
      if (leaseId) {
        const result = await callApi(`/api/locacao/leases/${leaseId}`, {
          method: 'PUT',
          body: JSON.stringify(leasePayload),
        });
        saved = result.data;
      } else {
        const result = await callApi('/api/locacao/leases', {
          method: 'POST',
          body: JSON.stringify({ ...leasePayload, status: 'draft' }),
        });
        saved = result.data;
      }

      toast.success(
        saved
          ? 'Contrato salvo com sucesso!'
          : 'Contrato gerado com sucesso e anexado ao fluxo!'
      );
      if (onClose) onClose();
    } catch (error) {
      toast.error('Erro ao salvar o contrato');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const importOptions = [
    {
      id: 'pdf',
      title: 'Importar PDF',
      desc: 'Envie um PDF e a IA preenche tudo para você',
      icon: FileUp,
    },
    {
      id: 'img',
      title: 'Importar Imagem',
      desc: 'Tire uma foto ou envie uma imagem do contrato',
      icon: ImageIcon,
    },
    {
      id: 'ai',
      title: 'Gerar com IA',
      desc: 'Descreva o contrato em linguagem natural',
      icon: Sparkles,
    },
    {
      id: 'model',
      title: 'Usar Modelo',
      desc: 'Selecione um modelo pronto',
      icon: FileText,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center text-emerald-600 font-bold text-lg gap-2">
            <ShieldCheck className="w-5 h-5" />
            WooTech Jurídico
          </div>
          <div className="h-5 w-px bg-gray-300 mx-2"></div>
          <div className="flex items-center text-sm text-gray-500">
            <span
              className="hover:text-gray-900 cursor-pointer transition-colors"
              onClick={onClose}
            >
              Contratos
            </span>
            <span className="mx-2">/</span>
            <span className="font-semibold text-gray-900">
              Editor 360° com IA
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium text-emerald-600 flex items-center gap-1.5 hover:bg-emerald-50 px-3 py-1.5 rounded-full transition-colors">
            <Sparkles className="w-4 h-4" /> Inteligência Ativada
          </button>
          <button
            onClick={onClose}
            className="ml-2 p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0 z-10 shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Novo Contrato
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Escolha a origem dos dados
            </p>

            <div className="space-y-3 mb-10">
              {importOptions.map((opt) => (
                <div key={opt.id} className="flex flex-col gap-2">
                  <div
                    onClick={() => setActiveImport(opt.id)}
                    className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                      activeImport === opt.id
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-1 ring-emerald-500'
                        : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`mt-0.5 p-2 rounded-lg ${
                        activeImport === opt.id
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <opt.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3
                          className={`font-semibold text-sm ${
                            activeImport === opt.id
                              ? 'text-emerald-800'
                              : 'text-gray-900'
                          }`}
                        >
                          {opt.title}
                        </h3>
                        {activeImport === opt.id && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                  </div>

                  {activeImport === 'model' && opt.id === 'model' && (
                    <div className="pl-4 border-l-2 border-emerald-200 ml-4 py-2 animate-in fade-in duration-200">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block">
                        Selecione o Modelo
                      </label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      >
                        <option value="default">
                          Modelo Padrão do Sistema
                        </option>
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            const tpl = templates.find(
                              (t) => t.id === selectedTemplateId
                            );
                            setEditingTemplateName(
                              tpl ? tpl.name : 'Novo Modelo'
                            );
                            setEditingTemplateContent(tpl ? tpl.content : '');
                            setEditTemplateMode(true);
                          }}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs py-1.5 rounded-md font-semibold transition-colors"
                        >
                          {selectedTemplateId !== 'default'
                            ? 'Editar Modelo'
                            : 'Criar Novo'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-widest text-xs">
                Etapas do processo
              </h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {/* Step 1 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-emerald-500/30 z-10">
                    <Check className="w-3 h-3" />
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-3 md:ml-0">
                    <h4 className="font-semibold text-sm text-gray-900">
                      Base gerada
                    </h4>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Modelo Padrão
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-emerald-500/30 z-10">
                    <Check className="w-3 h-3" />
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-3 md:ml-0">
                    <h4 className="font-semibold text-sm text-gray-900">
                      Análise concluída
                    </h4>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      100% Inteligência
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 font-bold text-[10px] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ring-4 ring-emerald-50">
                    3
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-3 md:ml-0">
                    <h4 className="font-semibold text-sm text-emerald-700">
                      Edição Dinâmica
                    </h4>
                    <p className="text-[10px] uppercase font-bold text-emerald-600/80 tracking-wider">
                      Edite ou peça à IA
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center: Document Viewer */}
        <section className="flex-1 bg-slate-100 flex flex-col relative overflow-hidden">
          <div className="px-8 pt-4 pb-2 shrink-0">
            <div className="bg-emerald-50 border border-emerald-200 shadow-sm rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-emerald-800 font-bold text-sm">
                    Pronto para Edição!
                  </h3>
                  <p className="text-emerald-600/80 text-xs">
                    Os dados estão sincronizados com a barra lateral. Edite
                    livremente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 pb-4 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button className="p-1.5 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 rounded-md transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-gray-200"></div>
              <button className="p-1.5 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 rounded-md transition-colors">
                <FileText className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md">
                <Download className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md">
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-16 pt-2">
            <div className="max-w-[800px] mx-auto bg-white shadow-xl min-h-[1100px] border border-gray-200 p-16 font-serif text-[15px] leading-relaxed text-gray-800 transition-all relative">
              {editTemplateMode ? (
                <div className="absolute inset-0 bg-white z-10 p-10 flex flex-col">
                  <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Editor de Modelo de Contrato
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditTemplateMode(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          const id =
                            selectedTemplateId !== 'default'
                              ? selectedTemplateId
                              : undefined;
                          const success = await saveTemplate(
                            editingTemplateName,
                            editingTemplateContent,
                            id
                          );
                          if (success) setEditTemplateMode(false);
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
                      >
                        Salvar Modelo
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Nome do Modelo
                    </label>
                    <input
                      type="text"
                      value={editingTemplateName}
                      onChange={(e) => setEditingTemplateName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Ex: Contrato de Locação Padrão Residencial"
                    />
                  </div>

                  <div className="mb-4 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h3 className="text-xs font-bold text-blue-800 uppercase mb-2">
                      Variáveis Disponíveis
                    </h3>
                    <p className="text-xs text-blue-700 mb-2">
                      Copie e cole as chaves abaixo no texto do contrato para a
                      IA preencher automaticamente:
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      {[
                        '{{locador_nome}}',
                        '{{locador_cpf}}',
                        '{{locador_telefone}}',
                        '{{locador_email}}',
                        '{{locatario_nome}}',
                        '{{locatario_cpf}}',
                        '{{imovel_endereco}}',
                        '{{imovel_cidade}}',
                        '{{imovel_cep}}',
                        '{{aluguel_valor}}',
                        '{{aluguel_vencimento}}',
                      ].map((v) => (
                        <span
                          key={v}
                          className="bg-white border border-blue-200 px-2 py-1 rounded text-blue-800 cursor-pointer"
                          onClick={() => {
                            setEditingTemplateContent((prev) => prev + v);
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>

                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Conteúdo do Contrato
                  </label>
                  <textarea
                    value={editingTemplateContent}
                    onChange={(e) => setEditingTemplateContent(e.target.value)}
                    className="flex-1 w-full border border-gray-300 rounded-lg p-4 text-sm font-serif focus:ring-emerald-500 focus:border-emerald-500 resize-none min-h-[500px]"
                    placeholder="Cole aqui o texto do seu contrato..."
                  />
                </div>
              ) : selectedTemplateId !== 'default' ? (
                <div
                  className="prose max-w-none text-justify"
                  dangerouslySetInnerHTML={{
                    __html: getRenderedContent() || '',
                  }}
                />
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-center text-gray-900 mb-10">
                    CONTRATO DE LOCAÇÃO
                    <br />
                    DE IMÓVEL URBANO
                  </h1>

                  <p className="mb-6 text-justify">
                    Pelo presente instrumento particular de locação de imóvel,
                    as partes abaixo qualificadas têm entre si justo e
                    contratado o seguinte:
                  </p>

                  <h2 className="font-bold mb-4 uppercase text-gray-900">
                    Cláusula 1ª – Das Partes
                  </h2>

                  <p className="mb-4 text-justify">
                    <strong>LOCADOR:</strong>{' '}
                    <span className="bg-emerald-100/80 text-emerald-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">
                      {contractData.locador_nome}
                    </span>
                    , residente e domiciliado no Brasil, inscrito no CPF sob o
                    nº{' '}
                    <span className="bg-emerald-100/80 text-emerald-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">
                      {contractData.locador_cpf}
                    </span>
                    , podendo ser contatado via telefone{' '}
                    <span className="bg-emerald-100/80 text-emerald-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">
                      {contractData.locador_telefone}
                    </span>{' '}
                    ou pelo correio eletrônico{' '}
                    <span className="bg-emerald-100/80 text-emerald-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">
                      {contractData.locador_email}
                    </span>
                    .
                  </p>

                  <p className="mb-8 text-justify">
                    <strong>LOCATÁRIO:</strong>{' '}
                    <span className="bg-blue-100/80 text-blue-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">
                      {contractData.locatario_nome}
                    </span>
                    , residente e domiciliado no Brasil, inscrito no CPF sob o
                    nº{' '}
                    <span className="bg-blue-100/80 text-blue-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">
                      {contractData.locatario_cpf}
                    </span>
                    .
                  </p>

                  <h2 className="font-bold mb-4 uppercase text-gray-900">
                    Cláusula 2ª – Do Imóvel
                  </h2>

                  <p className="mb-8 text-justify">
                    O LOCADOR dá em locação ao LOCATÁRIO o imóvel assim
                    descrito: Localizado na{' '}
                    <span className="bg-amber-100/80 text-amber-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">
                      {contractData.imovel_endereco}
                    </span>
                    , na cidade de{' '}
                    <span className="bg-amber-100/80 text-amber-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">
                      {contractData.imovel_cidade}
                    </span>
                    , CEP{' '}
                    <span className="bg-amber-100/80 text-amber-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">
                      {contractData.imovel_cep}
                    </span>
                    , para o fim exclusivo de locação residencial.
                  </p>

                  <h2 className="font-bold mb-4 uppercase text-gray-900">
                    Cláusula 3ª – Do Valor e Pagamento
                  </h2>

                  <p className="mb-4 text-justify">
                    O aluguel mensal ajustado é de{' '}
                    <span className="bg-purple-100/80 text-purple-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">
                      R$ {contractData.aluguel_valor}
                    </span>
                    , vencível e pagável impreterivelmente até o dia{' '}
                    <span className="bg-pink-100/80 text-pink-900 font-semibold px-1.5 py-0.5 rounded shadow-sm transition-all">
                      {contractData.aluguel_vencimento}
                    </span>{' '}
                    de cada mês subsequente ao vencido.
                  </p>

                  <p className="mb-8 text-justify">
                    O pagamento será realizado mediante depósito bancário ou PIX
                    na conta indicada pelo LOCADOR, valendo o comprovante como
                    recibo para todos os fins.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-500 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-20">
            <span className="mr-2 text-gray-400">Legenda de Dados:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-400 shadow-sm"></div>{' '}
              Locador
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-400 shadow-sm"></div>{' '}
              Locatário
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-400 shadow-sm"></div>{' '}
              Imóvel
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-purple-400 shadow-sm"></div>{' '}
              Valores
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-pink-400 shadow-sm"></div>{' '}
              Datas
            </div>
          </div>
        </section>

        {/* Right Sidebar (Editor & AI) */}
        <aside className="w-[420px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-30 shadow-[-4px_0_15px_rgba(0,0,0,0.04)]">
          <div className="h-[55%] flex flex-col border-b border-gray-200 bg-gray-50/30">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm z-10">
              <h2 className="font-bold text-gray-900 text-base">
                Campos do Documento
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                Edição Ativa
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {/* Accordion Locador */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-emerald-200 transition-colors">
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === 'locador' ? null : 'locador'
                    )
                  }
                  className="w-full px-5 py-4 flex items-center justify-between text-xs font-bold text-gray-800 uppercase tracking-widest"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>{' '}
                    Locador
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'locador' ? 'rotate-180 text-emerald-600' : ''}`}
                  />
                </button>
                {expandedSection === 'locador' && (
                  <div className="p-5 bg-white border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">
                        Nome Completo
                      </label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-all">
                        <User className="w-4 h-4 text-emerald-500 shrink-0" />
                        <input
                          type="text"
                          value={contractData.locador_nome}
                          onChange={(e) =>
                            handleInputChange('locador_nome', e.target.value)
                          }
                          className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">
                        CPF
                      </label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-all">
                        <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                        <input
                          type="text"
                          value={contractData.locador_cpf}
                          onChange={(e) =>
                            handleInputChange('locador_cpf', e.target.value)
                          }
                          className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">
                        Telefone
                      </label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-all">
                        <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                        <input
                          type="text"
                          value={contractData.locador_telefone}
                          onChange={(e) =>
                            handleInputChange(
                              'locador_telefone',
                              e.target.value
                            )
                          }
                          className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">
                        E-mail
                      </label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-all">
                        <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                        <input
                          type="text"
                          value={contractData.locador_email}
                          onChange={(e) =>
                            handleInputChange('locador_email', e.target.value)
                          }
                          className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion Locatário */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-blue-200 transition-colors">
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === 'locatario' ? null : 'locatario'
                    )
                  }
                  className="w-full px-5 py-4 flex items-center justify-between text-xs font-bold text-gray-800 uppercase tracking-widest"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>{' '}
                    Locatário
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'locatario' ? 'rotate-180 text-blue-600' : ''}`}
                  />
                </button>
                {expandedSection === 'locatario' && (
                  <div className="p-5 bg-white border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">
                        Nome Completo
                      </label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                        <User className="w-4 h-4 text-blue-500 shrink-0" />
                        <input
                          type="text"
                          value={contractData.locatario_nome}
                          onChange={(e) =>
                            handleInputChange('locatario_nome', e.target.value)
                          }
                          className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">
                        CPF
                      </label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                        <CreditCard className="w-4 h-4 text-blue-500 shrink-0" />
                        <input
                          type="text"
                          value={contractData.locatario_cpf}
                          onChange={(e) =>
                            handleInputChange('locatario_cpf', e.target.value)
                          }
                          className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion Imóvel */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-amber-200 transition-colors">
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === 'imovel' ? null : 'imovel'
                    )
                  }
                  className="w-full px-5 py-4 flex items-center justify-between text-xs font-bold text-gray-800 uppercase tracking-widest"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>{' '}
                    Imóvel
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'imovel' ? 'rotate-180 text-amber-600' : ''}`}
                  />
                </button>
                {expandedSection === 'imovel' && (
                  <div className="p-5 bg-white border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">
                        Endereço
                      </label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-400 transition-all">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        <input
                          type="text"
                          value={contractData.imovel_endereco}
                          onChange={(e) =>
                            handleInputChange('imovel_endereco', e.target.value)
                          }
                          className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">
                        Cidade/UF
                      </label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-400 transition-all">
                        <input
                          type="text"
                          value={contractData.imovel_cidade}
                          onChange={(e) =>
                            handleInputChange('imovel_cidade', e.target.value)
                          }
                          className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">
                        CEP
                      </label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-400 transition-all">
                        <input
                          type="text"
                          value={contractData.imovel_cep}
                          onChange={(e) =>
                            handleInputChange('imovel_cep', e.target.value)
                          }
                          className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion Condições */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-purple-200 transition-colors">
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === 'condicoes' ? null : 'condicoes'
                    )
                  }
                  className="w-full px-5 py-4 flex items-center justify-between text-xs font-bold text-gray-800 uppercase tracking-widest"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>{' '}
                    Condições
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'condicoes' ? 'rotate-180 text-purple-600' : ''}`}
                  />
                </button>
                {expandedSection === 'condicoes' && (
                  <div className="p-5 bg-white border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">
                        Valor do Aluguel
                      </label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-400 transition-all">
                        <span className="text-gray-500 text-sm font-bold">
                          R$
                        </span>
                        <input
                          type="text"
                          value={contractData.aluguel_valor}
                          onChange={(e) =>
                            handleInputChange('aluguel_valor', e.target.value)
                          }
                          className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">
                        Vencimento (Dia)
                      </label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-400 transition-all">
                        <Calendar className="w-4 h-4 text-pink-500 shrink-0" />
                        <input
                          type="text"
                          value={contractData.aluguel_vencimento}
                          onChange={(e) =>
                            handleInputChange(
                              'aluguel_vencimento',
                              e.target.value
                            )
                          }
                          className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white relative border-t-2 border-indigo-50">
            <div className="p-4 bg-gradient-to-r from-indigo-900 to-indigo-800 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold">Chat 360° IA</h3>
                <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[9px] font-bold uppercase rounded-md shadow-inner">
                  Conectado
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-indigo-50/30">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-md">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`p-3.5 rounded-2xl shadow-sm text-sm max-w-[85%] font-medium ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-sm'
                        : msg.isHighlight
                          ? 'bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-tl-sm'
                          : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div className="p-3.5 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isAiLoading}
                  placeholder="Ex: Atualize o valor do aluguel para R$ 3.000..."
                  className="w-full bg-white border border-gray-300 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner disabled:opacity-50"
                />
                <button
                  onClick={handleAiRequest}
                  disabled={isAiLoading || !chatInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                >
                  <Send className="w-4 h-4 -ml-0.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border-t border-gray-200 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-20">
            <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-widest">
              Ações Finais
            </h3>

            <button
              onClick={handleSaveContract}
              disabled={isSaving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-transform active:scale-95"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              {isSaving ? 'Salvando...' : 'Finalizar e gerar contrato'}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
