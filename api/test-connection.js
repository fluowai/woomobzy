
import axios from 'axios';

// Endpoint para testar conexão com Evolution API (Vercel Function)
export default async function handler(req, res) {
    // CORS manual para Serverless
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { baseUrl, token, instanceName } = req.body;

    if (!baseUrl || !token || !instanceName) {
        return res.status(400).json({ error: 'Configuração incompleta' });
    }

    try {
        console.log(`🔌 Testando conexão com: ${baseUrl} / ${instanceName}`);
        
        // Tenta obter o estado da conexão
        const apiUrl = `${baseUrl}/instance/connectionState/${instanceName}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'apikey': token
            }
        });

        const state = response.data?.instance?.state || response.data?.state;

        if (state === 'open' || state === 'connecting') {
             res.json({ status: 'success', state, message: 'Conexão estabelecida com sucesso!' });
        } else {
             res.json({ status: 'warning', state, message: `Instância encontrada, mas estado é: ${state}` });
        }

    } catch (e) {
        console.error('❌ Falha no teste de conexão:', e.message);
        const errorMsg = e.response?.data?.message || e.message;
        res.status(200).json({ status: 'error', error: errorMsg });
    }
}
