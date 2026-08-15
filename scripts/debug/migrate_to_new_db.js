/**
 * ImobiSaaS - Script de Migração de Dados
 * 
 * Migra dados e imagens do banco Supabase antigo para o novo
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fetch from 'node-fetch';

// Configuração do banco ANTIGO
const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL;
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_KEY;

// Configuração do banco NOVO (do .env)
const NEW_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const NEW_SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OLD_SUPABASE_URL || !OLD_SUPABASE_KEY) {
  console.error('❌ Configure OLD_SUPABASE_URL e OLD_SUPABASE_KEY');
  process.exit(1);
}

if (!NEW_SUPABASE_URL || !NEW_SUPABASE_KEY || !NEW_SERVICE_KEY) {
  console.error('❌ Configure as variáveis de ambiente do NOVO banco no .env, incluindo a service role');
  process.exit(1);
}

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);
const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);
const newSupabaseAdmin = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY);

console.log('🔄 ImobiSaaS - Migração de Dados\n');
console.log('📤 Banco ANTIGO:', OLD_SUPABASE_URL);
console.log('📥 Banco NOVO:', NEW_SUPABASE_URL);
console.log('─'.repeat(60));

// Função para baixar imagem
async function downloadImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error(`  ❌ Erro ao baixar ${url}:`, error.message);
    return null;
  }
}

// Função para fazer upload de imagem
async function uploadImage(buffer, fileName, bucket) {
  try {
    const { data, error } = await newSupabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (error) {
      throw error;
    }
    
    const { data: urlData } = newSupabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error(`  ❌ Erro ao fazer upload de ${fileName}:`, error.message);
    return null;
  }
}

// Migrar configurações do site
async function migrateSiteSettings() {
  console.log('\n⚙️  Migrando Configurações do Site...\n');
  
  try {
    const { data: oldSettings, error: fetchError } = await oldSupabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (fetchError) {
      console.log('  ⚠️  Nenhuma configuração encontrada no banco antigo');
      return;
    }
    
    console.log('  ✅ Configurações encontradas no banco antigo');
    
    // Migrar logo se existir
    let newLogoUrl = oldSettings.logo_url;
    if (oldSettings.logo_url && oldSettings.logo_url.includes(OLD_SUPABASE_URL.replace('https://', ''))) {
      console.log('  📸 Migrando logo...');
      const logoBuffer = await downloadImage(oldSettings.logo_url);
      if (logoBuffer) {
        const fileName = `logo_${Date.now()}.png`;
        newLogoUrl = await uploadImage(logoBuffer, fileName, 'agency-assets');
        if (newLogoUrl) {
          console.log('  ✅ Logo migrada com sucesso!');
        }
      }
    }
    
    // Inserir no novo banco
    const settingsToInsert = {
      ...oldSettings,
      logo_url: newLogoUrl,
      id: undefined, // Deixar o banco gerar novo ID
      created_at: undefined,
      updated_at: undefined
    };
    
    const { error: insertError } = await newSupabase
      .from('site_settings')
      .insert(settingsToInsert);
    
    if (insertError) {
      console.error('  ❌ Erro ao inserir configurações:', insertError.message);
    } else {
      console.log('  ✅ Configurações migradas com sucesso!');
    }
  } catch (error) {
    console.error('  ❌ Erro na migração de configurações:', error.message);
  }
}

// Migrar propriedades
async function migrateProperties() {
  console.log('\n🏠 Migrando Propriedades...\n');
  
  try {
    const { data: oldProperties, error: fetchError } = await oldSupabase
      .from('properties')
      .select('*');
    
    if (fetchError) {
      console.error('  ❌ Erro ao buscar propriedades:', fetchError.message);
      return;
    }
    
    console.log(`  📊 ${oldProperties.length} propriedades encontradas\n`);
    
    let migrated = 0;
    let failed = 0;
    
    for (const property of oldProperties) {
      console.log(`  🏠 Migrando: ${property.title}`);
      
      // Migrar imagens
      const newImages = [];
      if (property.images && property.images.length > 0) {
        console.log(`     📸 Migrando ${property.images.length} imagem(ns)...`);
        
        for (let i = 0; i < property.images.length; i++) {
          const oldImageUrl = property.images[i];
          
          // Pular placeholders
          if (!oldImageUrl || oldImageUrl.includes('placeholder') || oldImageUrl.includes('unsplash')) {
            console.log(`        ⏭️  Imagem ${i + 1}: Placeholder, pulando...`);
            continue;
          }
          
          // Pular se não for do banco antigo
          if (!oldImageUrl.includes(OLD_SUPABASE_URL.replace('https://', ''))) {
            console.log(`        ⏭️  Imagem ${i + 1}: URL externa, mantendo...`);
            newImages.push(oldImageUrl);
            continue;
          }
          
          console.log(`        ⬇️  Baixando imagem ${i + 1}...`);
          const imageBuffer = await downloadImage(oldImageUrl);
          
          if (imageBuffer) {
            const fileName = `property_${property.id}_${i}_${Date.now()}.jpg`;
            const newImageUrl = await uploadImage(imageBuffer, fileName, 'property-images');
            
            if (newImageUrl) {
              newImages.push(newImageUrl);
              console.log(`        ✅ Imagem ${i + 1} migrada!`);
            } else {
              console.log(`        ❌ Falha ao migrar imagem ${i + 1}`);
            }
          }
        }
      }
      
      // Inserir propriedade no novo banco
      const propertyToInsert = {
        ...property,
        images: newImages,
        id: undefined, // Deixar o banco gerar novo ID
        created_at: undefined,
        updated_at: undefined
      };
      
      const { error: insertError } = await newSupabase
        .from('properties')
        .insert(propertyToInsert);
      
      if (insertError) {
        console.log(`     ❌ Erro ao inserir propriedade: ${insertError.message}`);
        failed++;
      } else {
        console.log(`     ✅ Propriedade migrada com sucesso!`);
        migrated++;
      }
      
      console.log(''); // Linha em branco
    }
    
    console.log('  📊 Resumo da Migração:');
    console.log(`     - Migradas: ${migrated}`);
    console.log(`     - Falharam: ${failed}`);
  } catch (error) {
    console.error('  ❌ Erro na migração de propriedades:', error.message);
  }
}

// Migrar leads
async function migrateLeads() {
  console.log('\n📋 Migrando Leads...\n');
  
  try {
    const { data: oldLeads, error: fetchError } = await oldSupabase
      .from('leads')
      .select('*');
    
    if (fetchError) {
      console.log('  ⚠️  Nenhum lead encontrado no banco antigo');
      return;
    }
    
    console.log(`  📊 ${oldLeads.length} leads encontrados`);
    
    // Inserir leads no novo banco (sem IDs para evitar conflitos)
    const leadsToInsert = oldLeads.map(lead => ({
      ...lead,
      id: undefined,
      created_at: undefined,
      updated_at: undefined,
      property_id: null // Resetar referência de propriedade (IDs mudaram)
    }));
    
    const { error: insertError } = await newSupabase
      .from('leads')
      .insert(leadsToInsert);
    
    if (insertError) {
      console.error('  ❌ Erro ao inserir leads:', insertError.message);
    } else {
      console.log('  ✅ Leads migrados com sucesso!');
    }
  } catch (error) {
    console.error('  ❌ Erro na migração de leads:', error.message);
  }
}

// Executar migração
async function runMigration() {
  console.log('\n🚀 Iniciando migração...\n');
  
  const confirm = process.argv.includes('--confirm');
  
  if (!confirm) {
    console.log('⚠️  ATENÇÃO: Esta operação irá copiar dados do banco antigo para o novo.');
    console.log('   Execute novamente com --confirm para prosseguir:');
    console.log('   node migrate_to_new_db.js --confirm\n');
    return;
  }
  
  try {
    await migrateSiteSettings();
    await migrateProperties();
    await migrateLeads();
    
    console.log('\n' + '─'.repeat(60));
    console.log('✅ Migração concluída!\n');
    console.log('📝 Próximos passos:');
    console.log('   1. Execute: node diagnose_images.js');
    console.log('   2. Verifique se as imagens estão sendo exibidas');
    console.log('   3. Teste a aplicação completamente\n');
  } catch (error) {
    console.error('\n❌ Erro durante migração:', error);
    process.exit(1);
  }
}

runMigration();
