import fs from 'fs';

let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');

// The script added these as ALTER TABLE statements at the bottom:
// ALTER TABLE public.whatsmeow_app_state_mutation_macs ADD CONSTRAINT whatsmeow_app_state_mutation_macs_jid_name_fkey FOREIGN KEY (jid) REFERENCES public.whatsmeow_app_state_version(jid);
// ALTER TABLE public.whatsmeow_app_state_mutation_macs ADD CONSTRAINT whatsmeow_app_state_mutation_macs_jid_name_fkey FOREIGN KEY (name) REFERENCES public.whatsmeow_app_state_version(name);

sql = sql.replace(/ALTER TABLE public\.whatsmeow_app_state_mutation_macs ADD CONSTRAINT whatsmeow_app_state_mutation_macs_jid_name_fkey FOREIGN KEY \(jid\) REFERENCES public\.whatsmeow_app_state_version\(jid\);/g, 'ALTER TABLE public.whatsmeow_app_state_mutation_macs ADD CONSTRAINT whatsmeow_app_state_mutation_macs_jid_name_fkey FOREIGN KEY (jid, name) REFERENCES public.whatsmeow_app_state_version(jid, name);');

sql = sql.replace(/ALTER TABLE public\.whatsmeow_app_state_mutation_macs ADD CONSTRAINT whatsmeow_app_state_mutation_macs_jid_name_fkey FOREIGN KEY \(name\) REFERENCES public\.whatsmeow_app_state_version\(name\);/g, '');

fs.writeFileSync('FULL_DATABASE_SCHEMA.sql', sql);
console.log('Fixed composite foreign key.');

let artifactPath = 'C:\\\\Users\\\\paulo\\\\.gemini\\\\antigravity\\\\brain\\\\aa43014e-70b8-4692-9881-53659335edd7\\\\database_schema.md';
let md = `# Schema Database Completo (Revenda B2B2B)\n\nEste é o schema executável gerado, livre de erros de dependência.\n\n\`\`\`sql\n${sql}\n\`\`\`\n`;
fs.writeFileSync(artifactPath, md);
