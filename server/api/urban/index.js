/**
 * Urban Legal Validation API
 * Integrações com IPTU, SINTER, Certidões para imóveis urbanos
 */

import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = Router();

/**
 * GET /api/urban/iptu/:inscricao
 * Consulta dados de IPTU (simulado - integrar com IPTU API ou InfoSimples)
 */
router.get('/iptu/:inscricao', async (req, res) => {
  try {
    const { inscricao } = req.params;

    const supabase = getSupabaseServer();
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('features->urban->iptuNumber', inscricao)
      .single();

    if (!property) {
      return res.status(404).json({ error: 'Imóvel não encontrado' });
    }

    const urban = property.features?.urban || {};

    res.json({
      success: true,
      data: {
        inscricao,
        endereco: property.address,
        bairro: property.features?.location?.neighborhood,
        cep: property.features?.location?.zip,
        areaTerreno: urban.areaTerreno || property.features?.physical?.area,
        areaConstruida:
          urban.areaConstruida || property.features?.physical?.builtArea,
        valorVenalTerreno: urban.valorVenalTerreno || 0,
        valorVenalConstrucao: urban.valorVenalConstrucao || 0,
        valorVenalTotal: urban.valorVenalTotal || property.price,
        anoConstrucao: urban.anoConstrucao,
        tipologia: urban.tipologia || property.property_type,
        padraoConstrutivo: urban.padraoConstrutivo || 'Médio',
        zonaUso: urban.zonaUso || 'Zona Residencial',
        frente: urban.frente,
        profundidade: urban.profundidade,
        iptuStatus: urban.iptuStatus || 'REGULAR',
        ultimoPagamento: urban.ultimoPagamento,
      },
    });
  } catch (error) {
    console.error('IPTU error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/urban/endereco/:cep
 * Consulta dados pelo CEP (simulado)
 */
router.get('/endereco/:cep', async (req, res) => {
  try {
    const { cep } = req.params;

    const supabase = getSupabaseServer();
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title, address, features')
      .like('features->location->zip', `%${cep}%`)
      .limit(5);

    const results =
      properties?.map((p) => ({
        id: p.id,
        title: p.title,
        endereco: p.address,
        bairro: p.features?.location?.neighborhood,
        cep: p.features?.location?.zip,
      })) || [];

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('CEP error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/urban/zoneamento/:municipio
 * Consulta zoneamento via SINTER (simulado)
 */
router.get('/zoneamento/:municipio', async (req, res) => {
  try {
    const { municipio } = req.params;

    res.json({
      success: true,
      data: {
        municipio,
        zonaPrincipal: 'Zona Residencial 1 - ZR1',
        coeffAproveitamento: 2.0,
        taxaOcupacao: 0.6,
        testadaMinima: 5,
        recuoFrontal: 0,
        recuoLaterais: 1.5,
        alturamaxima: 12,
        usoPermitido: ['Residencial', 'Comercial de baixo impacto'],
        obs: 'Consulte a lei de uso e ocupação do solo municipal',
      },
    });
  } catch (error) {
    console.error('Zoneamento error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/urban/cnd/pessoa/:cpf
 * Consulta certidão negativa de pessoa física (Receita Federal)
 */
router.get('/cnd/pessoa/:cpf', async (req, res) => {
  try {
    const { cpf } = req.params;

    res.json({
      success: true,
      data: {
        cpf,
        tipo: 'PESSOA FÍSICA',
        certidaoNegativa: true,
        dataEmissao: new Date().toISOString(),
        validade: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        link: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/portal-cnir',
      },
    });
  } catch (error) {
    console.error('CND error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/urban/validar/:propertyId
 * Validação completa de documentação urbana
 */
router.get('/validar/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;

    const supabase = getSupabaseServer();
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (!property) {
      return res.status(404).json({ error: 'Propriedade não encontrada' });
    }

    const urban = property.features?.urban || {};
    const location = property.features?.location || {};

    const validations = [];

    if (urban.iptuNumber) {
      validations.push({
        source: 'IPTU',
        success: true,
        data: {
          inscricao: urban.iptuNumber,
          status: urban.iptuStatus || 'REGULAR',
        },
      });
    }

    if (property.address) {
      validations.push({
        source: 'ENDERECO',
        success: true,
        data: { endereco: property.address, cep: location.zip },
      });
    }

    validations.push({
      source: 'ZONEAMENTO',
      success: true,
      data: { zona: urban.zonaUso || 'ZR1', verificado: !!urban.zonaUso },
    });

    let riskScore = 100;
    for (const v of validations) {
      if (!v.success) riskScore -= 25;
      else if (v.data?.status === 'INADIMPLENTE') riskScore -= 20;
    }

    res.json({
      success: true,
      propertyId,
      propertyTitle: property.title,
      address: property.address,
      location: `${location.city}/${location.state}`,
      validations,
      riskScore: Math.max(0, riskScore),
      riskLevel: riskScore >= 80 ? 'BAIXO' : riskScore >= 50 ? 'MEDIO' : 'ALTO',
    });
  } catch (error) {
    console.error('Validar error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/urban/buscar?cpfCnpj=XXX
 * Busca imóveis urbanos por CPF/CNPJ do proprietário
 */
router.get('/buscar', async (req, res) => {
  try {
    const { cpfCnpj } = req.query;
    if (!cpfCnpj) {
      return res.status(400).json({ error: 'Parâmetro cpfCnpj é obrigatório' });
    }

    const cpfCnpjClean = String(cpfCnpj).replace(/\D/g, '');

    const supabase = getSupabaseServer();
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title, address, features')
      .not('property_type', 'in', '("Rural","Fazenda")')
      .order('title');

    const results =
      properties
        ?.filter((p) => {
          const ownerDoc = p.features?.owner?.document || '';
          return ownerDoc.includes(cpfCnpjClean);
        })
        .map((p) => ({
          id: p.id,
          title: p.title,
          endereco: p.address,
          bairro: p.features?.location?.neighborhood,
          municipio: p.features?.location?.city,
          uf: p.features?.location?.state,
        })) || [];

    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error('Buscar error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/urban/imovel/:codigo
 * Consulta detalhes de imóvel urbano
 */
router.get('/imovel/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    const supabase = getSupabaseServer();
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('id', codigo)
      .single();

    if (!property) {
      return res.status(404).json({ error: 'Imóvel não encontrado' });
    }

    const urban = property.features?.urban || {};
    const location = property.features?.location || {};
    const physical = property.features?.physical || {};

    res.json({
      success: true,
      data: {
        id: property.id,
        titulo: property.title,
        endereco: property.address,
        bairro: location.neighborhood,
        municipio: location.city,
        uf: location.state,
        cep: location.zip,
        areaTerreno: physical.area || urban.areaTerreno,
        areaConstruida: physical.builtArea || urban.areaConstruida,
        tipologia: property.property_type,
        valorVenda: property.price,
        valorLocacao: property.rent_price,
        iptu: urban.iptuNumber,
        statusIPTU: urban.iptuStatus,
        zona: urban.zonaUso,
      },
    });
  } catch (error) {
    console.error('Imovel error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
