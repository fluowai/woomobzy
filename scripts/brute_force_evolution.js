
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
    console.log("🔍 Buscando Configuração Global...");
    const { data: settings, error } = await supabase.from('saas_settings').select('global_evolution_url, global_evolution_api_key').single();
    
    if (error || !settings) {
        console.error("❌ Erro ao buscar settings:", error);
        return;
    }

    const { global_evolution_url, global_evolution_api_key } = settings;
    console.log(`✅ Config: ${global_evolution_url}`);

    const variants = [
        { name: 'try_upper_hyphen', integration: 'WHATSAPP-BAILEYS' },
        { name: 'try_lower_hyphen', integration: 'whatsapp-baileys' },
        { name: 'try_upper_under', integration: 'WHATSAPP_BAILEYS' },
        { name: 'try_lower_under', integration: 'whatsapp_baileys' },
        { name: 'try_no_integration' }
    ];

    for (const v of variants) {
        const instanceName = `test_${Math.random().toString(36).substring(7)}`;
        console.log(`\n🧪 Testando variante: ${JSON.stringify(v)} (Nome: ${instanceName})`);

        const payload = {
            instanceName: instanceName,
            token: "secret123",
            qrcode: true
        };
        if (v.integration) payload.integration = v.integration;

        try {
            const res = await axios.post(`${global_evolution_url}/instance/create`, payload, {
                headers: { 'apikey': global_evolution_api_key }
            });
            console.log("🎉 SUCESSO! Payload aceito:", v);
            console.log("Resposta:", res.data);
            
            // Tentar deletar para limpar
            try {
                await axios.delete(`${global_evolution_url}/instance/delete/${instanceName}`, {
                     headers: { 'apikey': global_evolution_api_key }
                });
                console.log("🗑️ Instância de teste limpa.");
            } catch(e) {}
            
            return; // Parar no primeiro sucesso
        } catch (err) {
            console.error("❌ Falha:");
            if (err.response) {
                console.error("Status:", err.response.status);
                console.error("Data:", JSON.stringify(err.response.data));
            } else {
                console.error(err.message);
            }
        }
    }
    console.log("\n❌ Todas as variantes falharam.");
}

test();
