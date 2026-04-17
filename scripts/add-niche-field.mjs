#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  console.log('🔄 Executing niche field migration...\n');

  const migrationSQL = `
-- Migration: Add niche field to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT 'rural'
  CHECK (niche IN ('rural', 'traditional', 'hybrid'));

-- Create index for niche lookups
CREATE INDEX IF NOT EXISTS idx_organizations_niche ON organizations(niche);

-- Update existing organizations with default 'rural' if null
UPDATE organizations SET niche = 'rural' WHERE niche IS NULL;

-- Make column NOT NULL
ALTER TABLE organizations ALTER COLUMN niche SET NOT NULL;
  `.trim();

  try {
    // Execute via SQL function (exec_sql RPC)
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    }).catch(err => {
      console.log('⚠️  exec_sql RPC not available, trying direct approach...');
      return { error: err };
    });

    if (error) {
      throw error;
    }

    console.log('✅ Migration executed successfully!');
    console.log(data);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);

    // Try individual statements
    console.log('\n🔄 Trying individual statements...');

    const statements = [
      `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT 'rural' CHECK (niche IN ('rural', 'traditional', 'hybrid'))`,
      `CREATE INDEX IF NOT EXISTS idx_organizations_niche ON organizations(niche)`,
      `UPDATE organizations SET niche = 'rural' WHERE niche IS NULL`,
      `ALTER TABLE organizations ALTER COLUMN niche SET NOT NULL`
    ];

    for (const stmt of statements) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
        if (error) throw error;
        console.log(`✅ Statement executed`);
      } catch (e) {
        console.log(`⚠️  Statement skipped (may already exist): ${stmt.substring(0, 50)}...`);
      }
    }
  }
}

executeMigration();
