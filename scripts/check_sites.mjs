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

async function run() {
  await client.connect();

  try {
    // 1. List all landing pages (any org)
    console.log('=== TODAS AS LANDING PAGES ===');
    const allPages = await client.query(`
      SELECT id, name, slug, organization_id, status, is_active,
             property_selection->>'mode' as prop_mode
      FROM landing_pages
      ORDER BY organization_id, updated_at DESC
    `);
    
    if (allPages.rows.length === 0) {
      console.log('Nenhuma landing page cadastrada.');
    } else {
      allPages.rows.forEach(page => {
        const orgName = page.organization_id === PAMAS_ID ? 'PAMAS' :
                       page.organization_id === MEGA_ID ? 'MEGA' : page.organization_id;
        console.log(`[${orgName}] ${page.name} | slug: ${page.slug} | status: ${page.status} | mode: ${page.prop_mode}`);
      });
    }

    // 2. Check site_settings for both orgs
    console.log('\n=== SITE SETTINGS ===');
    try {
      const settings = await client.query(`
        SELECT organization_id, *
        FROM site_settings
        WHERE organization_id IN ($1, $2)
        ORDER BY organization_id
      `, [PAMAS_ID, MEGA_ID]);
      
      if (settings.rows.length === 0) {
        console.log('Nenhum site_settings encontrado para Pamas ou Mega.');
      } else {
        settings.rows.forEach(row => {
          const org = row.organization_id === PAMAS_ID ? 'PAMAS' : 'MEGA';
          console.log(`[${org}]`, JSON.stringify(row).substring(0, 200));
        });
      }
    } catch (err) {
      console.log('Erro ao buscar site_settings:', err.message);
    }

    // 3. Check if there are any sites table entries
    console.log('\n=== SITES TABLE ===');
    try {
      const sites = await client.query(`
        SELECT id, name, slug, organization_id, status
        FROM sites
        WHERE organization_id IN ($1, $2)
        ORDER BY organization_id, updated_at DESC
      `, [PAMAS_ID, MEGA_ID]);
      
      if (sites.rows.length === 0) {
        console.log('Nenhum site cadastrado na tabela sites para Pamas ou Mega.');
      } else {
        sites.rows.forEach(site => {
          const org = site.organization_id === PAMAS_ID ? 'PAMAS' : 'MEGA';
          console.log(`[${org}] ${site.name} | slug: ${site.slug} | status: ${site.status}`);
        });
      }
    } catch (err) {
      console.log('Tabela sites não encontrada ou erro:', err.message);
    }

    // 3b. Check what those other landing page orgs are
    console.log('\n=== OUTRAS ORGS COM LANDING PAGES ===');
    const otherOrgs = await client.query(`
      SELECT DISTINCT lp.organization_id, o.name, o.slug
      FROM landing_pages lp
      JOIN organizations o ON o.id = lp.organization_id
      WHERE lp.organization_id NOT IN ($1, $2)
    `, [PAMAS_ID, MEGA_ID]);
    
    otherOrgs.rows.forEach(row => {
      console.log(`${row.name} (${row.slug}): ${row.organization_id}`);
    });

    // 4. Full property count by org and image status
    console.log('\n=== STATUS COMPLETO DOS IMOVEIS ===');
    const fullStatus = await client.query(`
      SELECT 
        o.name as org_name,
        o.slug as org_slug,
        COUNT(p.id) as total,
        COUNT(CASE WHEN p.images IS NULL OR array_length(p.images, 1) = 0 THEN 1 END) as sem_imagens,
        COUNT(CASE WHEN p.external_id IS NULL THEN 1 END) as sem_external_id,
        COUNT(CASE WHEN p.external_id IS NOT NULL THEN 1 END) as com_external_id
      FROM organizations o
      LEFT JOIN properties p ON p.organization_id = o.id
      WHERE o.id IN ($1, $2)
      GROUP BY o.id, o.name, o.slug
    `, [PAMAS_ID, MEGA_ID]);
    
    fullStatus.rows.forEach(row => {
      console.log(`${row.org_name} (${row.org_slug}): ${row.total} imoveis | ${row.sem_imagens} sem img | ${row.sem_external_id} sem external_id`);
    });

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

run();
