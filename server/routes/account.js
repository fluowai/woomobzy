import express from 'express';
import {
  getSupabaseAuthServer,
  getSupabaseServer,
} from '../lib/supabase-server.js';
import { clearProfileCache } from '../middleware/auth.js';

const router = express.Router();

async function findOrgByEmail(supabase, email) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, status, owner_email')
    .ilike('owner_email', email)
    .maybeSingle();
  return org;
}

router.post('/recover-org', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token ausente', code: 'NO_TOKEN' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const supabaseAuth = getSupabaseAuthServer();
    const supabase = getSupabaseServer();

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res
        .status(401)
        .json({ error: 'Token invalido', code: 'INVALID_TOKEN' });
    }

    if (!user.email_confirmed_at && !user.confirmed_at) {
      return res.status(403).json({
        error: 'E-mail nao confirmado para recuperacao de organizacao.',
        code: 'EMAIL_NOT_CONFIRMED',
      });
    }

    const email = String(user.email || '')
      .toLowerCase()
      .trim();
    if (!email) {
      return res
        .status(400)
        .json({ error: 'Email nao disponivel', code: 'NO_EMAIL' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return res
        .status(404)
        .json({ error: 'Perfil nao encontrado', code: 'PROFILE_NOT_FOUND' });
    }

    if (profile.organization_id) {
      return res.json({
        success: true,
        message: 'Perfil ja possui organizacao vinculada.',
        organization_id: profile.organization_id,
      });
    }

    // Somente vincula se o e-mail verificado corresponder exatamente ao owner_email da organizacao.
    const org = await findOrgByEmail(supabase, email);
    const matchType = 'owner_email';

    if (!org || String(org.owner_email || '').toLowerCase().trim() !== email) {
      return res.status(404).json({
        error: 'Nenhuma organizacao encontrada para este email.',
        code: 'NO_ORG_FOUND',
        message: 'Crie uma nova conta em /onboarding ou contate o suporte.',
      });
    }

    if (org.status && org.status !== 'active') {
      return res.status(403).json({
        error: 'Organizacao encontrada mas esta inativa.',
        code: 'ORG_INACTIVE',
      });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        organization_id: org.id,
        role: 'admin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(
        '[AccountRecovery] Profile update failed:',
        updateError.message
      );
      return res.status(500).json({
        error: 'Erro ao vincular perfil a organizacao.',
        code: 'PROFILE_UPDATE_FAILED',
      });
    }

    clearProfileCache(user.id, email);

    console.log('[AccountRecovery] Perfil vinculado com sucesso', {
      userId: user.id,
      email,
      orgId: org.id,
      orgName: org.name,
      matchType,
    });

    return res.json({
      success: true,
      message: 'Perfil vinculado a organizacao com sucesso!',
      organization: { id: org.id, name: org.name },
    });
  } catch (err) {
    console.error('[AccountRecovery] Error:', err.message);
    return res.status(500).json({
      error: 'Erro interno ao recuperar organizacao.',
      code: 'RECOVERY_ERROR',
    });
  }
});

export default router;
