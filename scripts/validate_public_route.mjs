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
const MEGA_ID = '52757ffb-dd3a-4106-8783-31ebe01a1455';

async function run() {
  try {
    // 1. Validate that the organization_id mapping is correct in DB
    console.log('=== 1. ORGANIZATION MAPPING VALIDATION ===');
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, slug, parent_id, is_reseller')
      .in('id', [PAMAS_ID, MEGA_ID]);

    const orgMap = new Map(orgs?.map((o) => [o.id, o]) || []);
    const pamasOrg = orgMap.get(PAMAS_ID);
    const megaOrg = orgMap.get(MEGA_ID);

    console.log('Pamas:', pamasOrg || 'MISSING');
    console.log('Mega:', megaOrg || 'MISSING');

    if (!pamasOrg || !megaOrg) {
      console.log('ERROR: One or more organizations not found!');
      return;
    }

    // 2. Verify property counts match expectations
    console.log('\n=== 2. PROPERTY COUNTS ===');
    const { count: pamasCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', PAMAS_ID);

    const { count: megaCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', MEGA_ID);

    console.log(`Pamas: ${pamasCount} properties`);
    console.log(`Mega: ${megaCount} properties`);

    // 3. Verify no cross-contamination
    console.log('\n=== 3. CROSS-CONTAMINATION CHECK ===');
    const { data: pamasProps } = await supabase
      .from('properties')
      .select('id, title, external_id')
      .eq('organization_id', PAMAS_ID)
      .like('external_id', '%megainvestimoveis.com.br%');

    const { data: megaProps } = await supabase
      .from('properties')
      .select('id, title, external_id')
      .eq('organization_id', MEGA_ID)
      .like('external_id', '%pamasimoveis.com.br%');

    console.log('Pamas props with Mega URLs:', pamasProps?.length || 0);
    console.log('Mega props with Pamas URLs:', megaProps?.length || 0);

    if (pamasProps && pamasProps.length > 0) {
      console.log('ERROR: Found cross-contamination in Pamas!');
      pamasProps.forEach((p) => console.log(`  ${p.id}: ${p.title}`));
    }

    if (megaProps && megaProps.length > 0) {
      console.log('ERROR: Found cross-contamination in Mega!');
      megaProps.forEach((p) => console.log(`  ${p.id}: ${p.title}`));
    }

    // 4. Simulate PublicLandingPage data fetch for Pamas
    console.log('\n=== 4. PUBLIC LANDING PAGE DATA SIMULATION ===');
    const { data: landingPage } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('organization_id', PAMAS_ID)
      .eq('status', 'published')
      .limit(1)
      .maybeSingle();

    if (landingPage) {
      console.log(
        `Found landing page: ${landingPage.name} (${landingPage.slug})`
      );
      console.log(`Organization ID: ${landingPage.organization_id}`);

      // Simulate getPageProperties
      const pageId = landingPage.id;
      const config = landingPage.property_selection || {
        mode: 'all',
        limit: 20,
      };

      let query = supabase
        .from('properties')
        .select('*')
        .eq('organization_id', PAMAS_ID);

      if (config.mode === 'all') {
        query = query.eq('status', 'Disponível');
      }

      if (config.limit) {
        query = query.limit(config.limit);
      }

      const { data: pageProps } = await query;

      console.log(`Properties that would be shown: ${pageProps?.length || 0}`);
      console.log('Sample:');
      pageProps?.slice(0, 3).forEach((p) => {
        console.log(
          `  - ${p.title.substring(0, 60)} | ${p.images?.length || 0} imgs`
        );
      });
    } else {
      console.log('No published landing page found for Pamas');
      console.log('Checking if organization can be resolved by slug...');

      const { data: orgBySlug } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', 'pamasimoveis')
        .maybeSingle();

      console.log('Pamas by slug:', orgBySlug || 'NOT FOUND');
    }

    // 5. Check for any properties with missing external_id
    console.log('\n=== 5. MISSING EXTERNAL IDs ===');
    const { data: missingExternal } = await supabase
      .from('properties')
      .select('id, title, external_id, images')
      .eq('organization_id', PAMAS_ID)
      .or('external_id.is.null,external_id.eq.');

    console.log(
      `Pamas properties without external_id: ${missingExternal?.length || 0}`
    );

    if (missingExternal && missingExternal.length > 0) {
      console.log('These need to be scraped:');
      missingExternal.slice(0, 5).forEach((p) => {
        console.log(`  ${p.id}: ${p.title.substring(0, 60)}`);
      });
    }

    console.log('\n=== VALIDATION COMPLETE ===');
  } catch (err) {
    console.error('Erro:', err);
  }
}

run();
