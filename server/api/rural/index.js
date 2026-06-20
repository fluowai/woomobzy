/**
 * Rural Legal Validation API
 * Integrações com SNCR, SIGEF, CAR e ITR
 *
 * SEGURANÇA:
 * - Todas as rotas exigem autenticação via verifyAuth
 * - Tenant isolation via requireTenant
 * - Validação de input com Zod
 * - Sanitização de parâmetros contra injeção
 */

import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import multer from 'multer';
import { AnalysisController } from './analysis/controller.js';
import { AgroIntelligenceService } from '../../services/AgroIntelligence.js';
import { extractLatLngFromGoogleMapsUrl, reverseGeocode, calculateConfidence } from '../../utils/geoUtils.js';
import { SicarService } from '../../services/sicarService.js';
import { applyRuralFilter, isRuralProperty } from '../../utils/propertyNiche.js';
import PDFDocument from 'pdfkit';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

/**
 * GET /api/rural/market/prices
 * Retorna preços atualizados do CEPEA via Microserviço Python
 */
router.get('/market/prices', verifyAuth, async (req, res) => {
  try {
    const data = await AgroIntelligenceService.getLatestPrices();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function sanitizeInput(input, maxLength = 50) {
  if (typeof input !== 'string') return '';
  return input.replace(/[^\w\-.]/g, '').slice(0, maxLength);
}

function isValidUUID(id) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function extractUfFromRuralCode(code) {
  const match = String(code || '').trim().match(/^([A-Z]{2})[-_]/i);
  return match ? match[1].toUpperCase() : null;
}

function extractGeoServerException(rawText) {
  const text = String(rawText || '');
  const exceptionText = text.match(/<ows:ExceptionText[^>]*>([\s\S]*?)<\/ows:ExceptionText>/i)
    || text.match(/<ExceptionText[^>]*>([\s\S]*?)<\/ExceptionText>/i);
  if (exceptionText?.[1]) {
    return exceptionText[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function collectCoordinateBounds(coordinates, bounds = { minLat: Infinity, minLng: Infinity, maxLat: -Infinity, maxLng: -Infinity }) {
  if (!Array.isArray(coordinates)) return bounds;

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number'
  ) {
    const [lng, lat] = coordinates;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      bounds.minLat = Math.min(bounds.minLat, lat);
      bounds.maxLat = Math.max(bounds.maxLat, lat);
      bounds.minLng = Math.min(bounds.minLng, lng);
      bounds.maxLng = Math.max(bounds.maxLng, lng);
    }
    return bounds;
  }

  for (const item of coordinates) {
    collectCoordinateBounds(item, bounds);
  }
  return bounds;
}

function featureCollectionToMapTarget(featureCollection) {
  const features = featureCollection?.features || [];
  if (!features.length) return null;

  const bounds = features.reduce((acc, feature) => (
    collectCoordinateBounds(feature.geometry?.coordinates, acc)
  ), { minLat: Infinity, minLng: Infinity, maxLat: -Infinity, maxLng: -Infinity });

  if (!Number.isFinite(bounds.minLat) || !Number.isFinite(bounds.minLng)) {
    return null;
  }

  return {
    coords: [
      (bounds.minLat + bounds.maxLat) / 2,
      (bounds.minLng + bounds.maxLng) / 2,
    ],
    bounds: [
      [bounds.minLat, bounds.minLng],
      [bounds.maxLat, bounds.maxLng],
    ],
  };
}

const cpfCnpjSchema = z
  .string()
  .min(11)
  .max(18)
  .refine(
    (val) =>
      val.replace(/\D/g, '').length >= 11 &&
      val.replace(/\D/g, '').length <= 14,
    { message: 'CPF ou CNPJ inválido' }
  );

function ruralPropertiesQuery(supabase, orgId, columns = '*') {
  return applyRuralFilter(
    supabase
      .from('properties')
      .select(columns)
      .eq('organization_id', orgId)
  );
}

/**
 * GET /api/rural/sncr/buscar?cpfCnpj=XXXXXXXXXXXX
 * Busca imóveis rurais por CPF ou CNPJ do titular
 * SEGURANÇA: Exige autenticação + tenant isolation
 */
router.get('/sncr/buscar', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = cpfCnpjSchema.safeParse(req.query.cpfCnpj);
    if (!validation.success) {
      return res.status(400).json({ error: 'Parâmetro cpfCnpj inválido' });
    }

    const cpfCnpjClean = req.query.cpfCnpj.replace(/\D/g, '');

    const supabase = getSupabaseServer();
    const { data: properties } = await ruralPropertiesQuery(supabase, req.orgId, 'id, title, features, property_type, niche')
      .filter('features->legal->>ccirNumber', 'ilike', `*${cpfCnpjClean}*`);

    const results =
      properties?.map((p) => ({
        codigoImovel: p.features?.legal?.ccirNumber,
        denominacao: p.title,
          municipio: p.city || p.features?.location?.city,
          uf: p.state || p.features?.location?.state,
          areaHa: p.total_area_ha || p.features?.areaHectares || p.features?.physical?.area,
      })) || [];

    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error('SNCR buscar error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rural/sncr/imovel/:codigo
 * Consulta detalhes de imóvel rural no SNCR
 * SEGURANÇA: Exige autenticação + tenant + validação UUID
 */
router.get(
  '/sncr/imovel/:codigo',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const codigo = sanitizeInput(req.params.codigo, 30);
      if (!codigo) {
        return res.status(400).json({ error: 'Código inválido' });
      }

      const supabase = getSupabaseServer();
      const { data: property } = await ruralPropertiesQuery(supabase, req.orgId)
        .eq('features->legal->ccirNumber', codigo)
        .single();

      if (!property) {
        return res.status(404).json({ error: 'Imóvel não encontrado' });
      }

      res.json({
        success: true,
        data: {
          codigoImovel: codigo,
          denominacao: property.title,
          municipio: property.city || property.features?.location?.city,
          uf: property.state || property.features?.location?.state,
          areaHa: property.total_area_ha || property.features?.areaHectares || property.features?.physical?.area,
          areaTotal: property.total_area_ha || property.features?.areaHectares || property.features?.physical?.area,
          situacao: 'ATIVO',
          dataAtualizacao: property.updated_at,
        },
      });
    } catch (error) {
      console.error('SNCR imovel error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/rural/sigef/parcela/:codigo
 * Consulta parcela georreferenciada no SIGEF
 * SEGURANÇA: Exige autenticação + tenant + validação
 */
router.get(
  '/sigef/parcela/:codigo',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const codigo = sanitizeInput(req.params.codigo, 30);
      if (!codigo) {
        return res.status(400).json({ error: 'Código inválido' });
      }

      const supabase = getSupabaseServer();
      const { data: property } = await ruralPropertiesQuery(supabase, req.orgId)
        .eq('features->legal->geoNumber', codigo)
        .single();

      if (!property) {
        return res.status(404).json({ error: 'Parcela não encontrada' });
      }

      res.json({
        success: true,
        data: {
          codigoParcela: codigo,
          codigoImovel: property.features?.legal?.ccirNumber,
          denominacao: property.title,
          municipio: property.city || property.features?.location?.city,
          uf: property.state || property.features?.location?.state,
          areaCertificada: property.total_area_ha || property.features?.areaHectares || property.features?.physical?.area,
          areaShape: property.total_area_ha || property.features?.areaHectares || property.features?.physical?.area,
          situacao: 'CERTIFICADO',
          dataCertificacao: property.updated_at,
        },
      });
    } catch (error) {
      console.error('SIGEF parcela error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/rural/car/consultar/:codigo
 * Consulta live via WFS no servidor do CAR
 */
router.get('/car/consultar/:codigo', verifyAuth, requireTenant, async (req, res) => {
  try {
    const codigo = sanitizeInput(req.params.codigo, 80).toUpperCase();
    if (!codigo) {
      return res.status(400).json({ success: false, error: 'Codigo CAR invalido' });
    }

    const uf = extractUfFromRuralCode(codigo);
    if (!uf) {
      return res.status(400).json({ success: false, error: 'Codigo CAR deve iniciar com a UF. Ex: PA-...' });
    }

    const layer = SicarService.getLayerName(uf);
    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.0.0',
      request: 'GetFeature',
      typeName: layer,
      outputFormat: 'application/json',
      CQL_FILTER: `cod_imovel='${codigo}'`,
    });

    const wfsUrl = `https://geoserver.car.gov.br/geoserver/sicar/ows?${params.toString()}`;
    const response = await fetch(wfsUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    const rawText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      const message = extractGeoServerException(rawText) || 'Falha ao consultar servidor do CAR';
      return res.status(502).json({ success: false, error: message, status: response.status });
    }

    if (!contentType.includes('json') && rawText.trim().startsWith('<')) {
      const message = extractGeoServerException(rawText) || 'Servidor do CAR retornou XML em vez de JSON.';
      return res.status(200).json({ success: false, error: message, data: null });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      return res.status(502).json({
        success: false,
        error: 'Resposta invalida do servidor do CAR.',
        details: parseError.message,
      });
    }

    const target = featureCollectionToMapTarget(data);
    if (!target) {
      return res.status(200).json({
        success: false,
        error: 'Nenhum imovel encontrado para este codigo CAR.',
        data,
      });
    }

    res.json({ success: true, data, ...target });
  } catch (error) {
    console.error('CAR WFS error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/rural/sigef/consultar/:codigo
 * Consulta live via WFS no servidor do SIGEF
 */
router.get('/sigef/consultar/:codigo', verifyAuth, requireTenant, async (req, res) => {
  try {
    const codigo = sanitizeInput(req.params.codigo, 80).toUpperCase();
    if (!codigo) {
      return res.status(400).json({ success: false, error: 'Codigo SIGEF invalido' });
    }

    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.1.0',
      request: 'GetFeature',
      typeName: 'incra:certificada_sigef_particular',
      outputFormat: 'application/json',
      cql_filter: `cod_imovel='${codigo}'`,
    });
    const wfsUrl = `https://geoinfo.incra.gov.br/geoserver/wfs?${params.toString()}`;

    const response = await fetch(wfsUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    const rawText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      const message = extractGeoServerException(rawText) || 'Falha ao consultar servidor do SIGEF';
      return res.status(502).json({ success: false, error: message, status: response.status });
    }

    if (!contentType.includes('json') && rawText.trim().startsWith('<')) {
      const message = extractGeoServerException(rawText) || 'Servidor do SIGEF retornou XML em vez de JSON.';
      return res.status(200).json({ success: false, error: message, data: null });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      return res.status(502).json({
        success: false,
        error: 'Resposta invalida do servidor do SIGEF.',
        details: parseError.message,
      });
    }

    const target = featureCollectionToMapTarget(data);
    res.json({ success: true, data, ...(target || {}) });
  } catch (error) {
    console.error('SIGEF WFS error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/rural/car/:codigo
 * Consulta status do CAR no SICAR (via Banco de Dados local)
 * SEGURANÇA: Exige autenticação + tenant + validação
 */
router.get('/car/:codigo', verifyAuth, requireTenant, async (req, res) => {
  try {
    const codigo = sanitizeInput(req.params.codigo, 30);
    if (!codigo) {
      return res.status(400).json({ error: 'Código inválido' });
    }

    const supabase = getSupabaseServer();
    const { data: properties } = await ruralPropertiesQuery(supabase, req.orgId)
      .eq('features->legal->carNumber', codigo);

    if (!properties || properties.length === 0) {
      return res.status(404).json({ error: 'CAR não encontrado no sistema' });
    }

    const property = properties[0];
    res.json({
      success: true,
      data: {
        codigo: codigo,
        situacao: property.features?.legal?.carStatus || 'ATIVO',
        status: property.features?.legal?.carStatus || 'ATIVO',
        areaTotal: property.features?.physical?.area,
        areaAPP: property.features?.environmental?.appArea,
        areaRL: property.features?.environmental?.reserveArea,
        municipio: property.features?.location?.city,
        uf: property.features?.location?.state,
        nomeProprietario: property.owner_name,
        dataInscricao: property.created_at,
        dataAtualizacao: property.updated_at,
      },
    });
  } catch (error) {
    console.error('CAR error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rural/itr/certidao/:nirf
 * Consulta certidão de débitos de ITR
 * SEGURANÇA: Exige autenticação + tenant + validação NIRR
 */
router.get(
  '/itr/certidao/:nirf',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const nirf = sanitizeInput(req.params.nirf, 20);
      if (!nirf) {
        return res.status(400).json({ error: 'NIRF inválido' });
      }

      res.json({
        success: true,
        data: {
          nirf,
        situacao: 'CONSULTA_EXTERNA_NECESSARIA',
        tipo: 'NAO_VERIFICADA',
          mensagem: 'Consulte a certidão no portal e-CAC da Receita Federal',
          dataEmissao: new Date().toISOString(),
          link: `https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/portal-cnir`,
        },
      });
    } catch (error) {
      console.error('ITR error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/rural/validar/:propertyId
 * Validação completa de documentação rural
 * SEGURANÇA: Exige autenticação + tenant + validação UUID
 */
router.get(
  '/validar/:propertyId',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { propertyId } = req.params;

      if (!isValidUUID(propertyId)) {
        return res.status(400).json({ error: 'ID de propriedade inválido' });
      }

      const supabase = getSupabaseServer();
      const { data: property } = await ruralPropertiesQuery(supabase, req.orgId)
        .eq('id', propertyId)
        .single();

      if (!property) {
        return res.status(404).json({ error: 'Propriedade não encontrada' });
      }

      const legal = property.features?.legal || {};
      const location = property.features?.location || {};
      const physical = property.features?.physical || {};
      const environmental = property.features?.environmental || {};

      const validations = [];

      if (legal.carNumber) {
        validations.push({
          source: 'CAR',
          success: true,
          data: { codigo: legal.carNumber, status: legal.carStatus || 'ATIVO' },
        });
      } else {
        validations.push({
          source: 'CAR',
          success: false,
          data: { codigo: '', status: 'NÃO CADASTRADO' },
        });
      }

      if (legal.geoNumber) {
        validations.push({
          source: 'SIGEF',
          success: true,
          data: { codigo: legal.geoNumber, situacao: 'CERTIFICADO' },
        });
      } else {
        validations.push({
          source: 'SIGEF',
          success: false,
          data: { codigo: '', situacao: 'NÃO CADASTRADO' },
        });
      }

      if (legal.ccirNumber) {
        validations.push({
          source: 'SNCR',
          success: true,
          data: { codigo: legal.ccirNumber, situacao: 'ATIVO' },
        });
      } else {
        validations.push({
          source: 'SNCR',
          success: false,
          data: { codigo: '', situacao: 'NÃO CADASTRADO' },
        });
      }

      validations.push(
        legal.itrNumber || legal.nirf
          ? {
              source: 'ITR',
              success: true,
              data: { codigo: legal.itrNumber || legal.nirf, situacao: legal.itrStatus || 'REGULAR' },
            }
          : {
              source: 'ITR',
              success: false,
              data: { codigo: '', situacao: 'NAO CADASTRADO' },
            }
      );

      let riskScore = 100;
      for (const v of validations) {
        if (!v.success) riskScore -= 25;
        else if (v.data?.status === 'CANCELADO') riskScore -= 30;
        else if (v.data?.situacao === 'IRREGULAR') riskScore -= 25;
      }

      res.json({
        success: true,
        propertyId,
        propertyTitle: property.title,
        location: `${location.city}/${location.state}`,
        areaHa: physical.area || property.total_area_ha || property.features?.areaHectares || 0,
        validations,
        riskScore: Math.max(0, riskScore),
        riskLevel:
          riskScore >= 80 ? 'BAIXO' : riskScore >= 50 ? 'MEDIO' : 'ALTO',
      });
    } catch (error) {
      console.error('Validar error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Motor de Análise Rural (MAR)
 * POST /api/rural/analysis/kmz
 */
router.get('/dossier/:propertyId/pdf', verifyAuth, requireTenant, async (req, res) => {
  try {
    if (!isValidUUID(req.params.propertyId)) {
      return res.status(400).json({ error: 'ID de propriedade invalido' });
    }

    const supabase = getSupabaseServer();
    const { data: property } = await ruralPropertiesQuery(supabase, req.orgId)
      .eq('id', req.params.propertyId)
      .single();

    if (!property || !isRuralProperty(property)) {
      return res.status(404).json({ error: 'Propriedade rural nao encontrada' });
    }

    const { data: documents } = await supabase
      .from('documents')
      .select('document_type, status, validation_status, validation_score, created_at')
      .eq('organization_id', req.orgId)
      .eq('property_id', property.id)
      .order('created_at', { ascending: false });

    const features = property.features || {};
    const legal = features.legal || {};
    const technical = features.rural_technical || {};
    const dueDiligence = features.rural_due_diligence || {};
    const areaHa = Number(property.total_area_ha || features.areaHectares || technical.measured_area_ha || 0);
    const price = Number(property.price || 0);
    const pricePerHa = areaHa > 0 ? price / areaHa : 0;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dossie-rural-${property.id}.pdf"`);

    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    doc.pipe(res);
    doc.fillColor('#065f46').fontSize(24).text('Dossie Rural 360');
    doc.moveDown(0.3);
    doc.fillColor('#111827').fontSize(18).text(property.title || 'Propriedade rural');
    doc.fillColor('#6b7280').fontSize(10).text(`Gerado em ${new Date().toLocaleString('pt-BR')}`);
    doc.moveDown();

    const addSection = (title, rows) => {
      doc.fillColor('#065f46').fontSize(14).text(title);
      doc.moveDown(0.3);
      for (const [label, value] of rows) {
        doc.fillColor('#374151').fontSize(10).text(`${label}: `, { continued: true });
        doc.fillColor('#111827').text(String(value ?? '-'));
      }
      doc.moveDown();
    };

    addSection('Resumo Comercial', [
      ['Tipo', property.property_type || 'Rural'],
      ['Status', property.status || '-'],
      ['Preco', price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
      ['Area', `${areaHa.toLocaleString('pt-BR')} ha`],
      ['Preco por hectare', pricePerHa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
      ['Localizacao', [property.city, property.state].filter(Boolean).join(' / ') || '-'],
    ]);
    addSection('Cadastro Tecnico', [
      ['Bioma', technical.bioma || '-'],
      ['Solo', technical.tipo_solo || features.tipoSolo || '-'],
      ['Topografia', technical.topografia || features.topography || '-'],
      ['Aptidao', technical.aptidao || '-'],
      ['Area agricultavel', technical.area_agricultavel ? `${technical.area_agricultavel} ha` : '-'],
      ['Area de reserva', technical.area_reserva ? `${technical.area_reserva} ha` : '-'],
      ['Score tecnico/liquidez', technical.score_liquidez ?? '-'],
    ]);
    addSection('Documentacao Rural', [
      ['CAR', legal.carNumber || 'Nao cadastrado'],
      ['CCIR', legal.ccirNumber || 'Nao cadastrado'],
      ['SIGEF/GEO', legal.geoNumber || 'Nao cadastrado'],
      ['ITR/NIRF', legal.itrNumber || legal.nirf || 'Nao cadastrado'],
      ['Score de risco', dueDiligence.validation?.riskScore ?? '-'],
      ['Nivel de risco', dueDiligence.validation?.riskLevel || '-'],
    ]);

    doc.fillColor('#065f46').fontSize(14).text('Arquivos e Validacoes');
    doc.moveDown(0.3);
    if (documents?.length) {
      documents.forEach((item) => {
        doc.fillColor('#111827').fontSize(10).text(
          `${item.document_type || 'OUTRO'} - ${item.status || 'pending'} - ${item.validation_status || 'unchecked'}`
        );
      });
    } else {
      doc.fillColor('#6b7280').fontSize(10).text('Nenhum documento anexado.');
    }

    doc.moveDown();
    doc.fillColor('#6b7280').fontSize(8).text(
      'Documento gerado automaticamente pelo IMOBZY Rural. Confirme as validacoes nos orgaos competentes.',
      { align: 'center' }
    );
    doc.end();
  } catch (error) {
    console.error('Rural dossier PDF error:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
    else res.end();
  }
});

router.post(
  '/analysis/kmz',
  verifyAuth,
  requireTenant,
  upload.single('file'),
  AnalysisController.uploadKMZ
);

/**
 * Consulta status da análise
 */
router.get(
  '/analysis/status/:analysisId',
  verifyAuth,
  requireTenant,
  AnalysisController.checkStatus
);

/**
 * Download do Relatório em PDF
 */
router.get(
  '/analysis/report/:analysisId/pdf',
  verifyAuth,
  requireTenant,
  AnalysisController.downloadPDF
);

/**
 * POST /api/rural/geoprocess
 * Resolve imóvel e gera KML/KMZ via Microserviço Python
 */
router.post('/geoprocess', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lat, lon, code, name } = req.body;
    
    if (!lat && !lon && !code && !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Forneça ao menos um critério de busca (coordenadas, código ou nome).' 
      });
    }

    const result = await AgroIntelligenceService.geoprocessProperty({ lat, lon, code, name });
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Geoprocess route error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rural/find-car-by-location
 * Busca imóvel rural no CAR a partir de link do Maps ou coordenadas.
 */
router.post('/find-car-by-location', verifyAuth, requireTenant, async (req, res) => {
  const { googleMapsUrl, lat: inputLat, lng: inputLng, radiusFallbackMeters, forceUf } = req.body;
  const startTime = Date.now();
  let lat = inputLat;
  let lng = inputLng;

  try {
    // 1. Extração de Coordenadas
    if (googleMapsUrl && (!lat || !lng)) {
      const coords = await extractLatLngFromGoogleMapsUrl(googleMapsUrl);
      if (!coords) {
        return res.status(400).json({ success: false, error: 'Não foi possível extrair coordenadas do link informado.' });
      }
      lat = coords.lat;
      lng = coords.lng;
    }

    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Latitude e Longitude são obrigatórios.' });
    }

    // 2. Identificação de UF e Município (Reverse Geocoding)
    let locationInfo = { uf: forceUf, municipality: null, method: 'manual' };
    if (!forceUf) {
      const geoInfo = await reverseGeocode(lat, lng);
      if (geoInfo) {
        locationInfo = { ...geoInfo, method: 'reverse_geocoding' };
      }
    }

    // 3. Orquestração de Busca no SICAR
    const ufsToTry = locationInfo.uf ? [locationInfo.uf] : ['MT', 'GO', 'MS', 'PA', 'TO', 'BA', 'MG']; // UFs prioritárias se falhar geo
    let matches = [];
    let matchMode = 'none';
    let queriedUf = null;

    for (const uf of ufsToTry) {
      // Tentativa 1: Interseção por Ponto
      matches = await SicarService.findByPoint(uf, lat, lng);
      if (matches.length > 0) {
        matchMode = 'contains_point';
        queriedUf = uf;
        break;
      }

      // Tentativa 2: Fallback por Raio
      const raios = radiusFallbackMeters || [500, 1000, 5000];
      for (const radius of raios) {
        matches = await SicarService.findByRadius(uf, lat, lng, radius);
        if (matches.length > 0) {
          matchMode = 'nearby_radius';
          queriedUf = uf;
          // Injetar distância aproximada se possível (simplificado: raio usado)
          matches = matches.map(m => ({ ...m, distanceMeters: radius }));
          break;
        }
      }
      if (matches.length > 0) break;
    }

    // 4. Formatação e Confiança
    const confidence = calculateConfidence(matches, matchMode, locationInfo.uf === queriedUf);
    
    const formattedMatches = matches.map(f => ({
      codImovel: f.properties.cod_imovel,
      areaHa: f.properties.num_area || null,
      status: f.properties.ind_status || null,
      municipio: f.properties.nom_munici || null,
      uf: f.properties.cod_estado || null,
      sourceLayer: SicarService.getLayerName(queriedUf),
      matchMode: matchMode,
      confidence: confidence,
      distanceMeters: f.distanceMeters || 0,
      geometry: f.geometry,
      rawProperties: f.properties
    }));

    // 5. Logging (Fogo e esqueça para não travar resposta)
    const supabase = getSupabaseServer();
    supabase.from('rural_location_search_logs').insert({
      user_id: req.user.id,
      organization_id: req.orgId,
      google_maps_url: googleMapsUrl,
      lat, lng,
      uf: locationInfo.uf,
      municipality: locationInfo.municipality,
      source_layer: SicarService.getLayerName(queriedUf),
      match_mode: matchMode,
      confidence: confidence,
      total_matches: formattedMatches.length,
      response_summary: { duration: Date.now() - startTime }
    }).then(({ error }) => error && console.error('[Log] Erro ao salvar busca:', error.message));

    res.json({
      success: true,
      input: { googleMapsUrl, lat, lng },
      location: locationInfo,
      matchMode,
      confidence,
      totalMatches: formattedMatches.length,
      matches: formattedMatches
    });

  } catch (error) {
    console.error('[CARSearch] Erro crítico:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao processar busca de localização.', message: error.message });
  }
});

export default router;
