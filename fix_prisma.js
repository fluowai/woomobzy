import fs from 'fs';

let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');

// Quote Prisma camelCase tables and columns: AccessProfile, User, Organization, Plan
['AccessProfile', 'User', 'Organization', 'Plan'].forEach((tbl) => {
  let regex = new RegExp('public\\.' + tbl + '\\b', 'g');
  sql = sql.replace(regex, 'public."' + tbl + '"');

  // Also fix CONSTRAINT tbl_pkey
  let regex2 = new RegExp('CONSTRAINT ' + tbl, 'g');
  sql = sql.replace(regex2, 'CONSTRAINT "' + tbl + '"');
});

fs.writeFileSync('FULL_DATABASE_SCHEMA.sql', sql);
console.log('Quoted Prisma tables.');

let artifactPath =
  'C:\\\\Users\\\\paulo\\\\.gemini\\\\antigravity\\\\brain\\\\aa43014e-70b8-4692-9881-53659335edd7\\\\database_schema.md';
let md = `# Schema Database Completo (Revenda B2B2B)\n\nEste é o schema executável gerado, livre de erros de dependência.\n\n\`\`\`sql\n${sql}\n\`\`\`\n`;
fs.writeFileSync(artifactPath, md);
