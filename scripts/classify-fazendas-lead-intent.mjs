import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv();

const APPLY = process.argv.includes("--apply");
const OUTPUT_DIR = path.resolve("outputs", "fazendas-crm-leads");
const JSON_PATH = path.join(OUTPUT_DIR, APPLY ? "fazendas-lead-intent.applied.json" : "fazendas-lead-intent.dry-run.json");
const MD_PATH = path.join(OUTPUT_DIR, APPLY ? "RELATORIO_INTENCAO_LEADS_APLICADO.md" : "RELATORIO_INTENCAO_LEADS_DRY_RUN.md");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase service credentials are missing in .env.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s@./:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matches(text, patterns) {
  return patterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label, weight = 1 }) => ({ label, weight }));
}

const farmContextPatterns = [
  { label: "fazenda", pattern: /\bfazenda(s)?\b/ },
  { label: "sitio/chacara", pattern: /\b(sitio|sitios|chacara|chacaras|area rural|imovel rural|propriedade rural)\b/ },
  { label: "hectares/alqueires", pattern: /\b(hectare|hectares|ha|alqueire|alqueires|alq)\b/ },
  { label: "agro", pattern: /\b(pecuaria|gado|soja|milho|pastagem|terra|rural)\b/ },
];

const sellerPatterns = [
  { label: "quer vender", weight: 3, pattern: /\b(quero|preciso|gostaria|pretendo|tenho interesse em)\s+(vender|anunciar|negociar)\b/ },
  { label: "vendo/vende-se", weight: 3, pattern: /\b(vendo|vende se|vende-se|estou vendendo|estamos vendendo)\b/ },
  { label: "tenho propriedade", weight: 2, pattern: /\b(tenho|possuo|sou proprietario|sou proprietaria|meu pai tem|minha familia tem)\b.{0,80}\b(fazenda|sitio|chacara|area|terra|propriedade)\b/ },
  { label: "avaliacao/captacao", weight: 2, pattern: /\b(avaliar|avaliacao|captar|captacao|colocar a venda|por a venda|por para vender|anunciar)\b/ },
  { label: "fazenda a venda", weight: 3, pattern: /\b(fazenda|sitio|chacara|area|terra|propriedade)\b.{0,60}\b(a venda|para venda|vendendo|vende)\b/ },
  { label: "proprietario", weight: 1, pattern: /\b(proprietario|proprietaria|dono|dona)\b/ },
];

const buyerPatterns = [
  { label: "quer comprar", weight: 3, pattern: /\b(quero|preciso|gostaria|pretendo|tenho interesse em)\s+(comprar|adquirir|investir)\b/ },
  { label: "procura/busca", weight: 3, pattern: /\b(procuro|busco|estou procurando|estou buscando|tem alguma|tem fazenda|tem area)\b/ },
  { label: "compra fazenda", weight: 3, pattern: /\b(comprar|adquirir|investir em)\b.{0,80}\b(fazenda|sitio|chacara|area|terra|propriedade)\b/ },
  { label: "pergunta preco rural", weight: 4, pattern: /\b(qual|quanto|saber)\b.{0,40}\b(preco|valor|pedida)\b.{0,80}\b(fazenda|hectare|ha|alqueire|terra)\b/ },
  { label: "preco fazenda", weight: 3, pattern: /\b(preco|valor|pedida)\b.{0,60}\b(fazenda|hectare|ha|alqueire|terra)\b/ },
  { label: "orcamento", weight: 2, pattern: /\b(orcamento|budget|ate r\$|tenho r\$|valor ate|faixa de valor)\b/ },
  { label: "visita/disponibilidade", weight: 1, pattern: /\b(visitar|visita|disponivel|disponibilidade|mais informacoes|preco|valor)\b/ },
  { label: "financiamento/investidor", weight: 1, pattern: /\b(financiamento|credito rural|investidor|investimento)\b/ },
];

const partnerPatterns = [
  { label: "creci", weight: 3, pattern: /\bcreci\b/ },
  { label: "corretor", weight: 3, pattern: /\b(corretor|corretora|corretores|corretagem)\b/ },
  { label: "imobiliaria", weight: 3, pattern: /\b(imobiliaria|real estate|re\/max|remax)\b/ },
  { label: "parceria", weight: 2, pattern: /\b(parceria|parceiro|parceira|captador|captadora|comissao|carteira|portfolio)\b/ },
  { label: "grupo de corretores", weight: 4, pattern: /\b(chat:|grupo)\b.{0,80}\b(corretores|corretor|imoveis|imobiliarias|permuta|repasse)\b/ },
];

function score(matchesList) {
  return matchesList.reduce((sum, item) => sum + item.weight, 0);
}

function classifyLead(lead, activities, tags) {
  const text = normalizeText([
    lead.name,
    lead.email,
    lead.phone,
    lead.source,
    lead.status,
    lead.classification,
    lead.campaign,
    lead.ad_reference,
    lead.organic_channel,
    lead.notes,
    tags.join(" "),
    ...activities.map((activity) => activity.description),
  ].filter(Boolean).join("\n"));

  const farmMatches = matches(text, farmContextPatterns);
  const sellerMatches = matches(text, sellerPatterns);
  const buyerMatches = matches(text, buyerPatterns);
  const partnerMatches = matches(text, partnerPatterns);

  const farmScore = score(farmMatches);
  const sellerScore = farmScore ? score(sellerMatches) : 0;
  const buyerScore = farmScore ? score(buyerMatches) : 0;
  const partnerScore = score(partnerMatches);

  let intent = "indefinido";
  let classification = lead.classification || null;
  const tagsToAdd = [];

  if (partnerScore >= 4 && sellerScore < 5 && buyerScore < 6) {
    intent = "parceria";
    classification = "Corretor/Parceria";
    tagsToAdd.push("intent-parceria-corretor");
  } else if (sellerScore >= 4 && buyerScore >= 4) {
    intent = sellerScore >= buyerScore ? "vendedor" : "comprador";
    classification = sellerScore >= buyerScore ? "Vendedor Fazenda" : "Comprador Fazenda";
    tagsToAdd.push(sellerScore >= buyerScore ? "intent-vendedor-fazenda" : "intent-comprador-fazenda");
    tagsToAdd.push("intent-misto-compra-venda");
  } else if (sellerScore >= 4) {
    intent = "vendedor";
    classification = "Vendedor Fazenda";
    tagsToAdd.push("intent-vendedor-fazenda");
  } else if (buyerScore >= 4) {
    intent = "comprador";
    classification = "Comprador Fazenda";
    tagsToAdd.push("intent-comprador-fazenda");
  }

  return {
    lead_id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    previous_classification: lead.classification,
    classification,
    intent,
    scores: { farmScore, sellerScore, buyerScore, partnerScore },
    signals: {
      farm: farmMatches.map((item) => item.label),
      seller: sellerMatches.map((item) => item.label),
      buyer: buyerMatches.map((item) => item.label),
      partner: partnerMatches.map((item) => item.label),
    },
    tagsToAdd,
    evidence: text.slice(0, 1200),
  };
}

async function findOrganization() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,slug,custom_domain,subdomain")
    .or("slug.eq.fazendasbrasil,slug.eq.fazendas-brasil,name.ilike.%Fazendas Brasil%,custom_domain.ilike.%fazendasbrasil.com.br%,custom_domain.ilike.%fazendasbrasil.com%");
  if (error) throw error;
  const org = (data || []).find((item) => item.slug === "fazendasbrasil" || item.slug === "fazendas-brasil") || data?.[0];
  if (!org) throw new Error("Fazendas Brasil organization not found.");
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
    rows.push(...await fetchAll(
      table,
      select,
      (query) => query.eq("organization_id", organizationId).in("lead_id", chunk),
    ));
  }
  return rows;
}

function groupByLead(rows) {
  const map = new Map();
  for (const row of rows) map.set(row.lead_id, [...(map.get(row.lead_id) || []), row]);
  return map;
}

async function upsertTags(organizationId, leadId, tags) {
  if (!tags.length) return;
  const rows = tags.map((tag) => ({ organization_id: organizationId, lead_id: leadId, tag }));
  const { error } = await supabase.from("lead_tags").upsert(rows, { onConflict: "lead_id,tag" });
  if (error) throw error;
}

function toMarkdown(report) {
  const summaryRows = Object.entries(report.counts)
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join("\n");
  const sellerRows = report.classified
    .filter((item) => item.intent === "vendedor")
    .slice(0, 40)
    .map((item) => `| ${item.name || ""} | ${item.phone || ""} | ${item.source || ""} | ${item.scores.sellerScore} | ${item.signals.seller.join(", ")} |`)
    .join("\n") || "| Nenhum | - | - | - | - |";
  const buyerRows = report.classified
    .filter((item) => item.intent === "comprador")
    .slice(0, 40)
    .map((item) => `| ${item.name || ""} | ${item.phone || ""} | ${item.source || ""} | ${item.scores.buyerScore} | ${item.signals.buyer.join(", ")} |`)
    .join("\n") || "| Nenhum | - | - | - | - |";
  const partnerRows = report.classified
    .filter((item) => item.intent === "parceria")
    .slice(0, 40)
    .map((item) => `| ${item.name || ""} | ${item.phone || ""} | ${item.source || ""} | ${item.signals.partner.join(", ")} |`)
    .join("\n") || "| Nenhum | - | - | - |";

  return `# Relatorio de intencao dos leads - Fazendas Brasil

Gerado em: ${report.generatedAt}
Modo: ${report.mode}
Organizacao: ${report.organization.name} (${report.organization.slug})

## Resumo

| Categoria | Quantidade |
| --- | ---: |
${summaryRows}

## Vendedores de fazenda

| Nome | Telefone | Origem | Score | Sinais |
| --- | --- | --- | ---: | --- |
${sellerRows}

## Compradores de fazenda

| Nome | Telefone | Origem | Score | Sinais |
| --- | --- | --- | ---: | --- |
${buyerRows}

## Corretores/parcerias

| Nome | Telefone | Origem | Sinais |
| --- | --- | --- | --- |
${partnerRows}

## Arquivos

- JSON detalhado: ${JSON_PATH}
- Markdown: ${MD_PATH}
`;
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });

const organization = await findOrganization();
const leads = await fetchAll(
  "leads",
  "id,organization_id,name,email,phone,status,source,notes,classification,campaign,ad_reference,organic_channel,created_at",
  (query) => query.eq("organization_id", organization.id).order("created_at", { ascending: false }),
);
const leadIds = leads.map((lead) => lead.id);
const [activities, tagRows] = leadIds.length
  ? await Promise.all([
      fetchByLeadIds("lead_activities", "lead_id,type,description,created_at", organization.id, leadIds),
      fetchByLeadIds("lead_tags", "lead_id,tag", organization.id, leadIds),
    ])
  : [[], []];

const activitiesByLead = groupByLead(activities);
const tagsByLead = groupByLead(tagRows);
const classified = leads
  .map((lead) => classifyLead(
    lead,
    activitiesByLead.get(lead.id) || [],
    (tagsByLead.get(lead.id) || []).map((row) => row.tag),
  ))
  .filter((item) => item.intent !== "indefinido");

if (APPLY) {
  for (const item of classified) {
    const { error } = await supabase
      .from("leads")
      .update({ classification: item.classification })
      .eq("organization_id", organization.id)
      .eq("id", item.lead_id);
    if (error) throw error;
    await upsertTags(organization.id, item.lead_id, item.tagsToAdd);
  }
}

const counts = {
  "Total de leads analisados": leads.length,
  "Com intencao identificada": classified.length,
  "Vendedores de fazenda": classified.filter((item) => item.intent === "vendedor").length,
  "Compradores de fazenda": classified.filter((item) => item.intent === "comprador").length,
  "Corretores/parcerias": classified.filter((item) => item.intent === "parceria").length,
};

const report = {
  mode: APPLY ? "aplicado" : "dry-run",
  generatedAt: new Date().toISOString(),
  organization,
  counts,
  classified,
};

await fs.writeFile(JSON_PATH, JSON.stringify(report, null, 2), "utf8");
await fs.writeFile(MD_PATH, toMarkdown(report), "utf8");

console.log(JSON.stringify({
  mode: report.mode,
  organization,
  counts,
  jsonPath: JSON_PATH,
  mdPath: MD_PATH,
}, null, 2));
