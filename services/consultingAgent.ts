import { geminiService } from './geminiService';
import { leadService } from './leads';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const consultingAgent = {
  async processMessage(messages: ChatMessage[], leadData: any) {
    const systemPrompt = `
      Você é a "Clara", assistente virtual inteligente da WooTech Imob.
      Seu objetivo é QUALIFICAR o lead e AGENDAR uma reunião de 30 minutos com um de nossos especialistas (Closers).

      DIRETRIZES:
      1. Seja extremamente profissional, amigável e use um tom "Premium".
      2. Você deve coletar as seguintes informações se ainda não as tiver:
         - Nome da imobiliária ou operação.
         - Tamanho da equipe (corretores).
         - Principal dor/desafio atual.
      3. Se o lead tiver mais de 5 corretores ou faturamento expressivo, ele é "Alta Prioridade".
      4. Quando o lead estiver qualificado, ofereça horários (simulados) para uma reunião de 30 min.
      5. Nunca saia do personagem. Seu foco é o sistema WooTech Imob (IA, CRM, White-label).

      CONTEÚDO ATUAL DO LEAD:
      ${JSON.stringify(leadData)}
    `;

    const prompt = messages.map((message) => `${message.role === 'user' ? 'Lead' : 'Clara'}: ${message.content}`).join('\n');

    try {
      const response = await geminiService.generateText(`${systemPrompt}\n\n${prompt}\nClara:`);

      if (response === '{}' || !response) {
        return 'Olá! No momento estou passando por uma manutenção rápida na minha inteligência. Mas não se preocupe! Você pode me chamar no WhatsApp agora mesmo para agendarmos sua consultoria. Posso te passar o link?';
      }

      return response;
    } catch (error) {
      return 'Desculpe, tive um pequeno problema técnico. Posso te ligar em instantes ou podemos conversar pelo WhatsApp para agendarmos sua consultoria?';
    }
  },

  async finalizeQualification(leadId: string, qualificationNotes: string, scheduledTime?: string) {
    try {
      await leadService.update(leadId, {
        notes: `[QUALIFICADO AI] | ${qualificationNotes} ${scheduledTime ? `| REUNIÃO: ${scheduledTime}` : ''}`,
        status: 'Proposta',
      } as any);
    } catch (error) {
      console.error('Error finalizing qualification:', error);
    }
  },
};
