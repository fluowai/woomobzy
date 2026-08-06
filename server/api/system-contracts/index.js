import express from 'express';
import multer from 'multer';
import { verifyMegaAdmin } from '../../middleware/auth.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  uploadObject,
  getMinioPublicUrl,
  getConfiguredBucketName,
} from '../../lib/minio-storage.js';
import axios from 'axios';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { woosignService } from '../../services/woosign.js';

dotenv.config();

const router = express.Router();

const supabase = new Proxy(
  {},
  {
    get: (_, prop) => {
      const client = getSupabaseServer();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error('Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WebP.')
      );
    }
  },
});

function getAIProvider() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey && !geminiKey.includes('YOUR_') && geminiKey.length >= 20)
    return 'gemini';
  if (openaiKey && !openaiKey.includes('YOUR_') && openaiKey.length >= 20)
    return 'openai';
  if (groqKey && groqKey.length >= 20) return 'groq';
  return null;
}

async function analyzeContractWithAI(text) {
  const provider = getAIProvider();
  if (!provider) {
    return {
      provider: 'none',
      analysis: null,
      error:
        'Nenhum provedor de IA configurado. Configure GEMINI_API_KEY, GROQ_API_KEY ou OPENAI_API_KEY.',
    };
  }

  const prompt = `Você é um assistente jurídico especializado em contratos de software SaaS. Analise o contrato abaixo e extraia:

1. RESUMO: Resumo executivo de 2-3 linhas
2. PARTES: Identifique contratada e contratante
3. PRAZO: Data de início e fim se existir
4. VALOR: Setup e mensalidade se existir
5. RISCO: Liste riscos jurídicos ou cláusulas problemáticas
6. SUGESTÃO: Sugira ajustes necessários

Contrato:
${text.substring(0, 15000)}`;

  try {
    if (provider === 'gemini') {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
        },
        { timeout: 30000 }
      );
      const analysis =
        response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Sem resposta da IA';
      return { provider: 'gemini', analysis };
    } else if (provider === 'groq') {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.3,
        },
        {
          headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
          timeout: 30000,
        }
      );
      const analysis =
        response.data.choices?.[0]?.message?.content || 'Sem resposta da IA';
      return { provider: 'groq', analysis };
    } else if (provider === 'openai') {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.3,
        },
        {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          timeout: 30000,
        }
      );
      const analysis =
        response.data.choices?.[0]?.message?.content || 'Sem resposta da IA';
      return { provider: 'openai', analysis };
    }
  } catch (err) {
    console.error('AI analysis error:', err);
    return {
      provider,
      analysis: null,
      error: `Erro na análise: ${err.message}`,
    };
  }
}

router.get('/', verifyMegaAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, contracts: data || [] });
  } catch (err) {
    console.error('[SystemContracts] List error:', err);
    res.status(500).json({ error: 'Erro ao listar contratos' });
  }
});

router.get('/:id', verifyMegaAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_contracts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ success: true, contract: data });
  } catch (err) {
    console.error('[SystemContracts] Get error:', err);
    res.status(500).json({ error: 'Erro ao buscar contrato' });
  }
});

router.post('/', verifyMegaAdmin, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      created_by: req.user.id,
    };

    const { data, error } = await supabase
      .from('system_contracts')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, contract: data });
  } catch (err) {
    console.error('[SystemContracts] Create error:', err);
    res.status(500).json({ error: 'Erro ao criar contrato' });
  }
});

router.put('/:id', verifyMegaAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_contracts')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, contract: data });
  } catch (err) {
    console.error('[SystemContracts] Update error:', err);
    res.status(500).json({ error: 'Erro ao atualizar contrato' });
  }
});

router.delete('/:id', verifyMegaAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('system_contracts')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[SystemContracts] Delete error:', err);
    res.status(500).json({ error: 'Erro ao excluir contrato' });
  }
});

router.post(
  '/upload',
  verifyMegaAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Arquivo não enviado' });
      }

      const logicalBucket = 'contracts';
      const bucket = getConfiguredBucketName('contracts');
      const filePath = `${req.user.id}/${Date.now()}_${req.file.originalname}`;
      const mimeType = req.file.mimetype;

      const result = await uploadObject({
        bucket,
        key: filePath,
        body: req.file.buffer,
        contentType: mimeType,
        logicalBucket,
      });

      const publicUrl = getMinioPublicUrl({ bucket, key: result.path });

      const { error: dbError } = await supabase.from('storage_objects').upsert(
        {
          tenant_id: req.user.id,
          bucket,
          object_key: result.path,
          sha256: req.file.buffer.toString('hex'),
          size_bytes: req.file.size,
          mime_type: mimeType,
          filename: req.file.originalname,
          source: 'contract_upload',
          entity_type: 'system_contract',
        },
        {
          onConflict: ['bucket', 'object_key'],
        }
      );

      if (dbError) console.error('Storage object log error:', dbError);

      res.json({
        success: true,
        url: publicUrl,
        path: result.path,
        mimeType,
        size: req.file.size,
      });
    } catch (err) {
      console.error('[SystemContracts] Upload error:', err);
      res.status(500).json({ error: 'Erro ao enviar arquivo' });
    }
  }
);

router.post('/:id/analyze', verifyMegaAdmin, async (req, res) => {
  try {
    const contractId = req.params.id;

    const { data: contract, error } = await supabase
      .from('system_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (error || !contract) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    const contractText =
      JSON.stringify(contract.contratante_details || '') +
      ' ' +
      JSON.stringify(contract.contratada_details || '') +
      ' ' +
      JSON.stringify(contract);

    const analysis = await analyzeContractWithAI(contractText);

    const { error: updateError } = await supabase
      .from('system_contracts')
      .update({
        analysis_result: analysis,
        analyzed_at: new Date().toISOString(),
        analyzed_by: req.user.id,
      })
      .eq('id', contractId);

    if (updateError) throw updateError;

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('[SystemContracts] Analyze error:', err);
    res.status(500).json({ error: 'Erro ao analisar contrato' });
  }
});

router.post(
  '/:id/analyze-file',
  verifyMegaAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      const contractId = req.params.id;

      if (!req.file) {
        return res.status(400).json({ error: 'Arquivo não enviado' });
      }

      const text = req.file.buffer.toString('utf-8').substring(0, 15000);

      const analysis = await analyzeContractWithAI(text);

      const { error: updateError } = await supabase
        .from('system_contracts')
        .update({
          analysis_result: analysis,
          analyzed_at: new Date().toISOString(),
          analyzed_by: req.user.id,
        })
        .eq('id', contractId);

      if (updateError) throw updateError;

      res.json({ success: true, analysis });
    } catch (err) {
      console.error('[SystemContracts] Analyze file error:', err);
      res.status(500).json({ error: 'Erro ao analisar arquivo' });
    }
  }
);

async function generateContractPdf(htmlContent) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

router.post('/:id/send-for-signature', verifyMegaAdmin, async (req, res) => {
  try {
    const contractId = req.params.id;
    const { recipientEmail, recipientName } = req.body;

    if (!recipientEmail || !recipientName) {
      return res
        .status(400)
        .json({ error: 'E-mail e nome do signatário são obrigatórios' });
    }

    const { data: contract, error: contractError } = await supabase
      .from('system_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    const contractText =
      JSON.stringify(contract.contratante_details || '') +
      ' ' +
      JSON.stringify(contract.contratada_details || '');

    const analysis = await analyzeContractWithAI(contractText);
    const generatedContent = analysis.analysis || contractText;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${contract.title || 'Contrato'}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 18px; margin-bottom: 24px; text-transform: uppercase; }
    p { margin-bottom: 12px; font-size: 12px; }
    .signature-block { margin-top: 60px; page-break-inside: avoid; }
    .signature-line { border-top: 1px solid #000; width: 100%; padding-top: 8px; margin-top: 40px; }
    .footer { margin-top: 80px; font-size: 10px; color: #666; border-top: 1px solid #eee; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>${contract.title || 'Contrato'}</h1>
  <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 12px;">${generatedContent}</pre>
  <div class="signature-block">
    <p><strong>Assinatura do Contratante:</strong></p>
    <div class="signature-line">${recipientName}</div>
  </div>
  <div class="footer">
    <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} | IMOBZY</p>
  </div>
</body>
</html>`;

    const pdfBuffer = await generateContractPdf(htmlContent);

    const bucket = getConfiguredBucketName('contracts');
    const filePath = `signatures/${contractId}/${Date.now()}_contrato.pdf`;

    const uploadResult = await uploadObject({
      bucket,
      key: filePath,
      body: pdfBuffer,
      contentType: 'application/pdf',
      logicalBucket: 'contracts',
    });

    const publicUrl = getMinioPublicUrl({ bucket, key: uploadResult.path });

    const { error: dbError } = await supabase.from('storage_objects').upsert(
      {
        tenant_id: req.user.id,
        bucket,
        object_key: uploadResult.path,
        sha256: pdfBuffer.toString('hex').substring(0, 64),
        size_bytes: pdfBuffer.length,
        mime_type: 'application/pdf',
        filename: `${contract.title || 'contrato'}.pdf`,
        source: 'woosign_contract',
        entity_type: 'system_contract',
      },
      {
        onConflict: ['bucket', 'object_key'],
      }
    );

    if (dbError) console.error('Storage object log error:', dbError);

    const envelope = await woosignService.createContractEnvelope({
      contractId,
      organizationId: req.user.organization_id || req.user.id,
      teamId: req.user.team_id,
      userId: req.user.id,
      pdfUrl: publicUrl,
      recipients: [{ email: recipientEmail, name: recipientName }],
      title: contract.title || 'Contrato',
    });

    if (!envelope) {
      return res
        .status(500)
        .json({ error: 'Falha ao criar envelope de assinatura' });
    }

    await supabase
      .from('system_contracts')
      .update({
        status: 'PENDING_SIGNATURES',
        woosign_envelope_id: envelope.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId);

    res.json({
      success: true,
      envelopeId: envelope.id,
      pdfUrl: publicUrl,
      status: 'PENDING_SIGNATURES',
    });
  } catch (err) {
    console.error('[SystemContracts] Send for signature error:', err);
    res
      .status(500)
      .json({ error: err.message || 'Erro ao enviar para assinatura' });
  }
});

export default router;
