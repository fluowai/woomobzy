import { supabase } from '../../supabase.js';
import axios from 'axios';

const WEBHOOK_TOKEN = 'FX8aVOSIDtzZsxaKg697b9539a5b58';

export default async function evolutionWebhookHandler(req, res) {
    if (req.method === 'GET') {
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
    
    // Respond OK immediately to avoid timeouts
    res.status(200).send('OK');
    
    try { await processWebhook(req.body); } catch (err) { console.error('Webhook Error:', err); }
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
