import { supabase } from '../../supabase.js';
import axios from 'axios';

export async function getChats(req, res) {
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

export async function getMessages(req, res) {
    const { remoteJid } = req.params; 
    try {
        const { data: contact } = await supabase.from('contacts').select('id').eq('remote_jid', remoteJid).single();
        if (!contact) return res.json({ success: true, messages: [] });
        const { data, error } = await supabase.from('messages').select('*').eq('contact_id', contact.id).order('timestamp', { ascending: true });
        if (error) throw error;
        const formatted = data.map(m => ({ id: m.id, remote_jid: remoteJid, content: m.content || (m.media_type !== 'text' ? `[${m.media_type}]` : ''), from_me: m.from_me, timestamp: m.timestamp, status: m.status }));
        return res.json({ success: true, messages: formatted });
    } catch (error) { return res.status(500).json({ error: error.message }); }
}

export async function sendMessage(req, res) {
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
