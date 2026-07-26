import React, { useState } from 'react';

import { Send, UserCheck, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { CONTRACT_TEMPLATES } from '@/constants/ContractTemplates';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';

interface SignerInfo {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  type: 'locador' | 'locatario';
}

interface Props {
  leaseId?: string;
  onClose?: () => void;
}

export function RentalsContractEditor({ leaseId, onClose }: Props) {
  const { user } = useAuth();
  
  const [selectedTemplate, setSelectedTemplate] = useState('locacao-urbana');
  const [content, setContent] = useState(CONTRACT_TEMPLATES.find(t => t.id === 'locacao-urbana')?.content || '');
  const [saving, setSaving] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [variables, setVariables] = useState({
    client_name: 'João da Silva',
    property_name: 'Apartamento Centro',
    rental_purpose: 'Residencial',
    contract_value: 'R$ 2.500,00',
    expenses_responsible: 'Locatário',
    duration: '30',
    start_date: '01/08/2026',
    warranty_type: 'Seguro Fiança',
    current_date: new Date().toLocaleDateString('pt-BR')
  });

  const [locador, setLocador] = useState<SignerInfo>({
    name: 'Maria Souza',
    email: '',
    phone: '',
    cpf: '',
    type: 'locador',
  });

  const [locatario, setLocatario] = useState<SignerInfo>({
    name: variables.client_name,
    email: '',
    phone: '',
    cpf: '',
    type: 'locatario',
  });

  const getReplacedContent = () => {
    let replaced = content;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      replaced = replaced.replace(regex, value);
    });
    return replaced;
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = CONTRACT_TEMPLATES.find(t => t.id === templateId);
    if (template) setContent(template.content);
  };

  const handleSendToZapSign = async () => {
    if (!leaseId) {
      logger.error(' leaseId é obrigatório para enviar assinatura');
      setSendStatus('error');
      return;
    }

    setSaving(true);
    setSendStatus('idle');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      };

      const signers = [
        { ...locador, lease_id: leaseId, signer_type: locador.type },
        { ...locatario, lease_id: leaseId, signer_type: locatario.type },
      ].filter(s => s.name && s.email);

      if (signers.length === 0) {
        logger.error('Adicione pelo menos um signatário com nome e email');
        setSendStatus('error');
        return;
      }

      const createdSignatures = await Promise.all(
        signers.map(async (signer) => {
          const res = await fetch('/api/locacao/signatures', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              lease_id: signer.lease_id,
              signer_type: signer.signer_type,
              signer_name: signer.name,
              signer_email: signer.email,
              signer_phone: signer.phone || undefined,
              signer_cpf: signer.cpf || undefined,
            }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Erro ao criar signatário');
          return data.data;
        })
      );

      if (createdSignatures.length > 0) {
        const inviteRes = await fetch(`/api/locacao/signatures/invite/bulk/${leaseId}`, {
          method: 'POST',
          headers,
        });
        const inviteData = await inviteRes.json();
        if (!inviteData.success) throw new Error(inviteData.error || 'Erro ao enviar convites');
      }

      setSendStatus('success');
    } catch (error) {
      logger.error('Erro ao enviar para ZapSign:', error);
      setSendStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const updateLocador = (field: keyof SignerInfo, value: string) =>
    setLocador(prev => ({ ...prev, [field]: value }));

  const updateLocatario = (field: keyof SignerInfo, value: string) =>
    setLocatario(prev => ({ ...prev, [field]: value }));

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerador de Contrato (ZapSign)</h1>
          <p className="text-gray-500">Edite as variáveis e envie direto para assinatura eletrônica</p>
        </div>
        <div className="flex gap-3">
          {onClose && (
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center">
              <X className="w-4 h-4 mr-2" />
              Fechar
            </button>
          )}
          <button 
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 disabled:opacity-50"
            onClick={handleSendToZapSign}
            disabled={saving || !leaseId}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="w-4 h-4" /> Enviar para Assinar</>
            )}
          </button>
        </div>
      </div>

      {sendStatus === 'success' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          Contrato enviado com sucesso para o ZapSign! Os signatários receberão convite por email/WhatsApp.
        </div>
      )}
      {sendStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          Erro ao enviar. Verifique os dados dos signatários e tente novamente.
        </div>
      )}

      {!leaseId && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          Selecione um contrato de locação para habilitar o envio para assinatura.
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Painel de Variáveis */}
        <div className="rounded-lg p-4 bg-white dark:bg-gray-800 border border-gray-100 overflow-y-auto space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Modelo de Contrato</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {CONTRACT_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Variáveis do Contrato</h3>
            <div className="space-y-4">
              {Object.entries(variables).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{key}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setVariables({...variables, [key]: e.target.value})}
                    className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <h4 className="font-medium text-sm mb-3">Signatários</h4>
            
            <div className="space-y-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-sm mb-2">
                  <UserCheck className="w-4 h-4" />
                  <span className="font-medium">Locador (Proprietário)</span>
                </div>
                <input
                  type="text"
                  placeholder="Nome"
                  value={locador.name}
                  onChange={(e) => updateLocador('name', e.target.value)}
                  className="w-full p-2 text-sm border border-indigo-200 dark:border-indigo-800 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={locador.email}
                  onChange={(e) => updateLocador('email', e.target.value)}
                  className="w-full p-2 text-sm border border-indigo-200 dark:border-indigo-800 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
                />
                <input
                  type="tel"
                  placeholder="Telefone (opcional)"
                  value={locador.phone}
                  onChange={(e) => updateLocador('phone', e.target.value)}
                  className="w-full p-2 text-sm border border-indigo-200 dark:border-indigo-800 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-sm mb-2">
                  <UserCheck className="w-4 h-4" />
                  <span className="font-medium">Locatário (Inquilino)</span>
                </div>
                <input
                  type="text"
                  placeholder="Nome"
                  value={locatario.name}
                  onChange={(e) => updateLocatario('name', e.target.value)}
                  className="w-full p-2 text-sm border border-indigo-200 dark:border-indigo-800 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={locatario.email}
                  onChange={(e) => updateLocatario('email', e.target.value)}
                  className="w-full p-2 text-sm border border-indigo-200 dark:border-indigo-800 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
                />
                <input
                  type="tel"
                  placeholder="Telefone (opcional)"
                  value={locatario.phone}
                  onChange={(e) => updateLocatario('phone', e.target.value)}
                  className="w-full p-2 text-sm border border-indigo-200 dark:border-indigo-800 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pré-visualização do Contrato */}
        <div className="rounded-lg lg:col-span-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 overflow-y-auto font-serif">
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-12 shadow-sm rounded-sm border border-gray-200 dark:border-gray-700 min-h-full">
            <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-serif leading-relaxed">
              {getReplacedContent()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
