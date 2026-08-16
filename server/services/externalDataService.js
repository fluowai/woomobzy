import { getSupabaseServer } from '../lib/supabase-server.js';

const IBGE_API_BASE = 'https://servicodados.ibge.gov.br/api/v3';
const CEPEA_AGRO_URL =
  process.env.AGRO_INTEL_URL || 'http://agro-intelligence:8000';

export class ExternalDataService {
  static async getMunicipioData(city, state) {
    const ibgeCode = await this._resolveIbgeCode(city, state);
    if (!ibgeCode) return null;

    const [population, pib, agriculture] = await Promise.all([
      this._fetchWithCache(
        `ibge:population:${ibgeCode}`,
        () => this._fetchIbgePopulation(ibgeCode),
        7 * 86400
      ),
      this._fetchWithCache(
        `ibge:pib:${ibgeCode}`,
        () => this._fetchIbgePib(ibgeCode),
        30 * 86400
      ),
      this._fetchWithCache(
        `ibge:pam:${ibgeCode}:2023`,
        () => this._fetchIbgePam(ibgeCode, 2023),
        30 * 86400
      ),
    ]);

    return {
      codigo_ibge: ibgeCode,
      populacao: population,
      pib_per_capita: pib?.per_capita,
      pib_total: pib?.total,
      idh: pib?.idh,
      producao_agricola: agriculture,
    };
  }

  static async getCepeaPrices() {
    return this._fetchWithCache(
      'cepea:prices:latest',
      async () => {
        try {
          const response = await fetch(`${CEPEA_AGRO_URL}/prices`, {
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) throw new Error('CEPEA service error');
          return await response.json();
        } catch {
          return { success: false, error: 'CEPEA indisponivel' };
        }
      },
      3600
    );
  }

  static async enrichPropertyData(property) {
    const features = property.features || {};
    const location = features.location || {};
    const city = location.city;
    const state = location.state;

    if (!city || !state) return property;

    const municipio = await this.getMunicipioData(city, state);
    const cepea = await this.getCepeaPrices();

    return {
      ...property,
      _enriched: {
        municipio_populacao: municipio?.populacao,
        municipio_pib_per_capita: municipio?.pib_per_capita,
        municipio_idh: municipio?.idh,
        producao_agricola_principal:
          municipio?.producao_agricola?.top_products?.[0],
        precos_commodities: cepea?.data || {},
      },
    };
  }

  static async forceRefresh(source) {
    const prefix =
      source === 'ibge' ? 'ibge:' : source === 'cepea' ? 'cepea:' : '';
    if (!prefix) throw new Error('Fonte invalida. Use ibge ou cepea.');

    const supabase = getSupabaseServer();
    const { data: cached } = await supabase
      .from('external_data_cache')
      .select('cache_key')
      .like('cache_key', `${prefix}%`);

    const expiredAt = new Date().toISOString();
    if (cached?.length) {
      for (const row of cached) {
        await supabase
          .from('external_data_cache')
          .update({ expires_at: expiredAt })
          .eq('cache_key', row.cache_key);
      }
    }

    return { refreshed: cached?.length || 0 };
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
      console.error(
        `[ExternalData] Fetch error for ${cacheKey}:`,
        error.message
      );
      return null;
    }

    if (data) {
      await supabase.from('external_data_cache').upsert(
        {
          cache_key: cacheKey,
          source: cacheKey.split(':')[0],
          data: typeof data === 'object' ? data : { value: data },
          ttl_seconds: ttlSeconds,
          expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        },
        { onConflict: 'cache_key' }
      );
    }

    return data;
  }

  static async _resolveIbgeCode(city, state) {
    const key = `ibge:code:${state}:${city}`;
    const cached = await this._fetchWithCache(
      key,
      async () => {
        const url = `${IBGE_API_BASE}/localidades/municipios?orderBy=nome`;
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });
        const all = await response.json();
        const match = all.find(
          (m) =>
            m.nome.toLowerCase() === city.toLowerCase() &&
            m.microrregiao?.mesorregiao?.UF?.sigla === state
        );
        return match ? { codigo: match.id } : null;
      },
      30 * 86400
    );

    return cached?.codigo || null;
  }

  static async _fetchIbgePopulation(ibgeCode) {
    try {
      const url = `${IBGE_API_BASE}/agregados/6579/periodos/2022/variaveis/9324?localidades=N6[${ibgeCode}]`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      return parseInt(
        data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.[2022] || 0
      );
    } catch {
      return null;
    }
  }

  static async _fetchIbgePib(ibgeCode) {
    try {
      const url = `${IBGE_API_BASE}/agregados/6786/periodos/2021/variaveis/9812?localidades=N6[${ibgeCode}]`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      const total = parseFloat(
        data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.[2021] || 0
      );

      const popUrl = `${IBGE_API_BASE}/agregados/6579/periodos/2021/variaveis/9324?localidades=N6[${ibgeCode}]`;
      const popRes = await fetch(popUrl, {
        signal: AbortSignal.timeout(10000),
      });
      const popData = await popRes.json();
      const pop = parseInt(
        popData?.[0]?.resultados?.[0]?.series?.[0]?.serie?.[2021] || 0
      );

      return {
        total,
        per_capita: pop > 0 ? Math.round((total / pop) * 100) / 100 : null,
      };
    } catch {
      return null;
    }
  }

  static async _fetchIbgePam(ibgeCode, year) {
    try {
      const url = `${IBGE_API_BASE}/agregados/5457/periodos/${year}/variaveis/109?localidades=N6[${ibgeCode}]`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      return data;
    } catch {
      return null;
    }
  }
}
