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
    console.log('=== FULL AUDIT OF PAMAS PROPERTIES ===\n');

    const { data: allProps } = await supabase
      .from('properties')
      .select('id, title, external_id, images, created_at, status, price')
      .eq('organization_id', PAMAS_ID)
      .order('created_at');

    const total = allProps?.length || 0;
    const withExternal = allProps?.filter(p => p.external_id && p.external_id.includes('pamasimoveis.com.br')) || [];
    const withOtherExternal = allProps?.filter(p => p.external_id && !p.external_id.includes('pamasimoveis.com.br')) || [];
    const withoutExternal = allProps?.filter(p => !p.external_id || p.external_id.length === 0) || [];

    console.log(`Total properties: ${total}`);
    console.log(`With pamasimoveis.com.br external_id: ${withExternal.length}`);
    console.log(`With OTHER external_id: ${withOtherExternal.length}`);
    console.log(`Without external_id: ${withoutExternal.length}`);

    if (withOtherExternal.length > 0) {
      console.log('\nProperties with unexpected external_id:');
      withOtherExternal.forEach(p => {
        console.log(`  ${p.id}: ${p.external_id?.substring(0, 80)}`);
      });
    }

    // Check creation dates
    console.log('\n=== CREATION DATE ANALYSIS ===');
    const byDate = new Map();
    allProps?.forEach(p => {
      const date = new Date(p.created_at).toLocaleDateString('pt-BR');
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(p);
    });

    byDate.forEach((props, date) => {
      const withExt = props.filter(p => p.external_id && p.external_id.length > 0).length;
      console.log(`${date}: ${props.length} props (${withExt} with external_id)`);
    });

    // Summary of what needs to be done
    console.log('\n=== ACTION ITEMS ===');
    console.log(`1. Remove ${withoutExternal.length} properties without external_id (likely duplicates or test data)`);
    console.log(`2. Keep ${withExternal.length} properties with valid external_id`);
    console.log(`3. Fix ${withOtherExternal.length} properties with unexpected external_id if any`);

  } catch (err) {
    console.error('Erro:', err);
  }
}

run();
