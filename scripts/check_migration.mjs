import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const rawUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';

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

const connectionString = buildConnectionString(rawUrl);

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';
const MEGA_ID = '52757ffb-dd3a-4106-8783-31ebe01a1455';
const DELAZARI_ID = 'e2403fc5-fabd-4715-a6e6-eae5d0603106';

async function run() {
  await client.connect();

  try {
    // 1. List all organizations (imobiliárias) and their hierarchy
    console.log('=== TODAS AS IMOBILIÁRIAS / ORGANIZAÇÕES ===');
    const orgs = await client.query(`
      SELECT id, name, slug, is_reseller, parent_id, status
      FROM organizations
      ORDER BY is_reseller DESC, name
    `);
    orgs.rows.forEach((org) => {
      const isReseller = org.is_reseller ? 'SIM (Revenda)' : 'Não';
      console.log(
        `${org.name} | ${org.slug} | Reseller: ${isReseller} | Parent: ${org.parent_id || 'nenhum'} | Status: ${org.status}`
      );
    });

    // 2. Count properties by organization
    console.log('\n=== CONTAGEM DE IMÓVEIS POR IMOBILIÁRIA ===');
    const counts = await client.query(`
      SELECT o.name, o.slug, o.id, COUNT(p.id) as total
      FROM organizations o
      LEFT JOIN properties p ON p.organization_id = o.id
      GROUP BY o.id, o.name, o.slug
      ORDER BY total DESC
    `);
    counts.rows.forEach((row) => {
      console.log(`${row.name} (${row.slug}): ${row.total} imóveis`);
    });

    // 3. List Pamasimóveis properties with suspicious external_id (Mega URLs in Pamas)
    console.log(
      '\n=== IMÓVEIS DA PAMASIMÓVEIS COM external_id DO MEGA INVESTIMENTOS ==='
    );
    const wrongInPamas = await client.query(
      `
      SELECT id, title, external_id, images
      FROM properties
      WHERE organization_id = $1
        AND external_id LIKE $2
      ORDER BY created_at
    `,
      [PAMAS_ID, 'https://megainvestimoveis.com.br/%']
    );

    if (wrongInPamas.rows.length === 0) {
      console.log(
        'Nenhum imóvel do Mega Investimentos encontrado na Pamasimóveis.'
      );
    } else {
      console.log(`Encontrados ${wrongInPamas.rows.length} imóveis TROCADOS:`);
      wrongInPamas.rows.forEach((row) => {
        console.log(`  - ID: ${row.id}`);
        console.log(`    Título: ${row.title}`);
        console.log(`    External ID: ${row.external_id}`);
        console.log(`    Imagens: ${row.images ? row.images.length : 0}`);
      });
    }

    // 4. List Mega Investimentos properties with suspicious external_id (Pamas URLs in Mega)
    console.log(
      '\n=== IMÓVEIS DO MEGA INVESTIMENTOS COM external_id DA PAMASIMÓVEIS ==='
    );
    const wrongInMega = await client.query(
      `
      SELECT id, title, external_id, images
      FROM properties
      WHERE organization_id = $1
        AND external_id LIKE $2
      ORDER BY created_at
    `,
      [MEGA_ID, 'https://pamasimoveis.com.br/%']
    );

    if (wrongInMega.rows.length === 0) {
      console.log(
        'Nenhum imóvel da Pamasimóveis encontrado no Mega Investimentos.'
      );
    } else {
      console.log(`Encontrados ${wrongInMega.rows.length} imóveis TROCADOS:`);
      wrongInMega.rows.forEach((row) => {
        console.log(`  - ID: ${row.id}`);
        console.log(`    Título: ${row.title}`);
        console.log(`    External ID: ${row.external_id}`);
        console.log(`    Imagens: ${row.images ? row.images.length : 0}`);
      });
    }

    // 5. Full listing of Pamas properties (sample)
    console.log('\n=== LISTAGEM COMPLETA: PAMASIMÓVEIS ===');
    const pamasProps = await client.query(
      `
      SELECT id, title, price, status, purpose, external_id, 
             array_length(images, 1) as img_count,
             created_at
      FROM properties
      WHERE organization_id = $1
      ORDER BY created_at
    `,
      [PAMAS_ID]
    );

    console.log(`Total: ${pamasProps.rows.length} imóveis`);
    pamasProps.rows.forEach((row, i) => {
      console.log(
        `  ${i + 1}. [${row.id}] ${row.title} | R$ ${row.price} | ${row.status} | ${row.purpose} | ${row.img_count || 0} imgs | ${row.external_id || 'sem external_id'}`
      );
    });

    // 6. Full listing of Mega properties (sample)
    console.log('\n=== LISTAGEM COMPLETA: MEGA INVESTIMENTOS ===');
    const megaProps = await client.query(
      `
      SELECT id, title, price, status, purpose, external_id,
             array_length(images, 1) as img_count,
             created_at
      FROM properties
      WHERE organization_id = $1
      ORDER BY created_at
    `,
      [MEGA_ID]
    );

    console.log(`Total: ${megaProps.rows.length} imóveis`);
    megaProps.rows.forEach((row, i) => {
      console.log(
        `  ${i + 1}. [${row.id}] ${row.title} | R$ ${row.price} | ${row.status} | ${row.purpose} | ${row.img_count || 0} imgs | ${row.external_id || 'sem external_id'}`
      );
    });

    // 7. Check for reseller hierarchy
    console.log('\n=== HIERARQUIA DE REVENDA ===');
    const hierarchy = await client.query(
      `
      SELECT 
        r.name as revenda,
        c.name as cliente,
        c.slug as cliente_slug,
        c.id as cliente_id,
        COUNT(p.id) as total_imoveis
      FROM organizations r
      LEFT JOIN organizations c ON c.parent_id = r.id
      LEFT JOIN properties p ON p.organization_id = c.id
      WHERE r.is_reseller = true OR r.id = $1
      GROUP BY r.id, r.name, c.id, c.name, c.slug
      ORDER BY r.name, c.name
    `,
      [DELAZARI_ID]
    );

    hierarchy.rows.forEach((row) => {
      const total = row.total_imoveis !== null ? row.total_imoveis : 0;
      console.log(
        `${row.revenda} → ${row.cliente || '(nenhum)'}: ${total} imóveis`
      );
    });
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

run();
