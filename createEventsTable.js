import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  client.query(`
    CREATE TABLE IF NOT EXISTS public.events (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id),
      lead_id UUID REFERENCES leads(id),
      title TEXT NOT NULL,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      event_type TEXT DEFAULT 'visit',
      property_id UUID REFERENCES properties(id),
      status TEXT DEFAULT 'scheduled',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `).then(r => {
    console.log('Table events created', r);
    client.end();
  }).catch(e => {
    console.error(e);
    client.end();
  });
});
