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
  connectionString: buildConnectionString(
    process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  ),
  ssl: { rejectUnauthorized: false },
});

const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';

async function run() {
  await client.connect();

  try {
    const { rows: props } = await client.query(
      `
      SELECT id, title, price, images, external_id
      FROM properties
      WHERE organization_id = $1
      ORDER BY LOWER(TRIM(title))
    `,
      [PAMAS_ID]
    );

    // Check how many have external_id now
    const withExternal = props.filter(
      (p) => p.external_id && p.external_id.length > 0
    );
    const withoutExternal = props.filter(
      (p) => !p.external_id || p.external_id.length === 0
    );
    const withImages = props.filter(
      (p) => p.images && Array.isArray(p.images) && p.images.length > 0
    );

    console.log('=== PAMAS FINAL STATUS ===');
    console.log(`Total: ${props.length}`);
    console.log(`Com external_id: ${withExternal.length}`);
    console.log(`Sem external_id: ${withoutExternal.length}`);
    console.log(`Com imagens: ${withImages.length}`);
    console.log(`Sem imagens: ${props.length - withImages.length}`);

    // Show some without external_id
    if (withoutExternal.length > 0) {
      console.log('\nSample sem external_id:');
      withoutExternal.slice(0, 10).forEach((p) => {
        console.log(
          `  ${p.title.substring(0, 60)} | ${p.images?.length || 0} imgs`
        );
      });
    }

    // Check for any remaining duplicates by exact title+price
    const seen = new Set();
    const exactDups = [];
    props.forEach((p) => {
      const key = `${p.title.toLowerCase().trim()}|${p.price}`;
      if (seen.has(key)) {
        exactDups.push(p);
      } else {
        seen.add(key);
      }
    });

    console.log(`\nExact duplicates remaining: ${exactDups.length}`);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

run();
