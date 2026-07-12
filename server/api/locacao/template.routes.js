/**
 * Template Routes - CRUD de modelos de contrato
 * /api/locacao/templates
 */
import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

import { isValidUUID } from '../../lib/shared-utils.js';

const router = Router();

const templateSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().optional(),
  content: z.string().min(50),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
});

// Variáveis obrigatórias para contrato de locação
const REQUIRED_VARIABLES = [
  'nome_locador', 'cpf_locador', 'nome_locatario', 'cpf_locatario',
  'endereco_imovel', 'valor_aluguel', 'valor_caucao', 'data_inicio',
  'data_fim', 'prazo_meses', 'dia_vencimento', 'indice_reajuste',
  'tipo_garantia', 'multa_atraso', 'juros_atraso', 'cidade', 'data_geracao',
];

/**
 * GET /api/locacao/templates
 */
router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('organization_id', req.orgId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[TemplateRoutes] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/templates
 */
router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = templateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('contract_templates')
      .insert({
        organization_id: req.orgId,
        created_by: req.userId,
        category: 'locacao',
        version: 1,
        ...validation.data,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[TemplateRoutes] Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locacao/templates/:id
 */
router.get('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Template não encontrado' });

    // Busca versões anteriores
    const { data: versions } = await supabase
      .from('contract_versions')
      .select('*')
      .eq('template_id', id)
      .order('version', { ascending: false });

    res.json({ success: true, data: { ...data, versions: versions || [] } });
  } catch (error) {
    console.error('[TemplateRoutes] Get error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/locacao/templates/:id
 */
router.put('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const validation = templateSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();

    // Get current version to archive it
    const { data: current } = await supabase
      .from('contract_templates')
      .select('content, variables, version')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (!current) return res.status(404).json({ error: 'Template não encontrado' });

    // Save current version to history
    await supabase.from('contract_versions').insert({
      template_id: id,
      organization_id: req.orgId,
      version: current.version,
      content: current.content,
      variables: current.variables,
      change_log: req.body.change_log || 'Atualização',
      created_by: req.userId,
    });

    // Update template with new version
    const { data, error } = await supabase
      .from('contract_templates')
      .update({
        ...validation.data,
        version: current.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('[TemplateRoutes] Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/locacao/templates/:id
 */
router.delete('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('contract_templates')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', req.orgId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('[TemplateRoutes] Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/templates/validate
 * Valida um template e retorna variáveis encontradas vs obrigatórias
 */
router.post('/validate', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Conteúdo é obrigatório' });

    const foundVars = [...content.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
    const uniqueVars = [...new Set(foundVars)];
    const missingVars = REQUIRED_VARIABLES.filter(v => !uniqueVars.includes(v));

    res.json({
      success: true,
      data: {
        variables_found: uniqueVars,
        variables_count: uniqueVars.length,
        missing_required: missingVars,
        missing_count: missingVars.length,
        is_valid: missingVars.length === 0,
      },
    });
  } catch (error) {
    console.error('[TemplateRoutes] Validate error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
