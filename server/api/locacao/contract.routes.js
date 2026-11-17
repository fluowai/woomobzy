import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { ContractGenerationService } from '../../services/contractGenerationService.js';
import { isValidUUID } from '../../lib/shared-utils.js';
import crypto from 'crypto';

const router = Router();

const handleGenerateContract = async (req, res) => {
  try {
    const { leaseId, contractData = {}, signatureProvider } = req.body;
    const supabase = getSupabaseServer();

    let leaseRecord = null;
    if (leaseId && isValidUUID(leaseId)) {
      const { data: existingLease } = await supabase
        .from('leases')
        .select('*')
        .eq('id', leaseId)
        .eq('organization_id', req.orgId)
        .maybeSingle();
      leaseRecord = existingLease || null;
    }

    let fullText = '';
    const templateId = contractData?.template_id || leaseRecord?.current_template_id || null;
    if (templateId) {
      const { data: tpl } = await supabase
        .from('contract_templates')
        .select('content')
        .eq('id', templateId)
        .eq('organization_id', req.orgId)
        .maybeSingle();

      if (tpl?.content) {
        fullText = String(tpl.content).replace(/\{\{([^}]+)\}\}/g, (_, key) => {
          const k = key.trim();
          const val = contractData[k] ?? leaseRecord?.[k];
          return val !== undefined && val !== null ? String(val) : '';
        });
      }
    }

    const locadorNome = contractData.locador_nome || 'Locador';
    const locatarioNome = contractData.locatario_nome || leaseRecord?.tenant_name || 'Locatário';

    if (!fullText.trim()) {
      fullText = `
CONTRATO DE LOCAÇÃO DE IMÓVEL URBANO

LOCADOR: ${locadorNome}, portador do CPF ${contractData.locador_cpf || ''}.
LOCATÁRIO: ${locatarioNome}, portador do CPF ${contractData.locatario_cpf || leaseRecord?.tenant_cpf || ''}.

IMÓVEL: ${contractData.imovel_endereco || ''} - ${contractData.imovel_cidade || ''}
VALOR: R$ ${contractData.aluguel_valor || leaseRecord?.monthly_rent || ''} com vencimento dia ${contractData.aluguel_vencimento || leaseRecord?.due_day || ''}.
      `.trim();
    }

    const result = await ContractGenerationService.generateFromLeaseData(
      { id: leaseId || undefined, contract_number: contractData.contract_number || leaseRecord?.contract_number || 'N/A' },
      fullText,
      req.orgId,
      req.authUserId
    );

    // Salva o PDF no storage
    const bucket = 'contracts';
    const objectKey = `${req.orgId}/lease_${Date.now()}_contract.pdf`;
    
    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectKey, result.pdf_buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (uploadError) throw uploadError;
    
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(objectKey);
    const pdfUrl = publicUrlData.publicUrl;

    if (leaseId) {
      const { error: leaseUpdateError } = await supabase
        .from('leases')
        .update({ signed_document_url: pdfUrl, signature_method: signatureProvider || 'internal' })
        .eq('id', leaseId)
        .eq('organization_id', req.orgId);
      if (leaseUpdateError) throw leaseUpdateError;

      await supabase.from('generated_contracts').insert({
        lease_id: leaseId,
        template_id: templateId || null,
        organization_id: req.orgId,
        content: result.content,
        content_html: result.content_html,
        pdf_url: pdfUrl,
        hash_sha256: result.hash_sha256,
        version: 1,
      });
    }

    // Gerar assinaturas para as partes com nome definido
    const signers = [
      {
        name: locadorNome,
        email: contractData.locador_email || null,
        type: 'locador',
      },
      {
        name: locatarioNome,
        email: contractData.locatario_email || leaseRecord?.tenant_email || null,
        type: 'locatario',
      },
    ].filter((s) => typeof s.name === 'string' && s.name.trim().length > 0);

    for (const signer of signers) {
      const token = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(token).digest('hex');

      await supabase.from('signatures').insert({
        lease_id: leaseId || null,
        organization_id: req.orgId,
        signer_name: signer.name,
        signer_email: signer.email || null,
        signer_type: signer.type,
        status: 'pending',
        token_hash: hash,
      });
    }

    res.json({ success: true, pdfUrl, hash: result.hash_sha256 });
  } catch (error) {
    console.error('Erro ao gerar contrato:', error);
    res.status(500).json({ error: error.message });
  }
};

router.post('/generate-and-sign', verifyAuth, requireTenant, handleGenerateContract);
router.post('/generate', verifyAuth, requireTenant, handleGenerateContract);

export default router;
