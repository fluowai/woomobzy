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
import { FarmValuationService } from '../../services/farmValuationService.js';
import { IntegracaoConectaGov } from '../../services/integracaoConectaGov.js';
import { IntegracaoIbamaEmbargos } from '../../services/integracaoIbamaEmbargos.js';
import { IntegracaoTerraBrasilis } from '../../services/integracaoTerraBrasilis.js';
import { IntegracaoMapBiomas } from '../../services/integracaoMapBiomas.js';
import { IntegracaoIbgeSidra } from '../../services/integracaoIbgeSidra.js';

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

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPropertyAreaHa(property = {}) {
  const features = property.features || {};
  return toNumber(
    property.total_area_ha
      || features.areaHectares
      || features.rural_technical?.measured_area_ha
      || features.rural_technical?.area_total_ha
      || features.physical?.area
      || features.rural?.area_ha
  );
}

function normalizeGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'FeatureCollection') return geometry;
  if (geometry.type === 'Feature') return { type: 'FeatureCollection', features: [geometry] };
  if (['Polygon', 'MultiPolygon'].includes(geometry.type)) {
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry }] };
  }
  return null;
}

function extractPropertyGeometry(property = {}) {
  const features = property.features || {};
  return normalizeGeometry(
    features.legal?.geometry
      || features.rural_technical?.geometry
      || features.rural_enrichment?.geometry
      || features.rural?.geometry
  );
}

function ringAreaSquareMeters(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  const valid = ring.filter((point) => Array.isArray(point) && point.length >= 2);
  if (valid.length < 3) return 0;
  const avgLat = valid.reduce((sum, point) => sum + toNumber(point[1]), 0) / valid.length;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((avgLat * Math.PI) / 180);
  let area = 0;
  for (let i = 0; i < valid.length; i += 1) {
    const current = valid[i];
    const next = valid[(i + 1) % valid.length];
    const x1 = toNumber(current[0]) * metersPerDegreeLng;
    const y1 = toNumber(current[1]) * metersPerDegreeLat;
    const x2 = toNumber(next[0]) * metersPerDegreeLng;
    const y2 = toNumber(next[1]) * metersPerDegreeLat;
    area += (x1 * y2) - (x2 * y1);
  }
  return Math.abs(area / 2);
}

function polygonAreaSquareMeters(coordinates) {
  if (!Array.isArray(coordinates) || !coordinates.length) return 0;
  const [outer, ...holes] = coordinates;
  const holeArea = holes.reduce((sum, ring) => sum + ringAreaSquareMeters(ring), 0);
  return Math.max(0, ringAreaSquareMeters(outer) - holeArea);
}

function calculateGeometryAreaHa(featureCollection) {
  const features = featureCollection?.features || [];
  const squareMeters = features.reduce((sum, feature) => {
    const geometry = feature.geometry || feature;
    if (geometry.type === 'Polygon') return sum + polygonAreaSquareMeters(geometry.coordinates);
    if (geometry.type === 'MultiPolygon') {
      return sum + geometry.coordinates.reduce((polySum, polygon) => polySum + polygonAreaSquareMeters(polygon), 0);
    }
    return sum;
  }, 0);
  return Number((squareMeters / 10000).toFixed(4));
}

function describeGeometry(featureCollection) {
  const target = featureCollectionToMapTarget(featureCollection);
  const measuredAreaHa = calculateGeometryAreaHa(featureCollection);
  return {
    measuredAreaHa,
    centroid: target?.coords ? { lat: target.coords[0], lng: target.coords[1] } : null,
    bounds: target?.bounds || null,
  };
}

function normalizeCarFeature(feature = {}, fallbackCode = '') {
  const properties = feature.properties || {};
  const codImovel = properties.cod_imovel || properties.cod_imovel_car || fallbackCode;
  const areaHa = toNumber(properties.num_area || properties.area || properties.area_ha);
  const municipio = properties.nom_munici || properties.municipio || properties.nom_municipio || null;
  const uf = properties.cod_estado || properties.uf || extractUfFromRuralCode(codImovel) || null;

  return {
    codImovel,
    areaHa,
    status: properties.ind_status || properties.status || properties.situacao || null,
    municipio,
    uf,
    geometry: feature.geometry || null,
    rawProperties: properties,
  };
}

async function fetchPdfImageBuffer(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const response = await fetch(url, {
      headers: { Accept: 'image/png,image/jpeg,image/jpg,*/*' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('svg')) return null;

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn('[Rural PDF] Logo unavailable:', error.message);
    return null;
  }
}

async function fetchCarFeatureByCode(codigo) {
  const uf = extractUfFromRuralCode(codigo);
  if (!uf) {
    const error = new Error('Codigo CAR deve iniciar com a UF. Ex: PA-...');
    error.statusCode = 400;
    throw error;
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
    const error = new Error(message);
    error.statusCode = 502;
    throw error;
  }

  if (!contentType.includes('json') && rawText.trim().startsWith('<')) {
    const message = extractGeoServerException(rawText) || 'Servidor do CAR retornou XML em vez de JSON.';
    const error = new Error(message);
    error.statusCode = 502;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (parseError) {
    const error = new Error(`Resposta invalida do servidor do CAR: ${parseError.message}`);
    error.statusCode = 502;
    throw error;
  }

  const feature = data?.features?.[0];
  if (!feature) {
    const error = new Error('Nenhum imovel encontrado para este codigo CAR.');
    error.statusCode = 404;
    error.data = data;
    throw error;
  }

  return {
    data,
    feature,
    car: normalizeCarFeature(feature, codigo),
    target: featureCollectionToMapTarget(data),
  };
}

function getComparableStats(properties = [], property = {}) {
  const propertyArea = getPropertyAreaHa(property);
  const sameCity = [];
  const sameState = [];
  const anyRural = [];

  for (const item of properties) {
    if (item.id === property.id) continue;
    const areaHa = getPropertyAreaHa(item);
    const price = toNumber(item.price);
    if (areaHa <= 0 || price <= 0) continue;

    const pricePerHa = price / areaHa;
    const comparable = {
      id: item.id,
      title: item.title,
      city: item.city,
      state: item.state,
      areaHa,
      price,
      pricePerHa,
    };
    anyRural.push(comparable);
    if (item.state && property.state && item.state === property.state) sameState.push(comparable);
    if (item.city && property.city && item.city === property.city && item.state === property.state) sameCity.push(comparable);
  }

  const selected = sameCity.length >= 2 ? sameCity : sameState.length >= 2 ? sameState : anyRural;
  const prices = selected.map((item) => item.pricePerHa).sort((a, b) => a - b);
  const avg = prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : 0;
  const currentPricePerHa = propertyArea > 0 && toNumber(property.price) > 0 ? toNumber(property.price) / propertyArea : 0;

  return {
    scope: sameCity.length >= 2 ? 'municipio' : sameState.length >= 2 ? 'estado' : prices.length ? 'carteira_rural' : 'sem_comparaveis',
    count: prices.length,
    minPricePerHa: prices[0] || 0,
    avgPricePerHa: avg,
    maxPricePerHa: prices[prices.length - 1] || 0,
    currentPricePerHa,
    samples: selected.slice(0, 5),
  };
}

function buildRuralEnrichment(property, documents = []) {
  const features = property.features || {};
  const legal = features.legal || {};
  const technical = features.rural_technical || {};
  const dueDiligence = features.rural_due_diligence || {};
  const geometry = extractPropertyGeometry(property);
  const geometryInfo = geometry ? describeGeometry(geometry) : {};
  const declaredAreaHa = getPropertyAreaHa(property);
  const measuredAreaHa = geometryInfo.measuredAreaHa || declaredAreaHa;

  return {
    source_car: legal.carNumber ? 'SICAR/CAR' : null,
    car_number: legal.carNumber || null,
    car_status: legal.carStatus || (legal.carNumber ? 'INFORMADO' : 'NAO_INFORMADO'),
    declared_area_ha: declaredAreaHa || null,
    measured_area_ha: measuredAreaHa || null,
    centroid: geometryInfo.centroid || null,
    bounds: geometryInfo.bounds || null,
    municipality: property.city || features.location?.city || null,
    state: property.state || features.location?.state || null,
    geometry,
    technical: {
      bioma: technical.bioma || null,
      solo: technical.tipo_solo || features.tipoSolo || null,
      topografia: technical.topografia || features.topography || null,
      aptidao: technical.aptidao || null,
      area_agricultavel: technical.area_agricultavel || null,
      area_reserva: technical.area_reserva || null,
      regime_hidrico: technical.regime_hidrico || null,
      score_liquidez: technical.score_liquidez || null,
    },
    documents: {
      total: documents.length,
      types: [...new Set(documents.map((doc) => doc.document_type).filter(Boolean))],
      due_diligence_score: dueDiligence.validation?.riskScore ?? null,
      due_diligence_level: dueDiligence.validation?.riskLevel || null,
    },
    sources: {
      car: { status: legal.carNumber ? 'available' : 'missing', label: 'CAR/SICAR' },
      sigef: { status: legal.geoNumber ? 'available' : 'missing', label: 'SIGEF/INCRA' },
      documents: { status: documents.length ? 'available' : 'missing', label: 'Documentos internos' },
      mapbiomas: { status: 'planned', label: 'MapBiomas - uso e cobertura do solo' },
      prodes: { status: 'planned', label: 'PRODES/DETER - alertas ambientais' },
      soil: { status: 'planned', label: 'Solo e textura' },
      slope: { status: 'planned', label: 'Declividade e altitude' },
      hydrography: { status: 'planned', label: 'Hidrografia e APPs' },
      logistics: { status: 'planned', label: 'Logistica e acesso' },
    },
    updated_at: new Date().toISOString(),
  };
}

function buildRuralValuation(property, enrichment, comparables) {
  const areaHa = toNumber(enrichment?.measured_area_ha || enrichment?.declared_area_ha || getPropertyAreaHa(property));
  const hasOwnPrice = comparables.currentPricePerHa > 0;
  const marketReference = comparables.avgPricePerHa || comparables.currentPricePerHa || 0;
  const basePricePerHa = hasOwnPrice && comparables.avgPricePerHa
    ? ((comparables.currentPricePerHa * 0.45) + (comparables.avgPricePerHa * 0.55))
    : marketReference;
  const minPricePerHa = basePricePerHa > 0 ? basePricePerHa * 0.88 : 0;
  const avgPricePerHa = basePricePerHa;
  const maxPricePerHa = basePricePerHa > 0 ? basePricePerHa * 1.12 : 0;
  const technical = enrichment?.technical || {};
  const docs = enrichment?.documents || {};
  const drivers = [];
  const risks = [];

  if (enrichment?.car_number) drivers.push('CAR informado e vinculado ao ativo.');
  else risks.push('CAR nao informado.');
  if (enrichment?.geometry) drivers.push('Geometria rural disponivel para medicao territorial.');
  else risks.push('Geometria/perimetro ainda nao cadastrado.');
  if (comparables.count > 0) drivers.push(`${comparables.count} comparavel(is) interno(s) usados como referencia (${comparables.scope}).`);
  else risks.push('Sem comparaveis internos com preco e area para referencia regional.');
  if (technical.solo || technical.bioma || technical.topografia) drivers.push('Cadastro tecnico rural possui dados agronomicos basicos.');
  else risks.push('Cadastro tecnico rural incompleto.');
  if (docs.due_diligence_score !== null) drivers.push(`Due diligence registrada com score ${docs.due_diligence_score}.`);
  else risks.push('Due diligence ainda nao executada.');

  const confidenceScore = Math.min(100,
    (enrichment?.car_number ? 20 : 0)
    + (enrichment?.geometry ? 20 : 0)
    + (comparables.count >= 3 ? 25 : comparables.count > 0 ? 15 : 0)
    + (hasOwnPrice ? 10 : 0)
    + ((technical.solo || technical.bioma || technical.topografia) ? 10 : 0)
    + (docs.due_diligence_score !== null ? 10 : 0)
    + ((property.city && property.state) ? 5 : 0)
  );

  return {
    valuation_date: new Date().toISOString(),
    method: 'MVP_POS_CAR_COMPARAVEIS_INTERNOS',
    area_ha: areaHa || null,
    price_per_ha_min: Number(minPricePerHa.toFixed(2)),
    price_per_ha_avg: Number(avgPricePerHa.toFixed(2)),
    price_per_ha_max: Number(maxPricePerHa.toFixed(2)),
    total_value_min: Number((minPricePerHa * areaHa).toFixed(2)),
    total_value_avg: Number((avgPricePerHa * areaHa).toFixed(2)),
    total_value_max: Number((maxPricePerHa * areaHa).toFixed(2)),
    price_per_alqueire_sp: Number((avgPricePerHa * 2.42).toFixed(2)),
    price_per_alqueire_mg: Number((avgPricePerHa * 4.84).toFixed(2)),
    vtn_reference: null,
    confidence_score: confidenceScore,
    comparable_scope: comparables.scope,
    comparable_count: comparables.count,
    comparable_samples: comparables.samples,
    drivers,
    risks,
    sources: enrichment?.sources || {},
    status: avgPricePerHa > 0 && areaHa > 0 ? 'complete' : 'incomplete',
    updated_at: new Date().toISOString(),
  };
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

    const result = await fetchCarFeatureByCode(codigo);
    res.json({ success: true, data: result.data, ...result.target });
  } catch (error) {
    console.error('CAR WFS error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.message, data: error.data || null });
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

router.post('/enrich/:propertyId', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!isValidUUID(propertyId)) {
      return res.status(400).json({ error: 'ID de propriedade invalido' });
    }

    const supabase = getSupabaseServer();
    const { data: property } = await ruralPropertiesQuery(supabase, req.orgId)
      .eq('id', propertyId)
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

    const enrichment = buildRuralEnrichment(property, documents || []);
    const features = {
      ...(property.features || {}),
      rural_enrichment: enrichment,
      legal: {
        ...(property.features?.legal || {}),
        geometry: enrichment.geometry || property.features?.legal?.geometry || null,
      },
    };

    const updatePayload = {
      features,
      total_area_ha: enrichment.measured_area_ha || enrichment.declared_area_ha || property.total_area_ha,
      niche: 'rural',
    };
    if (toNumber(property.price) > 0 && toNumber(updatePayload.total_area_ha) > 0) {
      updatePayload.price_per_ha = toNumber(property.price) / toNumber(updatePayload.total_area_ha);
    }

    const { data: updated, error } = await supabase
      .from('properties')
      .update(updatePayload)
      .eq('id', property.id)
      .eq('organization_id', req.orgId)
      .select('*')
      .single();

    if (error) throw error;

    res.json({ success: true, property: updated, enrichment });
  } catch (error) {
    console.error('Rural enrichment error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/valuation/by-car', verifyAuth, requireTenant, handleRuralValuationByCar);

router.post('/valuation/:propertyId', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!isValidUUID(propertyId)) {
      return res.status(400).json({ error: 'ID de propriedade invalido' });
    }

    const supabase = getSupabaseServer();
    const { data: property } = await ruralPropertiesQuery(supabase, req.orgId)
      .eq('id', propertyId)
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

    const enrichment = property.features?.rural_enrichment || buildRuralEnrichment(property, documents || []);
    const { data: ruralProperties } = await ruralPropertiesQuery(
      supabase,
      req.orgId,
      'id, title, price, total_area_ha, city, state, property_type, niche, features'
    );
    const comparables = getComparableStats(ruralProperties || [], property);
    const valuation = buildRuralValuation(property, enrichment, comparables);
    const features = {
      ...(property.features || {}),
      rural_enrichment: enrichment,
      rural_valuation: valuation,
    };

    const updatePayload = {
      features,
      total_area_ha: valuation.area_ha || property.total_area_ha,
      niche: 'rural',
    };
    if (toNumber(property.price) > 0 && toNumber(updatePayload.total_area_ha) > 0) {
      updatePayload.price_per_ha = toNumber(property.price) / toNumber(updatePayload.total_area_ha);
    }

    const { data: updated, error } = await supabase
      .from('properties')
      .update(updatePayload)
      .eq('id', property.id)
      .eq('organization_id', req.orgId)
      .select('*')
      .single();

    if (error) throw error;

    res.json({ success: true, property: updated, enrichment, valuation });
  } catch (error) {
    console.error('Rural valuation error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function handleRuralValuationByCar(req, res) {
  try {
    const codigo = sanitizeInput(req.body?.carNumber, 80).toUpperCase();
    if (!codigo) {
      return res.status(400).json({ error: 'Informe um numero de CAR valido.' });
    }

    const supabase = getSupabaseServer();
    const carResult = await fetchCarFeatureByCode(codigo);
    const car = carResult.car;
    const geometry = normalizeGeometry(car.geometry);
    const areaFromGeometry = geometry ? calculateGeometryAreaHa(geometry) : 0;
    const areaHa = areaFromGeometry || car.areaHa || 0;

    const { data: existingProperties, error: existingError } = await ruralPropertiesQuery(supabase, req.orgId)
      .eq('features->legal->>carNumber', codigo)
      .limit(1);

    if (existingError) throw existingError;

    const existing = existingProperties?.[0] || null;
    const baseFeatures = existing?.features || {};
    const features = {
      ...baseFeatures,
      areaHectares: areaHa || baseFeatures.areaHectares || 0,
      preferredUnit: baseFeatures.preferredUnit || 'ha',
      location: {
        ...(baseFeatures.location || {}),
        city: car.municipio || existing?.city || baseFeatures.location?.city || '',
        state: car.uf || existing?.state || baseFeatures.location?.state || '',
      },
      legal: {
        ...(baseFeatures.legal || {}),
        car: true,
        carNumber: codigo,
        carStatus: car.status || baseFeatures.legal?.carStatus || 'INFORMADO',
        geometry,
        reservaLegal: baseFeatures.legal?.reservaLegal || 0,
        app: baseFeatures.legal?.app || 0,
      },
      rural: {
        ...(baseFeatures.rural || {}),
        car_source: SicarService.getLayerName(car.uf),
        car_match_mode: 'car_number',
        car_confidence: 'alta',
        car_raw_properties: car.rawProperties,
      },
    };

    const payload = {
      organization_id: req.orgId,
      title: existing?.title || req.body?.title || `Fazenda ${car.municipio || codigo}`,
      description: existing?.description || `Propriedade rural identificada pelo CAR ${codigo}.`,
      property_type: existing?.property_type || 'Fazenda',
      purpose: existing?.purpose || 'Venda',
      status: existing?.status || 'Pendente',
      price: toNumber(existing?.price || req.body?.price),
      niche: 'rural',
      city: car.municipio || existing?.city || '',
      state: car.uf || existing?.state || '',
      address: existing?.address || '',
      neighborhood: existing?.neighborhood || '',
      total_area_ha: areaHa || existing?.total_area_ha || null,
      features,
      images: existing?.images || [],
    };

    if (payload.price > 0 && toNumber(payload.total_area_ha) > 0) {
      payload.price_per_ha = payload.price / toNumber(payload.total_area_ha);
    }

    const saveQuery = existing?.id
      ? supabase
          .from('properties')
          .update(payload)
          .eq('id', existing.id)
          .eq('organization_id', req.orgId)
          .select('*')
          .single()
      : supabase
          .from('properties')
          .insert(payload)
          .select('*')
          .single();

    const { data: savedProperty, error: saveError } = await saveQuery;
    if (saveError) throw saveError;

    const { data: documents } = await supabase
      .from('documents')
      .select('document_type, status, validation_status, validation_score, created_at')
      .eq('organization_id', req.orgId)
      .eq('property_id', savedProperty.id)
      .order('created_at', { ascending: false });

    const fullEnrichment = await FarmValuationService.valuationByCAR(codigo, req.orgId, req.user.id);
    const baseEnrichment = buildRuralEnrichment(savedProperty, documents || []);
    const enrichment = {
      ...baseEnrichment,
      ...fullEnrichment,
      technical: {
        ...(baseEnrichment.technical || {}),
        ...(fullEnrichment.technical || {}),
      },
      documents: baseEnrichment.documents,
      sources: {
        ...(baseEnrichment.sources || {}),
        ...(fullEnrichment.sources || {}),
      },
    };
    const { data: ruralProperties } = await ruralPropertiesQuery(
      supabase,
      req.orgId,
      'id, title, price, total_area_ha, city, state, property_type, niche, features'
    );
    const comparables = getComparableStats(ruralProperties || [], savedProperty);
    const valuation = {
      ...buildRuralValuation(savedProperty, enrichment, comparables),
      comparable_samples: [],
      drivers: [
        ...(fullEnrichment.valuation?.drivers || []),
        ...((fullEnrichment.valuation?.regional_summary && [`Resumo regional: ${fullEnrichment.valuation.regional_summary}`]) || []),
      ],
      risks: fullEnrichment.valuation?.risks || [],
      confidence_score: fullEnrichment.valuation?.score_confianca ?? null,
      intelligence_score: fullEnrichment.valuation?.score_confianca ?? null,
      environmental_alert_score: fullEnrichment.valuation?.score_alerta_ambiental ?? null,
      risk_level: fullEnrichment.valuation?.nivel_risco || null,
      regional_summary: fullEnrichment.valuation?.regional_summary || fullEnrichment.regional_analysis?.market_summary || null,
    };
    const finalFeatures = {
      ...(savedProperty.features || {}),
      rural_enrichment: enrichment,
      rural_valuation: valuation,
    };

    const updatePayload = {
      features: finalFeatures,
      total_area_ha: valuation.area_ha || savedProperty.total_area_ha,
      niche: 'rural',
    };
    if (toNumber(savedProperty.price) > 0 && toNumber(updatePayload.total_area_ha) > 0) {
      updatePayload.price_per_ha = toNumber(savedProperty.price) / toNumber(updatePayload.total_area_ha);
    }

    const { data: updated, error: updateError } = await supabase
      .from('properties')
      .update(updatePayload)
      .eq('id', savedProperty.id)
      .eq('organization_id', req.orgId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      mode: existing ? 'updated' : 'created',
      property: updated,
      enrichment,
      valuation,
      car: {
        number: codigo,
        status: car.status,
        areaHa,
        city: car.municipio,
        state: car.uf,
      },
    });
  } catch (error) {
    console.error('Rural valuation by CAR error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao puxar valuation pelo CAR.' });
  }
}

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
    const enrichment = features.rural_enrichment || {};
    const valuation = features.rural_valuation || {};
    const areaHa = Number(property.total_area_ha || features.areaHectares || technical.measured_area_ha || 0);
    const price = Number(property.price || 0);
    const pricePerHa = areaHa > 0 ? price / areaHa : 0;
    const { data: siteSettings } = await supabase
      .from('site_settings')
      .select('agency_name, logo_url, primary_color')
      .eq('organization_id', req.orgId)
      .maybeSingle();
    const logoBuffer = await fetchPdfImageBuffer(siteSettings?.logo_url);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dossie-rural-${property.id}.pdf"`);

    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    doc.pipe(res);
    const brandColor = siteSettings?.primary_color || '#065f46';
    const brandName = siteSettings?.agency_name || 'IMOBZY Rural';
    const headerTop = doc.y;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 48, headerTop, { fit: [120, 54], align: 'left', valign: 'center' });
      } catch (error) {
        console.warn('[Rural PDF] Logo render failed:', error.message);
      }
    }
    doc
      .fillColor(brandColor)
      .fontSize(10)
      .text(brandName, 190, headerTop, { align: 'right' });
    doc
      .fillColor('#6b7280')
      .fontSize(8)
      .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 190, headerTop + 16, { align: 'right' });
    doc.moveTo(48, headerTop + 66).lineTo(547, headerTop + 66).strokeColor('#d1d5db').stroke();
    doc.y = headerTop + 84;
    doc.fillColor(brandColor).fontSize(24).text('Dossie Rural 360');
    doc.moveDown(0.3);
    doc.fillColor('#111827').fontSize(18).text(property.title || 'Propriedade rural');
    doc.moveDown();

    const addSection = (title, rows) => {
      doc.fillColor(brandColor).fontSize(14).text(title);
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
    const farmEnrich = enrichment.car ? enrichment : null;

    addSection('Dados do CAR', [
      ['Codigo CAR', farmEnrich ? farmEnrich.car.codigo : legal.carNumber || 'Nao cadastrado'],
      ['Status', farmEnrich ? farmEnrich.car.status : legal.carStatus || '-'],
      ['Area CAR (ha)', farmEnrich ? `${farmEnrich.car.area_ha.toFixed(2)}` : `${areaHa.toFixed(2)}`],
      ['Municipio/UF', farmEnrich ? `${farmEnrich.car.municipio || ''}/${farmEnrich.car.uf || ''}` : [property.city, property.state].filter(Boolean).join(' / ') || '-'],
      ['Centroide', farmEnrich?.car?.centroide ? `${farmEnrich.car.centroide.lat.toFixed(6)}, ${farmEnrich.car.centroide.lng.toFixed(6)}` : enrichment.centroid ? `${Number(enrichment.centroid.lat).toFixed(6)}, ${Number(enrichment.centroid.lng).toFixed(6)}` : '-'],
    ]);

    if (farmEnrich?.incra) {
      addSection('Dados INCRA/SNCR', [
        ['Classificacao fundiaria', farmEnrich.incra.classificacao_fundiaria || '-'],
        ['Modulos fiscais', farmEnrich.incra.modulos_fiscais ? String(farmEnrich.incra.modulos_fiscais) : '-'],
        ['Area registrada', farmEnrich.incra.area_registrada_ha ? `${farmEnrich.incra.area_registrada_ha.toFixed(2)} ha` : '-'],
        ['Situacao', farmEnrich.incra.situacao || '-'],
        ['Titulares', Array.isArray(farmEnrich.incra.titulares) ? farmEnrich.incra.titulares.map(t => t.nome).join(', ') : '-'],
      ]);
    }

    if (farmEnrich?.sicar_temas) {
      const st = farmEnrich.sicar_temas;
      addSection('Uso do Solo (SICAR Tema)', [
        ['Reserva legal', `${st.reserva_legal_ha.toFixed(2)} ha`],
        ['APP', `${st.app_ha.toFixed(2)} ha`],
        ['Vegetacao nativa', `${st.vegetacao_nativa_ha.toFixed(2)} ha`],
        ['Uso consolidado', `${st.uso_consolidado_ha.toFixed(2)} ha`],
        ['Area a recompor', st.area_recompor_ha > 0 ? `${st.area_recompor_ha.toFixed(2)} ha` : 'N/A'],
      ]);
    }

    if (farmEnrich?.ambiental) {
      const amb = farmEnrich.ambiental;
      const rowsAmb = [];
      if (amb.prodes?.possui_desmatamento !== null) {
        rowsAmb.push(['Desmatamento PRODES', amb.prodes.possui_desmatamento ? `SIM (${amb.prodes.area_desmatada_ha.toFixed(2)}ha em ${amb.prodes.ano_referencia})` : 'NAO detectado']);
      }
      if (amb.deter?.total_alertas !== null) {
        rowsAmb.push(['Alertas DETER (30 dias)', String(amb.deter.total_alertas)]);
      }
      if (amb.embargos?.total_embargos !== null) {
        rowsAmb.push(['Embargos IBAMA (raio)', `${amb.embargos.total_embargos} (${amb.embargos.area_total_embargada_ha.toFixed(2)}ha)`]);
      }
      if (amb.mapbiomas) {
        rowsAmb.push(['Alertas MapBiomas', amb.mapbiomas.token_configurado === false ? 'Token nao configurado' : String(amb.mapbiomas.total_alertas)]);
      }
      if (rowsAmb.length > 0) {
        addSection('Analise Ambiental', rowsAmb);
      }
    }

    if (farmEnrich?.economico) {
      const eco = farmEnrich.economico;
      const rowsEco = [];
      if (eco.producao_agricola?.produtos_principais?.length) {
        const top = eco.producao_agricola.produtos_principais.slice(0, 3);
        rowsEco.push(['Principais culturas', top.map(p => `${p.produto} (${(p.quantidade / 1000).toFixed(0)}t)`).join(', ')]);
      }
      if (eco.producao_pecuaria?.total_cabecas) {
        rowsEco.push(['Efetivo pecuario', `${eco.producao_pecuaria.total_cabecas.toLocaleString()} cabecas`]);
      }
      if (eco.indicadores?.pib_total) {
        rowsEco.push(['PIB municipal', eco.indicadores.pib_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);
      }
      if (rowsEco.length > 0) {
        addSection('Dados Economicos Municipais (IBGE)', rowsEco);
      }
    }

    if (farmEnrich?.valuation) {
      const v = farmEnrich.valuation;
      addSection('Score de Inteligencia Rural', [
        ['Score de confianca', `${v.score_confianca}/100`],
        ['Nivel de risco', v.nivel_risco || '-'],
        ['Score alerta ambiental', v.score_alerta_ambiental ? `${v.score_alerta_ambiental}/100` : '-'],
        ['Fontes consultadas', farmEnrich.fontes_consultadas?.join(', ') || '-'],
      ]);
    }

    if (farmEnrich?.valuation?.drivers?.length || farmEnrich?.valuation?.risks?.length) {
      const v = farmEnrich.valuation;
      doc.fillColor(brandColor).fontSize(14).text('Leitura da Analise');
      doc.moveDown(0.3);
      (v.drivers || []).forEach((item) => {
        doc.fillColor('#047857').fontSize(10).text(`+ ${item}`);
      });
      (v.risks || []).forEach((item) => {
        doc.fillColor('#b45309').fontSize(10).text(`! ${item}`);
      });
      doc.moveDown();
    }
    addSection('Quick Valuation Rural', [
      ['Status', valuation.status || 'Nao calculado'],
      ['Metodo', valuation.method || '-'],
      ['Data-base', valuation.valuation_date ? new Date(valuation.valuation_date).toLocaleString('pt-BR') : '-'],
      ['Confianca', valuation.confidence_score !== undefined ? `${valuation.confidence_score}/100` : '-'],
      ['Comparaveis internos', valuation.comparable_count !== undefined ? `${valuation.comparable_count} (${valuation.comparable_scope || '-'})` : '-'],
      ['Valor minimo', valuation.total_value_min ? Number(valuation.total_value_min).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'],
      ['Valor medio', valuation.total_value_avg ? Number(valuation.total_value_avg).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'],
      ['Valor maximo', valuation.total_value_max ? Number(valuation.total_value_max).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'],
      ['Valor/ha medio', valuation.price_per_ha_avg ? Number(valuation.price_per_ha_avg).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'],
      ['Valor/alqueire SP', valuation.price_per_alqueire_sp ? Number(valuation.price_per_alqueire_sp).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'],
      ['Valor/alqueire MG', valuation.price_per_alqueire_mg ? Number(valuation.price_per_alqueire_mg).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'],
    ]);

    if (valuation.drivers?.length || valuation.risks?.length) {
      doc.fillColor(brandColor).fontSize(14).text('Leitura do Valuation');
      doc.moveDown(0.3);
      (valuation.drivers || []).forEach((item) => {
        doc.fillColor('#047857').fontSize(10).text(`+ ${item}`);
      });
      (valuation.risks || []).forEach((item) => {
        doc.fillColor('#b45309').fontSize(10).text(`! ${item}`);
      });
      doc.moveDown();
    }

    doc.fillColor(brandColor).fontSize(14).text('Arquivos e Validacoes');
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
      'Documento gerado automaticamente pelo IMOBZY Rural. Valuation referencial, nao substitui laudo oficial de avaliacao. Confirme as validacoes nos orgaos competentes.',
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

/**
 * POST /api/rural/valuation/car-full
 * Valuation completa a partir do codigo CAR com todas as integracoes
 * (SNCR, SICAR Tema, PRODES, DETER, MapBiomas, IBAMA, IBGE)
 */
router.post('/valuation/car-full', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { carNumber, propertyId } = req.body;
    if (!carNumber && !propertyId) {
      return res.status(400).json({ success: false, error: 'Informe carNumber ou propertyId.' });
    }

    let enrichment;
    if (carNumber) {
      enrichment = await FarmValuationService.valuationByCAR(
        carNumber, req.orgId, req.user.id
      );
    } else {
      const supabase = getSupabaseServer();
      const { data: property } = await supabase
        .from('properties')
        .select('features, title, city, state')
        .eq('id', propertyId)
        .eq('organization_id', req.orgId)
        .single();

      if (!property) return res.status(404).json({ success: false, error: 'Imovel nao encontrado.' });

      const legal = property.features?.legal || {};
      const carNumberFromProp = legal.carNumber;
      if (!carNumberFromProp) {
        return res.status(400).json({ success: false, error: 'Propriedade sem CAR vinculado. Informe carNumber.' });
      }
      enrichment = await FarmValuationService.valuationByCAR(
        carNumberFromProp, req.orgId, req.user.id
      );
    }

    if (propertyId) {
      const supabase = getSupabaseServer();
      const { data: current } = await supabase
        .from('properties')
        .select('features')
        .eq('id', propertyId)
        .eq('organization_id', req.orgId)
        .single();
      const features = current?.features || {};
      await supabase.from('properties').update({
        features: {
          ...features,
          rural_enrichment: enrichment,
          rural_valuation: {
            ...(features.rural_valuation || {}),
            ...(enrichment.valuation || {}),
          },
        },
      }).eq('id', propertyId).eq('organization_id', req.orgId);
    }

    res.json({ success: true, enrichment });
  } catch (error) {
    console.error('[FarmValuation] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/rural/consultarProdes/:lat/:lng
 * Consulta PRODES (desmatamento) para coordenada
 */
router.get('/consultarProdes/:lat/:lng', verifyAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      return res.status(400).json({ error: 'Coordenadas invalidas' });
    }
    const data = await IntegracaoTerraBrasilis.consultarProdes(lat, lng);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rural/consultarEmbargos/:lat/:lng
 * Consulta embargos IBAMA para coordenada
 */
router.get('/consultarEmbargos/:lat/:lng', verifyAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      return res.status(400).json({ error: 'Coordenadas invalidas' });
    }
    const data = await IntegracaoIbamaEmbargos.consultarEmbargosPorCoordenada(lat, lng);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rural/consultarMapBiomas/:lat/:lng
 * Consulta alertas MapBiomas para coordenada
 */
router.get('/consultarMapBiomas/:lat/:lng', verifyAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      return res.status(400).json({ error: 'Coordenadas invalidas' });
    }
    const data = await IntegracaoMapBiomas.consultarUsoSolo(lat, lng);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rural/producaoAgricola/:codigoIbge
 * Consulta producao agricola municipal (IBGE SIDRA)
 */
router.get('/producaoAgricola/:codigoIbge', verifyAuth, async (req, res) => {
  try {
    const codigoIbge = req.params.codigoIbge;
    if (!codigoIbge || codigoIbge.length < 7) {
      return res.status(400).json({ error: 'Codigo IBGE invalido' });
    }
    const data = await IntegracaoIbgeSidra.enrichPropertyWithIbge(codigoIbge);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rural/consultarSNCR/:codigo
 * Consulta dados do SNCR/INCRA para codigo do imovel
 */
router.get('/consultarSNCR/:codigo', verifyAuth, async (req, res) => {
  try {
    const data = await IntegracaoConectaGov.consultarSNCR(req.params.codigo);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
