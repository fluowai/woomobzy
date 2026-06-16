import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const CRM_BASE = "https://www.fazendasbrasil.com.br/crm";
const username = process.env.CRM_USER;
const password = process.env.CRM_PASS;

if (!username || !password) {
  throw new Error("Set CRM_USER and CRM_PASS before running this exporter.");
}

const outputDir = path.resolve("outputs", "fazendas-crm-leads");
const jsonPath = path.join(outputDir, "fazendas-crm-leads.raw.json");
const csvPath = path.join(outputDir, "fazendas-crm-leads.csv");
const xlsxPath = path.join(outputDir, "fazendas-crm-leads.xlsx");
const previewPath = path.join(outputDir, "fazendas-crm-leads-preview.png");

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
  const cookies = [];
  if (typeof headers.getSetCookie === "function") {
    cookies.push(...headers.getSetCookie());
  } else {
    const setCookie = headers.get("set-cookie");
    if (setCookie) cookies.push(setCookie);
  }
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function extractClients(html) {
  const clients = [];
  const regex = /value='([\s\S]*?)'\s+data-keep="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const raw = decodeHtmlAttribute(match[1]);
    try {
      clients.push(JSON.parse(raw));
    } catch (error) {
      console.warn(`Could not parse contact ${match[2]}: ${error.message}`);
    }
  }
  return clients;
}

function extractTotalPages(html) {
  const match = html.match(/current-page[\s\S]*?<a[^>]*>[\s\S]*?(\d+)\s*de\s*(\d+)/i);
  return match ? Number(match[2]) : 1;
}

function extractTotalCount(html) {
  const match = html.match(/<div class="result-number">(\d+)<\/div>/i);
  return match ? Number(match[1]) : null;
}

function joinValues(items, key) {
  return (items || [])
    .map((item) => String(item?.[key] ?? "").trim())
    .filter(Boolean)
    .join("; ");
}

function principalValue(items, key) {
  const principal = (items || []).find((item) => String(item?.principal) === "1");
  return String((principal || items?.[0] || {})[key] ?? "").trim();
}

function toExportRow(client) {
  return {
    id: client.id || "",
    nome: client.nome || "",
    email_principal: principalValue(client.emails, "email"),
    emails: joinValues(client.emails, "email"),
    telefone_principal: principalValue(client.telefones, "telefone"),
    telefones: joinValues(client.telefones, "telefone"),
    tipos: joinValues(client.tipos, "tipo"),
    situacao: client.situacao === "0" ? "Ativo" : client.situacao || "",
    origem_id: client.comoconheceu_fk || "",
    data_cadastro: client.datacadastro || "",
    ultima_interacao: client.ultima_interacao || "",
    ultima_alteracao: client.ultimaalteracao || "",
    empresa: client.empresa || "",
    pessoa: client.pessoa === "1" ? "Fisica" : client.pessoa === "2" ? "Juridica" : client.pessoa || "",
    profissao: client.profissao || "",
    cargo: client.cargo || "",
    renda1: client.renda1 || "",
    renda2: client.renda2 || "",
    interesse: client.interesse || "",
    observacao: client.corpo || "",
    endereco: client.endereco || client.cendereco || "",
    bairro: client.bairro || client.bairro_nome || client.cbairro || "",
    cidade: client.cidade || client.c_nome || client.ccidade || "",
    estado: client.estado || client.cestado || "",
    cep: client.cep || client.ccep || "",
    imoveis_potencial: client.imoveis_potencial?.[0]?.total || "",
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function postForm(url, form, cookie) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      cookie,
    },
    body: new URLSearchParams(form),
  });
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${url}`);
  }
  return response.text();
}

async function buildWorkbook(rows, rawClients, metadata) {
  const workbook = Workbook.create();
  const summary = workbook.worksheets.add("Resumo");
  const leads = workbook.worksheets.add("Leads");
  const raw = workbook.worksheets.add("Dados brutos");

  const emailsCount = rows.filter((row) => row.email_principal).length;
  const phonesCount = rows.filter((row) => row.telefone_principal).length;
  const interestedCount = rows.filter((row) => row.tipos.toLowerCase().includes("interessado")).length;

  const exportedAtText = `Exportado em ${metadata.exportedAt.replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}`;

  summary.getRange("A1:D1").merge();
  summary.getRange("A1:D1").values = [["Exportacao de leads - Fazendas Brasil CRM"]];
  summary.getRange("A3:B8").values = [
    ["Data da exportacao", exportedAtText],
    ["Contatos ativos encontrados", rows.length],
    ["Total informado pelo CRM", metadata.totalCount ?? ""],
    ["Com e-mail principal", emailsCount],
    ["Com telefone principal", phonesCount],
    ["Tipo Interessado", interestedCount],
  ];
  summary.getRange("A10:B10").values = [["Fonte", "CRM 49 / Fazendas Brasil"]];
  summary.getRange("A1:D1").format = {
    fill: "#1F4E78",
    font: { bold: true, color: "#FFFFFF", size: 14 },
  };
  summary.getRange("A3:A10").format = { font: { bold: true }, fill: "#D9EAF7" };
  summary.getRange("A3:B10").format.borders = { preset: "all", style: "thin", color: "#B7C9D6" };
  summary.getRange("A:B").format.columnWidthPx = 210;
  summary.showGridLines = false;

  const headers = Object.keys(rows[0] || toExportRow({}));
  leads.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
  leads.getRangeByIndexes(1, 0, rows.length, headers.length).values = rows.map((row) => headers.map((header) => row[header] ?? ""));
  leads.getRangeByIndexes(0, 0, rows.length + 1, headers.length).format.borders = {
    preset: "all",
    style: "thin",
    color: "#D9E2EC",
  };
  leads.getRangeByIndexes(0, 0, 1, headers.length).format = {
    fill: "#305496",
    font: { bold: true, color: "#FFFFFF" },
  };
  leads.freezePanes.freezeRows(1);
  leads.tables.add(`A1:Z${rows.length + 1}`, true, "LeadsTable");
  leads.getRange("A:Z").format.columnWidthPx = 150;
  leads.getRange("B:B").format.columnWidthPx = 220;
  leads.getRange("C:F").format.columnWidthPx = 210;
  leads.getRange("T:T").format.columnWidthPx = 260;

  raw.getRange("A1:B1").values = [["id", "json"]];
  raw.getRangeByIndexes(1, 0, rawClients.length, 2).values = rawClients.map((client) => [
    client.id || "",
    JSON.stringify(client),
  ]);
  raw.getRange("A1:B1").format = {
    fill: "#666666",
    font: { bold: true, color: "#FFFFFF" },
  };
  raw.getRange("A:A").format.columnWidthPx = 80;
  raw.getRange("B:B").format.columnWidthPx = 520;
  raw.freezePanes.freezeRows(1);

  const preview = await workbook.render({
    sheetName: "Resumo",
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 50 },
    maxChars: 2000,
  });
  if (errors.ndjson && errors.ndjson.includes("#")) {
    console.warn(errors.ndjson);
  }

  const exported = await SpreadsheetFile.exportXlsx(workbook);
  await exported.save(xlsxPath);
}

await fs.mkdir(outputDir, { recursive: true });

const loginResponse = await fetch(`${CRM_BASE}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username, password, client: "web" }),
});

if (!loginResponse.ok) {
  throw new Error(`Login failed: ${loginResponse.status} ${await loginResponse.text()}`);
}

const cookie = collectCookies(loginResponse.headers);
if (!cookie) {
  throw new Error("Login succeeded but no session cookie was returned.");
}

const filters = JSON.stringify([
  {
    input: "situacao",
    table: "proprietario",
    value: ["0"],
    selector: "multipleselect",
    text: ["Ativos"],
    textInput: "Situacao",
  },
]);

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

const clientsById = new Map();
let totalPages = 1;
let totalCount = null;

for (let page = 1; page <= totalPages; page += 1) {
  const html = await postForm(`${CRM_BASE}/md/clientes/clientes.list.php`, { ...baseForm, page }, cookie);
  if (page === 1) {
    totalPages = extractTotalPages(html);
    totalCount = extractTotalCount(html);
  }
  const pageClients = extractClients(html);
  for (const client of pageClients) {
    clientsById.set(String(client.id), client);
  }
  console.log(`page=${page}/${totalPages} contacts=${pageClients.length} total=${clientsById.size}`);
  if (pageClients.length === 0) break;
}

const rawClients = [...clientsById.values()].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
const rows = rawClients.map(toExportRow);
const headers = Object.keys(rows[0] || toExportRow({}));
const csv = [
  headers.join(";"),
  ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(";")),
].join("\r\n");

await fs.writeFile(jsonPath, JSON.stringify({ exportedAt: new Date().toISOString(), totalCount, rows: rawClients }, null, 2), "utf8");
await fs.writeFile(csvPath, csv, "utf8");
await buildWorkbook(rows, rawClients, { exportedAt: new Date().toISOString(), totalCount });

console.log(JSON.stringify({ contacts: rows.length, totalCount, jsonPath, csvPath, xlsxPath, previewPath }, null, 2));
