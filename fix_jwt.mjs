import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const jwtSecret = process.env.SUPABASE_JWT_SECRET;

if (!jwtSecret) {
  throw new Error('SUPABASE_JWT_SECRET é obrigatória para fix_jwt.mjs');
}

const files = [
  'portainer-stack-fazendasbrasil-pronta.yml',
  'portainer-stack-imobfluow-filled.yml',
  'portainer-stack-imobfluow-flat-filled.yml',
  'portainer-stack-pronta-corrigida.yml',
  'portainer-stack.yml',
  'docker-compose.yml',
  'docker-compose.local.yml',
];

files.forEach((f) => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(
      /SUPABASE_JWT_SECRET: '.*'/g,
      `SUPABASE_JWT_SECRET: '${jwtSecret}'`
    );
    c = c.replace(
      /SUPABASE_JWT_SECRET="\${.*}"/g,
      `SUPABASE_JWT_SECRET="${jwtSecret}"`
    );
    fs.writeFileSync(f, c);
    console.log('Fixed JWT in', f);
  }
});
