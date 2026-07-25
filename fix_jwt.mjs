import fs from 'fs';

const files = [
  'portainer-stack-fazendasbrasil-pronta.yml',
  'portainer-stack-imobfluow-filled.yml',
  'portainer-stack-imobfluow-flat-filled.yml',
  'portainer-stack-pronta-corrigida.yml',
  'portainer-stack.yml',
  'docker-compose.yml',
  'docker-compose.local.yml'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/SUPABASE_JWT_SECRET: '.*'/g, "SUPABASE_JWT_SECRET: 'RISMBLbL3RvTt216f7d3FFQq1SE8pXDMCkcubtboBqT87vV87Da6KvWVY7fDdLHxY918CE3bQm6zy4QGCdmutQ=='");
    c = c.replace(/SUPABASE_JWT_SECRET="\${.*}"/g, 'SUPABASE_JWT_SECRET="RISMBLbL3RvTt216f7d3FFQq1SE8pXDMCkcubtboBqT87vV87Da6KvWVY7fDdLHxY918CE3bQm6zy4QGCdmutQ=="');
    fs.writeFileSync(f, c);
    console.log('Fixed JWT in', f);
  }
});
