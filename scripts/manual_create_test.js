
import axios from 'axios';

const baseUrl = 'https://api.consultio.com.br';
const apiKey = '8b90148caf66df22c8212b810d64270b';
const instanceName = `test_manual_${Math.floor(Math.random() * 1000)}`;

console.log(`🚀 Tentando criar instância: ${instanceName}`);
console.log(`📡 URL: ${baseUrl}`);

async function test() {
    try {
        const payload = {
            instanceName: instanceName,
            token: Math.random().toString(36).substring(7),
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        };
        
        console.log("📦 Payload:", JSON.stringify(payload, null, 2));

        const response = await axios.post(`${baseUrl}/instance/create`, payload, {
            headers: {
                'apikey': apiKey
            }
        });

        console.log("✅ SUCESSO! Instância criada.");
        console.log("Dados:", response.data);

        // Limpar
        console.log("🧹 Deletando instância de teste...");
        await axios.delete(`${baseUrl}/instance/delete/${instanceName}`, {
            headers: { 'apikey': apiKey }
        });
        console.log("✅ Deletada.");

    } catch (error) {
        console.error("❌ ERRO:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

test();
