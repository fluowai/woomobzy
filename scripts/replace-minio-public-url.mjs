#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const apply = process.argv.includes('--apply');
const quiet = process.argv.includes('--quiet') || process.argv.includes('--summary-only');
const oldBase = cleanArg('--old') || process.env.OLD_MINIO_PUBLIC_URL || 'https://n.woopanel.com.br';
const newBase = cleanArg('--new') || process.env.NEW_MINIO_PUBLIC_URL || process.env.MINIO_PUBLIC_URL || 'https://nb.consultio.com.br';
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLES = [
  { table: 'whatsapp_media', id: 'id', columns: ['public_url'] },
  { table: 'whatsapp_messages', id: 'id', columns: ['media_url'] },
  { table: 'whatsapp_chats', id: 'id', columns: ['avatar_url'] },
  { table: 'whatsapp_contacts', id: 'id', columns: ['avatar_url'] },
  { table: 'profiles', id: 'id', columns: ['avatar_url'] },
  { table: 'site_settings', id: 'id', columns: ['logo_url'] },
  { table: 'properties', id: 'id', columns: ['images'] },
];

if (!supabaseUrl || !supabaseKey) {
  console.error('Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar.');
  process.exit(1);
}

if (!oldBase || !newBase || oldBase === newBase) {
  console.error('Informe OLD_MINIO_PUBLIC_URL e NEW_MINIO_PUBLIC_URL diferentes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
let scanned = 0;
let matched = 0;
let updated = 0;

for (const entry of TABLES) {
  const columns = [entry.id, ...entry.columns].join(', ');
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(entry.table)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (error) {
      console.warn(`${entry.table}: ignorado (${error.message})`);
      break;
    }
    if (!data?.length) break;

    for (const row of data || []) {
      scanned++;
      const patch = {};

      for (const column of entry.columns) {
        const nextValue = replaceUrl(row[column]);
        if (JSON.stringify(nextValue) !== JSON.stringify(row[column])) patch[column] = nextValue;
      }

      if (!Object.keys(patch).length) continue;
      matched++;

      if (!apply) {
        if (quiet) continue;
        console.log(`${entry.table}.${entry.id}=${row[entry.id]} seria atualizado: ${Object.keys(patch).join(', ')}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from(entry.table)
        .update(patch)
        .eq(entry.id, row[entry.id]);

      if (updateError) {
        console.warn(`${entry.table}.${entry.id}=${row[entry.id]} falhou: ${updateError.message}`);
      } else {
        updated++;
      }
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }
}

console.log(`Scanned: ${scanned}`);
console.log(`Matched: ${matched}`);
console.log(`Updated: ${updated}`);
console.log(apply ? 'Mode: apply' : 'Mode: dry-run. Use --apply para gravar.');

function replaceUrl(value) {
  if (Array.isArray(value)) return value.map(replaceUrl);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, replaceUrl(entry)]));
  }
  if (typeof value !== 'string' || !value.includes(oldBase)) return value;
  return value.split(oldBase).join(newBase.replace(/\/$/, ''));
}

function cleanArg(name) {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim().replace(/\/$/, '') : '';
}
