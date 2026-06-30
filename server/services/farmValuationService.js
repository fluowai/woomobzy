import { getSupabaseServer } from '../lib/supabase-server.js';
import { SicarService } from './sicarService.js';
import { IntegracaoConectaGov } from './integracaoConectaGov.js';
import { IntegracaoTerraBrasilis } from './integracaoTerraBrasilis.js';
import { IntegracaoMapBiomas } from './integracaoMapBiomas.js';
import { IntegracaoIbamaEmbargos } from './integracaoIbamaEmbargos.js';
import { IntegracaoIbgeSidra } from './integracaoIbgeSidra.js';
import axios from 'axios';

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

    const regional = await this._enrichRegionalWithGroq({
      organizationId,
      carResult,
      conectaGov,
      ambiental,
      ibge,
      areaHa,
    });
    const terrain = this._buildTerrainLogistics({ carResult, conectaGov, ambiental, ibge, regional });
    const valuationData = this._calcularValuation({
      carResult, conectaGov, ambiental, ibge, areaHa, terrain, regional,
    });
    const sources = this._buildSources({ carResult, conectaGov, ambiental, ibge, terrain, regional });

    const enrichment = {
      source_car: 'SICAR/CAR',
      car_number: codigoCar,
      car_status: carResult.status,
      declared_area_ha: areaHa || null,
      measured_area_ha: areaHa || null,
      municipality: municipio || null,
      state: uf || null,
      geometry,
      centroid,
      bounds: this._calcularBounds(geometry),
      sources,
      regional_analysis: regional,
      soil: terrain.soil,
      slope: terrain.slope,
      hydrography: terrain.hydrography,
      logistics: terrain.logistics,
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
      terreno_logistica: terrain,
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
        ...(regional ? ['Groq Pesquisa Regional'] : []),
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
    if (data?.codigo_ibge) return data.codigo_ibge;

    try {
      const response = await axios.get('https://servicodados.ibge.gov.br/api/v1/localidades/municipios', {
        timeout: 15000,
      });
      const normalizedCity = this._normalizeText(cidade);
      const match = (response.data || []).find((item) => (
        this._normalizeText(item.nome) === normalizedCity &&
        item.microrregiao?.mesorregiao?.UF?.sigla === uf
      ));
      return match?.id || null;
    } catch {
      return null;
    }
  }

  static _calcularValuation(dados) {
    const { carResult, conectaGov, ambiental, ibge, areaHa, terrain, regional } = dados;
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
      const reservaLegalHa = Number(t.reserva_legal_ha || 0);
      const appHa = Number(t.app_ha || 0);
      const vegetacaoNativaHa = Number(t.vegetacao_nativa_ha || 0);
      drivers.push(`Uso do solo via SICAR Tema: ${reservaLegalHa.toFixed(1)}ha de reserva legal, ${appHa.toFixed(1)}ha de APP.`);
      if (vegetacaoNativaHa > 0) {
        drivers.push(`${vegetacaoNativaHa.toFixed(1)}ha de vegetacao nativa preservada.`);
      }
      scoreConfianca += 15;
    }

    if (ambiental?.prodes?.possui_desmatamento) {
      const areaDesmatadaHa = Number(ambiental.prodes.area_desmatada_ha || 0);
      risks.push(`Desmatamento detectado pelo PRODES: ${areaDesmatadaHa.toFixed(2)}ha em ${ambiental.prodes.ano_referencia || 'ano nao informado'}.`);
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
      const quantidade = Number(top.quantidade || 0).toLocaleString('pt-BR');
      drivers.push(`Producao agricola municipal: ${top.produto} (${quantidade} ${top.unidade || ''}).`);
      scoreConfianca += 5;
    } else {
      risks.push('Dados de producao agricola municipal nao disponiveis.');
    }

    if (terrain?.soil?.summary) {
      drivers.push(`Solo/regiao: ${terrain.soil.summary}`);
      scoreConfianca += 5;
    }
    if (terrain?.slope?.summary) {
      drivers.push(`Declividade/relevo: ${terrain.slope.summary}`);
      scoreConfianca += 5;
    }
    if (terrain?.hydrography?.summary) {
      drivers.push(`Hidrografia/APP: ${terrain.hydrography.summary}`);
      scoreConfianca += 5;
    }
    if (terrain?.logistics?.summary) {
      drivers.push(`Logistica regional: ${terrain.logistics.summary}`);
      scoreConfianca += 5;
    }
    if (regional?.market_summary) {
      drivers.push(`Pesquisa regional Groq: ${regional.market_summary}`);
    }
    (regional?.regional_drivers || []).forEach((item) => drivers.push(item));
    (regional?.regional_risks || []).forEach((item) => risks.push(item));

    scoreConfianca = Math.min(100, scoreConfianca);
    const scoreAlerta = risks.length > 3 ? 70 : risks.length > 1 ? 50 : 30;

    return {
      score_confianca: scoreConfianca,
      nivel_risco: scoreConfianca >= 70 ? 'BAIXO' : scoreConfianca >= 45 ? 'MEDIO' : 'ALTO',
      drivers,
      risks,
      score_alerta_ambiental: scoreAlerta,
      regional_summary: regional?.market_summary || null,
    };
  }

  static async _enrichRegionalWithGroq({ organizationId, carResult, conectaGov, ambiental, ibge, areaHa }) {
    const config = await this._getOrgAIConfig(organizationId);
    const groqKey = (config?.groq?.apiKey || process.env.GROQ_API_KEY || '').trim();
    if (!groqKey) return this._fallbackRegionalAnalysis(carResult, ibge);

    const prompt = `Analise a regiao rural para valuation de fazenda a partir destes dados publicos e cadastrais.
Responda somente JSON valido, sem markdown.
CAR/Regiao:
${JSON.stringify({
  uf: carResult.uf,
  municipio: carResult.municipio,
  areaHa,
  statusCar: carResult.status,
  centroid: carResult.centroid,
  incra: conectaGov.incra,
  sicarTemas: conectaGov.temas,
  ambiental,
  ibge,
}, null, 2)}

Formato:
{
  "market_summary": "resumo comercial da regiao em ate 260 caracteres",
  "soil": {"summary": "solo/aptidao provavel", "confidence": "alta|media|baixa", "evidence": ["..."]},
  "slope": {"summary": "relevo/declividade provavel", "confidence": "alta|media|baixa", "evidence": ["..."]},
  "hydrography": {"summary": "agua, drenagem e APP", "confidence": "alta|media|baixa", "evidence": ["..."]},
  "logistics": {"summary": "acessos e polos regionais", "confidence": "alta|media|baixa", "evidence": ["..."]},
  "regional_drivers": ["3 a 5 pontos positivos objetivos"],
  "regional_risks": ["3 a 5 riscos ou pendencias objetivas"]
}`;

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: config?.groq?.model || process.env.GROQ_RURAL_MODEL || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Voce e analista de valuation rural no Brasil. Seja objetivo, tecnico e conservador. Nao invente valores de mercado sem fonte.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.25,
          response_format: { type: 'json_object' },
        },
        { headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' }, timeout: 30000 }
      );
      const parsed = this._parseJson(response.data.choices?.[0]?.message?.content);
      return parsed ? { ...parsed, provider: 'groq' } : this._fallbackRegionalAnalysis(carResult, ibge);
    } catch (error) {
      console.warn('[FarmValuation] Groq regional indisponivel:', error.message);
      return this._fallbackRegionalAnalysis(carResult, ibge);
    }
  }

  static _buildTerrainLogistics({ carResult, conectaGov, ambiental, ibge, regional }) {
    const temas = conectaGov.temas || {};
    const topCrop = ibge?.producao_agricola?.produtos_principais?.[0];
    const municipality = [carResult.municipio, carResult.uf].filter(Boolean).join(' / ');

    return {
      soil: {
        status: 'available',
        source: regional?.provider === 'groq' ? 'Groq + IBGE/SICAR' : 'IBGE/SICAR',
        summary: regional?.soil?.summary || (topCrop ? `Aptidao regional inferida por producao municipal de ${topCrop.produto}.` : 'Aptidao de solo inferida por CAR, municipio e uso regional.'),
        confidence: regional?.soil?.confidence || (topCrop ? 'media' : 'baixa'),
        evidence: regional?.soil?.evidence || [topCrop ? `IBGE aponta ${topCrop.produto} como cultura relevante.` : 'Sem cultura municipal dominante disponivel.'],
      },
      slope: {
        status: 'available',
        source: 'Geometria CAR + Groq',
        summary: regional?.slope?.summary || 'Declividade estimada a partir da regiao e geometria CAR; confirmar com MDE em laudo tecnico.',
        confidence: regional?.slope?.confidence || 'baixa',
        evidence: regional?.slope?.evidence || ['Geometria CAR disponivel para cruzamento com modelo digital de elevacao.'],
      },
      hydrography: {
        status: 'available',
        source: 'SICAR Tema + Groq',
        summary: regional?.hydrography?.summary || (temas.app_ha ? `APP informada no SICAR Tema: ${Number(temas.app_ha).toFixed(2)} ha.` : 'Hidrografia/APP marcada para validacao por SICAR Tema e camadas ambientais.'),
        confidence: regional?.hydrography?.confidence || (temas.app_ha ? 'media' : 'baixa'),
        evidence: regional?.hydrography?.evidence || [temas.app_ha ? 'SICAR Tema retornou area de APP.' : 'Sem APP detalhada retornada pelo SICAR Tema.'],
      },
      logistics: {
        status: 'available',
        source: regional?.provider === 'groq' ? 'Groq regional' : 'Analise local',
        summary: regional?.logistics?.summary || `Analise logistica regional gerada para ${municipality || 'municipio informado no CAR'}.`,
        confidence: regional?.logistics?.confidence || 'media',
        evidence: regional?.logistics?.evidence || ['Municipio/UF do CAR usado como base regional.'],
      },
      market_summary: regional?.market_summary || null,
    };
  }

  static _buildSources({ carResult, conectaGov, ambiental, ibge, terrain, regional }) {
    const statusFor = (value, fallback = 'unavailable') => value ? 'available' : fallback;
    return {
      car: { status: 'available', label: 'CAR/SICAR', detail: `CAR ${carResult.codigo} consultado no SICAR.` },
      sigef: { status: statusFor(conectaGov.incra), label: 'SIGEF/INCRA', detail: conectaGov.incra ? 'Dados fundiarios/SNCR encontrados.' : 'Fonte consultada, sem retorno estruturado.' },
      documents: { status: 'checked', label: 'Documentos internos', detail: 'Documentos internos do imovel verificados no cadastro.' },
      mapbiomas: { status: statusFor(ambiental.mapbiomas, 'checked'), label: 'MapBiomas', detail: ambiental.mapbiomas?.fonte || 'Consulta MapBiomas executada com fallback quando token ausente.' },
      prodes: { status: statusFor(ambiental.prodes || ambiental.deter, 'checked'), label: 'PRODES/DETER', detail: 'Camadas TerraBrasilis/INPE consultadas por coordenada.' },
      soil: { status: terrain.soil?.status || 'checked', label: 'Solo', detail: terrain.soil?.summary || 'Analise regional de solo gerada.' },
      slope: { status: terrain.slope?.status || 'checked', label: 'Declividade', detail: terrain.slope?.summary || 'Analise regional de relevo gerada.' },
      hydrography: { status: terrain.hydrography?.status || 'checked', label: 'Hidrografia/APP', detail: terrain.hydrography?.summary || 'Hidrografia e APP analisadas.' },
      logistics: { status: terrain.logistics?.status || 'checked', label: 'Logistica e acesso', detail: terrain.logistics?.summary || 'Pesquisa regional de logistica gerada.' },
      ibge: { status: statusFor(ibge.producao_agricola || ibge.producao_pecuaria), label: 'IBGE/SIDRA', detail: 'Dados agropecuarios municipais.' },
      groq: { status: regional?.provider === 'groq' ? 'available' : 'checked', label: 'Groq Pesquisa Regional', detail: regional?.provider === 'groq' ? regional.market_summary : 'Groq nao configurado; usado fallback local.' },
    };
  }

  static async _getOrgAIConfig(organizationId) {
    if (!organizationId) return {};
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('site_settings')
      .select('integrations')
      .eq('organization_id', organizationId)
      .maybeSingle();
    return data?.integrations || {};
  }

  static _fallbackRegionalAnalysis(carResult, ibge) {
    const topCrop = ibge?.producao_agricola?.produtos_principais?.[0];
    const region = [carResult.municipio, carResult.uf].filter(Boolean).join(' / ');
    return {
      market_summary: topCrop
        ? `${region}: analise regional baseada no CAR e em producao municipal com destaque para ${topCrop.produto}.`
        : `${region || 'Regiao do CAR'}: analise regional baseada no CAR, camadas ambientais e cadastro interno.`,
      soil: { summary: topCrop ? `Aptidao inferida para culturas regionais como ${topCrop.produto}.` : 'Solo a validar com camada tecnica local.', confidence: topCrop ? 'media' : 'baixa', evidence: ['Fallback tecnico sem Groq configurado.'] },
      slope: { summary: 'Relevo a confirmar por MDE; geometria CAR disponivel para cruzamento.', confidence: 'baixa', evidence: ['Fallback tecnico sem Groq configurado.'] },
      hydrography: { summary: 'APP/hidrografia dependem de validacao por SICAR Tema e camadas ambientais.', confidence: 'baixa', evidence: ['Fallback tecnico sem Groq configurado.'] },
      logistics: { summary: `Logistica analisada por municipio/UF do CAR: ${region || '-'}.`, confidence: 'baixa', evidence: ['Fallback tecnico sem Groq configurado.'] },
      regional_drivers: [],
      regional_risks: ['Configurar GROQ_API_KEY para pesquisa regional mais rica.'],
      provider: 'fallback',
    };
  }

  static _parseJson(text) {
    try {
      const raw = String(text || '').trim();
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const candidate = fenced?.[1] || raw;
      const start = candidate.indexOf('{');
      const end = candidate.lastIndexOf('}');
      if (start === -1 || end === -1) return null;
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  static _normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  static _calcularBounds(geometry) {
    if (!geometry) return null;
    const coords = [];
    const collect = (value) => {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
        coords.push(value);
        return;
      }
      value.forEach(collect);
    };
    collect(geometry.coordinates);
    if (!coords.length) return null;
    const lngs = coords.map((item) => item[0]);
    const lats = coords.map((item) => item[1]);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
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
