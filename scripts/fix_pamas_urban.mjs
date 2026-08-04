import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPamasUrban() {
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, niche')
    .eq('slug', 'pamasimoveis')
    .single();

  if (orgError || !org) {
    console.error('Organização pamasimoveis não encontrada:', orgError);
    process.exit(1);
  }

  console.log(`Org encontrada: ${org.name} (${org.id}) | niche atual: ${org.niche}`);

  const { data: updatedOrg, error: updateOrgError } = await supabase
    .from('organizations')
    .update({ niche: 'urbano' })
    .eq('id', org.id)
    .select('id, niche')
    .single();

  if (updateOrgError) {
    console.error('Erro ao atualizar organizations:', updateOrgError.message);
    process.exit(1);
  }

  console.log(`Organização atualizada: niche = ${updatedOrg.niche}`);

  const { data: props, error: propsError } = await supabase
    .from('properties')
    .select('id, title, niche, property_type')
    .eq('organization_id', org.id);

  if (propsError) {
    console.error('Erro ao buscar properties:', propsError.message);
    process.exit(1);
  }

  console.log(`Total de imóveis da PAMAS: ${props.length}`);

  const { error: updatePropsError } = await supabase
    .from('properties')
    .update({ niche: 'urbano' })
    .eq('organization_id', org.id);

  if (updatePropsError) {
    console.error('Erro ao atualizar properties:', updatePropsError.message);
    process.exit(1);
  }

  console.log('Todos os imóveis da PAMAS atualizados para niche = urbano');
}

fixPamasUrban().catch((err) => {
  console.error(err);
  process.exit(1);
});
