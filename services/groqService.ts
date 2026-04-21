import axios from 'axios';

export const groqService = {
  generateText: async (prompt: string, apiKey: string) => {
    if (!apiKey) {
      console.warn('⚠️ Groq API Key não fornecida.');
      return '{}';
    }

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                'Você é um especialista em marketing imobiliário rural e urbano.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0].message.content || '{}';
    } catch (error: any) {
      console.error(
        'Error generating text with Groq:',
        error.response?.data || error.message
      );
      return '{}';
    }
  },
};
