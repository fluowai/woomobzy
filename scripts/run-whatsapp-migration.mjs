import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running WhatsApp Baileys migration...');
  
  const sql = fs.readFileSync('./migrations/001_whatsapp_baileys.sql', 'utf-8');
  const statements = sql.split(';').filter(s => s.trim().length > 0 && !s.trim().startsWith('--'));
  
  let success = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt.trim() });
      
      if (error) {
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate key') ||
          error.code === '42P07' ||
          error.code === '42710' ||
          error.message.includes('does not exist') ||
          error.code === 'PGRST205'
        ) {
          skipped++;
          console.log(`  ⏭️  Skipped (already exists)`);
        } else {
          errors++;
          console.log(`  ❌ Error: ${error.message.substring(0, 100)}`);
        }
      } else {
        success++;
        console.log(`  ✅ Success`);
      }
    } catch (e) {
      errors++;
      console.log(`  ❌ Exception: ${e.message.substring(0, 100)}`);
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  
  // Verify tables exist
  console.log('\n🔍 Verifying tables...');
  const tables = ['whatsapp_instances', 'whatsapp_chats', 'whatsapp_messages'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        console.log(`  ❌ ${table}: ${error.message}`);
      } else {
        console.log(`  ✅ ${table} exists`);
      }
    } catch (e) {
      console.log(`  ❌ ${table}: ${e.message}`);
    }
  }
}

runMigration().catch(console.error);
