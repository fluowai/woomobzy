import pg from 'pg';
import dotenv from 'dotenv';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config();

const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    
    // Check RLS on lead_appointments
    const res = await client.query(`
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE tablename = 'lead_appointments';
    `);
    console.log('lead_appointments RLS:', res.rows);
    
    // Check policies
    const pol = await client.query(`
        SELECT policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'lead_appointments';
    `);
    console.log('Policies:', pol.rows);

    await client.end();
}
run();
