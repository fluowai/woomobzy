const fs = require('fs');
const path = require('path');

const OLD_URL = 'lkzcsaydpcnypdevoikr';
const NEW_URL = 'epgaftsjmqmpczvzsrcc';

const replacements = {
  // Replace old URL ID with new URL ID
  'lkzcsaydpcnypdevoikr': 'epgaftsjmqmpczvzsrcc',
  'rzvwqygmbtwflndtsvuz': 'epgaftsjmqmpczvzsrcc',

  // Replace DB URLs
  'postgresql://postgres.lkzcsaydpcnypdevoikr:rIGzYBzBCDZslOOH@aws-1-sa-east-1.pooler.supabase.com:5432/postgres': 'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.rzvwqygmbtwflndtsvuz:JFke4YBBiDoabTdK@aws-0-sa-east-1.pooler.supabase.com:6543/postgres': 'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',

  // Replace anon keys (we will just replace the whole line for anon and service role in env files)
};

const dirsToScan = [
  '.',
  'public',
];

const filesToProcess = [
  '.env',
  '.env.example',
  '.env.production',
  '.env.production.template',
  'docker-compose.yml',
  'docker-compose.local.yml',
  'portainer-stack.yml',
  'portainer-stack-fazendasbrasil-pronta.yml',
  'portainer-stack-imobfluow-filled.yml',
  'portainer-stack-imobfluow-flat-filled.yml',
  'portainer-stack-pronta-corrigida.yml',
  'public/env-config.js',
  'execute_db.mjs'
];

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Simple replaces
    for (const [oldVal, newVal] of Object.entries(replacements)) {
      content = content.split(oldVal).join(newVal);
    }
    
    // Specific regex for anon and service keys
    content = content.replace(/VITE_SUPABASE_ANON_KEY=.*/g, 'VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NjUyNDUsImV4cCI6MjEwMDU0MTI0NX0.3p4x2i_BtGwzp4ElNV-HqeeVlQcQS53SWai5nJ2NTL0"');
    content = content.replace(/VITE_SUPABASE_ANON_KEY: ".*"/g, 'VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NjUyNDUsImV4cCI6MjEwMDU0MTI0NX0.3p4x2i_BtGwzp4ElNV-HqeeVlQcQS53SWai5nJ2NTL0"');
    content = content.replace(/VITE_SUPABASE_ANON_KEY: '.*'/g, "VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NjUyNDUsImV4cCI6MjEwMDU0MTI0NX0.3p4x2i_BtGwzp4ElNV-HqeeVlQcQS53SWai5nJ2NTL0'");
    
    content = content.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/g, 'SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk2NTI0NSwiZXhwIjoyMTAwNTQxMjQ1fQ.tx6ap1RQ-gPCWn_vQQ7Up-YVknjwnx2F27HWAAUqtwo"');
    content = content.replace(/SUPABASE_SERVICE_ROLE_KEY: ".*"/g, 'SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk2NTI0NSwiZXhwIjoyMTAwNTQxMjQ1fQ.tx6ap1RQ-gPCWn_vQQ7Up-YVknjwnx2F27HWAAUqtwo"');
    content = content.replace(/SUPABASE_SERVICE_ROLE_KEY: '.*'/g, "SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk2NTI0NSwiZXhwIjoyMTAwNTQxMjQ1fQ.tx6ap1RQ-gPCWn_vQQ7Up-YVknjwnx2F27HWAAUqtwo'");

    // JWT secret
    content = content.replace(/SUPABASE_JWT_SECRET=.*/g, 'SUPABASE_JWT_SECRET="RISMBLbL3RvTt216f7d3FFQq1SE8pXDMCkcubtboBqT87vV87Da6KvWVY7fDdLHxY918CE3bQm6zy4QGCdmutQ=="');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
});
