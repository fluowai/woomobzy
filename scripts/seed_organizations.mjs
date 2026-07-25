import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega as variáveis de ambiente do .env na raiz do projeto
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Tenta usar a SERVICE_ROLE_KEY primeiro para ter poderes de admin. Se não, usa a VITE (que talvez tenha restrições RLS, mas se houver disable RLS ou policy, pode funcionar)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltam credenciais do Supabase no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const URBAN_PREFIXES = ['Imobiliária', 'Imóveis', 'Corretora', 'Negócios Imobiliários', 'Habitar', 'Morar Bem', 'Urbana', 'City'];
const URBAN_SUFFIXES = ['Central', 'Urbana', 'Prime', 'Select', 'Cidades', 'Metrópole', 'Premium', 'Exclusive', 'Concept'];

const RURAL_PREFIXES = ['Fazendas', 'Agro', 'Rural', 'Terras', 'Sítios', 'Agropecuária', 'Gado & Terra', 'Campo', 'Chácaras'];
const RURAL_SUFFIXES = ['Brasil', 'do Sul', 'Norte', 'Agro', 'Produtiva', 'Verde', 'Raízes', 'Sul', 'Goiás', 'MT'];

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateName(isRural) {
  const prefixes = isRural ? RURAL_PREFIXES : URBAN_PREFIXES;
  const suffixes = isRural ? RURAL_SUFFIXES : URBAN_SUFFIXES;
  
  const prefix = getRandomItem(prefixes);
  const suffix = getRandomItem(suffixes);
  const number = Math.floor(Math.random() * 9999);
  
  return `${prefix} ${suffix} ${number}`;
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, '-')            // espacos por ifen
    .replace(/[^a-z0-9-]/g, '');     // remove caracteres especiais
}

async function runSeed() {
  console.log("Iniciando geração de 154 imobiliárias...");
  
  const total = 154;
  const urbanCount = 92; // 60%
  const ruralCount = 62; // 40%
  
  const orgs = [];
  
  // Gera Imobiliárias Urbanas
  for (let i = 0; i < urbanCount; i++) {
    const name = generateName(false);
    const uniqueSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    orgs.push({
      name,
      slug: `${generateSlug(name)}-${uniqueSuffix}`,
      status: Math.random() > 0.1 ? 'active' : 'suspended', // 90% ativas
      niche: 'traditional'
    });
  }
  
  // Gera Imobiliárias Rurais
  for (let i = 0; i < ruralCount; i++) {
    const name = generateName(true);
    const uniqueSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    orgs.push({
      name,
      slug: `${generateSlug(name)}-${uniqueSuffix}`,
      status: Math.random() > 0.1 ? 'active' : 'suspended', // 90% ativas
      niche: 'rural'
    });
  }
  
  // Embaralha o array para que não fiquem todas em sequencia
  orgs.sort(() => Math.random() - 0.5);
  
  // Insere em lotes de 50 para evitar sobrecarga no payload e falhas eventuais
  for (let i = 0; i < orgs.length; i += 50) {
    const batch = orgs.slice(i, i + 50);
    const { data, error } = await supabase.from('organizations').insert(batch);
    if (error) {
      console.error(`Erro inserindo lote ${i / 50 + 1}:`, error.message);
    } else {
      console.log(`Lote ${i / 50 + 1} inserido com sucesso (${batch.length} registros)`);
    }
  }
  
  console.log("Seed finalizado com sucesso!");
}

runSeed().catch(err => {
    console.error("Erro inesperado:", err);
    process.exit(1);
});
