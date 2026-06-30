import axios from 'axios';
import { getSupabaseServer } from '../lib/supabase-server.js';

const IBAMA_EMBARGOS_API = 'https://servicos.ibama.gov.br/api/embargos';
const IBAMA_DADOS_ABERTOS = 'https://dados.gov.br/api/ibama/embargos';

export class IntegracaoIbamaEmbargos {
  static async consultarEmbargosPorCoordenada(lat, lng, raioKm = 10) {
    const cacheKey = `ibama:embargos:${lat}:${lng}:${raioKm}`;
    return this._fetchWithCache(cacheKey, async () => {
      try {
        const response = await axios.get(`${IBAMA_EMBARGOS_API}/area`, {
          params: {
            latitude: lat,
            longitude: lng,
            raio_km: raioKm,
          },
          timeout: 15000,
        });
        return this._normalizarEmbargos(response.data);
      } catch {
        return this._fallbackConsulta(lat, lng, raioKm);
      }
    }, 21600);
  }

  static async consultarEmbargosPorCPFCNPJ(documento) {
    const doc = documento.replace(/\D/g, '');
    const cacheKey = `ibama:embargos:doc:${doc}`;
    return this._fetchWithCache(cacheKey, async () => {
      try {
        const response = await axios.get(`${IBAMA_EMBARGOS_API}/autuado`, {
          params: { documento: doc },
          timeout: 15000,
        });
        return {
          total_embargos: response.data?.length || 0,
          embargos: (response.data || []).map(e => ({
            auto_infracao: e.autoInfracao || e.numero_auto,
            data_embargo: e.dataEmbargo || e.data_embargo,
            tipo: e.tipo || e.tipo_infracao,
            area_embargada_ha: parseFloat(e.areaEmbargada || e.area_embargada || 0),
            municipio: e.municipio,
            uf: e.uf,
            status: e.situacao || e.status,
            fundamentacao: e.fundamentacao || e.base_legal,
          })),
          fonte: 'IBAMA',
        };
      } catch {
        return { total_embargos: null, erro: 'API IBAMA indisponivel', fonte: 'IBAMA' };
      }
    }, 43200);
  }

  static async consultarEmbargosPorMunicipio(municipio, uf) {
    const cacheKey = `ibama:embargos:municipio:${uf}:${municipio}`;
    return this._fetchWithCache(cacheKey, async () => {
      try {
        const response = await axios.get(`${IBAMA_EMBARGOS_API}/municipio`, {
          params: { municipio, uf },
          timeout: 15000,
        });
        return {
          municipio,
          uf,
          total_embargos: response.data?.length || 0,
          embargos: (response.data || []).map(e => ({
            auto_infracao: e.autoInfracao || e.numero_auto,
            data_embargo: e.dataEmbargo || e.data_embargo,
            area_embargada_ha: parseFloat(e.areaEmbargada || e.area_embargada || 0),
            situacao: e.situacao || e.status,
          })),
          area_total_embargada_ha: (response.data || []).reduce((s, e) => {
            return s + parseFloat(e.areaEmbargada || e.area_embargada || 0);
          }, 0),
          fonte: 'IBAMA',
        };
      } catch {
        return { total_embargos: null, erro: 'API IBAMA municipio indisponivel', fonte: 'IBAMA' };
      }
    }, 43200);
  }

  static async enrichPropertyWithEmbargos(features, lat, lng, municipio, uf) {
    const [porCoordenada, porMunicipio] = await Promise.all([
      this.consultarEmbargosPorCoordenada(lat, lng),
      municipio && uf ? this.consultarEmbargosPorMunicipio(municipio, uf) : Promise.resolve(null),
    ]);
    return { embargos_proximos: porCoordenada, embargos_municipio: porMunicipio };
  }

  static _normalizarEmbargos(data) {
    const lista = Array.isArray(data) ? data : data?.embargos || data?.features || [];
    return {
      total_embargos: lista.length,
      area_total_embargada_ha: lista.reduce((s, e) => {
        return s + parseFloat(e.areaEmbargada || e.area_embargada || e.area_km2 || 0);
      }, 0),
      embargos: lista.map(e => ({
        auto_infracao: e.autoInfracao || e.numero_auto || e.properties?.auto_infracao,
        data_embargo: e.dataEmbargo || e.data_embargo || e.properties?.data_embargo,
        tipo: e.tipo || e.tipoInfracao || e.properties?.tipo,
        area_embargada_ha: parseFloat(e.areaEmbargada || e.area_embargada || e.properties?.area_km2 || 0),
        municipio: e.municipio || e.properties?.municipio,
        uf: e.uf || e.properties?.uf,
        status: e.situacao || e.status || e.properties?.situacao,
      })),
      fonte: 'IBAMA',
    };
  }

  static _fallbackConsulta(lat, lng, raioKm) {
    return {
      total_embargos: null,
      erro: 'API IBAMA indisponivel. Os dados de embargos serao enriquecidos quando o servico estiver online.',
      fonte: 'IBAMA (offline)',
      area_consulta: { latitude: lat, longitude: lng, raio_km: raioKm },
    };
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
      console.error(`[IbamaEmbargos] Erro ao buscar ${cacheKey}:`, error.message);
      return null;
    }

    if (data) {
      await supabase.from('external_data_cache').upsert({
        cache_key: cacheKey,
        source: 'ibama_embargos',
        data,
        ttl_seconds: ttlSeconds,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      }, { onConflict: 'cache_key' });
    }

    return data;
  }
}
