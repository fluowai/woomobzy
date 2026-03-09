import { createClient } from '@supabase/supabase-js';
import { sendContactFormEmail } from '../../services/emailService.js';
import axios from 'axios';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { 
        name, email, phone, message,
        // Tracking data
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        referrer_url, landing_page_url, client_id, fbp, fbc, session_data
    } = req.body;
    
    // Validation
    if (!name || !email || !phone || !message) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    
    try {
        console.log(`📧 Novo contato recebido de: ${name} (${email})`);
        
        // 1. Get site settings for contact email and WhatsApp template
        const { data: settingsData, error: settingsError } = await supabase
            .from('site_settings')
            .select('contact_email, contact_whatsapp_template, integrations')
            .single();
        
        const contactEmail = settingsData?.contact_email || 'contato@fazendasbrasil.com';
        const whatsappTemplate = settingsData?.contact_whatsapp_template || 
            'Olá {name}! Recebemos seu contato através do formulário "Fale Conosco". Nossa equipe já está analisando sua mensagem e entrará em contato em breve. Obrigado!';
        
        // 2. Create lead in CRM with tracking data
        const { data: leadData, error: leadError } = await supabase
            .from('crm_leads')
            .insert([{
                name,
                email,
                phone,
                source: utm_source || 'Fale Conosco',
                status: 'Novo',
                notes: message,
                // Tracking fields
                utm_source,
                utm_medium,
                utm_campaign,
                utm_term,
                utm_content,
                referrer_url,
                landing_page_url,
                client_id,
                fbp,
                fbc,
                session_data: session_data ? JSON.stringify(session_data) : null
            }])
            .select()
            .single();
        
        if (leadError) {
            console.error('❌ Erro ao criar lead:', leadError);
            throw new Error(`Erro ao salvar contato no CRM: ${leadError.message}`);
        }
        
        // 3. Send email notification
        try {
            await sendContactFormEmail({ name, email, phone, message }, contactEmail);
        } catch (emailError) {
            console.error('❌ Erro ao enviar email:', emailError.message);
        }
        
        // 4. Send WhatsApp auto-reply
        if (settingsData?.integrations?.evolutionApi?.enabled) {
            try {
                const config = settingsData.integrations.evolutionApi;
                const cleanPhone = phone.replace(/\D/g, '');
                const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                
                // Replace template variables
                const whatsappMessage = whatsappTemplate
                    .replace(/{name}/g, name)
                    .replace(/{email}/g, email)
                    .replace(/{phone}/g, phone)
                    .replace(/{message}/g, message);
                
                const apiUrl = `${config.baseUrl}/message/sendText/${config.instanceName}`;
                
                await axios.post(apiUrl, {
                    number: formattedPhone,
                    text: whatsappMessage
                }, {
                    headers: {
                        'apikey': config.token,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (whatsappError) {
                console.error('❌ Erro ao enviar WhatsApp:', whatsappError.message);
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Contato recebido com sucesso!',
            leadId: leadData.id
        });
        
    } catch (error) {
        console.error('❌ Erro ao processar contato:', error);
        res.status(500).json({ 
            error: 'Erro ao processar seu contato. Por favor, tente novamente.' 
        });
    }
}
