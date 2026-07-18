import { getSupabaseServer } from '../lib/supabase-server.js';

const DOCUMENT_WORKER_URL = process.env.DOCUMENT_WORKER_URL || 'http://localhost:8001';
const DOCUMENT_WEBHOOK_SECRET = String(process.env.DOCUMENT_WEBHOOK_SECRET || '').trim();

export class DocumentService {
  static async uploadAndProcess(file, propertyId, orgId, userId) {
    const supabase = getSupabaseServer();

    const bucket = 'documents';
    const objectKey = `${orgId}/${propertyId}/${Date.now()}_${file.originalname}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectKey, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw new Error('Falha no upload: ' + uploadError.message);

    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(objectKey);

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        organization_id: orgId,
        property_id: propertyId,
        bucket,
        object_key: objectKey,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
        status: 'pending',
      })
      .select()
      .single();

    if (docError) throw docError;

    this._dispatchProcessing(doc.id, publicUrl.publicUrl, orgId);

    return { ...doc, public_url: publicUrl.publicUrl };
  }

  static async _dispatchProcessing(documentId, fileUrl, orgId) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (DOCUMENT_WEBHOOK_SECRET) {
        headers['x-document-webhook-secret'] = DOCUMENT_WEBHOOK_SECRET;
      }

      const response = await fetch(`${DOCUMENT_WORKER_URL}/document/extract`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ document_id: documentId, file_url: fileUrl, organization_id: orgId }),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        console.error('[DocumentWorker] Failed to dispatch:', await response.text());
        await this._updateStatus(documentId, 'failed', 'Worker indisponivel');
      }
    } catch (error) {
      console.error('[DocumentWorker] Dispatch error:', error.message);
      await this._updateStatus(documentId, 'failed', error.message);
    }
  }

  static async processWorkerResult(documentId, result) {
    const supabase = getSupabaseServer();

    const updates = {
      status: 'analyzed',
      document_type: result.document_type,
      classification_confidence: result.classification_confidence,
      classified_by: 'ia',
      classified_at: new Date().toISOString(),
      raw_text: result.raw_text,
      ocr_confidence: result.ocr_confidence,
      extracted_data: result.extracted_data || {},
    };

    const { error: updateError } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId);

    if (updateError) {
      console.error('[DocumentService] Update error:', updateError);
      return;
    }

    await supabase.from('document_analyses').insert({
      document_id: documentId,
      analysis_type: 'ocr',
      provider: 'tesseract',
      confidence: result.ocr_confidence || 0,
      processing_time_ms: result.processing_time_ms || 0,
      result: { char_count: result.raw_text?.length || 0 },
    });

    await supabase.from('document_analyses').insert({
      document_id: documentId,
      analysis_type: 'classification',
      provider: 'gemini',
      confidence: result.classification_confidence || 0,
      result: { document_type: result.document_type, alternatives: result.alternatives },
    });

    await supabase.from('document_analyses').insert({
      document_id: documentId,
      analysis_type: 'extraction',
      provider: 'gemini',
      confidence: result.extraction_confidence || 0,
      result: result.extracted_data || {},
    });

    await this._runExternalValidation(documentId);
  }

  static async _runExternalValidation(documentId) {
    const supabase = getSupabaseServer();

    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (!doc || !doc.extracted_data) return;

    const extracted = typeof doc.extracted_data === 'string'
      ? JSON.parse(doc.extracted_data)
      : doc.extracted_data;

    const validations = [];

    if (doc.document_type === 'CAR' && extracted.codigo) {
      try {
        const uf = extracted.codigo.match(/^([A-Z]{2})/i)?.[1];
        if (uf) {
          const wfsUrl = `https://geoserver.car.gov.br/geoserver/sicar/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=sicar:sicar_imoveis_${uf.toLowerCase()}&outputFormat=application/json&CQL_FILTER=cod_imovel='${extracted.codigo}'`;
          const response = await fetch(wfsUrl, { signal: AbortSignal.timeout(15000) });
          const data = await response.json();

          validations.push({
            source: 'CAR',
            matched: (data.features?.length || 0) > 0,
            response_status: response.ok ? 'ok' : 'error',
            response_data: { match_count: data.features?.length || 0 },
          });
        }
      } catch (e) {
        validations.push({ source: 'CAR', matched: false, error: e.message });
      }
    }

    if (validations.length > 0) {
      for (const v of validations) {
        await supabase.from('document_external_validations').insert({
          document_id: documentId,
          source: v.source,
          matched: v.matched,
          response_status: v.response_status || 'error',
          response_data: v.response_data || {},
          response_time_ms: 0,
        });
      }

      const allMatched = validations.every(v => v.matched);
      const score = allMatched ? 90 : 40;
      const status = allMatched ? 'valid' : 'inconsistent';

      await supabase
        .from('documents')
        .update({
          validation_score: score,
          validation_status: status,
          validation_details: JSON.stringify(validations),
          status: 'validated',
        })
        .eq('id', documentId);
    }
  }

  static async listByProperty(propertyId, orgId) {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('property_id', propertyId)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getAnalysis(documentId, orgId) {
    const supabase = getSupabaseServer();
    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('organization_id', orgId)
      .single();

    if (!doc) throw new Error('Documento nao encontrado');

    const { data: analyses } = await supabase
      .from('document_analyses')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    const { data: validations } = await supabase
      .from('document_external_validations')
      .select('*')
      .eq('document_id', documentId);

    return { document: doc, analyses: analyses || [], external_validations: validations || [] };
  }

  static async classify(documentId, orgId, documentType) {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('documents')
      .update({
        document_type: documentType,
        classified_by: 'manual',
        classified_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('organization_id', orgId);

    if (error) throw error;
    return { success: true };
  }

  static async deleteDocument(documentId, orgId) {
    const supabase = getSupabaseServer();

    const { data: doc } = await supabase
      .from('documents')
      .select('bucket, object_key')
      .eq('id', documentId)
      .eq('organization_id', orgId)
      .single();

    if (!doc) throw new Error('Documento nao encontrado');

    await supabase.storage.from(doc.bucket).remove([doc.object_key]);
    await supabase.from('documents').delete().eq('id', documentId).eq('organization_id', orgId);

    return { success: true };
  }

  static async _updateStatus(documentId, status, error) {
    const supabase = getSupabaseServer();
    const updates = { status };
    if (error) updates.processing_error = error;
    await supabase.from('documents').update(updates).eq('id', documentId);
  }
}
