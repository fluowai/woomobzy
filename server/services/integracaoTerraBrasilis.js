import axios from 'axios';
import { getSupabaseServer } from '../lib/supabase-server.js';

const TERRA_BRASILIS_WMS = 'https://terrabrasilis.dpi.inpe.br/wms';
const PRODES_API = 'https://terrabrasilis.dpi.inpe.br/api/prodes/v1';

export class IntegracaoTerraBrasilis {
  static async consultarProdes(lat, lng, ano) {
    const cacheKey = `prodes:ponto:${lat}:${lng}:${ano || 'ultimo'}`;
    return this._fetchWithCache(cacheKey, async () => {
      const anoRef = ano || new Date().getFullYear() - 1;
      const wmsUrl = `${TERRA_BRASILIS_WMS}/prodes/ows`;
      const params = {
        service: 'WFS', version: '1.1.0',
        request: 'GetFeature',
        typeName: 'prodes:desmatamento',
        outputFormat: 'application/json',
        cql_filter: `INTERSECTS(geom, POINT(${lng} ${lat})) AND ano = ${anoRef}`,
      };

      try {
        const response = await axios.get(wmsUrl, { params, timeout: 20000 });
        const features = response.data?.features || [];
        return {
          possui_desmatamento: features.length > 0,
          area_desmatada_ha: features.reduce((sum, f) => {
            return sum + parseFloat(f.properties?.area_km2 || 0) * 100;
          }, 0),
          alertas: features.map(f => ({
            ano: f.properties?.ano,
            area_ha: parseFloat(f.properties?.area_km2 || 0) * 100,
            classe: f.properties?.classe || 'desmatamento',
            geometria: f.geometry,
          })),
          ano_referencia: anoRef,
          fonte: 'PRODES/INPE',
        };
      } catch {
        return { possui_desmatamento: null, erro: 'PRODES indisponivel', fonte: 'PRODES/INPE' };
      }
    }, 43200);
  }

  static async consultarDeter(lat, lng, dias = 30) {
    const cacheKey = `deter:alerta:${lat}:${lng}:${dias}`;
    return this._fetchWithCache(cacheKey, async () => {
      const dataLimite = new Date(Date.now() - dias * 86400000).toISOString().split('T')[0];
      const wmsUrl = `${TERRA_BRASILIS_WMS}/deter/ows`;
      const params = {
        service: 'WFS', version: '1.1.0',
        request: 'GetFeature',
        typeName: 'deter:alertas',
        outputFormat: 'application/json',
        cql_filter: `INTERSECTS(geom, POINT(${lng} ${lat})) AND data_ocorrencia >= '${dataLimite}'`,
      };

      try {
        const response = await axios.get(wmsUrl, { params, timeout: 20000 });
        const features = response.data?.features || [];
        return {
          total_alertas: features.length,
          alertas_recentes: features.map(f => ({
            data: f.properties?.data_ocorrencia,
            area_ha: parseFloat(f.properties?.area_km2 || 0) * 100,
            tipo: f.properties?.tipo || f.properties?.classe,
            municipio: f.properties?.municipio,
            geometria: f.geometry,
          })),
          periodo_dias: dias,
          fonte: 'DETER/INPE',
        };
      } catch {
        return { total_alertas: null, erro: 'DETER indisponivel', fonte: 'DETER/INPE' };
      }
    }, 21600);
  }

  static async consultarDesmatamentoMunicipio(codigoIbge, ano) {
    const cacheKey = `prodes:municipio:${codigoIbge}:${ano || 'ultimo'}`;
    return this._fetchWithCache(cacheKey, async () => {
      try {
        const response = await axios.get(`${PRODES_API}/municipios/${codigoIbge}/desmatamento`, {
          params: { ano: ano || '' },
          timeout: 15000,
        });
        return {
          municipio: response.data?.municipio,
          uf: response.data?.uf,
          taxa_desmatamento_km2: parseFloat(response.data?.taxa || 0),
          area_desmatada_ha: parseFloat(response.data?.taxa || 0) * 100,
          ano_referencia: response.data?.ano || ano,
          comparacao_ano_anterior: response.data?.variacao_percentual,
          fonte: 'PRODES/INPE',
        };
      } catch {
        return { taxa_desmatamento_km2: null, erro: 'API PRODES municipio indisponivel' };
      }
    }, 86400);
  }

  static async enrichPropertyWithProdes(features, lat, lng) {
    const [prodes, deter] = await Promise.all([
      this.consultarProdes(lat, lng),
      this.consultarDeter(lat, lng),
    ]);
    return { prodes, deter };
  }

  static async _fetchWithCache(cacheKey, fetcher, ttlSeconds) {
    const supabase = getSupabaseServer();

    const { data: cached } = await supabase
      .from('external_data_cache')
      .select('data')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached?.data) return cached.data;

    let data;
    try {
      data = await fetcher();
    } catch (error) {
      console.error(`[TerraBrasilis] Erro ao buscar ${cacheKey}:`, error.message);
      return null;
    }

    if (data) {
      await supabase.from('external_data_cache').upsert({
        cache_key: cacheKey,
        source: 'terrabrasilis',
        data,
        ttl_seconds: ttlSeconds,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      }, { onConflict: 'cache_key' });
    }

    return data;
  }
}
