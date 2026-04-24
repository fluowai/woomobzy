/**
 * ContactStore.js — Cache de Contatos em Memória + Persistência no Supabase
 *
 * Responsabilidades:
 * 1. Manter cache em memória para resolução instantânea (O(1))
 * 2. Persistir contatos no Supabase para sobreviver a reinícios
 * 3. Resolver nomes com cascata de fallback: verifiedName → pushName → notify → número
 * 4. Formatar números brasileiros de forma legível
 */

export class ContactStore {
  constructor() {
    // Map<instanceId, Map<jid, ContactData>>
    this.cache = new Map();
  }

  /**
   * Garante que o cache da instância exista
   */
  _ensureInstance(instanceId) {
    if (!this.cache.has(instanceId)) {
      this.cache.set(instanceId, new Map());
    }
    return this.cache.get(instanceId);
  }

  /**
   * Atualiza um contato no cache local (sem DB)
   */
  set(instanceId, jid, data) {
    const store = this._ensureInstance(instanceId);
    const existing = store.get(jid) || {};
    
    // Merge inteligente: só sobrescreve se o valor novo não for nulo/vazio
    const merged = {
      jid,
      push_name: data.pushName || data.push_name || existing.push_name || null,
      verified_name: data.verifiedName || data.verified_name || existing.verified_name || null,
      notify: data.notify || existing.notify || null,
      short_name: data.shortName || data.short_name || existing.short_name || null,
      profile_photo_url: data.profilePictureUrl || data.profile_photo_url || existing.profile_photo_url || null,
      is_business: data.isBusiness ?? existing.is_business ?? false,
      // NOVO: Link entre LID e PN para resolução cross-data
      linked_jid: data.linkedJid || data.linked_jid || existing.linked_jid || null,
      updated_at: new Date().toISOString(),
    };
    
    // Se recebemos um mapeamento explícito (ex: JID é LID e temos o PN), salvamos cruzado
    if (data.linkedJid && data.linkedJid !== jid) {
       // Opcional: Criar entrada para o JID espelho também para garantir resolução nos dois sentidos
    }

    store.set(jid, merged);
    return merged;
  }

  /**
   * Obtém contato do cache
   */
  get(instanceId, jid) {
    const store = this.cache.get(instanceId);
    return store?.get(jid) || null;
  }

  /**
   * Resolve o melhor nome disponível para um JID
   * Cascata: verifiedName → pushName → notify → shortName → null (para permitir fallback superior)
   */
  resolveName(instanceId, jid, fallbackPushName = null) {
    const contact = this.get(instanceId, jid);
    
    // Cascata de resolução
    const name = 
      contact?.verified_name ||
      contact?.push_name ||
      fallbackPushName ||
      contact?.notify ||
      contact?.short_name ||
      null;

    // Filtra valores inválidos
    if (name && name !== '~' && name.trim() !== '') {
      return name;
    }

    // Se for um LID (15 dígitos), não retornamos o número como nome
    // para que a API/UI possa usar um fallback como "Membro" ou buscar no Lead
    const isLid = jid.includes('@lid') || (jid.split('@')[0].length >= 15 && !jid.includes('@g.us'));
    if (isLid) return null;

    // Último recurso para PNs reais: formatar número
    return this.formatNumber(jid);
  }

  /**
   * Resolve nomes para uma lista de JIDs mencionados
   */
  resolveMentions(instanceId, mentionedJids) {
    if (!Array.isArray(mentionedJids) || mentionedJids.length === 0) return [];

    return mentionedJids.map(jid => ({
      jid,
      number: jid.split('@')[0],
      name: this.resolveName(instanceId, jid),
    }));
  }

  /**
   * Formata JID como número de telefone legível
   */
  formatNumber(jid) {
    if (!jid) return 'Desconhecido';
    
    const parts = jid.split('@')[0].split(':');
    const raw = parts[0].replace(/\D/g, '');
    
    // Detecção de LID (15 dígitos) ou JID de sistema
    if (jid.includes('@lid') || raw.length >= 15) {
      return null; // Indica que não é um número de telefone formatável
    }

    if (!raw || raw.length < 8) return `+${raw || '?'}`;

    // Formato brasileiro: 55 + DDD(2) + número(8-9)
    if (raw.startsWith('55') && (raw.length === 12 || raw.length === 13)) {
      const ddd = raw.slice(2, 4);
      const number = raw.slice(4);
      if (number.length === 9) {
        return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
      }
      return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }

    // Formato genérico internacional
    return `+${raw}`;
  }

  /**
   * Processa batch de contatos vindos do Baileys (contacts.upsert / contacts.update)
   * Retorna array de objetos prontos para upsert no Supabase
   */
  processBatch(instanceId, contacts) {
    const results = [];

    for (const contact of contacts) {
      const jid = contact.id || contact.jid;
      if (!jid || jid === 'status@broadcast' || jid.includes('@newsletter')) continue;

      const merged = this.set(instanceId, jid, {
        pushName: contact.name || contact.pushName,
        verifiedName: contact.verifiedName,
        notify: contact.notify,
        shortName: contact.shortName,
        isBusiness: contact.isBusiness,
      });

      results.push({
        instance_id: instanceId,
        ...merged,
      });
    }

    return results;
  }

  /**
   * Carrega contatos do banco para o cache (chamado no boot)
   */
  async loadFromDB(instanceId, supabase) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .eq('instance_id', instanceId);

      if (error) {
        console.warn(`[ContactStore] Erro ao carregar contatos do DB para ${instanceId}:`, error.message);
        return;
      }

      const store = this._ensureInstance(instanceId);
      for (const contact of (data || [])) {
        store.set(contact.jid, contact);
      }
      console.log(`[ContactStore] ✅ ${(data || []).length} contatos carregados do DB para ${instanceId}`);
    } catch (e) {
      console.error('[ContactStore] Erro fatal loadFromDB:', e.message);
    }
  }

  /**
   * Persiste contatos no Supabase (batch upsert)
   */
  async persistToDB(instanceId, contacts, supabase) {
    if (!contacts || contacts.length === 0) return;

    try {
      // Supabase upsert com on conflict
      const { error } = await supabase
        .from('whatsapp_contacts')
        .upsert(contacts, { 
          onConflict: 'instance_id,jid',
          ignoreDuplicates: false 
        });

      if (error) {
        console.warn(`[ContactStore] Erro ao persistir ${contacts.length} contatos:`, error.message);
      } else {
        console.log(`[ContactStore] 💾 ${contacts.length} contatos salvos no DB para ${instanceId}`);
      }
    } catch (e) {
      console.error('[ContactStore] Erro fatal persistToDB:', e.message);
    }
  }

  /**
   * Limpa cache de uma instância
   */
  clear(instanceId) {
    this.cache.delete(instanceId);
  }

  /**
   * Stats para debug
   */
  getStats(instanceId) {
    const store = this.cache.get(instanceId);
    return {
      totalContacts: store?.size || 0,
      withName: store ? [...store.values()].filter(c => c.push_name || c.verified_name).length : 0,
    };
  }
}
