import React from 'react';
import {
  PhoneCall,
  Bot,
  ClipboardCheck,
  Home,
  CalendarClock,
  UserPlus,
  Repeat2,
  ArrowRight,
} from 'lucide-react';

const steps = [
  { title: 'Lead entrou', subtitle: 'Novo contato captado', icon: PhoneCall },
  { title: 'IA atende', subtitle: 'Resposta instantânea', icon: Bot },
  {
    title: 'IA qualifica',
    subtitle: 'Entende necessidade',
    icon: ClipboardCheck,
  },
  { title: 'Sugere imóvel', subtitle: 'Opções personalizadas', icon: Home },
  {
    title: 'Agenda visita',
    subtitle: 'Sincroniza agenda',
    icon: CalendarClock,
  },
  { title: 'Corretor assume', subtitle: 'Recebe contexto', icon: UserPlus },
  { title: 'Follow-up', subtitle: 'Acompanha interesse', icon: Repeat2 },
];

export const AgentFlowSteps: React.FC = () => (
  <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-7">
      {steps.map((step, i) => (
        <div
          key={step.title}
          className="relative rounded-lg border border-slate-100 bg-slate-50 px-3 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600">
              <step.icon size={17} />
            </div>
            <div className="min-w-0">
              <p className="mb-0 truncate text-xs font-bold text-slate-950">
                {step.title}
              </p>
              <p className="mb-0 truncate text-[10px] font-bold text-slate-500">
                {step.subtitle}
              </p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight
              className="absolute -right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white text-slate-300 lg:block"
              size={18}
            />
          )}
        </div>
      ))}
    </div>
  </section>
);
