/**
 * Broker Performance Reports Service
 * Generates performance metrics and reports for brokers/agents.
 */

import { getSupabaseServer } from '../lib/supabase-server.js';

/**
 * Get comprehensive performance metrics for a broker.
 */
export async function getBrokerPerformance(
  organizationId,
  brokerId,
  dateRange = {}
) {
  const supabase = getSupabaseServer();
  const { startDate, endDate } = dateRange;

  let leadsQuery = supabase
    .from('leads')
    .select('id, status, created_at, source, lead_score, budget')
    .eq('organization_id', organizationId)
    .eq('broker_id', brokerId);

  if (startDate) leadsQuery = leadsQuery.gte('created_at', startDate);
  if (endDate) leadsQuery = leadsQuery.lte('created_at', endDate);

  const { data: leads, error: leadsError } = await leadsQuery;
  if (leadsError) throw leadsError;

  const totalLeads = (leads || []).length;
  const convertedLeads = (leads || []).filter(
    (l) => l.status === 'Fechado'
  ).length;
  const lostLeads = (leads || []).filter((l) => l.status === 'Perdido').length;
  const activeLeads = totalLeads - convertedLeads - lostLeads;
  const conversionRate =
    totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

  const totalBudget = (leads || []).reduce(
    (sum, l) => sum + (l.budget || 0),
    0
  );
  const avgBudget = totalLeads > 0 ? Math.round(totalBudget / totalLeads) : 0;

  const sourceBreakdown = {};
  (leads || []).forEach((lead) => {
    const src = lead.source || 'Desconhecido';
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
  });

  const statusBreakdown = {};
  (leads || []).forEach((lead) => {
    statusBreakdown[lead.status] = (statusBreakdown[lead.status] || 0) + 1;
  });

  const monthlyTrend = {};
  (leads || []).forEach((lead) => {
    const month = lead.created_at?.slice(0, 7) || 'unknown';
    if (!monthlyTrend[month]) monthlyTrend[month] = { total: 0, converted: 0 };
    monthlyTrend[month].total++;
    if (lead.status === 'Fechado') monthlyTrend[month].converted++;
  });

  // Activities count
  let activitiesQuery = supabase
    .from('lead_activities')
    .select('id, type', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('created_by', brokerId);

  if (startDate) activitiesQuery = activitiesQuery.gte('created_at', startDate);
  if (endDate) activitiesQuery = activitiesQuery.lte('created_at', endDate);

  const { count: totalActivities } = await activitiesQuery;

  return {
    broker_id: brokerId,
    period: { startDate: startDate || 'all', endDate: endDate || 'now' },
    summary: {
      total_leads: totalLeads,
      converted_leads: convertedLeads,
      active_leads: activeLeads,
      lost_leads: lostLeads,
      conversion_rate: Number(conversionRate),
      total_activities: totalActivities || 0,
      avg_budget: avgBudget,
    },
    source_breakdown: sourceBreakdown,
    status_breakdown: statusBreakdown,
    monthly_trend: Object.entries(monthlyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data })),
  };
}

/**
 * Get ranking of all brokers in an organization.
 */
export async function getBrokerRanking(organizationId, dateRange = {}) {
  const supabase = getSupabaseServer();

  const { data: brokers, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('organization_id', organizationId)
    .eq('role', 'BROKER');

  if (error) throw error;
  if (!brokers?.length) return [];

  const rankings = await Promise.all(
    brokers.map(async (broker) => {
      const perf = await getBrokerPerformance(
        organizationId,
        broker.id,
        dateRange
      );
      return {
        ...broker,
        ...perf.summary,
      };
    })
  );

  return rankings.sort(
    (a, b) =>
      b.conversion_rate - a.conversion_rate ||
      b.converted_leads - a.converted_leads
  );
}

/**
 * Get pipeline summary for the whole organization.
 */
export async function getPipelineSummary(organizationId) {
  const supabase = getSupabaseServer();

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, status, broker_id, created_at, budget')
    .eq('organization_id', organizationId);

  if (error) throw error;

  const pipeline = {};
  const statuses = [
    'Novo',
    'Qualificação',
    'Visita',
    'Simulação',
    'Documentação',
    'Em Atendimento',
    'Proposta',
    'Fechado',
    'Perdido',
  ];
  statuses.forEach((s) => {
    pipeline[s] = { count: 0, totalBudget: 0 };
  });

  (leads || []).forEach((lead) => {
    if (pipeline[lead.status]) {
      pipeline[lead.status].count++;
      pipeline[lead.status].totalBudget += lead.budget || 0;
    }
  });

  return {
    total_leads: (leads || []).length,
    pipeline: Object.entries(pipeline).map(([status, data]) => ({
      status,
      count: data.count,
      total_budget: data.totalBudget,
      avg_budget:
        data.count > 0 ? Math.round(data.totalBudget / data.count) : 0,
    })),
  };
}
