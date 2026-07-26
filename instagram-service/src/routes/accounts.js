import { Router } from 'express';
import { supabase } from '../index.js';
import { workerPost, workerGet } from '../lib/worker-client.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ error: 'Account not found' });
  }
});

router.post('/connect', async (req, res) => {
  try {
    const { username, is_business_account } = req.body;
    if (!username) return res.status(400).json({ error: 'username is required' });

    const { data: existing } = await supabase
      .from('instagram_accounts')
      .select('id')
      .eq('company_id', req.companyId)
      .eq('username', username)
      .maybeSingle();

    if (existing) return res.status(409).json({ error: 'Account already connected' });

    const { data: account, error: insertError } = await supabase
      .from('instagram_accounts')
      .insert({
        company_id: req.companyId,
        username,
        is_business_account: is_business_account || false,
        status: 'pending',
      })
      .select()
      .single();
    if (insertError) throw insertError;

    const qrResult = await workerPost('/login/qr', {
      accountId: account.id,
      companyId: req.companyId,
      username,
    });

    res.json({
      success: true,
      data: account,
      qr: qrResult.qr,
      sessionId: qrResult.sessionId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/session-status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('instagram_sessions')
      .select('id, session_id, is_valid, expires_at, last_validated_at')
      .eq('account_id', req.params.id)
      .eq('company_id', req.companyId)
      .eq('is_valid', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('instagram_accounts')
      .delete()
      .eq('id', req.params.id)
      .eq('company_id', req.companyId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
