import fs from 'fs';

let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');

// Fix the missing closing quotes on pkey constraints
['AccessProfile', 'User', 'Organization', 'Plan'].forEach(tbl => {
    let badPattern = new RegExp('CONSTRAINT "' + tbl + '_pkey PRIMARY KEY', 'g');
    sql = sql.replace(badPattern, 'CONSTRAINT "' + tbl + '_pkey" PRIMARY KEY');
    
    // Also check for foreign key missing closing quotes if any
    let badFk = new RegExp('CONSTRAINT "' + tbl + '_([a-zA-Z0-9_]+) FOREIGN KEY', 'g');
    sql = sql.replace(badFk, 'CONSTRAINT "' + tbl + '_$1" FOREIGN KEY');
});

fs.writeFileSync('FULL_DATABASE_SCHEMA.sql', sql);
console.log('Fixed missing constraint quotes.');

let artifactPath = 'C:\\\\Users\\\\paulo\\\\.gemini\\\\antigravity\\\\brain\\\\aa43014e-70b8-4692-9881-53659335edd7\\\\database_schema.md';
let md = `# Schema Database Completo (Revenda B2B2B)\n\nEste é o schema executável gerado, livre de erros de dependência.\n\n\`\`\`sql\n${sql}\n\`\`\`\n`;
fs.writeFileSync(artifactPath, md);
