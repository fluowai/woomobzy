import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

function buildConnectionString(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete('sslmode');
    u.searchParams.set('uselibpqcompat', 'true');
    return u.toString();
  } catch {
    return url;
  }
}

const client = new Client({
  connectionString: buildConnectionString(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL),
  ssl: { rejectUnauthorized: false }
});

const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';
const MEGA_ID = '52757ffb-dd3a-4106-8783-31ebe01a1455';
const PAMAS_SLUG = 'pamasimoveis';
const MEGA_SLUG = 'megainvestimentos';

async function run() {
  await client.connect();

  try {
    // 1. List landing pages for both orgs
    console.log('=== LANDING PAGES ===');
    const pages = await client.query(`
      SELECT id, name, slug, organization_id, status, property_selection, is_active
      FROM landing_pages
      WHERE organization_id IN ($1, $2)
      ORDER BY organization_id, updated_at DESC
    `, [PAMAS_ID, MEGA_ID]);
    
    pages.rows.forEach(page => {
      const org = page.organization_id === PAMAS_ID ? 'PAMAS' : 'MEGA';
      console.log(`[${org}] ${page.name} | ${page.slug} | ${page.status} | active: ${page.is_active}`);
      console.log(`  property_selection: ${JSON.stringify(page.property_selection).substring(0, 200)}`);
    });

    // 2. Count properties per org with images
    console.log('\n=== PROPERTIES COM IMAGENS ===');
    const withImages = await client.query(`
      SELECT organization_id, COUNT(*) as total, 
             COUNT(CASE WHEN images IS NOT NULL AND array_length(images, 1) > 0 THEN 1 END) as com_imagens,
             COUNT(CASE WHEN images IS NULL OR array_length(images, 1) = 0 THEN 1 END) as sem_imagens
      FROM properties
      WHERE organization_id IN ($1, $2)
      GROUP BY organization_id
    `, [PAMAS_ID, MEGA_ID]);
    
    withImages.rows.forEach(row => {
      const org = row.organization_id === PAMAS_ID ? 'PAMAS' : 'MEGA';
      console.log(`${org}: ${row.total} total | ${row.com_imagens} com imagens | ${row.sem_imagens} sem imagens`);
    });

    // 3. Check for properties with external_id pointing to wrong site
    console.log('\n=== PROPS COM external_id CRUZADO ===');
    const crossed = await client.query(`
      SELECT id, title, organization_id, external_id
      FROM properties
      WHERE (organization_id = $1 AND external_id LIKE $2)
         OR (organization_id = $3 AND external_id LIKE $4)
    `, [PAMAS_ID, 'https://megainvestimoveis.com.br/%', MEGA_ID, 'https://pamasimoveis.com.br/%']);
    
    if (crossed.rows.length === 0) {
      console.log('Nenhum external_id cruzado encontrado.');
    } else {
      crossed.rows.forEach(row => {
        const org = row.organization_id === PAMAS_ID ? 'PAMAS' : 'MEGA';
        console.log(`  [${org}] ${row.title} => ${row.external_id}`);
      });
    }

    // 4. Sample properties from each org with their external_id
    console.log('\n=== SAMPLE PAMAS (primeiros 10 com external_id) ===');
    const pamasSample = await client.query(`
      SELECT id, title, external_id, array_length(images, 1) as img_count
      FROM properties
      WHERE organization_id = $1 AND external_id IS NOT NULL
      LIMIT 10
    `, [PAMAS_ID]);
    pamasSample.rows.forEach(row => {
      console.log(`  ${row.title.substring(0, 60)} | external: ${row.external_id?.substring(0, 80)} | imgs: ${row.img_count || 0}`);
    });

    console.log('\n=== SAMPLE MEGA (todos com external_id) ===');
    const megaSample = await client.query(`
      SELECT id, title, external_id, array_length(images, 1) as img_count
      FROM properties
      WHERE organization_id = $1 AND external_id IS NOT NULL
      LIMIT 10
    `, [MEGA_ID]);
    megaSample.rows.forEach(row => {
      console.log(`  ${row.title.substring(0, 60)} | external: ${row.external_id?.substring(0, 80)} | imgs: ${row.img_count || 0}`);
    });

    // 5. Check storage_objects for images linked to each org
    console.log('\n=== STORAGE OBJECTS POR ORG ===');
    const storage = await client.query(`
      SELECT tenant_id, COUNT(*) as total_objs,
             COUNT(CASE WHEN entity_type = 'property' THEN 1 END) as property_objs
      FROM storage_objects
      WHERE tenant_id IN ($1, $2)
      GROUP BY tenant_id
    `, [PAMAS_ID, MEGA_ID]);
    
    storage.rows.forEach(row => {
      const org = row.tenant_id === PAMAS_ID ? 'PAMAS' : 'MEGA';
      console.log(`${org}: ${row.total_objs} objetos storage | ${row.property_objs} ligados a properties`);
    });

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

run();
