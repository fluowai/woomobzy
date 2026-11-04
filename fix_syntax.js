import fs from 'fs';

let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');

// Fix USER-DEFINED
sql = sql.replace(
  /location_coordinates\s+USER-DEFINED/g,
  'location_coordinates public.geometry'
);
sql = sql.replace(/geometry\s+USER-DEFINED/g, 'geometry public.geometry');
sql = sql.replace(/geom\s+USER-DEFINED/g, 'geom public.geometry');

// Fix ARRAY definitions
sql = sql.replace(
  /ARRAY DEFAULT '{}'::text\[\]/g,
  "text[] DEFAULT '{}'::text[]"
);
sql = sql.replace(
  /ARRAY DEFAULT '{}'::uuid\[\]/g,
  "uuid[] DEFAULT '{}'::uuid[]"
);
sql = sql.replace(
  /ARRAY NOT NULL DEFAULT ARRAY\['public'::text, 'auth'::text\]/g,
  "text[] NOT NULL DEFAULT ARRAY['public'::text, 'auth'::text]"
);
sql = sql.replace(
  /ARRAY NOT NULL DEFAULT ARRAY\['whatsapp-media'::text, 'imobzyimg'::text, 'imobzymsg'::text, 'documents'::text, 'exports'::text\]/g,
  "text[] NOT NULL DEFAULT ARRAY['whatsapp-media'::text, 'imobzyimg'::text, 'imobzymsg'::text, 'documents'::text, 'exports'::text]"
);

// Generic ARRAY, replacement
sql = sql.replace(/\s+ARRAY,/g, ' text[],');

// And ARRAY at end of lines
sql = sql.replace(/\s+ARRAY$/g, ' text[]');

fs.writeFileSync('FULL_DATABASE_SCHEMA.sql', sql);
console.log('Fixed syntax errors.');
