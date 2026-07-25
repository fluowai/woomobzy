import * as googleTTS from 'google-tts-api';

export class TTSService {
  /**
   * Converte texto em um Audio em formato Base64 ou URL usando o Google TTS (gratuito)
   * @param {string} text O texto a ser falado
   * @param {string} lang Idioma (padrao: 'pt-BR')
   * @returns {Promise<string>} Base64 data URI do audio MP3
   */
  static async generateAudioBase64(text, lang = 'pt-BR') {
    try {
      // Para textos longos, a biblioteca quebra em pedaços e pega tudo
      const audioBase64 = await googleTTS.getAudioBase64(text, {
        lang: lang,
        slow: false,
        host: 'https://translate.google.com',
        timeout: 10000,
      });

      // Retorna no formato Data URI pronto para o WhatsApp/Waha
      return `data:audio/mp3;base64,${audioBase64}`;
    } catch (error) {
      console.error('[TTSService] Erro ao gerar audio:', error);
      throw error;
    }
  }
}
