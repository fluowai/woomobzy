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

async function run() {
  await client.connect();

  try {
    const { rows: props } = await client.query(`
      SELECT id, title, price, images, external_id, created_at
      FROM properties
      WHERE organization_id = $1
      ORDER BY LOWER(TRIM(title)), created_at
    `, [PAMAS_ID]);
    
    const groups = new Map();
    props.forEach(p => {
      const key = p.title.toLowerCase().trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });
    
    let wouldKeep = 0;
    let wouldDelete = 0;
    let wouldHaveImages = 0;
    let wouldStillNoImages = 0;
    
    groups.forEach((items) => {
      if (items.length === 1) {
        wouldKeep++;
        if (items[0].images && Array.isArray(items[0].images) && items[0].images.length > 0) {
          wouldHaveImages++;
        } else {
          wouldStillNoImages++;
        }
        return;
      }
      
      const sorted = items.sort((a, b) => {
        const aHasImages = (a.images && Array.isArray(a.images) && a.images.length > 0) ? 1 : 0;
        const bHasImages = (b.images && Array.isArray(b.images) && b.images.length > 0) ? 1 : 0;
        if (bHasImages !== aHasImages) return bHasImages - aHasImages;
        return new Date(a.created_at) - new Date(b.created_at);
      });
      
      wouldKeep++;
      if ((sorted[0].images && Array.isArray(sorted[0].images) && sorted[0].images.length > 0)) {
        wouldHaveImages++;
      } else {
        wouldStillNoImages++;
      }
      wouldDelete += items.length - 1;
    });
    
    console.log('=== APOS DEDUPLICACAO ===');
    console.log(`Total properties: ${wouldKeep}`);
    console.log(`Com imagens: ${wouldHaveImages}`);
    console.log(`Sem imagens: ${wouldStillNoImages}`);
    console.log(`Duplicates deletados: ${wouldDelete}`);
    
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

run();
