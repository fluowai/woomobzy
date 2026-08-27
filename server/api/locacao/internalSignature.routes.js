import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { DigitalSignatureService } from '../../services/digitalSignatureService.js';

const router = Router();

// Rota pública para acessar a assinatura (Sem verifyAuth)
router.get('/document/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const supabase = getSupabaseServer();

    const { data: signature } = await supabase
      .from('signatures')
      .select('*, lease:lease_id(*)')
      .eq('token_hash', token)
      .single();

    if (!signature) {
      return res.status(404).json({ error: 'Assinatura não encontrada ou token inválido' });
    }

    if (signature.status === 'signed') {
      return res.status(400).json({ error: 'Este documento já foi assinado por você.' });
    }

    // Busca o contrato PDF mais recente
    const { data: generated } = await supabase
      .from('generated_contracts')
      .select('pdf_url')
      .eq('lease_id', signature.lease_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({
      success: true,
      signature: {
        id: signature.id,
        name: signature.signer_name,
        type: signature.signer_type,
        status: signature.status,
      },
      lease: {
        property_title: signature.lease.property_title,
      },
      documentUrl: generated?.pdf_url
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sign/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { ip, lat, lng, selfieUrl, documentUrl, code } = req.body;
    const supabase = getSupabaseServer();

    const { data: signature } = await supabase
      .from('signatures')
      .select('*')
      .eq('token_hash', token)
      .single();

    if (!signature) return res.status(404).json({ error: 'Token inválido' });
    
    // Na prática, validar o code gerado via WhatsApp aqui
    // ...

    // Baixa o PDF atual do storage
    const { data: generated } = await supabase
      .from('generated_contracts')
      .select('pdf_url')
      .eq('lease_id', signature.lease_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!generated || !generated.pdf_url) throw new Error("Documento não encontrado");

    // Fetch the actual PDF to sign
    const pdfResponse = await fetch(generated.pdf_url);
    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    // Sign it
    const signedPdfBuffer = await DigitalSignatureService.signDocument(
      pdfBuffer, 
      signature.signer_name, 
      signature.signer_email,
      { ip, whatsappValidated: true }
    );

    // Upload signed PDF
    const bucket = 'contracts';
    const objectKey = `${signature.organization_id}/${signature.lease_id}/${Date.now()}_signed.pdf`;
    
    await supabase.storage.from(bucket).upload(objectKey, signedPdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(objectKey);
    const finalPdfUrl = publicUrlData.publicUrl;

    // Atualiza a assinatura
    await supabase.from('signatures').update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      ip_address: ip,
      geolocation_lat: lat,
      geolocation_lng: lng,
      selfie_url: selfieUrl,
      document_url: documentUrl,
      is_whatsapp_validated: true
    }).eq('id', signature.id);

    // Atualiza a URL do contrato no generated_contracts ou lease
    await supabase.from('generated_contracts').insert({
      lease_id: signature.lease_id,
      organization_id: signature.organization_id,
      pdf_url: finalPdfUrl,
      content: 'Assinado digitalmente por ' + signature.signer_name
    });

    res.json({ success: true, url: finalPdfUrl });
  } catch (error) {
    console.error('Erro na assinatura:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
