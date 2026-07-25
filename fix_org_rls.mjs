import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const client = await pool.connect();
    
    // Drop all the potentially recursive reseller policies on organizations
    await client.query(`
      DROP POLICY IF EXISTS "Reseller can see sub-organizations" ON public.organizations;
      DROP POLICY IF EXISTS "Reseller view sub-organizations" ON public.organizations;
      DROP POLICY IF EXISTS "Reseller update sub-organizations" ON public.organizations;
      DROP POLICY IF EXISTS "Reseller insert sub-organizations" ON public.organizations;
      DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
    `);
    
    // Create clean policies for organizations
    
    // 1. Users can view their own organization
    await client.query(`
      CREATE POLICY "Users can view own organization" ON public.organizations
      FOR SELECT USING (
        id = public.get_auth_organization_id()
      );
    `);
    
    // 2. Resellers can view their sub-organizations
    await client.query(`
      CREATE POLICY "Reseller view sub-organizations" ON public.organizations
      FOR SELECT USING (
        parent_id = public.get_auth_organization_id()
      );
    `);

    // 3. Resellers can insert sub-organizations
    await client.query(`
      CREATE POLICY "Reseller insert sub-organizations" ON public.organizations
      FOR INSERT WITH CHECK (
        parent_id = public.get_auth_organization_id()
      );
    `);

    // 4. Resellers can update sub-organizations
    await client.query(`
      CREATE POLICY "Reseller update sub-organizations" ON public.organizations
      FOR UPDATE USING (
        parent_id = public.get_auth_organization_id()
      );
    `);

    // 5. MEGA ADMIN / SUPERADMIN can view all organizations
    await client.query(`
      CREATE POLICY "Superadmins can view all organizations" ON public.organizations
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE profiles.id = auth.uid() 
          AND (profiles.role = 'superadmin' OR profiles.role = 'MEGA_ADMIN')
        )
      );
    `);
    
    console.log('Fixed organizations RLS policies successfully!');
    client.release();
  } catch (err) {
    console.error('Error fixing RLS:', err);
  } finally {
    pool.end();
  }
}

run();
