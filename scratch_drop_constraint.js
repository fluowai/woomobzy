process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import pg from 'pg';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected');

  const query = `
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'rental_contracts'::regclass 
    AND contype = 'c' 
    AND pg_get_constraintdef(oid) LIKE '%status%';
  `;
  const res = await client.query(query);
  console.log('Found constraints:', res.rows);

  for (const row of res.rows) {
    console.log(`Dropping constraint: ${row.conname}`);
    await client.query(
      `ALTER TABLE rental_contracts DROP CONSTRAINT "${row.conname}"`
    );
  }

  console.log('Done');
  await client.end();
}

main().catch(console.error);
