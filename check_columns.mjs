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
    
    // Check defaults
    const res = await client.query(`
        SELECT column_name, column_default
        FROM information_schema.columns
        WHERE table_name = 'lead_appointments' AND column_name = 'organization_id';
    `);
    console.log('Defaults:', res.rows);
    
    await client.end();
}
run();
