
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Vercel Configuration
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID; // Optional

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to call Vercel API
const vercelClient = axios.create({
    baseURL: 'https://api.vercel.com/v9/projects',
    headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Helper function to extract DNS records from Vercel response
const getDnsRecords = (vercelResponse) => {
    // Vercel returns nameservers or CNAME info in the response
    // Standard CNAME for Vercel is: cname.vercel-dns.com
    // Or A records for root domain

    const isRootDomain = !vercelResponse.name?.includes('.');

    return {
        type: isRootDomain ? 'A' : 'CNAME',
        name: isRootDomain ? '@' : vercelResponse.name?.split('.')[0] || 'www',
        value: 'cname.vercel-dns.com',
        ttl: 3600,
        priority: isRootDomain ? null : 10,
        // Portuguese instructions
        instructions: {
            pt: [
                '1. Acesse o painel do seu registrador (GoDaddy, Namecheap, etc)',
                `2. Procure pela seção "DNS Records" ou "Registros de DNS"`,
                `3. ${isRootDomain ? 'Para o domínio raiz (@):' : 'Para seu domínio:'}`,
                `   - Tipo: ${isRootDomain ? 'A' : 'CNAME'}`,
                `   - Nome: ${isRootDomain ? '@' : vercelResponse.name?.split('.')[0] || 'www'}`,
                `   - Valor: cname.vercel-dns.com`,
                '4. Salve as alterações',
                '5. Aguarde 5-15 minutos para a propagação de DNS',
                '6. Clique "Verificar" para confirmar'
            ]
        }
    };
};

export const addDomain = async (req, res) => {
    const { domain, organizationId } = req.body;

    if (!domain || !organizationId) {
        return res.status(400).json({ error: 'Domain and Organization ID are required' });
    }

    if (!VERCEL_TOKEN || !PROJECT_ID) {
        console.warn('⚠️ Missing VERCEL_API_TOKEN or VERCEL_PROJECT_ID. Returning mock success.');
        // Mock success for testing without keys
        return res.json({
            success: true,
            domain: {
                name: domain,
                status: 'pending',
                verified: false,
                dnsRecords: getDnsRecords({ name: domain }),
                provisioned: true
            },
            mock: true,
            message: 'Mock Success: Keys not configured.'
        });
    }

    try {
        console.log(`🌐 Adding domain ${domain} to Vercel Project ${PROJECT_ID}...`);

        // 1. Add to Vercel
        const params = TEAM_ID ? { teamId: TEAM_ID } : {};
        const response = await vercelClient.post(`/${PROJECT_ID}/domains`, { name: domain }, { params });

        // 2. Update Supabase with niche and domain
        const { error: updateError } = await supabase
            .from('organizations')
            .update({ custom_domain: domain })
            .eq('id', organizationId);

        if (updateError) throw new Error(`Database update failed: ${updateError.message}`);

        // 3. Also save to domains table (if it exists)
        try {
            await supabase
                .from('domains')
                .insert({
                    organization_id: organizationId,
                    domain: domain,
                    is_custom: true,
                    is_primary: false,
                    status: 'pending',
                    dns_records: JSON.stringify(getDnsRecords(response.data))
                });
        } catch (e) {
            console.log('⚠️ Domains table insert skipped:', e.message);
        }

        res.json({
            success: true,
            domain: {
                name: response.data.name || domain,
                status: 'pending',
                verified: false,
                dnsRecords: getDnsRecords(response.data),
                provisioned: true,
                vercelData: response.data
            }
        });
    } catch (error) {
        console.error('❌ Vercel Add Domain Error:', error.response?.data || error.message);
        const msg = error.response?.data?.error?.message || error.message;
        res.status(400).json({ error: msg });
    }
};

export const verifyDomain = async (req, res) => {
    const { domain } = req.params;
    const { retries = 0 } = req.query;

    if (!VERCEL_TOKEN || !PROJECT_ID) {
        return res.json({
            success: true,
            verified: true,
            status: 'verified',
            mock: true
        });
    }

    try {
        const params = TEAM_ID ? { teamId: TEAM_ID } : {};
        const response = await vercelClient.get(`/${PROJECT_ID}/domains/${domain}/config`, { params });

        const { misconfigured, configuredBy } = response.data;

        // Determine status
        let status = 'pending';
        if (misconfigured === false) {
            status = 'verified';
        } else if (misconfigured === true && retries < 3) {
            status = 'verifying';
        }

        res.json({
            success: true,
            verified: !misconfigured,
            status: status,
            misconfigured: misconfigured,
            configuredBy: configuredBy,
            ssl: response.data.ssl || { status: 'pending' },
            details: response.data,
            retryCount: parseInt(retries),
            // Suggest retry if not verified yet
            suggestRetry: misconfigured === true && retries < 3
        });

    } catch (error) {
        // If domain not found (404), it's not added
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                verified: false,
                status: 'not_found',
                error: 'Domínio não encontrado no projeto'
            });
        }
        console.error('❌ Vercel Verify Domain Error:', error.response?.data || error.message);
        res.status(400).json({
            error: 'Falha ao verificar domínio',
            details: error.message
        });
    }
};

export const removeDomain = async (req, res) => {
    const { domain, organizationId } = req.body;

    if (!VERCEL_TOKEN || !PROJECT_ID) {
        return res.json({ success: true, mock: true });
    }

    try {
        console.log(`🗑️ Removing domain ${domain}...`);

        // 1. Remove from Vercel
        const params = TEAM_ID ? { teamId: TEAM_ID } : {};
        await vercelClient.delete(`/${PROJECT_ID}/domains/${domain}`, { params });

        // 2. Remove from Supabase organizations table
        if (organizationId) {
            await supabase
                .from('organizations')
                .update({ custom_domain: null })
                .eq('id', organizationId);
        }

        // 3. Update domains table (if exists)
        try {
            await supabase
                .from('domains')
                .update({ status: 'removed' })
                .eq('domain', domain);
        } catch (e) {
            console.log('⚠️ Domains table update skipped:', e.message);
        }

        res.json({
            success: true,
            message: 'Domínio removido com sucesso'
        });
    } catch (error) {
        console.error('❌ Vercel Remove Domain Error:', error.response?.data || error.message);
        res.status(400).json({
            error: error.response?.data?.error?.message || error.message
        });
    }
};

// Helper function to get DNS records for a domain
export const getDomainDnsRecords = (domain) => {
    const isRootDomain = !domain.includes('.');
    return getDnsRecords({ name: domain });
};

// Helper function to wait for domain verification
export const waitForDomainVerification = async (domain, maxRetries = 5, delayMs = 3000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const params = TEAM_ID ? { teamId: TEAM_ID } : {};
            const response = await vercelClient.get(`/${PROJECT_ID}/domains/${domain}/config`, { params });

            if (response.data.misconfigured === false) {
                return { success: true, verified: true, attempt: i + 1 };
            }

            // Wait before retrying
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Domain not found');
            }
            throw error;
        }
    }

    return { success: false, verified: false, attempt: maxRetries };
};
