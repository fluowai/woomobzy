
import { createClient } from '@supabase/supabase-js';

const OLD_SUPABASE_URL = 'https://wgpkazpkuatreindaeuz.supabase.co';
const OLD_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncGthenBrdWF0cmVpbmRhZXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTg0NTksImV4cCI6MjA4MjczNDQ1OX0.fKzLSFBUALg9ZcgqrhLPcm6x5QFUVG18VXNHjrxupZg';

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);

async function checkOldData() {
  console.log('🔍 Verificando banco antigo...');
  const { count, error } = await oldSupabase.from('properties').select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log(`❌ Erro no banco antigo: ${error.message}`);
  } else {
    console.log(`📊 Banco antigo tem ${count} propriedades.`);
  }
}

checkOldData();
