const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2] || '.';
const replacements = [
  { from: /btn-premium/g, to: 'btn btn-primary' },
  { from: /input-premium/g, to: 'input-field' },
  { from: /bg-\[#05070a\]/g, to: 'bg-bg-primary' },
  { from: /text-white(?!-)/g, to: 'text-text-primary' },
  { from: /#007850/g, to: 'var(--color-primary)' },
  { from: /border-brand/g, to: 'border-primary' },
  { from: /bg-brand/g, to: 'bg-primary' },
  { from: /text-brand/g, to: 'text-primary' },
  { from: /"text-3xl font-bold text-white/g, to: '"text-3xl font-bold text-text-primary' },
  { from: /"text-2xl font-bold text-white/g, to: '"text-2xl font-bold text-text-primary' },
  { from: /"text-xl font-bold text-white/g, to: '"text-xl font-bold text-text-primary' },
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist' && f !== '.vercel') {
        walkDir(dirPath, callback);
      }
    } else {
      if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.css')) {
        callback(dirPath);
      }
    }
  });
}

walkDir(rootDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  replacements.forEach(rep => {
    newContent = newContent.replace(rep.from, rep.to);
  });
  
  if (newContent !== content) {
    console.log(`Updated: ${filePath}`);
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
});
