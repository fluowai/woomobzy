import { logger } from '@/utils/logger';
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../services/supabase';
import {
  FileText,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
  MoreVertical,
  Download,
  Eye,
  Mail,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  User,
  X,
  Printer,
  ChevronRight,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { MOCK_PROPERTIES, MOCK_LEADS } from '../constants.tsx';
import {
  CONTRACT_TEMPLATES,
  ContractTemplate,
} from '../constants/ContractTemplates';

interface Contract {
  id: string;
  title: string;
  type: string;
  propertyId: string;
  clientId: string;
  propertyName: string;
  clientName: string;
  clientPhone: string;
  status: 'Draft' | 'Pending' | 'Active' | 'Archived';
  date: string;
  value: number;
  templateId: string;
}

const LegalContracts: React.FC = () => {
  const { settings } = useSettings();
  const [contracts, setContracts] = useState<Contract[]>([
    {
      id: 'cnt-01',
      title: 'Compra e Venda - Fazenda Solar',
      type: 'Venda',
      propertyId: 'f1',
      clientId: 'l1',
      propertyName: 'Fazenda Rio Doce',
      clientName: 'AgroInvest S.A.',
      clientPhone: '5561988880000',
      status: 'Active',
      date: '2024-05-15',
      value: 12500000,
      templateId: 'venda-rural',
    },
    {
      id: 'cnt-02',
      title: 'Arrendamento Agrícola',
      type: 'Arrendamento',
      propertyId: 'f2',
      clientId: 'l2',
      propertyName: 'Sítio Primavera',
      clientName: 'Carlos Mendes',
      clientPhone: '5511977776666',
      status: 'Pending',
      date: '2024-06-01',
      value: 45000,
      templateId: 'arrendamento',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null
  );

  // Form State
  const [newContract, setNewContract] = useState({
    title: '',
    propertyId: '',
    clientId: '',
    clientPhone: '',
    templateId: 'venda-rural',
    value: 0,
    sendNow: false,
  });

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select('*, properties(title), leads(name, phone)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Contract[] = data.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        propertyId: c.property_id,
        clientId: c.lead_id,
        propertyName: c.properties?.title || 'Propriedade não encontrada',
        clientName: c.leads?.name || 'Cliente não encontrado',
        clientPhone: c.leads?.phone || '',
        status: c.status as any,
        date: c.created_at?.split('T')[0],
        value: c.value,
        templateId: c.template_id,
      }));

      setContracts(mapped);
    } catch (error) {
      logger.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'All' || c.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [contracts, searchTerm, filterStatus]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const property = MOCK_PROPERTIES.find(
      (p) => p.id === newContract.propertyId
    );

    try {
      const generatedContent = getGeneratedContent({
        ...newContract,
        propertyName: property?.title || '',
        clientName:
          MOCK_LEADS.find((l) => l.id === newContract.clientId)?.name || '',
      } as any);

      const { data, error } = await supabase
        .from('contracts')
        .insert({
          organization_id: settings.id,
          title: newContract.title,
          type:
            CONTRACT_TEMPLATES.find((t) => t.id === newContract.templateId)
              ?.name || 'Contrato',
          property_id: newContract.propertyId,
          lead_id: newContract.clientId,
          status: 'Draft',
          value: newContract.value,
          template_id: newContract.templateId,
          content: generatedContent,
        })
        .select()
        .single();

      if (error) throw error;

      await loadContracts();
      setIsCreateModalOpen(false);

      if (newContract.sendNow) {
        // Find the mapped version of the new contract
        const contract = contracts.find((c) => c.id === data.id);
        if (contract) sendViaWhatsApp(contract);
      }

      setNewContract({
        title: '',
        propertyId: '',
        clientId: '',
        clientPhone: '',
        templateId: 'venda-rural',
        value: 0,
        sendNow: false,
      });
    } catch (error) {
      logger.error('Error creating contract:', error);
      alert('Erro ao criar contrato no banco');
    }
  };

  const sendViaWhatsApp = async (contract: Contract) => {
    if (!settings.integrations?.evolutionApi?.enabled) {
      setWhatsappStatus({
        type: 'error',
        message: 'Evolution API não configurada ou desativada.',
      });
      return;
    }

    setIsSendingWhatsApp(true);
    setWhatsappStatus(null);

    const { baseUrl, token, instanceName } = settings.integrations.evolutionApi;

    // Normalização da URL (protocolo e barra final)
    let normalizedBaseUrl = baseUrl.endsWith('/')
      ? baseUrl.slice(0, -1)
      : baseUrl;
    if (!normalizedBaseUrl.startsWith('http')) {
      normalizedBaseUrl = `https://${normalizedBaseUrl}`;
    }

    // Normalização do telefone para padrão internacional (DDI 55)
    let cleanPhone = contract.clientPhone.replace(/\D/g, '');
    if (
      cleanPhone.length > 0 &&
      !cleanPhone.startsWith('55') &&
      cleanPhone.length <= 11
    ) {
      cleanPhone = `55${cleanPhone}`;
    }

    const content = getGeneratedContent(contract);
    const message = `*DOCUMENTO JURÍDICO - ${contract.title.toUpperCase()}*\n\nOlá ${contract.clientName}, segue a minuta do contrato para sua análise:\n\n${content}`;

    logger.info('Enviando via Evolution API:', {
      url: `${normalizedBaseUrl}/message/sendText/${instanceName}`,
      number: cleanPhone,
    });

    try {
      // Tentar endpoint v2 (mais comum)
      const response = await fetch(
        `${normalizedBaseUrl}/message/sendText/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: token,
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: message,
            delay: 1200,
            linkPreview: false,
          }),
        }
      );

      if (response.ok) {
        setWhatsappStatus({
          type: 'success',
          message: 'Contrato enviado com sucesso via WhatsApp!',
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setWhatsappStatus({
          type: 'error',
          message: `Erro na API: ${errorData.message || response.statusText || 'Não autorizado/Erro no servidor'}`,
        });
      }
    } catch (error) {
      logger.error('Erro ao enviar WhatsApp:', error);
      setWhatsappStatus({
        type: 'error',
        message:
          'Falha de conexão: Verifique se a URL da API está correta e se a instância está conectada.',
      });
    } finally {
      setIsSendingWhatsApp(false);
      setTimeout(() => setWhatsappStatus(null), 8000);
    }
  };

  const getGeneratedContent = (contract: Contract) => {
    const template = CONTRACT_TEMPLATES.find(
      (t) => t.id === contract.templateId
    );
    if (!template) return '';

    const property = MOCK_PROPERTIES.find((p) => p.id === contract.propertyId);

    return template.content
      .replace(/{{client_name}}/g, contract.clientName)
      .replace(/{{property_name}}/g, contract.propertyName)
      .replace(
        /{{property_location}}/g,
        property
          ? `${property.location.city}, ${property.location.state}`
          : 'Local não informado'
      )
      .replace(
        /{{property_area}}/g,
        property ? property.features.areaHectares.toString() : '0'
      )
      .replace(
        /{{contract_value}}/g,
        contract.value.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      )
      .replace(/{{current_date}}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/{{duration}}/g, '24')
      .replace(/{{start_date}}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/{{percent}}/g, '50')
      .replace(/{{percent_out}}/g, '50');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Draft':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Archived':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-black uppercase italic tracking-tighter leading-none mb-3">
            Gestão{' '}
            <span style={{ color: settings.primaryColor }}>Jurídica</span>
          </h1>
          <p className="text-black/60 font-medium italic">
            Monitoramento de contratos, escrituras e conformidade legal.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-black uppercase text-xs tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <Plus size={18} /> Novo Contrato
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[3rem] p-1 shadow-sm border border-slate-100 overflow-hidden">
        {/* Filters & Search */}
        <div className="p-8 border-b border-slate-50 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex bg-slate-50 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto">
            {['All', 'Active', 'Pending', 'Draft', 'Archived'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === status ? 'bg-white text-black shadow-md' : 'text-black/40 hover:text-black'}`}
              >
                {status === 'All' ? 'Todos' : status}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-96">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-black/20"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por contrato ou cliente..."
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-slate-200 outline-none font-bold text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-black/30">
                  Documento
                </th>
                <th className="px-6 py-6 text-left text-[10px] font-black uppercase tracking-widest text-black/30">
                  Propriedade
                </th>
                <th className="px-6 py-6 text-left text-[10px] font-black uppercase tracking-widest text-black/30">
                  Cliente
                </th>
                <th className="px-6 py-6 text-left text-[10px] font-black uppercase tracking-widest text-black/30">
                  Status
                </th>
                <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-widest text-black/30">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredContracts.map((contract) => (
                <tr
                  key={contract.id}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 rounded-xl text-black/40 group-hover:bg-white group-hover:text-black group-hover:shadow-sm transition-all">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-black text-black text-sm">
                          {contract.title}
                        </p>
                        <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">
                          {contract.type}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-black/60">
                      <ArrowUpRight size={14} className="text-black/20" />
                      {contract.propertyName}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-black/60">
                      <User size={14} className="text-black/20" />
                      {contract.clientName}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(contract.status)} shadow-sm`}
                    >
                      <CheckCircle2 size={14} />
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedContract(contract);
                          setIsGeneratorOpen(true);
                        }}
                        className="p-3 text-black/30 hover:text-black transition-colors"
                        title="Gerar e Visualizar"
                      >
                        <Eye size={18} />
                      </button>
                      <button className="p-3 text-black/30 hover:text-black transition-colors">
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() =>
                          setContracts(
                            contracts.filter((c) => c.id !== contract.id)
                          )
                        }
                        className="p-3 text-black/30 hover:text-red-500 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CONTRACT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsCreateModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-12">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black text-black uppercase italic tracking-tighter">
                  Novo{' '}
                  <span style={{ color: settings.primaryColor }}>
                    Contrato Rural
                  </span>
                </h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-black/40" />
                </button>
              </div>

              <form onSubmit={handleCreateContract} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-black/40 tracking-[0.2em] ml-4">
                    Título do Documento
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Contrato de Venda - Lote A"
                    className="w-full px-8 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-black/5 outline-none font-bold text-sm"
                    value={newContract.title}
                    onChange={(e) =>
                      setNewContract({ ...newContract, title: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-black/40 tracking-[0.2em] ml-4">
                      Propriedade
                    </label>
                    <select
                      required
                      className="w-full px-8 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm appearance-none cursor-pointer"
                      value={newContract.propertyId}
                      onChange={(e) =>
                        setNewContract({
                          ...newContract,
                          propertyId: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecionar...</option>
                      {MOCK_PROPERTIES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-black/40 tracking-[0.2em] ml-4">
                      Cliente / Lead
                    </label>
                    <select
                      required
                      className="w-full px-8 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm appearance-none cursor-pointer"
                      value={newContract.clientId}
                      onChange={(e) => {
                        const lead = MOCK_LEADS.find(
                          (l) => l.id === e.target.value
                        );
                        setNewContract({
                          ...newContract,
                          clientId: e.target.value,
                          clientPhone: lead?.phone || '',
                        });
                      }}
                    >
                      <option value="">Selecionar...</option>
                      {MOCK_LEADS.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-black/40 tracking-[0.2em] ml-4">
                    WhatsApp do Cliente (Com DDD)
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="Ex: 5561999990000"
                    className="w-full px-8 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-black/5 outline-none font-bold text-sm"
                    value={newContract.clientPhone}
                    onChange={(e) =>
                      setNewContract({
                        ...newContract,
                        clientPhone: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-black/40 tracking-[0.2em] ml-4">
                      Template
                    </label>
                    <select
                      required
                      className="w-full px-8 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm appearance-none cursor-pointer"
                      value={newContract.templateId}
                      onChange={(e) =>
                        setNewContract({
                          ...newContract,
                          templateId: e.target.value,
                        })
                      }
                    >
                      {CONTRACT_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-black/40 tracking-[0.2em] ml-4">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      required
                      className="w-full px-8 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
                      value={newContract.value}
                      onChange={(e) =>
                        setNewContract({
                          ...newContract,
                          value: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <input
                    type="checkbox"
                    id="sendNow"
                    className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    checked={newContract.sendNow}
                    onChange={(e) =>
                      setNewContract({
                        ...newContract,
                        sendNow: e.target.checked,
                      })
                    }
                  />
                  <label
                    htmlFor="sendNow"
                    className="text-xs font-black uppercase text-emerald-800 tracking-widest cursor-pointer select-none"
                  >
                    Enviar p/ WhatsApp imediatamente ao salvar
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-6"
                >
                  Finalizar e Gerar Base
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT GENERATOR PREVIEW MODAL */}
      {isGeneratorOpen && selectedContract && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl"
            onClick={() => setIsGeneratorOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            {/* Toolbar */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-black text-white">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-black uppercase italic tracking-tighter leading-none">
                    Minuta Inteligente
                  </h3>
                  <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">
                    Ref: {selectedContract.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-black/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                  <Printer size={16} /> Imprimir
                </button>
                <button
                  disabled={isSendingWhatsApp}
                  onClick={() => sendViaWhatsApp(selectedContract)}
                  style={{ backgroundColor: '#25D366' }}
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                >
                  <MessageSquare size={16} />
                  {isSendingWhatsApp ? 'Enviando...' : 'Enviar WhatsApp'}
                </button>
                <button
                  style={{ backgroundColor: settings.primaryColor }}
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                >
                  <Download size={16} /> Exportar PDF
                </button>
                <button
                  onClick={() => setIsGeneratorOpen(false)}
                  className="p-3 hover:bg-slate-100 rounded-full text-black/20 hover:text-black transition-all ml-4"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* WhatsApp Status Toast-like */}
            {whatsappStatus && (
              <div
                className={`mx-8 mt-4 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300 ${whatsappStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
              >
                <div className="flex items-center gap-3">
                  {whatsappStatus.type === 'success' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                  <span className="text-xs font-bold">
                    {whatsappStatus.message}
                  </span>
                </div>
                <button
                  onClick={() => setWhatsappStatus(null)}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-12 md:p-20 bg-slate-50/50 custom-scrollbar">
              <div className="max-w-3xl mx-auto bg-white p-20 shadow-xl border border-slate-100 rounded-[1rem] min-h-full font-serif text-slate-800 leading-relaxed text-lg">
                <div className="whitespace-pre-line prose prose-slate max-w-none">
                  {getGeneratedContent(selectedContract)}
                </div>

                <div className="mt-32 pt-20 border-t border-slate-100 flex justify-between gap-10">
                  <div className="flex-1 border-b border-black/20 pb-2 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.3em] mb-1">
                      Assinatura Vendedor
                    </p>
                    <p className="text-[10px] text-black/30">
                      Fazendas Brasil Select
                    </p>
                  </div>
                  <div className="flex-1 border-b border-black/20 pb-2 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.3em] mb-1">
                      Assinatura Comprador
                    </p>
                    <p className="text-[10px] text-black/30">
                      {selectedContract.clientName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalContracts;
