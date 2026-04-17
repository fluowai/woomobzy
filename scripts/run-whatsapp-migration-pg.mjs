import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const supabaseUrl = new URL(process.env.VITE_SUPABASE_URL?.trim());
const pool = new Pool({
  host: supabaseUrl.hostname,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  ssl: { rejectUnauthorized: false }
});

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
      await pool.query(stmt.trim());
      success++;
      console.log(`  ✅ Success`);
    } catch (e) {
      if (
        e.message.includes('already exists') ||
        e.message.includes('duplicate key') ||
        e.code === '42P07' ||
        e.code === '42710' ||
        e.message.includes('does not exist')
      ) {
        skipped++;
        console.log(`  ⏭️  Skipped (${e.code || 'already exists'})`);
      } else {
        errors++;
        console.log(`  ❌ ${e.message.substring(0, 80)}`);
      }
    }
  }
  
  await pool.end();
  
  console.log('\n📊 Migration Summary:');
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  
  if (errors === 0) {
    console.log('\n✅ Migration completed successfully!');
  }
}

runMigration().catch(console.error);
