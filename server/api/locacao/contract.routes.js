import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { ContractGenerationService } from '../../services/contractGenerationService.js';
import crypto from 'crypto';

const router = Router();

router.post('/generate-and-sign', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { leaseId, contractData, signatureProvider } = req.body;
    const supabase = getSupabaseServer();

    // Cria o PDF do contrato preenchido (Mock, na prática deve misturar template com contractData)
    // Para fins deste plano, vamos usar o contractData textualmente
    const fullText = `
CONTRATO DE LOCAÇÃO DE IMÓVEL URBANO

LOCADOR: ${contractData.locador_nome}, portador do CPF ${contractData.locador_cpf}.
LOCATÁRIO: ${contractData.locatario_nome}, portador do CPF ${contractData.locatario_cpf}.

IMÓVEL: ${contractData.imovel_endereco} - ${contractData.imovel_cidade}
VALOR: R$ ${contractData.aluguel_valor} com vencimento dia ${contractData.aluguel_vencimento}.
    `;

    // Gerar e salvar PDF usando o service que já temos, ou passar leaseData
    // Simulação: Apenas chamamos o serviço enviando o texto.
    const result = await ContractGenerationService.generateFromLeaseData(
      { contract_number: 'N/A' },
      fullText,
      req.orgId,
      req.authUserId
    );

    // Salva o PDF no storage
    const bucket = 'contracts';
    const objectKey = `${req.orgId}/lease_${Date.now()}_contract.pdf`;
    
    await supabase.storage.from(bucket).upload(objectKey, result.pdf_buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
    
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(objectKey);
    const pdfUrl = publicUrlData.publicUrl;

    // Gerar assinaturas para as partes
    const signers = [
      { name: contractData.locador_nome, email: contractData.locador_email, type: 'locador' },
      { name: contractData.locatario_nome, type: 'locatario' } // assumindo email ausente ou não coletado no state inicial
    ];

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

    res.json({ success: true, pdfUrl });
  } catch (error) {
    console.error('Erro ao gerar contrato:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
