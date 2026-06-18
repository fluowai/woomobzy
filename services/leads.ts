import { Lead } from '../types';
import { callApi } from '../src/lib/api';
import { supabase } from './supabase';

export const leadService = {
  // Create a new lead (Now Backend-Driven)
  async create(lead: Partial<Lead>) {
    // Se temos organization_id mas não temos token, usamos a rota pública
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const isPublic = !session?.access_token && lead.organization_id;
    const endpoint = isPublic ? '/api/public/leads' : '/api/crm/leads';

    const data = await callApi(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        organization_id: lead.organization_id, // Incluído para rotas públicas
        organization_slug: (lead as any).organization_slug,
        organization_domain: (lead as any).organization_domain,
        owner_email: (lead as any).owner_email,
        site_key: (lead as any).site_key,
        referrer_url: (lead as any).referrer_url,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        property_id: lead.propertyId,
        source: lead.source,
        ad_reference: lead.ad_reference,
        organic_channel: lead.organic_channel,
        campaign: lead.campaign,
        notes: lead.notes,
        budget: lead.budget,
        aptitude_interest: lead.aptitude_interest,
        match_profile: (lead as any).match_profile,
        status: (lead as any).status,
        classification: (lead as any).classification,
        lead_score: (lead as any).lead_score,
      }),
    });

    return mapToModel(data.lead || { id: data.leadId, ...lead });
  },

  // List leads for Kanban (Implicitly Isolated by Backend)
  async list(page: number = 1, limit: number = 50) {
    const data = await callApi(`/api/crm/leads?page=${page}&limit=${limit}`);
    return (data.leads || []).map(mapToModel);
  },

  async listPage(params: {
    status: string;
    limit?: number;
    cursor?: { created_at: string; id: string } | null;
    includeCount?: boolean;
  }) {
    const search = new URLSearchParams({
      status: params.status,
      limit: String(params.limit || 50),
      include_count: String(params.includeCount !== false),
    });
    if (params.cursor) {
      search.set('cursor_created_at', params.cursor.created_at);
      search.set('cursor_id', params.cursor.id);
    }

    const data = await callApi(`/api/crm/leads?${search.toString()}`);
    return {
      leads: dedupeById(data.leads || []).map(mapToModel),
      nextCursor: data.next_cursor || null,
      total: data.pagination?.total || 0,
      hasMore: Boolean(data.pagination?.has_more),
    };
  },

  async getById(id: string) {
    const data = await callApi(`/api/crm/leads/${id}`);
    return {
      lead: mapToModel(data.lead),
      activities: data.activities || [],
    };
  },

  // Update lead status (Now Backend-Driven)
  async updateStatus(id: string, status: string) {
    const data = await callApi(`/api/crm/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    return mapToModel(data.lead);
  },

  // Update lead details
  async update(id: string, lead: Partial<Lead>) {
    const data = await callApi(`/api/crm/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(lead),
    });
    return mapToModel(data.lead);
  },

  async matchProperties(id: string, profile?: 'urbano' | 'rural') {
    const data = await callApi(`/api/crm/leads/${id}/match-properties`, {
      method: 'POST',
      body: JSON.stringify(profile ? { match_profile: profile } : {}),
    });
    return mapToModel(data.lead);
  },

  // Get lead activities
  async getActivities(id: string) {
    const data = await callApi(`/api/crm/leads/${id}/activities`);
    return data.activities;
  },

  // Add lead activity
  async addActivity(id: string, activity: { type: string; description: string; metadata?: any }) {
    const data = await callApi(`/api/crm/leads/${id}/activities`, {
      method: 'POST',
      body: JSON.stringify(activity),
    });
    return {
      activity: data.activity,
      lead: data.lead ? mapToModel(data.lead) : null,
    };
  },

  // Send welcome message via WhatsApp (Backend Proxy)
  async sendWelcome(id: string) {
    const data = await callApi(`/api/crm/leads/${id}/welcome`, {
      method: 'POST',
    });
    return data;
  },
  
  // Delete lead
  async delete(id: string) {
    const data = await callApi(`/api/crm/leads/${id}`, {
      method: 'DELETE',
    });
    return data;
  },
  
  // Bulk delete leads
  async bulkDelete(ids: string[]) {
    const data = await callApi('/api/crm/leads/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    return data;
  },
};

const dedupeById = (items: any[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.id) return true;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const mapToModel = (dbItem: any): Lead => ({
  id: dbItem.id,
  organization_id: dbItem.organization_id,
  name: dbItem.name,
  email: dbItem.email,
  phone: dbItem.phone,
  source: dbItem.source,
  status: dbItem.status,
  budget: dbItem.budget || 0,
  preferences: dbItem.preferences || {},
  aptitude_interest: dbItem.aptitude_interest || [],
  notes: dbItem.notes,
  classification: dbItem.classification,
  lead_score: dbItem.lead_score,
  ai_profile: dbItem.ai_profile,
  ai_next_action: dbItem.ai_next_action,
  ai_last_intent: dbItem.ai_last_intent,
  ai_last_confidence: dbItem.ai_last_confidence,
  next_follow_up_at: dbItem.next_follow_up_at,
  next_visit_at: dbItem.next_visit_at,
  tags: Array.isArray(dbItem.lead_tags)
    ? dbItem.lead_tags.map((item: any) => item.tag).filter(Boolean)
    : Array.isArray(dbItem.tags)
      ? dbItem.tags
      : [],
  chat_jid: dbItem.chat_jid,
  createdAt: dbItem.created_at,
  propertyId: dbItem.property_id,
  ad_reference: dbItem.ad_reference,
  organic_channel: dbItem.organic_channel,
  campaign: dbItem.campaign,
  last_contacted_at: dbItem.last_contacted_at,
  matched_properties: Array.isArray(dbItem.matched_properties) ? dbItem.matched_properties : [],
  match_summary: dbItem.match_summary,
  matched_at: dbItem.matched_at,
  match_profile: dbItem.match_profile,
  match_whatsapp_message: dbItem.match_whatsapp_message,
  property: dbItem.properties
    ? {
        title: dbItem.properties.title,
        price: dbItem.properties.price,
        image: dbItem.properties.thumbnail || dbItem.properties.images?.[0],
      }
    : undefined,
});
