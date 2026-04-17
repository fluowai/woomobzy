#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigrations() {
  console.log('\n🔍 Verificando status das migrações do Supabase...\n');

  const tablesToCheck = [
    'organizations',
    'profiles',
    'properties',
    'leads',
    'landing_pages',
    'site_settings',
    'chat_messages',
    'contracts'
  ];

  const results = {
    exists: [],
    missing: [],
    errors: [],
  };

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });

      if (error && error.code === 'PGRST204') {
        // Tabela existe mas está vazia
        results.exists.push(`✅ ${table} (existe, vazio)`);
      } else if (error && error.code === '42P01') {
        // Tabela não existe
        results.missing.push(`❌ ${table} (não existe)`);
      } else if (error) {
        results.errors.push(`⚠️  ${table} (erro: ${error.message})`);
      } else {
        results.exists.push(`✅ ${table} (existe, ${data?.length || 0} registros)`);
      }
    } catch (err) {
      results.errors.push(`💥 ${table} (erro: ${err.message})`);
    }
  }

  console.log('📊 RESULTADO DAS MIGRAÇÕES:\n');

  if (results.exists.length > 0) {
    console.log('✅ Tabelas Existentes:');
    results.exists.forEach(r => console.log(`   ${r}`));
    console.log();
  }

  if (results.missing.length > 0) {
    console.log('❌ Tabelas Faltando:');
    results.missing.forEach(r => console.log(`   ${r}`));
    console.log();
  }

  if (results.errors.length > 0) {
    console.log('⚠️  Erros ao Verificar:');
    results.errors.forEach(r => console.log(`   ${r}`));
    console.log();
  }

  const totalChecked = results.exists.length + results.missing.length + results.errors.length;
  const existingTables = results.exists.length;

  console.log(`📈 RESUMO: ${existingTables}/${totalChecked} tabelas criadas`);

  if (results.missing.length === 0 && results.errors.length === 0) {
    console.log('\n✅ TODAS AS MIGRAÇÕES ESTÃO APLICADAS!\n');
  } else {
    console.log('\n⚠️  AINDA FALTAM MIGRAÇÕES SEREM APLICADAS\n');
    console.log('Para executar as migrações:');
    console.log('  1. Acesse: https://app.supabase.com/');
    console.log('  2. Navegue para SQL Editor');
    console.log('  3. Copie o conteúdo de: definitive_imobzy_schema.sql');
    console.log('  4. Execute o SQL no SQL Editor\n');
  }
}

checkMigrations().catch(err => {
  console.error('❌ Erro ao verificar migrações:', err.message);
  process.exit(1);
});
