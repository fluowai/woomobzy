import type { PostgrestError } from '@supabase/supabase-js';

export type LeadMatchProfile = 'urbano' | 'rural' | 'misto' | 'indefinido';

export const URBAN_LEAD_OR_FILTER = 'match_profile.eq.urbano,match_profile.is.null';
export const RURAL_LEAD_OR_FILTER = 'match_profile.eq.rural,match_profile.is.null';

type LeadNicheQueryResult = {
  data: unknown;
  error: PostgrestError | null;
  [key: string]: unknown;
};

type LeadNicheQuery = PromiseLike<LeadNicheQueryResult> & {
  or(filter: string): LeadNicheQuery;
};

export function isUrbanLead(lead: { match_profile?: LeadMatchProfile | null }) {
  return !lead.match_profile || lead.match_profile === 'urbano';
}

export function isRuralLead(lead: { match_profile?: LeadMatchProfile | null }) {
  return !lead.match_profile || lead.match_profile === 'rural';
}

export function applyUrbanLeadFilter<T extends LeadNicheQuery>(query: T): T {
  return query.or(URBAN_LEAD_OR_FILTER) as T;
}

export function applyRuralLeadFilter<T extends LeadNicheQuery>(query: T): T {
  return query.or(RURAL_LEAD_OR_FILTER) as T;
}

export function isMissingMatchProfileColumnError(error: PostgrestError | null | undefined) {
  if (!error) return false;

  const message = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();
  const hint = String(error.hint || '').toLowerCase();
  const combined = `${message} ${details} ${hint}`;

  return (
    error.code === 'PGRST204' ||
    combined.includes('match_profile') ||
    combined.includes('schema cache')
  );
}

export async function runLeadNicheQuery<T>(
  buildFilteredQuery: () => LeadNicheQuery,
  filterRows: (rows: T[]) => T[]
) {
  const filteredResult = await buildFilteredQuery();
  if (!filteredResult.error) {
    return filteredResult;
  }

  if (!isMissingMatchProfileColumnError(filteredResult.error)) {
    return filteredResult;
  }

  const fallbackQuery = buildFilteredQuery();
  const fallbackResult = await fallbackQuery;
  if (fallbackResult.error || !Array.isArray(fallbackResult.data)) {
    return fallbackResult;
  }

  return {
    ...fallbackResult,
    data: filterRows(fallbackResult.data as T[]),
  };
}
