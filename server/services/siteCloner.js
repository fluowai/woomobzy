
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabase.js';

// Helper to get keys from DB
async function getApiKeys(organizationId) {
    // If no org ID, try to get environment variables as fallback
    const config = {
        geminiKey: process.env.GEMINI_API_KEY,
        groqKey: process.env.GROQ_API_KEY,
        preferred: 'gemini'
    };

    if (!organizationId) {
         // Try to fetch singleton settings if no org ID provided
         // (Fallthrough to the try block below)
    }

    try {
        let query = supabase
            .from('site_settings')
            .select('integrations');

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        // Fetch single row (either specific org or the only one present)
        const { data: settings, error } = await query.single();
        
        if (error) {
           console.log('Error fetching settings (might be empty):', error.message);
        }

        if (settings?.integrations) {
            if (settings.integrations.gemini?.apiKey) {
                config.geminiKey = settings.integrations.gemini.apiKey;
            }
            if (settings.integrations.groq?.apiKey) {
                config.groqKey = settings.integrations.groq.apiKey;
            }
        }
        if (config.geminiKey) console.log('✅ Found Gemini Key from DB');
        if (config.groqKey) console.log('✅ Found Groq Key from DB');
    } catch (err) {
        console.warn('Failed to fetch settings, using env:', err);
    }
    
    if (!config.geminiKey && !config.groqKey) {
         console.log('⚠️ No keys in DB, checking Env vars...');
         if (process.env.GEMINI_API_KEY) console.log('✅ Found Gemini Key from Env');
         if (process.env.GROQ_API_KEY) console.log('✅ Found Groq Key from Env');
    }
    
    return config;
}

// GROQ Adapter
async function callGroq(apiKey, htmlContent) {
    if (!apiKey) throw new Error("Groq API Key not found");
    
    const prompt = `
    You are an expert Frontend AI. Convert this HTML to JSON matching the 'LayoutConfig' schema for a Landing Page Builder.
    Background: We need to clone a site into editable blocks.
    
    SCHEMA RULES:
    - Output ONLY valid JSON.
    - Blocks: hero, text, stats, property_grid, form, cta, footer.
    - Simplified Schema: { "version": "1.0", "mode": "visual", "blocks": [ { "type": "...", "visible": true, "config": { ... }, "styles": {} } ] }
    
    HTML:
    ${htmlContent.slice(0, 50000)}
    `;

    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: "json_object" }
        }, {
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
        throw new Error(`Groq API Error: ${error.response?.data?.error?.message || error.message}`);
    }
}

/**
 * Clones a website into an editable Landing Page Layout Config
 * @param {string} url - The URL to clone
 * @param {string} organizationId - The organization ID to fetch settings
 * @returns {Promise<Object>} - The LayoutConfig JSON
 */
export const cloneSite = async (url, organizationId) => {
    try {
        console.log(`🤖 Cloning site: ${url} (Org: ${organizationId})`);
        
        // 0. Get Configuration
        const keys = await getApiKeys(organizationId);
        
        // 1. Fetch HTML
        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        
        // 2. Clean and Simplify HTML
        const $ = cheerio.load(html);
        $('script, style, svg, iframe, noscript, link').remove();
        const simplifiedHtml = $('body').html()
            .replace(/\s+/g, ' ')
            .slice(0, 100000); 

        // 3. Try Gemini
        if (keys.geminiKey) {
            try {
                console.log('🤖 Using Gemini...');
                const genAI = new GoogleGenerativeAI(keys.geminiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                
                const prompt = `
                You are an expert Frontend AI. Convert provided HTML to JSON 'LayoutConfig' schema.
                Block Types: 'hero', 'text', 'stats', 'property_grid', 'form', 'cta', 'footer'.
                Return ONLY valid JSON.
                HTML: ${simplifiedHtml}
                `;
                
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(jsonStr);

            } catch (err) {
                console.error('Gemini failed, trying Groq...', err.message);
                if (!keys.groqKey) throw err; // If no fallback, throw
            }
        }

        // 4. Try Groq (Fallback or Primary)
        if (keys.groqKey) {
            console.log('🤖 Using Groq...');
            return await callGroq(keys.groqKey, simplifiedHtml);
        }

        throw new Error('No valid AI API keys found. Please configure Gemini or Groq in Settings.');

    } catch (error) {
        console.error('❌ Error cloning site:', error);
        throw new Error(`${error.message}`);
    }
};
