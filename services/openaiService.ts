import axios from 'axios';

export const openaiService = {
  generateText: async (prompt: string, apiKey: string) => {
    if (!apiKey) {
      console.warn('⚠️ OpenAI API Key não fornecida.');
      return '{}';
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em marketing imobiliário.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
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
        'Error generating text with OpenAI:',
        error.response?.data || error.message
      );
      return '{}';
    }
  },
};
