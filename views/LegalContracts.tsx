import { logger } from '@/utils/logger';
import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { callApi } from '../src/lib/api';
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
  Bell,
  SlidersHorizontal,
  Scale,
  PenTool,
  Users
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
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
  const [contracts, setContracts] = useState<Contract[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null
  );
  const [dbProperties, setDbProperties] = useState<any[]>([]);
  const [dbLeads, setDbLeads] = useState<any[]>([]);

  // Form State
  const [newContract, setNewContract] = useState({
    title: '',
    propertyId: '',
    clientId: '',
    clientPhone: '',
    templateId: 'venda-urbana',
    value: 0,
    entryValue: 0,
    installments: 1,
    sendNow: false,
  });

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadContracts();
    loadResources();
  }, []);

  const loadResources = async () => {
    const { data: props } = await supabase
      .from('properties')
      .select(
        'id, title, price, city, state, address, total_area_ha, features'
      );
    const { data: leadsData } = await supabase
      .from('leads')
      .select('id, name, phone');
    setDbProperties(props || []);
    setDbLeads(leadsData || []);
  };

  const loadContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select('*, properties(title), leads(name, phone)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Contract[] = (data || []).map((c) => ({
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
    const property = dbProperties.find((p) => p.id === newContract.propertyId);
    const lead = dbLeads.find((l) => l.id === newContract.clientId);

    try {
      const generatedContent = getGeneratedContent({
        ...newContract,
        propertyName: property?.title || '',
        clientName: lead?.name || '',
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
        entryValue: 0,
        installments: 1,
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

    const content = getGeneratedContent(contract);
    const message = `*DOCUMENTO JURÍDICO - ${contract.title.toUpperCase()}*\n\nOlá ${contract.clientName}, segue a minuta do contrato para sua análise:\n\n${content}`;

    try {
      const result = await callApi('/api/whatsapp-proxy/send-text', {
        method: 'POST',
        body: JSON.stringify({
          phone: contract.clientPhone,
          message,
        }),
      });

      if (result.success) {
        setWhatsappStatus({
          type: 'success',
          message: 'Contrato enviado com sucesso via WhatsApp!',
        });
      } else {
        setWhatsappStatus({
          type: 'error',
          message: result.error || 'Erro ao enviar mensagem.',
        });
      }
    } catch (error: any) {
      logger.error('Erro ao enviar WhatsApp:', error);
      setWhatsappStatus({
        type: 'error',
        message: error.message || 'Falha de conexão com o servidor.',
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
    const property = dbProperties.find((p) => p.id === contract.propertyId);
    const area =
      property?.total_area_ha || property?.features?.areaHectares || 0;
    const registration =
      property?.features?.registration ||
      property?.features?.legal?.registration;

    return template.content
      .replace(/{{client_name}}/g, contract.clientName)
      .replace(/{{property_name}}/g, contract.propertyName)
      .replace(
        /{{property_location}}/g,
        property
          ? [property.city, property.state].filter(Boolean).join(', ') ||
              property.address ||
              'Local não informado'
          : 'Local não informado'
      )
      .replace(/{{property_registration}}/g, registration || 'Não informada')
      .replace(/{{property_area}}/g, String(area))
      .replace(
        /{{contract_value}}/g,
        contract.value.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      )
      .replace(
        /{{entry_value}}/g,
        ((contract as any).entryValue || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      )
      .replace(/{{installments}}/g, String((contract as any).installments || 1))
      .replace(
        /{{installment_value}}/g,
        (
          (contract.value - ((contract as any).entryValue || 0)) /
          ((contract as any).installments || 1)
        ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      )
      .replace(/{{current_date}}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/{{duration}}/g, '12')
      .replace(/{{start_date}}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/{{developer_name}}/g, settings.companyName || 'WooTech Imob')
      .replace(/{{developer_cnpj}}/g, '00.000.000/0001-00');
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
    <div className="w-full max-w-[1600px] mx-auto pb-12 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span className="font-semibold text-slate-800">Operações</span>
            <span>/</span>
            <span>Jurídico</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Contratos e Jurídico</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie contratos, prazos, assinaturas e conformidade legal.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar no Imobzy..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none w-64 transition-all" />
          </div>
          <button className="relative p-2 text-slate-500 hover:text-slate-700 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-200">
              <User size={18} className="text-slate-500" />
            </div>
            <div className="hidden sm:block text-sm">
              <p className="font-bold text-slate-900 leading-tight">Administrador</p>
              <p className="text-xs text-slate-500">Acesso administrativo</p>
            </div>
            <ChevronRight size={16} className="text-slate-400 hidden sm:block" />
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-all shadow-sm ml-2"
          >
            <Plus size={18} /> Novo contrato
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full"><FileText size={24} /></div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Contratos ativos</p>
            <p className="text-2xl font-bold text-slate-900">128</p>
            <p className="text-xs font-semibold text-emerald-500">+8 vs. mês anterior</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-full"><Calendar size={24} /></div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Vencem em 30 dias</p>
            <p className="text-2xl font-bold text-slate-900">12</p>
            <p className="text-xs font-semibold text-amber-500">Atenção necessária</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><PenTool size={24} /></div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Aguardando assinatura</p>
            <p className="text-2xl font-bold text-slate-900">8</p>
            <p className="text-xs font-semibold text-blue-500">Ação do cliente</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-full"><Scale size={24} /></div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Pendências jurídicas</p>
            <p className="text-2xl font-bold text-slate-900">4</p>
            <p className="text-xs font-semibold text-red-500">Requer atenção</p>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell className="text-amber-500" size={20} />
          <div>
            <p className="text-sm font-bold text-slate-900">Vencimentos próximos</p>
            <p className="text-xs font-medium text-slate-600">12 contratos vencem nos próximos 30 dias.</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-white border border-amber-200 text-emerald-600 text-xs font-bold rounded-lg hover:bg-emerald-50 transition-colors">
          Ver contratos
        </button>
      </div>

      {/* Main Layout 2 columns */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Column (Table) */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {/* Table Header/Filters */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 w-full sm:w-auto overflow-x-auto">
              {['All', 'Active', 'Pending', 'Draft'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab)}
                  className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${filterStatus === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  {tab === 'All' ? 'Todos' : tab === 'Active' ? 'Ativos' : tab === 'Pending' ? 'Pendentes' : 'Rascunhos'}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar contrato, cliente ou imóvel..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
                <Filter size={16} /> <span className="hidden sm:inline">Filtros</span>
              </button>
              <button className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Contrato</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Imóvel / Referência</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Tipo</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Vencimento</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Responsável</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContracts.map((contract, i) => (
                  <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FileText size={18} /></div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{contract.title}</p>
                          <p className="text-[11px] text-slate-500">CTR-{new Date(contract.date).getFullYear()}-{String(i + 10).padStart(4, '0')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[150px]">{contract.propertyName}</p>
                      <p className="text-[11px] text-slate-500">Ref: {contract.propertyId?.slice(0,6) || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 truncate max-w-[120px]">{contract.type}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(contract.date).toLocaleDateString('pt-BR')}
                      </p>
                      <p className={`text-[11px] font-medium ${i % 2 === 0 ? 'text-red-500' : 'text-slate-500'}`}>{i % 2 === 0 ? '5 dias' : '30 dias'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        contract.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                        contract.status === 'Pending' ? 'bg-blue-50 text-blue-600' :
                        contract.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {contract.status === 'Active' ? 'Ativo' : contract.status === 'Pending' ? 'Aguardando assinatura' : contract.status === 'Draft' ? 'Rascunho' : 'Vence em breve'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center border border-slate-200">
                          <User size={14} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 truncate max-w-[100px]">{contract.clientName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setIsGeneratorOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Visualizar"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => toast.info('Em breve')}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => setContracts(contracts.filter((c) => c.id !== contract.id))}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-auto p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <p>Mostrando 1 a {Math.min(5, filteredContracts.length)} de {contracts.length} contratos</p>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded hover:bg-slate-100 text-slate-400"><ChevronRight size={16} className="rotate-180" /></button>
              <button className="w-8 h-8 rounded bg-emerald-600 text-white font-medium flex items-center justify-center">1</button>
              <button className="w-8 h-8 rounded hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center">2</button>
              <button className="w-8 h-8 rounded hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center">3</button>
              <span className="px-1 text-slate-400">...</span>
              <button className="w-8 h-8 rounded hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center">26</button>
              <button className="p-1.5 rounded hover:bg-slate-100 text-slate-400"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="w-full xl:w-80 space-y-6 shrink-0">
          {/* Visão Rápida */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-6">Visão rápida</h3>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                  {/* Segments */}
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="4" strokeDasharray="61 39" strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="4" strokeDasharray="19 81" strokeDashoffset="-61" />
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#3b82f6" strokeWidth="4" strokeDasharray="13 87" strokeDashoffset="-80" />
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#cbd5e1" strokeWidth="4" strokeDasharray="7 93" strokeDashoffset="-93" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">128</span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Total</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-slate-700">Ativos</span></div>
                  <span className="text-slate-500">78 (61%)</span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-slate-700">Pendentes</span></div>
                  <span className="text-slate-500">24 (19%)</span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-slate-700">Rascunhos</span></div>
                  <span className="text-slate-500">16 (13%)</span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300"></div><span className="text-slate-700">Arquivados</span></div>
                  <span className="text-slate-500">10 (7%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Ações rápidas</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 cursor-pointer group">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors"><FileText size={16} /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">Modelos de contrato</p>
                  <p className="text-xs text-slate-500">Gerencie modelos padrão</p>
                </div>
              </div>
              <div className="flex items-start gap-3 cursor-pointer group">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors"><Users size={16} /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">Partes e Representantes</p>
                  <p className="text-xs text-slate-500">Clientes, fiadores e procuradores</p>
                </div>
              </div>
              <div className="flex items-start gap-3 cursor-pointer group">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors"><FileText size={16} /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">Cláusulas</p>
                  <p className="text-xs text-slate-500">Biblioteca de cláusulas</p>
                </div>
              </div>
              <div className="flex items-start gap-3 cursor-pointer group">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors"><FileText size={16} /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">Relatórios jurídicos</p>
                  <p className="text-xs text-slate-500">Análises e exportações</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conformidade */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Conformidade</h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
                <span className="text-slate-600 font-medium">Documentos vencidos</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-500">3</span>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
                <span className="text-slate-600 font-medium">Assinaturas pendentes</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-500">8</span>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
              </div>
            </div>
          </div>
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
                <h2 className="text-2xl font-bold text-black uppercase italic tracking-tighter">
                  Novo{' '}
                  <span style={{ color: settings.primaryColor }}>
                    Contrato 360°
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
                  <label className="text-[10px] font-bold uppercase text-black/40 tracking-[0.2em] ml-4">
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
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-[0.2em] ml-4">
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
                      {dbProperties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-[0.2em] ml-4">
                      Cliente / Lead
                    </label>
                    <select
                      required
                      className="w-full px-8 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm appearance-none cursor-pointer"
                      value={newContract.clientId}
                      onChange={(e) => {
                        const lead = dbLeads.find(
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
                      {dbLeads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-black/40 tracking-[0.2em] ml-4">
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
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-[0.2em] ml-4">
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
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-[0.2em] ml-4">
                      Valor Total (R$)
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

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-[0.2em] ml-4">
                      Valor de Entrada (R$)
                    </label>
                    <input
                      type="number"
                      className="w-full px-8 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
                      value={newContract.entryValue}
                      onChange={(e) =>
                        setNewContract({
                          ...newContract,
                          entryValue: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-[0.2em] ml-4">
                      Número de Parcelas
                    </label>
                    <input
                      type="number"
                      className="w-full px-8 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
                      value={newContract.installments}
                      onChange={(e) =>
                        setNewContract({
                          ...newContract,
                          installments: Number(e.target.value),
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
                    className="text-xs font-bold uppercase text-emerald-800 tracking-widest cursor-pointer select-none"
                  >
                    Enviar p/ WhatsApp imediatamente ao salvar
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase text-xs tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-6"
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
                  <h3 className="text-xl font-bold text-black uppercase italic tracking-tighter leading-none">
                    Minuta Inteligente
                  </h3>
                  <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">
                    Ref: {selectedContract.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toast.info('Impressão em breve')}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-black/60 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  <Printer size={16} /> Imprimir
                </button>
                <button
                  disabled={isSendingWhatsApp}
                  onClick={() => sendViaWhatsApp(selectedContract)}
                  style={{ backgroundColor: '#25D366' }}
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                >
                  <MessageSquare size={16} />
                  {isSendingWhatsApp ? 'Enviando...' : 'Enviar WhatsApp'}
                </button>
                <button
                  onClick={() => toast.info('Exportação PDF em breve')}
                  style={{ backgroundColor: settings.primaryColor }}
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
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
                    <p className="text-xs font-bold uppercase tracking-[0.3em] mb-1">
                      Assinatura Vendedor
                    </p>
                    <p className="text-[10px] text-black/30">
                      Fazendas Brasil Select
                    </p>
                  </div>
                  <div className="flex-1 border-b border-black/20 pb-2 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] mb-1">
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
