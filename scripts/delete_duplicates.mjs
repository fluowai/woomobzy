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
    console.log('=== DEDUPLICACAO PAMAS - DELETANDO ===\n');
    
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
    
    const toDelete = [];
    
    groups.forEach((items) => {
      if (items.length === 1) return;
      
      const sorted = items.sort((a, b) => {
        const aHasImages = (a.images && Array.isArray(a.images) && a.images.length > 0) ? 1 : 0;
        const bHasImages = (b.images && Array.isArray(b.images) && b.images.length > 0) ? 1 : 0;
        if (bHasImages !== aHasImages) return bHasImages - aHasImages;
        return new Date(a.created_at) - new Date(b.created_at);
      });
      
      for (let i = 1; i < sorted.length; i++) {
        toDelete.push(sorted[i].id);
      }
    });
    
    console.log(`Deletando ${toDelete.length} duplicates...`);
    
    if (toDelete.length > 0) {
      const res = await client.query(`
        DELETE FROM properties
        WHERE id = ANY($1::uuid[])
      `, [toDelete]);
      
      console.log(`Deletados ${res.rowCount} properties.`);
    }
    
    // Verify
    const { rows: remaining } = await client.query(`
      SELECT COUNT(*) as count,
             COUNT(CASE WHEN images IS NULL OR array_length(images, 1) = 0 THEN 1 END) as sem_imagens
      FROM properties
      WHERE organization_id = $1
    `, [PAMAS_ID]);
    
    console.log(`\nProperties restantes: ${remaining[0]?.count || 0}`);
    console.log(`Sem imagens: ${remaining[0]?.sem_imagens || 0}`);
    
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

run();
