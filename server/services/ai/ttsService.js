import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const tts = new MsEdgeTTS();

export async function generateAudioFromText(text, options = {}) {
  try {
    // Vozes populares: 'pt-BR-AntonioNeural' (Masc), 'pt-BR-FranciscaNeural' (Fem)
    const voice = options.voice || 'pt-BR-FranciscaNeural';

    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const tmpDir = os.tmpdir();
    const filename = `tts_${crypto.randomUUID()}.mp3`;
    const filepath = path.join(tmpDir, filename);

    await tts.toFile(filepath, text);
    return filepath;
  } catch (error) {
    console.error('[ttsService] Erro ao gerar áudio:', error);
    throw error;
  }
}
