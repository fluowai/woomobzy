import express from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { provisionTenantDomain } from '../domainService.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

const router = express.Router();
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de onboarding. Tente novamente em 15 minutos.' },
});

const onboardingSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(100),
  agencyName: z.string().max(200).optional().nullable().or(z.literal('')),
  creci: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  whatsapp: z.string().optional().nullable().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().or(z.literal('')),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().or(z.literal('')),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  profileType: z.enum(['rural', 'traditional', 'hybrid']).optional().nullable().or(z.literal('')),
  themeId: z.string().optional().nullable().or(z.literal('')),
  plan: z.string().optional().nullable().or(z.literal('')),
  region: z.string().optional().nullable().or(z.literal('')),
});

router.post('/', authLimiter, async (req, res) => {
  const validation = onboardingSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Dados inválidos', details: validation.error.errors });
  }
  
  const {
    email, password, name, agencyName, creci, phone, whatsapp,
    primaryColor, secondaryColor, logoUrl, profileType, themeId, plan, region,
  } = validation.data;

  try {
    const { count: profilesCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const isFirstUser = (profilesCount || 0) === 0;

    let { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { name, agencyName },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        // Fetch existing user if already recorded
        const { data: searchData, error: searchError } = await supabase.auth.admin.listUsers();
        const existing = searchData?.users?.find(u => u.email === email);
        if (existing) {
          authData = { user: existing };
          authError = null;
        } else {
          return res.status(400).json({ error: 'Usuário já existe mas não pôde ser recuperado.' });
        }
      } else {
        return res.status(400).json({ error: authError.message });
      }
    }

    const userId = authData.user.id;
    let organization = null;
    let role = isFirstUser ? 'superadmin' : 'admin';

    if (!isFirstUser) {
      if (!agencyName) return res.status(400).json({ error: 'Nome da imobiliária é obrigatório.' });
      
      const slug = agencyName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const { data: orgData, error: orgError } = await supabase.from('organizations').insert({
        name: agencyName, 
        slug, 
        subdomain: slug,
        niche: profileType || 'rural' // Salva o nicho selecionado
      }).select().single();
      
      if (orgError) return res.status(400).json({ error: `Erro ao criar organização: ${orgError.message}` });
      organization = orgData;
    }

    const { data: profileRecord, error: upsertError } = await supabase.from('profiles').upsert({
      id: userId, 
      organization_id: organization?.id || null, 
      role, 
      name: name || agencyName || 'System Owner',
      email, phone: phone || whatsapp, creci: creci || null,
    }).select().single();

    if (upsertError) console.warn('Profile upsert warning:', upsertError.message);

    let domain = null;
    if (organization) {
      try {
        const domainResult = await provisionTenantDomain(organization.slug);
        if (domainResult?.success) {
          const { data: domainData } = await supabase.from('domains').insert({
            organization_id: organization.id, domain: domainResult.fullDomain, is_primary: true, status: 'active',
          }).select().single();
          domain = domainData;
        }
      } catch (e) { console.warn('Domain error:', e.message); }
    }

    // Retorna o objeto completo que o Onboarding.tsx espera
    const niche = organization?.niche || 'rural';
    const panelUrl = niche === 'urban' || niche === 'traditional' ? '/urban' : '/rural';

    res.json({ 
      success: true, 
      isSuperAdmin: isFirstUser,
      user: profileRecord,
      organization,
      domain,
      panelUrl
    });
  } catch (error) {
    console.error('Onboarding critical error:', error);
    res.status(500).json({ error: 'Erro no onboarding: ' + error.message });
  }
});

export default router;
