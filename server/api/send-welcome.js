import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
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
            return res.json({ status: 'skipeed', reason: 'disabled' });
        }

        const config = settingsData.integrations.evolutionApi;
        
        // 2. Formatar Telefone
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        // 3. Montar Mensagem
        const message = `Olá, ${name}! 👋\n\nRecebemos seu interesse no imóvel *${propertyTitle}*.\n\nNosso especialista já foi notificado e entrará em contato em breve para tirar suas dúvidas.\n\nEnquanto isso, salve nosso contato!`;

        // 4. Enviar via Evolution API
        const apiUrl = `${config.baseUrl}/message/sendText/${config.instanceName}`;
        
        await axios.post(apiUrl, {
            number: formattedPhone,
            text: message
        }, {
            headers: {
                'apikey': config.token,
                'Content-Type': 'application/json'
            }
        });

        res.json({ status: 'sent' });

    } catch (e) {
        console.error('❌ Erro ao enviar WhatsApp:', e.message);
        res.status(200).json({ status: 'error', error: e.message });
    }
}
