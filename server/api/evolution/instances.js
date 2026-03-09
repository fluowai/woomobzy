import { supabase } from '../../supabase.js';
import axios from 'axios';

const WEBHOOK_BASE = 'https://webhook.consultio.com.br/evolution';
const WEBHOOK_TOKEN = 'FX8aVOSIDtzZsxaKg697b9539a5b58';

export async function getInstances(req, res) {
    const { organizationId } = req.query;
    if (!organizationId) return res.json({ success: true, instances: [] });
    const { data: instances, error } = await supabase.from('instances').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, instances });
}

export async function createInstance(req, res) {
    try {
        const { instanceName, organizationId } = req.body;
        
        const baseUrl = process.env.EVOLUTION_API_URL || 'https://api.consultio.com.br';
        const globalApiKey = process.env.EVOLUTION_API_KEY || '8b90148caf66df22c8212b810d64270b';
        
        if (!baseUrl) return res.status(400).json({ error: 'Evolution API baseUrl não configurada no servidor' });
        
        try {
            await axios.post(`${baseUrl}/instance/create`, { 
                instanceName, 
                token: Math.random().toString(36).substring(7), 
                qrcode: true, 
                integration: "WHATSAPP-BAILEYS" 
            }, { headers: { 'apikey': globalApiKey }});
        } catch (e) {
            console.log('Instance creation note:', e.response?.data || e.message);
        }

        const webhookUrl = `${WEBHOOK_BASE}/${instanceName}`;
        await axios.post(`${baseUrl}/webhook/set/${instanceName}`, { 
            webhookUrl, 
            webhookByEvents: true, 
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE", "CONNECTION_UPDATE"], 
            enabled: true, 
            webhookHeaders: { "Authorization": `Bearer ${WEBHOOK_TOKEN}` }
        }, { headers: { 'apikey': globalApiKey }});

        const { data: newInstance } = await supabase.from('instances')
            .upsert({ organization_id: organizationId, name: instanceName, status: 'created', server_url: baseUrl }, { onConflict: 'name' })
            .select().single();
        
        return res.json({ success: true, instance: newInstance });
    } catch (error) { 
        console.error('Error creating instance:', error.response?.data || error.message);
        return res.status(500).json({ error: error.message }); 
    }
}

export async function deleteInstance(req, res) {
    const { id } = req.params;
    try {
        const { data: instance } = await supabase.from('instances').select('name, organization_id').eq('id', id).single();
        if (!instance) return res.status(404).json({ error: 'Instance not found' });
        
        const { data: settings } = await supabase.from('site_settings').select('integrations').eq('organization_id', instance.organization_id).single();
        const config = settings?.integrations?.evolutionApi;
        if (config) await axios.delete(`${config.baseUrl}/instance/delete/${instance.name}`, { headers: { 'apikey': config.token }}).catch(() => {});
        await supabase.from('instances').delete().eq('id', id);
        return res.json({ success: true });
    } catch (error) { return res.status(500).json({ error: error.message }); }
}

export async function connectInstance(req, res) {
    const { instanceName } = req.params;
    const { organizationId } = req.query;
    try {
        const { data: settings } = await supabase.from('site_settings').select('integrations').eq('organization_id', organizationId).single();
        const config = settings?.integrations?.evolutionApi;
        
        if (!config) return res.status(400).json({ error: 'Evolution API integration not configured' });

        const response = await axios.get(`${config.baseUrl}/instance/connect/${instanceName}`, { headers: { 'apikey': config.token }});
        return res.json({ success: true, data: response.data });
    } catch (error) { return res.status(500).json({ error: error.message }); }
}

export async function logoutInstance(req, res) {
    const { instanceName } = req.params; 
    const { organizationId } = req.body; 
    try {
        const { data: settings } = await supabase.from('site_settings').select('integrations').eq('organization_id', organizationId).single();
        const config = settings?.integrations?.evolutionApi;
        if (config) await axios.delete(`${config.baseUrl}/instance/logout/${instanceName}`, { headers: { 'apikey': config.token }});
        await supabase.from('instances').update({ status: 'close' }).eq('name', instanceName);
        return res.json({ success: true });
    } catch (error) { return res.status(500).json({ error: error.message }); }
}
