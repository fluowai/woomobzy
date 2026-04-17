
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const tables = ['site_settings', 'properties', 'leads', 'profiles'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) console.log(`TABLE:${t}:MISSING:${error.message}`);
    else console.log(`TABLE:${t}:EXISTS`);
  }
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) console.log(`BUCKETS:ERROR:${error.message}`);
  else {
    ['agency-assets', 'property-images'].forEach(b => {
      const exists = buckets.find(bucket => bucket.name === b);
      console.log(`BUCKET:${b}:${exists ? 'EXISTS' : 'MISSING'}`);
    });
  }
}
check();
