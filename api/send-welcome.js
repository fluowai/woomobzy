
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase fora do handler para reutilização de conexão (best practice em serverless)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // CORS
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

    const { name, phone, propertyTitle } = req.body;
    
    if (!name || !phone) return res.status(400).json({ error: 'Dados insuficientes' });

    try {
        // 1. Buscar Configurações do Banco de Dados
        const { data: settingsData, error } = await supabase
            .from('site_settings')
            .select('integrations')
            .single();

        if (error || !settingsData?.integrations?.evolutionApi?.enabled) {
            console.log('⚠️ Envio de WhatsApp ignorado: Integração desativada ou não configurada.');
            return res.json({ status: 'skipped', reason: 'disabled' });
        }

        const config = settingsData.integrations.evolutionApi;
        
        // 2. Formatar Telefone
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        // 3. Montar Mensagem
        const message = `Olá, ${name}! 👋\n\nRecebemos seu interesse no imóvel *${propertyTitle}*.\n\nNosso especialista já foi notificado e entrará em contato em breve para tirar suas dúvidas.\n\nEnquanto isso, salve nosso contato!`;

        // 4. Enviar via Evolution API
        const apiUrl = `${config.baseUrl}/message/sendText/${config.instanceName}`;
        
        console.log(`📤 Enviando WhatsApp para ${formattedPhone}`);

        await axios.post(apiUrl, {
            number: formattedPhone,
            text: message
        }, {
            headers: {
                'apikey': config.token,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ WhatsApp enviado com sucesso para ${name}`);
        res.json({ status: 'sent' });

    } catch (e) {
        console.error('❌ Erro ao enviar WhatsApp:', e.message);
        const errorMsg = e.response?.data?.message || e.message;
        res.status(200).json({ status: 'error', error: errorMsg });
    }
}
