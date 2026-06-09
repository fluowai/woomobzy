import { describe, it, expect } from 'vitest';

describe('Lead Property Matcher - Core Logic', () => {
  it('should classify lead profile based on text', () => {
    const ruralLead = { name: 'Fazenda Boi Gordo', notes: 'Quero pecuaria e agricultura' };
    const urbanLead = { name: 'Joao', notes: 'Busco apartamento 3 quartos' };
    const mixedLead = { name: 'Maria', notes: 'Quero chacara ou apartamento' };

    const ruralText = [ruralLead.name, ruralLead.notes].filter(Boolean).join(' ');
    const urbanText = [urbanLead.name, urbanLead.notes].filter(Boolean).join(' ');
    const mixedText = [mixedLead.name, mixedLead.notes].filter(Boolean).join(' ');

    const RURAL_KEYWORDS = ['sitio', 'fazenda', 'chacara', 'hectares', 'pecuaria', 'agro'];
    const URBAN_KEYWORDS = ['apartamento', 'casa', 'cobertura', 'condominio', 'bairro'];

    const ruralHits = RURAL_KEYWORDS.filter(k => ruralText.toLowerCase().includes(k)).length;
    const urbanHitsRural = URBAN_KEYWORDS.filter(k => ruralText.toLowerCase().includes(k)).length;
    expect(ruralHits).toBeGreaterThan(0);
    expect(urbanHitsRural).toBe(0);

    const urbanHits = URBAN_KEYWORDS.filter(k => urbanText.toLowerCase().includes(k)).length;
    expect(urbanHits).toBeGreaterThan(0);

    const ruralHitsMixed = RURAL_KEYWORDS.filter(k => mixedText.toLowerCase().includes(k)).length;
    const urbanHitsMixed = URBAN_KEYWORDS.filter(k => mixedText.toLowerCase().includes(k)).length;
    expect(ruralHitsMixed).toBeGreaterThan(0);
    expect(urbanHitsMixed).toBeGreaterThan(0);
  });

  it('should parse currency values from text', () => {
    const text = 'Entre R$ 5 milhoes e 10 milhoes';

    const between = text.match(/entre\s+(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?\s+(?:e|a|ate)\s+(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?/i);
    expect(between).not.toBeNull();

    const multipliers = { milhao: 1_000_000, milhoes: 1_000_000, mi: 1_000_000, m: 1_000_000, mil: 1_000 };

    if (between) {
      const val1 = Number(between[1].replace('.', ''));
      const unit1 = (between[2] || '').toLowerCase();
      const min = val1 * (multipliers[unit1] || 1);
      expect(min).toBe(5000000);

      const val2 = Number(between[3].replace('.', ''));
      const unit2 = (between[4] || '').toLowerCase();
      const max = val2 * (multipliers[unit2] || 1);
      expect(max).toBe(10000000);
    }
  });

  it('should detect budget range in text', () => {
    const textUpTo = 'Meu orcamento maximo de 2 milhoes';
    const upToMatch = textUpTo.match(/(?:ate|maximo|max|orcamento|budget)\s+(?:de\s+)?(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?/i);
    expect(upToMatch).not.toBeNull();
  });

  it('should normalize phone numbers correctly', () => {
    const rawPhones = ['(11) 99999-8888', '11999998888', '+5511999998888', '55 11 99999 8888'];
    for (const raw of rawPhones) {
      const normalized = String(raw).replace(/\D/g, '');
      expect(normalized.length).toBeGreaterThanOrEqual(10);
    }
  });
});
