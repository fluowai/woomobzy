import pg from 'pg';
import { randomUUID } from 'node:crypto';

const connectionString =
  process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('SUPABASE_DB_URL or DATABASE_URL is required');
}

const connectionURL = new URL(connectionString);
for (const parameter of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
  connectionURL.searchParams.delete(parameter);
}

const client = new pg.Client({
  connectionString: connectionURL.toString(),
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  const constraints = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_instances'::regclass
      AND contype = 'c'
    ORDER BY conname
  `);
  const duplicates = await client.query(`
    SELECT jid, count(*)::int AS count
    FROM public.whatsapp_instances
    WHERE NULLIF(jid, '') IS NOT NULL
    GROUP BY jid
    HAVING count(*) > 1
  `);
  const hardeningObjects = await client.query(`
    SELECT
      to_regclass('public.whatsapp_instance_sessions') IS NOT NULL AS sessions_table,
      to_regclass('public.whatsapp_instance_leases') IS NOT NULL AS leases_table,
      to_regclass('public.uq_whatsapp_instances_device_jid') IS NOT NULL AS unique_jid_index
  `);

  console.log(
    JSON.stringify(
      {
        constraints: constraints.rows,
        duplicate_jid_groups: duplicates.rowCount,
        objects: hardeningObjects.rows[0],
      },
      null,
      2
    )
  );

  if (process.argv.includes('--probe')) {
    const firstID = randomUUID();
    const secondID = randomUUID();
    const fakeJID = `hardening-probe-${randomUUID()}@s.whatsapp.net`;
    let duplicateBlocked = false;
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO public.whatsapp_instances (id, name, status, jid)
         VALUES ($1, 'hardening-probe', 'connecting', $2)`,
        [firstID, fakeJID]
      );
      const binding = await client.query(
        `SELECT device_jid FROM public.whatsapp_instance_sessions WHERE instance_id = $1`,
        [firstID]
      );
      if (binding.rows[0]?.device_jid !== fakeJID) {
        throw new Error('session binding trigger probe failed');
      }

      await client.query(
        `INSERT INTO public.whatsapp_instance_leases (instance_id, owner_id, expires_at)
         VALUES ($1, 'hardening-probe', now() + interval '45 seconds')`,
        [firstID]
      );
      const renewed = await client.query(
        `UPDATE public.whatsapp_instance_leases
         SET expires_at = now() + interval '60 seconds'
         WHERE instance_id = $1 AND owner_id = 'hardening-probe'`,
        [firstID]
      );
      if (renewed.rowCount !== 1) throw new Error('lease renewal probe failed');

      await client.query('SAVEPOINT duplicate_jid_probe');
      try {
        await client.query(
          `INSERT INTO public.whatsapp_instances (id, name, status, jid)
           VALUES ($1, 'duplicate-jid-probe', 'connecting', $2)`,
          [secondID, fakeJID]
        );
      } catch (error) {
        duplicateBlocked = error.code === '23505';
        await client.query('ROLLBACK TO SAVEPOINT duplicate_jid_probe');
      }
      if (!duplicateBlocked) throw new Error('duplicate JID probe was not blocked');
    } finally {
      await client.query('ROLLBACK');
    }
    console.log(
      JSON.stringify({ probe: 'passed', transaction: 'rolled_back', duplicate_jid_blocked: true })
    );
  }
} finally {
  await client.end();
}
