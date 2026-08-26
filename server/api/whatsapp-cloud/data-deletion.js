import crypto from 'crypto';

/**
 * Meta WhatsApp Cloud API — Data Deletion Callback
 *
 * When a user requests data deletion via the Meta App Dashboard,
 * Meta POSTs here with signed_request. We extract the user_id,
 * purge associated WhatsApp data, and return the required JSON.
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

      const APP_SECRET = process.env.META_APP_SECRET;
      if (!APP_SECRET) {
        req.log.error('META_APP_SECRET not configured — cannot verify data deletion request');
        return reply.code(500).send({ error: 'Server misconfiguration' });
      }

      const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      const expectedSig = crypto
        .createHmac('sha256', APP_SECRET)
        .update(encodedPayload)
        .digest();

      if (!crypto.timingSafeEqual(sig, expectedSig)) {
        return reply.code(403).send({ error: 'Invalid signature' });
      }

      const data = JSON.parse(
        Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
      );

      const userId = data.user_id;
      req.log.info({ userId }, 'Data deletion request received from Meta');

      // Purge WhatsApp Cloud credentials and messages for this user
      if (userId && opts.db) {
        await purgeWhatsAppData(opts.db, userId, req.log);
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

async function purgeWhatsAppData(db, userId, log) {
  try {
    // Find instances owned by this user and delete cloud credentials
    const { rows: instances } = await db.query(
      `SELECT id FROM instances WHERE user_id = $1 OR created_by = $1`,
      [userId]
    );

    if (instances.length === 0) {
      log.info({ userId }, 'No instances found for user — nothing to purge');
      return;
    }

    const instanceIds = instances.map((i) => i.id);

    // Delete cloud credentials
    await db.query(
      `DELETE FROM whatsapp_cloud_credentials WHERE instance_id = ANY($1)`,
      [instanceIds]
    );

    // Delete outbound messages for these instances
    await db.query(
      `DELETE FROM whatsapp_messages WHERE instance_id = ANY($1)`,
      [instanceIds]
    );

    log.info({ userId, instanceCount: instances.length }, 'WhatsApp data purged for user');
  } catch (err) {
    log.error({ userId, err }, 'Error purging WhatsApp data');
  }
}
