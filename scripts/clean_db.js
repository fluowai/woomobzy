
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Credenciais não encontradas.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
  console.log("🧹 Limpando imóveis inválidos...");
  
  // Delete by title pattern of the homepage
  const { error } = await supabase
    .from('properties')
    .delete()
    .ilike('title', 'Sistema e site%');

  if (error) {
    console.error("❌ Erro ao limpar:", error.message);
  } else {
    console.log("✅ Imóveis inválidos removidos com sucesso.");
  }
}

clean();
