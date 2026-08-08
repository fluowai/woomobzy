import React from 'react';
import {
  UserCheck,
  Radio,
  Workflow,
  Settings2,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
      {label}
    </span>
    {children}
  </label>
);

interface SectionProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

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

interface AgentFormProps {
  name: string;
  role: string;
  personality: string;
  instructions: string;
  responseStyle: string;
  status: string;
  channels: string[];
  capabilities: string[];
  tools: string[];
  autonomyLevel: number;
  handoffRules: Record<string, boolean>;
  onChange: (field: string, value: any) => void;
  onToggleArray: (field: 'capabilities' | 'tools', value: string) => void;
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
    desc: 'Recebe leads, responde dúvidas e inicia qualificação.',
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
    desc: 'Mantém retorno comercial com timing e contexto.',
  },
  {
    id: 'Agenda',
    label: 'Agenda',
    desc: 'Sugere horários e organiza visitas com o time.',
  },
  {
    id: 'Match de imóveis',
    label: 'Match de imóveis',
    desc: 'Cruza perfil do lead com oportunidades da carteira.',
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
  { id: 'pdf-reader', label: 'PDF Reader' },
  { id: 'audio-stt', label: 'Audio STT' },
  { id: 'matchmaking', label: 'Matchmaking' },
  { id: 'follow-up', label: 'Follow-up' },
  { id: 'notificar-corretor', label: 'Notificar corretor' },
  { id: 'criar-tarefa', label: 'Criar tarefa' },
  { id: 'mover-etapa-funil', label: 'Mover etapa do funil' },
  { id: 'simulador-financiamento', label: 'Simulador Financeiro' },
  { id: 'neural-sales', label: 'Neural Sales (Scoring)' },
  { id: 'voice-ai', label: 'Voice AI' },
];

const handoffRuleOptions = [
  { id: 'visit_requested', label: 'Lead pediu visita' },
  { id: 'price_negotiation', label: 'Lead quer negociar valor' },
  { id: 'sensitive_document', label: 'Lead enviou documento sensível' },
  { id: 'high_intent', label: 'Lead demonstrou alta intenção' },
  { id: 'angry_lead', label: 'Lead ficou irritado' },
  { id: 'low_confidence', label: 'IA não tem certeza' },
  { id: 'property_unavailable', label: 'Imóvel não está disponível' },
];

const autonomyLevels = [
  {
    id: 1,
    label: 'Assistido',
    desc: 'Sugere ações, mas precisa de aprovação humana.',
  },
  {
    id: 2,
    label: 'Semiautônomo',
    desc: 'Executa ações simples e pede aprovação em casos críticos.',
  },
  {
    id: 3,
    label: 'Autônomo',
    desc: 'Responde, movimenta Kanban, agenda e aciona humanos quando necessário.',
  },
];

export const AgentForm: React.FC<AgentFormProps> = ({
  name,
  role,
  personality,
  instructions,
  responseStyle,
  status,
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
    tools: false,
    rules: false,
  });

  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-3">
      <Section
        icon={UserCheck}
        title="Identidade"
        desc="Nome, função, personalidade e instruções operacionais"
        open={openSections.identity}
        onToggle={() => toggleSection('identity')}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="Nome do agente">
            <input
              value={name}
              onChange={(e) => onChange('name', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Ex.: Lia Qualificação"
            />
          </Field>
          <Field label="Função operacional">
            <input
              value={role}
              onChange={(e) => onChange('role', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Ex.: Atendimento e Qualificação"
            />
          </Field>
          <Field label="Estilo de atendimento">
            <select
              value={responseStyle}
              onChange={(e) => onChange('responseStyle', e.target.value)}
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
              onChange={(e) => onChange('status', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            >
              <option value="Ativo">Ativo</option>
              <option value="Em teste">Em teste</option>
              <option value="Rascunho">Rascunho</option>
              <option value="Pausado">Pausado</option>
            </select>
          </Field>
          <Field label="Personalidade">
            <textarea
              value={personality}
              onChange={(e) => onChange('personality', e.target.value)}
              className="min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Tom de voz, empatia e postura comercial do agente."
            />
          </Field>
          <Field label="Instruções operacionais">
            <textarea
              value={instructions}
              onChange={(e) => onChange('instructions', e.target.value)}
              className="min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-[#F8FAFD] p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Regras, limites e contexto da imobiliária."
            />
          </Field>
        </div>
      </Section>

      <Section
        icon={Radio}
        title="Canais"
        desc="Onde o agente pode atender"
        open={openSections.channels}
        onToggle={() => toggleSection('channels')}
      >
        <div className="flex flex-wrap gap-2">
          {channelList.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => onToggleChannel(ch.id)}
              className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-xs font-bold transition ${
                channels.includes(ch.id)
                  ? 'border-slate-300 bg-slate-100 text-slate-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </Section>

      <Section
        icon={Workflow}
        title="Operação"
        desc="Processos e nível de autonomia"
        open={openSections.operation}
        onToggle={() => toggleSection('operation')}
      >
        <div className="mb-5">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Áreas de atuação
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workspaceOptions.map((ws) => {
              const active = capabilities.includes(ws.id);
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => onToggleArray('capabilities', ws.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    active
                      ? 'border-slate-300 bg-slate-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-bold text-slate-950">
                      {ws.label}
                    </span>
                    {active && (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    )}
                  </div>
                  <p className="mb-0 mt-1 text-xs text-slate-500">{ws.desc}</p>
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
                onClick={() => onChange('autonomyLevel', level.id)}
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
      </Section>

      <Section
        icon={Settings2}
        title="Ferramentas"
        desc="Recursos que o agente pode consultar ou executar"
        open={openSections.tools}
        onToggle={() => toggleSection('tools')}
      >
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
      </Section>

      <Section
        icon={ShieldCheck}
        title="Regras de transferência"
        desc="Quando o agente deve acionar um corretor"
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
                checked={!!handoffRules[rule.id]}
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
