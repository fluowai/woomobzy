import { callApi } from '../src/lib/api';

export type WooOrg = {
  id: string;
  name: string;
  slug: string | null;
  type?: string | null;
  status?: string | null;
  parentId?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  niche?: string | null;
  createdAt?: string | null;
  licenses?: number;
  deployments?: number;
};

export type WooNetwork = {
  resellers: WooOrg[];
  customers: WooOrg[];
  orphans: WooOrg[];
  total: number;
};

export type WooKpis = {
  mrr: number;
  mrrLabel: string;
  activeLicenses: number;
  graceLicenses: number;
  suspendedLicenses: number;
  totalDeployments: number;
  onlineDeployments: number;
  offlineDeployments: number;
  totalCustomers: number;
  totalResellers: number;
  totalRevenue: number;
};

export async function fetchWooSummary(): Promise<WooKpis> {
  const data = await callApi('/api/woo-control/summary');
  return data?.kpis || {};
}

export async function fetchWooNetwork(): Promise<WooNetwork> {
  const data = await callApi('/api/woo-control/network');
  return data?.network || { resellers: [], customers: [], orphans: [], total: 0 };
}

export async function fetchWooLicenses() {
  const data = await callApi('/api/woo-control/licenses');
  return data?.licenses || [];
}

export async function fetchWooDeployments() {
  const data = await callApi('/api/woo-control/deployments');
  return data?.deployments || [];
}

export async function fetchWooProducts() {
  const data = await callApi('/api/woo-control/products');
  return data?.products || [];
}

export async function fetchWooReleases() {
  const data = await callApi('/api/woo-control/releases');
  return data?.releases || [];
}

export async function fetchWooSnapshots() {
  const data = await callApi('/api/woo-control/snapshots');
  return data?.snapshots || [];
}

export async function fetchWooAudit() {
  const data = await callApi('/api/woo-control/audit');
  return data?.logs || [];
}

export async function fetchWooAcademy() {
  const data = await callApi('/api/woo-control/academy');
  return data?.courses || [];
}

export async function createWooAudit(payload: {
  action: string;
  target?: string;
  metadata?: Record<string, unknown>;
}) {
  return callApi('/api/woo-control/audit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createWooReseller(payload: any) {
  return callApi('/api/woo-control/network/resellers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateWooReseller(id: string, payload: any) {
  return callApi(`/api/woo-control/network/resellers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteWooReseller(id: string) {
  return callApi(`/api/woo-control/network/resellers/${id}`, {
    method: 'DELETE',
  });
}
