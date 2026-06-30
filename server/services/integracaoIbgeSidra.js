import { getSupabaseServer } from '../lib/supabase-server.js';

const IBGE_API = 'https://servicodados.ibge.gov.br/api/v3';

export class IntegracaoIbgeSidra {
  static async consultarProducaoAgricola(codigoIbge, ano) {
    const anoRef = ano || new Date().getFullYear() - 1;
    const cacheKey = `ibge:pam:${codigoIbge}:${anoRef}`;
    return this._fetchWithCache(cacheKey, async () => {
      try {
        const url = `${IBGE_API}/agregados/5457/periodos/${anoRef}/variaveis/109?localidades=N6[${codigoIbge}]`;
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        const data = await response.json();
        return this._extrairProducao(data);
      } catch {
        return this._fallbackProducao(codigoIbge, anoRef);
      }
    }, 86400 * 7);
  }

  static async consultarPecuaria(codigoIbge, ano) {
    const anoRef = ano || new Date().getFullYear() - 1;
    const cacheKey = `ibge:pecuaria:${codigoIbge}:${anoRef}`;
    return this._fetchWithCache(cacheKey, async () => {
      try {
        const url = `${IBGE_API}/agregados/3939/periodos/${anoRef}/variaveis/109?localidades=N6[${codigoIbge}]`;
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        const data = await response.json();
        return this._extrairPecuaria(data);
      } catch {
        return { erro: 'PAM pecuaria indisponivel', fonte: 'IBGE SIDRA' };
      }
    }, 86400 * 7);
  }

  static async consultarPrecoTerras(codigoIbge) {
    const cacheKey = `ibge:preco_terras:${codigoIbge}`;
    return this._fetchWithCache(cacheKey, async () => {
      try {
        const url = `${IBGE_API}/agregados/6786/periodos/2021/variaveis/9812?localidades=N6[${codigoIbge}]`;
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        const data = await response.json();
        return {
          pib_total: parseFloat(data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.[2021] || 0),
          ano_referencia: 2021,
          fonte: 'IBGE PIB Municipal',
        };
      } catch {
        return { erro: 'IBGE PIB indisponivel', fonte: 'IBGE' };
      }
    }, 86400 * 30);
  }

  static async enrichPropertyWithIbge(codigoIbge) {
    if (!codigoIbge) return {};

    const [agricultura, pecuaria, pib] = await Promise.all([
      this.consultarProducaoAgricola(codigoIbge),
      this.consultarPecuaria(codigoIbge),
      this.consultarPrecoTerras(codigoIbge),
    ]);

    return {
      producao_agricola: agricultura,
      producao_pecuaria: pecuaria,
      indicadores_economicos: pib,
    };
  }

  static _extrairProducao(data) {
    if (!data?.[0]) return null;

    const resultados = data[0]?.resultados?.[0]?.series?.[0]?.serie || {};
    const produto = data[0]?.variavel || 'Producao agricola';
    const ano = Object.keys(resultados).pop();
    const valor = parseFloat(resultados[ano] || 0);

    const produtos = [];
    if (data[0]?.resultados?.[0]?.series) {
      for (const serie of data[0].resultados[0].series) {
        const nome = serie?.variavel?.nome || serie?.produto || 'desconhecido';
        const quantidade = parseFloat(Object.values(serie.serie || {})[0] || 0);
        if (quantidade > 0) {
          produtos.push({ produto: nome, quantidade, unidade: 'toneladas' });
        }
      }
    }

    return {
      produto_principal: produto,
      valor_total: valor,
      ano: parseInt(ano || 0),
      produtos_principais: produtos.sort((a, b) => b.quantidade - a.quantidade).slice(0, 10),
      total_produtos: produtos.length,
      fonte: 'IBGE PAM',
    };
  }

  static _extrairPecuaria(data) {
    if (!data?.[0]) return null;
    const efetivos = [];
    for (const item of data) {
      const nome = item.variavel || item.vars?.nome || 'rebanho';
      const serie = item.resultados?.[0]?.series?.[0]?.serie || {};
      const cabecas = parseInt(Object.values(serie)[0] || 0);
      if (cabecas > 0) efetivos.push({ tipo: nome, cabecas });
    }
    return {
      efetivos_rebanho: efetivos.sort((a, b) => b.cabecas - a.cabecas),
      total_cabecas: efetivos.reduce((s, e) => s + e.cabecas, 0),
      fonte: 'IBGE PPM',
    };
  }

  static _fallbackProducao(codigoIbge, ano) {
    return {
      ano,
      produtos_principais: [],
      fonte: 'IBGE PAM (offline)',
      erro: 'API IBGE SIDRA indisponivel no momento',
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
      console.error(`[IBGE SIDRA] Erro ao buscar ${cacheKey}:`, error.message);
      return null;
    }

    if (data) {
      await supabase.from('external_data_cache').upsert({
        cache_key: cacheKey,
        source: 'ibge_sidra',
        data,
        ttl_seconds: ttlSeconds,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      }, { onConflict: 'cache_key' });
    }

    return data;
  }
}
