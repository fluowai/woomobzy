import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Property, PropertyStatus } from '../types/property';

interface UsePropertiesOptions {
  companyId: string;
  status?: PropertyStatus;
  category?: 'RURAL' | 'URBAN';
  limit?: number;
}

export function useProperties({
  companyId,
  status,
  category,
  limit = 50,
}: UsePropertiesOptions) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setProperties(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [companyId, status, category, limit]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const createProperty = async (property: Partial<Property>) => {
    const { data, error } = await supabase
      .from('properties')
      .insert([{ ...property, company_id: companyId }])
      .select()
      .single();

    if (error) throw error;
    setProperties((prev) => [data, ...prev]);
    return data;
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setProperties((prev) => prev.map((p) => (p.id === id ? data : p)));
    return data;
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) throw error;
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    properties,
    loading,
    error,
    refetch: fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
  };
}
