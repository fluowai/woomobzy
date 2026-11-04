const fs = require('fs');

try {
  let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');

  // More permissive regex to catch the constraint line
  // Matches ", CONSTRAINT <name> FOREIGN KEY (...) REFERENCES ... " up to the end of the line/clause
  const fkRegex =
    /,\s*(CONSTRAINT\s+[a-zA-Z0-9_"]+\s+FOREIGN\s+KEY\s*\([^)]+\)\s*REFERENCES\s+[a-zA-Z0-9_."]+\s*\([^)]+\)[^,\n]*)/g;

  let alterStatements = [];

  // Table block regex
  const tableRegex = /CREATE\s+TABLE\s+([a-zA-Z0-9_."]+)\s*\(([\s\S]*?)\s*\);/g;

  let newSql = sql.replace(tableRegex, (match, tableName, tableBody) => {
    let newBody = tableBody;

    let fkMatch;
    while ((fkMatch = fkRegex.exec(tableBody)) !== null) {
      let fullMatch = fkMatch[0];
      let constraintDef = fkMatch[1];
      alterStatements.push(`ALTER TABLE ${tableName} ADD ${constraintDef};`);
      newBody = newBody.replace(fullMatch, '');
    }

    return `CREATE TABLE ${tableName} (${newBody}\n);`;
  });

  newSql += '\n\n-- ==========================================\n';
  newSql += '-- FOREIGN KEYS (ADDED AT THE END TO AVOID DEPENDENCY ISSUES)\n';
  newSql += '-- ==========================================\n';
  newSql += alterStatements.join('\n') + '\n';

  fs.writeFileSync('FULL_DATABASE_SCHEMA_FIXED.sql', newSql);
  console.log('Fixed FKs: ' + alterStatements.length);
} catch (e) {
  console.error(e);
}
