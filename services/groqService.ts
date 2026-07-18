import { logger } from '@/utils/logger';
import { callApi } from '../src/lib/api';

export const groqService = {
  generateText: async (prompt: string, _apiKey?: string) => {
    try {
      const data = await callApi('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          temperature: 0.2,
          jsonMode: true,
        }),
      });

      return data.text || '{}';
    } catch (error: any) {
      logger.error('Error generating text via AI proxy:', error.message);
      return '{}';
    }
  },
};
