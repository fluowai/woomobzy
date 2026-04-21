import { supabase } from './supabase';
import {
  LandingPage,
  LandingPageStatus,
  CreateLandingPageInput,
  UpdateLandingPageInput,
  PropertySelectionConfig,
  SavedBlock,
  LandingPageAnalyticsEvent,
  LandingPageAnalytics,
  AnalyticsEventType,
  Block,
} from '../types/landingPage';
import { Property } from '../types';

// ============================================
// LANDING PAGE SERVICE
// ============================================

export const landingPageService = {
  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Lista todas as landing pages da organização ou do usuário
   */
  async list(): Promise<LandingPage[]> {
    console.log('📋 [LandingPageService] Listando todas as páginas');

    let query = supabase.from('landing_pages').select('*');

    const { data, error } = await query.order('updated_at', {
      ascending: false,
    });

    if (error) {
      console.error('❌ [LandingPageService] Erro ao listar:', error);
      throw error;
    }

    console.log(
      `✅ [LandingPageService] Encontradas ${data?.length || 0} páginas`
    );
    if (data && data.length > 0) {
      console.log('📄 Primeira página:', data[0]);
    }

    return data.map(mapToModel);
  },

  /**
   * Busca landing page por ID
   */
  async getById(id: string): Promise<LandingPage> {
    const { data, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapToModel(data);
  },

  /**
   * Busca landing page por slug (para visualização pública)
   */
  async getBySlug(slug: string): Promise<LandingPage> {
    const { data, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('slug', slug)
      .eq('status', LandingPageStatus.PUBLISHED)
      .single();

    if (error) throw error;
    return mapToModel(data);
  },

  /**
   * Cria uma nova landing page
   */
  async create(input: CreateLandingPageInput): Promise<LandingPage> {
    // Gera slug único se não fornecido
    let slug = input.slug;
    if (!slug) {
      slug = generateSlug(input.name);
    }

    // Verifica se slug já existe
    const { data: existing } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const payload = mapToDatabase({ ...input, slug });

    const { data, error } = await supabase
      .from('landing_pages')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return mapToModel(data);
  },

  /**
   * Atualiza uma landing page existente
   */
  async update(
    id: string,
    input: UpdateLandingPageInput
  ): Promise<LandingPage> {
    console.log('🗄️ [LandingPageService] Atualizando página:', id);
    const payload = mapToDatabase(input);
    console.log(
      '📦 [LandingPageService] Payload:',
      JSON.stringify(payload).substring(0, 200) + '...'
    );

    const { data, error } = await supabase
      .from('landing_pages')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ [LandingPageService] Erro no Supabase:', error);
      throw error;
    }

    console.log('✅ [LandingPageService] Atualizado no banco!');
    return mapToModel(data);
  },

  /**
   * Deleta uma landing page
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('landing_pages')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Duplica uma landing page
   */
  async duplicate(id: string): Promise<LandingPage> {
    const original = await this.getById(id);

    const duplicate: CreateLandingPageInput = {
      ...original,
      name: `${original.name} (Cópia)`,
      slug: `${original.slug}-copy-${Date.now()}`,
      status: LandingPageStatus.DRAFT,
      publishedAt: undefined,
    };

    return this.create(duplicate);
  },

  // ============================================
  // PUBLICATION
  // ============================================

  /**
   * Publica uma landing page
   */
  async publish(id: string): Promise<LandingPage> {
    const { data, error } = await supabase
      .from('landing_pages')
      .update({
        status: LandingPageStatus.PUBLISHED,
        published_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToModel(data);
  },

  /**
   * Despublica uma landing page
   */
  async unpublish(id: string): Promise<LandingPage> {
    const { data, error } = await supabase
      .from('landing_pages')
      .update({
        status: LandingPageStatus.DRAFT,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToModel(data);
  },

  /**
   * Arquiva uma landing page
   */
  async archive(id: string): Promise<LandingPage> {
    const { data, error } = await supabase
      .from('landing_pages')
      .update({
        status: LandingPageStatus.ARCHIVED,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToModel(data);
  },

  // ============================================
  // PROPERTY SELECTION
  // ============================================

  /**
   * Obtém os imóveis selecionados para uma landing page
   */
  async getPageProperties(pageId: string): Promise<Property[]> {
    const page = await this.getById(pageId);
    const config = page.propertySelection;

    let query = supabase.from('properties').select('*');

    // Modo Manual: IDs específicos
    if (
      config.mode === 'manual' &&
      config.propertyIds &&
      config.propertyIds.length > 0
    ) {
      query = query.in('id', config.propertyIds);
    }
    // Modo Filtro: Aplicar filtros
    else if (config.mode === 'filter' && config.filters) {
      const filters = config.filters;

      if (filters.type && filters.type.length > 0) {
        query = query.in('type', filters.type);
      }
      if (filters.purpose && filters.purpose.length > 0) {
        query = query.in('purpose', filters.purpose);
      }
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.city && filters.city.length > 0) {
        query = query.in('city', filters.city);
      }
      if (filters.state && filters.state.length > 0) {
        query = query.in('state', filters.state);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.highlighted !== undefined) {
        query = query.eq('highlighted', filters.highlighted);
      }
    }
    // Modo All: Todos os imóveis disponíveis
    else {
      query = query.eq('status', 'Disponível');
    }

    // Ordenação
    if (config.sortBy) {
      const ascending = config.sortOrder === 'asc';

      switch (config.sortBy) {
        case 'price':
          query = query.order('price', { ascending });
          break;
        case 'area':
          query = query.order('features->areaHectares', { ascending });
          break;
        case 'date':
          query = query.order('created_at', { ascending });
          break;
        case 'random':
          // Para random, pegamos todos e embaralhamos no cliente
          break;
      }
    }

    // Limite
    if (config.limit) {
      query = query.limit(config.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Se for random, embaralhar
    if (config.sortBy === 'random' && data) {
      return shuffleArray(data);
    }

    return data || [];
  },

  /**
   * Atualiza a configuração de seleção de imóveis
   */
  async updatePropertySelection(
    pageId: string,
    config: PropertySelectionConfig
  ): Promise<void> {
    const { error } = await supabase
      .from('landing_pages')
      .update({
        property_selection: config,
      })
      .eq('id', pageId);

    if (error) throw error;
  },

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Registra uma visualização de página
   */
  async trackView(
    pageId: string,
    visitorData: Partial<LandingPageAnalyticsEvent>
  ): Promise<void> {
    // Incrementa contador
    await supabase.rpc('increment_landing_page_views', { page_id: pageId });

    // Registra evento
    await this.trackEvent(pageId, AnalyticsEventType.VIEW, visitorData);
  },

  /**
   * Registra um evento genérico
   */
  async trackEvent(
    pageId: string,
    eventType: AnalyticsEventType,
    visitorData: Partial<LandingPageAnalyticsEvent>
  ): Promise<void> {
    const { error } = await supabase.from('landing_page_analytics').insert({
      landing_page_id: pageId,
      event_type: eventType,
      visitor_id: visitorData.visitorId || generateVisitorId(),
      ip_address: visitorData.ipAddress,
      user_agent: visitorData.userAgent,
      referrer: visitorData.referrer,
      event_data: visitorData.eventData,
      country: visitorData.country,
      city: visitorData.city,
    });

    if (error) console.error('Error tracking event:', error);
  },

  /**
   * Registra conversão de lead
   */
  async trackLead(pageId: string, leadData: any): Promise<void> {
    // Incrementa contador de leads
    await supabase.rpc('increment_landing_page_leads', { page_id: pageId });

    // Registra evento
    await this.trackEvent(pageId, AnalyticsEventType.FORM_SUBMIT, {
      eventData: leadData,
      visitorId: leadData.visitorId || generateVisitorId(),
    });
  },

  /**
   * Obtém analytics de uma landing page
   */
  async getAnalytics(
    pageId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<LandingPageAnalytics> {
    const page = await this.getById(pageId);

    let query = supabase
      .from('landing_page_analytics')
      .select('*')
      .eq('landing_page_id', pageId);

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data: events, error } = await query;

    if (error) throw error;

    // Processar dados
    const totalViews =
      events?.filter((e) => e.event_type === 'view').length || 0;
    const totalLeads =
      events?.filter((e) => e.event_type === 'form_submit').length || 0;
    const conversionRate = totalViews > 0 ? (totalLeads / totalViews) * 100 : 0;

    // Agrupar por data
    const viewsByDate = groupByDate(
      events?.filter((e) => e.event_type === 'view') || []
    ).map((item) => ({ date: item.date, count: Number(item.count) }));
    const leadsByDate = groupByDate(
      events?.filter((e) => e.event_type === 'form_submit') || []
    ).map((item) => ({ date: item.date, count: Number(item.count) }));

    // Top referrers
    const topReferrers = countByField(events || [], 'referrer').map(
      (item: any) => ({ referrer: item.referrer, count: item.count })
    ) as Array<{ referrer: string; count: number }>;

    // Top countries
    const topCountries = countByField(events || [], 'country').map(
      (item: any) => ({ country: item.country, count: item.count })
    ) as Array<{ country: string; count: number }>;

    // Events by type
    const eventsByType = countByField(events || [], 'event_type').map(
      (item: any) => ({ type: item.event_type, count: item.count })
    ) as Array<{ type: string; count: number }>;

    return {
      totalViews,
      totalLeads,
      conversionRate,
      viewsByDate,
      leadsByDate,
      topReferrers,
      topCountries,
      eventsByType,
    };
  },

  // ============================================
  // SAVED BLOCKS
  // ============================================

  /**
   * Salva um bloco para reutilização
   */
  async saveBlock(block: Block, name: string): Promise<SavedBlock> {
    const { data, error } = await supabase
      .from('landing_page_blocks')
      .insert({
        name,
        type: block.type,
        config: block.config,
        is_template: false,
      })
      .select()
      .single();

    if (error) throw error;
    return mapBlockToModel(data);
  },

  /**
   * Lista blocos salvos
   */
  async getSavedBlocks(): Promise<SavedBlock[]> {
    const { data, error } = await supabase
      .from('landing_page_blocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapBlockToModel);
  },

  /**
   * Deleta um bloco salvo
   */
  async deleteSavedBlock(id: string): Promise<void> {
    const { error } = await supabase
      .from('landing_page_blocks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ============================================
// MAPPERS
// ============================================

const mapToModel = (dbItem: any): LandingPage => ({
  id: dbItem.id,
  organizationId: dbItem.organization_id,
  userId: dbItem.user_id,
  name: dbItem.name,
  slug: dbItem.slug,
  title: dbItem.title,
  description: dbItem.description,
  metaTitle: dbItem.meta_title,
  metaDescription: dbItem.meta_description,
  metaKeywords: dbItem.meta_keywords,
  ogImage: dbItem.og_image,
  templateId: dbItem.template_id,
  themeConfig: dbItem.theme_config,
  blocks: dbItem.blocks || [],
  settings: dbItem.settings,
  propertySelection: dbItem.property_selection,
  formConfig: dbItem.form_config,
  status: dbItem.status as LandingPageStatus,
  publishedAt: dbItem.published_at,
  viewsCount: dbItem.views_count || 0,
  leadsCount: dbItem.leads_count || 0,
  customCss: dbItem.custom_css,
  customJs: dbItem.custom_js,
  customHead: dbItem.custom_head,
  createdAt: dbItem.created_at,
  updatedAt: dbItem.updated_at,
});

const mapToDatabase = (model: Partial<LandingPage>): any => {
  const db: any = {};

  if (model.organizationId !== undefined)
    db.organization_id = model.organizationId;
  if (model.userId !== undefined) db.user_id = model.userId;
  if (model.name !== undefined) db.name = model.name;
  if (model.slug !== undefined) db.slug = model.slug;
  if (model.title !== undefined) db.title = model.title;
  if (model.description !== undefined) db.description = model.description;
  if (model.metaTitle !== undefined) db.meta_title = model.metaTitle;
  if (model.metaDescription !== undefined)
    db.meta_description = model.metaDescription;
  if (model.metaKeywords !== undefined) db.meta_keywords = model.metaKeywords;
  if (model.ogImage !== undefined) db.og_image = model.ogImage;
  if (model.templateId !== undefined) db.template_id = model.templateId;
  if (model.themeConfig !== undefined) db.theme_config = model.themeConfig;
  if (model.blocks !== undefined) db.blocks = model.blocks;
  if (model.settings !== undefined) db.settings = model.settings;
  if (model.propertySelection !== undefined)
    db.property_selection = model.propertySelection;
  if (model.formConfig !== undefined) db.form_config = model.formConfig;
  if (model.status !== undefined) db.status = model.status;
  if (model.publishedAt !== undefined) db.published_at = model.publishedAt;
  if (model.customCss !== undefined) db.custom_css = model.customCss;
  if (model.customJs !== undefined) db.custom_js = model.customJs;
  if (model.customHead !== undefined) db.custom_head = model.customHead;

  return db;
};

const mapBlockToModel = (dbItem: any): SavedBlock => ({
  id: dbItem.id,
  organizationId: dbItem.organization_id,
  name: dbItem.name,
  type: dbItem.type,
  config: dbItem.config,
  thumbnail: dbItem.thumbnail,
  isTemplate: dbItem.is_template,
  usageCount: dbItem.usage_count || 0,
  createdAt: dbItem.created_at,
  updatedAt: dbItem.updated_at,
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateVisitorId(): string {
  return `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function groupByDate(events: any[]): Array<{ date: string; count: number }> {
  const grouped = events.reduce(
    (acc, event) => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count: Number(count) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function countByField(
  events: any[],
  field: string
): Array<{ [key: string]: any; count: number }> {
  const counted = events.reduce(
    (acc, event) => {
      const value = event[field] || 'Unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counted)
    .map(([key, count]) => ({ [field]: key, count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
