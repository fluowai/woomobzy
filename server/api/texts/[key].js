import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    const { key } = req.query;

    if (!key) {
         return res.status(400).json({ error: 'Key é obrigatória' });
    }

    // GET - Buscar texto
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('site_texts')
                .select('*')
                .eq('key', key)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({ error: 'Texto não encontrado' });
                }
                return res.status(500).json({ error: 'Erro ao buscar texto' });
            }
            
            return res.json({ success: true, text: data });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao processar texto' });
        }
    }

    // PUT - Atualizar texto
    if (req.method === 'PUT') {
        try {
            const { value } = req.body;
            
            if (!value) {
                return res.status(400).json({ error: 'Valor é obrigatório' });
            }
            
            const { data, error } = await supabase
                .from('site_texts')
                .update({ value, updated_at: new Date().toISOString() })
                .eq('key', key)
                .select()
                .single();
            
            if (error) {
                return res.status(500).json({ error: 'Erro ao atualizar texto' });
            }
            
            return res.json({ success: true, text: data });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao processar atualização' });
        }
    }

    // DELETE - Restaurar padrão
    if (req.method === 'DELETE') {
        try {
            // Buscar o valor padrão
            const { data: textData, error: fetchError } = await supabase
                .from('site_texts')
                .select('default_value')
                .eq('key', key)
                .single();
            
            if (fetchError) {
                return res.status(404).json({ error: 'Texto não encontrado' });
            }
            
            // Restaurar para o valor padrão
            const { data, error } = await supabase
                .from('site_texts')
                .update({ value: textData.default_value, updated_at: new Date().toISOString() })
                .eq('key', key)
                .select()
                .single();
            
            if (error) {
                return res.status(500).json({ error: 'Erro ao restaurar texto' });
            }
            
            return res.json({ success: true, text: data, message: 'Texto restaurado para o valor padrão' });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao processar restauração' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
