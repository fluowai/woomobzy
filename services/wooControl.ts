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

export async function createWooProduct(payload: any) {
  return callApi('/api/woo-control/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateWooProduct(id: string, payload: any) {
  return callApi(`/api/woo-control/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteWooProduct(id: string) {
  return callApi(`/api/woo-control/products/${id}`, {
    method: 'DELETE',
  });
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

// Support Tickets
export async function fetchWooSupportTickets() {
  const data = await callApi('/api/woo-control/support/tickets');
  return data?.tickets || [];
}

export async function fetchWooSupportSessions() {
  const data = await callApi('/api/woo-control/support/sessions');
  return data?.sessions || [];
}

// Revenue
export async function fetchWooRevenue() {
  const data = await callApi('/api/woo-control/revenue');
  return data?.revenue || { mrr: 0, pending: 0, paid30d: 0, timeline: [] };
}

// Security
export async function fetchWooSecurityKeys() {
  const data = await callApi('/api/woo-control/security/keys');
  return data?.keys || {};
}

export async function runWooSecurityAudit() {
  return callApi('/api/woo-control/security/audit', { method: 'POST' });
}

// Releases CRUD
export async function createWooRelease(payload: any) {
  return callApi('/api/woo-control/releases', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateWooRelease(id: string, payload: any) {
  return callApi(`/api/woo-control/releases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteWooRelease(id: string) {
  return callApi(`/api/woo-control/releases/${id}`, {
    method: 'DELETE',
  });
}

// Snapshots CRUD
export async function createWooSnapshot(payload: any) {
  return callApi('/api/woo-control/snapshots', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateWooSnapshot(id: string, payload: any) {
  return callApi(`/api/woo-control/snapshots/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteWooSnapshot(id: string) {
  return callApi(`/api/woo-control/snapshots/${id}`, {
    method: 'DELETE',
  });
}

// Academy CRUD
export async function createWooAcademy(payload: any) {
  return callApi('/api/woo-control/academy', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateWooAcademy(id: string, payload: any) {
  return callApi(`/api/woo-control/academy/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteWooAcademy(id: string) {
  return callApi(`/api/woo-control/academy/${id}`, {
    method: 'DELETE',
  });
}

// Health Check
export async function fetchWooHealthCheck() {
  const data = await callApi('/api/woo-control/health-check');
  return data?.services || [];
}
