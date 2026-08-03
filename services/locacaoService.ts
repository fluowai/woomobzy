import { logger } from '@/utils/logger';
import { callApi } from '../src/lib/api';

export interface Contract {
  id?: string;
  property_id?: string;
  property_title?: string;
  tenant_name: string;
  tenant_email?: string;
  tenant_phone?: string;
  tenant_cpf?: string;
  tenant_rg?: string;
  start_date?: string;
  end_date?: string;
  monthly_rent: number;
  adjustment_index?: string;
  payment_status: 'em_dia' | 'atrasado' | 'inadimplente';
  status: 'draft' | 'cadastral_analysis' | 'income_analysis' | 'pending_signatures' | 'active' | 'suspended' | 'terminated' | 'expired' | 'archived';
  guarantee_type?: string;
  guarantee_document?: string;
  observation?: string;
  contract_number?: string;
  due_day?: number;
  condominium_fee?: number;
  iptu_amount?: number;
  late_fee_percent?: number;
  late_interest_percent?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardResumo {
  total: number;
  ativos: number;
  em_andamento: number;
  encerrados: number;
  receita_mensal: number;
  receita_anual: number;
  inadimplentes: number;
  atrasados: number;
  em_dia: number;
  valor_inadimplencia: number;
  vencendo_30_dias: number;
  vencendo_90_dias: number;
}

export interface ReajusteResponse {
  contrato_id: string;
  valor_atual: number;
  indice_aplicado: string;
  nome_indice: string;
  taxa_percentual: string;
  valor_reajustado: number;
  diferenca_mensal: number;
  diferenca_anual: number;
  data_proximo_reajuste: string;
}

export class LocacaoService {
  async listContracts(filters?: {
    status?: string;
    payment_status?: string;
    property_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: Contract[]; count: number; page: number; totalPages: number }> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.payment_status) params.set('payment_status', filters.payment_status);
      if (filters?.property_id) params.set('property_id', filters.property_id);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const result = await callApi(`/api/locacao/leases${params.toString() ? '?' + params.toString() : ''}`);
      return result;
    } catch (error) {
      logger.error('Erro ao listar contratos:', error);
      return { success: false, data: [], count: 0, page: 1, totalPages: 0 };
    }
  }

  async getContract(id: string): Promise<{ success: boolean; data: Contract }> {
    try {
      const result = await callApi(`/api/locacao/leases/${id}`);
      return result;
    } catch (error) {
      logger.error('Erro ao buscar contrato:', error);
      return { success: false, data: {} as Contract };
    }
  }

  async createContract(data: Partial<Contract>): Promise<{ success: boolean; data: Contract }> {
    try {
      const result = await callApi('/api/locacao/leases', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result;
    } catch (error) {
      logger.error('Erro ao criar contrato:', error);
      return { success: false, data: {} as Contract };
    }
  }

  async updateContract(
    id: string,
    data: Partial<Contract>
  ): Promise<{ success: boolean; data: Contract }> {
    try {
      const result = await callApi(`/api/locacao/leases/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return result;
    } catch (error) {
      logger.error('Erro ao atualizar contrato:', error);
      return { success: false, data: {} as Contract };
    }
  }

  async deleteContract(id: string): Promise<{ success: boolean }> {
    try {
      await callApi(`/api/locacao/leases/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    } catch (error) {
      logger.error('Erro ao excluir contrato:', error);
      return { success: false };
    }
  }

  async getDashboard(): Promise<{ success: boolean; data: DashboardResumo }> {
    try {
      const result = await callApi('/api/locacao/dashboard/resumo');
      return result;
    } catch (error) {
      logger.error('Erro ao buscar dashboard:', error);
      return { success: false, data: {
        total: 0,
        ativos: 0,
        em_andamento: 0,
        encerrados: 0,
        receita_mensal: 0,
        receita_anual: 0,
        inadimplentes: 0,
        atrasados: 0,
        em_dia: 0,
        valor_inadimplencia: 0,
        vencendo_30_dias: 0,
        vencendo_90_dias: 0,
      }};
    }
  }

  async calcReajuste(
    id: string,
    indice?: string
  ): Promise<ReajusteResponse | null> {
    try {
      const body: any = { lease_id: id };
      if (indice) body.index = indice;
      const result = await callApi('/api/locacao/adjustments/calculate', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return result.data || null;
    } catch (error) {
      logger.error('Erro ao calcular reajuste:', error);
      return null;
    }
  }

  async renewContract(
    id: string,
    data: {
      nova_data_fim: string;
      novo_aluguel?: number;
      novo_indice?: string;
    }
  ): Promise<{ success: boolean; data: any } | null> {
    try {
      const result = await callApi(`/api/locacao/terminations`, {
        method: 'POST',
        body: JSON.stringify({
          lease_id: id,
          termination_type: 'acordo',
          termination_date: data.nova_data_fim,
          reason: 'Renovação contratual',
        }),
      });
      return result;
    } catch (error) {
      logger.error('Erro ao renovar contrato:', error);
      return null;
    }
  }

  async registerPayment(
    id: string,
    data: {
      data_pagamento: string;
      valor_pago: number;
      status: 'em_dia' | 'atrasado';
    }
  ): Promise<{ success: boolean; data: any } | null> {
    try {
      const result = await callApi(`/api/locacao/invoices/${id}/pay`, {
        method: 'PUT',
        body: JSON.stringify({
          payment_date: data.data_pagamento,
          paid_amount: data.valor_pago,
          payment_method: 'manual',
        }),
      });
      return result;
    } catch (error) {
      logger.error('Erro ao registrar pagamento:', error);
      return null;
    }
  }

  calculateDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  getStatusColor(paymentStatus: string): { color: string; bg: string } {
    switch (paymentStatus) {
      case 'em_dia':
        return { color: 'text-emerald-700', bg: 'bg-emerald-100' };
      case 'atrasado':
        return { color: 'text-amber-700', bg: 'bg-amber-100' };
      case 'inadimplente':
        return { color: 'text-red-700', bg: 'bg-red-100' };
      default:
        return { color: 'text-slate-500', bg: 'bg-slate-100' };
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
}

export const locacaoService = new LocacaoService();
