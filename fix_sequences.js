import fs from 'fs';

let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');

// Insert sequences at the top
if (!sql.includes('CREATE SEQUENCE IF NOT EXISTS migration_logs_id_seq')) {
  let sequences =
    'CREATE SEQUENCE IF NOT EXISTS migration_logs_id_seq;\nCREATE SEQUENCE IF NOT EXISTS migration_errors_id_seq;\n\n';
  sql = sql.replace(
    'CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;\n\n',
    'CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;\n\n' +
      sequences
  );
}

fs.writeFileSync('FULL_DATABASE_SCHEMA.sql', sql);
console.log('Fixed sequences.');

let artifactPath =
  'C:\\\\Users\\\\paulo\\\\.gemini\\\\antigravity\\\\brain\\\\aa43014e-70b8-4692-9881-53659335edd7\\\\database_schema.md';
let md = `# Schema Database Completo (Revenda B2B2B)\n\nEste é o schema executável gerado, livre de erros de dependência.\n\n\`\`\`sql\n${sql}\n\`\`\`\n`;
fs.writeFileSync(artifactPath, md);
