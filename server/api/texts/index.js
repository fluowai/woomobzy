import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    const { key, action } = req.query;

    // --- BULK OPERATIONS (POST /api/texts?action=bulk) ---
    if (req.method === 'POST' && action === 'bulk') {
        try {
            const { updates } = req.body;
            if (!Array.isArray(updates) || updates.length === 0) {
                return res.status(400).json({ error: 'Updates deve ser um array não vazio' });
            }
            
            const results = [];
            const errors = [];
            
            for (const update of updates) {
                try {
                    const { data, error } = await supabase
                        .from('site_texts')
                        .update({ value: update.value, updated_at: new Date().toISOString() })
                        .eq('key', update.key)
                        .select()
                        .single();
                    
                    if (error) errors.push({ key: update.key, error: error.message });
                    else results.push(data);
                } catch (err) {
                    errors.push({ key: update.key, error: err.message });
                }
            }
            
            return res.json({ success: true, updated: results.length, errors: errors.length, results, errorDetails: errors });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao processar atualização em massa' });
        }
    }

    // --- SEED OPERATION (POST /api/texts?action=seed) ---
    if (req.method === 'POST' && action === 'seed') {
        try {
            const { count } = await supabase.from('site_texts').select('*', { count: 'exact', head: true });
            if (count > 0) return res.status(400).json({ error: 'Textos já existem no banco.' });
            return res.json({ success: true, message: 'Execute o arquivo seed_site_texts.sql no Supabase' });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao processar seed' });
        }
    }

    // --- SINGLE TEXT OPERATIONS (GET/PUT/DELETE /api/texts?key=...) ---
    if (key) {
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('site_texts').select('*').eq('key', key).single();
            if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: 'Erro ao buscar texto' });
            return res.json({ success: true, text: data });
        }

        if (req.method === 'PUT') {
            const { value } = req.body;
            if (!value) return res.status(400).json({ error: 'Valor é obrigatório' });
            const { data, error } = await supabase.from('site_texts').update({ value, updated_at: new Date().toISOString() }).eq('key', key).select().single();
            if (error) return res.status(500).json({ error: 'Erro ao atualizar texto' });
            return res.json({ success: true, text: data });
        }

        if (req.method === 'DELETE') {
            const { data: textData, error: fetchError } = await supabase.from('site_texts').select('default_value').eq('key', key).single();
            if (fetchError) return res.status(404).json({ error: 'Texto não encontrado' });
            const { data, error } = await supabase.from('site_texts').update({ value: textData.default_value, updated_at: new Date().toISOString() }).eq('key', key).select().single();
            if (error) return res.status(500).json({ error: 'Erro ao restaurar texto' });
            return res.json({ success: true, text: data });
        }
    }

    // --- LIST OPERATION (GET /api/texts) ---
    if (req.method === 'GET') {
        try {
            const { category, section } = req.query;
            let query = supabase.from('site_texts').select('*');
            if (category) query = query.eq('category', category);
            if (section) query = query.eq('section', section);
            const { data, error } = await query.order('section', { ascending: true });
            
            if (error) return res.status(500).json({ error: 'Erro ao buscar textos' });
            const textsMap = {};
            data.forEach(text => { textsMap[text.key] = text.value; });
            return res.json({ success: true, texts: textsMap, raw: data });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao processar textos' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
