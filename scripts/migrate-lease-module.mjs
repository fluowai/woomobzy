#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}\u2139${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}\u2705 ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}\u274C ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}\u26A0\uFE0F  ${msg}${colors.reset}`),
};

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  log.error('VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY n\u00E3o configuradas no .env');
  process.exit(1);
}

const MIGRATION_FILE = path.join(__dirname, '..', 'migrations', '20260619_lease_management_complete.sql');
if (!fs.existsSync(MIGRATION_FILE)) {
  log.error(`Migration file not found: ${MIGRATION_FILE}`);
  process.exit(1);
}

function stripLeadingComments(sql) {
  return sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && !line.match(/^--/))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitSQL(sql) {
  const statements = [];
  let current = '';
  let inDollar = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    const dollarCount = (line.match(/\$\$/g) || []).length;
    if (dollarCount % 2 === 1) inDollar = !inDollar;

    current += line + '\n';

    if (!inDollar && line.trim().endsWith(';')) {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = '';
    }
  }

  const last = current.trim();
  if (last) statements.push(last);
  return statements;
}

async function run() {
  console.log(`${colors.cyan}
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  Lease Management Module - Migration Runner   \u2551
\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d
${colors.reset}`);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sqlContent = fs.readFileSync(MIGRATION_FILE, 'utf-8');
  log.info(`Read: ${MIGRATION_FILE} (${sqlContent.length} bytes)`);

  // Strip comment lines
  const cleaned = stripLeadingComments(sqlContent);
  const statements = splitSQL(cleaned);

  log.info(`Split into ${statements.length} SQL statements`);

  // Verify exec_sql works
  try {
    await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
    log.success('exec_sql RPC is available');
  } catch (err) {
    log.error(`exec_sql RPC failed: ${err.message}`);
    process.exit(1);
  }

  // Print statements for debugging
  statements.forEach((s, i) => {
    const first = s.substring(0, 90).replace(/\n/g, ' ');
    console.log(`  [${i + 1}] ${first}...`);
  });

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });
      if (error) throw error;
      success++;
      process.stdout.write(`${colors.green}.${colors.reset}`);
    } catch (err) {
      const msg = (err.message || err.error || '').toLowerCase();
      if (
        msg.includes('already exists') ||
        msg.includes('already present') ||
        msg.includes('duplicate')
      ) {
        success++;
        process.stdout.write(`${colors.yellow}.${colors.reset}`);
        continue;
      }
      failed++;
      const preview = stmt.substring(0, 120).replace(/\n/g, ' ');
      console.log(`\n${colors.red}[${i + 1}/${statements.length}]${colors.reset}`);
      console.log(`  Error: ${err.message}`);
      console.log(`  SQL: ${preview}`);
    }
  }

  console.log(`\n`);
  if (failed === 0) {
    log.success(`All ${success} statements executed successfully!`);
  } else {
    log.warn(`${success} succeeded, ${failed} failed`);
  }

  console.log(`\n${colors.green}\uD83C\uDFB2 Migration complete!${colors.reset}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  log.error(`Fatal: ${err.message}`);
  process.exit(1);
});
