import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Ensure Delazari Imóveis exists as a reseller
    let res = await client.query(`
      SELECT id FROM organizations WHERE name ILIKE 'Delazari Im%veis' LIMIT 1;
    `);

    let delazariId;
    if (res.rows.length > 0) {
      delazariId = res.rows[0].id;
      console.log(`Delazari Imóveis found: ${delazariId}`);
      // Ensure it is marked as reseller
      await client.query(
        `UPDATE organizations SET is_reseller = true WHERE id = $1`,
        [delazariId]
      );
    } else {
      res = await client.query(`
        INSERT INTO organizations (name, slug, is_reseller, platform_domain)
        VALUES ('Delazari Imóveis', 'delazari-imoveis', true, 'delazari.imobzy.com')
        RETURNING id;
      `);
      delazariId = res.rows[0].id;
      console.log(`Created Delazari Imóveis: ${delazariId}`);
    }

    // 2. Ensure Pamasimóveis exists as a client of Delazari
    res = await client.query(`
      SELECT id FROM organizations WHERE slug = 'pamasimoveis' LIMIT 1;
    `);

    let pamasimoveisId;
    if (res.rows.length > 0) {
      pamasimoveisId = res.rows[0].id;
      console.log(`Pamasimóveis found: ${pamasimoveisId}`);
      await client.query(
        `UPDATE organizations SET parent_id = $1 WHERE id = $2`,
        [delazariId, pamasimoveisId]
      );
    } else {
      res = await client.query(
        `
        INSERT INTO organizations (name, slug, parent_id, platform_domain)
        VALUES ('Pamasimóveis', 'pamasimoveis', $1, 'pamasimoveis.imobzy.com')
        RETURNING id;
      `,
        [delazariId]
      );
      pamasimoveisId = res.rows[0].id;
      console.log(`Created Pamasimóveis: ${pamasimoveisId}`);
    }

    // 3. Ensure Mega Investimentos exists as a client of Delazari
    res = await client.query(`
      SELECT id FROM organizations WHERE slug = 'megainvestimentos' LIMIT 1;
    `);

    let megaInvestimentosId;
    if (res.rows.length > 0) {
      megaInvestimentosId = res.rows[0].id;
      console.log(`Mega Investimentos found: ${megaInvestimentosId}`);
      await client.query(
        `UPDATE organizations SET parent_id = $1 WHERE id = $2`,
        [delazariId, megaInvestimentosId]
      );
    } else {
      res = await client.query(
        `
        INSERT INTO organizations (name, slug, parent_id, platform_domain)
        VALUES ('Mega Investimentos', 'megainvestimentos', $1, 'megainvestimentos.imobzy.com')
        RETURNING id;
      `,
        [delazariId]
      );
      megaInvestimentosId = res.rows[0].id;
      console.log(`Created Mega Investimentos: ${megaInvestimentosId}`);
    }

    console.log('\n--- UUIDs ---');
    console.log(`Delazari Imóveis: ${delazariId}`);
    console.log(`Pamasimóveis: ${pamasimoveisId}`);
    console.log(`Mega Investimentos: ${megaInvestimentosId}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

run();
