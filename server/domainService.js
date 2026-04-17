// Domain Automation Service
// Integrates with Vercel API to manage custom domains

import axios from 'axios';

const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const MAIN_DOMAIN = process.env.WHM_MAIN_DOMAIN || 'consultio.com.br';

const vercelApi = axios.create({
  baseURL: 'https://api.vercel.com',
  headers: {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  },
  params: VERCEL_TEAM_ID ? { teamId: VERCEL_TEAM_ID } : {},
  timeout: 10000,
});

// ==========================================
// Vercel — Domain Addition
// ==========================================
export async function addVercelDomain(domainName) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn('⚠️ Vercel não configurado. Pulando adição de domínio.');
    return { success: false, reason: 'VERCEL_NOT_CONFIGURED' };
  }

  try {
    const response = await vercelApi.post(`/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
      name: domainName,
    });

    console.log(`✅ Vercel: Domínio ${domainName} adicionado ao projeto`);
    return { success: true, domain: domainName, vercelData: response.data };
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`ℹ️ Vercel: Domínio ${domainName} já existe no projeto`);
      return { success: true, domain: domainName, alreadyExists: true };
    }
    console.error(`❌ Vercel Add Error:`, error.response?.data || error.message);
    return { success: false, reason: 'API_ERROR', error: error.response?.data || error.message };
  }
}

// ==========================================
// Vercel — Domain Removal
// ==========================================
export async function removeVercelDomain(domainName) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return { success: false };

  try {
    await vercelApi.delete(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${domainName}`);
    console.log(`🗑️ Vercel: Domínio ${domainName} removido`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Vercel Remove Error:`, error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// ==========================================
// Vercel — Status / Verification
// ==========================================
export async function checkVercelDomainStatus(domainName) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return { success: false };

  try {
    const response = await vercelApi.get(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${domainName}/config`);
    const statusRes = await vercelApi.get(`/v6/domains/${domainName}`);
    
    return {
      success: true,
      configured: response.data?.configured || false,
      verified: statusRes.data?.verified || false,
      verification: statusRes.data?.verification || null,
      error: response.data?.error || null,
    };
  } catch (error) {
    return { success: false, error: error.response?.data || error.message };
  }
}

// ==========================================
// Provisioning Entry Point
// ==========================================
export async function provisionTenantDomain(subdomain) {
  console.log(`🚀 Provisionando domínio para tenant: ${subdomain}`);

  const fullDomain = `${subdomain}.${MAIN_DOMAIN}`;
  
  // Apenas Vercel é necessário
  const vercel = await addVercelDomain(fullDomain);

  return {
    subdomain,
    fullDomain,
    vercel,
    success: vercel.success,
  };
}
