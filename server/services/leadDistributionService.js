/**
 * Lead Distribution Service - Rodízio automático de leads
 * Distribui leads entre corretores disponíveis usando diferentes estratégias.
 */

import { getSupabaseServer } from '../lib/supabase-server.js';

const DISTRIBUTION_STRATEGIES = {
  ROUND_ROBIN: 'round_robin',
  BALANCED: 'balanced',
  GEOGRAPHIC: 'geographic',
  PERFORMANCE: 'performance',
};

/**
 * Get all active brokers for an organization.
 */
async function getActiveBrokers(organizationId) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('organization_id', organizationId)
    .eq('role', 'BROKER')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get lead count per broker for balancing.
 */
async function getBrokerLeadCounts(organizationId, brokerIds) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('leads')
    .select('broker_id')
    .eq('organization_id', organizationId)
    .in('broker_id', brokerIds)
    .not('status', 'in', '("Fechado","Perdido")');

  if (error) throw error;

  const counts = {};
  brokerIds.forEach((id) => {
    counts[id] = 0;
  });
  (data || []).forEach((lead) => {
    if (counts[lead.broker_id] !== undefined) {
      counts[lead.broker_id]++;
    }
  });
  return counts;
}

/**
 * Round-robin: sequential assignment cycling through brokers.
 */
function roundRobin(brokers, lastAssignedBrokerId) {
  if (!brokers.length) return null;
  if (!lastAssignedBrokerId) return brokers[0];

  const currentIndex = brokers.findIndex((b) => b.id === lastAssignedBrokerId);
  const nextIndex = (currentIndex + 1) % brokers.length;
  return brokers[nextIndex];
}

/**
 * Balanced: assign to broker with fewest active leads.
 */
function balanced(brokers, leadCounts) {
  if (!brokers.length) return null;
  return brokers.reduce((min, broker) => {
    const count = leadCounts[broker.id] || 0;
    const minCount = leadCounts[min.id] || 0;
    return count < minCount ? broker : min;
  }, brokers[0]);
}

/**
 * Performance: assign to broker with highest close rate.
 */
async function performance(organizationId, brokers) {
  const supabase = getSupabaseServer();
  const brokerIds = brokers.map((b) => b.id);

  const { data } = await supabase
    .from('leads')
    .select('broker_id, status')
    .eq('organization_id', organizationId)
    .in('broker_id', brokerIds);

  const stats = {};
  brokerIds.forEach((id) => {
    stats[id] = { total: 0, closed: 0 };
  });
  (data || []).forEach((lead) => {
    if (stats[lead.broker_id]) {
      stats[lead.broker_id].total++;
      if (lead.status === 'Fechado') stats[lead.broker_id].closed++;
    }
  });

  return brokers.reduce((best, broker) => {
    const bestRate =
      stats[best.id]?.total > 0
        ? stats[best.id].closed / stats[best.id].total
        : 0;
    const rate =
      stats[broker.id]?.total > 0
        ? stats[broker.id].closed / stats[broker.id].total
        : 0;
    return rate > bestRate ? broker : best;
  }, brokers[0]);
}

/**
 * Main distribution function. Assigns a lead to a broker based on strategy.
 */
export async function distributeLead(
  organizationId,
  leadId,
  strategy = DISTRIBUTION_STRATEGIES.BALANCED
) {
  const brokers = await getActiveBrokers(organizationId);
  if (!brokers.length) {
    console.warn(
      '[LeadDistribution] No active brokers found for org:',
      organizationId
    );
    return null;
  }

  let selectedBroker;

  switch (strategy) {
    case DISTRIBUTION_STRATEGIES.ROUND_ROBIN: {
      const supabase = getSupabaseServer();
      const { data: lastLead } = await supabase
        .from('leads')
        .select('broker_id')
        .eq('organization_id', organizationId)
        .not('broker_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      selectedBroker = roundRobin(brokers, lastLead?.broker_id);
      break;
    }
    case DISTRIBUTION_STRATEGIES.PERFORMANCE:
      selectedBroker = await performance(organizationId, brokers);
      break;
    case DISTRIBUTION_STRATEGIES.BALANCED:
    default: {
      const leadCounts = await getBrokerLeadCounts(
        organizationId,
        brokers.map((b) => b.id)
      );
      selectedBroker = balanced(brokers, leadCounts);
      break;
    }
  }

  if (!selectedBroker) return null;

  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from('leads')
    .update({ broker_id: selectedBroker.id })
    .eq('id', leadId)
    .eq('organization_id', organizationId);

  if (error) throw error;

  return selectedBroker;
}

/**
 * Bulk distribute multiple leads.
 */
export async function bulkDistributeLeads(
  organizationId,
  leadIds,
  strategy = DISTRIBUTION_STRATEGIES.BALANCED
) {
  const results = [];
  for (const leadId of leadIds) {
    try {
      const broker = await distributeLead(organizationId, leadId, strategy);
      results.push({ leadId, brokerId: broker?.id || null, success: !!broker });
    } catch (err) {
      results.push({ leadId, success: false, error: err.message });
    }
  }
  return results;
}

export { DISTRIBUTION_STRATEGIES };
