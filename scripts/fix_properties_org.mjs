import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const pamasimoveisId = '836c2313-0c09-4f07-be1a-501ba188e02d';
const megaInvestimentosId = '52757ffb-dd3a-4106-8783-31ebe01a1455';

async function run() {
  await client.connect();
  
  try {
    const res = await client.query(`
      UPDATE properties
      SET organization_id = $1
      WHERE organization_id = $2
        AND external_id LIKE 'https://megainvestimoveis.com.br/%'
      RETURNING id, title;
    `, [megaInvestimentosId, pamasimoveisId]);
    
    console.log(`Updated ${res.rowCount} properties to Mega Investimentos.`);
    
    // Also, update the scraper script to use the correct ID for any future runs
  } catch (err) {
    console.error('Error updating properties:', err);
  } finally {
    await client.end();
  }
}

run();
