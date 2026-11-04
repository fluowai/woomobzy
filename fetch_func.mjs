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
    const res = await client.query(`
        SELECT pg_get_functiondef(p.oid) as def
        FROM pg_proc p
        JOIN pg_namespace n ON p.proname = 'search_properties_for_lead' AND p.pronamespace = n.oid
        WHERE n.nspname = 'public';
    `);
    console.log(res.rows[0]?.def || 'Function not found');
    await client.end();
}
run();
