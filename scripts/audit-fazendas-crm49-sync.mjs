import { config as loadEnv } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

loadEnv();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: orgs, error: orgError } = await supabase
  .from("organizations")
  .select("id,name,slug,custom_domain,subdomain")
  .or("slug.eq.fazendas-brasil,slug.eq.fazendasbrasil,name.ilike.%Fazendas Brasil%,custom_domain.ilike.%fazendasbrasil.com.br%,custom_domain.ilike.%fazendasbrasil.com%");
if (orgError) throw orgError;
const org = orgs.find((item) => item.slug === "fazendasbrasil") || orgs[0];
if (!org) throw new Error("Fazendas Brasil organization not found.");

const { data: taggedRows, error: tagsError } = await supabase
  .from("lead_tags")
  .select("lead_id,tag")
  .eq("organization_id", org.id)
  .in("tag", ["lista-fazendas-brasil", "crm49", "atendimento-crm49"]);
if (tagsError) throw tagsError;

const taggedLeadIds = [...new Set(taggedRows.map((row) => row.lead_id))];
const attendanceLeadIds = [...new Set(taggedRows.filter((row) => row.tag === "atendimento-crm49").map((row) => row.lead_id))];

const { data: importedLeads, error: leadsError } = await supabase
  .from("leads")
  .select("id,name,phone,email,status,source,classification,created_at")
  .eq("organization_id", org.id)
  .in("id", taggedLeadIds);
if (leadsError) throw leadsError;

const { data: activities, error: activitiesError } = await supabase
  .from("lead_activities")
  .select("id,lead_id,type,description")
  .eq("organization_id", org.id)
  .in("lead_id", attendanceLeadIds);
if (activitiesError) throw activitiesError;

const countsByStatus = {};
for (const lead of importedLeads || []) {
  countsByStatus[lead.status || "Sem status"] = (countsByStatus[lead.status || "Sem status"] || 0) + 1;
}

const report = {
  organization: org,
  importedLeadCount: taggedLeadIds.length,
  attendanceCardCount: attendanceLeadIds.length,
  attendanceActivityCount: (activities || []).filter((activity) => activity.description.includes("Atendimento CRM49 #")).length,
  tags: Object.fromEntries(
    ["lista-fazendas-brasil", "crm49", "atendimento-crm49"].map((tag) => [
      tag,
      new Set(taggedRows.filter((row) => row.tag === tag).map((row) => row.lead_id)).size,
    ]),
  ),
  countsByStatus,
  sampleLeads: (importedLeads || []).slice(0, 10).map((lead) => ({
    name: lead.name,
    phone: lead.phone,
    status: lead.status,
    source: lead.source,
    classification: lead.classification,
  })),
};

const outputDir = path.resolve("outputs", "fazendas-crm-leads");
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "fazendas-crm49-audit-report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
