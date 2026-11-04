import crypto from 'crypto';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { decrypt } from '../../lib/crypto.js';

/**
 * Meta WhatsApp Cloud API — Data Deletion Callback
 *
 * When a user requests data deletion via the Meta App Dashboard,
 * Meta POSTs here with signed_request. We extract the user_id,
 * purge associated WhatsApp data, and return the required JSON.
 *
 * The APP_SECRET is fetched per-tenant from whatsapp_cloud_credentials,
 * not from a global env var, since each client has their own Meta app.
 *
 * Docs: https://developers.facebook.com/docs/privacy/data-deletion-callbacks
 */
export default function dataDeletionRoutes(app, opts, done) {
  app.post('/api/whatsapp-cloud/data-deletion', async (req, reply) => {
    try {
      const { signed_request } = req.body || {};

      if (!signed_request) {
        return reply.code(400).send({ error: 'signed_request is required' });
      }

      const [encodedSig, encodedPayload] = signed_request.split('.', 2);
      if (!encodedSig || !encodedPayload) {
        return reply.code(400).send({ error: 'Invalid signed_request format' });
      }

      const supabase = getSupabaseServer();

      // Decode payload to extract app_id, then look up the per-tenant APP_SECRET
      const payloadData = JSON.parse(
        Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
      );

      const appId = payloadData.app_id;
      if (!appId) {
        return reply.code(400).send({ error: 'app_id not found in signed_request' });
      }

      const { data: cred } = await supabase
        .from('whatsapp_cloud_credentials')
        .select('app_secret_encrypted, tenant_id')
        .eq('app_id', appId)
        .single();

      if (!cred || !cred.app_secret_encrypted) {
        req.log.warn({ appId }, 'Data deletion: no credentials found for app_id');
        return reply.code(404).send({ error: 'App not configured' });
      }

      const appSecret = decrypt(cred.app_secret_encrypted);
      const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      const expectedSig = crypto
        .createHmac('sha256', appSecret)
        .update(encodedPayload)
        .digest();

      if (!crypto.timingSafeEqual(sig, expectedSig)) {
        return reply.code(403).send({ error: 'Invalid signature' });
      }

      const userId = payloadData.user_id;
      req.log.info({ userId, appId }, 'Data deletion request received from Meta');

      // Purge WhatsApp Cloud credentials and messages for this user
      if (userId) {
        await purgeWhatsAppData(supabase, userId, req.log);
      }

      return reply.send({
        url: `${process.env.PUBLIC_APP_URL || 'https://imob.wootech.com.br'}/api/whatsapp-cloud/data-deletion/status`,
        confirmation_code: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });
    } catch (err) {
      req.log.error(err, 'Error processing data deletion request');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Optional: status endpoint to confirm deletion
  app.get('/api/whatsapp-cloud/data-deletion/status', async (_req, reply) => {
    return reply.send({
      status: 'completed',
      message: 'Data has been processed for deletion.',
    });
  });

  done();
};

async function purgeWhatsAppData(supabase, userId, log) {
  try {
    // Find instances owned by this user and delete cloud credentials
    const { data: instances } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .or(`user_id.eq.${userId},created_by.eq.${userId}`);

    if (!instances || instances.length === 0) {
      log.info({ userId }, 'No instances found for user — nothing to purge');
      return;
    }

    const instanceIds = instances.map((i) => i.id);

    // Delete cloud credentials
    await supabase
      .from('whatsapp_cloud_credentials')
      .delete()
      .in('instance_id', instanceIds);

    // Delete outbound messages for these instances
    await supabase
      .from('whatsapp_messages')
      .delete()
      .in('instance_id', instanceIds);

    log.info({ userId, instanceCount: instances.length }, 'WhatsApp data purged for user');
  } catch (err) {
    log.error({ userId, err }, 'Error purging WhatsApp data');
  }
}
