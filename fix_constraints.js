import fs from 'fs';

let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');

// Fix the constraints
['AccessProfile', 'User', 'Organization', 'Plan'].forEach((tbl) => {
  // We want to replace CONSTRAINT "tbl"_something with CONSTRAINT "tbl_something"
  let badPattern = new RegExp('CONSTRAINT "' + tbl + '"_', 'g');
  sql = sql.replace(badPattern, 'CONSTRAINT "' + tbl + '_');
});

// Also fix the PRIMARY KEY constraints which were specifically tbl_pkey
// Actually the above handles it if there was an underscore.
// What if it was CONSTRAINT "AccessProfile" PRIMARY KEY ? (No underscore)
// Usually it's CONSTRAINT "AccessProfile_pkey" PRIMARY KEY.
// Let's verify if there is any 'CONSTRAINT "AccessProfile" ' left over that shouldn't be.
// If my previous script replaced `CONSTRAINT AccessProfile_pkey` it became `CONSTRAINT "AccessProfile"_pkey`, which the above fixes.
// What if there was `CONSTRAINT User_pkey` -> `CONSTRAINT "User"_pkey` -> `CONSTRAINT "User_pkey"`.
// This should work.

fs.writeFileSync('FULL_DATABASE_SCHEMA.sql', sql);
console.log('Fixed constraints.');

let artifactPath =
  'C:\\\\Users\\\\paulo\\\\.gemini\\\\antigravity\\\\brain\\\\aa43014e-70b8-4692-9881-53659335edd7\\\\database_schema.md';
let md = `# Schema Database Completo (Revenda B2B2B)\n\nEste é o schema executável gerado, livre de erros de dependência.\n\n\`\`\`sql\n${sql}\n\`\`\`\n`;
fs.writeFileSync(artifactPath, md);
