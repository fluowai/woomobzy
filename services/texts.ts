import { supabase } from './supabase';

// Removed duplicate client creation and unsafe process.env usage

// ============================================
// SITE TEXTS SERVICE
// ============================================

/**
 * Busca todos os textos do site
 * @param {string} category - Filtrar por categoria (opcional)
 * @param {string} section - Filtrar por seção (opcional)
 * @returns {Promise<Object>} Objeto com textos em formato chave-valor
 */
export const getAllTexts = async (category = null, section = null) => {
  try {
    let query = supabase.from('site_texts').select('*');
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (section) {
      query = query.eq('section', section);
    }
    
    const { data, error } = await query.order('section', { ascending: true });
    
    if (error) throw error;
    
    // Transformar em objeto chave-valor
    const textsMap = {};
    data.forEach(text => {
      textsMap[text.key] = text.value;
    });
    
    return { texts: textsMap, raw: data };
  } catch (error) {
    console.error('Error fetching texts:', error);
    throw error;
  }
};

/**
 * Busca um texto específico por chave
 * @param {string} key - Chave do texto
 * @returns {Promise<Object>} Dados do texto
 */
export const getTextByKey = async (key) => {
  try {
    const { data, error } = await supabase
      .from('site_texts')
      .select('*')
      .eq('key', key)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error fetching text ${key}:`, error);
    throw error;
  }
};

/**
 * Atualiza um texto específico
 * @param {string} key - Chave do texto
 * @param {string} value - Novo valor
 * @returns {Promise<Object>} Texto atualizado
 */
export const updateText = async (key, value) => {
  try {
    const { data, error } = await supabase
      .from('site_texts')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error updating text ${key}:`, error);
    throw error;
  }
};

/**
 * Atualiza múltiplos textos de uma vez
 * @param {Array} updates - Array de objetos { key, value }
 * @returns {Promise<Object>} Resultado da atualização
 */
export const bulkUpdateTexts = async (updates) => {
  try {
    const results = [];
    const errors = [];
    
    for (const update of updates) {
      try {
        const data = await updateText(update.key, update.value);
        results.push(data);
      } catch (err) {
        errors.push({ key: update.key, error: err.message });
      }
    }
    
    return { results, errors };
  } catch (error) {
    console.error('Error in bulk update:', error);
    throw error;
  }
};

/**
 * Restaura um texto para o valor padrão
 * @param {string} key - Chave do texto
 * @returns {Promise<Object>} Texto restaurado
 */
export const resetTextToDefault = async (key) => {
  try {
    // Buscar o valor padrão
    const { data: textData, error: fetchError } = await supabase
      .from('site_texts')
      .select('default_value')
      .eq('key', key)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Atualizar para o valor padrão
    const { data, error } = await supabase
      .from('site_texts')
      .update({ value: textData.default_value, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error resetting text ${key}:`, error);
    throw error;
  }
};

export const textsService = {
  getAllTexts,
  getTextByKey,
  updateText,
  bulkUpdateTexts,
  resetTextToDefault
};
