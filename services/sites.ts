import { logger } from '@/utils/logger';
import { supabase } from './supabase';
import {
  Site,
  SitePage,
  SiteMenuItem,
  SiteTemplate,
  UpdateSiteInput,
  CreateSitePageInput,
  UpdateSitePageInput,
} from '../types/site';
import { v4 as uuidv4 } from 'uuid';

const mapSiteFromDB = (dbItem: any): Site => ({
  id: dbItem.id,
  organizationId: dbItem.organization_id,
  name: dbItem.name || 'Meu Site',
  isActive: dbItem.is_active ?? true,
  logoUrl: dbItem.logo_url,
  faviconUrl: dbItem.favicon_url,
  globalTheme: dbItem.global_theme || {},
  globalHeader: dbItem.global_header || [],
  globalFooter: dbItem.global_footer || [],
  menuConfig: dbItem.menu_config || [],
  contactInfo: dbItem.contact_info || {},
  socialLinks: dbItem.social_links || {},
  customCss: dbItem.custom_css,
  customJs: dbItem.custom_js,
  customHead: dbItem.custom_head,
  createdAt: dbItem.created_at,
  updatedAt: dbItem.updated_at,
});

const mapSiteToDB = (model: Partial<Site>): any => {
  const db: any = {};
  if (model.name !== undefined) db.name = model.name;
  if (model.isActive !== undefined) db.is_active = model.isActive;
  if (model.logoUrl !== undefined) db.logo_url = model.logoUrl;
  if (model.faviconUrl !== undefined) db.favicon_url = model.faviconUrl;
  if (model.globalTheme !== undefined) db.global_theme = model.globalTheme;
  if (model.globalHeader !== undefined) db.global_header = model.globalHeader;
  if (model.globalFooter !== undefined) db.global_footer = model.globalFooter;
  if (model.menuConfig !== undefined) db.menu_config = model.menuConfig;
  if (model.contactInfo !== undefined) db.contact_info = model.contactInfo;
  if (model.socialLinks !== undefined) db.social_links = model.socialLinks;
  if (model.customCss !== undefined) db.custom_css = model.customCss;
  if (model.customJs !== undefined) db.custom_js = model.customJs;
  if (model.customHead !== undefined) db.custom_head = model.customHead;
  return db;
};

const mapPageFromDB = (dbItem: any): SitePage => ({
  id: dbItem.id,
  siteId: dbItem.site_id,
  title: dbItem.title,
  slug: dbItem.slug,
  sortOrder: dbItem.sort_order || 0,
  blocks: dbItem.blocks || [],
  themeOverrides: dbItem.theme_overrides || {},
  metaTitle: dbItem.meta_title,
  metaDescription: dbItem.meta_description,
  metaKeywords: dbItem.meta_keywords || [],
  ogImage: dbItem.og_image,
  status: dbItem.status || 'draft',
  isHome: dbItem.is_home || false,
  customCss: dbItem.custom_css,
  customJs: dbItem.custom_js,
  createdAt: dbItem.created_at,
  updatedAt: dbItem.updated_at,
});

const mapPageToDB = (model: Partial<SitePage>): any => {
  const db: any = {};
  if (model.siteId !== undefined) db.site_id = model.siteId;
  if (model.title !== undefined) db.title = model.title;
  if (model.slug !== undefined) db.slug = model.slug;
  if (model.sortOrder !== undefined) db.sort_order = model.sortOrder;
  if (model.blocks !== undefined) db.blocks = model.blocks;
  if (model.themeOverrides !== undefined)
    db.theme_overrides = model.themeOverrides;
  if (model.metaTitle !== undefined) db.meta_title = model.metaTitle;
  if (model.metaDescription !== undefined)
    db.meta_description = model.metaDescription;
  if (model.metaKeywords !== undefined) db.meta_keywords = model.metaKeywords;
  if (model.ogImage !== undefined) db.og_image = model.ogImage;
  if (model.status !== undefined) db.status = model.status;
  if (model.isHome !== undefined) db.is_home = model.isHome;
  if (model.customCss !== undefined) db.custom_css = model.customCss;
  if (model.customJs !== undefined) db.custom_js = model.customJs;
  return db;
};

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'pagina'
  );
}

export const siteService = {
  async getByOrganization(orgId: string): Promise<Site | null> {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) {
      logger.error('[SiteService] Erro ao buscar site:', error);
      throw error;
    }

    return data ? mapSiteFromDB(data) : null;
  },

  async getById(id: string): Promise<Site> {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapSiteFromDB(data);
  },

  async update(id: string, input: UpdateSiteInput): Promise<Site> {
    const payload = mapSiteToDB(input);
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('sites')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapSiteFromDB(data);
  },

  async listPages(siteId: string): Promise<SitePage[]> {
    const { data, error } = await supabase
      .from('site_pages')
      .select('*')
      .eq('site_id', siteId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapPageFromDB);
  },

  async getPageById(pageId: string): Promise<SitePage> {
    const { data, error } = await supabase
      .from('site_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (error) throw error;
    return mapPageFromDB(data);
  },

  async getPageBySlug(siteId: string, slug: string): Promise<SitePage | null> {
    const { data, error } = await supabase
      .from('site_pages')
      .select('*')
      .eq('site_id', siteId)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw error;
    return data ? mapPageFromDB(data) : null;
  },

  async getHomePage(siteId: string): Promise<SitePage | null> {
    const { data, error } = await supabase
      .from('site_pages')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_home', true)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw error;
    return data ? mapPageFromDB(data) : null;
  },

  async createPage(input: CreateSitePageInput): Promise<SitePage> {
    let slug = input.slug;
    if (!slug) {
      slug = generateSlug(input.title || 'pagina');
    }

    const { data: existing } = await supabase
      .from('site_pages')
      .select('id')
      .eq('site_id', input.siteId)
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const payload = mapPageToDB({ ...input, slug });
    payload.site_id = input.siteId;

    const { data, error } = await supabase
      .from('site_pages')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return mapPageFromDB(data);
  },

  async updatePage(
    pageId: string,
    input: UpdateSitePageInput
  ): Promise<SitePage> {
    const payload = mapPageToDB(input);
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('site_pages')
      .update(payload)
      .eq('id', pageId)
      .select()
      .single();

    if (error) throw error;
    return mapPageFromDB(data);
  },

  async deletePage(pageId: string): Promise<void> {
    const { error } = await supabase
      .from('site_pages')
      .delete()
      .eq('id', pageId);

    if (error) throw error;
  },

  async reorderPages(siteId: string, pageIds: string[]): Promise<void> {
    const updates = pageIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    const { error } = await supabase
      .from('site_pages')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;
  },

  async publishPage(pageId: string): Promise<SitePage> {
    const { data, error } = await supabase
      .from('site_pages')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', pageId)
      .select()
      .single();

    if (error) throw error;
    return mapPageFromDB(data);
  },

  async unpublishPage(pageId: string): Promise<SitePage> {
    const { data, error } = await supabase
      .from('site_pages')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('id', pageId)
      .select()
      .single();

    if (error) throw error;
    return mapPageFromDB(data);
  },

  async duplicatePage(pageId: string): Promise<SitePage> {
    const original = await this.getPageById(pageId);
    const dup = await this.createPage({
      siteId: original.siteId,
      title: `${original.title} (Cópia)`,
      blocks: original.blocks,
      themeOverrides: original.themeOverrides,
      status: 'draft',
    });

    return dup;
  },

  async getPublicSite(
    orgId: string
  ): Promise<{ site: Site | null; pages: SitePage[] }> {
    const site = await this.getByOrganization(orgId);
    if (!site) return { site: null, pages: [] };

    const pages = await supabase
      .from('site_pages')
      .select('*')
      .eq('site_id', site.id)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .then(({ data }) => (data || []).map(mapPageFromDB));

    return { site, pages };
  },
};
