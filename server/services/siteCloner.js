import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabase.js';
import crypto from 'crypto';

// Helper to get keys from DB
async function getApiKeys(organizationId) {
    // If no org ID, try to get environment variables as fallback
    const config = {
        openaiKey: process.env.OPENAI_API_KEY,
        geminiKey: process.env.GEMINI_API_KEY,
        groqKey: process.env.GROQ_API_KEY,
        preferred: 'openai'
    };

    try {
        let query = supabase
            .from('site_settings')
            .select('integrations');

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data: settings, error } = await query.single();
        
        if (settings?.integrations) {
            if (settings.integrations.openai?.apiKey) {
                config.openaiKey = settings.integrations.openai.apiKey;
            }
            if (settings.integrations.gemini?.apiKey) {
                config.geminiKey = settings.integrations.gemini.apiKey;
            }
            if (settings.integrations.groq?.apiKey) {
                config.groqKey = settings.integrations.groq.apiKey;
            }
        }
    } catch (err) {
        console.warn('Failed to fetch settings, using env:', err);
    }
    
    return config;
}

// OPENAI Adapter
async function callOpenAI(apiKey, htmlContent) {
    if (!apiKey) throw new Error("OpenAI API Key not found");
    
    const prompt = `
    Você é um especialista em Frontend AI. Converta este HTML para JSON seguindo o esquema 'LayoutConfig' para um Landing Page Builder.
    Background: Precisamos clonar um site em blocos editáveis.
    
    REGRAS DO SCHEMA:
    - Retorne APENAS JSON válido.
    - Blocos permitidos: hero, text, stats, property_grid, form, cta, footer.
    - Estrutura: { "version": "1.0", "mode": "visual", "blocks": [ { "type": "...", "visible": true, "config": { ... }, "styles": {} } ] }
    
    HTML:
    ${htmlContent.slice(0, 50000)}
    `;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: "json_object" }
        }, {
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        throw new Error(`OpenAI API Error: ${error.response?.data?.error?.message || error.message}`);
    }
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

        return response.data.choices[0].message.content;
    } catch (error) {
        throw new Error(`Groq API Error: ${error.response?.data?.error?.message || error.message}`);
    }
}

/**
 * Downloads an image and uploads it to Supabase Storage
 */
async function processAndUploadImage(imageUrl, organizationId) {
    try {
        console.log(`📸 Processing image: ${imageUrl}`);
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 5000 });
        const buffer = Buffer.from(response.data);
        const fileName = `${organizationId}/${crypto.randomUUID()}.${imageUrl.split('.').pop().split('?')[0] || 'jpg'}`;
        
        const { data, error } = await supabase.storage
            .from('properties')
            .upload(fileName, buffer, {
                contentType: response.headers['content-type'],
                upsert: true
            });

        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
            .from('properties')
            .getPublicUrl(fileName);
            
        return publicUrl;
    } catch (err) {
        console.warn(`⚠️ Failed to download/upload image ${imageUrl}:`, err.message);
        return imageUrl; // Fallback to original URL
    }
}

/**
 * Extracts property listings from a website
 */
export const extractProperties = async (url, organizationId) => {
    try {
        console.log(`🤖 Starting property extraction: ${url}`);
        const keys = await getApiKeys(organizationId);
        
        const { data: html } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        
        const $ = cheerio.load(html);
        $('script, style, svg, iframe, noscript').remove();
        
        // Extract links and basic context
        const simplifiedHtml = $('body').html().replace(/\s+/g, ' ').slice(0, 80000);

        const prompt = `
        You are a Real Estate Data Expert. Analyze the HTML and extract up to 50 property listings.
        
        FORMAT: Return ONLY a JSON object with an array called "properties".
        Each property must have:
        - title (string)
        - price (number)
        - description (string)
        - location (string)
        - type (Rural or Urban)
        - status (Venda or Aluguel)
        - images (array of absolute image URLs)
        - features (array of strings, e.g. ["500ha", "Sede", "Pasto"])

        HTML: ${simplifiedHtml}
        `;

        let jsonStr = '';
        if (keys.openaiKey) {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            }, { headers: { 'Authorization': `Bearer ${keys.openaiKey}` } });
            jsonStr = response.data.choices[0].message.content;
        } else if (keys.geminiKey) {
            const genAI = new GoogleGenerativeAI(keys.geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const rawData = JSON.parse(jsonStr);
        const properties = rawData.properties || [];
        
        // Limit to 50
        const limitedProperties = properties.slice(0, 50);

        // Process images (Download to Supabase)
        const processedProperties = await Promise.all(limitedProperties.map(async (prop) => {
            const images = prop.images || [];
            // Download only up to 5 images per property for speed
            const processedImages = await Promise.all(
                images.slice(0, 5).map(imgUrl => processAndUploadImage(imgUrl, organizationId))
            );
            return {
                ...prop,
                id: crypto.randomUUID(),
                images: processedImages
            };
        }));

        return processedProperties;

    } catch (error) {
        console.error('❌ Property extraction failed:', error);
        throw error;
    }
};

export const cloneSite = async (url, organizationId) => {
    // ... (rest of the existing cloneSite function)
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

        // 3. Try OpenAI (Preferred)
        if (keys.openaiKey) {
            try {
                console.log('🤖 Using OpenAI for cloning...');
                const jsonStr = await callOpenAI(keys.openaiKey, simplifiedHtml);
                return JSON.parse(jsonStr);
            } catch (err) {
                console.error('OpenAI failed, trying fallback...', err.message);
            }
        }

        // 4. Try Gemini
        if (keys.geminiKey) {
            try {
                console.log('🤖 Using Gemini for cloning...');
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
                console.error('Gemini failed, trying fallback...', err.message);
            }
        }

        // 5. Try Groq
        if (keys.groqKey) {
            console.log('🤖 Using Groq for cloning...');
            const jsonStr = await callGroq(keys.groqKey, simplifiedHtml);
            return JSON.parse(jsonStr);
        }

        throw new Error('No valid AI API keys found. Please configure OpenAI, Gemini or Groq in Settings.');

    } catch (error) {
        console.error('❌ Error cloning site:', error);
        throw new Error(`${error.message}`);
    }
};
