
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("🔍 Buscando organização...");
    const { data: orgs, error } = await supabase.from('organizations').select('id, slug').limit(1);
    
    let org;
    if (error || !orgs || orgs.length === 0) {
        console.log("⚠️ Nenhuma org encontrada. Criando uma de teste...");
        const { data: newOrg, error: createError } = await supabase
            .from('organizations')
            .insert({
                name: 'Test Org Check',
                slug: 'testorgcheck',
                status: 'active'
            })
            .select()
            .single();
            
        if (createError) {
             console.error("❌ Erro ao criar org de teste:", createError);
             return;
        }
        org = newOrg;
    } else {
        org = orgs[0];
    }

    console.log(`✅ Org encontrada: ${org.slug} (${org.id})`);

    const instanceName = `ai_test_${Date.now()}`;
    console.log(`🚀 Tentando criar instância via Backend Local: ${instanceName}`);

    try {
        const response = await axios.post('http://localhost:3002/api/evolution/instances', {
            instanceName: instanceName,
            organizationId: org.id
        });
        
        console.log("✅ Sucesso!", response.data);
    } catch (error) {
        console.error("❌ Falha na requisição:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

test();
