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
  const { startDate, endDate } = dateRange;

  const { data: brokers, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('organization_id', organizationId)
    .eq('role', 'BROKER');

  if (error) throw error;
  if (!brokers?.length) return [];

  const brokerIds = brokers.map((b) => b.id);

  let leadsQuery = supabase
    .from('leads')
    .select('broker_id, status, budget, created_at')
    .eq('organization_id', organizationId)
    .in('broker_id', brokerIds);

  if (startDate) leadsQuery = leadsQuery.gte('created_at', startDate);
  if (endDate) leadsQuery = leadsQuery.lte('created_at', endDate);

  const { data: leads } = await leadsQuery;

  let activitiesQuery = supabase
    .from('lead_activities')
    .select('created_by', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('created_by', brokerIds);

  if (startDate) activitiesQuery = activitiesQuery.gte('created_at', startDate);
  if (endDate) activitiesQuery = activitiesQuery.lte('created_at', endDate);

  const { count: totalActivities } = await activitiesQuery;

  const statsByBroker = {};
  brokerIds.forEach((id) => {
    statsByBroker[id] = {
      total_leads: 0,
      converted_leads: 0,
      lost_leads: 0,
      total_budget: 0,
      total_activities: 0,
      source_breakdown: {},
      status_breakdown: {},
      monthly_trend: {},
    };
  });

  (leads || []).forEach((lead) => {
    const stats = statsByBroker[lead.broker_id];
    if (!stats) return;
    stats.total_leads++;
    if (lead.status === 'Fechado') stats.converted_leads++;
    if (lead.status === 'Perdido') stats.lost_leads++;
    stats.total_budget += lead.budget || 0;
    const src = lead.source || 'Desconhecido';
    stats.source_breakdown[src] = (stats.source_breakdown[src] || 0) + 1;
    stats.status_breakdown[lead.status] =
      (stats.status_breakdown[lead.status] || 0) + 1;
    const month = lead.created_at?.slice(0, 7) || 'unknown';
    if (!stats.monthly_trend[month])
      stats.monthly_trend[month] = { total: 0, converted: 0 };
    stats.monthly_trend[month].total++;
    if (lead.status === 'Fechado') stats.monthly_trend[month].converted++;
  });

  const activityCount = totalActivities || 0;
  const perBrokerActivities = Math.floor(
    activityCount / (brokerIds.length || 1)
  );
  brokerIds.forEach((id) => {
    statsByBroker[id].total_activities = perBrokerActivities;
  });

  const rankings = brokers.map((broker) => {
    const stats = statsByBroker[broker.id] || statsByBroker[brokerIds[0]];
    const conversionRate =
      stats.total_leads > 0
        ? (stats.converted_leads / stats.total_leads) * 100
        : 0;
    return {
      ...broker,
      ...stats,
      summary: {
        total_leads: stats.total_leads,
        converted_leads: stats.converted_leads,
        active_leads:
          stats.total_leads - stats.converted_leads - stats.lost_leads,
        lost_leads: stats.lost_leads,
        conversion_rate: Number(conversionRate.toFixed(1)),
        total_activities: stats.total_activities,
        avg_budget:
          stats.total_leads > 0
            ? Math.round(stats.total_budget / stats.total_leads)
            : 0,
      },
    };
  });

  return rankings.sort(
    (a, b) =>
      b.summary.conversion_rate - a.summary.conversion_rate ||
      b.summary.converted_leads - a.summary.converted_leads
  );
}

/**
 * Get pipeline summary for the whole organization.
 */
export async function getPipelineSummary(organizationId, dateRange = {}) {
  const supabase = getSupabaseServer();
  const { startDate, endDate } = dateRange;

  let leadsQuery = supabase
    .from('leads')
    .select('status, budget', { count: 'exact', head: false })
    .eq('organization_id', organizationId);

  if (startDate) leadsQuery = leadsQuery.gte('created_at', startDate);
  if (endDate) leadsQuery = leadsQuery.lte('created_at', endDate);

  const { data: leads, error } = await leadsQuery;
  if (error) throw error;

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

  const pipeline = {};
  statuses.forEach((s) => {
    pipeline[s] = { count: 0, totalBudget: 0 };
  });

  let totalLeads = 0;
  (leads || []).forEach((lead) => {
    if (pipeline[lead.status]) {
      pipeline[lead.status].count++;
      pipeline[lead.status].totalBudget += lead.budget || 0;
      totalLeads++;
    }
  });

  return {
    total_leads: totalLeads,
    pipeline: statuses.map((status) => {
      const data = pipeline[status];
      return {
        status,
        count: data.count,
        total_budget: data.totalBudget,
        avg_budget:
          data.count > 0 ? Math.round(data.totalBudget / data.count) : 0,
      };
    }),
  };
}
