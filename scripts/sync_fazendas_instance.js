
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncInstance() {
    console.log('Syncing "fazendasbrasil" instance...');

    // 1. Get Organization ID (Superadmin's org)
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single();
    
    if (!org) {
        console.error('No organization found!');
        return;
    }
    console.log('Target Organization:', org.id);

    // 2. Check if instance already exists in DB
    const { data: existing } = await supabase
        .from('instances')
        .select('*')
        .eq('name', 'fazendasbrasil')
        .single();

    if (existing) {
        console.log('Instance "fazendasbrasil" already in DB:', existing);
        // Maybe update organization_id if it's wrong?
        if (existing.organization_id !== org.id) {
             console.log('Updating organization_id...');
             await supabase.from('instances').update({ organization_id: org.id }).eq('id', existing.id);
        }
    } else {
        console.log('Instance NOT in DB. Inserting...');
        const { data: newInstance, error } = await supabase
            .from('instances')
            .insert({
                name: 'fazendasbrasil',
                organization_id: org.id,
                server_url: EVOLUTION_API_URL,
                status: 'open' // Assume open if it exists on server, or 'connecting'
            })
            .select()
            .single();
        
        if (error) console.error('Insert Error:', error);
        else console.log('Instance inserted:', newInstance);
    }
}

syncInstance();
