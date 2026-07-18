import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import {
  isRuralProperty,
  applyRuralFilter,
} from '../../utils/propertyNiche.js';
import { FarmValuationService } from '../../services/farmValuationService.js';
import { SicarService } from '../../services/sicarService.js';
import {
  sanitizeInput,
  isValidUUID,
  extractUfFromRuralCode,
  featureCollectionToMapTarget,
} from '../../lib/shared-utils.js';
import { ruralPropertiesQuery, fetchCarFeatureByCode } from './legal.routes.js';

const router = Router();

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPropertyAreaHa(property = {}) {
  const features = property.features || {};
  return toNumber(
    property.total_area_ha ||
      features.areaHectares ||
      features.rural_technical?.measured_area_ha ||
      features.rural_technical?.area_total_ha ||
      features.physical?.area ||
      features.rural?.area_ha
  );
}

function normalizeGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'FeatureCollection') return geometry;
  if (geometry.type === 'Feature')
    return { type: 'FeatureCollection', features: [geometry] };
  if (['Polygon', 'MultiPolygon'].includes(geometry.type)) {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry }],
    };
  }
  return null;
}

function extractPropertyGeometry(property = {}) {
  const features = property.features || {};
  return normalizeGeometry(
    features.legal?.geometry ||
      features.rural_technical?.geometry ||
      features.rural_enrichment?.geometry ||
      features.rural?.geometry
  );
}

function ringAreaSquareMeters(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  const valid = ring.filter(
    (point) => Array.isArray(point) && point.length >= 2
  );
  if (valid.length < 3) return 0;
  const avgLat =
    valid.reduce((sum, point) => sum + toNumber(point[1]), 0) / valid.length;
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
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function polygonAreaSquareMeters(coordinates) {
  if (!Array.isArray(coordinates) || !coordinates.length) return 0;
  const [outer, ...holes] = coordinates;
  const holeArea = holes.reduce(
    (sum, ring) => sum + ringAreaSquareMeters(ring),
    0
  );
  return Math.max(0, ringAreaSquareMeters(outer) - holeArea);
}

function calculateGeometryAreaHa(featureCollection) {
  const features = featureCollection?.features || [];
  const squareMeters = features.reduce((sum, feature) => {
    const geometry = feature.geometry || feature;
    if (geometry.type === 'Polygon')
      return sum + polygonAreaSquareMeters(geometry.coordinates);
    if (geometry.type === 'MultiPolygon') {
      return (
        sum +
        geometry.coordinates.reduce(
          (polySum, polygon) => polySum + polygonAreaSquareMeters(polygon),
          0
        )
      );
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
    centroid: target?.coords
      ? { lat: target.coords[0], lng: target.coords[1] }
      : null,
    bounds: target?.bounds || null,
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
    if (item.state && property.state && item.state === property.state)
      sameState.push(comparable);
    if (
      item.city &&
      property.city &&
      item.city === property.city &&
      item.state === property.state
    )
      sameCity.push(comparable);
  }

  const selected =
    sameCity.length >= 2
      ? sameCity
      : sameState.length >= 2
        ? sameState
        : anyRural;
  const prices = selected.map((item) => item.pricePerHa).sort((a, b) => a - b);
  const avg = prices.length
    ? prices.reduce((sum, value) => sum + value, 0) / prices.length
    : 0;
  const currentPricePerHa =
    propertyArea > 0 && toNumber(property.price) > 0
      ? toNumber(property.price) / propertyArea
      : 0;

  return {
    scope:
      sameCity.length >= 2
        ? 'municipio'
        : sameState.length >= 2
          ? 'estado'
          : prices.length
            ? 'carteira_rural'
            : 'sem_comparaveis',
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
    car_status:
      legal.carStatus || (legal.carNumber ? 'INFORMADO' : 'NAO_INFORMADO'),
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
      types: [
        ...new Set(documents.map((doc) => doc.document_type).filter(Boolean)),
      ],
      due_diligence_score: dueDiligence.validation?.riskScore ?? null,
      due_diligence_level: dueDiligence.validation?.riskLevel || null,
    },
    sources: {
      car: {
        status: legal.carNumber ? 'available' : 'missing',
        label: 'CAR/SICAR',
      },
      sigef: {
        status: legal.geoNumber ? 'available' : 'missing',
        label: 'SIGEF/INCRA',
      },
      documents: {
        status: documents.length ? 'available' : 'missing',
        label: 'Documentos internos',
      },
      mapbiomas: {
        status: 'planned',
        label: 'MapBiomas - uso e cobertura do solo',
      },
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
  const areaHa = toNumber(
    enrichment?.measured_area_ha ||
      enrichment?.declared_area_ha ||
      getPropertyAreaHa(property)
  );
  const hasOwnPrice = comparables.currentPricePerHa > 0;
  const marketReference =
    comparables.avgPricePerHa || comparables.currentPricePerHa || 0;
  const basePricePerHa =
    hasOwnPrice && comparables.avgPricePerHa
      ? comparables.currentPricePerHa * 0.45 + comparables.avgPricePerHa * 0.55
      : marketReference;
  const minPricePerHa = basePricePerHa > 0 ? basePricePerHa * 0.88 : 0;
  const avgPricePerHa = basePricePerHa;
  const maxPricePerHa = basePricePerHa > 0 ? basePricePerHa * 1.12 : 0;
  const technical = enrichment?.technical || {};
  const docs = enrichment?.documents || {};
  const drivers = [];
  const risks = [];

  if (enrichment?.car_number)
    drivers.push('CAR informado e vinculado ao ativo.');
  else risks.push('CAR nao informado.');
  if (enrichment?.geometry)
    drivers.push('Geometria rural disponivel para medicao territorial.');
  else risks.push('Geometria/perimetro ainda nao cadastrado.');
  if (comparables.count > 0)
    drivers.push(
      `${comparables.count} comparavel(is) interno(s) usados como referencia (${comparables.scope}).`
    );
  else
    risks.push(
      'Sem comparaveis internos com preco e area para referencia regional.'
    );
  if (technical.solo || technical.bioma || technical.topografia)
    drivers.push('Cadastro tecnico rural possui dados agronomicos basicos.');
  else risks.push('Cadastro tecnico rural incompleto.');
  if (docs.due_diligence_score !== null)
    drivers.push(
      `Due diligence registrada com score ${docs.due_diligence_score}.`
    );
  else risks.push('Due diligence ainda nao executada.');

  const confidenceScore = Math.min(
    100,
    (enrichment?.car_number ? 20 : 0) +
      (enrichment?.geometry ? 20 : 0) +
      (comparables.count >= 3 ? 25 : comparables.count > 0 ? 15 : 0) +
      (hasOwnPrice ? 10 : 0) +
      (technical.solo || technical.bioma || technical.topografia ? 10 : 0) +
      (docs.due_diligence_score !== null ? 10 : 0) +
      (property.city && property.state ? 5 : 0)
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

router.post(
  '/enrich/:propertyId',
  verifyAuth,
  requireTenant,
  async (req, res) => {
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
        return res
          .status(404)
          .json({ error: 'Propriedade rural nao encontrada' });
      }

      const { data: documents } = await supabase
        .from('documents')
        .select(
          'document_type, status, validation_status, validation_score, created_at'
        )
        .eq('organization_id', req.orgId)
        .eq('property_id', property.id)
        .order('created_at', { ascending: false });

      const enrichment = buildRuralEnrichment(property, documents || []);
      const features = {
        ...(property.features || {}),
        rural_enrichment: enrichment,
        legal: {
          ...(property.features?.legal || {}),
          geometry:
            enrichment.geometry || property.features?.legal?.geometry || null,
        },
      };

      const updatePayload = {
        features,
        total_area_ha:
          enrichment.measured_area_ha ||
          enrichment.declared_area_ha ||
          property.total_area_ha,
        niche: 'rural',
      };
      if (
        toNumber(property.price) > 0 &&
        toNumber(updatePayload.total_area_ha) > 0
      ) {
        updatePayload.price_per_ha =
          toNumber(property.price) / toNumber(updatePayload.total_area_ha);
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
  }
);

async function handleRuralValuationByCar(req, res) {
  try {
    const codigo = sanitizeInput(req.body?.carNumber, 80).toUpperCase();
    if (!codigo) {
      return res
        .status(400)
        .json({ error: 'Informe um numero de CAR valido.' });
    }

    const supabase = getSupabaseServer();
    const carResult = await fetchCarFeatureByCode(codigo);
    const car = carResult.car;
    const geometry = normalizeGeometry(car.geometry);
    const areaFromGeometry = geometry ? calculateGeometryAreaHa(geometry) : 0;
    const areaHa = areaFromGeometry || car.areaHa || 0;

    const { data: existingProperties, error: existingError } =
      await ruralPropertiesQuery(supabase, req.orgId)
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
        city:
          car.municipio || existing?.city || baseFeatures.location?.city || '',
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
      title:
        existing?.title ||
        req.body?.title ||
        `Fazenda ${car.municipio || codigo}`,
      description:
        existing?.description ||
        `Propriedade rural identificada pelo CAR ${codigo}.`,
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
      : supabase.from('properties').insert(payload).select('*').single();

    const { data: savedProperty, error: saveError } = await saveQuery;
    if (saveError) throw saveError;

    const { data: documents } = await supabase
      .from('documents')
      .select(
        'document_type, status, validation_status, validation_score, created_at'
      )
      .eq('organization_id', req.orgId)
      .eq('property_id', savedProperty.id)
      .order('created_at', { ascending: false });

    const fullEnrichment = await FarmValuationService.valuationByCAR(
      codigo,
      req.orgId,
      req.user.id
    );
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
    const comparables = getComparableStats(
      ruralProperties || [],
      savedProperty
    );
    const valuation = {
      ...buildRuralValuation(savedProperty, enrichment, comparables),
      comparable_samples: [],
      drivers: [
        ...(fullEnrichment.valuation?.drivers || []),
        ...((fullEnrichment.valuation?.regional_summary && [
          `Resumo regional: ${fullEnrichment.valuation.regional_summary}`,
        ]) ||
          []),
      ],
      risks: fullEnrichment.valuation?.risks || [],
      confidence_score: fullEnrichment.valuation?.score_confianca ?? null,
      intelligence_score: fullEnrichment.valuation?.score_confianca ?? null,
      environmental_alert_score:
        fullEnrichment.valuation?.score_alerta_ambiental ?? null,
      risk_level: fullEnrichment.valuation?.nivel_risco || null,
      regional_summary:
        fullEnrichment.valuation?.regional_summary ||
        fullEnrichment.regional_analysis?.market_summary ||
        null,
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
    if (
      toNumber(savedProperty.price) > 0 &&
      toNumber(updatePayload.total_area_ha) > 0
    ) {
      updatePayload.price_per_ha =
        toNumber(savedProperty.price) / toNumber(updatePayload.total_area_ha);
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
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Erro ao puxar valuation pelo CAR.' });
  }
}

router.post(
  '/valuation/by-car',
  verifyAuth,
  requireTenant,
  handleRuralValuationByCar
);

router.post(
  '/valuation/:propertyId',
  verifyAuth,
  requireTenant,
  async (req, res) => {
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
        return res
          .status(404)
          .json({ error: 'Propriedade rural nao encontrada' });
      }

      const { data: documents } = await supabase
        .from('documents')
        .select(
          'document_type, status, validation_status, validation_score, created_at'
        )
        .eq('organization_id', req.orgId)
        .eq('property_id', property.id)
        .order('created_at', { ascending: false });

      const enrichment =
        property.features?.rural_enrichment ||
        buildRuralEnrichment(property, documents || []);
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
      if (
        toNumber(property.price) > 0 &&
        toNumber(updatePayload.total_area_ha) > 0
      ) {
        updatePayload.price_per_ha =
          toNumber(property.price) / toNumber(updatePayload.total_area_ha);
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
  }
);

router.post(
  '/valuation/car-full',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { carNumber, propertyId } = req.body;
      if (!carNumber && !propertyId) {
        return res
          .status(400)
          .json({ success: false, error: 'Informe carNumber ou propertyId.' });
      }

      let enrichment;
      if (carNumber) {
        enrichment = await FarmValuationService.valuationByCAR(
          carNumber,
          req.orgId,
          req.user.id
        );
      } else {
        const supabase = getSupabaseServer();
        const { data: property } = await supabase
          .from('properties')
          .select('features, title, city, state')
          .eq('id', propertyId)
          .eq('organization_id', req.orgId)
          .single();

        if (!property)
          return res
            .status(404)
            .json({ success: false, error: 'Imovel nao encontrado.' });

        const legal = property.features?.legal || {};
        const carNumberFromProp = legal.carNumber;
        if (!carNumberFromProp) {
          return res.status(400).json({
            success: false,
            error: 'Propriedade sem CAR vinculado. Informe carNumber.',
          });
        }
        enrichment = await FarmValuationService.valuationByCAR(
          carNumberFromProp,
          req.orgId,
          req.user.id
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
        await supabase
          .from('properties')
          .update({
            features: {
              ...features,
              rural_enrichment: enrichment,
              rural_valuation: {
                ...(features.rural_valuation || {}),
                ...(enrichment.valuation || {}),
              },
            },
          })
          .eq('id', propertyId)
          .eq('organization_id', req.orgId);
      }

      res.json({ success: true, enrichment });
    } catch (error) {
      console.error('[FarmValuation] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export {
  toNumber,
  getPropertyAreaHa,
  normalizeGeometry,
  buildRuralEnrichment,
  buildRuralValuation,
  getComparableStats,
  calculateGeometryAreaHa,
};
export default router;
