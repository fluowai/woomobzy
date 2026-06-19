/**
 * Dashboard Routes - Resumo e KPIs
 * /api/locacao/dashboard
 */
import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = Router();

/**
 * GET /api/locacao/dashboard/resumo
 */
router.get('/resumo', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();

    const { data: leases } = await supabase
      .from('leases')
      .select('*')
      .eq('organization_id', req.orgId);

    if (!leases || leases.length === 0) {
      return res.json({
        success: true,
        data: {
          total: 0, ativos: 0, em_andamento: 0, encerrados: 0,
          receita_mensal: 0, receita_anual: 0,
          inadimplentes: 0, atrasados: 0, em_dia: 0,
          valor_inadimplencia: 0,
          vencendo_30_dias: 0, vencendo_90_dias: 0,
        },
      });
    }

    const ativos = leases.filter(l => l.status === 'active');
    const em_andamento = leases.filter(l => ['draft', 'cadastral_analysis', 'income_analysis', 'pending_signatures'].includes(l.status));
    const encerrados = leases.filter(l => ['terminated', 'expired', 'archived'].includes(l.status));
    const inadimplentes = leases.filter(l => l.payment_status === 'inadimplente');
    const atrasados = leases.filter(l => l.payment_status === 'atrasado');
    const emDia = leases.filter(l => l.payment_status === 'em_dia');

    const receitaMensal = ativos.reduce((sum, l) => sum + (l.monthly_rent || 0), 0);
    const valorInadimplencia = inadimplentes.reduce((sum, l) => sum + (l.monthly_rent || 0), 0);

    const now = new Date();
    const em30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const em90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const vencendo30 = ativos.filter(l => l.end_date && new Date(l.end_date) >= now && new Date(l.end_date) <= em30Days);
    const vencendo90 = ativos.filter(l => l.end_date && new Date(l.end_date) > em30Days && new Date(l.end_date) <= em90Days);

    res.json({
      success: true,
      data: {
        total: leases.length,
        ativos: ativos.length,
        em_andamento: em_andamento.length,
        encerrados: encerrados.length,
        receita_mensal: receitaMensal,
        receita_anual: receitaMensal * 12,
        inadimplentes: inadimplentes.length,
        atrasados: atrasados.length,
        em_dia: emDia.length,
        valor_inadimplencia: valorInadimplencia,
        vencendo_30_dias: vencendo30.length,
        vencendo_90_dias: vencendo90.length,
      },
    });
  } catch (error) {
    console.error('[DashboardRoutes] Resumo error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locacao/dashboard/timeline
 * Próximos eventos (vencimentos, reajustes, fim de contrato)
 */
router.get('/timeline', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();

    const { data: leases } = await supabase
      .from('leases')
      .select('id, contract_number, tenant_name, monthly_rent, due_day, end_date, next_rent_adjustment, status')
      .eq('organization_id', req.orgId)
      .in('status', ['active'])
      .order('end_date', { ascending: true });

    if (!leases) return res.json({ success: true, data: [] });

    const now = new Date();
    const events = [];

    for (const lease of leases) {
      // Vencimento de aluguel (próximo)
      if (lease.due_day) {
        const nextDue = new Date(now.getFullYear(), now.getMonth(), lease.due_day);
        if (nextDue < now) nextDue.setMonth(nextDue.getMonth() + 1);
        events.push({
          type: 'due',
          label: 'Vencimento aluguel',
          description: `${lease.tenant_name} - R$ ${(lease.monthly_rent || 0).toLocaleString('pt-BR')}`,
          date: nextDue.toISOString().split('T')[0],
          lease_id: lease.id,
          days_until: Math.ceil((nextDue - now) / (1000 * 60 * 60 * 24)),
        });
      }

      // Reajuste
      if (lease.next_rent_adjustment) {
        const adjDate = new Date(lease.next_rent_adjustment);
        events.push({
          type: 'adjustment',
          label: 'Reajuste programado',
          description: lease.tenant_name,
          date: adjDate.toISOString().split('T')[0],
          lease_id: lease.id,
          days_until: Math.ceil((adjDate - now) / (1000 * 60 * 60 * 24)),
        });
      }

      // Fim de contrato
      if (lease.end_date) {
        const endDate = new Date(lease.end_date);
        events.push({
          type: 'end',
          label: 'Fim de contrato',
          description: lease.tenant_name,
          date: endDate.toISOString().split('T')[0],
          lease_id: lease.id,
          days_until: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)),
        });
      }
    }

    events.sort((a, b) => a.days_until - b.days_until);

    res.json({ success: true, data: events.slice(0, 20) });
  } catch (error) {
    console.error('[DashboardRoutes] Timeline error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
