#!/usr/bin/env node
// Script para executar a migration de gamificação via conexão direta ao PostgreSQL
import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

// Remove sslmode from URL to let pg handle it via the ssl option
const connStr = DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, '')
  .replace(/[?&]default_query_exec_mode=[^&]*/g, '')
  .replace(/\?$/, '');

const client = new pg.Client({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('🔌 Conectando ao banco de dados...');
  await client.connect();
  console.log('✅ Conectado!');

  const sqlPath = resolve(
    __dirname,
    '../migrations/20260725_gamification_and_fintech.sql'
  );
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('🚀 Executando migration: 20260725_gamification_and_fintech.sql');
  console.log(
    '📦 Tabelas: gamification_profiles, gamification_transactions, gamification_redemptions, fianca_requests'
  );
  console.log('');

  try {
    await client.query(sql);
    console.log('');
    console.log('✅ Migration executada com sucesso!');
    console.log('');
    console.log('📋 Tabelas criadas:');
    console.log('   ✓ gamification_profiles');
    console.log('   ✓ gamification_transactions');
    console.log('   ✓ gamification_redemptions');
    console.log('   ✓ fianca_requests');
    console.log('');
    console.log('🔒 RLS aplicado em todas as tabelas');
    console.log('📊 Índices de performance criados');
    console.log('⚡ Triggers updated_at configurados');
  } catch (err) {
    console.error('❌ Erro na migration:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexão encerrada.');
  }
}

run();
