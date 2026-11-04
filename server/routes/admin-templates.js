/**
 * Global Templates Routes - CRUD for system-wide templates
 * /api/admin/templates
 */
import { Router } from 'express';
import { verifyAdmin } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { z } from 'zod';

const router = Router();

const templateSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(['landing_page', 'email', 'contract', 'report']),
  category: z.string().max(100).optional().default('Geral'),
  description: z.string().max(500).optional().default(''),
  preview: z.string().max(10).optional().default('📄'),
  is_default: z.boolean().optional().default(false),
});

const DEFAULT_TEMPLATES = [
  {
    name: 'Landing Fazenda Premium',
    type: 'landing_page',
    category: 'Rural',
    description: 'Template premium para fazendas com mapa e ficha técnica',
    preview: '🏡',
    is_default: true,
  },
  {
    name: 'Landing Apartamento',
    type: 'landing_page',
    category: 'Urbano',
    description: 'Template para apartamentos com galeria e financiamento',
    preview: '🏢',
    is_default: true,
  },
  {
    name: 'Landing Empreendimento',
    type: 'landing_page',
    category: 'Urbano',
    description: 'Template para lançamentos com tabela de preços',
    preview: '🏗',
    is_default: true,
  },
  {
    name: 'Email - Novo Lead',
    type: 'email',
    category: 'Geral',
    description: 'Template de email para novos leads',
    preview: '📧',
    is_default: true,
  },
  {
    name: 'Email - Follow Up',
    type: 'email',
    category: 'Geral',
    description: 'Template de email para follow up automático',
    preview: '📬',
    is_default: true,
  },
  {
    name: 'Contrato de Venda',
    type: 'contract',
    category: 'Geral',
    description: 'Modelo padrão de contrato de compra e venda',
    preview: '📄',
    is_default: true,
  },
  {
    name: 'Contrato de Locação',
    type: 'contract',
    category: 'Urbano',
    description: 'Modelo padrão de contrato de locação residencial',
    preview: '🔑',
    is_default: true,
  },
  {
    name: 'Relatório Mensal',
    type: 'report',
    category: 'Geral',
    description: 'Template de relatório mensal para proprietários',
    preview: '📊',
    is_default: true,
  },
  {
    name: 'Dossiê Rural',
    type: 'report',
    category: 'Rural',
    description: 'Template de dossiê técnico para propriedades rurais',
    preview: '📋',
    is_default: true,
  },
];

router.get('/', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('global_templates')
      .select('*')
      .eq('organization_id', req.orgId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return res.json({ success: true, data: [], seeded: false });
      }
      throw error;
    }

    if (!data || data.length === 0) {
      const seedResult = await seedDefaultTemplates(req.orgId);
      return res.json({ success: true, data: seedResult, seeded: true });
    }

    res.json({ success: true, data, seeded: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const validation = templateSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('global_templates')
      .insert({
        organization_id: req.orgId,
        created_by: req.user?.id || null,
        ...validation.data,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/duplicate/:id', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseServer();

    const { data: original, error: fetchError } = await supabase
      .from('global_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (fetchError || !original) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    const { id: _, created_at, updated_at, ...rest } = original;
    const { data, error } = await supabase
      .from('global_templates')
      .insert({
        ...rest,
        name: `${rest.name} (Cópia)`,
        is_default: false,
        created_by: req.user?.id || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseServer();

    const { data: template, error: fetchError } = await supabase
      .from('global_templates')
      .select('is_default')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (fetchError || !template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    if (template.is_default) {
      return res
        .status(400)
        .json({ error: 'Templates padrão não podem ser excluídos' });
    }

    const { error } = await supabase
      .from('global_templates')
      .delete()
      .eq('id', id)
      .eq('organization_id', req.orgId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function seedDefaultTemplates(orgId) {
  const supabase = getSupabaseServer();
  const rows = DEFAULT_TEMPLATES.map((t) => ({
    ...t,
    organization_id: orgId,
  }));

  const { data, error } = await supabase
    .from('global_templates')
    .insert(rows)
    .select();

  if (error) {
    return DEFAULT_TEMPLATES.map((t, i) => ({
      ...t,
      id: `local-${i}`,
      organization_id: orgId,
    }));
  }

  return data || [];
}

export default router;
