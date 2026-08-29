import express from 'express';
import { supabase } from '../supabase.js';
import crypto from 'crypto';

const router = express.Router();

// For production, these keys should come from environment variables.
// Generating temporary keys if none are provided for demo purposes.
let privateKey, publicKey;
try {
  if (process.env.LICENSE_PRIVATE_KEY && process.env.LICENSE_PUBLIC_KEY) {
    privateKey = process.env.LICENSE_PRIVATE_KEY;
    publicKey = process.env.LICENSE_PUBLIC_KEY;
  } else {
    const keyPair = crypto.generateKeyPairSync('ed25519');
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;
  }
} catch (e) {
  console.warn("Could not generate Ed25519 keys, fallback to none.");
}

/**
 * POST /api/licensing/heartbeat
 * Heartbeat endpoint for self-hosted instances
 */
router.post('/heartbeat', async (req, res) => {
  try {
    const { license_id, instance_id, product, version, domain, fingerprint, timestamp } = req.body;

    if (!license_id || !instance_id) {
      return res.status(400).json({ error: 'Missing license_id or instance_id' });
    }

    // 1. Find License in Database
    const { data: license, error: licenseError } = await supabase
      .from('woo_licenses')
      .select('*, woo_products(slug)')
      .eq('license_id', license_id)
      .single();

    if (licenseError || !license) {
      return res.status(404).json({ error: 'License not found' });
    }

    // 2. Validate Domain (if required by license rules)
    if (license.allowed_domains && license.allowed_domains.length > 0) {
      if (!license.allowed_domains.includes(domain)) {
        // Record Audit Event for Domain Conflict
        await supabase.from('woo_audit_logs').insert({
          organization_id: license.organization_id,
          action: 'HEARTBEAT_DOMAIN_CONFLICT',
          target: license_id,
          metadata: { attempted_domain: domain, instance_id }
        });
        return res.status(403).json({ error: 'Domain not allowed' });
      }
    }

    // 3. Status checks
    const now = new Date();
    const expiresAt = license.expires_at ? new Date(license.expires_at) : null;
    const graceUntil = license.grace_until ? new Date(license.grace_until) : null;
    
    let computedStatus = license.status;

    if (license.status === 'REVOKED' || license.status === 'SUSPENDED') {
      return res.status(403).json({ error: `License is ${license.status}` });
    }

    if (expiresAt && now > expiresAt) {
      if (graceUntil && now <= graceUntil) {
        computedStatus = 'GRACE';
      } else {
        computedStatus = 'SUSPENDED';
        // Auto-suspend in DB
        await supabase.from('woo_licenses').update({ status: 'SUSPENDED' }).eq('id', license.id);
        return res.status(403).json({ error: 'License expired and grace period ended' });
      }
    }

    // 4. Update Deployment/Instance Record
    const { data: existingDeployment } = await supabase
      .from('woo_deployments')
      .select('id')
      .eq('instance_id', instance_id)
      .single();

    if (existingDeployment) {
      await supabase.from('woo_deployments').update({
        last_heartbeat: now.toISOString(),
        domain,
        version,
        status: computedStatus === 'GRACE' ? 'DEGRADED' : 'ONLINE'
      }).eq('id', existingDeployment.id);
    } else {
      await supabase.from('woo_deployments').insert({
        instance_id,
        license_id: license.id,
        organization_id: license.organization_id,
        product_id: license.product_id,
        domain,
        version,
        last_heartbeat: now.toISOString(),
        status: 'ONLINE'
      });
    }

    // 5. Generate Lease (e.g. valid for 72 hours)
    const leaseHours = 72;
    const leaseUntil = new Date(now.getTime() + leaseHours * 60 * 60 * 1000);

    const payload = {
      schema: 1,
      license_id,
      organization_id: license.organization_id,
      product_id: license.product_id,
      plan: license.plan,
      instance_id,
      status: computedStatus,
      allowed_domains: license.allowed_domains,
      max_instances: license.max_instances,
      features: license.features,
      version: license.version,
      minimum_version: license.minimum_version,
      issued_at: Math.floor(now.getTime() / 1000),
      expires_at: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null,
      grace_until: graceUntil ? Math.floor(graceUntil.getTime() / 1000) : null,
      lease_until: Math.floor(leaseUntil.getTime() / 1000)
    };

    // 6. Sign payload with Ed25519
    let signatureHex = '';
    if (privateKey) {
      try {
        const payloadString = JSON.stringify(payload);
        const signature = crypto.sign(null, Buffer.from(payloadString), privateKey);
        signatureHex = signature.toString('hex');
      } catch (err) {
        console.error("Signature error:", err);
      }
    }

    payload.signature = signatureHex;

    // Update lease_until in DB
    await supabase.from('woo_licenses').update({ lease_until: leaseUntil.toISOString(), status: computedStatus }).eq('id', license.id);

    res.json({ success: true, lease: payload });

  } catch (error) {
    console.error('Licensing Heartbeat Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
