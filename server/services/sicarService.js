/**
 * server/services/sicarService.js
 *
 * Conector para o GeoServer público do CAR/SICAR (Ministério da Agricultura).
 * Utiliza o protocolo WFS para consultas espaciais sob demanda.
 */

import axios from 'axios';

const SICAR_WFS_URL = 'https://geoserver.car.gov.br/geoserver/sicar/ows';

export const SicarService = {
  /**
   * Retorna o nome da camada SICAR baseada na UF.
   */
  getLayerName(uf) {
    if (!uf) return null;
    const cleanUf = uf.toLowerCase().trim();
    return `sicar:sicar_imoveis_${cleanUf}`;
  },

  /**
   * Busca imóvel rural que contém o ponto informado.
   */
  async findByPoint(uf, lat, lng) {
    const layer = this.getLayerName(uf);
    if (!layer) return [];

    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.0.0',
      request: 'GetFeature',
      typeName: layer,
      outputFormat: 'application/json',
      CQL_FILTER: `INTERSECTS(geo_area_imovel, POINT(${lng} ${lat}))`,
    });

    try {
      console.log(
        `[SicarService] Consultando Ponto em ${layer}: ${lng} ${lat}`
      );
      const response = await axios.get(
        `${SICAR_WFS_URL}?${params.toString()}`,
        { timeout: 15000 }
      );
      return response.data?.features || [];
    } catch (e) {
      console.error(
        `[SicarService] Erro na consulta por ponto (${uf}):`,
        e.message
      );

      // Fallback: Tentar outro nome de campo geométrico se necessário
      if (e.response?.data?.includes('geo_area_imovel')) {
        return this.retryWithAlternativeGeometry(
          layer,
          `POINT(${lng} ${lat})`,
          'INTERSECTS'
        );
      }

      throw e;
    }
  },

  /**
   * Busca imóveis rurais próximos a um ponto dentro de um raio (metros).
   */
  async findByRadius(uf, lat, lng, radiusMeters = 1000) {
    const layer = this.getLayerName(uf);
    if (!layer) return [];

    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.0.0',
      request: 'GetFeature',
      typeName: layer,
      outputFormat: 'application/json',
      CQL_FILTER: `DWITHIN(geo_area_imovel, POINT(${lng} ${lat}), ${radiusMeters}, meters)`,
    });

    try {
      console.log(
        `[SicarService] Consultando Raio ${radiusMeters}m em ${layer}`
      );
      const response = await axios.get(
        `${SICAR_WFS_URL}?${params.toString()}`,
        { timeout: 20000 }
      );
      return response.data?.features || [];
    } catch (e) {
      console.error(
        `[SicarService] Erro na consulta por raio (${uf}):`,
        e.message
      );
      throw e;
    }
  },

  /**
   * Consulta os metadados da camada para descobrir campos disponíveis.
   */
  async describeLayer(uf) {
    const layer = this.getLayerName(uf);
    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.0.0',
      request: 'DescribeFeatureType',
      typeName: layer,
    });

    try {
      const response = await axios.get(`${SICAR_WFS_URL}?${params.toString()}`);
      return response.data;
    } catch (e) {
      return { error: e.message };
    }
  },

  /**
   * Busca imóvel rural pelo código CAR.
   */
  async findByCode(codigo) {
    const uf = this._extractUF(codigo);
    if (!uf) throw new Error('Código CAR deve iniciar com a UF. Ex: PA-...');

    const layer = this.getLayerName(uf);
    const cleanCode = codigo.toUpperCase().trim();

    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.0.0',
      request: 'GetFeature',
      typeName: layer,
      outputFormat: 'application/json',
      CQL_FILTER: `cod_imovel='${cleanCode}'`,
    });

    try {
      console.log(`[SicarService] Consultando CAR ${cleanCode} em ${layer}`);
      const response = await axios.get(
        `${SICAR_WFS_URL}?${params.toString()}`,
        { timeout: 20000 }
      );
      return response.data;
    } catch (e) {
      console.error(
        `[SicarService] Erro na consulta por código (${codigo}):`,
        e.message
      );
      throw e;
    }
  },

  _extractUF(codigo) {
    const match = String(codigo || '')
      .trim()
      .match(/^([A-Z]{2})[-_]/i);
    return match ? match[1].toUpperCase() : null;
  },

  /**
   * Tenta encontrar o campo geométrico correto se o padrão falhar.
   */
  async retryWithAlternativeGeometry(layer, spatialValue, operator) {
    // Lista de campos comuns em GeoServers brasileiros
    const altFields = ['geom', 'the_geom', 'geometria', 'shape'];

    for (const field of altFields) {
      try {
        const params = new URLSearchParams({
          service: 'WFS',
          version: '1.0.0',
          request: 'GetFeature',
          typeName: layer,
          outputFormat: 'application/json',
          CQL_FILTER: `${operator}(${field}, ${spatialValue})`,
        });
        const res = await axios.get(`${SICAR_WFS_URL}?${params.toString()}`, {
          timeout: 10000,
        });
        if (res.data?.features) return res.data.features;
      } catch (e) {
        continue;
      }
    }
    return [];
  },
};
