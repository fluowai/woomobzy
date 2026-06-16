import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv();

const CRM_BASE = "https://www.fazendasbrasil.com.br/crm";
const outputDir = path.resolve("outputs", "fazendas-crm-leads");
const reportPath = path.join(outputDir, "fazendas-crm49-sync-report.json");
const contactsSnapshotPath = path.join(outputDir, "fazendas-crm-leads.raw.json");
const attendanceSnapshotPath = path.join(outputDir, "fazendas-crm-atendimentos.raw.json");

const CRM_USER = process.env.CRM_USER;
const CRM_PASS = process.env.CRM_PASS;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");

if (!CRM_USER || !CRM_PASS) throw new Error("Set CRM_USER and CRM_PASS.");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase service credentials are missing in .env.");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function decodeHtmlAttribute(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function collectCookies(headers) {
  const cookies = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie")].filter(Boolean);
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function extractClients(html) {
  const clients = [];
  const regex = /value='([\s\S]*?)'\s+data-keep="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      clients.push(JSON.parse(decodeHtmlAttribute(match[1])));
    } catch (error) {
      console.warn(`Could not parse CRM contact ${match[2]}: ${error.message}`);
    }
  }
  return clients;
}

function extractTotalPagesFromHtml(html) {
  const match = html.match(/current-page[\s\S]*?<a[^>]*>[\s\S]*?(\d+)\s*de\s*(\d+)/i);
  return match ? Number(match[2]) : 1;
}

async function crmLogin() {
  const response = await fetch(`${CRM_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: CRM_USER, password: CRM_PASS, client: "web" }),
  });
  if (!response.ok) throw new Error(`CRM login failed: ${response.status} ${await response.text()}`);
  const cookie = collectCookies(response.headers);
  if (!cookie) throw new Error("CRM login succeeded but no cookie was returned.");
  return cookie;
}

async function postCrmForm(cookie, url, form) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      cookie,
    },
    body: new URLSearchParams(form),
  });
  if (!response.ok) throw new Error(`CRM request failed ${response.status}: ${url}`);
  return response.text();
}

function cleanPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function primary(items, key) {
  const principal = (items || []).find((item) => String(item?.principal) === "1");
  return String((principal || items?.[0] || {})[key] || "").trim();
}

function validText(value) {
  const text = String(value || "").trim();
  return text && text !== "0000-00-00 00:00:00" ? text : null;
}

function isoOrNull(value) {
  const text = validText(value);
  if (!text) return null;
  return new Date(text.replace(" ", "T") + "-03:00").toISOString();
}

function contactToLead(contact) {
  const phone = cleanPhone(primary(contact.telefones, "telefone"));
  const email = primary(contact.emails, "email");
  const types = (contact.tipos || []).map((item) => item.tipo).filter(Boolean);
  return {
    crm49_contact_id: String(contact.id || ""),
    name: String(contact.nome || "").trim() || `Contato CRM49 ${contact.id}`,
    email: email || null,
    phone,
    source: "CRM49 / Fazendas Brasil",
    status: "Novo",
    classification: types.includes("Interessado") ? "Interessado" : (types[0] || "Contato"),
    created_at: isoOrNull(contact.datacadastro) || undefined,
    last_contacted_at: isoOrNull(contact.ultima_interacao),
    notes: [
      `Importado do CRM49. Contato externo #${contact.id}.`,
      types.length ? `Tipos: ${types.join(", ")}.` : "",
      contact.empresa ? `Empresa: ${contact.empresa}.` : "",
      contact.corpo ? `Observacao original: ${contact.corpo}` : "",
    ].filter(Boolean).join("\n"),
  };
}

function attendanceToStatus(attendance) {
  const tags = attendance.tags || {};
  const situacao = String(attendance.situacao ?? "");
  if (situacao === "2" || validText(attendance.finalizado_em)) return "Fechado";
  if (situacao === "3" || validText(attendance.descartado_em)) return "Perdido";
  if (Number(tags.propostas?.total || 0) > 0 || Number(tags.negocios?.total || 0) > 0) return "Simulação";
  if (Number(tags.visitas?.total || 0) > 0) return "Visita";
  return "Qualificação";
}

function attendanceNotes(attendance) {
  const message = attendance.tags?.mensagens?.data?.mensagem || "";
  const trimmedMessage = String(message).replace(/\[char0\]/g, "\n").trim();
  return [
    `Atendimento importado do CRM49. Atendimento externo #${attendance.id_atendimento}.`,
    `Situacao CRM49: ${attendance.situacao}.`,
    validText(attendance.ultima_interacao) ? `Ultima interacao: ${attendance.ultima_interacao}.` : "",
    Number(attendance.tags?.mensagens?.total || 0) > 0 ? `Mensagens: ${attendance.tags.mensagens.total}.` : "",
    Number(attendance.tags?.negocios?.total || 0) > 0 ? `Negocios: ${attendance.tags.negocios.total}.` : "",
    Number(attendance.tags?.propostas?.total || 0) > 0 ? `Propostas: ${attendance.tags.propostas.total}.` : "",
    Number(attendance.tags?.visitas?.total || 0) > 0 ? `Visitas: ${attendance.tags.visitas.total}.` : "",
    trimmedMessage ? `Ultima mensagem:\n${trimmedMessage.slice(0, 4000)}` : "",
  ].filter(Boolean).join("\n");
}

async function fetchContacts(cookie) {
  const filters = JSON.stringify([{
    input: "situacao",
    table: "proprietario",
    value: ["0"],
    selector: "multipleselect",
    text: ["Ativos"],
    textInput: "Situacao",
  }]);
  const baseForm = {
    filters,
    order: "",
    id_list: "9999",
    show: "",
    actions: "null",
    actionsCustom: "null",
    defaultWhere: "true",
    id_modal: "export",
    custom: "null",
  };
  const byId = new Map();
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const html = await postCrmForm(cookie, `${CRM_BASE}/md/clientes/clientes.list.php`, { ...baseForm, page });
    if (page === 1) totalPages = extractTotalPagesFromHtml(html);
    for (const contact of extractClients(html)) byId.set(String(contact.id), contact);
  }
  return [...byId.values()];
}

async function fetchAttendances(cookie) {
  const baseForm = {
    filters: "[]",
    order: "",
    id_list: "7777",
    show: "",
    actions: "null",
    actionsCustom: "null",
    defaultWhere: "true",
    id_modal: "exportatt",
    custom: "null",
  };
  const byId = new Map();
  let totalPages = 1;
  let total = 0;
  for (let page = 1; page <= totalPages; page += 1) {
    const qs = new URLSearchParams({
      ...baseForm,
      page: String(page),
      onlyJson: "true",
      limit: "25",
    });
    const response = await fetch(`${CRM_BASE}/md/atendimentos/atendimentos.list.php?${qs.toString()}`, {
      method: "GET",
      headers: { cookie },
    });
    if (!response.ok) throw new Error(`CRM attendance request failed ${response.status}`);
    const text = await response.text();
    const parsed = JSON.parse(text);
    if (page === 1) {
      totalPages = Number(parsed.total_pages || 1);
      total = Number(parsed.total || 0);
    }
    for (const attendance of parsed.data || []) {
      byId.set(String(attendance.id_atendimento), attendance);
    }
  }
  return { total, data: [...byId.values()] };
}

async function findOrganization() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,slug,custom_domain,subdomain")
    .or("slug.eq.fazendas-brasil,name.ilike.%Fazendas Brasil%,custom_domain.ilike.%fazendasbrasil.com.br%");
  if (error) throw error;
  if (!data?.length) throw new Error("Fazendas Brasil organization not found.");
  return data.find((org) => org.slug === "fazendas-brasil") || data[0];
}

async function listLeadColumns() {
  const { data, error } = await supabase.from("leads").select("*").limit(1);
  if (error) throw error;
  const row = data?.[0] || {};
  return new Set([
    "organization_id", "name", "email", "phone", "status", "source", "notes", "created_at",
    ...Object.keys(row),
  ]);
}

function keepKnownColumns(payload, columns) {
  return Object.fromEntries(Object.entries(payload).filter(([key, value]) => columns.has(key) && value !== undefined));
}

async function getExistingLeads(organizationId) {
  const { data, error } = await supabase
    .from("leads")
    .select("id,name,email,phone,notes,status,source,created_at")
    .eq("organization_id", organizationId);
  if (error) throw error;
  return data || [];
}

function findExistingLead(existing, lead, externalId) {
  const phone = cleanPhone(lead.phone);
  const email = String(lead.email || "").trim().toLowerCase();
  return existing.find((item) => {
    const notes = String(item.notes || "");
    return (
      (phone && cleanPhone(item.phone) === phone) ||
      (email && String(item.email || "").trim().toLowerCase() === email) ||
      (externalId && notes.includes(`externo #${externalId}`))
    );
  });
}

async function upsertTag(organizationId, leadId, tag) {
  const { error } = await supabase
    .from("lead_tags")
    .upsert({ organization_id: organizationId, lead_id: leadId, tag }, { onConflict: "lead_id,tag" });
  if (error) throw error;
}

async function insertActivity(organizationId, leadId, type, description, metadata) {
  const { data: existing, error: findError } = await supabase
    .from("lead_activities")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .eq("description", description)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return false;

  const { error } = await supabase.from("lead_activities").insert({
    organization_id: organizationId,
    lead_id: leadId,
    type,
    description,
    metadata: metadata || {},
  });
  if (error) throw error;
  return true;
}

await fs.mkdir(outputDir, { recursive: true });
const cookie = await crmLogin();
const [contacts, attendancesResult] = await Promise.all([fetchContacts(cookie), fetchAttendances(cookie)]);
await fs.writeFile(contactsSnapshotPath, JSON.stringify({ exportedAt: new Date().toISOString(), rows: contacts }, null, 2), "utf8");
await fs.writeFile(attendanceSnapshotPath, JSON.stringify({ exportedAt: new Date().toISOString(), ...attendancesResult }, null, 2), "utf8");

const organization = await findOrganization();
const leadColumns = await listLeadColumns();
const existingStart = await getExistingLeads(organization.id);
const existing = [...existingStart];
const contactsById = new Map(contacts.map((contact) => [String(contact.id), contact]));

const report = {
  mode: APPLY ? "apply" : "dry-run",
  organization,
  contactsFetched: contacts.length,
  attendancesFetched: attendancesResult.data.length,
  contactsCreated: 0,
  contactsUpdated: 0,
  contactsSkippedNoPhone: 0,
  attendancesCreated: 0,
  attendancesUpdated: 0,
  tagsWritten: 0,
  activitiesWritten: 0,
  statusCounts: {},
  samples: [],
  generatedAt: new Date().toISOString(),
};

async function createOrUpdateLead(baseLead, externalId, extra = {}) {
  if (!baseLead.phone) {
    report.contactsSkippedNoPhone += 1;
    return { lead: null, action: "skipped" };
  }

  const existingLead = findExistingLead(existing, baseLead, externalId);
  const payload = keepKnownColumns({
    organization_id: organization.id,
    ...baseLead,
    ...extra,
    notes: [baseLead.notes, extra.notes].filter(Boolean).join("\n\n"),
  }, leadColumns);

  if (!APPLY) {
    return { lead: existingLead || { ...payload, id: `dry-${externalId}` }, action: existingLead ? "update" : "create" };
  }

  if (existingLead) {
    const mergedNotes = [existingLead.notes, payload.notes]
      .filter(Boolean)
      .join("\n\n")
      .split("\n\n")
      .filter((line, index, arr) => arr.indexOf(line) === index)
      .join("\n\n");
    const updatePayload = keepKnownColumns({
      ...payload,
      notes: mergedNotes,
      status: extra.status || existingLead.status || payload.status,
    }, leadColumns);
    delete updatePayload.organization_id;
    delete updatePayload.created_at;
    const { data, error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", existingLead.id)
      .select()
      .single();
    if (error) throw error;
    Object.assign(existingLead, data);
    return { lead: data, action: "update" };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  existing.push(data);
  return { lead: data, action: "create" };
}

for (const contact of contacts) {
  const baseLead = contactToLead(contact);
  const { lead, action } = await createOrUpdateLead(baseLead, contact.id);
  if (action === "create") report.contactsCreated += 1;
  if (action === "update") report.contactsUpdated += 1;
  if (!lead) continue;
  if (APPLY) {
    await upsertTag(organization.id, lead.id, "lista-fazendas-brasil");
    await upsertTag(organization.id, lead.id, "crm49");
    report.tagsWritten += 2;
  }
}

for (const attendance of attendancesResult.data) {
  const contact = contactsById.get(String(attendance.id_cliente)) || {};
  const baseLead = contactToLead({ ...contact, id: attendance.id_cliente, nome: attendance.cliente_nome || contact.nome });
  const status = attendanceToStatus(attendance);
  const { lead, action } = await createOrUpdateLead(baseLead, attendance.id_cliente, {
    status,
    classification: "Em atendimento",
    last_contacted_at: isoOrNull(attendance.ultima_interacao || attendance.lastMessageDate),
    notes: attendanceNotes(attendance),
  });
  report.statusCounts[status] = (report.statusCounts[status] || 0) + 1;
  if (action === "create") report.attendancesCreated += 1;
  if (action === "update") report.attendancesUpdated += 1;
  if (!lead) continue;
  if (APPLY) {
    await upsertTag(organization.id, lead.id, "atendimento-crm49");
    await upsertTag(organization.id, lead.id, `crm49-atendimento-${attendance.id_atendimento}`);
    const activityInserted = await insertActivity(
      organization.id,
      lead.id,
      "Nota",
      `Atendimento CRM49 #${attendance.id_atendimento} importado para o kanban (${status}).`,
      { crm49_attendance: attendance }
    );
    report.tagsWritten += 2;
    if (activityInserted) report.activitiesWritten += 1;
  }
  if (report.samples.length < 8) {
    report.samples.push({
      name: baseLead.name,
      phone: baseLead.phone,
      status,
      crm49AttendanceId: attendance.id_atendimento,
      action,
    });
  }
}

const finalLeads = APPLY ? await getExistingLeads(organization.id) : existingStart;
report.finalLeadCount = finalLeads.length;

await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
