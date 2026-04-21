/**
 * Cobranças API - Gestão de Boletos e Cobranças
 * Geração, envio e controle de inadimplência
 */

import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = Router();

/**
 * GET /api/cobranca
 * Lista cobranças/boletos
 */
router.get('/', async (req, res) => {
  try {
    const { status, contract_id, mes, ano } = req.query;

    const supabase = getSupabaseServer();
    let query = supabase
      .from('billing')
      .select(
        `
      *,
      contract:rental_contracts(tenant_name, monthly_rent, property:property_id(title, address))
    `
      )
      .order('due_date', { ascending: false });

    if (status) query = query.eq('status', status);
    if (contract_id) query = query.eq('contract_id', contract_id);
    if (mes && ano) {
      const startDate = `${ano}-${mes.padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(ano), parseInt(mes), 0)
        .toISOString()
        .split('T')[0];
      query = query.gte('due_date', startDate).lte('due_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [], count: data?.length || 0 });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cobranca
 * Cria cobrança/boleto
 */
router.post('/', async (req, res) => {
  try {
    const { contract_id, amount, due_date, description, tipo_cobranca } =
      req.body;

    if (!contract_id || !amount || !due_date) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    const supabase = getSupabaseServer();

    const { data: contract } = await supabase
      .from('rental_contracts')
      .select('organization_id, tenant_name')
      .eq('id', contract_id)
      .single();

    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    const { data: billingData, error } = await supabase
      .from('billing')
      .insert({
        organization_id: contract.organization_id,
        contract_id,
        amount,
        due_date,
        description: description || `Aluguel ${due_date}`,
        status: 'aberto',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: billingData });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cobranca/gerar-mensal
 * Gera cobranças mensais para todos os contratos ativos
 */
router.post('/gerar-mensal', async (req, res) => {
  try {
    const { mes, ano, tipo } = req.body;

    const supabase = getSupabaseServer();

    const { data: contracts } = await supabase
      .from('rental_contracts')
      .select('*, property:property_id(title, address)')
      .eq('status', 'active')
      .eq('payment_status', 'em_dia');

    if (!contracts || contracts.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhum contrato ativo para gerar',
        created: 0,
      });
    }

    const dueDate = `${ano}-${mes.padStart(2, '0')}-05`;
    const created = [];

    for (const contract of contracts) {
      const existing = await supabase
        .from('billing')
        .select('id')
        .eq('contract_id', contract.id)
        .eq('due_date', dueDate)
        .single();

      if (!existing.data) {
        const { data: billing } = await supabase
          .from('billing')
          .insert({
            organization_id: contract.organization_id,
            contract_id: contract.id,
            amount: contract.monthly_rent,
            due_date: dueDate,
            description: `${tipo || 'Aluguel'} ${dueDate}`,
            status: 'aberto',
          })
          .select()
          .single();

        if (billing) created.push(billing);
      }
    }

    res.json({ success: true, created: created.length, data: created });
  } catch (error) {
    console.error('Gerar mensal error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/cobranca/:id/pagar
 * Registra pagamento do boleto
 */
router.put('/:id/pagar', async (req, res) => {
  try {
    const { id } = req.params;
    const { data_pagamento, valor_pago, observacoes } = req.body;

    const supabase = getSupabaseServer();

    const { data: billing, error: billingError } = await supabase
      .from('billing')
      .update({
        status: 'pago',
        payment_date: data_pagamento || new Date().toISOString().split('T')[0],
        observation: observacoes,
      })
      .eq('id', id)
      .select()
      .single();

    if (billingError) throw billingError;

    if (billing?.contract_id) {
      await supabase
        .from('rental_contracts')
        .update({
          payment_status: 'em_dia',
          updated_at: new Date().toISOString(),
        })
        .eq('id', billing.contract_id);

      await supabase.from('payment_history').insert({
        contract_id: billing.contract_id,
        payment_date: data_pagamento || new Date().toISOString().split('T')[0],
        amount_paid: valor_pago || billing.amount,
        status: 'pago',
      });
    }

    res.json({ success: true, data: billing });
  } catch (error) {
    console.error('Pagar error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/cobranca/:id/cancelar
 * Cancela boleto
 */
router.put('/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('billing')
      .update({ status: 'cancelado', observation: motivo })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Cancelar error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cobranca/dashboard/financeiro
 * Dashboard financeiro completo
 */
router.get('/dashboard/financeiro', async (req, res) => {
  try {
    const { ano } = req.query;
    const currentYear = ano || new Date().getFullYear();

    const supabase = getSupabaseServer();

    const { data: billings } = await supabase.from('billing').select('*');

    const { data: contracts } = await supabase
      .from('rental_contracts')
      .select('*');

    if (!billings) {
      return res.json({
        success: true,
        data: { receita: [], inadimplencia: [], totais: {} },
      });
    }

    const months = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    const receitaMensal = [];
    const inadimplenciaMensal = [];

    for (let i = 0; i < 12; i++) {
      const monthStr = (i + 1).toString().padStart(2, '0');
      const startDate = `${currentYear}-${monthStr}-01`;
      const endDate = new Date(parseInt(currentYear), i + 1, 0)
        .toISOString()
        .split('T')[0];

      const mesReceita = billings
        .filter(
          (b) =>
            b.status === 'pago' &&
            b.due_date >= startDate &&
            b.due_date <= endDate
        )
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      const mesInad = billings
        .filter(
          (b) =>
            b.status === 'vencido' &&
            new Date(b.due_date) < new Date() &&
            b.due_date >= startDate &&
            b.due_date <= endDate
        )
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      receitaMensal.push({ mes: months[i], valor: mesReceita });
      inadimplenciaMensal.push({ mes: months[i], valor: mesInad });
    }

    const ativos = contracts?.filter((c) => c.status === 'active') || [];
    const receitaMensalAtivos = ativos.reduce(
      (sum, c) => sum + (c.monthly_rent || 0),
      0
    );
    const inadimplentes =
      contracts?.filter((c) => c.payment_status === 'inadimplente') || [];
    const valorInadimplencia = inadimplentes.reduce(
      (sum, c) => sum + (c.monthly_rent || 0),
      0
    );

    const totalRecebido = billings
      .filter((b) => b.status === 'pago')
      .reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalVencido = billings
      .filter((b) => b.status === 'vencido')
      .reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalAberto = billings
      .filter((b) => b.status === 'aberto')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    res.json({
      success: true,
      data: {
        receita: receitaMensal,
        inadimplencia: inadimplenciaMensal,
        totais: {
          contratos_ativos: ativos.length,
          receita_mensal_projetada: receitaMensalAtivos,
          inadimplentes: inadimplentes.length,
          valor_inadimplencia: valorInadimplencia,
          total_recebido_ano: totalRecebido,
          total_vencido: totalVencido,
          total_aberto: totalAberto,
          taxa_inadimplencia:
            ativos.length > 0
              ? ((inadimplentes.length / ativos.length) * 100).toFixed(1)
              : 0,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cobranca/exportar/:formato
 * Exporta dados para contabilidade
 */
router.get('/exportar/:formato', async (req, res) => {
  try {
    const { formato } = req.params;
    const { ano, mes } = req.query;

    const supabase = getSupabaseServer();

    let query = supabase
      .from('billing')
      .select(
        `
      *,
      contract:rental_contracts(tenant_name, tenant_cpf)
    `
      )
      .order('due_date', { ascending: true });

    if (ano && mes) {
      const startDate = `${ano}-${mes.padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(ano), parseInt(mes), 0)
        .toISOString()
        .split('T')[0];
      query = query.gte('due_date', startDate).lte('due_date', endDate);
    } else if (ano) {
      query = query
        .gte('due_date', `${ano}-01-01`)
        .lte('due_date', `${ano}-12-31`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (formato === 'csv') {
      const csvHeader =
        'Data Vencimento,Data Pagamento,Locatário,CPF,Valor,Status\n';
      const csvRows = (data || [])
        .map(
          (b) =>
            `${b.due_date},${b.payment_date || ''},${b.contract?.tenant_name || ''},${b.contract?.tenant_cpf || ''},${b.amount},${b.status}`
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=cobrancas.csv'
      );
      return res.send(csvHeader + csvRows);
    }

    if (formato === 'xml') {
      const xml =
        '<?xml version="1.0" encoding="UTF-8"?>\n<cobrancas>\n' +
        (data || [])
          .map(
            (b) => `  <cobranca>
    <id>${b.id}</id>
    <vencimento>${b.due_date}</vencimento>
    <pagamento>${b.payment_date || ''}</pagamento>
    <locatario>${b.contract?.tenant_name || ''}</locatario>
    <cpf>${b.contract?.tenant_cpf || ''}</cpf>
    <valor>${b.amount}</valor>
    <status>${b.status}</status>
  </cobranca>`
          )
          .join('\n') +
        '\n</cobrancas>';

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=cobrancas.xml'
      );
      return res.send(xml);
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Exportar error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cobranca/relatorio/inadimplencia
 * Relatório de inadimplência detallado
 */
router.get('/relatorio/inadimplencia', async (req, res) => {
  try {
    const supabase = getSupabaseServer();

    const { data: contracts } = await supabase
      .from('rental_contracts')
      .select(
        `
        *,
        property:property_id(title, address),
        billing:billings()
      `
      )
      .eq('payment_status', 'inadimplente');

    const inadimplentes = (contracts || [])
      .map((c) => {
        const totalDebito = (c.billings || [])
          .filter((b) => b.status !== 'pago')
          .reduce((sum, b) => sum + (b.amount || 0), 0);

        const diasVencido = Math.max(
          0,
          Math.ceil(
            (new Date().getTime() -
              new Date(c.billings?.[0]?.due_date || c.updated_at).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );

        return {
          ...c,
          total_debito: totalDebito,
          dias_vencido: diasVencido,
          nivel:
            diasVencido > 90 ? 'CRITICO' : diasVencido > 60 ? 'ALTO' : 'MEDIO',
        };
      })
      .sort((a, b) => b.total_debito - a.total_debito);

    res.json({
      success: true,
      data: inadimplentes,
      summary: {
        total_inadimplentes: inadimplentes.length,
        valor_total_debito: inadimplentes.reduce(
          (sum, c) => sum + c.total_debito,
          0
        ),
        media_por_contrato:
          inadimplentes.length > 0
            ? inadimplentes.reduce((sum, c) => sum + c.total_debito, 0) /
              inadimplentes.length
            : 0,
      },
    });
  } catch (error) {
    console.error('Relatório error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
