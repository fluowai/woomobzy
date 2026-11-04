import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { SicarService } from '../../services/sicarService.js';
import { applyRuralFilter } from '../../utils/propertyNiche.js';
import {
  sanitizeInput,
  isValidUUID,
  extractUfFromRuralCode,
  extractGeoServerException,
  featureCollectionToMapTarget,
} from '../../lib/shared-utils.js';

const router = Router();

const cpfCnpjSchema = z
  .string()
  .min(11)
  .max(18)
  .refine(
    (val) =>
      val.replace(/\D/g, '').length >= 11 &&
      val.replace(/\D/g, '').length <= 14,
    { message: 'CPF ou CNPJ invalido' }
  );

function ruralPropertiesQuery(supabase, orgId, columns = '*') {
  return applyRuralFilter(
    supabase.from('properties').select(columns).eq('organization_id', orgId)
  );
}

function normalizeCarFeature(feature = {}, fallbackCode = '') {
  const properties = feature.properties || {};
  const codImovel =
    properties.cod_imovel || properties.cod_imovel_car || fallbackCode;
  const areaHa =
    Number(properties.num_area || properties.area || properties.area_ha) || 0;
  const municipio =
    properties.nom_munici ||
    properties.municipio ||
    properties.nom_municipio ||
    null;
  const uf =
    properties.cod_estado ||
    properties.uf ||
    extractUfFromRuralCode(codImovel) ||
    null;

  return {
    codImovel,
    areaHa,
    status:
      properties.ind_status || properties.status || properties.situacao || null,
    municipio,
    uf,
    geometry: feature.geometry || null,
    rawProperties: properties,
  };
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
    const message =
      extractGeoServerException(rawText) ||
      'Falha ao consultar servidor do CAR';
    const error = new Error(message);
    error.statusCode = 502;
    throw error;
  }

  if (!contentType.includes('json') && rawText.trim().startsWith('<')) {
    const message =
      extractGeoServerException(rawText) ||
      'Servidor do CAR retornou XML em vez de JSON.';
    const error = new Error(message);
    error.statusCode = 502;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (parseError) {
    const error = new Error(
      `Resposta invalida do servidor do CAR: ${parseError.message}`
    );
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

router.get('/sncr/buscar', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = cpfCnpjSchema.safeParse(req.query.cpfCnpj);
    if (!validation.success) {
      return res.status(400).json({ error: 'Parametro cpfCnpj invalido' });
    }

    const cpfCnpjClean = req.query.cpfCnpj.replace(/\D/g, '');

    const supabase = getSupabaseServer();
    const { data: properties } = await ruralPropertiesQuery(
      supabase,
      req.orgId,
      'id, title, features, property_type, niche'
    ).filter('features->legal->>ccirNumber', 'ilike', `*${cpfCnpjClean}*`);

    const results =
      properties?.map((p) => ({
        codigoImovel: p.features?.legal?.ccirNumber,
        denominacao: p.title,
        municipio: p.city || p.features?.location?.city,
        uf: p.state || p.features?.location?.state,
        areaHa:
          p.total_area_ha ||
          p.features?.areaHectares ||
          p.features?.physical?.area,
      })) || [];

    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error('SNCR buscar error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get(
  '/sncr/imovel/:codigo',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const codigo = sanitizeInput(req.params.codigo, 30);
      if (!codigo) {
        return res.status(400).json({ error: 'Codigo invalido' });
      }

      const supabase = getSupabaseServer();
      const { data: property } = await ruralPropertiesQuery(supabase, req.orgId)
        .eq('features->legal->ccirNumber', codigo)
        .single();

      if (!property) {
        return res.status(404).json({ error: 'Imovel nao encontrado' });
      }

      res.json({
        success: true,
        data: {
          codigoImovel: codigo,
          denominacao: property.title,
          municipio: property.city || property.features?.location?.city,
          uf: property.state || property.features?.location?.state,
          areaHa:
            property.total_area_ha ||
            property.features?.areaHectares ||
            property.features?.physical?.area,
          areaTotal:
            property.total_area_ha ||
            property.features?.areaHectares ||
            property.features?.physical?.area,
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

router.get(
  '/sigef/parcela/:codigo',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const codigo = sanitizeInput(req.params.codigo, 30);
      if (!codigo) {
        return res.status(400).json({ error: 'Codigo invalido' });
      }

      const supabase = getSupabaseServer();
      const { data: property } = await ruralPropertiesQuery(supabase, req.orgId)
        .eq('features->legal->geoNumber', codigo)
        .single();

      if (!property) {
        return res.status(404).json({ error: 'Parcela nao encontrada' });
      }

      res.json({
        success: true,
        data: {
          codigoParcela: codigo,
          codigoImovel: property.features?.legal?.ccirNumber,
          denominacao: property.title,
          municipio: property.city || property.features?.location?.city,
          uf: property.state || property.features?.location?.state,
          areaCertificada:
            property.total_area_ha ||
            property.features?.areaHectares ||
            property.features?.physical?.area,
          areaShape:
            property.total_area_ha ||
            property.features?.areaHectares ||
            property.features?.physical?.area,
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

router.get(
  '/car/consultar/:codigo',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const codigo = sanitizeInput(req.params.codigo, 80).toUpperCase();
      if (!codigo) {
        return res
          .status(400)
          .json({ success: false, error: 'Codigo CAR invalido' });
      }

      const result = await fetchCarFeatureByCode(codigo);
      res.json({ success: true, data: result.data, ...result.target });
    } catch (error) {
      console.error('CAR WFS error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
        data: error.data || null,
      });
    }
  }
);

router.get(
  '/sigef/consultar/:codigo',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const codigo = sanitizeInput(req.params.codigo, 80).toUpperCase();
      if (!codigo) {
        return res
          .status(400)
          .json({ success: false, error: 'Codigo SIGEF invalido' });
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
        const message =
          extractGeoServerException(rawText) ||
          'Falha ao consultar servidor do SIGEF';
        return res
          .status(502)
          .json({ success: false, error: message, status: response.status });
      }

      if (!contentType.includes('json') && rawText.trim().startsWith('<')) {
        const message =
          extractGeoServerException(rawText) ||
          'Servidor do SIGEF retornou XML em vez de JSON.';
        return res
          .status(200)
          .json({ success: false, error: message, data: null });
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
  }
);

router.get('/car/:codigo', verifyAuth, requireTenant, async (req, res) => {
  try {
    const codigo = sanitizeInput(req.params.codigo, 30);
    if (!codigo) {
      return res.status(400).json({ error: 'Codigo invalido' });
    }

    const supabase = getSupabaseServer();
    const { data: properties } = await ruralPropertiesQuery(
      supabase,
      req.orgId
    ).eq('features->legal->carNumber', codigo);

    if (!properties || properties.length === 0) {
      return res.status(404).json({ error: 'CAR nao encontrado no sistema' });
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

router.get(
  '/itr/certidao/:nirf',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const nirf = sanitizeInput(req.params.nirf, 20);
      if (!nirf) {
        return res.status(400).json({ error: 'NIRF invalido' });
      }

      res.json({
        success: true,
        data: {
          nirf,
          situacao: 'CONSULTA_EXTERNA_NECESSARIA',
          tipo: 'NAO_VERIFICADA',
          mensagem: 'Consulte a certidao no portal e-CAC da Receita Federal',
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

router.get(
  '/validar/:propertyId',
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

      if (!property) {
        return res.status(404).json({ error: 'Propriedade nao encontrada' });
      }

      const legal = property.features?.legal || {};
      const location = property.features?.location || {};
      const physical = property.features?.physical || {};

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
          data: { codigo: '', status: 'NAO CADASTRADO' },
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
          data: { codigo: '', situacao: 'NAO CADASTRADO' },
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
          data: { codigo: '', situacao: 'NAO CADASTRADO' },
        });
      }

      validations.push(
        legal.itrNumber || legal.nirf
          ? {
              source: 'ITR',
              success: true,
              data: {
                codigo: legal.itrNumber || legal.nirf,
                situacao: legal.itrStatus || 'REGULAR',
              },
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
        areaHa:
          physical.area ||
          property.total_area_ha ||
          property.features?.areaHectares ||
          0,
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

export { ruralPropertiesQuery, fetchCarFeatureByCode, normalizeCarFeature };
export default router;
