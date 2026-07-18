import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = Router();

router.post(
  '/agents/:id/qualify',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const supabase = getSupabaseServer();
      const { id } = req.params;
      const { lead_id, session_id, rating, feedback } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating deve ser entre 1 e 5.' });
      }

      const { data, error } = await supabase
        .from('agent_qualifications')
        .insert({
          organization_id: req.orgId,
          agent_id: id,
          lead_id: lead_id || null,
          session_id: session_id || null,
          rating,
          feedback: feedback || '',
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ success: true, qualification: data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/agents/:id/metrics',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const supabase = getSupabaseServer();
      const { id } = req.params;

      const [qualifications, memoryCount] = await Promise.all([
        supabase
          .from('agent_qualifications')
          .select('rating, created_at')
          .eq('organization_id', req.orgId)
          .eq('agent_id', id),
        supabase
          .from('conversation_memory')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', req.orgId)
          .eq('agent_id', id),
      ]);

      const ratings = qualifications.data || [];
      const avgRating = ratings.length
        ? (
            ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
            ratings.length
          ).toFixed(2)
        : 0;

      res.json({
        success: true,
        metrics: {
          total_conversations: memoryCount.count || 0,
          total_qualifications: ratings.length,
          average_rating: Number(avgRating),
          rating_distribution: {
            1: ratings.filter((r) => r.rating === 1).length,
            2: ratings.filter((r) => r.rating === 2).length,
            3: ratings.filter((r) => r.rating === 3).length,
            4: ratings.filter((r) => r.rating === 4).length,
            5: ratings.filter((r) => r.rating === 5).length,
          },
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  '/agents/:id/learn',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const supabase = getSupabaseServer();
      const { id } = req.params;
      const { input_text, output_text, was_helpful, corrected_output, tags } =
        req.body;

      const { data, error } = await supabase
        .from('agent_learning')
        .insert({
          organization_id: req.orgId,
          agent_id: id,
          input_text: input_text || '',
          output_text: output_text || '',
          was_helpful: was_helpful ?? null,
          corrected_output: corrected_output || null,
          tags: tags || [],
          learning_score:
            was_helpful === true ? 1 : was_helpful === false ? -1 : 0,
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ success: true, learning: data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
