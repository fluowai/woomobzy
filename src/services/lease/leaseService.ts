import { supabase } from '../../../services/supabase';
import type {
  Lease,
  ContractTemplate,
  Signature,
  Inspection,
  Invoice,
  RentAdjustment,
  LeaseTermination,
  LeaseDashboardResumo,
  LeaseTimelineEvent,
} from '../../types/lease';

const BASE_URL = '/api/locacao';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Erro na requisição');
  }
  return res.json();
}

// ── LEASES ──

export async function listLeases(params?: {
  status?: string;
  payment_status?: string;
  property_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data: Lease[]; count: number; page: number; totalPages: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.payment_status) searchParams.set('payment_status', params.payment_status);
  if (params?.property_id) searchParams.set('property_id', params.property_id);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return apiFetch(`${BASE_URL}/leases${qs ? `?${qs}` : ''}`);
}

export async function getLease(id: string): Promise<{ success: boolean; data: Lease }> {
  return apiFetch(`${BASE_URL}/leases/${id}`);
}

export async function createLease(data: Partial<Lease>): Promise<{ success: boolean; data: Lease }> {
  return apiFetch(`${BASE_URL}/leases`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateLease(id: string, data: Partial<Lease>): Promise<{ success: boolean; data: Lease }> {
  return apiFetch(`${BASE_URL}/leases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateLeaseStatus(id: string, status: string): Promise<{ success: boolean; data: Lease }> {
  return apiFetch(`${BASE_URL}/leases/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteLease(id: string): Promise<{ success: boolean }> {
  return apiFetch(`${BASE_URL}/leases/${id}`, { method: 'DELETE' });
}

// ── TEMPLATES ──

export async function listTemplates(): Promise<{ success: boolean; data: ContractTemplate[] }> {
  return apiFetch(`${BASE_URL}/templates`);
}

export async function getTemplate(id: string): Promise<{ success: boolean; data: ContractTemplate }> {
  return apiFetch(`${BASE_URL}/templates/${id}`);
}

export async function createTemplate(data: Partial<ContractTemplate>): Promise<{ success: boolean; data: ContractTemplate }> {
  return apiFetch(`${BASE_URL}/templates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(id: string, data: Partial<ContractTemplate>): Promise<{ success: boolean; data: ContractTemplate }> {
  return apiFetch(`${BASE_URL}/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(id: string): Promise<{ success: boolean }> {
  return apiFetch(`${BASE_URL}/templates/${id}`, { method: 'DELETE' });
}

export async function validateTemplate(content: string): Promise<{
  success: boolean;
  data: { variables_found: string[]; missing_required: string[]; is_valid: boolean };
}> {
  return apiFetch(`${BASE_URL}/templates/validate`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// ── SIGNATURES ──

export async function listSignatures(leaseId: string): Promise<{ success: boolean; data: Signature[] }> {
  return apiFetch(`${BASE_URL}/signatures/${leaseId}`);
}

export async function createSignature(data: Partial<Signature>): Promise<{ success: boolean; data: Signature }> {
  return apiFetch(`${BASE_URL}/signatures`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSignatureStatus(id: string, status: string, metadata?: Record<string, string>): Promise<{ success: boolean; data: Signature }> {
  return apiFetch(`${BASE_URL}/signatures/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...metadata }),
  });
}

export async function sendSignatureInvitation(id: string, method?: string): Promise<{ success: boolean; data: Signature }> {
  return apiFetch(`${BASE_URL}/signatures/${id}/send-invitation`, {
    method: 'POST',
    body: JSON.stringify({ method }),
  });
}

// ── INVOICES ──

export async function listInvoices(leaseId: string, params?: { status?: string; year?: string }): Promise<{ success: boolean; data: Invoice[] }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.year) searchParams.set('year', params.year);
  const qs = searchParams.toString();
  return apiFetch(`${BASE_URL}/invoices/${leaseId}${qs ? `?${qs}` : ''}`);
}

export async function generateInvoices(leaseId: string, startMonth?: string, months?: number): Promise<{ success: boolean; data: Invoice[] }> {
  return apiFetch(`${BASE_URL}/invoices/generate`, {
    method: 'POST',
    body: JSON.stringify({ lease_id: leaseId, start_month: startMonth, months }),
  });
}

export async function payInvoice(id: string, data: { payment_date?: string; payment_method?: string; paid_amount?: number; payment_proof_url?: string }): Promise<{ success: boolean; data: Invoice }> {
  return apiFetch(`${BASE_URL}/invoices/${id}/pay`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── INSPECTIONS ──

export async function listInspections(leaseId: string): Promise<{ success: boolean; data: Inspection[] }> {
  return apiFetch(`${BASE_URL}/inspections/${leaseId}`);
}

export async function createInspection(data: Partial<Inspection>): Promise<{ success: boolean; data: Inspection }> {
  return apiFetch(`${BASE_URL}/inspections`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInspection(id: string, data: Partial<Inspection>): Promise<{ success: boolean; data: Inspection }> {
  return apiFetch(`${BASE_URL}/inspections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── ADJUSTMENTS ──

export async function listAdjustments(leaseId: string): Promise<{ success: boolean; data: RentAdjustment[] }> {
  return apiFetch(`${BASE_URL}/adjustments/${leaseId}`);
}

export async function calculateAdjustment(leaseId: string, index?: string): Promise<{ success: boolean; data: Record<string, unknown> }> {
  return apiFetch(`${BASE_URL}/adjustments/calculate`, {
    method: 'POST',
    body: JSON.stringify({ lease_id: leaseId, index }),
  });
}

export async function applyAdjustment(leaseId: string, newRent?: number, index?: string): Promise<{ success: boolean; data: RentAdjustment }> {
  return apiFetch(`${BASE_URL}/adjustments/apply`, {
    method: 'POST',
    body: JSON.stringify({ lease_id: leaseId, new_rent: newRent, index }),
  });
}

// ── TERMINATIONS ──

export async function getTermination(leaseId: string): Promise<{ success: boolean; data: LeaseTermination | null }> {
  return apiFetch(`${BASE_URL}/terminations/${leaseId}`);
}

export async function createTermination(data: Partial<LeaseTermination>): Promise<{ success: boolean; data: LeaseTermination }> {
  return apiFetch(`${BASE_URL}/terminations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── DASHBOARD ──

export async function getDashboardResumo(): Promise<{ success: boolean; data: LeaseDashboardResumo }> {
  return apiFetch(`${BASE_URL}/dashboard/resumo`);
}

export async function getDashboardTimeline(): Promise<{ success: boolean; data: LeaseTimelineEvent[] }> {
  return apiFetch(`${BASE_URL}/dashboard/timeline`);
}
