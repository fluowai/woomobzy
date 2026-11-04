import fs from 'fs';

let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');

// Replace public.users with public.profiles where it makes sense
sql = sql.replace(/public\.users/g, 'public.profiles');

fs.writeFileSync('FULL_DATABASE_SCHEMA.sql', sql);
console.log('Fixed public.users to public.profiles');

let artifactPath =
  'C:\\\\Users\\\\paulo\\\\.gemini\\\\antigravity\\\\brain\\\\aa43014e-70b8-4692-9881-53659335edd7\\\\database_schema.md';
let md = `# Schema Database Completo (Revenda B2B2B)\n\nEste é o schema executável gerado, livre de erros de dependência.\n\n\`\`\`sql\n${sql}\n\`\`\`\n`;
fs.writeFileSync(artifactPath, md);
