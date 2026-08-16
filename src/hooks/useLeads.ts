import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead, LeadStatus } from '../types/lead';

interface UseLeadsOptions {
  organizationId: string;
  status?: LeadStatus;
}

export function useLeads({ organizationId, status }: UseLeadsOptions) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setLeads(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, status]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const createLead = async (lead: Partial<Lead>) => {
    const { data, error } = await supabase
      .from('leads')
      .insert([{ ...lead, organization_id: organizationId }])
      .select()
      .single();

    if (error) throw error;
    setLeads((prev) => [data, ...prev]);
    return data;
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setLeads((prev) => prev.map((l) => (l.id === id ? data : l)));
    return data;
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  return {
    leads,
    loading,
    error,
    refetch: fetchLeads,
    createLead,
    updateLead,
    deleteLead,
  };
}
