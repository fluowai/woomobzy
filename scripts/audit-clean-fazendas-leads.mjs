import fs from 'node:fs/promises';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv();

const APPLY = process.argv.includes('--apply');
const OUTPUT_DIR = path.resolve('outputs', 'fazendas-crm-leads');
const JSON_PATH = path.join(
  OUTPUT_DIR,
  APPLY
    ? 'fazendas-leads-cleanup-report.applied.json'
    : 'fazendas-leads-cleanup-report.dry-run.json'
);
const MD_PATH = path.join(
  OUTPUT_DIR,
  APPLY
    ? 'RELATORIO_LIMPEZA_LEADS_FAZENDAS_BRASIL_APLICADO.md'
    : 'RELATORIO_LIMPEZA_LEADS_FAZENDAS_BRASIL_DRY_RUN.md'
);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase service credentials are missing in .env.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(sr|sra|dr|dra|corretor|corretora)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(value) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .replace(/^0+/, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function scoreLead(lead) {
  let score = 0;
  if (normalizePhone(lead.phone)) score += 40;
  if (normalizeEmail(lead.email)) score += 20;
  if (String(lead.notes || '').trim()) score += 10;
  if (lead.last_contacted_at) score += 8;
  if (lead.next_follow_up_at) score += 5;
  if (lead.status && lead.status !== 'Novo') score += 4;
  if (lead.chat_jid) score += 4;
  score += Math.min(Number(lead.activity_count || 0), 20);
  score += Math.min(Number(lead.tag_count || 0), 8);
  return score;
}

function chooseKeeper(leads) {
  return [...leads].sort((a, b) => {
    const scoreDiff = scoreLead(b) - scoreLead(a);
    if (scoreDiff) return scoreDiff;
    return String(a.created_at || '').localeCompare(String(b.created_at || ''));
  })[0];
}

function mergeUniqueLines(...values) {
  const seen = new Set();
  const lines = values
    .flatMap((value) => String(value || '').split(/\n{2,}/))
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const key = normalizeText(line);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return lines.join('\n\n') || null;
}

function hasSharedContact(a, b) {
  const phoneA = normalizePhone(a.phone);
  const phoneB = normalizePhone(b.phone);
  const emailA = normalizeEmail(a.email);
  const emailB = normalizeEmail(b.email);
  return Boolean(
    (phoneA && phoneA === phoneB) || (emailA && emailA === emailB)
  );
}

function isSafeDuplicateGroup(leads) {
  if (leads.length < 2) return false;
  const phones = new Set(
    leads.map((lead) => normalizePhone(lead.phone)).filter(Boolean)
  );
  const emails = new Set(
    leads.map((lead) => normalizeEmail(lead.email)).filter(Boolean)
  );
  if (phones.size === 1 && phones.size > 0) return true;
  if (emails.size === 1 && emails.size > 0) return true;
  return leads.some((lead, index) =>
    leads.slice(index + 1).some((other) => hasSharedContact(lead, other))
  );
}

function partnerSignals(lead, tags = []) {
  const text = normalizeText(
    [
      lead.name,
      lead.email,
      lead.source,
      lead.classification,
      lead.campaign,
      lead.ad_reference,
      lead.organic_channel,
      lead.notes,
      tags.join(' '),
    ]
      .filter(Boolean)
      .join(' ')
  );

  const signals = [];
  const checks = [
    ['creci', /\bcreci\b/],
    ['corretor/corretora', /\bcorret(or|ora|agem|ores|oras)\b/],
    ['imobiliaria', /\bimobiliaria\b/],
    ['parceria/parceiro', /\b(parceria|parceiro|parceira|parceiros)\b/],
    ['captacao', /\b(captacao|captador|captadora|captar)\b/],
    ['comissao', /\b(comissao|comissionamento)\b/],
    ['portfolio/carteira', /\b(portfolio|carteira)\b/],
  ];
  for (const [label, pattern] of checks) {
    if (pattern.test(text)) signals.push(label);
  }
  return signals;
}

async function findOrganization() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id,name,slug,custom_domain,subdomain')
    .or(
      'slug.eq.fazendasbrasil,slug.eq.fazendas-brasil,name.ilike.%Fazendas Brasil%,custom_domain.ilike.%fazendasbrasil.com.br%,custom_domain.ilike.%fazendasbrasil.com%'
    );
  if (error) throw error;
  const org =
    (data || []).find(
      (item) =>
        item.slug === 'fazendasbrasil' || item.slug === 'fazendas-brasil'
    ) || data?.[0];
  if (!org) throw new Error('Fazendas Brasil organization not found.');
  return org;
}

async function fetchAll(table, select, buildQuery) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query = supabase.from(table).select(select);
    query = buildQuery ? buildQuery(query) : query;
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function fetchByLeadIds(table, select, organizationId, leadIds) {
  const rows = [];
  const chunkSize = 80;
  for (let index = 0; index < leadIds.length; index += chunkSize) {
    const chunk = leadIds.slice(index, index + chunkSize);
    rows.push(
      ...(await fetchAll(table, select, (query) =>
        query.eq('organization_id', organizationId).in('lead_id', chunk)
      ))
    );
  }
  return rows;
}

async function updateOptionalTable(
  table,
  duplicateId,
  keeperId,
  organizationId
) {
  const { error } = await supabase
    .from(table)
    .update({ lead_id: keeperId })
    .eq('organization_id', organizationId)
    .eq('lead_id', duplicateId);

  if (!error) return { table, ok: true };
  const optionalCodes = new Set(['42P01', '42703', 'PGRST205', 'PGRST204']);
  if (optionalCodes.has(error.code))
    return { table, ok: false, skipped: true, reason: error.message };
  throw error;
}

async function dedupeGroup({ organizationId, keeper, duplicates }) {
  const duplicateIds = duplicates.map((lead) => lead.id);
  const merged = {
    email: keeper.email || duplicates.find((lead) => lead.email)?.email || null,
    phone: keeper.phone || duplicates.find((lead) => lead.phone)?.phone || null,
    notes: mergeUniqueLines(
      keeper.notes,
      `Limpeza automatica em ${new Date().toISOString()}: ${duplicates.length} lead(s) duplicado(s) por nome foram unidos neste cadastro.`,
      ...duplicates.map((lead) => lead.notes)
    ),
    last_contacted_at:
      [
        keeper.last_contacted_at,
        ...duplicates.map((lead) => lead.last_contacted_at),
      ]
        .filter(Boolean)
        .sort()
        .at(-1) ||
      keeper.last_contacted_at ||
      null,
    next_follow_up_at:
      keeper.next_follow_up_at ||
      duplicates.find((lead) => lead.next_follow_up_at)?.next_follow_up_at ||
      null,
    chat_jid:
      keeper.chat_jid ||
      duplicates.find((lead) => lead.chat_jid)?.chat_jid ||
      null,
    classification:
      keeper.classification ||
      duplicates.find((lead) => lead.classification)?.classification ||
      null,
    source:
      keeper.source || duplicates.find((lead) => lead.source)?.source || null,
  };

  const result = {
    keeperId: keeper.id,
    deletedIds: duplicateIds,
    relationUpdates: [],
  };

  const { error: updateLeadError } = await supabase
    .from('leads')
    .update(merged)
    .eq('organization_id', organizationId)
    .eq('id', keeper.id);
  if (updateLeadError) throw updateLeadError;

  for (const duplicateId of duplicateIds) {
    result.relationUpdates.push(
      await updateOptionalTable(
        'lead_activities',
        duplicateId,
        keeper.id,
        organizationId
      )
    );
    result.relationUpdates.push(
      await updateOptionalTable(
        'lead_followups',
        duplicateId,
        keeper.id,
        organizationId
      )
    );
    result.relationUpdates.push(
      await updateOptionalTable(
        'emails',
        duplicateId,
        keeper.id,
        organizationId
      )
    );
    result.relationUpdates.push(
      await updateOptionalTable(
        'quiz_submissions',
        duplicateId,
        keeper.id,
        organizationId
      )
    );

    const { data: duplicateTags, error: tagReadError } = await supabase
      .from('lead_tags')
      .select('tag')
      .eq('organization_id', organizationId)
      .eq('lead_id', duplicateId);
    if (tagReadError) throw tagReadError;
    const tagRows = (duplicateTags || []).map((row) => ({
      organization_id: organizationId,
      lead_id: keeper.id,
      tag: row.tag,
    }));
    if (tagRows.length) {
      const { error: tagUpsertError } = await supabase
        .from('lead_tags')
        .upsert(tagRows, { onConflict: 'lead_id,tag' });
      if (tagUpsertError) throw tagUpsertError;
    }

    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', duplicateId);
    if (deleteError) throw deleteError;
  }

  return result;
}

function csvValue(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toMarkdown(report) {
  const duplicateRows =
    report.duplicateNameGroups
      .slice(0, 30)
      .map(
        (group) =>
          `| ${csvValue(group.name)} | ${group.count} | ${group.safeToMerge ? 'sim' : 'revisar'} | ${csvValue(group.keeper?.name)} | ${group.duplicatesToDelete.length} |`
      )
      .join('\n') || '| Nenhum | 0 | - | - | 0 |';

  const partnerRows =
    report.partnerCandidates
      .slice(0, 40)
      .map(
        (lead) =>
          `| ${csvValue(lead.name)} | ${csvValue(lead.phone)} | ${csvValue(lead.email)} | ${csvValue(lead.source)} | ${lead.signals.join(', ')} |`
      )
      .join('\n') || '| Nenhum | - | - | - | - |';

  return `# Relatorio de limpeza de leads - Fazendas Brasil

Gerado em: ${report.generatedAt}
Modo: ${report.mode}
Organizacao: ${report.organization.name} (${report.organization.slug})

## Resumo

- Total de leads antes da limpeza: ${report.totalLeadsBefore}
- Nomes repetidos encontrados: ${report.duplicateNameGroups.length}
- Leads envolvidos em nomes repetidos: ${report.duplicateLeadRows}
- Grupos seguros para unir: ${report.safeDuplicateGroups}
- Leads removidos por duplicidade: ${report.deletedDuplicateLeads}
- Total de leads apos limpeza: ${report.totalLeadsAfter}
- Possiveis corretores/parcerias criados como lead: ${report.partnerCandidates.length}

## Duplicados por nome

| Nome normalizado | Qtde | Seguro para unir | Lead mantido | Removidos |
| --- | ---: | --- | --- | ---: |
${duplicateRows}

## Possiveis corretores/parcerias

Estes registros nao foram apagados automaticamente. A recomendacao e revisar e mover para um fluxo de parceiros/captacao quando confirmado.

| Nome | Telefone | Email | Origem | Sinais |
| --- | --- | --- | --- | --- |
${partnerRows}

## Arquivos

- JSON detalhado: ${JSON_PATH}
- Markdown: ${MD_PATH}
`;
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });

const organization = await findOrganization();
const leads = await fetchAll(
  'leads',
  'id,organization_id,name,email,phone,status,source,notes,classification,campaign,ad_reference,organic_channel,chat_jid,last_contacted_at,next_follow_up_at,created_at',
  (query) =>
    query
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: true })
);
const leadIds = leads.map((lead) => lead.id);
const [tags, activities, followups] = leadIds.length
  ? await Promise.all([
      fetchByLeadIds('lead_tags', 'lead_id,tag', organization.id, leadIds),
      fetchByLeadIds('lead_activities', 'lead_id,id', organization.id, leadIds),
      fetchByLeadIds('lead_followups', 'lead_id,id', organization.id, leadIds),
    ])
  : [[], [], []];

const tagMap = new Map();
for (const row of tags)
  tagMap.set(row.lead_id, [...(tagMap.get(row.lead_id) || []), row.tag]);
const activityCount = new Map();
for (const row of activities)
  activityCount.set(row.lead_id, (activityCount.get(row.lead_id) || 0) + 1);
const followupCount = new Map();
for (const row of followups)
  followupCount.set(row.lead_id, (followupCount.get(row.lead_id) || 0) + 1);

const enriched = leads.map((lead) => ({
  ...lead,
  normalized_name: normalizeText(lead.name),
  normalized_phone: normalizePhone(lead.phone),
  normalized_email: normalizeEmail(lead.email),
  tag_count: tagMap.get(lead.id)?.length || 0,
  activity_count: activityCount.get(lead.id) || 0,
  followup_count: followupCount.get(lead.id) || 0,
}));

const byName = new Map();
for (const lead of enriched) {
  if (!lead.normalized_name) continue;
  byName.set(lead.normalized_name, [
    ...(byName.get(lead.normalized_name) || []),
    lead,
  ]);
}

const duplicateNameGroups = [...byName.entries()]
  .filter(([, group]) => group.length > 1)
  .map(([name, group]) => {
    const keeper = chooseKeeper(group);
    const safeToMerge = isSafeDuplicateGroup(group);
    return {
      name,
      count: group.length,
      safeToMerge,
      keeper,
      duplicatesToDelete: safeToMerge
        ? group.filter((lead) => lead.id !== keeper.id)
        : [],
      leads: group.sort((a, b) =>
        String(a.created_at || '').localeCompare(String(b.created_at || ''))
      ),
    };
  })
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const partnerCandidates = enriched
  .map((lead) => ({
    ...lead,
    signals: partnerSignals(lead, tagMap.get(lead.id) || []),
  }))
  .filter((lead) => lead.signals.length > 0)
  .sort(
    (a, b) =>
      b.signals.length - a.signals.length ||
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
  );

const applied = [];
if (APPLY) {
  for (const group of duplicateNameGroups.filter(
    (item) => item.safeToMerge && item.duplicatesToDelete.length > 0
  )) {
    applied.push(
      await dedupeGroup({
        organizationId: organization.id,
        keeper: group.keeper,
        duplicates: group.duplicatesToDelete,
      })
    );
  }
}

const totalLeadsAfter = APPLY
  ? (
      await fetchAll('leads', 'id', (query) =>
        query.eq('organization_id', organization.id)
      )
    ).length
  : leads.length -
    duplicateNameGroups.reduce(
      (sum, group) => sum + group.duplicatesToDelete.length,
      0
    );

const report = {
  mode: APPLY ? 'aplicado' : 'dry-run',
  generatedAt: new Date().toISOString(),
  organization,
  totalLeadsBefore: leads.length,
  totalLeadsAfter,
  duplicateNameGroups,
  duplicateLeadRows: duplicateNameGroups.reduce(
    (sum, group) => sum + group.count,
    0
  ),
  safeDuplicateGroups: duplicateNameGroups.filter((group) => group.safeToMerge)
    .length,
  deletedDuplicateLeads: APPLY
    ? applied.reduce((sum, item) => sum + item.deletedIds.length, 0)
    : duplicateNameGroups.reduce(
        (sum, group) => sum + group.duplicatesToDelete.length,
        0
      ),
  applied,
  partnerCandidates: partnerCandidates.map((lead) => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    status: lead.status,
    source: lead.source,
    classification: lead.classification,
    created_at: lead.created_at,
    signals: lead.signals,
    tags: tagMap.get(lead.id) || [],
    notes_excerpt: String(lead.notes || '').slice(0, 500),
  })),
};

await fs.writeFile(JSON_PATH, JSON.stringify(report, null, 2), 'utf8');
await fs.writeFile(MD_PATH, toMarkdown(report), 'utf8');

console.log(
  JSON.stringify(
    {
      mode: report.mode,
      organization: report.organization,
      totalLeadsBefore: report.totalLeadsBefore,
      totalLeadsAfter: report.totalLeadsAfter,
      duplicateNameGroups: report.duplicateNameGroups.length,
      duplicateLeadRows: report.duplicateLeadRows,
      safeDuplicateGroups: report.safeDuplicateGroups,
      deletedDuplicateLeads: report.deletedDuplicateLeads,
      partnerCandidates: report.partnerCandidates.length,
      jsonPath: JSON_PATH,
      mdPath: MD_PATH,
    },
    null,
    2
  )
);
