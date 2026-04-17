import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const debugDir = path.join(rootDir, 'scripts', 'debug');

if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir, { recursive: true });
}

const filesInRoot = fs.readdirSync(rootDir);

const patternsToMove = [
  'check_',
  'debug_',
  'test_',
  'temp_',
  'fix_',
  'add_',
  'migrate_',
  'seed_',
  'setup_',
  'update_',
  'count_data.js',
  'debug_detail.html',
  'debug_okaimoveis.html',
  'debug_page.html',
  'debug_scrape.html',
  'diagnostic_output.txt',
  'final_diagnostic.txt',
  'script_output.txt',
  'error.log',
  'build.log'
];

let movedCount = 0;

console.log('🧹 Iniciando limpeza do diretório raiz...');

filesInRoot.forEach(file => {
  const filePath = path.join(rootDir, file);
  
  // Só move arquivos, ignora pastas e arquivos vitais
  if (fs.lstatSync(filePath).isFile()) {
    const shouldMove = patternsToMove.some(p => file.startsWith(p)) || 
                       (file.endsWith('.sql') && file !== 'definitive_imobzy_schema.sql' && file !== 'DATABASE_MASTER.sql');

    // NUNCA move arquivos vitais
    const isVital = [
      'package.json', 'package-lock.json', '.env', 'App.tsx', 'index.html', 'vite.config.ts', 
      'tsconfig.json', 'vercel.json', 'ecosystem.config.cjs', 'index.css', 'index.tsx', 'App.tsx'
    ].includes(file);

    if (shouldMove && !isVital) {
      const destPath = path.join(debugDir, file);
      try {
        fs.renameSync(filePath, destPath);
        console.log(`✅ [MOVIDO] ${file} -> scripts/debug/`);
        movedCount++;
      } catch (err) {
        console.error(`❌ [ERRO] Falha ao mover ${file}:`, err.message);
      }
    }
  }
});

console.log(`\n✨ Limpeza concluída! ${movedCount} arquivos organizados em scripts/debug/`);
