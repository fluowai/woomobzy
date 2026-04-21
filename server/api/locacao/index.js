/**
 * Locação API - Gestão de Aluguéis, Contratos e Cobranças
 * Operações completas para imobiliárias tradicionais
 */

import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = Router();

/**
 * GET /api/locacao
 * Lista todos os contratos de locação
 */
router.get('/', async (req, res) => {
  try {
    const { status, payment_status, property_id } = req.query;

    const supabase = getSupabaseServer();
    let query = supabase
      .from('rental_contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (payment_status) query = query.eq('payment_status', payment_status);
    if (property_id) query = query.eq('property_id', property_id);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [], count: data?.length || 0 });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao
 * Cria novo contrato de locação
 */
router.post('/', async (req, res) => {
  try {
    const {
      property_id,
      tenant_name,
      tenant_email,
      tenant_phone,
      tenant_cpf,
      tenant_rg,
      start_date,
      end_date,
      monthly_rent,
      adjustment_index,
      guarantee_type,
      guarantee_document,
      observation,
    } = req.body;

    if (!tenant_name || !start_date || !end_date) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    const supabase = getSupabaseServer();

    // Get organization from tenant context or auth
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('rental_contracts')
      .insert({
        organization_id: profile?.organization_id,
        property_id,
        tenant_name,
        tenant_email,
        tenant_phone,
        tenant_cpf,
        tenant_rg,
        start_date,
        end_date,
        monthly_rent: monthly_rent || 0,
        adjustment_index: adjustment_index || 'IGPM',
        guarantee_type,
        guarantee_document,
        observation,
        payment_status: 'em_dia',
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locacao/:id
 * Detalhes de um contrato
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rental_contracts')
      .select(
        `
        *,
        property:property_id(title, address, features)
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data)
      return res.status(404).json({ error: 'Contrato não encontrado' });

    // Calcula informações do contrato
    const now = new Date();
    const endDate = new Date(data.end_date);
    const startDate = new Date(data.start_date);

    const diasRestantes = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    const mesesRestantes = Math.ceil(diasRestantes / 30);

    const mesesTotais = Math.ceil(
      (endDate - startDate) / (1000 * 60 * 60 * 24 * 30)
    );
    const mesesDecoridos = Math.ceil(
      (now - startDate) / (1000 * 60 * 60 * 24 * 30)
    );

    res.json({
      success: true,
      data: {
        ...data,
        dias_restantes: Math.max(0, diasRestantes),
        meses_restantes: Math.max(0, mesesRestantes),
        meses_totais: mesesTotais,
        meses_decoridos: Math.max(0, mesesDecoridos),
        vigencia: `${mesesTotais} meses`,
      },
    });
  } catch (error) {
    console.error('Get error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/locacao/:id
 * Atualiza contrato
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tenant_name,
      tenant_email,
      tenant_phone,
      start_date,
      end_date,
      monthly_rent,
      adjustment_index,
      payment_status,
      status,
      guarantee_type,
      observation,
    } = req.body;

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rental_contracts')
      .update({
        tenant_name,
        tenant_email,
        tenant_phone,
        start_date,
        end_date,
        monthly_rent,
        adjustment_index,
        payment_status,
        status,
        guarantee_type,
        observation,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/locacao/:id
 * Remove contrato
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('rental_contracts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locacao/dashboard/resumo
 * Dashboard de resumo de locações
 */
router.get('/dashboard/resumo', async (req, res) => {
  try {
    const supabase = getSupabaseServer();

    const { data: contracts } = await supabase
      .from('rental_contracts')
      .select('*');

    if (!contracts) {
      return res.json({
        success: true,
        data: {
          total_contratos: 0,
          ativos: 0,
          encerrados: 0,
          receita_mensal: 0,
          receita_anual: 0,
          inadimplentes: 0,
          atrasados: 0,
          em_dia: 0,
          valor_inadimplencia: 0,
          contratos_vencendo_30_dias: 0,
          contratos_vencendo_90_dias: 0,
        },
      });
    }

    const ativos = contracts.filter((c) => c.status === 'active');
    const inadimplentes = contracts.filter(
      (c) => c.payment_status === 'inadimplente'
    );
    const atrasados = contracts.filter((c) => c.payment_status === 'atrasado');
    const emDia = contracts.filter((c) => c.payment_status === 'em_dia');

    const receitaMensal = ativos.reduce(
      (sum, c) => sum + (c.monthly_rent || 0),
      0
    );
    const receitaAnual = receitaMensal * 12;
    const valorInadimplencia = inadimplentes.reduce(
      (sum, c) => sum + (c.monthly_rent || 0),
      0
    );

    const now = new Date();
    const em30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const em90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const vencendo30 = ativos.filter((c) => {
      const end = new Date(c.end_date);
      return end >= now && end <= em30Days;
    });

    const vencendo90 = ativos.filter((c) => {
      const end = new Date(c.end_date);
      return end > em30Days && end <= em90Days;
    });

    res.json({
      success: true,
      data: {
        total_contratos: contracts.length,
        ativos: ativos.length,
        encerrados: contracts.filter(
          (c) => c.status === 'expired' || c.status === 'terminated'
        ).length,
        receita_mensal: receitaMensal,
        receita_anual: receitaAnual,
        inadimplentes: inadimplentes.length,
        atrasados: atrasados.length,
        em_dia: emDia.length,
        valor_inadimplencia: valorInadimplencia,
        contratos_vencendo_30_dias: vencendo30.length,
        contratos_vencendo_90_dias: vencendo90.length,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locacao/calculo/reajuste/:id
 * Calcula valor do reajustee based on index
 */
router.get('/calculo/reajuste/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { novo_indice } = req.query;

    const supabase = getSupabaseServer();
    const { data: contract } = await supabase
      .from('rental_contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    // Taxas de correção simuladas (em produção, buscar da API do Banco Central)
    const indices = {
      IGPM: 0.0465, // 4,65% acumulado 12 meses
      IPCA: 0.0412, // 4,12%
      INCC: 0.0578, // 5,78%
      ICV: 0.0432, // 4,32%
      POUPANCA: 0.035, // 3,5%
    };

    const taxa = indices[novo_indice || contract.adjustment_index] || 0;
    const valorAtual = contract.monthly_rent || 0;
    const valorReajustado = valorAtual * (1 + taxa);

    const novoIndice = novo_indice || contract.adjustment_index;
    const nomeIndice =
      {
        IGPM: 'Índice Geral de Preços do Mercado',
        IPCA: 'Índice de Preços ao Consumidor Amplo',
        INCC: 'Índice Nacional de Custo de Construção',
        ICV: 'Índice de Custo de Vida',
        POUPANCA: 'Poupança',
      }[novoIndice] || novoIndice;

    res.json({
      success: true,
      data: {
        contrato_id: id,
        valor_atual: valorAtual,
        indice_aplicado: novoIndice,
        nome_indice: nomeIndice,
        taxa_percentual: (taxa * 100).toFixed(2),
        valor_reajustado: Math.round(valorReajustado * 100) / 100,
        diferenca_mensal:
          Math.round((valorReajustado - valorAtual) * 100) / 100,
        diferenca_anual:
          Math.round((valorReajustado - valorAtual) * 12 * 100) / 100,
        data_proximo_reajuste: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      },
    });
  } catch (error) {
    console.error('Reajuste error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/:id/renovar
 * Renova contrato com rejustee
 */
router.post('/:id/renovar', async (req, res) => {
  try {
    const { id } = req.params;
    const { nova_data_fim, novo_aluguel, novo_indice } = req.body;

    const supabase = getSupabaseServer();
    const { data: contract } = await supabase
      .from('rental_contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    // Calcula rejustee se não informado
    const indices = {
      IGPM: 0.0465,
      IPCA: 0.0412,
      INCC: 0.0578,
    };
    const taxa = indices[novo_indice || contract.adjustment_index] || 0;
    const valorAtual = contract.monthly_rent || 0;
    const novoValor = novo_aluguel || valorAtual * (1 + taxa);

    // Cria renovação
    const { data, error } = await supabase
      .from('contract_renewals')
      .insert({
        contract_id: id,
        organization_id: contract.organization_id,
        old_end_date: contract.end_date,
        new_start_date: contract.end_date,
        new_end_date: nova_data_fim,
        old_rent: valorAtual,
        new_rent: novoValor,
        adjustment_index: novo_indice || contract.adjustment_index,
      })
      .select()
      .single();

    if (error) throw error;

    // Atualiza contrato
    await supabase
      .from('rental_contracts')
      .update({
        start_date: contract.end_date,
        end_date: nova_data_fim,
        monthly_rent: novoValor,
        adjustment_index: novo_indice || contract.adjustment_index,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    res.json({
      success: true,
      data: { renewal: data, novo_aluguel: novoValor },
    });
  } catch (error) {
    console.error('Renovar error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/locacao/:id/pagamento
 * Registra pagamento
 */
router.put('/:id/pagamento', async (req, res) => {
  try {
    const { id } = req.params;
    const { data_pagamento, valor_pago, status } = req.body;

    const supabase = getSupabaseServer();

    // Atualiza status do pagamento
    const { data, error } = await supabase
      .from('rental_contracts')
      .update({
        payment_status: status || 'em_dia',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Registra histórico de pagamento
    await supabase.from('payment_history').insert({
      contract_id: id,
      payment_date: data_pagamento,
      amount_paid: valor_pago,
      status: status || 'pago',
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Pagamento error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
