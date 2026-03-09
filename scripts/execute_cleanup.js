
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service Role Key is required for admin actions

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// We use the REST API here but executing raw SQL usually requires the pg driver or a specific RPC function 
// if we don't have direct SQL access through supabase-js (which we don't usually).
// HOWEVER, looking at previous context, there might be an `exec_sql` RPC or similar.
// IF NOT, we might have to rely on the user running it in the SQL Editor. 
// BUT checking the `scripts/clean_db.js` might reveal how they do it.
// Let's assume we might need to just instructing the user, OR check if we can run it via a known trick or RPC.

// Actually, reading `scripts/clean_db.js` (from file list) would be smart before writing this.
// But I'll write a generic one that TRIES to use an RPC 'exec_sql' if available, otherwise just logs instructions.

// Better yet, I will write a script that uses the existing connection to at least TRY to clean up using standard delete/update calls where possible,
// but for DROPPING tables, we need SQL.

// Let's just create the file content that reads the SQL file and logs it for now, 
// and I will verify `clean_db.js` in a moment to see if I can do better.

console.log("For security reasons, Supabase JS client cannot execute raw SQL (DROP TABLE, etc) directly unless an RPC function is exposed.");
console.log("Please copy the content of 'migrate_to_single_tenant.sql' and run it in your Supabase SQL Editor.");

// We can at least try to clean the data we can access via API
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanData() {
    console.log("Attempting data cleanup via API...");
    // We can't drop tables, but we can update constraints or rows if RLS allows (Service Key does).
    
    // 1. Fetch all organizations
    const { data: orgs } = await supabase.from('organizations').select('id, name, created_at').order('created_at', { ascending: true });
    
    if (orgs && orgs.length > 1) {
        console.log(`Found ${orgs.length} organizations. Keeping the first one: ${orgs[0].name}`);
        const keepId = orgs[0].id;
        const removeIds = orgs.slice(1).map(o => o.id);
        
        console.log(`Removing ${removeIds.length} secondary organizations...`);
        // This might fail if there are FK constraints on tables we haven't cleaned yet (like plans/subscriptions which we want to drop).
        // So this JS script is limited.
        
        /* 
        const { error } = await supabase.from('organizations').delete().in('id', removeIds);
        if (error) console.error("Error deleting orgs:", error);
        else console.log("Deleted secondary organizations.");
        */
       console.log("Skipping delete to avoid FK constraint violations before SQL script is run.");
    } else {
        console.log("Organization count is " + (orgs ? orgs.length : 0));
    }
}

cleanData();
