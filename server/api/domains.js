
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
            domain: { name: domain, verified: false }, 
            mock: true,
            message: 'Mock Success: Keys not configured.' 
        });
    }

    try {
        console.log(`🌐 Adding domain ${domain} to Vercel Project ${PROJECT_ID}...`);
        
        // 1. Add to Vercel
        const params = TEAM_ID ? { teamId: TEAM_ID } : {};
        const response = await vercelClient.post(`/${PROJECT_ID}/domains`, { name: domain }, { params });
        
        // 2. Update Supabase
        const { error } = await supabase
            .from('organizations')
            .update({ custom_domain: domain })
            .eq('id', organizationId);

        if (error) throw new Error(`Database update failed: ${error.message}`);

        res.json({ success: true, domain: response.data });
    } catch (error) {
        console.error('❌ Vercel Add Domain Error:', error.response?.data || error.message);
        const msg = error.response?.data?.error?.message || error.message;
        res.status(500).json({ error: msg });
    }
};

export const verifyDomain = async (req, res) => {
    const { domain } = req.params;

    if (!VERCEL_TOKEN || !PROJECT_ID) {
        return res.json({ success: true, verified: true, mock: true });
    }

    try {
        const params = TEAM_ID ? { teamId: TEAM_ID } : {};
        const response = await vercelClient.get(`/${PROJECT_ID}/domains/${domain}/config`, { params });
        
        // Check verification status
        const { misconfigured } = response.data;
        // Vercel returns "misconfigured: true" if DNS is wrong
        
        res.json({ 
            success: true, 
            verified: !misconfigured,
            details: response.data 
        });

    } catch (error) {
        // If domain not found (404), it's not added
        if (error.response?.status === 404) {
            return res.json({ success: false, verified: false, error: 'Domain not found in project' });
        }
        console.error('❌ Vercel Verify Domain Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to verify domain' });
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

        // 2. Remove from Supabase
        if (organizationId) {
             await supabase
            .from('organizations')
            .update({ custom_domain: null })
            .eq('id', organizationId);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Vercel Remove Domain Error:', error.response?.data || error.message);
        res.status(500).json({ error: error.message });
    }
};
