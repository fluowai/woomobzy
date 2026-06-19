import { getSupabaseServer } from '../lib/supabase-server.js';
import { sendContactFormEmail } from './emailService.js';

const DEFAULT_DAYS_BEFORE_DUE = 5;
const DEFAULT_DAYS_BEFORE_ADJUSTMENT = 30;
const DEFAULT_DAYS_BEFORE_EXPIRY = 30;
const DEFAULT_OVERDUE_DAYS = 1;

export class LeaseNotificationWorker {

  static async checkInvoicesDueSoon(orgId, daysAhead = DEFAULT_DAYS_BEFORE_DUE) {
    const supabase = getSupabaseServer();
    const today = new Date();
    const targetDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        lease:lease_id (
          contract_number, tenant_name, tenant_email, monthly_rent,
          organization_id
        )
      `)
      .eq('organization_id', orgId)
      .eq('status', 'pendente')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', targetDate.toISOString().split('T')[0]);

    if (error) throw error;
    if (!invoices || invoices.length === 0) return [];

    const results = [];
    for (const inv of invoices) {
      const lease = inv.lease;
      if (!lease?.tenant_email) continue;

      try {
        await sendContactFormEmail(
          {
            name: 'Sistema de Cobrança',
            email: 'noreply@imobfluow.com.br',
            phone: '',
            message: this._buildDueSoonMessage(inv, lease),
          },
          lease.tenant_email
        );
        results.push({ invoice_id: inv.id, notified: true, method: 'email', to: lease.tenant_email });
      } catch (err) {
        console.error('[NotificationWorker] Failed to send due-soon email:', err.message);
        results.push({ invoice_id: inv.id, notified: false, error: err.message });
      }
    }
    return results;
  }

  static async checkOverdueInvoices(orgId, overdueSinceDays = DEFAULT_OVERDUE_DAYS) {
    const supabase = getSupabaseServer();
    const today = new Date();
    const overdueDate = new Date(today.getTime() - overdueSinceDays * 24 * 60 * 60 * 1000);

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        lease:lease_id (
          contract_number, tenant_name, tenant_email, monthly_rent,
          organization_id
        )
      `)
      .eq('organization_id', orgId)
      .eq('status', 'pendente')
      .lt('due_date', overdueDate.toISOString().split('T')[0]);

    if (error) throw error;
    if (!invoices || invoices.length === 0) return [];

    const results = [];
    for (const inv of invoices) {
      const lease = inv.lease;
      if (!lease?.tenant_email) continue;

      try {
        await sendContactFormEmail(
          {
            name: 'Sistema de Cobrança',
            email: 'noreply@imobfluow.com.br',
            phone: '',
            message: this._buildOverdueMessage(inv, lease),
          },
          lease.tenant_email
        );
        results.push({ invoice_id: inv.id, notified: true, method: 'email', to: lease.tenant_email });
      } catch (err) {
        console.error('[NotificationWorker] Failed to send overdue email:', err.message);
        results.push({ invoice_id: inv.id, notified: false, error: err.message });
      }
    }
    return results;
  }

  static async checkUpcomingAdjustments(orgId, daysAhead = DEFAULT_DAYS_BEFORE_ADJUSTMENT) {
    const supabase = getSupabaseServer();
    const today = new Date();
    const targetDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const { data: leases, error } = await supabase
      .from('leases')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .gte('next_rent_adjustment', today.toISOString().split('T')[0])
      .lte('next_rent_adjustment', targetDate.toISOString().split('T')[0])
      .not('next_rent_adjustment', 'is', null);

    if (error) throw error;
    if (!leases || leases.length === 0) return [];

    const results = [];
    for (const lease of leases) {
      if (!lease.tenant_email) continue;

      try {
        await sendContactFormEmail(
          {
            name: 'Gestão de Locação',
            email: 'noreply@imobfluow.com.br',
            phone: '',
            message: this._buildAdjustmentMessage(lease),
          },
          lease.tenant_email
        );
        results.push({ lease_id: lease.id, notified: true, method: 'email', to: lease.tenant_email });
      } catch (err) {
        console.error('[NotificationWorker] Failed to send adjustment email:', err.message);
        results.push({ lease_id: lease.id, notified: false, error: err.message });
      }
    }
    return results;
  }

  static async checkContractsExpiringSoon(orgId, daysAhead = DEFAULT_DAYS_BEFORE_EXPIRY) {
    const supabase = getSupabaseServer();
    const today = new Date();
    const targetDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const { data: leases, error } = await supabase
      .from('leases')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .gte('end_date', today.toISOString().split('T')[0])
      .lte('end_date', targetDate.toISOString().split('T')[0])
      .not('end_date', 'is', null);

    if (error) throw error;
    if (!leases || leases.length === 0) return [];

    const results = [];
    for (const lease of leases) {
      if (!lease.tenant_email) continue;

      try {
        await sendContactFormEmail(
          {
            name: 'Gestão de Locação',
            email: 'noreply@imobfluow.com.br',
            phone: '',
            message: this._buildExpiryMessage(lease),
          },
          lease.tenant_email
        );
        results.push({ lease_id: lease.id, notified: true, method: 'email', to: lease.tenant_email });
      } catch (err) {
        console.error('[NotificationWorker] Failed to send expiry email:', err.message);
        results.push({ lease_id: lease.id, notified: false, error: err.message });
      }
    }
    return results;
  }

  static async runAll(orgId) {
    const dueSoon = await this.checkInvoicesDueSoon(orgId);
    const overdue = await this.checkOverdueInvoices(orgId);
    const adjustments = await this.checkUpcomingAdjustments(orgId);
    const expiring = await this.checkContractsExpiringSoon(orgId);

    return { dueSoon, overdue, adjustments, expiring };
  }

  static _buildDueSoonMessage(inv, lease) {
    const dueDate = new Date(inv.due_date).toLocaleDateString('pt-BR');
    const amount = Number(inv.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return `
Olá ${lease.tenant_name || 'Locatário(a)'},

Este é um lembrete de que o boleto referente ao contrato ${lease.contract_number || ''} vence em ${dueDate}.

Valor: ${amount}

Para evitar multa e juros, realize o pagamento até a data de vencimento.

Atenciosamente,
ImobFluow - Gestão de Locação
    `.trim();
  }

  static _buildOverdueMessage(inv, lease) {
    const dueDate = new Date(inv.due_date).toLocaleDateString('pt-BR');
    const amount = Number(inv.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return `
Olá ${lease.tenant_name || 'Locatário(a)'},

O boleto referente ao contrato ${lease.contract_number || ''}, com vencimento em ${dueDate}, encontra-se em atraso.

Valor original: ${amount}

Regularize sua situação o quanto antes para evitar protesto e negativação do seu nome.

Atenciosamente,
ImobFluow - Gestão de Locação
    `.trim();
  }

  static _buildAdjustmentMessage(lease) {
    const adjDate = lease.next_rent_adjustment
      ? new Date(lease.next_rent_adjustment).toLocaleDateString('pt-BR')
      : 'em breve';
    const currentRent = Number(lease.monthly_rent).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return `
Olá ${lease.tenant_name || 'Locatário(a)'},

Informamos que o aluguel do contrato ${lease.contract_number || ''} será reajustado em ${adjDate}.

Valor atual: ${currentRent}
Índice de reajuste: ${lease.adjustment_index || 'IGPM'}
Periodicidade: ${lease.adjustment_period_months || 12} meses

O novo valor será calculado com base no índice vigente e comunicado oportunamente.

Atenciosamente,
ImobFluow - Gestão de Locação
    `.trim();
  }

  static _buildExpiryMessage(lease) {
    const endDate = lease.end_date
      ? new Date(lease.end_date).toLocaleDateString('pt-BR')
      : 'em breve';
    return `
Olá ${lease.tenant_name || 'Locatário(a)'},

O contrato de locação ${lease.contract_number || ''} está próximo do vencimento.

Término previsto: ${endDate}

Caso tenha interesse em renovar o contrato, entre em contato conosco para tratarmos das novas condições.

Atenciosamente,
ImobFluow - Gestão de Locação
    `.trim();
  }
}
