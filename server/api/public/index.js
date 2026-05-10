import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = Router();

const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

router.get('/', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { path, slug } = req.query;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant não identificado' });
  }

  if (path === 'landing-page') {
    if (!slug) return res.status(400).json({ error: 'Slug é obrigatório' });
    try {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('organization_id', tenantId)
        .eq('slug', slug)
        .eq('published', true)
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Landing page não encontrada' });
      await supabase.rpc('increment_landing_page_views', { page_id: data.id });
      return res.status(200).json(data);
    } catch (error) {
      console.error('Erro ao buscar landing page:', error);
      return res.status(500).json({ error: 'Erro ao carregar página' });
    }
  }

  if (path === 'properties') {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('organization_id', tenantId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ data, count: data?.length || 0 });
    } catch (error) {
      console.error('Erro ao buscar propriedades:', error);
      return res.status(500).json({ error: 'Erro ao carregar propriedades' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
});

export default router;
