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
    
    // Set default for organization_id
    await client.query(`
        ALTER TABLE lead_appointments 
        ALTER COLUMN organization_id SET DEFAULT get_my_org_id();
    `);
    console.log('Set default on lead_appointments.organization_id');
    
    await client.end();
}
run();
