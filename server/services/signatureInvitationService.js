import { getSupabaseServer } from '../lib/supabase-server.js';
import { sendContactFormEmail } from './emailService.js';

const SIGNATURE_PROVIDERS = {
  proprio: { name: 'Assinatura Própria', apiUrl: null },
  clicksign: { name: 'ClickSign', apiUrl: 'https://api.clicksign.com/api/v1' },
  zapsign: { name: 'ZapSign', apiUrl: 'https://api.zapsign.com.br/api/v1' },
  docusign: { name: 'DocuSign', apiUrl: 'https://demo.docusign.net/restapi' },
};

export class SignatureInvitationService {

  static async sendInvitation(signatureId, orgId) {
    const supabase = getSupabaseServer();

    const { data: sig, error: sigError } = await supabase
      .from('signatures')
      .select('*, lease:lease_id(*)')
      .eq('id', signatureId)
      .single();

    if (sigError || !sig) throw new Error('Signature not found: ' + (sigError?.message || 'unknown'));

    const { data: lease } = await supabase
      .from('leases')
      .select('*')
      .eq('id', sig.lease_id)
      .single();

    if (!lease) throw new Error('Lease not found');

    if (sig.status !== 'pending' && sig.status !== 'sent') {
      throw new Error('Signature already completed or refused');
    }

    const results = { email: null, whatsapp: null, provider: null };

    // Send email invitation
    if (sig.signer_email && (sig.invitation_method === 'email' || sig.invitation_method === 'ambos')) {
      try {
        await this._sendEmailInvitation(sig, lease);
        results.email = { sent: true, to: sig.signer_email };
      } catch (err) {
        results.email = { sent: false, error: err.message };
      }
    }

    // Send WhatsApp invitation
    if (sig.signer_phone && (sig.invitation_method === 'whatsapp' || sig.invitation_method === 'ambos')) {
      try {
        await this._sendWhatsAppInvitation(sig, lease);
        results.whatsapp = { sent: true, to: sig.signer_phone };
      } catch (err) {
        results.whatsapp = { sent: false, error: err.message };
      }
    }

    // Send to external provider if configured
    const provider = lease.signature_method;
    if (provider && provider !== 'proprio' && SIGNATURE_PROVIDERS[provider]) {
      try {
        const providerResult = await this._sendToProvider(provider, sig, lease, orgId);
        results.provider = providerResult;
      } catch (err) {
        results.provider = { sent: false, error: err.message };
      }
    }

    // Update signature record
    const updates = {
      invitation_sent_at: new Date().toISOString(),
      status: 'sent',
    };

    if (results.email?.sent) {
      updates.invitation_method = sig.invitation_method || 'email';
    }

    await supabase
      .from('signatures')
      .update(updates)
      .eq('id', signatureId);

    // Update lease signature status
    await supabase
      .from('leases')
      .update({ signature_status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', sig.lease_id);

    return results;
  }

  static async sendBulkInvitations(leaseId, orgId) {
    const supabase = getSupabaseServer();

    const { data: signatures, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('lease_id', leaseId)
      .eq('organization_id', orgId);

    if (error) throw error;
    if (!signatures || signatures.length === 0) {
      throw new Error('No signatures found for this lease');
    }

    const results = [];
    for (const sig of signatures) {
      try {
        const result = await this.sendInvitation(sig.id, orgId);
        results.push({ signature_id: sig.id, signer_name: sig.signer_name, success: true, result });
      } catch (err) {
        results.push({ signature_id: sig.id, signer_name: sig.signer_name, success: false, error: err.message });
      }
    }

    return results;
  }

  static async _sendEmailInvitation(sig, lease) {
    const signerTypeLabel = this._getSignerTypeLabel(sig.signer_type);
    const leaseRef = lease.contract_number || lease.id?.substring(0, 8) || '';
    const signatureLink = this._buildSignatureLink(sig.id, lease.id);

    const message = `
Olá ${sig.signer_name},

Você foi convidado(a) a assinar digitalmente o contrato de locação referente ao imóvel ${lease.property_title || ''}.

Tipo de signatário: ${signerTypeLabel}
Contrato: ${leaseRef}

Para visualizar e assinar o documento, acesse o link abaixo:

${signatureLink}

Este link é pessoal e intransferível.

Atenciosamente,
ImobFluow - Gestão de Locação
    `.trim();

    await sendContactFormEmail(
      {
        name: 'ImobFluow - Assinatura Digital',
        email: 'noreply@imobfluow.com.br',
        phone: '',
        message,
      },
      sig.signer_email
    );
  }

  static async _sendWhatsAppInvitation(sig, lease) {
    const signatureLink = this._buildSignatureLink(sig.id, lease.id);
    const templateName = 'signature_invitation';
    const variables = {
      signer_name: sig.signer_name,
      contract_number: lease.contract_number || 'sem número',
      signature_link: signatureLink,
    };

    try {
      const response = await fetch(
        `${process.env.WHATSAPP_API_URL || 'http://localhost:3001'}/api/whatsapp/send-template`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: sig.signer_phone,
            template_name: templateName,
            variables,
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error('WhatsApp API error: ' + text);
      }

      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
        console.warn('[SignatureInvitation] WhatsApp service not available, skipping');
        return null;
      }
      throw err;
    }
  }

  static async _sendToProvider(provider, sig, lease, orgId) {
    const providerConfig = SIGNATURE_PROVIDERS[provider];
    if (!providerConfig.apiUrl) return null;

    const supabase = getSupabaseServer();

    const { data: generated } = await supabase
      .from('generated_contracts')
      .select('pdf_url')
      .eq('lease_id', lease.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const documentUrl = generated?.pdf_url || lease.signed_document_url;
    if (!documentUrl) throw new Error('No generated contract found to send for signature');

    switch (provider) {
      case 'clicksign':
        return this._sendClickSign(sig, documentUrl, orgId);
      case 'zapsign':
        return this._sendZapSign(sig, documentUrl);
      case 'docusign':
        return this._sendDocuSign(sig, documentUrl, lease);
      default:
        throw new Error('Unsupported signature provider: ' + provider);
    }
  }

  static async _sendClickSign(sig, documentUrl, orgId) {
    const apiKey = process.env.CLICKSIGN_API_KEY;
    if (!apiKey) throw new Error('CLICKSIGN_API_KEY not configured');

    const response = await fetch('https://api.clicksign.com/api/v1/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({
        document: {
          path: documentUrl,
          deadline_days: 15,
          signers: [{
            name: sig.signer_name,
            email: sig.signer_email,
            phone: sig.signer_phone,
            auth: 'email',
          }],
          locale: 'pt-BR',
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error('ClickSign error: ' + text);
    }

    const data = await response.json();
    return { provider: 'clicksign', signature_id: data.document?.key, status: 'sent' };
  }

  static async _sendZapSign(sig, documentUrl) {
    const apiKey = process.env.ZAPSIGN_API_KEY;
    if (!apiKey) throw new Error('ZAPSIGN_API_KEY not configured');

    const response = await fetch('https://api.zapsign.com.br/api/v1/docs/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: sig.signer_name,
        email: sig.signer_email,
        phone: sig.signer_phone,
        document: documentUrl,
        lang: 'pt-br',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error('ZapSign error: ' + text);
    }

    const data = await response.json();
    return { provider: 'zapsign', signature_id: data.id, status: 'sent' };
  }

  static async _sendDocuSign(sig, documentUrl, lease) {
    const apiKey = process.env.DOCUSIGN_API_KEY;
    if (!apiKey) throw new Error('DOCUSIGN_API_KEY not configured');

    const response = await fetch('https://demo.docusign.net/restapi/v2.1/envelopes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        emailSubject: `Contrato de Locação - ${lease.contract_number || ''}`,
        documents: [{ documentUrl }],
        recipients: {
          signers: [{
            name: sig.signer_name,
            email: sig.signer_email,
            roleName: sig.signer_type,
          }],
        },
        status: 'sent',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error('DocuSign error: ' + text);
    }

    const data = await response.json();
    return { provider: 'docusign', signature_id: data.envelopeId, status: 'sent' };
  }

  static _buildSignatureLink(signatureId, leaseId) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3006';
    return `${baseUrl}/urban/locacao/${leaseId}/sign/${signatureId}`;
  }

  static _getSignerTypeLabel(type) {
    const labels = {
      locador: 'Locador',
      locatario: 'Locatário',
      fiador: 'Fiador',
      co_locatario: 'Co-locatário',
      testemunha_1: 'Testemunha 1',
      testemunha_2: 'Testemunha 2',
    };
    return labels[type] || type;
  }

  static async checkProviderSignatureStatus(leaseId) {
    const supabase = getSupabaseServer();

    const { data: lease } = await supabase
      .from('leases')
      .select('signature_method, signature_status')
      .eq('id', leaseId)
      .single();

    if (!lease || !lease.signature_method || lease.signature_method === 'proprio') {
      return null;
    }

    const { data: signatures } = await supabase
      .from('signatures')
      .select('*')
      .eq('lease_id', leaseId)
      .eq('organization_id', lease.organization_id);

    if (!signatures) return null;

    const statuses = [];
    for (const sig of signatures) {
      if (sig.provider_signature_id) {
        try {
          const providerStatus = await this._queryProviderStatus(
            lease.signature_method,
            sig.provider_signature_id
          );
          if (providerStatus) {
            statuses.push({ ...sig, provider_status: providerStatus });
          }
        } catch (err) {
          console.error('[SignatureInvitation] Provider query error:', err.message);
        }
      }
    }
    return statuses;
  }

  static async _queryProviderStatus(provider, providerSignatureId) {
    switch (provider) {
      case 'clicksign': {
        const apiKey = process.env.CLICKSIGN_API_KEY;
        if (!apiKey) return null;
        const resp = await fetch(
          `https://api.clicksign.com/api/v1/documents/${providerSignatureId}`,
          { headers: { Authorization: apiKey } }
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.document?.status;
      }
      case 'zapsign': {
        const apiKey = process.env.ZAPSIGN_API_KEY;
        if (!apiKey) return null;
        const resp = await fetch(
          `https://api.zapsign.com.br/api/v1/docs/${providerSignatureId}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.status;
      }
      default:
        return null;
    }
  }

  static async handleWebhook(provider, payload) {
    const supabase = getSupabaseServer();

    let signatureId, status;

    switch (provider) {
      case 'clicksign':
        signatureId = payload.document?.key;
        status = payload.event === 'signer_signed' ? 'signed' : payload.event;
        break;
      case 'zapsign':
        signatureId = payload.id;
        status = payload.status === 'signed' ? 'signed' : payload.status;
        break;
      default:
        throw new Error('Unknown provider: ' + provider);
    }

    if (!signatureId) throw new Error('No signature ID in webhook payload');

    const { data: sig } = await supabase
      .from('signatures')
      .select('*')
      .eq('provider_signature_id', String(signatureId))
      .single();

    if (!sig) throw new Error('Signature not found: ' + signatureId);

    if (status === 'signed') {
      await supabase
        .from('signatures')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
        })
        .eq('id', sig.id);

      // Check if all signatures are complete
      const { data: allSigs } = await supabase
        .from('signatures')
        .select('status')
        .eq('lease_id', sig.lease_id);

      if (allSigs && allSigs.every(s => s.status === 'signed')) {
        await supabase
          .from('leases')
          .update({
            signature_status: 'signed',
            signed_at: new Date().toISOString(),
            status: 'active',
            activated_at: new Date().toISOString(),
          })
          .eq('id', sig.lease_id);
      } else {
        await supabase
          .from('leases')
          .update({ signature_status: 'partially_signed' })
          .eq('id', sig.lease_id);
      }
    }

    return { received: true, signature_id: signatureId, new_status: status };
  }
}
