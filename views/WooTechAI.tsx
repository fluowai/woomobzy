import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Loader2, User, Sparkles, PlusCircle, ChevronDown, Settings, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ApiKeys {
  groq: string;
  gemini: string;
  chatgpt: string;
  omniroute: string;
  pollinations: string;
  openrouter: string;
}

const MODELS = [
  { value: 'groq', label: 'Groq', desc: 'Rápido e versátil (padrão)', provider: 'groq' },
  { value: 'gemini', label: 'Gemini', desc: 'Criativo e analítico', provider: 'gemini' },
  { value: 'chatgpt', label: 'ChatGPT', desc: 'Premium e robusto', provider: 'chatgpt' },
  { value: 'wootech-1', label: 'WooTech AI 1', desc: 'Gateway interno OmniRoute', provider: 'omniroute' },
  { value: 'wootech-2', label: 'WooTech AI 2', desc: 'API pública Pollinations', provider: 'pollinations' },
  { value: 'wootech-3', label: 'WooTech AI 3', desc: 'Roteador OpenRouter', provider: 'openrouter' },
] as const;

const STORAGE_KEY_MODEL = 'wootech_ai_model';
const STORAGE_KEY_KEYS = 'wootech_ai_keys';

function getStoredModel(): string {
  try { return localStorage.getItem(STORAGE_KEY_MODEL) || 'groq'; }
  catch { return 'groq'; }
}

function storeModel(value: string) {
  try { localStorage.setItem(STORAGE_KEY_MODEL, value); }
  catch { logger.warn('[WooTechAI] Falha ao persistir preferência de modelo'); }
}

function getStoredKeys(): ApiKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_KEYS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        groq: parsed.groq || '',
        gemini: parsed.gemini || '',
        chatgpt: parsed.chatgpt || '',
        omniroute: parsed.omniroute || '',
        pollinations: parsed.pollinations || '',
        openrouter: parsed.openrouter || '',
      };
    }
    } catch {
      logger.warn('[WooTechAI] Falha ao carregar chaves salvas');
    }
  return { groq: '', gemini: '', chatgpt: '', omniroute: '', pollinations: '', openrouter: '' };
}

function storeKeys(keys: ApiKeys) {
  try { localStorage.setItem(STORAGE_KEY_KEYS, JSON.stringify(keys)); }
  catch { logger.warn('[WooTechAI] Falha ao persistir chaves'); }
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return '';
  return key.substring(0, 4) + '••••' + key.substring(key.length - 4);
}

function hasAnyKey(keys: ApiKeys): boolean {
  return keys.groq.length > 0 || keys.gemini.length > 0 || keys.chatgpt.length > 0
    || keys.omniroute.length > 0 || keys.pollinations.length > 0 || keys.openrouter.length > 0;
}

const WooTechAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Olá! Eu sou o WooTech AI. Estou aqui para te ajudar com análises, textos, criativos ou dúvidas sobre o mercado imobiliário e rural. Como posso te ajudar hoje?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(getStoredModel);
  const [modelOpen, setModelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeys>(getStoredKeys);
  const [editKeys, setEditKeys] = useState<ApiKeys>({ ...getStoredKeys() });
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentModel = MODELS.find((m) => m.value === selectedModel) || MODELS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const apiUrl =
        (import.meta.env.VITE_API_URL === 'same-origin'
          ? ''
          : import.meta.env.VITE_API_URL) + '/api/wootech-ai/chat';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          model: selectedModel,
          stream: false,
          apiKeys: hasAnyKey(apiKeys) ? apiKeys : undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 503) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                '⚠️ **Nenhum provedor de IA disponível.**\n\nPara usar o WooTech AI, você precisa cadastrar sua chave de API de algum provedor (Groq, Gemini ou ChatGPT).\n\n👉 Clique no botão **"Chaves"** no canto superior direito e cole sua chave.',
            },
          ]);
          return;
        }
        throw new Error('Falha na comunicação com a IA');
      }

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.choices[0].message.content },
        ]);
      } else {
        toast.error('Resposta vazia da IA.');
      }
    } catch (error) {
      logger.error('WooTech AI Error:', error);
      toast.error('Ocorreu um erro ao conectar com o WooTech AI. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([{
      role: 'assistant',
      content:
        'Olá! Eu sou o WooTech AI. Estou aqui para te ajudar com análises, textos, criativos ou dúvidas sobre o mercado imobiliário e rural. Como posso te ajudar hoje?',
    }]);
  };

  const handleModelSelect = useCallback((value: string) => {
    setSelectedModel(value);
    storeModel(value);
    setModelOpen(false);
  }, []);

  const openSettings = () => {
    setEditKeys({ ...apiKeys });
    setSettingsOpen(true);
  };

  const saveKeys = () => {
    setApiKeys({ ...editKeys });
    storeKeys(editKeys);
    setSettingsOpen(false);
    toast.success('Chaves salvas com sucesso!');
  };

  const toggleKeyVisibility = (provider: string) => {
    setVisibleKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Sparkles size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">WooTech AI</h1>
            <div className="relative" ref={modelRef}>
              <button
                onClick={() => setModelOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-slate-300 font-medium hover:text-white transition-colors"
              >
                {currentModel.label}
                <ChevronDown size={12} />
              </button>
              {modelOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                  {MODELS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => handleModelSelect(m.value)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        m.value === selectedModel
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-medium">{m.label}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{m.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openSettings}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors rounded-lg backdrop-blur-sm border border-white/10"
            title="Configurar chaves de API"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Chaves</span>
          </button>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors rounded-lg backdrop-blur-sm border border-white/10"
          >
            <PlusCircle size={16} />
            <span className="hidden sm:inline">Novo Chat</span>
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <h2 className="font-bold text-lg">Configuração das Chaves de API</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-slate-500">
                Cole suas chaves de API para ativar cada provedor. As chaves ficam salvas apenas no seu navegador.
              </p>

              {MODELS.map((m) => (
                <div key={m.value} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{m.label}</h3>
                      <p className="text-xs text-slate-400">{m.desc}</p>
                    </div>
                    {editKeys[m.provider] && (
                      <span className="text-[11px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        Configurada
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={visibleKeys[m.provider] ? 'text' : 'password'}
                      value={editKeys[m.provider]}
                      onChange={(e) =>
                        setEditKeys((prev) => ({ ...prev, [m.provider]: e.target.value }))
                      }
                      placeholder="Cole sua chave de API aqui..."
                      className="w-full pr-20 pl-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(m.provider)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title={visibleKeys[m.provider] ? 'Ocultar' : 'Mostrar'}
                      >
                        {visibleKeys[m.provider] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  {apiKeys[m.provider] && !editKeys[m.provider] && (
                    <p className="text-xs text-slate-400 mt-1.5 font-mono">
                      {maskKey(apiKeys[m.provider])}
                    </p>
                  )}
                </div>
              ))}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong className="font-semibold">🔒 Segurança:</strong> As chaves são armazenadas apenas no seu navegador (localStorage) e enviadas diretamente para a API de cada provedor. Nenhuma chave é salva no servidor.
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={saveKeys}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg shadow-sm"
              >
                Salvar Chaves
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-sm border ${
                  msg.role === 'user'
                    ? 'bg-blue-100 border-blue-200 text-blue-600'
                    : 'bg-indigo-100 border-indigo-200 text-indigo-600'
                }`}
              >
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                } max-w-[85%] sm:max-w-[75%]`}
              >
                <div
                  className={`px-4 sm:px-5 py-3 rounded-2xl shadow-sm text-sm sm:text-base whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-sm">
                <Bot size={18} />
              </div>
              <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-slate-400" />
                <span className="text-sm text-slate-500 animate-pulse">
                  WooTech AI está processando...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ou peça algo ao WooTech AI..."
            className="w-full pl-5 pr-14 py-4 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 shadow-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className="ml-0.5" />
            )}
          </button>
        </form>
        <p className="text-center text-[11px] text-slate-400 mt-3">
          O conteúdo gerado deve ser revisado antes da publicação.
        </p>
      </div>
    </div>
  );
};

export default WooTechAI;
