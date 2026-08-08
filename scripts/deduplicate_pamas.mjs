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
    console.log('=== DEDUPLICACAO PAMAS ===\n');

    // 1. Find all properties grouped by normalized title
    const { rows: props } = await client.query(
      `
      SELECT id, title, price, images, external_id, created_at
      FROM properties
      WHERE organization_id = $1
      ORDER BY LOWER(TRIM(title)), created_at
    `,
      [PAMAS_ID]
    );

    console.log(`Total properties: ${props.length}`);

    // Group by normalized title
    const groups = new Map();
    props.forEach((p) => {
      const key = p.title.toLowerCase().trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });

    // Find duplicates
    const duplicates = [];
    const toKeep = new Set();

    groups.forEach((items, title) => {
      if (items.length === 1) {
        toKeep.add(items[0].id);
        return;
      }

      // Sort by: has images > no images, then by created_at (oldest first to keep)
      const sorted = items.sort((a, b) => {
        const aHasImages =
          a.images && Array.isArray(a.images) && a.images.length > 0 ? 1 : 0;
        const bHasImages =
          b.images && Array.isArray(b.images) && b.images.length > 0 ? 1 : 0;
        if (bHasImages !== aHasImages) return bHasImages - aHasImages;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      // Keep the first one (most images or oldest)
      toKeep.add(sorted[0].id);

      // Mark rest for deletion
      for (let i = 1; i < sorted.length; i++) {
        duplicates.push({
          id: sorted[i].id,
          title: sorted[i].title,
          images: sorted[i].images?.length || 0,
          reason: `Duplicate of ${sorted[0].id}`,
        });
      }
    });

    console.log(`Unique properties: ${toKeep.size}`);
    console.log(`Duplicates to delete: ${duplicates.length}\n`);

    if (duplicates.length > 0) {
      console.log('Sample duplicates to delete:');
      duplicates.slice(0, 10).forEach((d) => {
        console.log(
          `  ${d.id} | ${d.title.substring(0, 50)} | images: ${d.images}`
        );
      });

      // Ask for confirmation
      console.log('\nExecutar DELETE dos duplicates? (sim/nao)');
      // For now, just show what would be deleted
    }

    // 2. Check properties without external_id
    const { rows: noExternal } = await client.query(
      `
      SELECT COUNT(*) as count
      FROM properties
      WHERE organization_id = $1 AND (external_id IS NULL OR external_id = '')
    `,
      [PAMAS_ID]
    );

    console.log(
      `\nProperties without external_id: ${noExternal[0]?.count || 0}`
    );

    // 3. Check properties without images
    const { rows: noImages } = await client.query(
      `
      SELECT COUNT(*) as count
      FROM properties
      WHERE organization_id = $1 
        AND (images IS NULL OR array_length(images, 1) = 0)
    `,
      [PAMAS_ID]
    );

    console.log(`Properties without images: ${noImages[0]?.count || 0}`);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

run();
