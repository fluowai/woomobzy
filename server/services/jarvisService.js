import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

let groqClient = null;
function getGroqClient() {
  const apiKey = String(process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY não configurada para o Assistente IA.');
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export const processAgenticTask = async (prompt, context) => {
  try {
    const groq = getGroqClient();
    const systemPrompt = `Você é o Assistente Virtual de IA do Imobtech (Imob CRM), o orquestrador agêntico do sistema. 
Sua função é receber solicitações do usuário (corretor/admin), analisar o contexto da tela atual (se fornecido), e fornecer uma resposta útil, gerar um resumo, ou preparar uma ação. 
Seja conciso, prestativo e aja como um assistente inteligente de alto nível para o mercado imobiliário.

Contexto da Tela Atual:
${JSON.stringify(context || {}, null, 2)}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      model: 'llama3-70b-8192',
      temperature: 0.5,
      max_tokens: 1024,
    });

    return (
      chatCompletion.choices[0]?.message?.content ||
      'Não consegui processar a requisição.'
    );
  } catch (error) {
    console.error('[JarvisService] Error processing task:', error);
    throw new Error('Falha ao processar tarefa com a IA externa.');
  }
};
