import { getSupabaseServer } from '../../lib/supabase-server.js';

const supabase = new Proxy(
  {},
  {
    get: (_, prop) => {
      const client = getSupabaseServer();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

const KANBAN_CARD_SELECT = `
  id,
  organization_id,
  name,
  email,
  phone,
  source,
  status,
  classification,
  lead_score,
  ai_next_action,
  next_follow_up_at,
  next_visit_at,
  chat_jid,
  campaign,
  property_id,
  created_at,
  properties(title, price, images),
  lead_tags(tag)
`;

function serializeKanbanLead(row) {
  if (!row) return row;
  const property = row.properties
    ? {
        title: row.properties.title,
        price: row.properties.price,
        thumbnail: Array.isArray(row.properties.images)
          ? row.properties.images[0] || null
          : null,
      }
    : null;

  return {
    ...row,
    properties: property,
  };
}

function normalizePhone(value = '') {
  let digits = String(value).replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

function phoneSearchTail(value = '') {
  const normalized = normalizePhone(value);
  return normalized.length >= 8 ? normalized.slice(-8) : normalized;
}

function isValidBRPhone(value = '') {
  const phone = normalizePhone(value);
  return phone.startsWith('55') && (phone.length === 12 || phone.length === 13);
}

function isGroupChatJid(value = '') {
  return String(value).includes('@g.us');
}

function isPlaceholderLeadName(value = '') {
  const clean = String(value).trim().toLowerCase();
  if (
    !clean ||
    clean === '~' ||
    clean === 'me' ||
    clean === 'contato sem telefone'
  )
    return true;
  const raw = String(value).trim();
  if (/^([A-Z]\.?\s*){1,4}$/.test(raw) || /^([A-Za-z]\.\s*){1,4}$/.test(raw))
    return true;
  return /^\+?\d{8,15}$/.test(clean.replace(/\s/g, ''));
}

function resolveLeadName(...values) {
  let phoneFallback = '';
  for (const value of values) {
    const clean = String(value || '').trim();
    if (/^\+?\d{8,15}$/.test(clean.replace(/\s/g, ''))) phoneFallback = clean;
    if (!clean || isPlaceholderLeadName(clean)) continue;
    return clean;
  }
  return phoneFallback || 'Lead WhatsApp';
}

async function findLeadByNormalizedPhone(organizationId, phone) {
  const normalizedPhone = normalizePhone(phone);
  const tail = phoneSearchTail(normalizedPhone);

  if (!tail) return null;

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .ilike('phone', `%${tail}%`)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) throw error;

  return (
    (data || []).find(
      (lead) => normalizePhone(lead.phone) === normalizedPhone
    ) || null
  );
}

async function findOrCreateWhatsAppLead({
  organizationId,
  phone,
  name,
  chatJid,
  source = 'WhatsApp',
}) {
  const normalizedPhone = normalizePhone(phone);
  if (isGroupChatJid(chatJid)) {
    const error = new Error('Conversas de grupo nao criam lead no Kanban');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidBRPhone(normalizedPhone)) {
    const error = new Error('Telefone individual do WhatsApp e obrigatorio');
    error.statusCode = 400;
    throw error;
  }

  const existingLead = await findLeadByNormalizedPhone(
    organizationId,
    normalizedPhone
  );

  const displayName = resolveLeadName(
    name,
    existingLead?.name,
    normalizedPhone
  );
  if (existingLead) {
    const updates = {
      phone: normalizedPhone,
      chat_jid: chatJid || existingLead.chat_jid,
      last_contacted_at: new Date().toISOString(),
    };

    if (isPlaceholderLeadName(existingLead.name)) updates.name = displayName;
    if (!existingLead.source) updates.source = source;

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', existingLead.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      organization_id: organizationId,
      name: displayName,
      phone: normalizedPhone,
      source,
      status: 'Novo',
      classification: 'Interessado',
      chat_jid: chatJid || null,
      last_contacted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getLeadTags(organizationId, leadId) {
  const { data, error } = await supabase
    .from('lead_tags')
    .select('tag')
    .eq('organization_id', organizationId)
    .eq('lead_id', leadId)
    .order('tag', { ascending: true });
  if (error) throw error;
  return (data || []).map((item) => item.tag);
}

async function getAssignableUsers(organizationId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export {
  supabase,
  KANBAN_CARD_SELECT,
  serializeKanbanLead,
  normalizePhone,
  phoneSearchTail,
  isValidBRPhone,
  isGroupChatJid,
  isPlaceholderLeadName,
  resolveLeadName,
  findLeadByNormalizedPhone,
  findOrCreateWhatsAppLead,
  getLeadTags,
  getAssignableUsers,
};
