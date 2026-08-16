import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';

export interface DocumentTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
}

export function useDocumentTemplates(type: string) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      toast.error('Erro ao carregar modelos de contrato');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const saveTemplate = async (name: string, content: string, id?: string) => {
    try {
      if (id) {
        const { error } = await supabase
          .from('document_templates')
          .update({ name, content })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('document_templates')
          .insert([{ name, type, content }]);
        if (error) throw error;
      }
      toast.success(id ? 'Modelo atualizado!' : 'Modelo salvo!');
      await fetchTemplates();
      return true;
    } catch (err: any) {
      console.error('Error saving template:', err);
      toast.error('Erro ao salvar modelo');
      return false;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Modelo excluído!');
      await fetchTemplates();
      return true;
    } catch (err: any) {
      console.error('Error deleting template:', err);
      toast.error('Erro ao excluir modelo');
      return false;
    }
  };

  return {
    templates,
    loading,
    fetchTemplates,
    saveTemplate,
    deleteTemplate,
  };
}
