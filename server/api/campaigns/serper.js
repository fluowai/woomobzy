/**
 * /api/campaigns/serper
 * Busca de leads via Serper.dev API (Google Places / Search)
 */
import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import {
  searchSerper,
  resolveSerperApiKey,
} from '../../services/serper-client.js';

const router = Router();

const serperSearchSchema = z.object({
  query: z.string().min(3).max(500),
  type: z.enum(['places', 'search']).optional(),
  gl: z.string().max(5).optional(),
  hl: z.string().max(10).optional(),
  num: z.number().int().min(1).max(100).optional(),
  cache_results: z.boolean().optional(),
});

// ─── POST /api/campaigns/serper/search ─── Buscar no Serper.dev
router.post('/search', verifyAuth, requireTenant, async (req, res) => {
  try {
    const parsed = serperSearchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    }

    const supabase = getSupabaseServer();
    const apiKey = await resolveSerperApiKey(supabase, req.orgId);

    if (!apiKey) {
      return res.status(400).json({
        error: 'Chave da API Serper não configurada',
        hint: 'Configure em Settings > Integrações > Serper API Key, ou defina SERPER_API_KEY no .env',
      });
    }

    const results = await searchSerper(apiKey, {
      query: parsed.data.query,
      type: parsed.data.type || 'places',
      gl: parsed.data.gl,
      hl: parsed.data.hl,
      num: parsed.data.num || 20,
    });

    // Optionally cache results
    let cachedIds = [];
    if (parsed.data.cache_results !== false) {
      const insertRows = results.map((r) => ({
        organization_id: req.orgId,
        query: parsed.data.query,
        result_type: parsed.data.type || 'places',
        name: r.name,
        phone: r.phone || null,
        address: r.address || null,
        website: r.website || null,
        cid: r.cid || null,
        rating: r.rating || null,
        reviews: r.reviews || null,
        category: r.category || null,
        raw_data: r.data || {},
      }));

      // Batch insert cache
      const BATCH_SIZE = 500;
      for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
        const batch = insertRows.slice(i, i + BATCH_SIZE);
        const { data: cached, error } = await supabase
          .from('campaign_serper_cache')
          .insert(batch)
          .select('id');

        if (!error && cached) {
          cachedIds.push(...cached.map((c) => c.id));
        }
      }
    }

    res.json({
      results,
      total: results.length,
      cached_ids: cachedIds,
    });
  } catch (err) {
    console.error('[Serper] Error searching:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/campaigns/serper/cache ─── Listar resultados cacheados
router.get('/cache', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { query, page = 1, limit = 50 } = req.query;
    const supabase = getSupabaseServer();

    let dbQuery = supabase
      .from('campaign_serper_cache')
      .select('*', { count: 'exact' })
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false });

    if (query) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query}%,phone.ilike.%${query}%,address.ilike.%${query}%`
      );
    }

    const offset = (Number(page) - 1) * Number(limit);
    dbQuery = dbQuery.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await dbQuery;
    if (error) throw error;

    res.json({ results: data || [], total: count || 0 });
  } catch (err) {
    console.error('[Serper] Error listing cache:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/campaigns/serper/cache/:id ─── Deletar item do cache
router.delete('/cache/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('campaign_serper_cache')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    console.error('[Serper] Error deleting cache:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
