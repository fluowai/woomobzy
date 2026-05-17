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
      }),
    });

    return mapToModel(data.lead || { id: data.leadId, ...lead });
  },

  // List leads for Kanban (Implicitly Isolated by Backend)
  async list(page: number = 1, limit: number = 100) {
    const data = await callApi(`/api/crm/leads?page=${page}&limit=${limit}`);
    return data.leads.map(mapToModel);
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
    return data.activity;
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
        image: dbItem.properties.images?.[0],
      }
    : undefined,
});
