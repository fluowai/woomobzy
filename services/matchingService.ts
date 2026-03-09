
import { supabase } from './supabase';
import { Property, Lead } from '../types';

export interface MatchResult {
  property: Property;
  score: number;
  matchReasons: string[];
}

export const matchingService = {
  /**
   * Matches a lead with available properties based on aptitude, area, and localization
   */
  async matchLeadToProperties(lead: Lead): Promise<MatchResult[]> {
    try {
      // Fetch available properties for the lead's organization
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .eq('organization_id', lead.organization_id)
        .eq('status', 'Disponível');

      if (error) throw error;
      if (!properties) return [];

      const results: MatchResult[] = properties.map(property => {
        let score = 0;
        const matchReasons: string[] = [];

        // 1. Aptitude Match (Highest weight)
        if (lead.aptitude_interest && property.aptitude) {
          const commonAptitudes = lead.aptitude_interest.filter(a => property.aptitude.includes(a));
          if (commonAptitudes.length > 0) {
            score += 40 * (commonAptitudes.length / lead.aptitude_interest.length);
            matchReasons.push(`Aptidão compatível: ${commonAptitudes.join(', ')}`);
          }
        }

        // 2. Budget Match
        if (lead.budget && property.price) {
          if (property.price <= lead.budget) {
            score += 30;
            matchReasons.push('Dentro do orçamento');
          } else if (property.price <= lead.budget * 1.2) {
            score += 15;
            matchReasons.push('Ligeiramente acima do orçamento (margem de 20%)');
          }
        }

        // 3. Area Match (If lead has area preferences in JSON)
        const leadAreaMin = lead.preferences?.minArea;
        if (leadAreaMin && property.total_area_ha) {
          if (property.total_area_ha >= leadAreaMin) {
            score += 20;
            matchReasons.push(`Área total (${property.total_area_ha} ha) atende ao mínimo de ${leadAreaMin} ha`);
          }
        }

        // 4. State/Region Match
        if (lead.preferences?.states?.includes(property.state)) {
          score += 10;
          matchReasons.push(`Localizado no estado de preferência: ${property.state}`);
        }

        return {
          property: property as any,
          score,
          matchReasons
        };
      });

      // Filter and Sort by score
      return results
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);

    } catch (error) {
      console.error('Error matching lead to properties:', error);
      return [];
    }
  }
};
