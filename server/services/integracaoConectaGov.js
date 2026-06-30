import axios from 'axios';
import { getSupabaseServer } from '../lib/supabase-server.js';

const SNCR_API_BASE = 'https://api.incra.gov.br/sncr/v2';
const SICAR_TEMA_API_BASE = 'https://api.sicar.gov.br/tema/v1';

export class IntegracaoConectaGov {
  static async consultarSNCR(codigoImovel) {
    return this._fetchWithCache(
      `sncr:imovel:${codigoImovel}`,
      async () => {
        const response = await axios.get(`${SNCR_API_BASE}/imoveis/${codigoImovel}`, {
          timeout: 15000,
          headers: { Accept: 'application/json' },
        });
        return this._normalizarSNCR(response.data);
      },
      86400
    );
  }

  static async consultarSNCRPorCPFCNPJ(cpfCnpj) {
    return this._fetchWithCache(
      `sncr:cpfcnpj:${cpfCnpj}`,
      async () => {
        const response = await axios.get(`${SNCR_API_BASE}/imoveis`, {
          params: { documento: cpfCnpj.replace(/\D/g, '') },
          timeout: 20000,
        });
        const imoveis = response.data?.imoveis || [];
        return imoveis.map(this._normalizarSNCR);
      },
      43200
    );
  }

  static async consultarSicarTema(codigoImovel) {
    return this._fetchWithCache(
      `sicar:tema:${codigoImovel}`,
      async () => {
        const response = await axios.get(`${SICAR_TEMA_API_BASE}/imoveis/${codigoImovel}/temas`, {
          timeout: 15000,
        });
        return this._normalizarTemas(response.data);
      },
      86400
    );
  }

  static async enrichPropertyWithIncraData(property) {
    const features = property.features || {};
    const legal = features.legal || {};
    const carNumber = legal.carNumber;
    const ccirNumber = legal.ccirNumber;

    const results = {};

    if (ccirNumber) {
      try {
        const sncr = await this.consultarSNCR(ccirNumber);
        if (sncr) Object.assign(results, sncr);
      } catch (e) {
        console.warn(`[ConectaGov] SNCR falhou para CCIR ${ccirNumber}: ${e.message}`);
      }
    }

    if (carNumber) {
      try {
        const temas = await this.consultarSicarTema(carNumber);
        if (temas) results.temas = temas;
      } catch (e) {
        console.warn(`[ConectaGov] SICAR Tema falhou para CAR ${carNumber}: ${e.message}`);
      }
    }

    return results;
  }

  static _normalizarSNCR(raw) {
    return {
      codigo_imovel: raw.codigoImovel || raw.codigo_imovel,
      nome_imovel: raw.denominacao || raw.nomeImovel,
      area_total_ha: parseFloat(raw.areaTotal || raw.area_total || 0),
      area_registrada_ha: parseFloat(raw.areaRegistrada || raw.area_registrada || 0),
      modulos_fiscais: parseFloat(raw.modulosFiscais || raw.modulos_fiscais || 0),
      numero_modulos: parseInt(raw.numeroModulos || raw.numero_modulos || 0),
      classificacao_fundiaria: raw.classificacaoFundiaria || raw.classificacao_fundiaria,
      situacao: raw.situacao || raw.status,
      condicao: raw.condicao || raw.condicao_posse,
      tipo_imovel: raw.tipoImovel || raw.tipo_imovel,
      endereco: raw.endereco || raw.logradouro,
      municipio: raw.municipio || raw.nome_municipio,
      uf: raw.uf || raw.sigla_uf,
      cep: raw.cep,
      titulares: (raw.titulares || raw.proprietarios || []).map(t => ({
        nome: t.nome || t.nome_proprietario,
        documento: t.cpf || t.cnpj || t.documento,
        tipo_pessoa: t.tipoPessoa || t.tipo_pessoa,
        percentual: parseFloat(t.percentual || t.perc_participacao || 0),
      })),
      data_atualizacao: raw.dataAtualizacao || raw.data_atualizacao,
      fonte: 'SNCR/INCRA',
    };
  }

  static _normalizarTemas(raw) {
    const temas = Array.isArray(raw) ? raw : raw?.temas || [];
    const resultado = {
      app_ha: 0,
      reserva_legal_ha: 0,
      uso_consolidado_ha: 0,
      vegetacao_nativa_ha: 0,
      area_recompor_ha: 0,
      cobertura_solo: [],
      temas_detectados: [],
    };

    for (const tema of temas) {
      const area = parseFloat(tema.areaTotalTema || tema.area || 0);
      resultado.temas_detectados.push({
        tema: tema.tema || tema.nome,
        area_ha: area,
      });

      const nome = (tema.tema || '').toLowerCase();
      if (nome.includes('app') || nome.includes('permanente')) resultado.app_ha += area;
      if (nome.includes('reserva') || nome.includes('legal')) resultado.reserva_legal_ha += area;
      if (nome.includes('consolidado') || nome.includes('antropico')) resultado.uso_consolidado_ha += area;
      if (nome.includes('vegetacao') || nome.includes('floresta') || nome.includes('nativa')) resultado.vegetacao_nativa_ha += area;
      if (nome.includes('recompor')) resultado.area_recompor_ha += area;
      if (tema.coberturaSolo || tema.cobertura_solo) {
        resultado.cobertura_solo.push({
          tipo: tema.coberturaSolo || tema.cobertura_solo,
          area_ha: area,
        });
      }
    }

    resultado.fonte = 'SICAR Tema';
    return resultado;
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
      console.error(`[ConectaGov] Erro ao buscar ${cacheKey}:`, error.message);
      return null;
    }

    if (data) {
      await supabase.from('external_data_cache').upsert({
        cache_key: cacheKey,
        source: 'conectagov',
        data,
        ttl_seconds: ttlSeconds,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      }, { onConflict: 'cache_key' });
    }

    return data;
  }
}
