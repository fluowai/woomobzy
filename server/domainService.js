// Domain Automation Service
// Integrates with Vercel API to manage custom domains

import axios from 'axios';

// ==========================================
// Vercel — Domain Addition
// ==========================================
export async function addVercelDomain(subdomain) {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  const mainDomain = process.env.WHM_MAIN_DOMAIN || 'imobzy.com.br';

  if (!token || !projectId) {
    console.warn('⚠️ Vercel não configurado. Pulando adição de domínio.');
    return { success: false, reason: 'VERCEL_NOT_CONFIGURED' };
  }

  const fullDomain = `${subdomain}.${mainDomain}`;

  try {
    const url = `https://api.vercel.com/v10/projects/${projectId}/domains`;
    const params = teamId ? { teamId } : {};

    const response = await axios.post(
      url,
      { name: fullDomain },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params,
        timeout: 15000,
      }
    );

    console.log(`✅ Vercel: Domínio ${fullDomain} adicionado ao projeto`);
    return { success: true, domain: fullDomain, vercelData: response.data };
  } catch (error) {
    // Domain already added is not an error
    if (error.response?.status === 409) {
      console.log(`ℹ️ Vercel: Domínio ${fullDomain} já existe no projeto`);
      return { success: true, domain: fullDomain, alreadyExists: true };
    }
    console.error(`❌ Vercel: Erro ao adicionar domínio:`, error.response?.data || error.message);
    return { success: false, reason: 'API_ERROR', error: error.response?.data || error.message };
  }
}

// ==========================================
// Provisioning Entry Point
// ==========================================
export async function provisionTenantDomain(subdomain) {
  console.log(`🚀 Provisionando domínio para tenant: ${subdomain}`);

  const mainDomain = process.env.WHM_MAIN_DOMAIN || 'imobzy.com.br';
  const fullDomain = `${subdomain}.${mainDomain}`;
  
  // Apenas Vercel é necessário (DNS Wildcard no cPanel)
  const vercel = await addVercelDomain(subdomain);

  return {
    subdomain,
    fullDomain,
    vercel,
    success: vercel.success,
  };
}
