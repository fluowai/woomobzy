import axios from 'axios';
import { getSupabaseServer } from '../lib/supabase-server.js';

const MAPBIOMAS_API = 'https://plataforma.alerta.mapbiomas.org/api/v2/graphql';
let mapbiomasSessionToken = null;

export class IntegracaoMapBiomas {
  static async consultarUsoSolo(lat, lng) {
    const cacheKey = `mapbiomas:usosolo:${lat}:${lng}`;
    return this._fetchWithCache(cacheKey, async () => {
      const query = `
        query pointInformation($boundingBox: BoundingBoxInput) {
          pointInformation(boundingBox: $boundingBox) {
            alerts {
              alertCode
              detectedAt
              publishedAt
              areaHa
              sources
              statusName
            }
          }
        }
      `;
      const delta = Number(process.env.MAPBIOMAS_POINT_DELTA || 0.01);

      try {
        const response = await this._graphql({
          query,
          variables: {
            boundingBox: {
              swLat: Number(lat) - delta,
              swLng: Number(lng) - delta,
              neLat: Number(lat) + delta,
              neLng: Number(lng) + delta,
            },
          },
        });

        const errors = response.data?.errors || [];
        if (errors.length) {
          throw new Error(errors.map((item) => item.message).join('; '));
        }

        const alerts = response.data?.data?.pointInformation?.alerts || [];
        return {
          total_alertas: alerts.length,
          alertas: alerts.map(a => ({
            id: a.alertCode,
            data: a.detectedAt || a.publishedAt,
            area_ha: a.areaHa,
            classificacao: Array.isArray(a.sources) ? a.sources.join(', ') : null,
            status: a.statusName,
          })),
          area_total_alertas_ha: alerts.reduce((s, a) => s + (a.areaHa || 0), 0),
          fonte: 'MapBiomas Alerta',
          token_configurado: Boolean(process.env.MAPBIOMAS_API_TOKEN || process.env.MAPBIOMAS_EMAIL),
          api_autenticada: Boolean(mapbiomasSessionToken || process.env.MAPBIOMAS_API_TOKEN),
          bounding_box_delta: delta,
        };
      } catch (error) {
        console.warn(`[MapBiomas] API erro, usando fallback: ${error.message}`);
        return this._fallbackUsoSolo(lat, lng);
      }
    }, 43200);
  }

  static async consultarUsoSoloPorMunicipio(codigoIbge) {
    const cacheKey = `mapbiomas:municipio:${codigoIbge}`;
    return this._fetchWithCache(cacheKey, async () => {
      try {
        const url = `https://storage.googleapis.com/mapbiomas-public/initiatives/brasil/collection_8/statistics/municipio/${codigoIbge}.json`;
        const response = await axios.get(url, { timeout: 15000 });
        const dados = response.data;
        if (!dados) return null;

        const usoPorAno = {};
        for (const item of Array.isArray(dados) ? dados : [dados]) {
          const ano = item.ano || item.year;
          if (!ano) continue;
          usoPorAno[ano] = {
            floresta_ha: parseFloat(item.floresta || item.forest || 0),
            agropecuaria_ha: parseFloat(item.agropecuaria || item.agriculture || 0),
            pastagem_ha: parseFloat(item.pastagem || item.pasture || 0),
            area_urbana_ha: parseFloat(item.urbano || item.urban || 0),
            agua_ha: parseFloat(item.agua || item.water || 0),
            outros_ha: parseFloat(item.outros || item.other || 0),
          };
        }

        return {
          codigo_ibge: codigoIbge,
          uso_por_ano: usoPorAno,
          ultimo_ano_disponivel: Math.max(...Object.keys(usoPorAno).map(Number), 0),
          fonte: 'MapBiomas Colecao 8',
        };
      } catch {
        return { erro: 'Dados municipais MapBiomas indisponiveis', fonte: 'MapBiomas' };
      }
    }, 86400 * 7);
  }

  static _fallbackUsoSolo(lat, lng) {
    return {
      alertas: [],
      total_alertas: 0,
      area_total_alertas_ha: 0,
      fonte: 'MapBiomas Alerta (fallback)',
      token_configurado: Boolean(process.env.MAPBIOMAS_API_TOKEN || process.env.MAPBIOMAS_EMAIL),
      mensagem: 'Consulta MapBiomas indisponivel no momento. Configure MAPBIOMAS_EMAIL/MAPBIOMAS_PASSWORD ou MAPBIOMAS_API_TOKEN e tente novamente.',
    };
  }

  static async enrichPropertyWithMapBiomas(features, lat, lng, codigoIbge) {
    const [usoLocal, usoMunicipio] = await Promise.all([
      this.consultarUsoSolo(lat, lng),
      codigoIbge ? this.consultarUsoSoloPorMunicipio(codigoIbge) : Promise.resolve(null),
    ]);
    return { alertas_local: usoLocal, uso_solo_municipio: usoMunicipio };
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
      console.error(`[MapBiomas] Erro ao buscar ${cacheKey}:`, error.message);
      return null;
    }

    if (data) {
      await supabase.from('external_data_cache').upsert({
        cache_key: cacheKey,
        source: 'mapbiomas',
        data,
        ttl_seconds: ttlSeconds,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      }, { onConflict: 'cache_key' });
    }

    return data;
  }

  static async _graphql({ query, variables }) {
    const headers = {
      'Content-Type': 'application/json',
    };
    const token = await this._getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    return axios.post(MAPBIOMAS_API, { query, variables }, {
      headers,
      timeout: 20000,
    });
  }

  static async _getToken() {
    const configuredToken = (process.env.MAPBIOMAS_API_TOKEN || '').trim();
    if (configuredToken) return configuredToken;
    if (mapbiomasSessionToken) return mapbiomasSessionToken;

    const email = (process.env.MAPBIOMAS_EMAIL || '').trim();
    const password = (process.env.MAPBIOMAS_PASSWORD || '').trim();
    if (!email || !password) return null;

    const response = await axios.post(MAPBIOMAS_API, {
      query: `
        mutation signIn($email: String!, $password: String!) {
          signIn(email: $email, password: $password) { token }
        }
      `,
      variables: { email, password },
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    const errors = response.data?.errors || [];
    if (errors.length) {
      throw new Error(errors.map((item) => item.message).join('; '));
    }
    mapbiomasSessionToken = response.data?.data?.signIn?.token || null;
    return mapbiomasSessionToken;
  }
}
