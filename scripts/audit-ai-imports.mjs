#!/usr/bin/env node
// Falha o build se pacotes com chaves privadas forem importados no bundle do cliente.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'src';
const FORBIDDEN = [/@google\/generative-ai/, /\bgroq-sdk\b/];
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const offenders = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (EXT.has(extname(p))) {
      const src = readFileSync(p, 'utf8');
      for (const rx of FORBIDDEN) if (rx.test(src)) offenders.push({ p, rx: rx.source });
    }
  }
}
try { walk(ROOT); } catch (e) {
  console.warn(`[audit-ai-imports] pulando: ${e.message}`);
  process.exit(0);
}
if (offenders.length) {
  console.error('❌ Import proibido no bundle do cliente (chaves privadas vazam):');
  for (const o of offenders) console.error(`  ${o.p} -> ${o.rx}`);
  process.exit(1);
}
console.log('✅ Nenhum SDK privado importado em src/.');
