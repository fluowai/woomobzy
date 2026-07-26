/**
 * serper-client.js
 * Cliente HTTP para Serper.dev API (Google Search / Places)
 */

const SERPER_BASE = 'https://google.serper.dev';

export async function searchSerper(apiKey, { query, gl = 'br', hl = 'pt-br', num = 20, type = 'places' }) {
  if (!apiKey) throw new Error('Serper API key não configurada');

  const endpoint = type === 'places' ? '/places' : '/search';
  const body = { q: query, gl, hl, num };

  const res = await fetch(`${SERPER_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Serper API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();

  if (type === 'places') {
    return (data.places || []).map(normalizePlace);
  }

  return (data.organic || []).map(normalizeOrganic);
}

function normalizePlace(p) {
  const phone = extractPhone(p.phoneNumber || p.phone || '');
  return {
    name: p.title || '',
    phone,
    address: p.address || '',
    website: p.website || '',
    cid: p.cid || '',
    rating: p.rating || 0,
    reviews: p.reviewsCount || 0,
    category: p.category || '',
    openingHours: p.openingHours || null,
    position: p.position || 0,
    data: p,
  };
}

function normalizeOrganic(o) {
  return {
    name: o.title || '',
    phone: '',
    address: '',
    website: o.link || '',
    snippet: o.snippet || '',
    displayedLink: o.displayedLink || '',
    position: o.position || 0,
    data: o,
  };
}

function extractPhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10) return `+${digits.startsWith('55') ? '' : '55'}${digits}`;
  return raw;
}

export async function resolveSerperApiKey(supabase, organizationId) {
  // 1. Check org's site_settings.integrations.serper.apiKey
  const { data: settings } = await supabase
    .from('site_settings')
    .select('integrations')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const orgKey = settings?.integrations?.serper?.apiKey;
  if (orgKey) return orgKey;

  // 2. Fallback: mega admin global key from env
  return process.env.SERPER_API_KEY || null;
}
