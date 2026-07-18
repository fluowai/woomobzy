import express from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { PUBLIC_APP_URL } from '../lib/platform-config.js';

const router = express.Router();
const supabase = new Proxy(
  {},
  {
    get: (_, prop) => {
      const client = getSupabaseServer();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Muitas tentativas de onboarding. Tente novamente em 15 minutos.',
  },
});

const onboardingSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(100),
  agencyName: z.string().max(200).optional().nullable().or(z.literal('')),
  creci: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  whatsapp: z.string().optional().nullable().or(z.literal('')),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal('')),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal('')),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  profileType: z
    .enum(['rural', 'traditional'])
    .optional()
    .nullable()
    .or(z.literal('')),
  themeId: z.string().optional().nullable().or(z.literal('')),
  plan: z.string().optional().nullable().or(z.literal('')),
  region: z.string().optional().nullable().or(z.literal('')),
});

router.post('/', authLimiter, async (req, res) => {
  console.log('[Onboarding] Request received', {
    email: maskEmail(req.body?.email),
    profileType: req.body?.profileType,
    plan: req.body?.plan,
  });

  const validation = onboardingSchema.safeParse(req.body);
  if (!validation.success) {
    return res
      .status(400)
      .json({ error: 'Dados inválidos', details: validation.error.errors });
  }

  const {
    email,
    password,
    name,
    agencyName,
    creci,
    phone,
    whatsapp,
    primaryColor,
    secondaryColor,
    logoUrl,
    profileType,
    themeId,
    plan,
    region,
  } = validation.data;

  try {
    const { count: profilesCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    const isFirstUser = (profilesCount || 0) === 0;

    let { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, agencyName },
      });

    if (authError) {
      if (
        authError.message.includes('already registered') ||
        authError.message.includes('User already registered')
      ) {
        return res.status(400).json({
          error: 'Este e-mail já está cadastrado no sistema.',
          details:
            'Por favor, realize o login ou utilize a recuperação de senha.',
        });
      }
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;
    let organization = null;
    let role = isFirstUser ? 'superadmin' : 'admin';

    if (!isFirstUser) {
      if (!agencyName)
        return res
          .status(400)
          .json({ error: 'Nome da imobiliária é obrigatório.' });

      const slug = agencyName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data: selectedPlan } = await supabase
        .from('plans')
        .select('id')
        .ilike('slug', plan || 'free')
        .maybeSingle();

      const trialEndsAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: agencyName,
          slug,
          subdomain: slug,
          niche: profileType || 'rural',
          plan_id: selectedPlan?.id || null,
          trial_ends_at: trialEndsAt,
          subscription_status: 'trial',
        })
        .select()
        .single();

      if (orgError)
        return res
          .status(400)
          .json({ error: `Erro ao criar organização: ${orgError.message}` });
      organization = orgData;
    }

    const { data: profileRecord, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        organization_id: organization?.id || null,
        role,
        name: name || agencyName || 'System Owner',
        email,
        phone: phone || whatsapp,
        creci: creci || null,
        approved: true, // Master accounts are auto-approved
      })
      .select()
      .single();

    if (upsertError)
      console.warn('Profile upsert warning:', upsertError.message);

    let domain = null;
    if (organization) {
      domain = {
        fullDomain: `${PUBLIC_APP_URL}/${organization.slug}`,
        siteUrl: `${PUBLIC_APP_URL}/${organization.slug}/site`,
        slug: organization.slug,
      };
    }

    // Retorna o objeto completo que o Onboarding.tsx espera
    const niche = organization?.niche || 'rural';
    const panelUrl =
      niche === 'urban' || niche === 'traditional' ? '/urban' : '/rural';

    res.json({
      success: true,
      isSuperAdmin: isFirstUser,
      user: profileRecord,
      organization,
      domain,
      panelUrl,
    });
  } catch (error) {
    console.error('Onboarding critical error:', error);
    res.status(500).json({ error: 'Erro no onboarding: ' + error.message });
  }
});

function maskEmail(email = '') {
  const [user, domain] = String(email).split('@');
  if (!user || !domain) return 'invalid-email';
  return `${user.slice(0, 2)}***@${domain}`;
}

export default router;
