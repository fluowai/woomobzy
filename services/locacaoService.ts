import { logger } from '@/utils/logger';
import { callApi } from '../src/lib/api';

export interface Contract {
  id?: string;
  property_id?: string;
  tenant_name: string;
  tenant_email?: string;
  tenant_phone?: string;
  tenant_cpf?: string;
  tenant_rg?: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  adjustment_index: string;
  payment_status: 'em_dia' | 'atrasado' | 'inadimplente';
  status: 'active' | 'expired' | 'terminated';
  guarantee_type?: string;
  guarantee_document?: string;
  observation?: string;
}

export interface DashboardResumo {
  total_contratos: number;
  ativos: number;
  encerrados: number;
  receita_mensal: number;
  receita_anual: number;
  inadimplentes: number;
  atrasados: number;
  em_dia: number;
  valor_inadimplencia: number;
  contratos_vencendo_30_dias: number;
  contratos_vencendo_90_dias: number;
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
  }): Promise<Contract[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.payment_status)
        params.set('payment_status', filters.payment_status);
      if (filters?.property_id) params.set('property_id', filters.property_id);

      const result = await callApi(
        `/api/locacao${params.toString() ? '?' + params.toString() : ''}`
      );
      return result.data || [];
    } catch (error) {
      logger.error('Erro ao listar contratos:', error);
      return [];
    }
  }

  async getContract(id: string): Promise<Contract | null> {
    try {
      const result = await callApi(`/api/locacao/${id}`);
      return result.data || null;
    } catch (error) {
      logger.error('Erro ao buscar contrato:', error);
      return null;
    }
  }

  async createContract(data: Partial<Contract>): Promise<Contract | null> {
    try {
      const result = await callApi('/api/locacao', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result.data || null;
    } catch (error) {
      logger.error('Erro ao criar contrato:', error);
      return null;
    }
  }

  async updateContract(
    id: string,
    data: Partial<Contract>
  ): Promise<Contract | null> {
    try {
      const result = await callApi(`/api/locacao/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return result.data || null;
    } catch (error) {
      logger.error('Erro ao atualizar contrato:', error);
      return null;
    }
  }

  async deleteContract(id: string): Promise<boolean> {
    try {
      await callApi(`/api/locacao/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      logger.error('Erro ao excluir contrato:', error);
      return false;
    }
  }

  async getDashboard(): Promise<DashboardResumo | null> {
    try {
      const result = await callApi('/api/locacao/dashboard/resumo');
      return result.data || null;
    } catch (error) {
      logger.error('Erro ao buscar dashboard:', error);
      return null;
    }
  }

  async calcReajuste(
    id: string,
    indice?: string
  ): Promise<ReajusteResponse | null> {
    try {
      const url = indice
        ? `/api/locacao/calculo/reajuste/${id}?novo_indice=${indice}`
        : `/api/locacao/calculo/reajuste/${id}`;
      const result = await callApi(url);
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
  ): Promise<{ renewal: any; novo_aluguel: number } | null> {
    try {
      const result = await callApi(`/api/locacao/${id}/renovar`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result.data || null;
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
  ): Promise<Contract | null> {
    try {
      const result = await callApi(`/api/locacao/${id}/pagamento`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return result.data || null;
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
