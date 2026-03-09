import { supabase } from '../../supabase.js';
import axios from 'axios';

const WEBHOOK_BASE = 'https://webhook.consultio.com.br/evolution';
const WEBHOOK_TOKEN = 'FX8aVOSIDtzZsxaKg697b9539a5b58';

export default async function handler(req, res) {
    const { path, instanceName, remoteJid, id } = req.query;
    const method = req.method;

    // --- WEBHOOK & STATUS HANDLER ---
    if (path === 'webhook') {
        if (method === 'GET') {
            // Check Evolution API status
            try {
                const baseUrl = process.env.EVOLUTION_API_URL || 'https://api.consultio.com.br';
                const apiKey = process.env.EVOLUTION_API_KEY || '8b90148caf66df22c8212b810d64270b';
                
                const response = await axios.get(`${baseUrl}/instance/fetchInstances`, {
                    headers: { 'apikey': apiKey }
                });
                
                return res.status(200).json({ 
                    status: 'online', 
                    evolution: 'connected',
                    instancesCount: response.data.length 
                });
            } catch (err) {
                return res.status(200).json({ 
                    status: 'online', 
                    evolution: 'disconnected',
                    error: err.message 
                });
            }
        }
        const authHeader = req.headers['authorization'];
        if (!authHeader || authHeader !== `Bearer ${WEBHOOK_TOKEN}`) return res.status(403).json({ error: 'Forbidden' });
        res.status(200).send('OK');
        try { await processWebhook(req.body); } catch (err) { console.error('Webhook Error:', err); }
        return;
    }

    // --- CHAT OPERATIONS ---
    if (path === 'chats' && method === 'GET') {
        try {
            const { data: contacts, error } = await supabase.from('contacts').select('*, messages (content, timestamp, status)').order('updated_at', { ascending: false }).limit(50);
            if (error) throw error;
            const chats = contacts.map(contact => {
                const sortedMsgs = (contact.messages || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                const lastMsg = sortedMsgs[0];
                return { jid: contact.remote_jid, name: contact.push_name || contact.remote_jid, profilePicUrl: contact.profile_pic_url, lastMessage: lastMsg ? lastMsg.content : '', timestamp: lastMsg ? lastMsg.timestamp : contact.created_at, unreadCount: 0 };
            });
            chats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return res.json({ success: true, chats });
        } catch (error) { return res.status(500).json({ error: error.message }); }
    }

    if (path === 'messages' && remoteJid && method === 'GET') {
        try {
            const { data: contact } = await supabase.from('contacts').select('id').eq('remote_jid', remoteJid).single();
            if (!contact) return res.json({ success: true, messages: [] });
            const { data, error } = await supabase.from('messages').select('*').eq('contact_id', contact.id).order('timestamp', { ascending: true });
            if (error) throw error;
            const formatted = data.map(m => ({ id: m.id, remote_jid: remoteJid, content: m.content || (m.media_type !== 'text' ? `[${m.media_type}]` : ''), from_me: m.from_me, timestamp: m.timestamp, status: m.status }));
            return res.json({ success: true, messages: formatted });
        } catch (error) { return res.status(500).json({ error: error.message }); }
    }

    if (path === 'messages' && method === 'POST') {
        try {
            const { remoteJid, text } = req.body;
            const { data: settings } = await supabase.from('site_settings').select('integrations, organization_id').single();
            if (!settings?.integrations?.evolutionApi?.enabled) return res.status(400).json({ error: 'Evolution API não configurada' });
            const config = settings.integrations.evolutionApi;
            const organizationId = settings.organization_id;
            const apiUrl = `${config.baseUrl}/message/sendText/${config.instanceName}`;
            const number = remoteJid.replace('@s.whatsapp.net', '');
            await axios.post(apiUrl, { number, text }, { headers: { 'apikey': config.token, 'Content-Type': 'application/json' }});
            
            let { data: contact } = await supabase.from('contacts').select('id, instance_id').eq('organization_id', organizationId).eq('remote_jid', remoteJid).single();
            if (!contact) {
                const { data: instance } = await supabase.from('instances').select('id').eq('organization_id', organizationId).limit(1).single();
                if (!instance) throw new Error("Instância não encontrada");
                const { data: newContact } = await supabase.from('contacts').insert({ organization_id: organizationId, instance_id: instance.id, remote_jid: remoteJid, push_name: number }).select().single();
                contact = newContact;
            }
            const { data, error } = await supabase.from('messages').insert([{ organization_id: organizationId, instance_id: contact.instance_id, contact_id: contact.id, content: text, from_me: true, timestamp: new Date().toISOString(), status: 'sent', media_type: 'text' }]).select().single();
            return res.json({ success: true, message: data });
        } catch (error) { return res.status(500).json({ error: error.message }); }
    }

    // --- INSTANCE OPERATIONS ---
    if (path === 'instances') {
        if (method === 'GET') {
            const { organizationId } = req.query;
            if (!organizationId) return res.json({ success: true, instances: [] });
            const { data: instances, error } = await supabase.from('instances').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false });
            if (error) throw error;
            return res.json({ success: true, instances });
        }
        if (method === 'POST') {
            try {
                const { instanceName, organizationId } = req.body;
                
                // Prioritize Env Vars for Global API Key
                const baseUrl = process.env.EVOLUTION_API_URL || 'https://api.consultio.com.br';
                const globalApiKey = process.env.EVOLUTION_API_KEY || '8b90148caf66df22c8212b810d64270b';
                
                if (!baseUrl) return res.status(400).json({ error: 'Evolution API baseUrl não configurada no servidor' });
                
                try {
                    // Create instance
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
    }

    if (path === 'instances' && instanceName) {
        if (method === 'GET' && req.url.includes('/connect')) {
            try {
                const { organizationId } = req.query;
                const { data: settings } = await supabase.from('site_settings').select('integrations').eq('organization_id', organizationId).single();
                const config = settings?.integrations?.evolutionApi;
                const response = await axios.get(`${config.baseUrl}/instance/connect/${instanceName}`, { headers: { 'apikey': config.token }});
                return res.json({ success: true, data: response.data });
            } catch (error) { return res.status(500).json({ error: error.message }); }
        }
        if (method === 'POST' && req.url.includes('/logout')) {
            try {
                const { organizationId } = req.body;
                const { data: settings } = await supabase.from('site_settings').select('integrations').eq('organization_id', organizationId).single();
                const config = settings?.integrations?.evolutionApi;
                if (config) await axios.delete(`${config.baseUrl}/instance/logout/${instanceName}`, { headers: { 'apikey': config.token }});
                await supabase.from('instances').update({ status: 'close' }).eq('name', instanceName);
                return res.json({ success: true });
            } catch (error) { return res.status(500).json({ error: error.message }); }
        }
    }

    if (path === 'instances' && id && method === 'DELETE') {
        try {
            const { data: instance } = await supabase.from('instances').select('name, organization_id').eq('id', id).single();
            const { data: settings } = await supabase.from('site_settings').select('integrations').eq('organization_id', instance.organization_id).single();
            const config = settings?.integrations?.evolutionApi;
            if (config) await axios.delete(`${config.baseUrl}/instance/delete/${instance.name}`, { headers: { 'apikey': config.token }}).catch(() => {});
            await supabase.from('instances').delete().eq('id', id);
            return res.json({ success: true });
        } catch (error) { return res.status(500).json({ error: error.message }); }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

async function processWebhook(data) {
    const eventType = data.type;
    const instanceName = data.instance;
    const eventData = data.data;

    if (eventType !== 'messages.upsert' && eventType !== 'connection.update') return;
    if (!eventData || !eventData.key) return;

    const { data: instanceDB } = await supabase.from('instances').select('id, organization_id').eq('name', instanceName).single();
    if (!instanceDB) return;

    const organizationId = instanceDB.organization_id;
    const { key, message, messageType, pushName } = eventData;
    const remoteJid = key.remoteJid;
    const fromMe = key.fromMe;
    const timestamp = eventData.messageTimestamp || Date.now() / 1000;

    let content = '';
    let mediaType = 'text';
    if (messageType === 'conversation') content = message.conversation;
    else if (messageType === 'extendedTextMessage') content = message.extendedTextMessage.text;
    else if (messageType === 'imageMessage') { mediaType = 'image'; content = message.imageMessage.caption || '[Imagem]'; }
    // ... other types can be added if needed, kept it simple for consolidation

    let { data: contact } = await supabase.from('contacts').select('id').eq('organization_id', organizationId).eq('remote_jid', remoteJid).single();
    let contactId;
    if (!contact) {
        const { data: newContact } = await supabase.from('contacts').insert({ organization_id: organizationId, instance_id: instanceDB.id, remote_jid: remoteJid, push_name: pushName || remoteJid.split('@')[0] }).select('id').single();
        contactId = newContact.id;
    } else {
        contactId = contact.id;
    }

    if (eventType === 'messages.upsert') {
        await supabase.from('messages').insert({ organization_id: organizationId, instance_id: instanceDB.id, contact_id: contactId, key_id: key.id, message_id: key.id, content, media_type: mediaType, from_me: fromMe, status: fromMe ? 'sent' : 'delivered', timestamp: new Date(timestamp * 1000).toISOString(), raw_payload: data });
    } else if (eventType === 'connection.update') {
        const state = eventData.state;
        let dbStatus = state === 'open' ? 'open' : (state === 'close' ? 'close' : 'connecting');
        await supabase.from('instances').update({ status: dbStatus }).eq('id', instanceDB.id);
    }
}
