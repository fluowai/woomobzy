/**
 * scripts/validate-baileys.mjs
 * 
 * Script de validação pós-refatoração para garantir que o sistema
 * de gerenciamento de sessões está operando conforme as novas especificações.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ ERRO: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function validate() {
  console.log('🔍 Iniciando Validação do Sistema WhatsApp/Baileys...\n');

  // 1. Verificar estrutura de diretórios
  const sessionsDir = path.join(__dirname, '../.sessions');
  if (fs.existsSync(sessionsDir)) {
    console.log('✅ [FileSystem] Diretório .sessions existe.');
  } else {
    console.log('⚠️ [FileSystem] Diretório .sessions não existe (será criado no boot).');
  }

  // 2. Verificar arquivos essenciais do backend
  const essentialFiles = [
    'server/baileys/StateMachine.js',
    'server/baileys/PersistenceManager.js',
    'server/baileys/SessionManager.js',
    'server/baileys/index.js'
  ];

  for (const file of essentialFiles) {
    if (fs.existsSync(path.join(__dirname, '..', file))) {
      console.log(`✅ [Files] ${file} existe.`);
    } else {
      console.error(`❌ [Files] ${file} ESTÁ AUSENTE!`);
    }
  }

  // 3. Verificar integridade do Banco de Dados
  console.log('\n📊 Verificando integridade do banco de dados...');
  try {
    const { data: instances, error: instError } = await supabase.from('whatsapp_instances').select('id, status');
    if (instError) throw instError;
    
    console.log(`✅ [DB] Conexão com Supabase OK. Encontradas ${instances.length} instâncias.`);
    
    const stuckInstances = instances.filter(i => ['connecting', 'reconnecting', 'qr_pending'].includes(i.status));
    if (stuckInstances.length > 0) {
      console.log(`ℹ️ [DB] ${stuckInstances.length} instâncias em estado transitório. O próximo 'boot' irá resetá-las para 'disconnected'.`);
    }
  } catch (err) {
    console.error('❌ [DB] Erro ao conectar com Supabase:', err.message);
  }

  // 4. Verificar API Health
  console.log('\n🧪 Testando endpoint de saúde (certifique-se que o servidor está rodando na porta 3002 ou definida no .env)...');
  const port = process.env.PORT || 3002;
  try {
    const response = await fetch(`http://localhost:${port}/health`).catch(() => null);
    if (response) {
      const data = await response.json();
      console.log('✅ [API] Endpoint /health respondeu:', data.status);
    } else {
      console.log('⚠️ [API] Servidor local não parece estar rodando (normal se você ainda não deu restart).');
    }
  } catch (err) {
    // Silencioso
  }

  console.log('\n✨ Validação completa.');
  console.log('🚀 Próximo passo: Execute "npm run dev" ou "pm2 restart imobisaas-backend" para aplicar as mudanças.');
}

validate();
