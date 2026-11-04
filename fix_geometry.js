import fs from 'fs';

let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');

// Replace public.geometry with geometry
sql = sql.replace(/public\.geometry/g, 'geometry');

// Prepend PostGIS extension creation
if (!sql.includes('CREATE EXTENSION IF NOT EXISTS postgis')) {
  sql =
    'CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;\n\n' + sql;
}

fs.writeFileSync('FULL_DATABASE_SCHEMA.sql', sql);
console.log('Fixed geometry.');

let artifactPath =
  'C:\\\\Users\\\\paulo\\\\.gemini\\\\antigravity\\\\brain\\\\aa43014e-70b8-4692-9881-53659335edd7\\\\database_schema.md';
let md = `# Schema Database Completo (Revenda B2B2B)\n\nEste é o schema executável gerado, livre de erros de dependência.\n\n\`\`\`sql\n${sql}\n\`\`\`\n`;
fs.writeFileSync(artifactPath, md);
