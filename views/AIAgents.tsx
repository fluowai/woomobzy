import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Brain,
  CalendarClock,
  FileSearch,
  Headphones,
  MessageSquareText,
  Plus,
  Save,
  Tags,
  Trash2,
  UserCheck,
  WandSparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { aiAgentService, type AIAgent, type AIAgentPayload } from '../services/aiAgents';

const capabilityOptions = [
  'qualificar lead',
  'criar kanban',
  'etiquetar atendimento',
  'agendar follow-up',
  'ler audio',
  'analisar pdf',
  'identificar documentos',
  'sugerir imoveis',
  'acionar corretor humano',
];

const toolOptions = [
  'whatsapp',
  'kanban',
  'agenda',
  'documentos',
  'audio-stt',
  'pdf-reader',
  'matchmaking',
  'follow-up',
];

const presets: AIAgentPayload[] = [
  {
    name: 'Lia Qualificacao',
    role: 'SDR Imobiliario',
    personality: 'Consultiva, objetiva e acolhedora.',
    response_style: 'consultivo',
    capabilities: ['qualificar lead', 'criar kanban', 'etiquetar atendimento', 'sugerir imoveis'],
    tools: ['whatsapp', 'kanban', 'matchmaking'],
    instructions: 'Descubra objetivo, cidade, faixa de valor, prazo, forma de pagamento e tipo de imovel. Atualize o lead sem parecer robotico.',
  },
  {
    name: 'Nina Documentos',
    role: 'Analista documental',
    personality: 'Precisa, calma e cuidadosa.',
    response_style: 'tecnico',
    capabilities: ['analisar pdf', 'identificar documentos', 'etiquetar atendimento', 'acionar corretor humano'],
    tools: ['documentos', 'pdf-reader', 'kanban'],
    instructions: 'Classifique RG, CPF, matricula, comprovantes, contratos e documentos rurais/urbanos. Marque pendencias e mova para Documentacao.',
  },
  {
    name: 'Theo Retorno',
    role: 'Follow-up comercial',
    personality: 'Persistente sem ser invasivo.',
    response_style: 'curto',
    capabilities: ['agendar follow-up', 'etiquetar atendimento', 'acionar corretor humano'],
    tools: ['agenda', 'follow-up', 'whatsapp'],
    instructions: 'Detecte promessas de retorno, visitas e horarios. Crie follow-ups e sugira mensagens curtas para retomar contato.',
  },
];

const emptyAgent: AIAgentPayload = {
  name: '',
  role: 'Atendimento',
  channel: 'whatsapp',
  is_active: true,
  personality: '',
  instructions: '',
  capabilities: ['qualificar lead', 'criar kanban', 'etiquetar atendimento'],
  tools: ['whatsapp', 'kanban'],
  response_style: 'consultivo',
};

const AIAgents: React.FC = () => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string>('new');
  const [draft, setDraft] = useState<AIAgentPayload>(emptyAgent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedId),
    [agents, selectedId]
  );

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      setDraft({
        name: selectedAgent.name,
        role: selectedAgent.role,
        channel: selectedAgent.channel,
        is_active: selectedAgent.is_active,
        personality: selectedAgent.personality || '',
        instructions: selectedAgent.instructions || '',
        capabilities: selectedAgent.capabilities || [],
        tools: selectedAgent.tools || [],
        response_style: selectedAgent.response_style || 'consultivo',
      });
    } else {
      setDraft(emptyAgent);
    }
  }, [selectedAgent]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setAgents(await aiAgentService.list());
    } catch (error: any) {
      toast.error('Erro ao carregar agentes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleListValue = (field: 'capabilities' | 'tools', value: string) => {
    const current = draft[field] || [];
    setDraft({
      ...draft,
      [field]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  };

  const saveAgent = async () => {
    if (!draft.name || !draft.role) {
      toast.error('Informe nome e funcao do agente.');
      return;
    }

    try {
      setSaving(true);
      if (selectedAgent) {
        await aiAgentService.update(selectedAgent.id, draft);
        toast.success('Agente atualizado.');
      } else {
        const created = await aiAgentService.create(draft);
        setSelectedId(created.id);
        toast.success('Agente criado.');
      }
      await loadAgents();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeAgent = async () => {
    if (!selectedAgent || !confirm(`Excluir o agente "${selectedAgent.name}"?`)) return;
    await aiAgentService.remove(selectedAgent.id);
    setSelectedId('new');
    await loadAgents();
    toast.success('Agente removido.');
  };

  const usePreset = (preset: AIAgentPayload) => {
    setSelectedId('new');
    setDraft({ ...emptyAgent, ...preset });
  };

  if (loading) return <div className="p-10 text-center">Carregando agentes...</div>;

  return (
    <div className="min-h-full bg-slate-50 -m-6 p-6">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.24em] mb-2">
              <WandSparkles size={16} /> Central de Agentes
            </div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">Agentes de atendimento</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Configure quem atende, qualifica, etiqueta, agenda retornos e organiza o kanban.
            </p>
          </div>
          <button
            onClick={() => setSelectedId('new')}
            className="h-11 px-5 bg-indigo-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700"
          >
            <Plus size={18} /> Novo agente
          </button>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6">
          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              {[...agents].map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedId(agent.id)}
                  className={`w-full text-left p-4 rounded-lg border mb-2 transition-all ${
                    selectedId === agent.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                        <Bot size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-slate-900 truncate">{agent.name}</p>
                        <p className="text-xs text-slate-500 truncate">{agent.role}</p>
                      </div>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${agent.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                </button>
              ))}
              {agents.length === 0 && (
                <div className="p-5 text-sm text-slate-500 text-center">Nenhum agente criado ainda.</div>
              )}
            </div>

            <div className="bg-slate-900 text-white rounded-lg p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-200 mb-3">Modelos prontos</p>
              <div className="space-y-2">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => usePreset(preset)}
                    className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <p className="text-sm font-bold">{preset.name}</p>
                    <p className="text-xs text-white/50">{preset.role}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Brain size={20} />
                </div>
                <div>
                  <h2 className="font-black text-slate-950">{selectedAgent ? 'Editar agente' : 'Novo agente'}</h2>
                  <p className="text-xs text-slate-500">WhatsApp, kanban, documentos, audio e follow-up.</p>
                </div>
              </div>
              {selectedAgent && (
                <button onClick={removeAgent} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Field label="Nome">
                <input value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="agent-input" placeholder="Ex: Lia Qualificacao" />
              </Field>
              <Field label="Funcao">
                <input value={draft.role || ''} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className="agent-input" placeholder="SDR Imobiliario" />
              </Field>
              <Field label="Estilo">
                <select value={draft.response_style || 'consultivo'} onChange={(e) => setDraft({ ...draft, response_style: e.target.value })} className="agent-input">
                  <option value="consultivo">Consultivo</option>
                  <option value="curto">Curto e direto</option>
                  <option value="tecnico">Tecnico</option>
                  <option value="premium">Premium</option>
                </select>
              </Field>
              <Field label="Status">
                <button
                  onClick={() => setDraft({ ...draft, is_active: !draft.is_active })}
                  className={`h-11 px-4 rounded-lg border font-bold text-sm flex items-center gap-2 ${
                    draft.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <UserCheck size={16} /> {draft.is_active ? 'Ativo' : 'Pausado'}
                </button>
              </Field>
              <Field label="Personalidade">
                <textarea value={draft.personality || ''} onChange={(e) => setDraft({ ...draft, personality: e.target.value })} className="agent-input min-h-24" />
              </Field>
              <Field label="Instrucoes operacionais">
                <textarea value={draft.instructions || ''} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} className="agent-input min-h-24" />
              </Field>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 border-t border-slate-100">
              <ChoicePanel icon={MessageSquareText} title="Capacidades">
                {capabilityOptions.map((item) => (
                  <Chip key={item} active={(draft.capabilities || []).includes(item)} onClick={() => toggleListValue('capabilities', item)} label={item} />
                ))}
              </ChoicePanel>
              <ChoicePanel icon={Tags} title="Ferramentas">
                {toolOptions.map((item) => (
                  <Chip key={item} active={(draft.tools || []).includes(item)} onClick={() => toggleListValue('tools', item)} label={item} />
                ))}
              </ChoicePanel>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Metric icon={Headphones} label="Audio" active={(draft.tools || []).includes('audio-stt')} />
              <Metric icon={FileSearch} label="PDF e docs" active={(draft.tools || []).includes('pdf-reader')} />
              <Metric icon={CalendarClock} label="Follow-ups" active={(draft.tools || []).includes('follow-up')} />
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end">
              <button
                onClick={saveAgent}
                disabled={saving}
                className="h-11 px-6 bg-slate-950 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={18} /> {saving ? 'Salvando...' : 'Salvar agente'}
              </button>
            </div>
          </main>
        </section>
      </div>

      <style>{`
        .agent-input { width: 100%; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px; padding: 11px 13px; font-size: 14px; outline: none; }
        .agent-input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(99,102,241,.12); background: white; }
      `}</style>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">{label}</span>
    {children}
  </label>
);

const ChoicePanel: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="border border-slate-200 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-3 text-slate-900 font-black text-sm">
      <Icon size={17} className="text-indigo-600" /> {title}
    </div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

const Chip: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
      active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
    }`}
  >
    {label}
  </button>
);

const Metric: React.FC<{ icon: React.ElementType; label: string; active: boolean }> = ({ icon: Icon, label, active }) => (
  <div className={`rounded-lg border p-4 flex items-center gap-3 ${active ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-white/70 border-slate-200 text-slate-400'}`}>
    <Icon size={18} />
    <span className="text-sm font-black">{label}</span>
  </div>
);

export default AIAgents;
