import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = express.Router();

const publicQuizLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas. Aguarde um minuto e tente novamente.' },
});

const optionSchema = z.object({
  value: z.string().min(1).max(120),
  label: z.string().min(1).max(240),
  score: z.number().min(0).max(100).default(0),
  disqualify: z.boolean().optional(),
  reason: z.string().max(240).optional(),
});

const questionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/i).max(80),
  label: z.string().min(3).max(300),
  type: z.literal('single').default('single'),
  required: z.boolean().default(true),
  options: z.array(optionSchema).min(2).max(12),
});

const campaignSchema = z.object({
  title: z.string().min(3).max(160),
  slug: z.string().min(3).max(100),
  property_label: z.string().min(3).max(240),
  status: z.enum(['draft', 'active', 'paused', 'archived']).default('draft'),
  whatsapp_number: z.string().min(10).max(20),
  qualification_threshold: z.number().int().min(0).max(100).default(70),
  intro_title: z.string().min(3).max(240),
  intro_copy: z.string().min(10).max(1200),
  success_message: z.string().min(10).max(1200),
  disqualification_message: z.string().min(10).max(1200),
  questions: z.array(questionSchema).min(1).max(30),
  branding: z.record(z.any()).optional().default({}),
});

const submissionSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  phone: z.string().min(8).max(24),
  answers: z.record(z.string().max(160)),
  utm: z.record(z.string().max(500)).optional().default({}),
});

function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function evaluateSubmission(questions, answers, threshold) {
  let earned = 0;
  let maximum = 0;
  const reasons = [];
  const answerSummary = [];

  for (const question of questions) {
    const options = Array.isArray(question.options) ? question.options : [];
    maximum += Math.max(0, ...options.map((option) => Number(option.score || 0)));

    const selectedValue = answers[question.id];
    const selected = options.find((option) => option.value === selectedValue);
    if (!selected) {
      if (question.required) reasons.push(`Pergunta não respondida: ${question.label}`);
      continue;
    }

    earned += Number(selected.score || 0);
    answerSummary.push({
      id: question.id,
      question: question.label,
      value: selected.value,
      answer: selected.label,
    });

    if (selected.disqualify) {
      reasons.push(selected.reason || `Resposta incompatível: ${selected.label}`);
    }
  }

  const score = maximum > 0 ? Math.min(100, Math.round((earned / maximum) * 100)) : 0;
  return {
    score,
    answerSummary,
    reasons: [...new Set(reasons)],
    qualified: reasons.length === 0 && score >= threshold,
  };
}

function budgetFromAnswers(answers) {
  const ranges = {
    'below-1000': 999,
    '1000-1299': 1299,
    '1300-2000': 2000,
    '2001-3000': 3000,
    'above-3000': 3001,
  };
  return ranges[answers.budget] || null;
}

router.get('/campaigns', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('quiz_campaigns')
      .select('*, quiz_submissions(count)')
      .eq('organization_id', req.orgId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, campaigns: data || [] });
  } catch (error) {
    console.error('[Quiz] Erro ao listar campanhas:', error.message);
    res.status(500).json({ error: 'Não foi possível carregar as campanhas.' });
  }
});

router.post('/campaigns', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = campaignSchema.safeParse({
      ...req.body,
      slug: normalizeSlug(req.body?.slug || req.body?.title),
    });
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados da campanha inválidos.', details: validation.error.errors });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('quiz_campaigns')
      .insert({
        ...validation.data,
        organization_id: req.orgId,
        created_by: req.user.id,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, campaign: data });
  } catch (error) {
    console.error('[Quiz] Erro ao criar campanha:', error.message);
    const status = error.code === '23505' ? 409 : 500;
    res.status(status).json({ error: status === 409 ? 'Já existe uma campanha com este endereço.' : 'Não foi possível criar a campanha.' });
  }
});

router.patch('/campaigns/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const allowed = campaignSchema.partial().safeParse({
      ...req.body,
      ...(req.body.slug ? { slug: normalizeSlug(req.body.slug) } : {}),
    });
    if (!allowed.success) {
      return res.status(400).json({ error: 'Alterações inválidas.', details: allowed.error.errors });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('quiz_campaigns')
      .update({ ...allowed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, campaign: data });
  } catch (error) {
    console.error('[Quiz] Erro ao atualizar campanha:', error.message);
    res.status(500).json({ error: 'Não foi possível atualizar a campanha.' });
  }
});

router.get('/campaigns/:id/submissions', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('*')
      .eq('campaign_id', req.params.id)
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json({ success: true, submissions: data || [] });
  } catch (error) {
    console.error('[Quiz] Erro ao listar respostas:', error.message);
    res.status(500).json({ error: 'Não foi possível carregar as respostas.' });
  }
});

router.get('/public/:slug', publicQuizLimiter, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('quiz_campaigns')
      .select('id,title,slug,property_label,intro_title,intro_copy,success_message,disqualification_message,questions,branding')
      .eq('slug', normalizeSlug(req.params.slug))
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Quiz não encontrado ou indisponível.' });
    const publicQuestions = (Array.isArray(data.questions) ? data.questions : []).map((question) => ({
      id: question.id,
      label: question.label,
      type: question.type,
      required: question.required,
      options: (Array.isArray(question.options) ? question.options : []).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    }));
    res.json({ success: true, campaign: { ...data, questions: publicQuestions } });
  } catch (error) {
    console.error('[Quiz] Erro ao abrir quiz público:', error.message);
    res.status(500).json({ error: 'Não foi possível abrir este quiz.' });
  }
});

router.post('/public/:slug/submissions', publicQuizLimiter, async (req, res) => {
  try {
    const validation = submissionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Preencha seus dados e responda todas as perguntas.' });
    }

    const supabase = getSupabaseServer();
    const { data: campaign, error: campaignError } = await supabase
      .from('quiz_campaigns')
      .select('*')
      .eq('slug', normalizeSlug(req.params.slug))
      .eq('status', 'active')
      .maybeSingle();
    if (campaignError) throw campaignError;
    if (!campaign) return res.status(404).json({ error: 'Quiz não encontrado ou indisponível.' });

    const result = evaluateSubmission(
      Array.isArray(campaign.questions) ? campaign.questions : [],
      validation.data.answers,
      Number(campaign.qualification_threshold || 70)
    );
    const classification = result.qualified ? 'qualified' : 'nurture';
    const notes = [
      `Quiz: ${campaign.title}`,
      `Resultado: ${result.qualified ? 'Qualificado' : 'Nutrição futura'} (${result.score}/100)`,
      ...result.answerSummary.map((item) => `${item.question}: ${item.answer}`),
      ...(result.reasons.length ? [`Motivos: ${result.reasons.join('; ')}`] : []),
    ].join('\n');

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: campaign.organization_id,
        name: validation.data.name,
        email: validation.data.email || null,
        phone: validation.data.phone,
        status: result.qualified ? 'Novo' : 'Nutrição Quiz',
        source: 'Quiz OKA',
        campaign: campaign.title,
        notes,
        budget: budgetFromAnswers(validation.data.answers),
        classification,
        lead_score: result.score,
        ai_profile: {
          quiz_campaign_id: campaign.id,
          quiz_slug: campaign.slug,
          qualification_status: classification,
          answers: result.answerSummary,
          reasons: result.reasons,
        },
      })
      .select('id')
      .single();
    if (leadError) throw leadError;

    const { error: submissionError } = await supabase.from('quiz_submissions').insert({
      organization_id: campaign.organization_id,
      campaign_id: campaign.id,
      lead_id: lead.id,
      name: validation.data.name,
      email: validation.data.email || null,
      phone: validation.data.phone,
      answers: validation.data.answers,
      score: result.score,
      qualification_status: classification,
      disqualification_reasons: result.reasons,
      utm: validation.data.utm,
    });
    if (submissionError) throw submissionError;

    let whatsappUrl = null;
    if (result.qualified) {
      const message = [
        `Olá! Sou ${validation.data.name}.`,
        `Fui pré-qualificado pelo Quiz OKA para: ${campaign.property_label}.`,
        `Pontuação: ${result.score}/100.`,
        'Quero confirmar a disponibilidade e agendar uma visita.',
      ].join('\n');
      whatsappUrl = `https://wa.me/${String(campaign.whatsapp_number).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    }

    res.status(201).json({
      success: true,
      qualified: result.qualified,
      score: result.score,
      message: result.qualified ? campaign.success_message : campaign.disqualification_message,
      whatsapp_url: whatsappUrl,
    });
  } catch (error) {
    console.error('[Quiz] Erro ao processar resposta:', error.message);
    res.status(500).json({ error: 'Não foi possível concluir o quiz. Tente novamente.' });
  }
});

export default router;
