import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkGroups() {
    console.log('--- GRUPOS ---');
    const { data: chats } = await supabase.from('whatsapp_chats').select('name, jid').ilike('jid', '%@g.us');
    console.table(chats);

    console.log('\n--- CONTATOS COM LID ---');
    const { data: contacts } = await supabase.from('whatsapp_contacts').select('push_name, jid, linked_jid').ilike('jid', '%@lid');
    console.table(contacts);
}

checkGroups();
