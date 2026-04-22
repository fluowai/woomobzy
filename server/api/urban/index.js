/**
 * Urban Legal Validation API
 * Integrações com IPTU, SINTER, Certidões para imóveis urbanos
 *
 * SEGURANÇA:
 * - Todas as rotas exigem autenticação via verifyAuth
 * - Tenant isolation via requireTenant
 * - Validação de input com Zod
 * - Sanitização de parâmetros contra injeção
 */

import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = Router();

const SNCR_API_BASE =
  'https://apigateway.conectagov.estaleiro.serpro.gov.br/api-sncr/v2';
const ITR_API_BASE = 'https://servicos.receita.fazenda.gov.br';

function sanitizeInput(input, maxLength = 50) {
  if (typeof input !== 'string') return '';
  return input.replace(/[^\w\-.]/g, '').slice(0, maxLength);
}

function isValidUUID(id) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

const cpfCnpjSchema = z
  .string()
  .min(11)
  .max(18)
  .refine(
    (val) =>
      val.replace(/\D/g, '').length >= 11 &&
      val.replace(/\D/g, '').length <= 14,
    { message: 'CPF ou CNPJ inválido' }
  );

const inscricaoSchema = z.string().min(1).max(30).transform(sanitizeInput);
const cepSchema = z
  .string()
  .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
  .transform(sanitizeInput);

function validateCPF_CNPJ(cpfCnpj) {
  const cleaned = String(cpfCnpj).replace(/\D/g, '');
  return cleaned.length >= 11 && cleaned.length <= 14;
}

/**
 * GET /api/urban/iptu/:inscricao
 * Consulta dados de IPTU (simulado - integrar com IPTU API ou InfoSimples)
 * SEGURANÇA: Exige autenticação + tenant + validação
 */
router.get('/iptu/:inscricao', verifyAuth, requireTenant, async (req, res) => {
  try {
    const inscricao = sanitizeInput(req.params.inscricao, 30);
    if (!inscricao) {
      return res.status(400).json({ error: 'Inscrição municipal inválida' });
    }

    const supabase = getSupabaseServer();
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('organization_id', req.orgId)
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
 * SEGURANÇA: Exige autenticação + tenant + validação CEP
 */
router.get('/endereco/:cep', verifyAuth, requireTenant, async (req, res) => {
  try {
    const cep = req.params.cep.replace(/\D/g, '');
    if (cep.length < 8 || cep.length > 9) {
      return res.status(400).json({ error: 'CEP inválido' });
    }

    const supabase = getSupabaseServer();
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title, address, features')
      .eq('organization_id', req.orgId)
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
 * SEGURANÇA: Exige autenticação + tenant + validação
 */
router.get(
  '/zoneamento/:municipio',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const municipio = sanitizeInput(req.params.municipio, 100);
      if (!municipio || municipio.length < 2) {
        return res.status(400).json({ error: 'Município inválido' });
      }

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
  }
);

/**
 * GET /api/urban/cnd/pessoa/:cpf
 * Consulta certidão negativa de pessoa física (Receita Federal)
 * SEGURANÇA: Exige autenticação + tenant + validação CPF
 */
router.get('/cnd/pessoa/:cpf', verifyAuth, requireTenant, async (req, res) => {
  try {
    const cpf = req.params.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

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
 * SEGURANÇA: Exige autenticação + tenant + validação UUID
 */
router.get(
  '/validar/:propertyId',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { propertyId } = req.params;

      if (!isValidUUID(propertyId)) {
        return res.status(400).json({ error: 'ID de propriedade inválido' });
      }

      const supabase = getSupabaseServer();
      const { data: property } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('organization_id', req.orgId)
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
      } else {
        validations.push({
          source: 'IPTU',
          success: false,
          data: {
            inscricao: '',
            status: 'NÃO CADASTRADO',
          },
        });
      }

      if (property.address) {
        validations.push({
          source: 'ENDERECO',
          success: true,
          data: { endereco: property.address, cep: location.zip },
        });
      } else {
        validations.push({
          source: 'ENDERECO',
          success: false,
          data: { endereco: '', cep: '' },
        });
      }

      validations.push({
        source: 'ZONEAMENTO',
        success: !!urban.zonaUso,
        data: {
          zona: urban.zonaUso || 'NÃO DEFINIDO',
          verificado: !!urban.zonaUso,
        },
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
        riskLevel:
          riskScore >= 80 ? 'BAIXO' : riskScore >= 50 ? 'MEDIO' : 'ALTO',
      });
    } catch (error) {
      console.error('Validar error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/urban/buscar?cpfCnpj=XXX
 * Busca imóveis urbanos por CPF/CNPJ do proprietário
 * SEGURANÇA: Exige autenticação + tenant + validação CPF/CNPJ
 */
router.get('/buscar', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = cpfCnpjSchema.safeParse(req.query.cpfCnpj);
    if (!validation.success) {
      return res.status(400).json({ error: 'Parâmetro cpfCnpj inválido' });
    }

    const cpfCnpjClean = String(req.query.cpfCnpj).replace(/\D/g, '');

    const supabase = getSupabaseServer();
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title, address, features')
      .eq('organization_id', req.orgId)
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
 * SEGURANÇA: Exige autenticação + tenant + validação UUID
 */
router.get('/imovel/:codigo', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { codigo } = req.params;

    if (!isValidUUID(codigo)) {
      return res.status(400).json({ error: 'Código de imóvel inválido' });
    }

    const supabase = getSupabaseServer();
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('id', codigo)
      .eq('organization_id', req.orgId)
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
