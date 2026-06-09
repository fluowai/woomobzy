import { getSupabaseServer } from '../lib/supabase-server.js';

export class ValuationService {
  static async estimateValue(propertyId, orgId, userId) {
    const supabase = getSupabaseServer();

    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('organization_id', orgId)
      .single();

    if (error || !property) throw new Error('Property not found');

    const features = property.features || {};
    const location = features.location || {};
    const legal = features.legal || {};
    const infra = features.infra || {};
    const water = features.water || {};

    const isRural = this._isRural(property);
    const areaHa = parseFloat(features.areaHectares) || 0;
    const areaM2 = parseFloat(features.areaM2) || 0;

    const basePrice = await this._getBasePrice(location.city, location.state, property.type, orgId);

    const rules = await this._loadActiveRules(orgId, property.type);

    let multiplier = 1.0;
    let premiums = 0;
    const factors = [];

    for (const rule of rules) {
      if (this._matchesCondition(features, rule.conditions)) {
        if (rule.rule_type === 'multiplier') {
          multiplier *= Number(rule.value);
          factors.push({ rule: rule.name, type: 'multiplier', value: Number(rule.value) });
        } else if (rule.rule_type === 'premium') {
          premiums += Number(rule.value);
          factors.push({ rule: rule.name, type: 'premium', value: Number(rule.value) });
        } else if (rule.rule_type === 'deduction') {
          multiplier -= Number(rule.value);
          factors.push({ rule: rule.name, type: 'deduction', value: Number(rule.value) });
        }
      }
    }

    let estimatedValue = 0;
    if (isRural) {
      estimatedValue = (basePrice * areaHa * multiplier) + premiums;
    } else {
      const pricePerM2 = await this._getUrbanPricePerM2(location.city, location.neighborhood, orgId);
      const effectiveAreaM2 = areaM2 || areaHa * 10000;
      estimatedValue = (pricePerM2 * effectiveAreaM2 * multiplier) + premiums;
    }

    estimatedValue = Math.round(Math.max(estimatedValue, 1000));

    const valuation = {
      property_id: propertyId,
      organization_id: orgId,
      estimated_value: estimatedValue,
      min_value: Math.round(estimatedValue * 0.85),
      max_value: Math.round(estimatedValue * 1.15),
      confidence: rules.length > 5 ? 0.7 : 0.55,
      method: 'rule_based',
      factors: JSON.stringify(factors),
      breakdown: JSON.stringify({
        base_price: basePrice,
        area_ha: areaHa,
        area_m2: areaM2,
        multiplier: Math.round(multiplier * 100) / 100,
        premiums: premiums,
        is_rural: isRural,
        rules_count: rules.length,
      }),
      rules_applied: rules.map(r => r.id),
      triggered_by: userId,
    };

    const { data: saved, error: insertError } = await supabase
      .from('property_valuations')
      .insert(valuation)
      .select()
      .single();

    if (insertError) throw insertError;
    return saved;
  }

  static async getValuationHistory(propertyId, orgId) {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('property_valuations')
      .select('*')
      .eq('property_id', propertyId)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  static async getComparables(propertyId, orgId) {
    const supabase = getSupabaseServer();

    const { data: property } = await supabase
      .from('properties')
      .select('features, type, price')
      .eq('id', propertyId)
      .eq('organization_id', orgId)
      .single();

    if (!property) throw new Error('Property not found');

    const location = property.features?.location || {};
    const areaHa = parseFloat(property.features?.areaHectares) || 0;

    const { data: comparables } = await supabase
      .from('properties')
      .select('id, title, price, features, type, images, created_at')
      .eq('organization_id', orgId)
      .eq('features->location->>city', location.city)
      .eq('type', property.type)
      .neq('id', propertyId)
      .not('price', 'is', null)
      .limit(10);

    if (!comparables) return [];

    return comparables.map(c => {
      const cArea = parseFloat(c.features?.areaHectares) || 1;
      return {
        id: c.id,
        title: c.title,
        price: c.price,
        price_per_ha: Math.round(c.price / cArea * 100) / 100,
        area_ha: cArea,
        image: c.images?.[0] || null,
        created_at: c.created_at,
        similarity_score: this._calculateSimilarity(property, c),
      };
    }).sort((a, b) => b.similarity_score - a.similarity_score).slice(0, 5);
  }

  static _calculateSimilarity(source, target) {
    let score = 50;
    const sArea = parseFloat(source.features?.areaHectares) || 0;
    const tArea = parseFloat(target.features?.areaHectares) || 0;
    if (sArea > 0 && tArea > 0) {
      const ratio = Math.min(sArea, tArea) / Math.max(sArea, tArea);
      score += ratio * 30;
    }
    if (source.features?.topography === target.features?.topography) score += 5;
    if (source.features?.soilTexture === target.features?.soilTexture) score += 5;
    if (source.features?.infra?.casaSede === target.features?.infra?.casaSede) score += 5;
    const sPrice = source.price || 0;
    const tPrice = target.price || 0;
    if (sPrice > 0 && tPrice > 0) {
      const priceRatio = Math.min(sPrice, tPrice) / Math.max(sPrice, tPrice);
      score += priceRatio * 5;
    }
    return Math.round(score);
  }

  static async _getBasePrice(city, state, propertyType, orgId) {
    const supabase = getSupabaseServer();

    const { data: cache } = await supabase
      .from('external_data_cache')
      .select('data')
      .eq('cache_key', `base_price:${state}:${city}:${propertyType}`)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cache?.data?.price) return cache.data.price;

    const { data: avg } = await supabase
      .from('price_history')
      .select('price_per_ha')
      .in('property_id', supabase
        .from('properties')
        .select('id')
        .eq('features->location->>state', state)
        .eq('features->location->>city', city)
        .eq('type', propertyType)
      )
      .not('price_per_ha', 'is', null)
      .limit(50);

    const prices = (avg || []).map(p => Number(p.price_per_ha)).filter(p => p > 0);
    const meanPrice = prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : propertyType === 'RURAL' ? 15000 : 200;

    await supabase.from('external_data_cache').upsert({
      cache_key: `base_price:${state}:${city}:${propertyType}`,
      source: 'internal_avg',
      data: { price: meanPrice, city, state, property_type: propertyType },
      ttl_seconds: 86400,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }, { onConflict: 'cache_key' });

    return meanPrice;
  }

  static async _getUrbanPricePerM2(city, neighborhood, orgId) {
    const supabase = getSupabaseServer();

    const cacheKey = `price_m2:${city}:${neighborhood || 'geral'}`;
    const { data: cache } = await supabase
      .from('external_data_cache')
      .select('data')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cache?.data?.price) return cache.data.price;

    const { data: avg } = await supabase
      .from('price_history')
      .select('price_per_m2')
      .not('price_per_m2', 'is', null)
      .limit(30);

    const prices = (avg || []).map(p => Number(p.price_per_m2)).filter(p => p > 0);
    const meanPrice = prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 3000;

    await supabase.from('external_data_cache').upsert({
      cache_key: cacheKey,
      source: 'internal_avg',
      data: { price: meanPrice, city, neighborhood },
      ttl_seconds: 86400,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }, { onConflict: 'cache_key' });

    return meanPrice;
  }

  static async _loadActiveRules(orgId, propertyType) {
    const supabase = getSupabaseServer();

    const { data: rules } = await supabase
      .from('valuation_rules')
      .select('*')
      .is('is_active', true)
      .or(`organization_id.is.null,organization_id.eq.${orgId}`)
      .or(`property_type.is.null,property_type.eq.${propertyType}`)
      .order('priority', { ascending: false });

    return rules || [];
  }

  static _matchesCondition(features, conditions) {
    if (!conditions || Object.keys(conditions).length === 0) return true;

    for (const [path, expected] of Object.entries(conditions)) {
      const value = this._getNestedValue(features, path);
      if (value === undefined || value === null) return false;

      if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
        if (expected.min !== undefined && Number(value) < Number(expected.min)) return false;
        if (expected.max !== undefined && Number(value) > Number(expected.max)) return false;
      } else if (typeof expected === 'boolean') {
        if (Boolean(value) !== expected) return false;
      } else if (Array.isArray(expected)) {
        if (!expected.includes(value)) return false;
      } else {
        if (String(value) !== String(expected)) return false;
      }
    }
    return true;
  }

  static _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  static _isRural(property) {
    const ruralTypes = ['Fazenda', 'Sítio', 'Chácara', 'Estância', 'Haras',
      'Granja', 'Agropecuária', 'Terreno Rural', 'Gleba', 'Lote Rural', 'Área Produtiva'];
    return ruralTypes.includes(property.type) || property.type === 'RURAL';
  }
}
