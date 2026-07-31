import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const baseUrl =
  process.env.WHATSAPP_API_URL || 'https://app.imobfluow.com.br/api';
const apiKey =
  process.env.WHATSAPP_SERVICE_TOKEN || process.env.WHATSAPP_API_KEY;
const instanceName = `test_manual_${Math.floor(Math.random() * 1000)}`;

if (!apiKey) {
  console.error(
    '❌ Defina WHATSAPP_SERVICE_TOKEN (ou WHATSAPP_API_KEY) no .env para executar manual_create_test.js.'
  );
  process.exit(1);
}

console.log(`🚀 Tentando criar instância: ${instanceName}`);
console.log(`📡 URL: ${baseUrl}`);

async function test() {
  try {
    const payload = {
      instanceName: instanceName,
      token: Math.random().toString(36).substring(7),
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    };

    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(`${baseUrl}/instance/create`, payload, {
      headers: {
        apikey: apiKey,
      },
    });

    console.log('✅ SUCESSO! Instância criada.');
    console.log('Dados:', response.data);

    // Limpar
    console.log('🧹 Deletando instância de teste...');
    await axios.delete(`${baseUrl}/instance/delete/${instanceName}`, {
      headers: { apikey: apiKey },
    });
    console.log('✅ Deletada.');
  } catch (error) {
    console.error('❌ ERRO:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

test();
