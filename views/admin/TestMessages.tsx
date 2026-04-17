import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
  Send,
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface Instance {
  id: string;
  name: string;
  phone_number: string;
  status: string;
}

const TestMessages: React.FC = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; messageId?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstances();
  }, []);

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('status', 'connected');

      if (error) throw error;
      setInstances(data || []);
      if (data?.length) {
        setSelectedInstance(data[0]);
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const sendTestMessage = async () => {
    if (!phone || !message || !selectedInstance) return;

    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''),
          message,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({ success: true, messageId: data.messageId });
        setPhone('');
        setMessage('');
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setResult({ success: false, error: 'Erro ao enviar mensagem' });
    } finally {
      setSending(false);
    }
  };

  const quickMessages = [
    'Olá! Como posso ajudá-lo hoje?',
    'Obrigado pelo seu contato! Em breve retornaremos.',
    'Recebemos sua mensagem e estamos analyzing.',
    'Posso ajudar com mais alguma informação?',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhuma instância conectada</h3>
          <p className="text-gray-500 mb-4">
            Conecte uma instância WhatsApp primeiro para enviar mensagens de teste
          </p>
          <a
            href="/whatsapp-instances"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Gerenciar Instâncias
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Send className="w-8 h-8 text-green-600" />
        <h1 className="text-2xl font-bold text-gray-800">Enviar Mensagem de Teste</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instância
          </label>
          <select
            value={selectedInstance?.id || ''}
            onChange={(e) => setSelectedInstance(instances.find(i => i.id === e.target.value) || null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          >
            {instances.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} - {inst.phone_number || 'Sem número'}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-lg"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Digite o número com DDD (apenas números brasileiros)
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensagem
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensagens Rápidas
          </label>
          <div className="flex flex-wrap gap-2">
            {quickMessages.map((msg, index) => (
              <button
                key={index}
                onClick={() => setMessage(msg)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
              >
                {msg.slice(0, 30)}...
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={sendTestMessage}
          disabled={!phone || !message || sending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Enviar Mensagem
            </>
          )}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? 'Mensagem enviada com sucesso!' : 'Erro ao enviar mensagem'}
                </p>
                {result.success && result.messageId && (
                  <p className="text-sm text-green-600 mt-1">
                    ID: {result.messageId}
                  </p>
                )}
                {result.error && (
                  <p className="text-sm text-red-600 mt-1">{result.error}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Dicas</p>
            <ul className="text-sm text-blue-700 mt-1 list-disc list-inside space-y-1">
              <li>Certifique-se de que o número está correto com DDD</li>
              <li>O número deve ter WhatsApp instalado</li>
              <li>Mensagens são enviadas apenas para números brasileiros (55)</li>
              <li>Use a função de teste para verificar se sua instância está funcionando</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestMessages;
