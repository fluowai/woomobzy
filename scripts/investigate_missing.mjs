import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';

async function run() {
  try {
    console.log('=== INVESTIGATING MISSING PROPERTIES ===\n');

    // Get all Pamas properties with and without external_id
    const { data: allProps } = await supabase
      .from('properties')
      .select('id, title, external_id, images, created_at')
      .eq('organization_id', PAMAS_ID)
      .order('created_at');

    const withExternal = allProps?.filter(p => p.external_id && p.external_id.length > 0) || [];
    const withoutExternal = allProps?.filter(p => !p.external_id || p.external_id.length === 0) || [];

    console.log(`Total: ${allProps?.length}`);
    console.log(`With external_id: ${withExternal.length}`);
    console.log(`Without external_id: ${withoutExternal.length}`);

    // Check when these were created
    console.log('\n=== PROPERTIES WITHOUT EXTERNAL_ID ===');
    withoutExternal.forEach(p => {
      const date = new Date(p.created_at).toLocaleDateString('pt-BR');
      console.log(`[${date}] ${p.title.substring(0, 70)}`);
    });

    // Check if these might be from a different source/manual entry
    console.log('\n=== ANALYZING TITLES ===');
    withoutExternal.forEach(p => {
      const title = p.title.toLowerCase();
      const hasMarketing = title.includes('oportunidade') || 
                          title.includes('imperdível') || 
                          title.includes('excepcional') ||
                          title.includes('lindo') ||
                          title.includes('luxo');
      console.log(`${hasMarketing ? 'MARKETING' : 'NORMAL'}: ${p.title.substring(0, 60)}`);
    });

    // Check if any of these might actually be Mega properties
    console.log('\n=== CHECKING IF THESE ARE MEGA PROPERTIES ===');
    const { data: megaProps } = await supabase
      .from('properties')
      .select('title')
      .eq('organization_id', '52757ffb-dd3a-4106-8783-31ebe01a1455');

    const megaTitles = new Set((megaProps || []).map(p => p.title.toLowerCase().trim()));
    
    const possiblyMega = withoutExternal.filter(p => megaTitles.has(p.title.toLowerCase().trim()));
    
    console.log(`Properties that match Mega titles: ${possiblyMega.length}`);
    possiblyMega.forEach(p => {
      console.log(`  ${p.title}`);
    });

  } catch (err) {
    console.error('Erro:', err);
  }
}

run();
