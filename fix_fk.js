import fs from 'fs';

try {
  let sql = fs.readFileSync('base_schema_from_user.sql', 'utf8');

  let lines = sql.split('\n');
  let newLines = [];
  let alterStatements = [];

  let currentTable = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    let tableMatch = line.match(/CREATE\s+TABLE\s+([a-zA-Z0-9_."]+)/i);
    if (tableMatch) {
      currentTable = tableMatch[1];
    }

    if (line.match(/CONSTRAINT\s+[a-zA-Z0-9_"]+\s+FOREIGN\s+KEY/i)) {
      let constraintLine = line.trim();
      if (constraintLine.startsWith(',')) {
        constraintLine = constraintLine.substring(1).trim();
      }
      if (constraintLine.endsWith(',')) {
        constraintLine = constraintLine.substring(0, constraintLine.length - 1);
      }
      alterStatements.push(
        `ALTER TABLE ${currentTable} ADD ${constraintLine};`
      );
    } else {
      newLines.push(line);
    }
  }

  let newSql = newLines.join('\n');
  newSql = newSql.replace(/,\s*\n\s*\);/g, '\n);');

  newSql += '\n\n-- ==========================================\n';
  newSql += '-- FOREIGN KEYS (ADDED AT THE END TO AVOID DEPENDENCY ISSUES)\n';
  newSql += '-- ==========================================\n';
  newSql += alterStatements.join('\n') + '\n';

  fs.writeFileSync('base_schema_from_user_FIXED.sql', newSql);
  console.log('Fixed FKs: ' + alterStatements.length);
} catch (e) {
  console.error(e);
}
