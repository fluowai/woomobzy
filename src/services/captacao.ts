import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export type CaptacaoStatus = 'mapeado' | 'contato' | 'avaliacao' | 'aprovacao' | 'captado';

export interface CaptacaoLead {
  id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  address: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  estimated_value: number | null;
  property_type: string;
  status: CaptacaoStatus;
  notes: string | null;
  assigned_to: string | null;
  created_by: string | null;
}

export type CaptacaoLeadInput = Omit<
  CaptacaoLead,
  'id' | 'organization_id' | 'created_at' | 'updated_at'
>;

export const captacaoService = {
  async list(organizationId: string): Promise<CaptacaoLead[]> {
    try {
      const { data, error } = await supabase
        .from('captacao_leads')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching captacao leads', error);
      throw error;
    }
  },

  async create(organizationId: string, lead: CaptacaoLeadInput): Promise<CaptacaoLead> {
    try {
      const { data, error } = await supabase
        .from('captacao_leads')
        .insert([{ ...lead, organization_id: organizationId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating captacao lead', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<CaptacaoLeadInput>): Promise<CaptacaoLead> {
    try {
      const { data, error } = await supabase
        .from('captacao_leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating captacao lead', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('captacao_leads').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting captacao lead', error);
      throw error;
    }
  }
};
