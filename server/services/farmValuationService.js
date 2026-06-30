import { getSupabaseServer } from '../lib/supabase-server.js';
import { SicarService } from './sicarService.js';
import { IntegracaoConectaGov } from './integracaoConectaGov.js';
import { IntegracaoTerraBrasilis } from './integracaoTerraBrasilis.js';
import { IntegracaoMapBiomas } from './integracaoMapBiomas.js';
import { IntegracaoIbamaEmbargos } from './integracaoIbamaEmbargos.js';
import { IntegracaoIbgeSidra } from './integracaoIbgeSidra.js';

export class FarmValuationService {
  static async valuationByCAR(codigoCar, organizationId, userId) {
    const supabase = getSupabaseServer();
    const carResult = await this._fetchCarData(codigoCar);
    const { geometry, centroid, areaHa, uf, municipio } = carResult;

    const [conectaGov, ambiental, ibge] = await Promise.all([
      this._enrichConectaGov(carResult),
      this._enrichAmbiental(centroid, uf, municipio, areaHa),
      centroid ? this._enrichIbge(centroid.lat, centroid.lng, uf, municipio) : Promise.resolve({}),
    ]);

    const valuationData = this._calcularValuation({
      carResult, conectaGov, ambiental, ibge, areaHa,
    });

    const enrichment = {
      car: {
        codigo: codigoCar,
        status: carResult.status,
        area_ha: areaHa,
        municipio,
        uf,
        geometria: geometry,
        centroide: centroid,
      },
      incra: conectaGov.incra || null,
      sicar_temas: conectaGov.temas || null,
      ambiental: {
        prodes: ambiental.prodes || null,
        deter: ambiental.deter || null,
        mapbiomas: ambiental.mapbiomas || null,
        embargos: ambiental.embargos || null,
      },
      economico: {
        producao_agricola: ibge.producao_agricola || null,
        producao_pecuaria: ibge.producao_pecuaria || null,
        indicadores: ibge.indicadores_economicos || null,
      },
      valuation: valuationData,
      fontes_consultadas: [
        'SICAR/CAR',
        ...(conectaGov.incra ? ['SNCR/INCRA'] : []),
        ...(conectaGov.temas ? ['SICAR Tema'] : []),
        ...(ambiental.prodes ? ['PRODES/INPE'] : []),
        ...(ambiental.deter ? ['DETER/INPE'] : []),
        ...(ambiental.mapbiomas ? ['MapBiomas'] : []),
        ...(ambiental.embargos ? ['IBAMA Embargos'] : []),
        ...(ibge.producao_agricola ? ['IBGE PAM'] : []),
      ],
      data_geracao: new Date().toISOString(),
    };

    return enrichment;
  }

  static async _fetchCarData(codigoCar) {
    const uf = codigoCar.match(/^([A-Z]{2})/i)?.[1]?.toUpperCase();
    if (!uf) throw new Error('Codigo CAR deve iniciar com a UF. Ex: PA-...');

    const data = await SicarService.findByCode(codigoCar);
    if (!data?.features?.length) throw new Error('Imovel nao encontrado no CAR');

    const feature = data.features[0];
    const props = feature.properties || {};
    const geometry = feature.geometry;

    const centroid = this._calcularCentroide(geometry);
    const areaHa = parseFloat(props.num_area || props.area || props.area_ha || 0);

    return {
      codigo: codigoCar,
      uf,
      municipio: props.nom_munici || props.municipio,
      status: props.ind_status || props.status || props.situacao || 'ATIVO',
      areaHa,
      geometry,
      centroid,
      rawProperties: props,
    };
  }

  static async _enrichConectaGov(carResult) {
    const { codigo, uf, municipio } = carResult;
    try {
      const [incra, temas] = await Promise.all([
        IntegracaoConectaGov.consultarSNCR(codigo).catch(() => null),
        IntegracaoConectaGov.consultarSicarTema(codigo).catch(() => null),
      ]);
      return { incra, temas };
    } catch {
      return {};
    }
  }

  static async _enrichAmbiental(centroid, uf, municipio, areaHa) {
    if (!centroid) return {};

    const { lat, lng } = centroid;
    try {
      const [prodes, deter, mapbiomas, embargos] = await Promise.all([
        IntegracaoTerraBrasilis.consultarProdes(lat, lng).catch(() => null),
        IntegracaoTerraBrasilis.consultarDeter(lat, lng).catch(() => null),
        IntegracaoMapBiomas.consultarUsoSolo(lat, lng).catch(() => null),
        IntegracaoIbamaEmbargos.consultarEmbargosPorCoordenada(lat, lng).catch(() => null),
      ]);
      return { prodes, deter, mapbiomas, embargos };
    } catch {
      return {};
    }
  }

  static async _enrichIbge(lat, lng, uf, municipio) {
    try {
      const codigoIbge = await this._resolverCodigoIbge(municipio, uf);
      if (!codigoIbge) return {};
      return await IntegracaoIbgeSidra.enrichPropertyWithIbge(codigoIbge);
    } catch {
      return {};
    }
  }

  static async _resolverCodigoIbge(cidade, uf) {
    if (!cidade || !uf) return null;
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('ibge_municipios')
      .select('codigo_ibge')
      .eq('nome', cidade)
      .eq('uf', uf)
      .maybeSingle();
    return data?.codigo_ibge || null;
  }

  static _calcularValuation(dados) {
    const { carResult, conectaGov, ambiental, ibge, areaHa } = dados;
    const drivers = [];
    const risks = [];
    let scoreConfianca = 0;

    if (carResult.status === 'ATIVO') {
      drivers.push('CAR ativo e vinculado a propriedade.');
      scoreConfianca += 20;
    } else {
      risks.push(`Status do CAR: ${carResult.status}`);
    }

    if (areaHa > 0) {
      drivers.push(`Area de ${areaHa.toFixed(2)} ha identificada no CAR.`);
      scoreConfianca += 15;
    }

    if (conectaGov.incra) {
      drivers.push(`Dados do SNCR/INCRA disponiveis (${conectaGov.incra.classificacao_fundiaria || 'classificacao informada'}).`);
      if (conectaGov.incra.modulos_fiscais) {
        drivers.push(`${conectaGov.incra.modulos_fiscais} modulos fiscais registrados.`);
      }
      scoreConfianca += 15;
    } else {
      risks.push('Dados do INCRA/SNCR nao disponiveis para esta propriedade.');
    }

    if (conectaGov.temas) {
      const t = conectaGov.temas;
      drivers.push(`Uso do solo via SICAR Tema: ${t.reserva_legal_ha.toFixed(1)}ha de reserva legal, ${t.app_ha.toFixed(1)}ha de APP.`);
      if (t.vegetacao_nativa_ha > 0) {
        drivers.push(`${t.vegetacao_nativa_ha.toFixed(1)}ha de vegetacao nativa preservada.`);
      }
      scoreConfianca += 15;
    }

    if (ambiental?.prodes?.possui_desmatamento) {
      risks.push(`Desmatamento detectado pelo PRODES: ${ambiental.prodes.area_desmatada_ha.toFixed(2)}ha em ${ambiental.prodes.ano_referencia}.`);
    } else if (ambiental?.prodes && ambiental.prodes.possui_desmatamento === false) {
      drivers.push('Nenhum desmatamento detectado pelo PRODES na regiao.');
      scoreConfianca += 10;
    }

    if (ambiental?.deter?.total_alertas > 0) {
      risks.push(`${ambiental.deter.total_alertas} alerta(s) DETER nos ultimos 30 dias na regiao.`);
    } else if (ambiental?.deter?.total_alertas === 0) {
      drivers.push('Sem alertas DETER recentes na regiao.');
      scoreConfianca += 5;
    }

    if (ambiental?.embargos?.total_embargos > 0) {
      risks.push(`${ambiental.embargos.total_embargos} embargo(s) ambiental(is) IBAMA na regiao.`);
    } else if (ambiental?.embargos?.total_embargos === 0) {
      drivers.push('Sem embargos ambientais IBAMA na regiao.');
      scoreConfianca += 10;
    }

    if (ambiental?.mapbiomas?.token_configurado === false) {
      risks.push('API MapBiomas nao configurada (configure MAPBIOMAS_API_TOKEN).');
    }

    if (ibge?.producao_agricola?.produtos_principais?.length > 0) {
      const top = ibge.producao_agricola.produtos_principais[0];
      drivers.push(`Producao agricola municipal: ${top.produto} (${top.quantidade.toLocaleString()} ${top.unidade}).`);
      scoreConfianca += 5;
    } else {
      risks.push('Dados de producao agricola municipal nao disponiveis.');
    }

    scoreConfianca = Math.min(100, scoreConfianca);
    const scoreAlerta = risks.length > 3 ? 70 : risks.length > 1 ? 50 : 30;

    return {
      score_confianca: scoreConfianca,
      nivel_risco: scoreConfianca >= 70 ? 'BAIXO' : scoreConfianca >= 45 ? 'MEDIO' : 'ALTO',
      drivers,
      risks,
      score_alerta_ambiental: scoreAlerta,
    };
  }

  static _calcularCentroide(geometry) {
    if (!geometry) return null;
    let coords = [];
    if (geometry.type === 'Polygon') coords = geometry.coordinates[0];
    else if (geometry.type === 'MultiPolygon') coords = geometry.coordinates[0]?.[0];
    else return null;

    const n = coords.length;
    if (n === 0) return null;
    const sum = coords.reduce((acc, c) => [acc[0] + c[1], acc[1] + c[0]], [0, 0]);
    return { lat: sum[0] / n, lng: sum[1] / n };
  }
}
