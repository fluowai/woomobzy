const fs = require('fs');
const file = 'scripts/run-migrations.mjs';
let content = fs.readFileSync(file, 'utf8');
const old = "  'migrations/20260730_fix_contracts_legal_tab.sql',\n  'migrations/20260803_domain_purpose.sql',";
const rep = "  'migrations/20260730_fix_contracts_legal_tab.sql',\n  'migrations/20260803_system_contracts.sql',\n  'migrations/20260803_system_contracts_analysis.sql',\n  'migrations/20260803_domain_purpose.sql',";
if (content.includes(old)) {
  content = content.replace(old, rep, 1);
  fs.writeFileSync(file, content);
  console.log('OK');
} else {
  console.log('NOT FOUND');
  const idx = content.indexOf('20260730_fix_contracts_legal_tab.sql');
  console.log(content.slice(idx, idx + 200));
}
