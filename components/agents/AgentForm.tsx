import React from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Network,
  Radio,
  Settings2,
  Share2,
  ShieldCheck,
  UserCheck,
  Workflow,
} from 'lucide-react';
import type { AIAgent } from '../../services/aiAgents';

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

interface SectionProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

interface AgentFormProps {
  name: string;
  role: string;
  personality: string;
  instructions: string;
  responseStyle: string;
  status: string;
  agentType: 'orchestrator' | 'specialist';
  subAgents: string[];
  sharePromptWithSubAgents: boolean;
  allAgents: AIAgent[];
  channels: string[];
  capabilities: string[];
  tools: string[];
  autonomyLevel: number;
  handoffRules: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onToggleArray: (
    field: 'capabilities' | 'tools' | 'sub_agents',
    value: string
  ) => void;
  onToggleChannel: (value: string) => void;
  onToggleHandoff: (ruleId: string) => void;
}

const channelList = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'site', label: 'Site' },
  { id: 'crm', label: 'CRM' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'email', label: 'E-mail' },
];

const workspaceOptions = [
  {
    id: 'Atendimento inicial',
    label: 'Atendimento inicial',
    desc: 'Recebe leads, responde dúvidas e inicia a qualificação.',
  },
  {
    id: 'Kanban comercial',
    label: 'Kanban comercial',
    desc: 'Cria cards, atualiza etapas e registra próximos passos.',
  },
  {
    id: 'Documentação',
    label: 'Documentação',
    desc: 'Classifica documentos, PDFs e pendências do processo.',
  },
  {
    id: 'Follow-up',
    label: 'Follow-up',
    desc: 'Mantém o retorno comercial com timing e contexto.',
  },
  {
    id: 'Agenda',
    label: 'Agenda',
    desc: 'Sugere horários e organiza visitas com o time.',
  },
  {
    id: 'Match de imóveis',
    label: 'Match de imóveis',
    desc: 'Cruza o perfil do lead com oportunidades da carteira.',
  },
  {
    id: 'Pós-venda',
    label: 'Pós-venda',
    desc: 'Acompanha satisfação, tarefas e novas oportunidades.',
  },
];

const toolOptions = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'crm', label: 'CRM' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'pdf-reader', label: 'Leitor de PDF' },
  { id: 'audio-stt', label: 'Transcrição de áudio' },
  { id: 'matchmaking', label: 'Match de imóveis' },
  { id: 'follow-up', label: 'Follow-up' },
  { id: 'notificar-corretor', label: 'Notificar corretor' },
  { id: 'criar-tarefa', label: 'Criar tarefa' },
  { id: 'mover-etapa-funil', label: 'Mover etapa do funil' },
  { id: 'simulador-financiamento', label: 'Simulador financeiro' },
  { id: 'neural-sales', label: 'Neural Sales' },
  { id: 'voice-ai', label: 'Voice AI' },
];

const handoffRuleOptions = [
  { id: 'visit_requested', label: 'Lead pediu visita' },
  { id: 'price_negotiation', label: 'Lead quer negociar valor' },
  { id: 'sensitive_document', label: 'Lead enviou documento sensível' },
  { id: 'high_intent', label: 'Lead demonstrou alta intenção' },
  { id: 'angry_lead', label: 'Lead ficou irritado' },
  { id: 'low_confidence', label: 'A IA perdeu confiança na resposta' },
  { id: 'property_unavailable', label: 'Imóvel indisponível' },
];

const autonomyLevels = [
  {
    id: 1,
    label: 'Assistido',
    desc: 'Sugere ações, mas depende de aprovação humana.',
  },
  {
    id: 2,
    label: 'Semiautônomo',
    desc: 'Executa ações simples e pede ajuda em casos críticos.',
  },
  {
    id: 3,
    label: 'Autônomo',
    desc: 'Responde, movimenta Kanban, agenda e aciona humanos quando necessário.',
  },
];

const Field: React.FC<FieldProps> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
      {label}
    </span>
    {children}
  </label>
);

const Section: React.FC<SectionProps> = ({
  icon: Icon,
  title,
  desc,
  open,
  onToggle,
  children,
}) => (
  <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-5 py-4 text-left"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon size={17} />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-950">{title}</div>
          <div className="text-xs font-medium text-slate-500">{desc}</div>
        </div>
      </div>
      <ChevronDown
        size={18}
        className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`}
      />
    </button>
    {open && (
      <div className="border-t border-slate-100 px-5 py-4">{children}</div>
    )}
  </div>
);

export const AgentForm: React.FC<AgentFormProps> = ({
  name,
  role,
  personality,
  instructions,
  responseStyle,
  status,
  agentType,
  subAgents = [],
  sharePromptWithSubAgents = false,
  allAgents = [],
  channels,
  capabilities,
  tools,
  autonomyLevel,
  handoffRules,
  onChange,
  onToggleArray,
  onToggleChannel,
  onToggleHandoff,
}) => {
  const [openSections, setOpenSections] = React.useState<
    Record<string, boolean>
  >({
    identity: true,
    channels: false,
    operation: false,
    swarm: true,
    tools: false,
    rules: false,
  });

  const specialists = allAgents.filter(
    (agent) => agent.agent_type === 'specialist'
  );
  const connectedSpecialists = specialists.filter((agent) =>
    subAgents.includes(agent.id)
  );
  const availableSpecialists = specialists.filter(
    (agent) => !subAgents.includes(agent.id)
  );
  const selectedTools = toolOptions.filter((tool) => tools.includes(tool.id));
  const availableTools = toolOptions.filter((tool) => !tools.includes(tool.id));

  const toggleSection = (id: string) =>
    setOpenSections((current) => ({ ...current, [id]: !current[id] }));

  return (
    <div className="space-y-3">
      <Section
        icon={UserCheck}
        title="Identidade"
        desc="Nome, função, personalidade e prompt operacional"
        open={openSections.identity}
        onToggle={() => toggleSection('identity')}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="Nome do agente">
            <input
              value={name}
              onChange={(event) => onChange('name', event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Ex.: Lia Qualificação"
            />
          </Field>

          <Field label="Função operacional">
            <input
              value={role}
              onChange={(event) => onChange('role', event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Ex.: Atendimento e qualificação"
            />
          </Field>

          <Field label="Estilo de resposta">
            <select
              value={responseStyle}
              onChange={(event) =>
                onChange('response_style', event.target.value)
              }
              className="w-full rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            >
              <option value="consultivo">Consultivo</option>
              <option value="curto">Curto e direto</option>
              <option value="tecnico">Técnico</option>
              <option value="premium">Premium</option>
            </select>
          </Field>

          <Field label="Status">
            <select
              value={status}
              onChange={(event) => onChange('status', event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            >
              <option value="Ativo">Ativo</option>
              <option value="Em teste">Em teste</option>
              <option value="Rascunho">Rascunho</option>
              <option value="Pausado">Pausado</option>
            </select>
          </Field>

          <Field label="Papel na operação">
            <select
              value={agentType || 'specialist'}
              onChange={(event) =>
                onChange(
                  'agent_type',
                  event.target.value as 'orchestrator' | 'specialist'
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            >
              <option value="orchestrator">
                Orquestrador (agente principal)
              </option>
              <option value="specialist">
                Especialista (apoio e bastidores)
              </option>
            </select>
          </Field>

          <Field label="Personalidade">
            <textarea
              value={personality}
              onChange={(event) => onChange('personality', event.target.value)}
              className="min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Tom de voz, postura comercial e limites de atuação."
            />
          </Field>

          <div className="lg:col-span-2">
            <Field label="Prompt operacional">
              <textarea
                value={instructions}
                onChange={(event) =>
                  onChange('instructions', event.target.value)
                }
                className="min-h-72 w-full resize-y rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold leading-relaxed text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                placeholder="Regras, contexto da imobiliária, limites e critérios de decisão deste agente."
              />
            </Field>
          </div>
        </div>
      </Section>

      {agentType === 'orchestrator' && (
        <Section
          icon={Network}
          title="Especialistas conectados"
          desc="Escolha quem o orquestrador pode acionar em tarefas de apoio"
          open={openSections.swarm}
          onToggle={() => toggleSection('swarm')}
        >
          <div className="space-y-4">
            <button
              type="button"
              onClick={() =>
                onChange(
                  'share_prompt_with_subagents',
                  !sharePromptWithSubAgents
                )
              }
              className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition ${
                sharePromptWithSubAgents
                  ? 'border-indigo-600 bg-indigo-50/60 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                    sharePromptWithSubAgents
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Share2 size={18} />
                </div>
                <div>
                  <div
                    className={`text-sm font-bold ${
                      sharePromptWithSubAgents
                        ? 'text-indigo-900'
                        : 'text-slate-900'
                    }`}
                  >
                    Compartilhar prompt com especialistas
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    O especialista recebe o contexto do agente principal antes
                    de assumir a tarefa.
                  </div>
                </div>
              </div>
              {sharePromptWithSubAgents && (
                <CheckCircle2 size={20} className="text-indigo-600" />
              )}
            </button>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Já conectados
                </div>
                <div className="space-y-3">
                  {connectedSpecialists.map((specialist) => (
                    <button
                      key={specialist.id}
                      type="button"
                      onClick={() => onToggleArray('sub_agents', specialist.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-indigo-100 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
                          <UserCheck size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {specialist.name}
                          </div>
                          <div className="text-xs font-medium text-slate-500">
                            {specialist.role}
                          </div>
                        </div>
                      </div>
                      <CheckCircle2 size={20} className="text-indigo-600" />
                    </button>
                  ))}
                  {connectedSpecialists.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm font-medium text-slate-500">
                      Nenhum especialista conectado ainda. Publique o
                      orquestrador apenas depois de ligar pelo menos um apoio.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Disponíveis para conectar
                </div>
                <div className="space-y-3">
                  {availableSpecialists.map((specialist) => (
                    <button
                      key={specialist.id}
                      type="button"
                      onClick={() => onToggleArray('sub_agents', specialist.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <UserCheck size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {specialist.name}
                          </div>
                          <div className="text-xs font-medium text-slate-500">
                            {specialist.role}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-600">
                        Conectar
                      </span>
                    </button>
                  ))}
                  {availableSpecialists.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm font-medium text-slate-500">
                      Nenhum especialista salvo. Crie um especialista para
                      ampliar a cobertura do orquestrador.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section
        icon={Radio}
        title="Canais"
        desc="Onde este agente pode atuar"
        open={openSections.channels}
        onToggle={() => toggleSection('channels')}
      >
        <div className="flex flex-wrap gap-2">
          {channelList.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => onToggleChannel(channel.id)}
              className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-xs font-bold transition ${
                channels.includes(channel.id)
                  ? 'border-slate-300 bg-slate-100 text-slate-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {channel.label}
            </button>
          ))}
        </div>
      </Section>

      <Section
        icon={Workflow}
        title="Operação"
        desc="Áreas de atuação e nível de autonomia"
        open={openSections.operation}
        onToggle={() => toggleSection('operation')}
      >
        <div className="mb-5">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Áreas de atuação
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workspaceOptions.map((workspace) => {
              const active = capabilities.includes(workspace.id);
              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => onToggleArray('capabilities', workspace.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    active
                      ? 'border-slate-300 bg-slate-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-bold text-slate-950">
                      {workspace.label}
                    </span>
                    {active && (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    )}
                  </div>
                  <p className="mb-0 mt-1 text-xs text-slate-500">
                    {workspace.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Nível de autonomia
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {autonomyLevels.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => onChange('autonomy_level', level.id)}
                className={`rounded-lg border p-4 text-left transition ${
                  autonomyLevel === level.id
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-bold text-slate-950">
                  {level.label}{' '}
                  <span className="text-slate-400">Nível {level.id}</span>
                </div>
                <p className="mb-0 mt-1 text-xs text-slate-500">{level.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Voz e áudio
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={Boolean(handoffRules?.audio_enabled)}
                onChange={() =>
                  onChange('handoff_rules', {
                    ...handoffRules,
                    audio_enabled: !handoffRules?.audio_enabled,
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">
                  Habilitar respostas em áudio
                </span>
                <span className="text-xs text-slate-500">
                  O agente poderá enviar mensagens de voz.
                </span>
              </div>
            </label>

            {handoffRules?.audio_enabled && (
              <div className="flex flex-col justify-center">
                <span className="mb-1 text-xs font-bold text-slate-600">
                  Voz do agente
                </span>
                <select
                  value={handoffRules?.audio_voice || 'pt-BR-FranciscaNeural'}
                  onChange={(event) =>
                    onChange('handoff_rules', {
                      ...handoffRules,
                      audio_voice: event.target.value,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-[#F8FAFD] px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="pt-BR-FranciscaNeural">
                    Francisca (feminina)
                  </option>
                  <option value="pt-BR-AntonioNeural">
                    Antonio (masculino)
                  </option>
                  <option value="pt-BR-BrendaNeural">Brenda (feminina)</option>
                  <option value="pt-BR-DonatoNeural">Donato (masculino)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section
        icon={Settings2}
        title="Ferramentas"
        desc="Recursos e integrações disponíveis para este agente"
        open={openSections.tools}
        onToggle={() => toggleSection('tools')}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Conectadas
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTools.map((tool) => (
                <span
                  key={tool.id}
                  className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
                >
                  {tool.label}
                </span>
              ))}
              {selectedTools.length === 0 && (
                <span className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-500">
                  Nenhuma ferramenta conectada
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Disponíveis para ativar
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {availableTools.map((tool) => (
                <span
                  key={tool.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500"
                >
                  {tool.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {toolOptions.map((tool) => {
              const active = tools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onToggleArray('tools', tool.id)}
                  className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${
                    active
                      ? 'border-slate-300 bg-slate-100 text-slate-950'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tool.label}
                  {active && <CheckCircle2 size={14} />}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section
        icon={ShieldCheck}
        title="Escalonamento para humanos"
        desc="Quando o agente deve acionar um corretor ou supervisor"
        open={openSections.rules}
        onToggle={() => toggleSection('rules')}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {handoffRuleOptions.map((rule) => (
            <label
              key={rule.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                handoffRules[rule.id]
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-500"
                checked={Boolean(handoffRules[rule.id])}
                onChange={() => onToggleHandoff(rule.id)}
              />
              <span className="text-sm font-bold">{rule.label}</span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
};
