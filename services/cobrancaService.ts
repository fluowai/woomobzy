import { callApi } from '../src/lib/api';

export interface Billing {
  id?: string;
  contract_id?: string;
  amount?: number;
  due_date?: string;
  payment_date?: string;
  status?: 'aberto' | 'pago' | 'vencido' | 'cancelado' | 'protesto';
  description?: string;
  barcode?: string;
  nossonumero?: string;
  contract?: {
    tenant_name?: string;
    monthly_rent?: number;
    property?: {
      title?: string;
      address?: string;
    };
  };
}

export interface DashboardFinanceiro {
  receita: { mes: string; valor: number }[];
  inadimplencia: { mes: string; valor: number }[];
  totais: {
    contratos_ativos: number;
    receita_mensal_projetada: number;
    inadimplentes: number;
    valor_inadimplencia: number;
    total_recebido_ano: number;
    total_vencido: number;
    total_aberto: number;
    taxa_inadimplencia: string;
  };
}

export interface RelatorioInadimplencia {
  id: string;
  tenant_name: string;
  total_debito: number;
  dias_vencido: number;
  nivel: 'CRITICO' | 'ALTO' | 'MEDIO';
  property: { title: string; address: string };
}

export class CobrancaService {
  async listBillings(filters?: {
    status?: string;
    contract_id?: string;
    mes?: number;
    ano?: number;
  }): Promise<Billing[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.contract_id) params.set('contract_id', filters.contract_id);
      if (filters?.mes) params.set('mes', String(filters.mes));
      if (filters?.ano) params.set('ano', String(filters.ano));

      const result = await callApi(
        `/api/cobranca${params.toString() ? '?' + params.toString() : ''}`
      );
      return result.data || [];
    } catch (error) {
      console.error('Erro ao listar cobranças:', error);
      return [];
    }
  }

  async createBilling(data: {
    contract_id: string;
    amount: number;
    due_date: string;
    description?: string;
  }): Promise<Billing | null> {
    try {
      const result = await callApi('/api/cobranca', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result.data || null;
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
      return null;
    }
  }

  async generateMonthlyBillings(
    mes: number,
    ano: number,
    tipo?: string
  ): Promise<{
    success: boolean;
    created: number;
  }> {
    try {
      const result = await callApi('/api/cobranca/gerar-mensal', {
        method: 'POST',
        body: JSON.stringify({ mes, ano, tipo }),
      });
      return { success: result.success, created: result.created || 0 };
    } catch (error) {
      console.error('Erro ao gerar cobranças:', error);
      return { success: false, created: 0 };
    }
  }

  async registerPayment(
    billingId: string,
    data: {
      data_pagamento: string;
      valor_pago?: number;
      observacoes?: string;
    }
  ): Promise<Billing | null> {
    try {
      const result = await callApi(`/api/cobranca/${billingId}/pagar`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return result.data || null;
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      return null;
    }
  }

  async cancelBilling(
    billingId: string,
    motivo?: string
  ): Promise<Billing | null> {
    try {
      const result = await callApi(`/api/cobranca/${billingId}/cancelar`, {
        method: 'PUT',
        body: JSON.stringify({ motivo }),
      });
      return result.data || null;
    } catch (error) {
      console.error('Erro ao cancelar cobrança:', error);
      return null;
    }
  }

  async getDashboard(ano?: number): Promise<DashboardFinanceiro | null> {
    try {
      const url = ano
        ? `/api/cobranca/dashboard/financeiro?ano=${ano}`
        : '/api/cobranca/dashboard/financeiro';
      const result = await callApi(url);
      return result.data || null;
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      return null;
    }
  }

  async getRelatorioInadimplencia(): Promise<RelatorioInadimplencia[]> {
    try {
      const result = await callApi('/api/cobranca/relatorio/inadimplencia');
      return result.data || [];
    } catch (error) {
      console.error('Erro ao buscar inadimplência:', error);
      return [];
    }
  }

  async exportData(
    formato: 'json' | 'csv' | 'xml',
    options?: {
      ano?: number;
      mes?: number;
    }
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (options?.ano) params.set('ano', String(options.ano));
      if (options?.mes) params.set('mes', String(options.mes));

      const result = await callApi(
        `/api/cobranca/exportar/${formato}${params.toString() ? '?' + params.toString() : ''}`
      );
      return result.data || result;
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      return null;
    }
  }

  getStatusColor(status: string): { color: string; bg: string } {
    switch (status) {
      case 'pago':
        return { color: 'text-emerald-700', bg: 'bg-emerald-100' };
      case 'aberto':
        return { color: 'text-blue-700', bg: 'bg-blue-100' };
      case 'vencido':
        return { color: 'text-red-700', bg: 'bg-red-100' };
      case 'cancelado':
        return { color: 'text-slate-500', bg: 'bg-slate-100' };
      case 'protesto':
        return { color: 'text-orange-700', bg: 'bg-orange-100' };
      default:
        return { color: 'text-slate-500', bg: 'bg-slate-100' };
    }
  }

  getNivelColor(nivel: string): { color: string; bg: string } {
    switch (nivel) {
      case 'CRITICO':
        return { color: 'text-red-700', bg: 'bg-red-100' };
      case 'ALTO':
        return { color: 'text-orange-700', bg: 'bg-orange-100' };
      case 'MEDIO':
        return { color: 'text-amber-700', bg: 'bg-amber-100' };
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

  calculateDiasVencido(dueDate: string): number {
    const due = new Date(dueDate);
    const now = new Date();
    return Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export const cobrancaService = new CobrancaService();
