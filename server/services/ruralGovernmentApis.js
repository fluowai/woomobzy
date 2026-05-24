import axios from 'axios';

const DEFAULT_TIMEOUT = 20000;
const NOMINATIM_USER_AGENT = 'Rural360/1.0';
const DATAJUD_API_KEY =
  process.env.DATAJUD_API_KEY ||
  'cjNoS05vOEJ3S05vOEJ3S05vOEJ3S05vOEJ3S05vOEJ3S05vOEJ3S05vOEJ3';

export const RURAL_GOV_API_URLS = {
  nominatimReverse: 'https://nominatim.openstreetmap.org/reverse',
  sicarWfs: 'https://geoserver.car.gov.br/geoserver/sicar/ows',
  ibamaWfs: 'https://servicos.ibama.gov.br/geoserver/publica/ows',
  funaiWfs: 'https://cm-funai.gov.br/geoserver/funai/ows',
  icmbioWfs: 'https://mapas.icmbio.gov.br/geoserver/icmbio/ows',
  sigefWfs: 'https://sigef.incra.gov.br/geoserver/wfs',
  ibamaArcgisEmbargos:
    'https://servicos.ibama.gov.br/arcgis/rest/services/Fiscalizacao/Areas_Embargadas/MapServer/0/query',
  inpeProdesWfs:
    'http://terrabrasilis.dpi.inpe.br/geoserver/prodes-cerrado/prodes_cerrado_2000_2023_uf_inter/wfs',
  openMeteoArchive: 'https://archive-api.open-meteo.com/v1/archive',
  dataJud: 'https://api-publica.datajud.cnj.jus.br/api_publica/_search',
};

export function sanitizeCpfCnpj(value) {
  const cleaned = String(value || '').replace(/\D/g, '');
  return cleaned.length >= 11 && cleaned.length <= 14 ? cleaned : null;
}

function featureSummary(feature) {
  if (!feature) return null;
  return {
    id: feature.id || null,
    geometry: feature.geometry || null,
    properties: feature.properties || {},
  };
}

function collectRingsFromGeoJson(geometry) {
  if (!geometry) return [];

  if (geometry.type === 'Feature') {
    return collectRingsFromGeoJson(geometry.geometry);
  }

  if (geometry.type === 'FeatureCollection') {
    return geometry.features.flatMap((feature) => collectRingsFromGeoJson(feature));
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates || [];
  }

  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates || []).flatMap((polygon) => polygon);
  }

  return [];
}

function ringToWkt(ring) {
  const closedRing = [...ring];
  const first = closedRing[0];
  const last = closedRing[closedRing.length - 1];

  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    closedRing.push(first);
  }

  return `(${closedRing.map(([lng, lat]) => `${lng} ${lat}`).join(', ')})`;
}

export function geoJsonToWkt(geometry) {
  const rings = collectRingsFromGeoJson(geometry);
  if (rings.length === 0) return null;

  return `POLYGON(${rings.map(ringToWkt).join(', ')})`;
}

function geoJsonToArcGisPolygon(geometry) {
  const rings = collectRingsFromGeoJson(geometry);
  if (rings.length === 0) return null;

  return {
    rings,
    spatialReference: { wkid: 4326 },
  };
}

async function requestWfs({ url, version, typeName, cqlFilter, source, timeout = DEFAULT_TIMEOUT }) {
  const params = {
    service: 'WFS',
    version,
    request: 'GetFeature',
    typeName,
    outputFormat: 'application/json',
    CQL_FILTER: cqlFilter,
  };

  try {
    const response = await axios.get(url, { params, timeout });
    const features = response.data?.features || [];
    return {
      source,
      success: true,
      url,
      typeName,
      cqlFilter,
      count: features.length,
      features,
    };
  } catch (error) {
    return {
      source,
      success: false,
      url,
      typeName,
      cqlFilter,
      count: 0,
      features: [],
      error: error.response?.data?.message || error.message,
    };
  }
}

export class RuralGovernmentApis {
  static getSicarLayer(uf) {
    if (!uf) return null;
    return `sicar:sicar_imoveis_${String(uf).trim().toLowerCase()}`;
  }

  static async reverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get(RURAL_GOV_API_URLS.nominatimReverse, {
        params: {
          format: 'json',
          lat: latitude,
          lon: longitude,
          zoom: 10,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': NOMINATIM_USER_AGENT,
        },
        timeout: 8000,
      });

      const address = response.data?.address || {};
      return {
        uf: address['ISO3166-2-lvl4']?.split('-')[1] || address.state_code || null,
        state: address.state || null,
        municipality:
          address.city || address.town || address.village || address.municipality || null,
        raw: response.data,
      };
    } catch (error) {
      return { uf: null, state: null, municipality: null, error: error.message };
    }
  }

  static async querySicarByPoint(uf, latitude, longitude) {
    return requestWfs({
      url: RURAL_GOV_API_URLS.sicarWfs,
      version: '1.0.0',
      typeName: this.getSicarLayer(uf),
      source: 'SICAR_WFS_POINT',
      cqlFilter: `INTERSECTS(geo_area_imovel, POINT(${longitude} ${latitude}))`,
    });
  }

  static async querySicarByRadius(uf, latitude, longitude, radiusMeters) {
    return requestWfs({
      url: RURAL_GOV_API_URLS.sicarWfs,
      version: '1.0.0',
      typeName: this.getSicarLayer(uf),
      source: 'SICAR_WFS_RADIUS',
      cqlFilter: `DWITHIN(geo_area_imovel, POINT(${longitude} ${latitude}), ${radiusMeters}, meters)`,
    });
  }

  static queryIbamaEmbargosByPoint(latitude, longitude) {
    return requestWfs({
      url: RURAL_GOV_API_URLS.ibamaWfs,
      version: '1.1.0',
      typeName: 'publica:areas_embargadas_poligonos',
      source: 'IBAMA_AREAS_EMBARGADAS_WFS',
      cqlFilter: `INTERSECTS(geom, POINT(${longitude} ${latitude}))`,
    });
  }

  static queryIbamaAutosInfracaoByPoint(latitude, longitude) {
    return requestWfs({
      url: RURAL_GOV_API_URLS.ibamaWfs,
      version: '1.1.0',
      typeName: 'publica:autos_infracao',
      source: 'IBAMA_AUTOS_INFRACAO_WFS',
      cqlFilter: `INTERSECTS(geom, POINT(${longitude} ${latitude}))`,
    });
  }

  static queryFunaiTerrasIndigenasByPoint(latitude, longitude) {
    return requestWfs({
      url: RURAL_GOV_API_URLS.funaiWfs,
      version: '1.1.0',
      typeName: 'terras_indigenas',
      source: 'FUNAI_TERRAS_INDIGENAS_WFS',
      cqlFilter: `INTERSECTS(geom, POINT(${longitude} ${latitude}))`,
    });
  }

  static queryIcmbioUnidadesConservacaoByPoint(latitude, longitude) {
    return requestWfs({
      url: RURAL_GOV_API_URLS.icmbioWfs,
      version: '1.1.0',
      typeName: 'unidades_conservacao',
      source: 'ICMBIO_UNIDADES_CONSERVACAO_WFS',
      cqlFilter: `INTERSECTS(geom, POINT(${longitude} ${latitude}))`,
    });
  }

  static querySigefByPoint(latitude, longitude) {
    return requestWfs({
      url: RURAL_GOV_API_URLS.sigefWfs,
      version: '1.1.0',
      typeName: 'sigef:parcela_certificada_privada',
      source: 'SIGEF_CERTIFICACAO_WFS',
      cqlFilter: `INTERSECTS(geom, POINT(${longitude} ${latitude}))`,
    });
  }

  static async queryIbamaEmbargosArcgisByPolygon(geometry) {
    const arcgisGeometry = geoJsonToArcGisPolygon(geometry);
    if (!arcgisGeometry) {
      return { source: 'IBAMA_AREAS_EMBARGADAS_ARCGIS', success: false, count: 0, features: [], error: 'Geometria invalida.' };
    }

    try {
      const response = await axios.post(
        RURAL_GOV_API_URLS.ibamaArcgisEmbargos,
        new URLSearchParams({
          where: '1=1',
          geometryType: 'esriGeometryPolygon',
          spatialRel: 'esriSpatialRelIntersects',
          outFields: '*',
          returnGeometry: 'true',
          f: 'json',
          geometry: JSON.stringify(arcgisGeometry),
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: DEFAULT_TIMEOUT,
        }
      );

      const features = response.data?.features || [];
      return {
        source: 'IBAMA_AREAS_EMBARGADAS_ARCGIS',
        success: !response.data?.error,
        url: RURAL_GOV_API_URLS.ibamaArcgisEmbargos,
        count: features.length,
        features,
        error: response.data?.error?.message || null,
      };
    } catch (error) {
      return {
        source: 'IBAMA_AREAS_EMBARGADAS_ARCGIS',
        success: false,
        url: RURAL_GOV_API_URLS.ibamaArcgisEmbargos,
        count: 0,
        features: [],
        error: error.message,
      };
    }
  }

  static queryInpeProdesByPolygon(geometry) {
    const wkt = geoJsonToWkt(geometry);
    if (!wkt) {
      return Promise.resolve({
        source: 'INPE_TERRABRASILIS_PRODES_WFS',
        success: false,
        count: 0,
        features: [],
        error: 'Geometria invalida.',
      });
    }

    return requestWfs({
      url: RURAL_GOV_API_URLS.inpeProdesWfs,
      version: '1.0.0',
      typeName: 'prodes-cerrado:prodes_cerrado_2000_2023_uf_inter',
      source: 'INPE_TERRABRASILIS_PRODES_WFS',
      cqlFilter: `INTERSECTS(geom, ${wkt})`,
      timeout: DEFAULT_TIMEOUT,
    });
  }

  static async queryOpenMeteoAnnualRain(latitude, longitude, year = 2023) {
    try {
      const response = await axios.get(RURAL_GOV_API_URLS.openMeteoArchive, {
        params: {
          latitude,
          longitude,
          start_date: `${year}-01-01`,
          end_date: `${year}-12-31`,
          daily: 'precipitation_sum',
          timezone: 'America/Sao_Paulo',
        },
        timeout: DEFAULT_TIMEOUT,
      });

      const daily = response.data?.daily?.precipitation_sum || [];
      const annualPrecipitationMm = daily.reduce(
        (total, value) => total + (Number(value) || 0),
        0
      );

      return {
        source: 'OPEN_METEO_ARCHIVE',
        success: true,
        year,
        annualPrecipitationMm,
        dailyCount: daily.length,
        raw: response.data,
      };
    } catch (error) {
      return {
        source: 'OPEN_METEO_ARCHIVE',
        success: false,
        year,
        annualPrecipitationMm: null,
        error: error.message,
      };
    }
  }

  static async queryDataJudByCpfCnpj(cpfCnpj) {
    const document = sanitizeCpfCnpj(cpfCnpj);
    if (!document) {
      return {
        source: 'CNJ_DATAJUD',
        success: false,
        count: 0,
        cases: [],
        error: 'CPF ou CNPJ invalido ou ausente.',
      };
    }

    try {
      const response = await axios.post(
        RURAL_GOV_API_URLS.dataJud,
        {
          query: {
            query_string: {
              query: document,
              fields: ['partes.poloAtivo.cpfCnpj', 'partes.poloPassivo.cpfCnpj', 'partes.nome'],
            },
          },
          size: 20,
        },
        {
          headers: {
            Authorization: `ApiKey ${DATAJUD_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: DEFAULT_TIMEOUT,
        }
      );

      const hits = response.data?.hits?.hits || [];
      return {
        source: 'CNJ_DATAJUD',
        success: true,
        count: hits.length,
        cases: hits.map((hit) => ({
          id: hit._id,
          score: hit._score,
          data: hit._source,
        })),
      };
    } catch (error) {
      return {
        source: 'CNJ_DATAJUD',
        success: false,
        count: 0,
        cases: [],
        error: error.response?.data?.error?.reason || error.message,
      };
    }
  }

  static async buildPropertyDossier({ latitude, longitude, geometry, ownerDocument, rainYear }) {
    const pointChecks = await Promise.all([
      this.queryIbamaEmbargosByPoint(latitude, longitude),
      this.queryIbamaAutosInfracaoByPoint(latitude, longitude),
      this.queryFunaiTerrasIndigenasByPoint(latitude, longitude),
      this.queryIcmbioUnidadesConservacaoByPoint(latitude, longitude),
      this.querySigefByPoint(latitude, longitude),
      this.queryOpenMeteoAnnualRain(latitude, longitude, rainYear),
      ownerDocument ? this.queryDataJudByCpfCnpj(ownerDocument) : Promise.resolve(null),
    ]);

    const polygonChecks = geometry
      ? await Promise.all([
          this.queryIbamaEmbargosArcgisByPolygon(geometry),
          this.queryInpeProdesByPolygon(geometry),
        ])
      : [];

    const [
      ibamaEmbargos,
      ibamaAutosInfracao,
      funaiTerrasIndigenas,
      icmbioUnidadesConservacao,
      sigefCertificacao,
      openMeteoRain,
      dataJud,
    ] = pointChecks;

    const [ibamaEmbargosArcgis, inpeProdes] = polygonChecks;

    const alerts = [];
    if (ibamaEmbargos.count > 0 || ibamaEmbargosArcgis?.count > 0) alerts.push('Embargo ambiental IBAMA encontrado.');
    if (ibamaAutosInfracao.count > 0) alerts.push('Auto de infracao ambiental IBAMA encontrado.');
    if (funaiTerrasIndigenas.count > 0) alerts.push('Sobreposicao com terra indigena FUNAI encontrada.');
    if (icmbioUnidadesConservacao.count > 0) alerts.push('Sobreposicao com unidade de conservacao ICMBio encontrada.');
    if (inpeProdes?.count > 0) alerts.push('Historico de desmatamento PRODES encontrado.');
    if (dataJud?.count > 0) alerts.push('Processos CNJ/DataJud encontrados para o proprietario.');

    return {
      generatedAt: new Date().toISOString(),
      coordinates: { latitude, longitude },
      alerts,
      sources: {
        ibamaEmbargos: { ...ibamaEmbargos, features: ibamaEmbargos.features.map(featureSummary) },
        ibamaAutosInfracao: { ...ibamaAutosInfracao, features: ibamaAutosInfracao.features.map(featureSummary) },
        funaiTerrasIndigenas: { ...funaiTerrasIndigenas, features: funaiTerrasIndigenas.features.map(featureSummary) },
        icmbioUnidadesConservacao: { ...icmbioUnidadesConservacao, features: icmbioUnidadesConservacao.features.map(featureSummary) },
        sigefCertificacao: { ...sigefCertificacao, features: sigefCertificacao.features.map(featureSummary) },
        ibamaEmbargosArcgis,
        inpeProdes: inpeProdes
          ? { ...inpeProdes, features: inpeProdes.features.map(featureSummary) }
          : null,
        openMeteoRain,
        dataJud,
      },
    };
  }
}
