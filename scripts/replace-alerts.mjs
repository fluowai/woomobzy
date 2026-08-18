import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const targetDirs = [
  path.join(process.cwd(), 'views'),
  path.join(process.cwd(), 'components')
];

let filesModified = 0;

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  
  walkDir(dir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    const alertRegex = /(?<!\/\/\s*)(?:window\.)?alert\(([\s\S]*?)\)/g;

    let match;
    let modified = false;

    content = content.replace(alertRegex, (match, innerText) => {
      modified = true;
      let isError = innerText.toLowerCase().includes('erro') || innerText.toLowerCase().includes('falha');
      let isSuccess = innerText.toLowerCase().includes('sucesso') || innerText.toLowerCase().includes('salv');
      
      if (isError) return `toast.error(${innerText})`;
      if (isSuccess) return `toast.success(${innerText})`;
      return `toast.info(${innerText})`;
    });

    if (modified) {
      if (!content.includes("from 'sonner'") && !content.includes('from "sonner"')) {
        const importRegex = /^import\s+.*from\s+['"].*['"];?$/gm;
        let lastMatch;
        let m;
        while ((m = importRegex.exec(content)) !== null) {
          lastMatch = m;
        }

        const importStatement = `import { toast } from 'sonner';\n`;
        
        if (lastMatch) {
          content = content.slice(0, lastMatch.index + lastMatch[0].length) + '\n' + importStatement + content.slice(lastMatch.index + lastMatch[0].length);
        } else {
          content = importStatement + content;
        }
      }
      fs.writeFileSync(filePath, content, 'utf8');
      filesModified++;
      console.log(`Modified ${filePath}`);
    }
  });
});

console.log(`Total files modified: ${filesModified}`);
