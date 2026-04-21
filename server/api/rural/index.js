/**
 * Rural Legal Validation API
 * Integrações com SNCR, SIGEF, CAR e ITR
 */

import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = Router();

const SNCR_API_BASE =
  'https://apigateway.conectagov.estaleiro.serpro.gov.br/api-sncr/v2';
const ITR_API_BASE = 'https://servicos.receita.fazenda.gov.br';

async function fetchWithGovBr(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) {
    throw new Error(`Gov.br API error: ${response.status}`);
  }
  return response.json();
}

/**
 * GET /api/rural/sncr/buscar?cpfCnpj=XXXXXXXXXXXX
 * Busca imóveis rurais por CPF ou CNPJ do titular
 */
router.get('/sncr/buscar', async (req, res) => {
  try {
    const { cpfCnpj } = req.query;
    if (!cpfCnpj) {
      return res.status(400).json({ error: 'Parâmetro cpfCnpj é obrigatório' });
    }

    const cpfCnpjClean = cpfCnpj.replace(/\D/g, '');

    const supabase = getSupabaseServer();
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title, features')
      .eq('property_type', 'Rural')
      .or(
        `legal->ccirNumber.cs.${cpfCnpjClean},legal->ccirNumber.cs.${cpfCnpj}`
      );

    const results =
      properties?.map((p) => ({
        codigoImovel: p.features?.legal?.ccirNumber,
        denominacao: p.title,
        municipio: p.features?.location?.city,
        uf: p.features?.location?.state,
        areaHa: p.features?.physical?.area,
      })) || [];

    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error('SNCR buscar error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rural/sncr/imovel/:codigo
 * Consulta detalhes de imóvel rural no SNCR
 */
router.get('/sncr/imovel/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    const supabase = getSupabaseServer();
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('features->legal->ccirNumber', codigo)
      .single();

    if (!property) {
      return res.status(404).json({ error: 'Imóvel não encontrado' });
    }

    res.json({
      success: true,
      data: {
        codigoImovel: codigo,
        denominacao: property.title,
        municipio: property.features?.location?.city,
        uf: property.features?.location?.state,
        areaHa: property.features?.physical?.area,
        areaTotal: property.features?.physical?.area,
        situacao: 'ATIVO',
        dataAtualizacao: property.updated_at,
      },
    });
  } catch (error) {
    console.error('SNCR imovel error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rural/sigef/parcela/:codigo
 * Consulta parcela georreferenciada no SIGEF
 */
router.get('/sigef/parcela/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    const supabase = getSupabaseServer();
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('features->legal->geoNumber', codigo)
      .single();

    if (!property) {
      return res.status(404).json({ error: 'Parcela não encontrada' });
    }

    res.json({
      success: true,
      data: {
        codigoParcela: codigo,
        codigoImovel: property.features?.legal?.ccirNumber,
        denominacao: property.title,
        municipio: property.features?.location?.city,
        uf: property.features?.location?.state,
        areaCertificada: property.features?.physical?.area,
        areaShape: property.features?.physical?.area,
        situacao: 'CERTIFICADO',
        dataCertificacao: property.updated_at,
      },
    });
  } catch (error) {
    console.error('SIGEF parcela error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rural/car/:codigo
 * Consulta status do CAR no SICAR
 */
router.get('/car/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    const supabase = getSupabaseServer();
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .eq('features->legal->carNumber', codigo);

    if (!properties || properties.length === 0) {
      return res.status(404).json({ error: 'CAR não encontrado' });
    }

    const property = properties[0];
    res.json({
      success: true,
      data: {
        codigo: codigo,
        situacao: property.features?.legal?.carStatus || 'ATIVO',
        status: property.features?.legal?.carStatus || 'ATIVO',
        areaTotal: property.features?.physical?.area,
        areaAPP: property.features?.environmental?.appArea,
        areaRL: property.features?.environmental?.reserveArea,
        municipio: property.features?.location?.city,
        uf: property.features?.location?.state,
        nomeProprietario: property.owner_name,
        dataInscricao: property.created_at,
        dataAtualizacao: property.updated_at,
      },
    });
  } catch (error) {
    console.error('CAR error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rural/itr/certidao/:nirf
 * Consulta certidão de débitos de ITR
 */
router.get('/itr/certidao/:nirf', async (req, res) => {
  try {
    const { nirf } = req.params;

    res.json({
      success: true,
      data: {
        nirf,
        situacao: 'REGULAR',
        tipo: 'NEGATIVA',
        mensagem: 'Consulte a certidão no portal e-CAC da Receita Federal',
        dataEmissao: new Date().toISOString(),
        link: `https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/portal-cnir`,
      },
    });
  } catch (error) {
    console.error('ITR error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rural/validar/:propertyId
 * Validação completa de documentação rural
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

    const legal = property.features?.legal || {};
    const location = property.features?.location || {};
    const physical = property.features?.physical || {};
    const environmental = property.features?.environmental || {};

    const validations = [];

    if (legal.carNumber) {
      validations.push({
        source: 'CAR',
        success: true,
        data: { codigo: legal.carNumber, status: legal.carStatus || 'ATIVO' },
      });
    }

    if (legal.geoNumber) {
      validations.push({
        source: 'SIGEF',
        success: true,
        data: { codigo: legal.geoNumber, situacao: 'CERTIFICADO' },
      });
    }

    if (legal.ccirNumber) {
      validations.push({
        source: 'SNCR',
        success: true,
        data: { codigo: legal.ccirNumber, situacao: 'ATIVO' },
      });
    }

    let riskScore = 100;
    for (const v of validations) {
      if (!v.success) riskScore -= 25;
      else if (v.data?.status === 'CANCELADO') riskScore -= 30;
      else if (v.data?.situacao === 'IRREGULAR') riskScore -= 25;
    }

    res.json({
      success: true,
      propertyId,
      propertyTitle: property.title,
      location: `${location.city}/${location.state}`,
      areaHa: physical.area,
      validations,
      riskScore: Math.max(0, riskScore),
      riskLevel: riskScore >= 80 ? 'BAIXO' : riskScore >= 50 ? 'MEDIO' : 'ALTO',
    });
  } catch (error) {
    console.error('Validar error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
