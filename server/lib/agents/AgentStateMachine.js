import { logger } from '../../../utils/logger.js';

export class AgentStateMachine {
  constructor(flowSteps = []) {
    this.steps = flowSteps;
    this.currentStepId = null;
    this.context = {};
    this.history = [];
  }

  getCurrentStep() {
    if (!this.currentStepId && this.steps.length > 0) {
      return this.steps[0];
    }
    return this.steps.find((s) => s.id === this.currentStepId);
  }

  getNextStep() {
    if (!this.currentStepId) return this.steps[0] || null;
    const idx = this.steps.findIndex((s) => s.id === this.currentStepId);
    return idx >= 0 && idx < this.steps.length - 1 ? this.steps[idx + 1] : null;
  }

  async evaluate(message, conversationHistory = []) {
    const text = (message || '').toLowerCase();
    const historyText = conversationHistory.map((m) => m.content).join(' ').toLowerCase();
    const fullContext = `${historyText} ${text}`;

    let matchedStep = null;

    for (const step of this.steps) {
      if (!step.enabled) continue;
      if (this.matchesTrigger(step, fullContext, text)) {
        matchedStep = step;
        break;
      }
    }

    if (!matchedStep && this.steps.length > 0) {
      matchedStep = this.getNextStep() || this.steps[this.steps.length - 1];
    }

    if (matchedStep) {
      this.currentStepId = matchedStep.id;
      this.history.push({
        stepId: matchedStep.id,
        trigger: matchedStep.trigger,
        timestamp: new Date().toISOString(),
      });
    }

    return matchedStep;
  }

  matchesTrigger(step, fullContext, currentMessage) {
    const trigger = (step.trigger || '').toLowerCase();

    if (trigger.includes('nova mensagem') || trigger.includes('primeiro contato')) {
      return !this.history.length;
    }

    if (trigger.includes('lead respondeu') || trigger.includes('interesse')) {
      return /\b(quero|busco|procuro|interesse|gostei|tenho interesse|queria)\b/.test(currentMessage);
    }

    if (trigger.includes('perfil completo')) {
      return this.context.completeness >= 60;
    }

    if (trigger.includes('intenção') || trigger.includes('intencao')) {
      return /\b(visita|visitar|quero ver|marcar|horario|proposta|simular|financiamento|entrada)\b/.test(currentMessage);
    }

    if (trigger.includes('documento')) {
      return /\b(rg|cpf|documento|matricula|contrato|pdf)\b/.test(currentMessage);
    }

    return fullContext.includes(trigger.replace(/[^a-zà-ú0-9\s]/g, '').trim());
  }

  updateContext(data) {
    Object.assign(this.context, data);
  }

  getContext() {
    return { ...this.context };
  }

  getCompletedSteps() {
    return this.history.filter((h, i, arr) => arr.findIndex((x) => x.stepId === h.stepId) === i);
  }

  getRemainingSteps() {
    const completed = this.getCompletedSteps().map((h) => h.stepId);
    return this.steps.filter((s) => !completed.includes(s.id) && s.enabled !== false);
  }

  buildPromptContext() {
    const current = this.getCurrentStep();
    const completed = this.getCompletedSteps();
    const remaining = this.getRemainingSteps();

    return `
FLUXO DE ATENDIMENTO (State Machine):
- Etapa atual: ${current?.title || 'Início'}
- Prompt da etapa: ${current?.prompt || 'Siga o fluxo normal de atendimento'}
- Ação esperada: ${current?.action || 'Avançar na conversa'}
- Etapas concluídas: ${completed.map((h) => h.stepId).join(' > ') || 'Nenhuma'}
- Próximas etapas: ${remaining.map((s) => s.title).join(' > ') || 'Finalizar'}

Contexto coletado: ${JSON.stringify(this.context, null, 2)}
`.trim();
  }

  static fromAgent(agent) {
    const machine = new AgentStateMachine(agent.flow_steps || []);
    try {
      const saved = typeof agent.state_machine === 'object' ? agent.state_machine : JSON.parse(agent.state_machine || '{}');
      machine.currentStepId = saved.current || null;
      machine.history = saved.history || [];
      machine.context = saved.context || {};
    } catch {
    }
    return machine;
  }

  toJSON() {
    return {
      current: this.currentStepId,
      history: this.history.slice(-50),
      context: this.context,
    };
  }
}
