import fs from 'fs';

let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');

// Replace any occurrence of " ARRAY NOT NULL DEFAULT " with " text[] NOT NULL DEFAULT "
sql = sql.replace(/\bARRAY\s+NOT\s+NULL\s+DEFAULT\s+'{}'::text\[\]/g, 'text[] NOT NULL DEFAULT \'{}\'::text[]');

// Replace any occurrence of " ARRAY DEFAULT " with " text[] DEFAULT "
sql = sql.replace(/\bARRAY\s+DEFAULT\s+'{}'::text\[\]/g, 'text[] DEFAULT \'{}\'::text[]');
sql = sql.replace(/\bARRAY\s+DEFAULT\s+'{}'::uuid\[\]/g, 'uuid[] DEFAULT \'{}\'::uuid[]');

// We also need to recreate the artifact
fs.writeFileSync('FULL_DATABASE_SCHEMA.sql', sql);
console.log('Fixed ARRAY syntax errors.');

let artifactPath = 'C:\\\\Users\\\\paulo\\\\.gemini\\\\antigravity\\\\brain\\\\aa43014e-70b8-4692-9881-53659335edd7\\\\database_schema.md';
let md = `# Schema Database Completo (Revenda B2B2B)\n\nEste é o schema executável gerado, livre de erros de dependência.\n\n\`\`\`sql\n${sql}\n\`\`\`\n`;
fs.writeFileSync(artifactPath, md);
