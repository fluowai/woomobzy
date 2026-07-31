const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'server', 'api', 'locacao');

function replaceInDir(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      content = content.replace(
        /from\('leases'\)/g,
        "from('rental_contracts')"
      );
      content = content.replace(
        /from\('lease_overview'\)/g,
        "from('rental_contracts')"
      );
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
      }
    }
  }
}

replaceInDir(dir);
console.log('Done!');
