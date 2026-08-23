import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_ORG_ID = '391d8df5-7297-42bd-a443-1aca77b1f0a1';
const CVCRM_DEFAULT_BASE_URL = 'https://lalbero.cvcrm.com.br/api';
const KANBAN_STAGES = new Set([
  'Novo',
  'Qualificação',
  'Visita',
  'Simulação',
  'Documentação',
  'Fechado',
  'Perdido',
  'Pessoal',
]);

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const getArg = (name, fallback = null) => {
  const prefix = `${name}=`;
  const value = rawArgs.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
};

const APPLY = args.has('--apply');
const MODE_AUDIT =
  args.has('--audit') ||
  (!args.has('--leads') &&
    !args.has('--interactions') &&
    !args.has('--reorganize'));
const MODE_LEADS = args.has('--leads');
const MODE_INTERACTIONS = args.has('--interactions');
const MODE_REORGANIZE = args.has('--reorganize');
const MAX_RECORDS = Number.parseInt(getArg('--limit', ''), 10) || null;
const PAGE_SIZE = Math.min(
  Math.max(Number.parseInt(getArg('--page-size', '500'), 10) || 500, 1),
  500
);

const CVCRM_BASE_URL = (
  process.env.CVCRM_BASE_URL ||
  process.env.LALBERO_CVCRM_BASE_URL ||
  CVCRM_DEFAULT_BASE_URL
).replace(/\/$/, '');
const CVCRM_EMAIL =
  process.env.CVCRM_EMAIL || process.env.LALBERO_CVCRM_EMAIL || '';
const CVCRM_TOKEN =
  process.env.CVCRM_TOKEN || process.env.LALBERO_CVCRM_TOKEN || '';
const LALBERO_ORG_ID =
  process.env.LALBERO_ORG_ID || process.env.CVCRM_ORG_ID || DEFAULT_ORG_ID;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Configure VITE_SUPABASE_URL/SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
  );
}

if ((MODE_LEADS || MODE_INTERACTIONS) && (!CVCRM_EMAIL || !CVCRM_TOKEN)) {
  throw new Error(
    'Configure CVCRM_EMAIL e CVCRM_TOKEN no .env. Credenciais não devem ficar no script.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function onlyDigits(value) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .replace(/^0+/, '');
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function parseDate(value) {
  const text = String(value || '').trim();
  if (!text || text === '0000-00-00 00:00:00') return null;
  const normalized = text.includes('T') ? text : `${text.replace(' ', 'T')}-03:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseMoney(value) {
  if (value == null || value === '') return null;
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const number = Number.parseFloat(cleaned);
  return Number.isFinite(number) ? number : null;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function compact(value, max = 12000) {
  const text = stripHtml(value);
  return text.length > max ? `${text.slice(0, max)}\n...[truncado]` : text;
}

function getAny(source, names, fallback = null) {
  for (const name of names) {
    if (source && source[name] != null && source[name] !== '') {
      return source[name];
    }
  }
  return fallback;
}

function originalSituationFromNotes(notes) {
  const match = String(notes || '').match(/Situação Original:\s*(.+)/);
  return (match?.[1] || '').split('\n')[0].trim();
}

function externalLeadIdFromNotes(notes) {
  const match = String(notes || '').match(/ID Original:\s*(.+)/);
  return (match?.[1] || '').split('\n')[0].trim();
}

function mapCvcrmSituationToKanban(situation) {
  const value = String(situation || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (value.includes('perdido') || value.includes('descart')) return 'Perdido';
  if (value.includes('venda realizada') || value.includes('vendido')) {
    return 'Fechado';
  }
  if (value.includes('document')) return 'Documentação';
  if (value.includes('proposta') || value.includes('simul')) return 'Simulação';
  if (value.includes('visita')) return 'Visita';
  if (value.includes('aguardando')) return 'Novo';
  return 'Qualificação';
}

function cvcrmLeadToPayload(lead, leadColumns) {
  const externalId = String(
    getAny(lead, ['idlead', 'id_lead', 'lead_id', 'id'], '') || ''
  );
  const empreendimento = Array.isArray(lead.empreendimento)
    ? lead.empreendimento[0]?.nome
    : lead.empreendimento?.nome;
  const situation =
    lead.situacao?.nome ||
    lead.situacao_nome ||
    lead.situacao ||
    'Aguardando Atendimento';
  const budget = parseMoney(getAny(lead, ['valor_negocio', 'budget_max', 'valor']));
  const city = getAny(lead, ['cidade', 'city']);
  const neighborhood = getAny(lead, ['bairro', 'neighborhood']);

  const notes = [
    '[Migrado do CV CRM Lalbero]',
    externalId ? `ID Original: ${externalId}` : '',
    `Situação Original: ${situation}`,
    `Empreendimento: ${empreendimento || 'Não informado'}`,
    `Origem: ${lead.origem || lead.source || 'N/A'}`,
    `Score: ${lead.score || 0}`,
    `Localização: ${neighborhood || 'N/A'} - ${city || 'N/A'}`,
  ]
    .filter(Boolean)
    .join('\n');

  const payload = {
    organization_id: LALBERO_ORG_ID,
    name: lead.nome || lead.name || `Lead CVCRM ${externalId || 'sem-id'}`,
    email: lead.email || null,
    phone: onlyDigits(lead.telefone || lead.phone),
    source: lead.origem || lead.source || 'CVCRM / Lalbero',
    status: mapCvcrmSituationToKanban(situation),
    created_at: parseDate(lead.data_cad || lead.created_at) || undefined,
    last_contacted_at: parseDate(lead.ultima_interacao),
    lead_score: Number.parseInt(lead.score, 10) || 0,
    notes,
    preferences: {
      city: city || null,
      neighborhood: neighborhood || null,
      development: empreendimento || null,
      cvcrm_situation: situation,
    },
    ai_profile: {
      source: 'cvcrm-lalbero',
      external_id: externalId || null,
      original_situation: situation,
    },
  };

  if (leadColumns.has('meta_lead_id')) payload.meta_lead_id = externalId || null;
  if (leadColumns.has('budget')) payload.budget = budget;
  if (leadColumns.has('budget_max')) payload.budget_max = budget;
  if (leadColumns.has('funnel_stage')) payload.funnel_stage = situation;

  return { externalId, situation, payload };
}

function unwrapRecords(body, preferredKeys = []) {
  if (Array.isArray(body)) return body;
  for (const key of preferredKeys) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  for (const key of [
    'dados',
    'data',
    'leads',
    'interacoes',
    'items',
    'registros',
    'result',
  ]) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return [];
}

function responseTotal(body) {
  return Number(
    body?.total ||
      body?.total_registros ||
      body?.totalRecords ||
      body?.pagination?.total ||
      0
  );
}

async function cvcrmGet(path, params) {
  const url = new URL(`${CVCRM_BASE_URL}${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      email: CVCRM_EMAIL,
      token: CVCRM_TOKEN,
    },
  });

  if (response.status === 204) return { status: 204, body: null };
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`CVCRM ${response.status} em ${path}: ${text.slice(0, 500)}`);
  }
  return { status: response.status, body };
}

async function columnExists(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
}

async function leadColumnSet() {
  const columns = [
    'meta_lead_id',
    'budget',
    'budget_max',
    'funnel_stage',
    'ai_profile',
    'preferences',
  ];
  const checks = await Promise.all(
    columns.map(async (column) => [column, await columnExists('leads', column)])
  );
  return new Set(checks.filter(([, exists]) => exists).map(([column]) => column));
}

async function listExistingLeads() {
  const hasMetaLeadId = await columnExists('leads', 'meta_lead_id');
  const select = [
    'id',
    'name',
    'email',
    'phone',
    'status',
    'notes',
    'created_at',
    hasMetaLeadId ? 'meta_lead_id' : null,
  ]
    .filter(Boolean)
    .join(',');
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('leads')
      .select(select)
      .eq('organization_id', LALBERO_ORG_ID)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function buildLeadIndexes(rows) {
  const byExternalId = new Map();
  const byPhone = new Map();
  const byEmail = new Map();
  for (const lead of rows) {
    const externalId = lead.meta_lead_id || externalLeadIdFromNotes(lead.notes);
    if (externalId) byExternalId.set(String(externalId), lead);
    const phone = onlyDigits(lead.phone);
    if (phone) byPhone.set(phone, lead);
    const email = String(lead.email || '').trim().toLowerCase();
    if (email) byEmail.set(email, lead);
  }
  return { byExternalId, byPhone, byEmail };
}

function findExistingLead(indexes, externalId, payload) {
  if (externalId && indexes.byExternalId.has(String(externalId))) {
    return indexes.byExternalId.get(String(externalId));
  }
  const phone = onlyDigits(payload.phone);
  if (phone && indexes.byPhone.has(phone)) return indexes.byPhone.get(phone);
  const email = String(payload.email || '').trim().toLowerCase();
  if (email && indexes.byEmail.has(email)) return indexes.byEmail.get(email);
  return null;
}

async function audit() {
  const existing = await listExistingLeads();
  const statusCounts = {};
  const situationCounts = {};
  for (const lead of existing) {
    const status = lead.status || '(vazio)';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    const situation = originalSituationFromNotes(lead.notes) || '(sem situação original)';
    situationCounts[situation] = (situationCounts[situation] || 0) + 1;
  }

  const [{ count: activitiesCount }, { count: messagesCount }] =
    await Promise.all([
      supabase
        .from('lead_activities')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', LALBERO_ORG_ID),
      supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', LALBERO_ORG_ID),
    ]);

  console.log(
    JSON.stringify(
      {
        organization_id: LALBERO_ORG_ID,
        dry_run: !APPLY,
        leads: existing.length,
        statuses: statusCounts,
        original_situations: situationCounts,
        lead_activities: activitiesCount || 0,
        chat_messages: messagesCount || 0,
        kanban_valid_statuses: [...KANBAN_STAGES],
      },
      null,
      2
    )
  );
}

async function migrateLeads() {
  const leadColumns = await leadColumnSet();
  const returningColumns = [
    'id',
    'email',
    'phone',
    'notes',
    'status',
    leadColumns.has('meta_lead_id') ? 'meta_lead_id' : null,
  ]
    .filter(Boolean)
    .join(',');
  const existing = await listExistingLeads();
  const indexes = buildLeadIndexes(existing);
  let offset = Number.parseInt(getArg('--offset', '0'), 10) || 0;
  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const { body } = await cvcrmGet('/v1/comercial/leads', {
      limit: PAGE_SIZE,
      offset,
    });
    const leads = unwrapRecords(body, ['leads']);
    if (!leads.length) break;

    for (const cvLead of leads) {
      if (MAX_RECORDS && processed >= MAX_RECORDS) break;
      const { externalId, payload } = cvcrmLeadToPayload(cvLead, leadColumns);
      const existingLead = findExistingLead(indexes, externalId, payload);
      processed += 1;

      if (!APPLY) {
        existingLead ? (updated += 1) : (created += 1);
        continue;
      }

      if (existingLead) {
        const { data, error } = await supabase
          .from('leads')
          .update(payload)
          .eq('id', existingLead.id)
          .select(returningColumns)
          .single();
        if (error) throw error;
        indexes.byExternalId.set(String(externalId), data);
        updated += 1;
      } else {
        const { data, error } = await supabase
          .from('leads')
          .insert(payload)
          .select(returningColumns)
          .single();
        if (error) throw error;
        indexes.byExternalId.set(String(externalId), data);
        if (data.phone) indexes.byPhone.set(onlyDigits(data.phone), data);
        if (data.email) {
          indexes.byEmail.set(String(data.email).trim().toLowerCase(), data);
        }
        created += 1;
      }
    }

    console.log(
      `leads offset=${offset} processed=${processed} created=${created} updated=${updated} skipped=${skipped}`
    );
    if ((MAX_RECORDS && processed >= MAX_RECORDS) || leads.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
    if (responseTotal(body) && offset >= responseTotal(body)) break;
  }

  console.log(
    JSON.stringify({ dry_run: !APPLY, processed, created, updated, skipped }, null, 2)
  );
}

async function reorganizeKanban() {
  const leads = await listExistingLeads();
  let changed = 0;
  const plan = {};

  for (const lead of leads) {
    const situation = originalSituationFromNotes(lead.notes);
    const nextStatus = mapCvcrmSituationToKanban(situation);
    plan[nextStatus] = (plan[nextStatus] || 0) + 1;
    if (lead.status === nextStatus) continue;
    changed += 1;

    if (!APPLY) continue;

    const { error } = await supabase
      .from('leads')
      .update({ status: nextStatus })
      .eq('id', lead.id)
      .eq('organization_id', LALBERO_ORG_ID);
    if (error) throw error;

    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      organization_id: LALBERO_ORG_ID,
      type: 'Status',
      description: `Status reorganizado pela migração Lalbero: ${
        lead.status || '(vazio)'
      } -> ${nextStatus}. Situação CVCRM: ${situation || 'não informada'}.`,
      metadata: {
        source: 'cvcrm-lalbero',
        action: 'kanban-reorganize',
        previous_status: lead.status || null,
        next_status: nextStatus,
        original_situation: situation || null,
      },
    });
  }

  console.log(
    JSON.stringify({ dry_run: !APPLY, changed, target_distribution: plan }, null, 2)
  );
}

function interactionKey(interaction) {
  const explicit = getAny(interaction, [
    'idinteracao',
    'id_interacao',
    'interacao_id',
    'id',
    'referencia',
  ]);
  if (explicit) return String(explicit);
  return crypto.createHash('sha1').update(JSON.stringify(interaction)).digest('hex');
}

function interactionLeadExternalId(interaction) {
  return String(
    getAny(
      interaction,
      ['idlead', 'id_lead', 'lead_id', 'idlead_cv', 'referencia_lead'],
      ''
    ) || ''
  );
}

function interactionToActivity(interaction, lead) {
  const key = interactionKey(interaction);
  const when =
    parseDate(
      getAny(interaction, [
        'referencia_data',
        'data_interacao',
        'data_cad',
        'created_at',
        'data',
      ])
    ) || new Date().toISOString();
  const title = getAny(
    interaction,
    ['tipo', 'tipo_interacao', 'acao', 'origem'],
    'Interação'
  );
  const description = compact(
    getAny(
      interaction,
      ['descricao', 'mensagem', 'observacao', 'texto', 'conteudo'],
      JSON.stringify(interaction)
    )
  );
  const normalized = String(`${title} ${description}`)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const type = normalized.includes('whatsapp')
    ? 'WhatsApp'
    : normalized.includes('email')
      ? 'Email'
      : normalized.includes('ligacao') || normalized.includes('telefone')
        ? 'Chamada'
        : normalized.includes('visita')
          ? 'Visita'
          : normalized.includes('proposta')
            ? 'Proposta'
            : 'Nota';

  return {
    lead_id: lead.id,
    organization_id: LALBERO_ORG_ID,
    type,
    description: `[CVCRM Lalbero] ${title}\n${description}`,
    created_at: when,
    metadata: {
      source: 'cvcrm-lalbero',
      cvcrm_interaction_id: key,
      cvcrm_lead_id: interactionLeadExternalId(interaction) || null,
      raw: interaction,
    },
  };
}

async function activityExists(leadId, key) {
  const { data, error } = await supabase
    .from('lead_activities')
    .select('id')
    .eq('organization_id', LALBERO_ORG_ID)
    .eq('lead_id', leadId)
    .contains('metadata', {
      source: 'cvcrm-lalbero',
      cvcrm_interaction_id: key,
    })
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

async function migrateInteractions() {
  const existing = await listExistingLeads();
  const indexes = buildLeadIndexes(existing);
  let page = Number.parseInt(getArg('--page', '1'), 10) || 1;
  let processed = 0;
  let inserted = 0;
  let missingLead = 0;
  let duplicate = 0;

  while (true) {
    const { status, body } = await cvcrmGet('/v1/comercial/leads/interacoes', {
      pagina: page,
      registros_por_pagina: PAGE_SIZE,
      a_partir_data_referencia: getArg('--since', null),
      ate_data_referencia: getArg('--until', null),
    });
    if (status === 204) break;

    const interactions = unwrapRecords(body, ['interacoes', 'dados', 'data']);
    if (!interactions.length) break;

    for (const interaction of interactions) {
      if (MAX_RECORDS && processed >= MAX_RECORDS) break;
      processed += 1;

      const externalId = interactionLeadExternalId(interaction);
      const lead =
        (externalId && indexes.byExternalId.get(String(externalId))) || null;

      if (!lead) {
        missingLead += 1;
        continue;
      }

      const key = interactionKey(interaction);
      if (APPLY && (await activityExists(lead.id, key))) {
        duplicate += 1;
        continue;
      }

      if (!APPLY) {
        inserted += 1;
        continue;
      }

      const payload = interactionToActivity(interaction, lead);
      const { error } = await supabase.from('lead_activities').insert(payload);
      if (error) throw error;
      inserted += 1;
    }

    console.log(
      `interactions page=${page} processed=${processed} inserted=${inserted} missingLead=${missingLead} duplicate=${duplicate}`
    );
    if (
      (MAX_RECORDS && processed >= MAX_RECORDS) ||
      interactions.length < PAGE_SIZE
    ) {
      break;
    }
    page += 1;
  }

  console.log(
    JSON.stringify(
      { dry_run: !APPLY, processed, inserted, missingLead, duplicate },
      null,
      2
    )
  );
}

console.log(
  `Lalbero CVCRM migration | org=${LALBERO_ORG_ID} | mode=${[
    MODE_AUDIT && 'audit',
    MODE_LEADS && 'leads',
    MODE_REORGANIZE && 'reorganize',
    MODE_INTERACTIONS && 'interactions',
  ]
    .filter(Boolean)
    .join(',')} | ${APPLY ? 'APPLY' : 'DRY-RUN'}`
);

if (MODE_AUDIT) await audit();
if (MODE_LEADS) await migrateLeads();
if (MODE_REORGANIZE) await reorganizeKanban();
if (MODE_INTERACTIONS) await migrateInteractions();
