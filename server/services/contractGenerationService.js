import { getSupabaseServer } from '../lib/supabase-server.js';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

const VARIABLE_MAP = {
  nome_locador: 'owner_name',
  cpf_locador: 'owner_cpf',
  rg_locador: 'owner_rg',
  endereco_locador: 'owner_address',
  nome_locatario: 'tenant_name',
  cpf_locatario: 'tenant_cpf',
  rg_locatario: 'tenant_rg',
  endereco_locatario: 'tenant_address',
  endereco_imovel: 'property_title',
  cidade: 'tenant_city',
  valor_aluguel: 'monthly_rent',
  valor_caucao: 'caution_amount',
  data_inicio: 'start_date',
  data_fim: 'end_date',
  prazo_meses: 'contract_duration_months',
  dia_vencimento: 'due_day',
  indice_reajuste: 'adjustment_index',
  tipo_garantia: 'guarantee_type',
  multa_atraso: 'late_fee_percent',
  juros_atraso: 'late_interest_percent',
  data_geracao: null,
};

const GUARANTEE_LABELS = {
  fiador: 'Fiador',
  seguro_fianca: 'Seguro Fiança',
  deposito_caucao: 'Depósito Caução',
  titulo_capitalizacao: 'Título de Capitalização',
  sem: 'Sem Garantia',
};

function buildVariableValues(lease) {
  const today = new Date().toLocaleDateString('pt-BR');
  const vars = {};

  for (const [placeholder, field] of Object.entries(VARIABLE_MAP)) {
    if (field === null) {
      vars[placeholder] = today;
      continue;
    }
    const value = lease[field];
    if (value === null || value === undefined) {
      vars[placeholder] = `[${placeholder}]`;
      continue;
    }
    if (field === 'monthly_rent' || field === 'caution_amount') {
      vars[placeholder] = Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else if (field === 'start_date' || field === 'end_date') {
      vars[placeholder] = new Date(value).toLocaleDateString('pt-BR');
    } else if (field === 'guarantee_type') {
      vars[placeholder] = GUARANTEE_LABELS[value] || value;
    } else {
      vars[placeholder] = String(value);
    }
  }
  return vars;
}

function replaceVariables(content, vars) {
  let result = content;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return result;
}

function getUnfilledVariables(content) {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/\{|\}/g, ''));
}

function generatePDF(title, contentText) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      info: { Title: title, Creator: 'WooTech Imob - Gestao de Locacao' },
    });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(1.5);

    const lines = contentText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        doc.moveDown(0.5);
        continue;
      }

      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        doc.moveDown(0.8);
        doc.fontSize(11).font('Helvetica-Bold')
          .text(trimmed.replace(/\*\*/g, ''), { continued: false });
        doc.moveDown(0.3);
        continue;
      }

      if (trimmed.startsWith('**')) {
        const endBold = trimmed.indexOf('**', 2);
        if (endBold !== -1) {
          const boldPart = trimmed.substring(2, endBold);
          const rest = trimmed.substring(endBold + 2);
          doc.fontSize(10).font('Helvetica-Bold').text(boldPart, { continued: true });
          doc.font('Helvetica').text(rest);
          continue;
        }
      }

      if (trimmed.startsWith('# ')) {
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica-Bold').text(trimmed.substring(2), { align: 'center' });
        doc.moveDown(0.5);
        continue;
      }

      doc.fontSize(10).font('Helvetica').text(trimmed, {
        align: 'justify',
        lineGap: 2,
      });
    }

    doc.end();
  });
}

function computeHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export class ContractGenerationService {

  static async generateFromTemplate(leaseId, templateContent, orgId, userId) {
    const supabase = getSupabaseServer();

    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      throw new Error('Lease not found: ' + (leaseError?.message || 'unknown'));
    }

    const vars = buildVariableValues(lease);
    const contractText = replaceVariables(templateContent, vars);
    const unfilled = getUnfilledVariables(contractText);

    const title = `Contrato de Locação - ${lease.contract_number || leaseId.substring(0, 8)}`;

    let pdfBuffer;
    try {
      pdfBuffer = await generatePDF(title, contractText);
    } catch (err) {
      throw new Error('PDF generation failed: ' + err.message);
    }

    const hash = computeHash(pdfBuffer);

    const contractHtml = contractText
      .replace(/\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Upload to Supabase Storage
    const bucket = 'contracts';
    const objectKey = `${orgId}/${leaseId}/${Date.now()}_contract.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectKey, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error('Failed to upload PDF: ' + uploadError.message);
    }

    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(objectKey);

    // Get template info
    const templateId = lease.current_template_id || null;
    let templateVersion = 1;

    if (templateId) {
      const { data: tmpl } = await supabase
        .from('contract_templates')
        .select('version')
        .eq('id', templateId)
        .single();
      if (tmpl) templateVersion = tmpl.version;
    }

    // Insert generated_contract record
    const { data: generated, error: insertError } = await supabase
      .from('generated_contracts')
      .insert({
        lease_id: leaseId,
        template_id: templateId,
        organization_id: orgId,
        content: contractText,
        content_html: contractHtml,
        pdf_url: publicUrl.publicUrl,
        hash_sha256: hash,
        version: templateVersion,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error('Failed to save contract record: ' + insertError.message);
    }

    // Update lease with signed document URL
    await supabase
      .from('leases')
      .update({
        signed_document_url: publicUrl.publicUrl,
        updated_by: userId,
      })
      .eq('id', leaseId);

    return {
      ...generated,
      pdf_buffer: pdfBuffer,
      variables_used: vars,
      unfilled_variables: unfilled,
    };
  }

  static async generateFromLeaseData(lease, templateContent, orgId, userId) {
    const vars = buildVariableValues(lease);
    const contractText = replaceVariables(templateContent, vars);
    const unfilled = getUnfilledVariables(contractText);

    const title = `Contrato de Locação - ${lease.contract_number || 'rascunho'}`;

    let pdfBuffer;
    try {
      pdfBuffer = await generatePDF(title, contractText);
    } catch (err) {
      throw new Error('PDF generation failed: ' + err.message);
    }

    const hash = computeHash(pdfBuffer);

    const contractHtml = contractText
      .replace(/\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    return {
      content: contractText,
      content_html: contractHtml,
      pdf_buffer: pdfBuffer,
      hash_sha256: hash,
      variables_used: vars,
      unfilled_variables: unfilled,
    };
  }

  static async saveGeneratedContract(leaseId, templateId, contractData, orgId, userId) {
    const supabase = getSupabaseServer();

    const bucket = 'contracts';
    const objectKey = `${orgId}/${leaseId}/${Date.now()}_contract.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectKey, contractData.pdf_buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error('Failed to upload PDF: ' + uploadError.message);
    }

    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(objectKey);

    let templateVersion = 1;
    if (templateId) {
      const { data: tmpl } = await supabase
        .from('contract_templates')
        .select('version')
        .eq('id', templateId)
        .single();
      if (tmpl) templateVersion = tmpl.version;
    }

    const { data: generated, error: insertError } = await supabase
      .from('generated_contracts')
      .insert({
        lease_id: leaseId,
        template_id: templateId || null,
        organization_id: orgId,
        content: contractData.content,
        content_html: contractData.content_html,
        pdf_url: publicUrl.publicUrl,
        hash_sha256: contractData.hash_sha256,
        version: templateVersion,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error('Failed to save contract record: ' + insertError.message);
    }

    await supabase
      .from('leases')
      .update({
        signed_document_url: publicUrl.publicUrl,
        updated_by: userId,
      })
      .eq('id', leaseId);

    return generated;
  }

  static async regenerateContract(leaseId, orgId, userId) {
    const supabase = getSupabaseServer();

    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      throw new Error('Lease not found: ' + (leaseError?.message || 'unknown'));
    }

    let templateContent;
    if (lease.current_template_id) {
      const { data: tmpl } = await supabase
        .from('contract_templates')
        .select('content')
        .eq('id', lease.current_template_id)
        .single();
      templateContent = tmpl?.content;
    }

    if (!templateContent) {
      const { data: defaultTmpl } = await supabase
        .from('contract_templates')
        .select('content')
        .eq('organization_id', orgId)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();
      templateContent = defaultTmpl?.content;
    }

    if (!templateContent) {
      throw new Error('No template found for contract regeneration');
    }

    return this.generateFromTemplate(leaseId, templateContent, orgId, userId);
  }

  static async getContractPreview(lease, templateContent) {
    const vars = buildVariableValues(lease);
    const contractText = replaceVariables(templateContent, vars);
    const unfilled = getUnfilledVariables(contractText);

    return {
      content: contractText,
      variables_used: vars,
      unfilled_variables: unfilled,
      is_valid: unfilled.length === 0,
    };
  }
}
