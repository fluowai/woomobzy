import pg from 'pg';

const pool = new pg.Pool({
  connectionString:
    'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const client = await pool.connect();

    // Create the security definer function as plpgsql to prevent inlining
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_auth_organization_id()
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        org_id uuid;
      BEGIN
        SELECT organization_id INTO org_id FROM public.profiles WHERE id = auth.uid();
        RETURN org_id;
      END;
      $$;
    `);

    console.log('Function converted to plpgsql to prevent inlining!');
    client.release();
  } catch (err) {
    console.error('Error fixing RLS:', err);
  } finally {
    pool.end();
  }
}

run();
