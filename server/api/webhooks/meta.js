/**
 * Meta Lead Ads webhook.
 *
 * Endpoint:
 *  POST /api/webhooks/meta
 *
 * Events handled:
 *  - lead_gen / form submission from Meta Lead Ads
 *
 * Config expected in env:
 *  META_APP_SECRET             - app secret for X-Hub-Signature-256
 *  META_VERIFY_TOKEN           - optional verify token for handshake
 *  META_WEBHOOK_SECRET         - alternative secret name if needed
 */

import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { processMetaLeadWithRouting } from '../../services/metaLeadAdsService.js';

const router = Router();

function getMetaSecret() {
  return (
    process.env.META_APP_SECRET ||
    process.env.META_WEBHOOK_SECRET ||
    ''
  ).trim();
}

function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const crypto = globalThis.crypto || require('crypto');
  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');
  return signature === expected;
}

function extractLeadEntry(body) {
  if (Array.isArray(body.entry)) {
    const changesEntry = body.entry.find((e) =>
      Array.isArray(e.changes)
    );
    if (changesEntry) {
      const leadChange = changesEntry.changes.find((c) => {
        const v = c.value || {};
        return v.lead_id || v.form_id || v.field_names;
      });
      if (leadChange) {
        return { ...leadChange.value, page_id: changesEntry.id };
      }
    }

    const anyEntry = body.entry.find((e) => e.lead_gen_id || e.form_id);
    if (anyEntry) {
      return anyEntry;
    }
  }

  return body;
}

router.get('/', (req, res) => {
  const verifyToken = String(req.query.hub_verify_token || '');
  const expected = String(process.env.META_VERIFY_TOKEN || '');
  if (expected && verifyToken !== expected) {
    return res.status(403).json({ error: 'Invalid verify token' });
  }
  if (req.query.hub_mode === 'subscribe') {
    return res.json({ hub_mode: req.query.hub_mode, hub_challenge: req.query.hub_challenge });
  }
  return res.json({ status: 'ok' });
});

router.post('/', async (req, res) => {
  try {
    const signature = String(req.headers['x-hub-signature-256'] || '');
    const rawBody = JSON.stringify(req.body || {});
    const secret = getMetaSecret();

    if (secret && !verifySignature(rawBody, signature, secret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const leadEntry = extractLeadEntry(req.body || {});

    const leadId = String(
      leadEntry.lead_id ||
      leadEntry.lead_gen_id ||
      req.body.lead_id ||
      ''
    );
    if (!leadId) {
      return res.status(400).json({ error: 'Missing lead_id' });
    }

    const supabase = getSupabaseServer();

    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('meta_lead_id', leadId)
      .maybeSingle();

    if (existing?.id) {
      return res.json({ success: true, lead_id: existing.id, duplicate: true });
    }

    const result = await processMetaLeadWithRouting(leadEntry);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, lead_id: result.lead?.id || null });
  } catch (error) {
    console.error('[MetaWebhook] Error:', error);
    res.status(500).json({ error: 'Erro ao processar lead do Meta' });
  }
});

export default router;
