import React, { useState } from 'react';

import { FileSignature, Send, UserCheck, X } from 'lucide-react';
import { CONTRACT_TEMPLATES } from '@/constants/ContractTemplates';
import { useAuth } from '@/context/AuthContext';

export function RentalsContractEditor() {
  const { user } = useAuth();
  
  const [selectedTemplate, setSelectedTemplate] = useState('locacao-urbana');
  const [content, setContent] = useState(CONTRACT_TEMPLATES.find(t => t.id === 'locacao-urbana')?.content || '');
  const [saving, setSaving] = useState(false);

  // Variáveis para preencher
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

  const getReplacedContent = () => {
    let replaced = content;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      replaced = replaced.replace(regex, value);
    });
    return replaced;
  };

  const handleSendToZapSign = async () => {
    setSaving(true);
    try {
      // Aqui faria a request real para o nosso signatureInvitationService via API
      // fetch('/api/locacao/signatures/invite/...
      
      // Simulação para UX
      await new Promise(r => setTimeout(r, 1500));
      alert('Contrato enviado com sucesso para o ZapSign! Os signatários receberão um WhatsApp/E-mail em breve.');
    } catch (error) {
      alert('Erro ao enviar para o ZapSign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerador de Contrato (ZapSign)</h1>
          <p className="text-gray-500">Edite as variáveis e envie direto para assinatura eletrônica</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </button>
          <button 
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            onClick={handleSendToZapSign}
            disabled={saving}
          >
            {saving ? 'Enviando...' : (
              <>
                <Send className="w-4 h-4" />
                Enviar para Assinar
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Painel de Variáveis */}
        <div className="rounded-lg p-4 bg-white dark:bg-gray-800 border border-gray-100 overflow-y-auto">
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

          <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
            <h4 className="font-medium text-sm mb-3">Signatários</h4>
            <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-md text-sm">
              <UserCheck className="w-4 h-4" />
              <span>Locador: Maria Souza (via Asaas Split)</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-md text-sm mt-2">
              <UserCheck className="w-4 h-4" />
              <span>Locatário: {variables.client_name}</span>
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
