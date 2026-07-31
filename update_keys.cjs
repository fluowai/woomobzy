const fs = require('fs');
const path = require('path');

const NEW_REF = process.env.SUPABASE_PROJECT_REF;
const NEW_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const NEW_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEW_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

const missing = [];
if (!NEW_REF) missing.push('SUPABASE_PROJECT_REF');
if (!NEW_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY');
if (!NEW_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
if (!NEW_JWT_SECRET) missing.push('SUPABASE_JWT_SECRET');

if (missing.length) {
  console.error(
    'Variáveis obrigatórias ausentes: ' +
      missing.join(', ') +
      '. Nenhum arquivo foi alterado.'
  );
  process.exit(1);
}

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
  'execute_db.mjs',
];

filesToProcess.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace legacy project ref IDs with the new one.
    content = content.split('lkzcsaydpcnypdevoikr').join(NEW_REF);
    content = content.split('rzvwqygmbtwflndtsvuz').join(NEW_REF);

    // Keys/JWT lines (env and YAML variants)
    content = content.replace(
      /VITE_SUPABASE_ANON_KEY=.*/g,
      `VITE_SUPABASE_ANON_KEY="${NEW_ANON_KEY}"`
    );
    content = content.replace(
      /VITE_SUPABASE_ANON_KEY: ".*"/g,
      `VITE_SUPABASE_ANON_KEY: "${NEW_ANON_KEY}"`
    );
    content = content.replace(
      /VITE_SUPABASE_ANON_KEY: '.*'/g,
      `VITE_SUPABASE_ANON_KEY: '${NEW_ANON_KEY}'`
    );

    content = content.replace(
      /SUPABASE_SERVICE_ROLE_KEY=.*/g,
      `SUPABASE_SERVICE_ROLE_KEY="${NEW_SERVICE_ROLE_KEY}"`
    );
    content = content.replace(
      /SUPABASE_SERVICE_ROLE_KEY: ".*"/g,
      `SUPABASE_SERVICE_ROLE_KEY: "${NEW_SERVICE_ROLE_KEY}"`
    );
    content = content.replace(
      /SUPABASE_SERVICE_ROLE_KEY: '.*'/g,
      `SUPABASE_SERVICE_ROLE_KEY: '${NEW_SERVICE_ROLE_KEY}'`
    );

    content = content.replace(
      /SUPABASE_JWT_SECRET=.*/g,
      `SUPABASE_JWT_SECRET="${NEW_JWT_SECRET}"`
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
});
